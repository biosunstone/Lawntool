/**
 * Email module - Main email functionality using the email service
 */

import { sendMail, emailTemplates } from './email-service'

// Send email function
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string
) {
  try {
    const fromEmail = from || process.env.EMAIL_FROM || 'noreply@sunstone.com'

    const result = await sendMail({
      from: fromEmail,
      to,
      subject,
      html
    })

    if (result.success) {
      console.log('Email sent:', result.messageId)
    } else {
      console.error('Email sending failed:', result.error)
    }

    return result
  } catch (error: any) {
    console.error('Email sending failed:', error)
    return { success: false, error: error.message }
  }
}

// Send quote email with optional payment link for limited data
export async function sendQuoteEmail(
  quote: any, 
  type: 'created' | 'accepted' | 'rejected',
  options?: {
    includePaymentLink?: boolean
    limitedData?: boolean
    paymentUrl?: string
  }
) {
  try {
    // Get business information
    const Business = (await import('@/models/Business')).default
    const business = await Business.findById(quote.businessId)
    const businessName = business?.name || 'Sunstone Digital Tech'
    const businessEmail = business?.email || process.env.EMAIL_FROM || 'noreply@sunstone.com'
    const fromEmail = businessEmail

    let emailOptions
    switch (type) {
      case 'created':
        // If payment link is included, use limited data template
        if (options?.includePaymentLink && options?.limitedData) {
          emailOptions = emailTemplates.quoteCreatedWithPayment(
            quote, 
            quote.customerId?.email, 
            businessName,
            options.paymentUrl || ''
          )
        } else {
          emailOptions = emailTemplates.quoteCreated(quote, quote.customerId?.email, businessName)
        }
        break
      case 'accepted':
        emailOptions = emailTemplates.quoteAccepted(quote, businessEmail, businessName)
        break
      case 'rejected':
        emailOptions = emailTemplates.quoteRejected(quote, businessEmail, businessName)
        break
      default:
        throw new Error('Invalid email type')
    }

    const result = await sendMail({
      from: fromEmail,
      ...emailOptions
    })
    
    if (result.success) {
      console.log(`Quote ${type} email sent successfully to ${emailOptions.to}`)
    } else {
      console.error(`Failed to send quote ${type} email:`, result.error)
    }

    return result
  } catch (error: any) {
    console.error('Error sending quote email:', error)
    return { success: false, error: error.message }
  }
}

// Create test account for development
export async function createTestEmailAccount() {
  try {
    if (typeof window !== 'undefined') {
      console.error('This function should only be called on the server side')
      return null
    }
    
    const nodemailer = require('nodemailer')
    const testAccount = await nodemailer.createTestAccount()
    
    console.log('Test email account created:')
    console.log('User:', testAccount.user)
    console.log('Pass:', testAccount.pass)
    console.log('SMTP Host:', testAccount.smtp.host)
    console.log('SMTP Port:', testAccount.smtp.port)
    console.log('SMTP Secure:', testAccount.smtp.secure)
    
    return testAccount
  } catch (error) {
    console.error('Failed to create test email account:', error)
    return null
  }
}

// Re-export email templates for backward compatibility
export { emailTemplates } from './email-service'