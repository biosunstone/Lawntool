import { generateRecoverySMS } from './recoveryEmailTemplates'

interface SMSOptions {
  to: string
  name: string
  recoveryUrl: string
  discountCode?: string
  businessName: string
  packageName?: string
}

interface SMSResult {
  success: boolean
  messageId?: string
  message?: string
  error?: string
}

/**
 * Send cart recovery SMS
 * Note: This is a mock implementation. In production, you would use Twilio, AWS SNS, or another SMS provider
 */
export async function sendRecoverySMS(options: SMSOptions): Promise<SMSResult> {
  const { to, name, recoveryUrl, packageName = 'lawn care service' } = options
  
  try {
    // Generate short URL (in production, use a URL shortener service)
    const shortUrl = recoveryUrl.replace(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', 'stn.link')
    
    // Compose SMS message using template
    const firstName = name.split(' ')[0] || 'there'
    let message = generateRecoverySMS({
      firstName,
      packageName,
      checkoutLink: shortUrl
    })
    
    // Trim if too long
    if (message.length > 160) {
      message = message.substring(0, 157) + '...'
    }
    
    // In production, you would use Twilio or another SMS service:
    if (process.env.TWILIO_ENABLED === 'true') {
      // Example Twilio implementation (requires npm install twilio):
      /*
      const twilio = require('twilio')
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
      
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      })
      
      return {
        success: true,
        messageId: result.sid,
        message
      }
      */
    }
    
    // Mock implementation for testing
    console.log(`[SMS Mock] Would send to ${to}: ${message}`)
    
    return {
      success: true,
      messageId: `mock_sms_${Date.now()}`,
      message
    }
    
  } catch (error:any) {
    console.error('Failed to send recovery SMS:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Basic validation for US phone numbers
  const phoneRegex = /^(\+1)?[\s-]?\(?[2-9]\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}$/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}

/**
 * Format phone number for SMS sending
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Add country code if not present
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`
  }
  
  return phone
}