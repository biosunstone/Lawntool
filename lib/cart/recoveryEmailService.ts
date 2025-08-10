import nodemailer from 'nodemailer'
import { ICartData } from '@/models/AbandonedCart'
import { generateRecoveryEmailHTML, generateRecoveryEmailText, getEmailSubject } from './recoveryEmailTemplates'

interface EmailOptions {
  to: string
  name: string
  cartData: ICartData[]
  recoveryUrl: string
  discountCode?: string
  discountExpires?: Date
  businessName: string
  propertyAddress?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  subject?: string
  error?: string
}

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: process.env.EMAIL_SERVER_PORT === '465',
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD
    }
  })
}

/**
 * Generate HTML email template for cart recovery
 */
function generateEmailHTML(options: EmailOptions): string {
  const { name, cartData, recoveryUrl, discountCode, discountExpires, businessName, propertyAddress } = options
  
  // Calculate total
  const total = cartData.reduce((sum, item) => sum + item.price, 0)
  const discountAmount = discountCode ? parseInt(discountCode.replace('SAVE', '')) : 0
  const discountedTotal = total * (1 - discountAmount / 100)
  
  // Format expiry date
  const expiryDate = discountExpires ? new Date(discountExpires).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : ''
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Order - ${businessName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; margin-bottom: 20px; }
        .cart-items { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .cart-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
        .cart-item:last-child { border-bottom: none; }
        .item-name { font-weight: 600; color: #2c3e50; }
        .item-details { font-size: 14px; color: #7f8c8d; margin-top: 4px; }
        .item-price { font-weight: 600; color: #27ae60; }
        .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0; }
        .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .total-label { color: #7f8c8d; }
        .total-value { font-weight: 600; }
        .discount-row { color: #e74c3c; }
        .final-total { font-size: 20px; color: #27ae60; }
        .discount-banner { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .discount-code { font-size: 24px; font-weight: bold; margin: 10px 0; letter-spacing: 2px; }
        .discount-expiry { font-size: 14px; opacity: 0.9; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; margin: 20px 0; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        .cta-button:hover { box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6); }
        .urgency { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; }
        .footer a { color: #667eea; text-decoration: none; }
        .property-info { background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .property-label { font-weight: 600; color: #2e7d32; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 You left something behind!</h1>
          <p style="margin-top: 10px; font-size: 16px;">Complete your order and save!</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hi ${name},
          </div>
          
          <p>We noticed you didn't complete your order for lawn care services. Your selected services are still available, and we've saved them for you!</p>
          
          ${discountCode ? `
            <div class="discount-banner">
              <div style="font-size: 18px;">🎉 Special Offer Just for You!</div>
              <div class="discount-code">${discountCode}</div>
              <div>Save ${discountAmount}% on your order</div>
              <div class="discount-expiry">Expires: ${expiryDate}</div>
            </div>
          ` : ''}
          
          ${propertyAddress ? `
            <div class="property-info">
              <div class="property-label">📍 Property Address:</div>
              <div>${propertyAddress}</div>
            </div>
          ` : ''}
          
          <div class="cart-items">
            <h3 style="margin-top: 0;">Your Selected Services:</h3>
            ${cartData.map(item => `
              <div class="cart-item">
                <div>
                  <div class="item-name">${item.service_details.name}</div>
                  <div class="item-details">
                    ${item.service_details.description || `Area: ${item.service_details.area.toLocaleString()} sq ft`}
                  </div>
                </div>
                <div class="item-price">$${item.price.toFixed(2)}</div>
              </div>
            `).join('')}
            
            <div class="total-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">$${total.toFixed(2)}</span>
              </div>
              ${discountCode ? `
                <div class="total-row discount-row">
                  <span class="total-label">Discount (${discountAmount}%):</span>
                  <span class="total-value">-$${(total - discountedTotal).toFixed(2)}</span>
                </div>
                <div class="total-row final-total">
                  <span class="total-label">Total:</span>
                  <span class="total-value">$${discountedTotal.toFixed(2)}</span>
                </div>
              ` : `
                <div class="total-row final-total">
                  <span class="total-label">Total:</span>
                  <span class="total-value">$${total.toFixed(2)}</span>
                </div>
              `}
            </div>
          </div>
          
          <div class="urgency">
            <strong>⏰ Don't miss out!</strong> Your cart is saved, but ${discountCode ? `this ${discountAmount}% discount expires soon` : 'prices may change'}. Complete your order now to lock in these rates.
          </div>
          
          <div style="text-align: center;">
            <a href="${recoveryUrl}" class="cta-button">Complete My Order</a>
            <p style="font-size: 14px; color: #6c757d;">
              Click the button above or copy this link:<br>
              <a href="${recoveryUrl}" style="color: #667eea; word-break: break-all;">${recoveryUrl}</a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <h3>Why choose ${businessName}?</h3>
            <ul style="color: #6c757d;">
              <li>✅ Professional, licensed service providers</li>
              <li>✅ Satisfaction guaranteed</li>
              <li>✅ Competitive pricing</li>
              <li>✅ Easy online booking</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>
            Questions? Reply to this email or call us at ${process.env.BUSINESS_PHONE || '1-800-LAWN-CARE'}
          </p>
          <p>
            © ${new Date().getFullYear()} ${businessName}. All rights reserved.
          </p>
          <p style="margin-top: 15px; font-size: 12px;">
            You received this email because you started an order on our website.<br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a> | 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate plain text email for cart recovery
 */
function generateEmailText(options: EmailOptions): string {
  const { name, cartData, recoveryUrl, discountCode, businessName, propertyAddress } = options
  
  const total = cartData.reduce((sum, item) => sum + item.price, 0)
  const discountAmount = discountCode ? parseInt(discountCode.replace('SAVE', '')) : 0
  const discountedTotal = total * (1 - discountAmount / 100)
  
  let text = `Hi ${name},\n\n`
  text += `You left something in your cart at ${businessName}!\n\n`
  
  if (discountCode) {
    text += `🎉 SPECIAL OFFER: Use code ${discountCode} to save ${discountAmount}%!\n\n`
  }
  
  if (propertyAddress) {
    text += `Property: ${propertyAddress}\n\n`
  }
  
  text += `Your Selected Services:\n`
  text += `------------------------\n`
  
  cartData.forEach(item => {
    text += `• ${item.service_details.name}: $${item.price.toFixed(2)}\n`
    if (item.service_details.description) {
      text += `  ${item.service_details.description}\n`
    }
  })
  
  text += `\n------------------------\n`
  text += `Subtotal: $${total.toFixed(2)}\n`
  
  if (discountCode) {
    text += `Discount: -$${(total - discountedTotal).toFixed(2)}\n`
    text += `TOTAL: $${discountedTotal.toFixed(2)}\n`
  } else {
    text += `TOTAL: $${total.toFixed(2)}\n`
  }
  
  text += `\nComplete your order here:\n${recoveryUrl}\n\n`
  text += `Questions? Reply to this email or call ${process.env.BUSINESS_PHONE || '1-800-LAWN-CARE'}\n\n`
  text += `Best regards,\n${businessName} Team`
  
  return text
}

/**
 * Send cart recovery email
 */
export async function sendRecoveryEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const transporter = createTransporter()
    
    // Extract first name and package name
    const firstName = options.name.split(' ')[0] || 'there'
    const packageName = options.cartData[0]?.service_details?.name || 'lawn care service'
    const discountPercent = options.discountCode ? parseInt(options.discountCode.replace('SAVE', '')) : 15
    const discount = `${discountPercent}%`
    
    // Calculate totals
    const subtotal = options.cartData.reduce((sum, item) => sum + item.price, 0)
    const discountAmount = subtotal * (discountPercent / 100)
    const total = subtotal - discountAmount
    
    // Prepare template data
    const templateData = {
      firstName,
      packageName,
      discount,
      recoveryUrl: options.recoveryUrl,
      businessName: options.businessName,
      cartItems: options.cartData.map(item => ({
        name: item.service_details.name,
        price: item.price,
        description: item.service_details.description
      })),
      subtotal,
      discountAmount,
      total
    }
    
    const subject = getEmailSubject()
    
    const mailOptions = {
      from: `${options.businessName} <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject,
      text: generateRecoveryEmailText(templateData),
      html: generateRecoveryEmailHTML(templateData),
      headers: {
        'X-Priority': '1',
        'X-Campaign': 'cart-recovery',
        'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe>`
      }
    }
    
    const info = await transporter.sendMail(mailOptions)
    
    return {
      success: true,
      messageId: info.messageId,
      subject
    }
  } catch (error:any) {
    console.error('Failed to send recovery email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}