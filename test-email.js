/**
 * Simple email configuration test
 * Run: node test-email.js
 */

const nodemailer = require('nodemailer')
require('dotenv').config({ path: '.env.local' })

async function testEmail() {
  console.log('📧 Testing Email Configuration...\n')
  
  // Check if environment variables are set
  if (!process.env.EMAIL_SERVER_HOST) {
    console.error('❌ EMAIL_SERVER_HOST not configured in .env.local')
    console.log('\nPlease add the following to your .env.local file:')
    console.log(`
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your.email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your.email@gmail.com
    `)
    return
  }
  
  console.log('Configuration:')
  console.log('  Host:', process.env.EMAIL_SERVER_HOST)
  console.log('  Port:', process.env.EMAIL_SERVER_PORT)
  console.log('  User:', process.env.EMAIL_SERVER_USER)
  console.log('  From:', process.env.EMAIL_FROM)
  console.log()
  
  try {
    // Create transport (not transporter!)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: process.env.EMAIL_SERVER_PORT === '465',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD
      }
    })
    
    // Verify connection
    console.log('🔍 Verifying SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection successful!\n')
    
    // Send test email
    console.log('📤 Sending test email...')
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_SERVER_USER, // Send to yourself
      subject: '🎉 Cart Recovery Email Test - Success!',
      text: 'If you can read this, your email configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">✅ Email Configuration Successful!</h2>
          <p>Your email setup is working correctly. You can now send cart recovery emails.</p>
          <hr style="margin: 20px 0;">
          <h3>Test Details:</h3>
          <ul>
            <li>SMTP Host: ${process.env.EMAIL_SERVER_HOST}</li>
            <li>Port: ${process.env.EMAIL_SERVER_PORT}</li>
            <li>From: ${process.env.EMAIL_FROM}</li>
            <li>Time: ${new Date().toLocaleString()}</li>
          </ul>
          <hr style="margin: 20px 0;">
          <p style="color: #666;">This is a test email from your Abandoned Cart Recovery system.</p>
        </div>
      `
    })
    
    console.log('✅ Test email sent successfully!')
    console.log('  Message ID:', info.messageId)
    console.log('  Check your inbox:', process.env.EMAIL_SERVER_USER)
    
    // If using Ethereal, show preview URL
    if (process.env.EMAIL_SERVER_HOST === 'smtp.ethereal.email') {
      console.log('\n📧 View email at:', nodemailer.getTestMessageUrl(info))
    }
    
  } catch (error) {
    console.error('\n❌ Email test failed:', error.message)
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Tips:')
      console.log('  1. For Gmail: Use App Password, not regular password')
      console.log('  2. Enable 2-Factor Authentication first')
      console.log('  3. Generate App Password at: https://myaccount.google.com/apppasswords')
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tips:')
      console.log('  1. Check your internet connection')
      console.log('  2. Verify SMTP host and port are correct')
      console.log('  3. Try port 465 (SSL) or 587 (TLS)')
    }
  }
}

// Run test
testEmail()