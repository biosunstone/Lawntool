/**
 * API Route: Submit Quote Request
 * Handles quote form submissions and sends property map emails
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import Quote from '@/models/Quote'
import Customer from '@/models/Customer'
import Business from '@/models/Business'
import { StaticMapGenerator } from '@/lib/maps/staticMapGenerator'
import { 
  generatePropertyMapEmailHTML, 
  generatePropertyMapEmailText,
  getPropertyMapEmailSubject 
} from '@/lib/email/propertyMapEmailTemplate'
import nodemailer from 'nodemailer'
import { PropertyBoundaryService } from '@/lib/maps/propertyBoundaryService'

// Store recent submissions to prevent duplicates
const recentSubmissions = new Map<string, number>()
const DUPLICATE_WINDOW = 60 * 1000 // 1 minute

// Clean old entries periodically
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(recentSubmissions.entries())
  for (const [key, timestamp] of entries) {
    if (now - timestamp > DUPLICATE_WINDOW * 10) {
      recentSubmissions.delete(key)
    }
  }
}, 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const data = await request.json()
    const {
      name,
      email,
      phone,
      address,
      coordinates,
      polygon,
      measurements,
      notes,
      businessId,
      mapUrl,
      timestamp,
      formDuration,
      status
    } = data
    
    // Validate required fields
    if (!email || !address || !coordinates || !polygon || polygon.length < 3) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Check for duplicate submission
    const submissionKey = `${email}-${address}`
    const lastSubmission = recentSubmissions.get(submissionKey)
    if (lastSubmission) {
      const timeSinceLastSubmission = Date.now() - lastSubmission
      if (timeSinceLastSubmission < DUPLICATE_WINDOW) {
        console.log(`Duplicate submission prevented for ${email} at ${address}, submitted ${Math.round(timeSinceLastSubmission / 1000)}s ago`)
        return NextResponse.json({ 
          success: false, 
          message: 'Quote already submitted. Please wait a moment.',
          duplicatePrevented: true 
        })
      }
    }
    
    // Mark as submitted immediately
    recentSubmissions.set(submissionKey, Date.now())
    console.log(`Processing quote submission for ${email} at ${address}`)
    
    // Get business info
    const business = businessId 
      ? await Business.findById(businessId)
      : await Business.findOne() // Default business
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }
    
    // Find or create customer
    let customer = await Customer.findOne({ 
      email,
      businessId: business._id 
    })
    
    if (!customer) {
      customer = new Customer({
        name,
        email,
        phone,
        businessId: business._id,
        properties: [{
          address,
          coordinates,
          polygon,
          measurements,
          isPrimary: true
        }],
        source: 'quote_form',
        metadata: {
          firstQuoteDate: new Date(),
          formDuration
        }
      })
      await customer.save()
    } else {
      // Update customer info
      customer.name = name || customer.name
      customer.phone = phone || customer.phone
      
      // Add property if not exists
      const existingProperty = customer.properties.find(
        (p: any) => p.address === address
      )
      
      if (!existingProperty) {
        customer.properties.push({
          address,
          coordinates,
          polygon,
          measurements,
          isPrimary: customer.properties.length === 0
        })
      }
      
      await customer.save()
    }
    
    // Generate quote number
    const quoteCount = await Quote.countDocuments({ businessId: business._id })
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(quoteCount + 1).padStart(5, '0')}`
    
    // Calculate service prices based on measurements
    const services = []
    
    if (measurements?.lawn?.area) {
      const lawnPrice = measurements.lawn.area * 0.02 // $0.02 per sq ft
      services.push({
        name: 'Lawn Mowing & Maintenance',
        description: 'Weekly lawn mowing and edging service',
        area: measurements.lawn.area,
        pricePerUnit: 0.02,
        totalPrice: lawnPrice,
        frequency: 'weekly'
      })
      
      const fertilizationPrice = measurements.lawn.area * 0.015 // $0.015 per sq ft
      services.push({
        name: 'Fertilization & Weed Control',
        description: '6-step fertilization program',
        area: measurements.lawn.area,
        pricePerUnit: 0.015,
        totalPrice: fertilizationPrice,
        frequency: 'bi-monthly'
      })
    }
    
    if (measurements?.driveway?.area) {
      const drivewayPrice = measurements.driveway.area * 0.50 // $0.50 per sq ft
      services.push({
        name: 'Driveway Cleaning & Sealing',
        description: 'Pressure washing and sealant application',
        area: measurements.driveway.area,
        pricePerUnit: 0.50,
        totalPrice: drivewayPrice,
        frequency: 'annual'
      })
    }
    
    if (measurements?.house?.perimeter) {
      const pestPrice = measurements.house.perimeter * 2.50 // $2.50 per linear ft
      services.push({
        name: 'Perimeter Pest Control',
        description: 'Quarterly pest control treatment',
        area: measurements.house.perimeter,
        pricePerUnit: 2.50,
        totalPrice: pestPrice,
        frequency: 'quarterly'
      })
    }
    
    // Calculate totals
    const subtotal = services.reduce((sum, service) => sum + service.totalPrice, 0)
    const tax = subtotal * 0.0825 // 8.25% tax
    const total = subtotal + tax
    
    // Create quote
    const quote = new Quote({
      quoteNumber,
      businessId: business._id,
      customerId: customer._id,
      status: status === 'abandoned' ? 'draft' : 'sent',
      propertyAddress: address,
      propertyCoordinates: coordinates,
      propertyPolygon: polygon,
      measurements,
      services,
      subtotal,
      tax,
      discount: 0,
      total,
      notes,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: {
        mapUrl,
        formDuration,
        submittedAt: timestamp,
        formStatus: status
      }
    })
    
    await quote.save()
    
    // Generate static map URL if not provided
    const finalMapUrl = mapUrl || StaticMapGenerator.generateMapUrl(
      coordinates,
      polygon,
      measurements,
      {
        width: 800,
        height: 600,
        zoom: 19,
        mapType: 'satellite'
      }
    )
    
    // Prepare email data
    const emailData = {
      customerName: name,
      email,
      phone,
      address,
      mapUrl: finalMapUrl,
      measurements,
      quoteNumber,
      businessName: business.name,
      businessEmail: business.email || process.env.EMAIL_FROM!,
      businessPhone: business.phone || '1-800-LAWN-CARE',
      notes,
      status
    }
    
    // Send email with property map
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: process.env.EMAIL_SERVER_PORT === '465',
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      })
      
      const mailOptions = {
        from: `"${business.name}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: getPropertyMapEmailSubject(emailData),
        text: generatePropertyMapEmailText(emailData),
        html: generatePropertyMapEmailHTML(emailData)
      }
      
      await transporter.sendMail(mailOptions)
      
      // Also send notification to business
      if (business.email) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: business.email,
          subject: `New Quote Request - ${address}`,
          text: `
New quote request received!

Customer: ${name}
Email: ${email}
Phone: ${phone}
Address: ${address}

Property Measurements:
- Lot Size: ${PropertyBoundaryService.formatArea(measurements?.lot?.area || 0)}
- Lawn Area: ${PropertyBoundaryService.formatArea(measurements?.lawn?.area || 0)}
- Estimated Total: $${total.toFixed(2)}

Quote Number: ${quoteNumber}
Status: ${status}

View full quote: ${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote._id}
          `,
          html: `
            <h2>New Quote Request</h2>
            <p><strong>Customer:</strong> ${name}<br>
            <strong>Email:</strong> ${email}<br>
            <strong>Phone:</strong> ${phone}<br>
            <strong>Address:</strong> ${address}</p>
            
            <h3>Property Measurements:</h3>
            <ul>
              <li>Lot Size: ${PropertyBoundaryService.formatArea(measurements?.lot?.area || 0)}</li>
              <li>Lawn Area: ${PropertyBoundaryService.formatArea(measurements?.lawn?.area || 0)}</li>
              <li>Estimated Total: <strong>$${total.toFixed(2)}</strong></li>
            </ul>
            
            <p><strong>Quote Number:</strong> ${quoteNumber}<br>
            <strong>Status:</strong> ${status}</p>
            
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote._id}">View Full Quote</a></p>
            
            <img src="${finalMapUrl}" alt="Property Map" style="max-width: 600px; margin-top: 20px;">
          `
        })
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote._id,
        quoteNumber: quote.quoteNumber,
        total: quote.total,
        validUntil: quote.validUntil
      },
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email
      }
    })
    
  } catch (error) {
    console.error('Error submitting quote:', error)
    return NextResponse.json(
      { error: 'Failed to submit quote' },
      { status: 500 }
    )
  }
}