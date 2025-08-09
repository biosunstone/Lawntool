import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/saas/db'
import Business from '@/models/Business'
import Customer from '@/models/Customer'
import Measurement from '@/models/Measurement'
import Quote from '@/models/Quote'
import { sendQuoteEmail } from '@/lib/saas/email'
import { calculatePricing } from '@/lib/saas/pricing-calculator'
import generateQuoteNumber from '@/lib/saas/quoteNumberGenerator'
import { rateLimiters, checkRateLimit } from '@/lib/rateLimit'
import { sendWebhook } from '@/lib/saas/webhook'
import { safeEmitZapierEvent, ZAPIER_EVENTS } from '@/lib/zapier/eventEmitter'

// POST /api/widget/submit - Submit measurement from widget
export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await checkRateLimit(req, rateLimiters.widgetSubmission)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  try {
    const body = await req.json()
    const { businessId, customerData, measurementData } = body

    if (!businessId || !customerData || !measurementData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    await connectDB()

    // Verify business exists and get webhook settings
    const business: any = await Business.findById(businessId)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Create or find customer
    let customer = await Customer.findOne({
      businessId,
      email: customerData.email
    })

    if (!customer) {
      customer = await Customer.create({
        businessId,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        status: 'active',
        tags: ['widget-lead'],
        metadata: {
          source: 'widget',
          referral: req.headers.get('referer') || ''
        }
      })
    }

    // Create measurement
    const measurement = await Measurement.create({
      businessId,
      customerId: customer._id,
      userId: business.ownerId, // Assign to business owner
      address: measurementData.address,
      coordinates: measurementData.coordinates,
      measurements: measurementData.measurements,
      status: 'completed',
      metadata: {
        source: 'widget',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
        referrer: req.headers.get('referer') || ''
      }
    })
    
    // Send webhook for submission
    if (business.webhookSettings?.enabled) {
      const webhookPayload = {
        event: 'widget.submission' as const,
        businessId: businessId.toString(),
        timestamp: new Date().toISOString(),
        data: {
          customer: {
            id: customer._id.toString(),
            name: customer.name,
            email: customer.email,
            phone: customer.phone
          },
          measurement: {
            id: measurement._id.toString(),
            address: measurement.address,
            measurements: measurement.measurements
          }
        },
        metadata: {
          ipAddress: measurement.metadata?.ipAddress,
          userAgent: measurement.metadata?.userAgent,
          referrer: measurement.metadata?.referrer
        }
      }
      
      // Send webhook asynchronously (don't wait for response)
      sendWebhook(business.webhookSettings, webhookPayload).catch(err => {
        console.error('Webhook send error:', err)
      })
    }
    
    // Emit Zapier event for widget submission
    safeEmitZapierEvent(businessId, ZAPIER_EVENTS.WIDGET_SUBMISSION, {
      customerId: customer._id.toString(),
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
      },
      measurementId: measurement._id.toString(),
      measurement: {
        address: measurement.address,
        measurements: measurement.measurements,
        totalArea: (measurement.measurements.lawn?.total || 0) +
                 (measurement.measurements.driveway || 0) +
                 (measurement.measurements.sidewalk || 0)
      },
      metadata: {
        source: 'widget',
        referrer: req.headers.get('referer') || '',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
      }
    })

    // Generate automatic quote if configured
    if (business.widgetSettings?.autoGenerateQuote !== false) { // Default to true
      const services = []
      const pricing = business.settings?.defaultPricing || {
        lawnPerSqFt: 0.02,
        drivewayPerSqFt: 0.03,
        sidewalkPerSqFt: 0.025,
        buildingPerSqFt: 0.015,
        minimumCharge: 50
      }

      // Calculate pricing with rules
      const customerTags = customer.tags || []
      const zipCode = customerData.address?.zip
      const totalArea = measurementData.measurements.totalArea
      
      // Use services from request body if provided, otherwise calculate based on measurements
      const requestedServices = body.services || []
      
      if (requestedServices.length > 0) {
        // Use the selected services from the widget
        requestedServices.forEach((service: any) => {
          let area = 0
          let pricePerUnit = service.pricePerSqFt || 0.02
          
          // Get area for the service type
          switch(service.id) {
            case 'lawn':
              area = measurementData.measurements.lawn?.total || measurementData.measurements.lawn || 0
              pricePerUnit = service.pricePerSqFt || pricing.lawnPerSqFt
              break
            case 'driveway':
              area = measurementData.measurements.driveway || 0
              pricePerUnit = service.pricePerSqFt || pricing.drivewayPerSqFt
              break
            case 'sidewalk':
              area = measurementData.measurements.sidewalk || 0
              pricePerUnit = service.pricePerSqFt || pricing.sidewalkPerSqFt
              break
            case 'building':
              area = measurementData.measurements.building || 0
              pricePerUnit = service.pricePerSqFt || pricing.buildingPerSqFt
              break
          }
          
          const areaBasedPrice = area * pricePerUnit
          const finalPrice = Math.max(service.basePrice || pricing.minimumCharge, areaBasedPrice)
          
          services.push({
            name: service.name,
            area: area,
            pricePerUnit: pricePerUnit,
            totalPrice: finalPrice
          })
        })
      } else {
        // Fallback: Calculate based on measurements
        const lawnArea = measurementData.measurements.lawn?.total || measurementData.measurements.lawn || 0
        if (lawnArea > 0) {
          const price = Math.max(pricing.minimumCharge, lawnArea * pricing.lawnPerSqFt)
          services.push({
            name: 'Lawn Measurement',
            area: lawnArea,
            pricePerUnit: pricing.lawnPerSqFt,
            totalPrice: price
          })
        }

        if (measurementData.measurements.driveway > 0) {
          const price = Math.max(pricing.minimumCharge, measurementData.measurements.driveway * pricing.drivewayPerSqFt)
          services.push({
            name: 'Driveway Measurement',
            area: measurementData.measurements.driveway,
            pricePerUnit: pricing.drivewayPerSqFt,
            totalPrice: price
          })
        }

        if (measurementData.measurements.sidewalk > 0) {
          const price = Math.max(pricing.minimumCharge, measurementData.measurements.sidewalk * pricing.sidewalkPerSqFt)
          services.push({
            name: 'Sidewalk Measurement',
            area: measurementData.measurements.sidewalk,
            pricePerUnit: pricing.sidewalkPerSqFt,
            totalPrice: price
          })
        }
        
        if (measurementData.measurements.building > 0) {
          const price = Math.max(pricing.minimumCharge, measurementData.measurements.building * pricing.buildingPerSqFt)
          services.push({
            name: 'Building Measurement',
            area: measurementData.measurements.building,
            pricePerUnit: pricing.buildingPerSqFt,
            totalPrice: price
          })
        }
      }

      // Apply pricing rules
      const { services: adjustedServices, appliedRules } = await calculatePricing(
        businessId,
        services,
        customerTags,
        zipCode,
        totalArea
      )

      const subtotal = adjustedServices.reduce((sum, s) => sum + s.totalPrice, 0)
      const taxRate = business.taxRate || 0.08
      const tax = subtotal * taxRate
      const total = subtotal + tax

      // Generate quote number using centralized generator
      const quoteNumber = await generateQuoteNumber(businessId)

      // Create quote
      const quote = await Quote.create({
        businessId,
        customerId: customer._id,
        measurementId: measurement._id,
        quoteNumber,
        status: 'draft',
        services: adjustedServices,
        subtotal,
        tax,
        discount: 0,
        total,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notes: `Quote generated automatically from widget submission. Applied rules: ${appliedRules.map((r:any) => r.name).join(', ') || 'None'}`,
        createdBy: business.ownerId,
        metadata: {
          source: 'widget',
          appliedRules
        }
      })

      // Send quote email with limited data and payment link
      if (business.widgetSettings?.sendQuoteEmail !== false) { // Default to true
        const populatedQuote = await Quote.findById(quote._id)
          .populate('customerId')
          .populate('measurementId')
          .lean()
        
        // Send email with limited data and payment link
        await sendQuoteEmail(populatedQuote, 'created', {
          includePaymentLink: true,
          limitedData: true,
          paymentUrl: `${process.env.NEXTAUTH_URL}/api/payment/create-checkout?measurementId=${measurement._id}&quoteId=${quote._id}&email=${customer.email}`
        })
      }
      
      // Send webhook for quote generation
      if (business.webhookSettings?.enabled) {
        const webhookPayload = {
          event: 'widget.quote_generated' as const,
          businessId: businessId.toString(),
          timestamp: new Date().toISOString(),
          data: {
            quote: {
              id: quote._id.toString(),
              number: quote.quoteNumber,
              total: quote.total,
              status: quote.status
            },
            customer: {
              id: customer._id.toString(),
              name: customer.name,
              email: customer.email
            },
            services: quote.services
          }
        }
        
        sendWebhook(business.webhookSettings, webhookPayload).catch(err => {
          console.error('Webhook send error:', err)
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Quote generated successfully',
        data: {
          customerId: customer._id,
          measurementId: measurement._id,
          quoteId: quote._id,
          quoteNumber: quote.quoteNumber,
          total: quote.total,
          viewUrl: `${process.env.NEXTAUTH_URL}/quote/${quote._id}`
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Measurement submitted successfully',
      data: {
        customerId: customer._id,
        measurementId: measurement._id
      }
    })
  } catch (error) {
    console.error('Error submitting widget data:', error)
    return NextResponse.json(
      { error: 'Failed to submit measurement' },
      { status: 500 }
    )
  }
}