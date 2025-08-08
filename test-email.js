/**
 * Test email configuration - Updated for new email service
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
  console.log('\n');

  try {
    // Import and test the email service
    const { verifyEmailConfig, sendMail } = await import('./lib/saas/email-service.ts');
    
    console.log('Testing email configuration...\n');
    const verifyResult = await verifyEmailConfig();
    
    if (verifyResult.success) {
      console.log('✅ Email configuration test PASSED!\n');
      console.log('Your email settings are correctly configured.');
      
      // Try sending a test email
      console.log('\nSending a test email...');
      const testResult = await sendMail({
        from: process.env.EMAIL_FROM || 'test@example.com',
        to: process.env.EMAIL_FROM || 'test@example.com',
        subject: 'Test Email - Sunstone Configuration',
        html: `
          <h2>Test Email Successful!</h2>
          <p>This is a test email from your Sunstone application.</p>
          <p>If you're seeing this, your email configuration is working correctly.</p>
          <hr>
          <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
        `
      });
      
      if (testResult.success) {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', testResult.messageId);
      } else {
        console.log('❌ Failed to send test email:', testResult.error);
      }
      
    } else {
      console.log('❌ Email configuration test FAILED!\n');
      console.log('Error:', verifyResult.error);
      
      console.log('\n=== Troubleshooting Guide ===\n');
      
      if (verifyResult.error?.includes('Authentication failed') || verifyResult.error?.includes('Invalid login')) {
        console.log('📧 Gmail Authentication Issue:');
        console.log('\nYou need to use an App Password for Gmail, not your regular password.');
        console.log('\nSteps to fix:');
        console.log('1. Go to https://myaccount.google.com/security');
        console.log('2. Enable 2-Step Verification (required for App Passwords)');
        console.log('3. Go to https://myaccount.google.com/apppasswords');
        console.log('4. Generate a new App Password for "Mail"');
        console.log('5. Copy the 16-character password (looks like: abcd efgh ijkl mnop)');
        console.log('6. Remove ALL spaces from the password: abcdefghijklmnop');
        console.log('7. Update your .env.local file:');
        console.log('   EMAIL_SERVER_PASSWORD=abcdefghijklmnop');
        console.log('\n⚠️  Make sure to remove ALL spaces from the App Password!');
      }
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
    console.log('\nMake sure the application can compile properly.');
    console.log('Try running: npm run build');
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