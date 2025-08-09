import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Quote from '@/models/Quote'
import Customer from '@/models/Customer'
import Measurement from '@/models/Measurement'
import Business from '@/models/Business'
import { sendQuoteEmail } from '@/lib/saas/email'
import generateQuoteNumber from '@/lib/saas/quoteNumberGenerator'
import { calculatePricing } from '@/lib/saas/pricing-calculator'
import { safeEmitZapierEvent, ZAPIER_EVENTS } from '@/lib/zapier/eventEmitter'

// GET - Fetch quotes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }

    await connectDB()

    const quotes = await Quote.find({ businessId })
      .populate('customerId', 'name email phone')
      .populate('measurementId', 'address measurements')
      .sort({ createdAt: -1 })
      .limit(100)

    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Fetch quotes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
}

// POST - Create new quote
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const businessId = (session.user as any).businessId
    
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }

    await connectDB()

    const body = await request.json()
    const { measurementId, customerId, services, notes, validDays = 30 } = body

    // Validate measurement exists and belongs to business
    const measurement = await Measurement.findOne({ 
      _id: measurementId, 
      businessId 
    })
    
    if (!measurement) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    // Get or create customer
    let customer
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, businessId })
    } else if (body.customerData) {
      // Create new customer if data provided
      customer = await Customer.findOneAndUpdate(
        { email: body.customerData.email, businessId },
        {
          ...body.customerData,
          businessId,
          $inc: { quoteCount: 1 }
        },
        { upsert: true, new: true }
      )
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer required' }, { status: 400 })
    }

    // Get business settings for pricing
    const business = await Business.findById(businessId)
    const pricing = business?.settings?.defaultPricing || {
      lawnPerSqFt: 0.02,
      drivewayPerSqFt: 0.03,
      sidewalkPerSqFt: 0.025,
      minimumCharge: 50
    }

    // Calculate initial service prices if not provided
    const baseServices = services || [
      {
        name: 'Lawn Treatment',
        description: 'Complete lawn care service',
        area: measurement.measurements.lawn.total,
        pricePerUnit: pricing.lawnPerSqFt,
        totalPrice: Math.max(
          measurement.measurements.lawn.total * pricing.lawnPerSqFt,
          pricing.minimumCharge
        )
      },
      measurement.measurements.driveway > 0 && {
        name: 'Driveway Cleaning',
        description: 'Power washing and cleaning',
        area: measurement.measurements.driveway,
        pricePerUnit: pricing.drivewayPerSqFt,
        totalPrice: measurement.measurements.driveway * pricing.drivewayPerSqFt
      },
      measurement.measurements.sidewalk > 0 && {
        name: 'Sidewalk Maintenance',
        description: 'Sidewalk cleaning and treatment',
        area: measurement.measurements.sidewalk,
        pricePerUnit: pricing.sidewalkPerSqFt,
        totalPrice: measurement.measurements.sidewalk * pricing.sidewalkPerSqFt
      }
    ].filter(Boolean)

    // Extract data for pricing rule calculation
    const customerTags = customer.tags || []
    const addressParts = measurement.address?.split(',') || []
    const zipCodeMatch = addressParts[addressParts.length - 1]?.trim().match(/\d{5}/)
    const zipCode = zipCodeMatch ? zipCodeMatch[0] : undefined
    const totalArea = measurement.measurements.totalArea || 
                      (measurement.measurements.lawn.total + 
                       measurement.measurements.driveway + 
                       measurement.measurements.sidewalk)

    // Apply pricing rules
    const { services: adjustedServices, appliedRules } = await calculatePricing(
      businessId,
      baseServices,
      customerTags,
      zipCode,
      totalArea,
      new Date()
    )

    // Use adjusted services for final calculation
    const calculatedServices = adjustedServices

    // Get business tax rate
    const taxRate = business?.taxRate || 0.08
    
    // Calculate totals
    const subtotal = calculatedServices.reduce((sum:any, service:any) => sum + service.totalPrice, 0)
    const tax = subtotal * taxRate
    const discount = body.discount || 0
    const total = subtotal + tax - discount

    // Generate quote number using centralized generator
    const quoteNumber = await generateQuoteNumber(businessId)

    // Create quote with pricing metadata
    const quote = await Quote.create({
      businessId,
      customerId: customer._id,
      measurementId,
      quoteNumber,
      status: 'draft',
      services: calculatedServices,
      subtotal,
      tax,
      discount,
      total,
      notes,
      validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
      createdBy: userId,
      metadata: {
        appliedRules: appliedRules.map(r => ({
          ruleId: r.ruleId,
          ruleName: r.ruleName,
          ruleType: r.ruleType,
          adjustment: r.adjustment
        })),
        originalPrices: baseServices.map((s:any) => ({
          name: s.name,
          originalPrice: s.pricePerUnit,
          originalTotal: s.totalPrice
        })),
        pricingContext: {
          zipCode,
          customerTags,
          totalArea
        }
      }
    })

    // Update customer quote count
    await Customer.updateOne(
      { _id: customer._id },
      { $inc: { quoteCount: 1 } }
    )

    // Populate references for response
    await quote.populate('customerId', 'name email phone')
    await quote.populate('measurementId', 'address measurements')

    // Send email notification if quote is being sent
    if (body.status === 'sent' || !body.status) {
      // Send email in background (don't wait for it)
      sendQuoteEmail(quote, 'created').catch(error => {
        console.error('Failed to send quote email:', error)
      })
      
      // Emit Zapier event for quote sent
      safeEmitZapierEvent(businessId, ZAPIER_EVENTS.QUOTE_SENT, {
        quoteId: quote._id.toString(),
        quoteNumber: quote.quoteNumber,
        customer: {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        },
        total: quote.total,
        services: quote.services,
        validUntil: quote.validUntil
      })
    }
    
    // Emit Zapier event for quote created
    safeEmitZapierEvent(businessId, ZAPIER_EVENTS.QUOTE_CREATED, {
      quoteId: quote._id.toString(),
      quoteNumber: quote.quoteNumber,
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      measurement: {
        id: measurementId,
        address: measurement.address,
        totalArea
      },
      total: quote.total,
      subtotal: quote.subtotal,
      tax: quote.tax,
      services: quote.services,
      validUntil: quote.validUntil,
      status: quote.status
    }, {
      userId,
      source: 'api'
    })

    return NextResponse.json({
      message: 'Quote created successfully',
      quote
    })
  } catch (error: any) {
    console.error('Create quote error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create quote' },
      { status: 500 }
    )
  }
}