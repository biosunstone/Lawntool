/**
 * Email Service - Next.js compatible email configuration
 * This module handles email sending with proper server-side imports
 */

import type { Transporter } from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'

let transporter: Transporter | null = null

/**
 * Initialize email transporter (server-side only)
 */
function initializeTransporter(): Transporter {
  // Only require nodemailer on the server side
  if (typeof window !== 'undefined') {
    throw new Error('Email service should only be used on the server side')
  }

  const nodemailer = require('nodemailer')
  
  // Option 1: Check for individual SMTP configuration variables
  if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
    console.log('Initializing email with SMTP server:', process.env.EMAIL_SERVER_HOST)
    const port = parseInt(process.env.EMAIL_SERVER_PORT || '587')
    
    // Special configuration for Gmail
    if (process.env.EMAIL_SERVER_HOST.includes('gmail')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      })
    }
    
    // Generic SMTP configuration
    return nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }
  
  // Option 2: Check for URL format EMAIL_SERVER
  if (process.env.EMAIL_SERVER) {
    try {
      console.log('Initializing email with URL format')
      const emailUrl = new URL(process.env.EMAIL_SERVER)
      
      // Special handling for Gmail
      if (emailUrl.hostname.includes('gmail')) {
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: decodeURIComponent(emailUrl.username),
            pass: decodeURIComponent(emailUrl.password)
          }
        })
      }
      
      return nodemailer.createTransport({
        host: emailUrl.hostname,
        port: parseInt(emailUrl.port || '587'),
        secure: emailUrl.port === '465',
        auth: {
          user: decodeURIComponent(emailUrl.username),
          pass: decodeURIComponent(emailUrl.password)
        },
        tls: {
          rejectUnauthorized: false
        }
      })
    } catch (error) {
      console.error('Invalid EMAIL_SERVER URL format:', error)
    }
  }

  // Option 3: Fallback to Ethereal Email for testing
  console.log('No email configuration found, using Ethereal Email for testing')
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  })
}

/**
 * Get or create email transporter
 */
export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = initializeTransporter()
  }
  return transporter
}

/**
 * Send an email
 */
