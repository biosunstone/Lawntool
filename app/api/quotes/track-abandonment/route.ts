/**
 * API Route: Track Quote Form Abandonment
 * Sends property map email for abandoned forms with duplicate prevention
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import AbandonedQuote from '@/models/AbandonedQuote'
import Business from '@/models/Business'
import { 
  generatePropertyMapEmailHTML, 
  generatePropertyMapEmailText,
  getPropertyMapEmailSubject 
} from '@/lib/email/propertyMapEmailTemplate'
import nodemailer from 'nodemailer'

// Store recently processed emails to prevent duplicates
const recentlyProcessed = new Map<string, number>()
const DUPLICATE_WINDOW = 30 * 60 * 1000 // 30 minutes

// Clean old entries periodically
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(recentlyProcessed.entries())
  for (const [email, timestamp] of entries) {
    if (now - timestamp > DUPLICATE_WINDOW) {
      recentlyProcessed.delete(email)
    }
  }
}, 5 * 60 * 1000)

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
    
    // Only track if we have email and address
    if (!email || !address) {
      console.log('Skipping abandonment tracking: missing email or address')
      return NextResponse.json({ success: true })
    }
    
    // Check for duplicate processing
    const lastProcessed = recentlyProcessed.get(email)
    if (lastProcessed) {
      const timeSinceLastProcess = Date.now() - lastProcessed
      if (timeSinceLastProcess < DUPLICATE_WINDOW) {
        console.log(`Duplicate abandonment prevented for ${email}, processed ${Math.round(timeSinceLastProcess / 1000)}s ago`)
        return NextResponse.json({ 
          success: false, 
          message: 'Recently processed',
          duplicatePrevented: true 
        })
      }
    }
    
    // Only process abandonment status (not drafts)
    if (status !== 'abandoned') {
      console.log(`Skipping non-abandonment status: ${status}`)
      return NextResponse.json({ success: true })
    }
    
    // Mark as processed immediately to prevent duplicates
    recentlyProcessed.set(email, Date.now())
    console.log(`Processing abandonment for ${email} at ${new Date().toISOString()}`)
    
    // Get business info
    const business = businessId 
      ? await Business.findById(businessId)
      : await Business.findOne()
    
    if (!business) {
      return NextResponse.json({ success: true })
    }
    
    // Save abandoned quote
    const abandonedQuote = new AbandonedQuote({
      businessId: business._id,
      customerEmail: email,
      customerName: name,
      customerPhone: phone,
      propertyAddress: address,
      propertyCoordinates: coordinates,
      propertyPolygon: polygon,
      measurements,
      notes,
      formStartedAt: new Date(Date.now() - (formDuration || 0)),
      formAbandonedAt: new Date(timestamp),
      formDuration,
      mapUrl,
      emailSent: false
    })
    
    await abandonedQuote.save()
    
    // Send email immediately if we have measurements
    if (mapUrl && measurements && polygon && polygon.length >= 3) {
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
        
        const emailData = {
          customerName: name || 'Valued Customer',
          email,
          phone: phone || '',
          address,
          mapUrl,
          measurements,
          businessName: business.name,
          businessEmail: business.email || process.env.EMAIL_FROM!,
          businessPhone: business.phone || '1-800-LAWN-CARE',
          notes,
          status: 'abandoned' as const
        }
        
        console.log(`Sending abandonment recovery email to ${email}`)
        
        await transporter.sendMail({
          from: `"${business.name}" <${process.env.EMAIL_FROM}>`,
          to: email,
          subject: getPropertyMapEmailSubject(emailData),
          text: generatePropertyMapEmailText(emailData),
          html: generatePropertyMapEmailHTML(emailData)
        })
        
        console.log(`Abandonment recovery email sent successfully to ${email}`)
        
        // Update abandoned quote
        abandonedQuote.emailSent = true
        abandonedQuote.emailSentAt = new Date()
        await abandonedQuote.save()
        
        // Notify business
        if (business.email) {
          console.log(`Sending abandonment notification to business: ${business.email}`)
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: business.email,
            subject: `Abandoned Quote Alert - ${address}`,
            text: `
A potential customer abandoned their quote request:

Customer: ${name || 'Not provided'}
Email: ${email}
Phone: ${phone || 'Not provided'}
Address: ${address}

They spent ${Math.round((formDuration || 0) / 1000 / 60)} minutes on the form.

A recovery email with their property measurements has been sent automatically.

View the property map: ${mapUrl}
            `
          })
          console.log(`Business notification sent to ${business.email}`)
        }
      } catch (emailError) {
        console.error('Error sending abandonment email to', email, ':', emailError)
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error tracking abandonment:', error)
    // Don't fail - this is background tracking
    return NextResponse.json({ success: true })
  }
}