/**
 * Test email configuration
 * Run this script to verify your email settings are correct
 */

require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('=== Email Configuration Test ===\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('EMAIL_SERVER_HOST:', process.env.EMAIL_SERVER_HOST || 'Not set');
  console.log('EMAIL_SERVER_PORT:', process.env.EMAIL_SERVER_PORT || 'Not set');
  console.log('EMAIL_SERVER_USER:', process.env.EMAIL_SERVER_USER || 'Not set');
  console.log('EMAIL_SERVER_PASSWORD:', process.env.EMAIL_SERVER_PASSWORD ? '****** (set)' : 'Not set');
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
  console.log('EMAIL_SERVER:', process.env.EMAIL_SERVER ? 'Set (URL format)' : 'Not set');
  console.log('\n');

  try {
    // Import the test function
    const { testEmailConfiguration } = await import('./lib/saas/email-config.ts');
    
    console.log('Testing email configuration...\n');
    const result = await testEmailConfiguration();
    
    if (result.success) {
      console.log('✅ Email configuration test PASSED!\n');
      console.log('Your email settings are correctly configured.');
      
      // Try sending a test email
      const { sendEmail } = await import('./lib/saas/email.ts');
      
      console.log('\nSending a test email...');
      const testResult = await sendEmail(
        process.env.EMAIL_FROM || 'test@example.com',
        'Test Email - Sunstone Configuration',
        `
        <h2>Test Email Successful!</h2>
        <p>This is a test email from your Sunstone application.</p>
        <p>If you're seeing this, your email configuration is working correctly.</p>
        <hr>
        <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
        `,
        process.env.EMAIL_FROM
      );
      
      if (testResult.success) {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', testResult.messageId);
      } else {
        console.log('❌ Failed to send test email:', testResult.error);
      }
      
    } else {
      console.log('❌ Email configuration test FAILED!\n');
      console.log('Error:', result.error);
      
      console.log('\n=== Troubleshooting Guide ===\n');
      
      if (result.error?.includes('Authentication failed') || result.error?.includes('Invalid login')) {
        console.log('📧 For Gmail users:');
        console.log('1. You need to use an App Password, not your regular Gmail password');
        console.log('2. Steps to generate an App Password:');
        console.log('   a. Go to https://myaccount.google.com/security');
        console.log('   b. Enable 2-Step Verification (if not already enabled)');
        console.log('   c. Go to https://myaccount.google.com/apppasswords');
        console.log('   d. Select "Mail" and your device');
        console.log('   e. Generate the password');
        console.log('   f. Use this 16-character password in EMAIL_SERVER_PASSWORD');
        console.log('   g. Remove any spaces from the app password\n');
        
        console.log('📝 Example .env.local configuration for Gmail:');
        console.log('EMAIL_SERVER_HOST=smtp.gmail.com');
        console.log('EMAIL_SERVER_PORT=587');
        console.log('EMAIL_SERVER_USER=your-email@gmail.com');
        console.log('EMAIL_SERVER_PASSWORD=your-16-char-app-password-no-spaces');
        console.log('EMAIL_FROM=your-email@gmail.com');
      }
      
      if (result.error?.includes('ENOTFOUND') || result.error?.includes('getaddrinfo')) {
        console.log('🌐 Network/Host Issues:');
        console.log('1. Check your EMAIL_SERVER_HOST is correct');
        console.log('2. Common SMTP hosts:');
        console.log('   - Gmail: smtp.gmail.com');
        console.log('   - Outlook: smtp-mail.outlook.com');
        console.log('   - Yahoo: smtp.mail.yahoo.com');
        console.log('   - SendGrid: smtp.sendgrid.net');
      }
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
    console.log('\nMake sure you have all required dependencies installed:');
    console.log('npm install nodemailer');
  }
}

// Run the test
console.log('Starting email configuration test...\n');
testEmail().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});