export async function sendMail(options: Mail.Options): Promise<any> {
  try {
    const transport = getTransporter()
    const info = await transport.sendMail(options)
    
    console.log('Email sent successfully:', info.messageId)
    
    // If using Ethereal, log the preview URL
    if (!process.env.EMAIL_SERVER && !process.env.EMAIL_SERVER_HOST) {
      const nodemailer = require('nodemailer')
      const previewUrl = nodemailer.getTestMessageUrl(info)
      if (previewUrl) {
        console.log('Preview URL:', previewUrl)
      }
    }
    
    return { success: true, messageId: info.messageId, info }
  } catch (error: any) {
    console.error('Failed to send email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const transport = getTransporter()
    await transport.verify()
    return { success: true, message: 'Email configuration is valid' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Email templates for quotes
 */
export const emailTemplates = {
  quoteCreated: (quote: any, customerEmail: string, businessName: string) => ({
    to: customerEmail,
    subject: `New Quote ${quote.quoteNumber} from ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #00A651; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .quote-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .services { margin: 20px 0; }
            .service-item { padding: 15px; background: white; border: 1px solid #e0e0e0; margin: 10px 0; border-radius: 5px; }
            .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { font-size: 1.2em; font-weight: bold; color: #00A651; }
            .button { display: inline-block; padding: 12px 30px; background: #00A651; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${businessName}</h1>
              <p>Property Service Quote</p>
            </div>
            <div class="content">
              <h2>Quote ${quote.quoteNumber}</h2>
              <p>Dear ${quote.customerId?.name || 'Customer'},</p>
              <p>Thank you for your interest in our property services. We're pleased to provide you with a detailed quote for your property.</p>
              
              <div class="quote-details">
                <h3>Property Details</h3>
                <p><strong>Address:</strong> ${quote.measurementId?.address || 'N/A'}</p>
                <p><strong>Total Area:</strong> ${quote.measurementId?.measurements?.totalArea?.toLocaleString() || '0'} sq ft</p>
              </div>

              <div class="services">
                <h3>Services</h3>
                ${quote.services?.map((service: any) => `
                  <div class="service-item">
                    <strong>${service.name}</strong>
                    ${service.description ? `<p>${service.description}</p>` : ''}
                    <p>${service.area?.toLocaleString() || '0'} sq ft × $${service.pricePerUnit?.toFixed(3) || '0'}/sq ft = <strong>$${service.totalPrice?.toFixed(2) || '0'}</strong></p>
                  </div>
                `).join('') || '<p>No services listed</p>'}
              </div>

              <div class="totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>$${quote.subtotal?.toFixed(2) || '0'}</span>
                </div>
                <div class="total-row">
                  <span>Tax:</span>
                  <span>$${quote.tax?.toFixed(2) || '0'}</span>
                </div>
                ${quote.discount > 0 ? `
                  <div class="total-row">
                    <span>Discount:</span>
                    <span>-$${quote.discount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="total-row grand-total">
                  <span>Total:</span>
                  <span>$${quote.total?.toFixed(2) || '0'}</span>
                </div>
              </div>

              ${quote.notes ? `
                <div class="quote-details">
                  <h3>Additional Notes</h3>
                  <p>${quote.notes}</p>
                </div>
              ` : ''}

              <p><strong>This quote is valid until ${new Date(quote.validUntil).toLocaleDateString()}</strong></p>

              <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL}/quote/${quote._id}" class="button">View Quote Online</a>
              </div>

              <div class="footer">
                <p>If you have any questions about this quote, please don't hesitate to contact us.</p>
                <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  quoteAccepted: (quote: any, businessEmail: string, businessName: string) => ({
    to: businessEmail,
    subject: `Quote ${quote.quoteNumber} has been accepted!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #00A651; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 30px; }
            .success-badge { background: #d4edda; color: #155724; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quote Accepted!</h1>
            </div>
            <div class="content">
              <div class="success-badge">
                <strong>Great news! Quote ${quote.quoteNumber} has been accepted.</strong>
              </div>
              
              <h3>Customer Details:</h3>
              <p><strong>Name:</strong> ${quote.customerId?.name || 'N/A'}</p>
              <p><strong>Email:</strong> ${quote.customerId?.email || 'N/A'}</p>
              ${quote.customerId?.phone ? `<p><strong>Phone:</strong> ${quote.customerId.phone}</p>` : ''}
              
              <h3>Property:</h3>
              <p>${quote.measurementId?.address || 'N/A'}</p>
              
              <h3>Total Amount:</h3>
              <p style="font-size: 1.5em; color: #00A651;"><strong>$${quote.total?.toFixed(2) || '0'}</strong></p>
              
              <p>Please contact the customer to schedule the service.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  quoteRejected: (quote: any, businessEmail: string, businessName: string) => ({
    to: businessEmail,
    subject: `Quote ${quote.quoteNumber} was rejected`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quote Rejected</h1>
            </div>
            <div class="content">
              <p>Quote ${quote.quoteNumber} has been rejected by the customer.</p>
              
              <h3>Customer:</h3>
              <p>${quote.customerId?.name || 'N/A'} (${quote.customerId?.email || 'N/A'})</p>
              
              <h3>Property:</h3>
              <p>${quote.measurementId?.address || 'N/A'}</p>
              
              <p>You may want to follow up with the customer to understand their concerns or offer an alternative quote.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  // New template with limited data and payment link
  quoteCreatedWithPayment: (quote: any, customerEmail: string, businessName: string, paymentUrl: string) => ({
    to: customerEmail,
    subject: `Property Measurement Report - ${quote.quoteNumber} from ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #00A651; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .preview-box { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px solid #e0e0e0; }
            .limited-data { margin: 20px 0; }
            .data-item { padding: 15px; background: white; border: 1px solid #e0e0e0; margin: 10px 0; border-radius: 5px; }
            .blurred { filter: blur(3px); user-select: none; color: #999; }
            .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { font-size: 1.2em; font-weight: bold; color: #00A651; }
            .cta-button { display: inline-block; padding: 16px 40px; background: #00A651; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 1.1em; font-weight: bold; }
            .cta-section { text-align: center; background: #f0f8ff; padding: 30px; border-radius: 10px; margin: 30px 0; }
            .benefits { margin: 20px 0; }
            .benefit-item { padding: 10px 0; border-left: 3px solid #00A651; padding-left: 15px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; }
            .lock-icon { display: inline-block; margin-right: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${businessName}</h1>
              <p>Property Measurement Report</p>
            </div>
            <div class="content">
              <h2>Quote ${quote.quoteNumber}</h2>
              <p>Dear ${quote.customerId?.name || 'Customer'},</p>
              <p>Thank you for using our property measurement service! We've completed the initial assessment of your property.</p>
              
              <div class="preview-box">
                <h3>📍 Property Details (Preview)</h3>
                <p><strong>Address:</strong> ${quote.measurementId?.address || 'N/A'}</p>
                <p><strong>Total Property Size:</strong> ${quote.measurementId?.measurements?.totalArea?.toLocaleString() || '0'} sq ft</p>
                <p><strong>Estimated Service Cost:</strong> <span class="grand-total">$${quote.total?.toFixed(2) || '0'}</span></p>
              </div>

              <div class="limited-data">
                <h3>Available Measurements</h3>
                <div class="data-item">
                  <strong>🏡 Basic Property Information</strong>
                  <p>✅ Total property area calculated</p>
                  <p>✅ Property boundaries identified</p>
                </div>
                
                <div class="data-item">
                  <strong>🔒 Detailed Measurements (Unlock Required)</strong>
                  <p class="blurred">• Lawn areas: Front yard, Back yard, Side yard</p>
                  <p class="blurred">• Driveway measurements</p>
                  <p class="blurred">• Sidewalk measurements</p>
                  <p class="blurred">• Building footprint</p>
                  <p class="blurred">• Perimeter calculations</p>
                  <p class="blurred">• Zone-by-zone breakdown</p>
                </div>
              </div>

              <div class="cta-section">
                <h2>🎯 Get Your Complete Measurement Report</h2>
                <p style="font-size: 1.1em; margin: 20px 0;">Unlock detailed measurements for all areas of your property</p>
                
                <div class="benefits">
                  <div class="benefit-item">✅ Precise measurements for every area</div>
                  <div class="benefit-item">✅ Professional PDF report</div>
                  <div class="benefit-item">✅ Share with contractors for accurate quotes</div>
                  <div class="benefit-item">✅ Instant download access</div>
                </div>

                <a href="${process.env.NEXTAUTH_URL}/api/payment/checkout?measurementId=${quote.measurementId?._id}&quoteId=${quote._id}&email=${customerEmail}" class="cta-button">
                  🔓 Get Full Measurement Report - $49
                </a>
                
                <p style="color: #666; font-size: 0.9em; margin-top: 15px;">
                  <span class="lock-icon">🔒</span> Secure payment via Stripe
                </p>
              </div>

              <div class="totals">
                <h3>Service Quote Summary</h3>
                <div class="total-row">
                  <span>Property Assessment:</span>
                  <span>$${quote.subtotal?.toFixed(2) || '0'}</span>
                </div>
                <div class="total-row">
                  <span>Tax:</span>
                  <span>$${quote.tax?.toFixed(2) || '0'}</span>
                </div>
                ${quote.discount > 0 ? `
                  <div class="total-row">
                    <span>Discount:</span>
                    <span>-$${quote.discount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="total-row grand-total">
                  <span>Total Service Quote:</span>
                  <span>$${quote.total?.toFixed(2) || '0'}</span>
                </div>
              </div>

              <p style="margin-top: 30px; padding: 20px; background: #fffbf0; border-left: 4px solid #ffa500; border-radius: 5px;">
                <strong>📌 Note:</strong> This quote is for the actual service work on your property. The measurement report fee is a one-time charge for the detailed property analysis.
              </p>

              <div class="footer">
                <p>If you have any questions about this report, please don't hesitate to contact us.</p>
                <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  })
}
