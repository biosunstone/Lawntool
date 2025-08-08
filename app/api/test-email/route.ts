import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { sendEmail, createTestEmailAccount } from '@/lib/saas/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, type } = await request.json()
    
    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    let subject = 'Test Email from Sunstone Digital Tech'
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #00A651; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background: white; padding: 30px; border: 1px solid #ddd; margin-top: 20px; border-radius: 5px; }
            .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Sunstone Digital Tech</h1>
              <p>Email Configuration Test</p>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ Email configuration is working correctly!</strong>
              </div>
              
              <h2>Test Email Successfully Sent</h2>
              <p>This is a test email to verify that your email configuration is working properly.</p>
              
              <h3>Configuration Details:</h3>
              <ul>
                <li><strong>Sent to:</strong> ${to}</li>
                <li><strong>Sent from:</strong> ${process.env.EMAIL_FROM || 'noreply@sunstone.com'}</li>
                <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
              </ul>
              
              <p>If you received this email, your email notifications are configured correctly and will work for:</p>
              <ul>
                <li>Quote creation notifications to customers</li>
                <li>Quote acceptance notifications to business</li>
                <li>Quote rejection notifications to business</li>
                <li>Other system notifications</li>
              </ul>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                <p>This is an automated test email. Please do not reply.</p>
                <p>© ${new Date().getFullYear()} Sunstone Digital Tech</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
    
    // If no email configuration, create test account
    if (!process.env.EMAIL_SERVER && !process.env.EMAIL_SERVER_HOST) {
      console.log('No email configuration found, using Ethereal test account')
      const testAccount = await createTestEmailAccount()
      if (testAccount) {
        console.log('Test account created:', testAccount.user)
      }
    }

    const result = await sendEmail(to, subject, html)
    
    if (result.success) {
      return NextResponse.json({
        message: 'Test email sent successfully!',
        messageId: result.messageId,
        to,
        note: (!process.env.EMAIL_SERVER && !process.env.EMAIL_SERVER_HOST)
          ? 'Using Ethereal test account. Check server logs for preview URL.'
          : 'Email sent via configured SMTP server.'
      })
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to send test email',
          details: result.error 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    configured: !!(process.env.EMAIL_SERVER || process.env.EMAIL_SERVER_HOST),
    from: process.env.EMAIL_FROM || 'noreply@sunstone.com',
    environment: process.env.NODE_ENV || 'development',
    smtp_host: process.env.EMAIL_SERVER_HOST || 'Not configured',
    note: (!process.env.EMAIL_SERVER && !process.env.EMAIL_SERVER_HOST)
      ? 'No email configuration found. Emails will use Ethereal test account (check logs for preview URLs).'
      : 'Email is configured. Emails will be sent via SMTP.'
  })
}