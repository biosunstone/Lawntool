# Email Configuration Guide

## Problems Fixed
1. **Email authentication error** "Invalid login: 535 Authentication failed" - Resolved with proper Gmail App Password configuration
2. **Webpack import error** "nodemailer.createTransporter is not a function" - Fixed with Next.js-compatible server-side imports

## Important: Gmail App Password Required
**Gmail no longer allows using your regular password for SMTP authentication.** You must use an App Password.

### How to Generate a Gmail App Password:

1. **Enable 2-Step Verification** (required for App Passwords)
   - Go to https://myaccount.google.com/security
   - Click on "2-Step Verification"
   - Follow the setup process

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" from the dropdown
   - Select your device type
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Update your .env.local file**
   ```env
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=meabhishekthakur2000@gmail.com
   EMAIL_SERVER_PASSWORD=xxxx xxxx xxxx xxxx  # Your 16-character app password (remove spaces)
   EMAIL_FROM=meabhishekthakur2000@gmail.com
   ```

## Configuration Options

### Option 1: Individual Environment Variables (Recommended)
```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### Option 2: URL Format
```env
EMAIL_SERVER=smtp://username:password@smtp.gmail.com:587
EMAIL_FROM=your-email@gmail.com
```

## Supported Email Providers

### Gmail
```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
# Requires App Password
```

### Outlook/Hotmail
```env
EMAIL_SERVER_HOST=smtp-mail.outlook.com
EMAIL_SERVER_PORT=587
```

### Yahoo
```env
EMAIL_SERVER_HOST=smtp.mail.yahoo.com
EMAIL_SERVER_PORT=587
# Requires App Password
```

### SendGrid
```env
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
```

## Testing Your Configuration

### 1. Run the Email Test Script
```bash
node test-email-config.js
```

This will:
- Verify your email configuration
- Test SMTP authentication
- Send a test email
- Provide troubleshooting guidance if it fails

### 2. Test Through the Application
1. Create a quote in the dashboard
2. Send the quote to a customer
3. Check if the email is delivered

## Files Updated

1. **lib/saas/email-service.ts** (NEW)
   - Next.js-compatible email service with server-side nodemailer imports
   - Support for multiple configuration formats
   - Better error handling and debugging
   - Handles webpack bundling issues

2. **lib/saas/email.ts** (REPLACED)
   - Completely rewritten to use email-service.ts
   - Fixed webpack import errors
   - Maintains backward compatibility with existing API

3. **.env.local**
   - Updated with correct Gmail configuration format
   - Added individual SMTP variables

4. **test-email.js** (NEW)
   - Test script to verify email configuration
   - Provides troubleshooting guidance

5. **app/api/test-email/route.ts**
   - Updated to check both EMAIL_SERVER and EMAIL_SERVER_HOST variables

## Common Issues and Solutions

### Issue: "Invalid login: 535 Authentication failed"
**Solution:** Use an App Password instead of your regular password

### Issue: "self signed certificate in certificate chain"
**Solution:** The configuration now includes `rejectUnauthorized: false` for development

### Issue: "Connection timeout"
**Solution:** Check your firewall settings and ensure port 587 is open

### Issue: "Invalid credentials"
**Solution:** 
1. Verify your email and password are correct
2. For Gmail, ensure you're using an App Password
3. Check that 2-factor authentication is enabled (required for App Passwords)

## Security Notes

1. **Never commit your .env.local file** to version control
2. **Use App Passwords** instead of regular passwords
3. **Consider using a dedicated email service** like SendGrid for production
4. **Keep your App Passwords secure** and rotate them periodically

## Fallback Behavior

If no email configuration is provided, the system will:
1. Use Ethereal Email (a testing service)
2. Log preview URLs in the console
3. Not send actual emails

This is useful for development and testing without setting up SMTP.

## Next Steps

1. Generate a Gmail App Password following the instructions above
2. Update your .env.local file with the App Password (remove spaces)
3. Run `node test-email-config.js` to verify it works
4. Test sending quotes through the application

## Support

If you continue to have issues:
1. Check the console logs for detailed error messages
2. Run the test script for troubleshooting guidance
3. Ensure your Gmail account has "Less secure app access" disabled (App Passwords are more secure)
4. Consider using a dedicated email service for production use