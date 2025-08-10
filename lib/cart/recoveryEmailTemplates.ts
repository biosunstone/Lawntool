/**
 * Email and SMS templates for cart recovery
 * Using template variables for personalization
 */

interface EmailTemplateData {
  firstName: string
  packageName: string
  discount: string
  recoveryUrl: string
  businessName?: string
  cartItems?: Array<{
    name: string
    price: number
    description?: string
  }>
  subtotal?: number
  discountAmount?: number
  total?: number
}

interface SMSTemplateData {
  firstName: string
  packageName: string
  checkoutLink: string
}

/**
 * Generate HTML email template with specified format
 */
export function generateRecoveryEmailHTML(data: EmailTemplateData): string {
  const { firstName, packageName, discount, recoveryUrl, businessName = 'LawnCare', cartItems = [], subtotal = 0, discountAmount = 0, total = 0 } = data
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Booking</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #555;
          margin-bottom: 25px;
          line-height: 1.6;
        }
        .discount-banner {
          background-color: #FFF9C4;
          border: 2px dashed #F9A825;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 25px 0;
        }
        .discount-code {
          font-size: 24px;
          font-weight: bold;
          color: #F57C00;
          margin: 10px 0;
        }
        .cart-items {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .cart-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .cart-item:last-child {
          border-bottom: none;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%);
          color: white;
          padding: 15px 40px;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 18px;
          margin: 20px 0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .cta-button:hover {
          background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #6c757d;
          font-size: 14px;
        }
        .footer a {
          color: #43A047;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your lawn deserves better — complete your booking!</h1>
        </div>
        
        <div class="content">
          <div class="greeting">Hi ${firstName},</div>
          
          <div class="message">
            We noticed you left your <strong>${packageName}</strong> in your cart.
          </div>
          
          <div class="discount-banner">
            <div style="font-size: 18px; color: #333;">🎉 Special Offer Just for You!</div>
            <div class="discount-code">Complete your booking now and enjoy</div>
            <div style="font-size: 28px; font-weight: bold; color: #43A047;">${discount} OFF</div>
            <div style="font-size: 16px; color: #666; margin-top: 10px;">your first service</div>
          </div>
          
          ${cartItems.length > 0 ? `
            <div class="cart-items">
              <h3 style="margin-top: 0; color: #333;">Your Selected Services:</h3>
              ${cartItems.map(item => `
                <div class="cart-item">
                  <div>
                    <div style="font-weight: 600; color: #333;">${item.name}</div>
                    ${item.description ? `<div style="font-size: 14px; color: #666; margin-top: 4px;">${item.description}</div>` : ''}
                  </div>
                  <div style="font-weight: 600; color: #43A047;">$${item.price.toFixed(2)}</div>
                </div>
              `).join('')}
              
              ${subtotal > 0 ? `
                <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e0e0e0;">
                  <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                    <span>Subtotal:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                  </div>
                  ${discountAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #43A047;">
                      <span>Discount (${discount}):</span>
                      <span>-$${discountAmount.toFixed(2)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; margin: 12px 0; font-size: 18px; font-weight: bold; color: #333;">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${recoveryUrl}" class="cta-button">Resume Checkout →</a>
            <p style="font-size: 14px; color: #6c757d; margin-top: 15px;">
              Or copy this link:<br>
              <a href="${recoveryUrl}" style="color: #43A047; word-break: break-all;">${recoveryUrl}</a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              This exclusive offer expires soon. Don't miss out on professional lawn care at a great price!
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>Thanks,</strong><br>
            The ${businessName} Team
          </p>
          <p style="margin: 10px 0; font-size: 12px;">
            Questions? Reply to this email or call us at ${process.env.BUSINESS_PHONE || '1-800-LAWN-CARE'}
          </p>
          <p style="margin: 10px 0; font-size: 12px;">
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
 * Generate plain text email template
 */
export function generateRecoveryEmailText(data: EmailTemplateData): string {
  const { firstName, packageName, discount, recoveryUrl, businessName = 'LawnCare' } = data
  
  return `Hi ${firstName},

We noticed you left your ${packageName} in your cart.

Complete your booking now and enjoy ${discount} off your first service.

Resume Checkout: ${recoveryUrl}

Thanks,
The ${businessName} Team

Questions? Reply to this email or call us at ${process.env.BUSINESS_PHONE || '1-800-LAWN-CARE'}

To unsubscribe: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe`
}

/**
 * Generate SMS template
 */
export function generateRecoverySMS(data: SMSTemplateData): string {
  const { firstName, packageName, checkoutLink } = data
  
  return `Hi ${firstName}, you left your ${packageName} in your cart. Complete it now & save 5%! Link: ${checkoutLink}`
}

/**
 * Get email subject line
 */
export function getEmailSubject(): string {
  return "Your lawn deserves better — complete your booking!"
}