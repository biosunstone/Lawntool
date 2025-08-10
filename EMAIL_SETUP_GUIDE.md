# 📧 Email Configuration & Testing Guide

## Quick Setup Options

### Option 1: Using Gmail (Recommended for Testing)

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security"
3. Enable "2-Step Verification"

#### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Copy the 16-character password generated

#### Step 3: Update .env.local
```env
# Gmail SMTP Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your.email@gmail.com
EMAIL_SERVER_PASSWORD=your-16-char-app-password
EMAIL_FROM=your.email@gmail.com
```

---

### Option 2: Using Ethereal Email (Free Testing Service)

#### Step 1: Create Test Account
1. Visit: https://ethereal.email/
2. Click "Create Ethereal Account"
3. Copy the credentials

#### Step 2: Update .env.local
```env
# Ethereal Test Configuration
EMAIL_SERVER_HOST=smtp.ethereal.email
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your.ethereal.user@ethereal.email
EMAIL_SERVER_PASSWORD=your-ethereal-password
EMAIL_FROM=test@ethereal.email
```

#### Step 3: View Sent Emails
- Login to https://ethereal.email/
- All emails sent will appear in the inbox (they don't actually send)

---

### Option 3: Using Mailtrap (Professional Testing)

#### Step 1: Sign Up
1. Create free account at: https://mailtrap.io/
2. Go to "Inboxes" → "SMTP Settings"

#### Step 2: Update .env.local
```env
# Mailtrap Configuration
EMAIL_SERVER_HOST=smtp.mailtrap.io
EMAIL_SERVER_PORT=2525
EMAIL_SERVER_USER=your-mailtrap-username
EMAIL_SERVER_PASSWORD=your-mailtrap-password
EMAIL_FROM=test@yourdomain.com
```

---

## Testing Email Functionality

### Test 1: Basic Email Configuration
```bash
# Run the email configuration test
node test-email-config.js
```

Expected output:
```
✅ Email configuration is valid
✅ Test email sent successfully
Message ID: <xxx@gmail.com>
```

### Test 2: Send Test Recovery Email
```bash
# Run the recovery email test
node test-email.js
```

### Test 3: Full Cart Recovery Flow
```bash
# Run complete backend test including emails
node test-cart-recovery-backend.js
```

---

## Troubleshooting Common Issues

### Gmail Issues

#### "Less secure app access" Error
- Use App Password instead of regular password
- Ensure 2FA is enabled

#### "SMTP Connection Failed"
```env
# Try these alternative ports
EMAIL_SERVER_PORT=465  # For SSL
EMAIL_SERVER_PORT=587  # For TLS (recommended)
EMAIL_SERVER_PORT=25   # Standard SMTP
```

### General Issues

#### Connection Timeout
- Check firewall settings
- Verify SMTP host and port
- Try using a VPN if blocked

#### Authentication Failed
- Double-check username/password
- Ensure no extra spaces in .env.local
- Try regenerating app password

---

## Production Email Services

For production, consider these services:

### SendGrid (Recommended)
```env
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Amazon SES
```env
EMAIL_SERVER_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-smtp-username
EMAIL_SERVER_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

### Mailgun
```env
EMAIL_SERVER_HOST=smtp.mailgun.org
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=postmaster@your-domain.mailgun.org
EMAIL_SERVER_PASSWORD=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
```

---

## Email Template Testing

### View Email Templates Locally

1. Create a test endpoint to preview emails:

```javascript
// app/api/test/email-preview/route.ts
import { generateEmailHTML } from '@/lib/cart/recoveryEmailService'

export async function GET() {
  const html = generateEmailHTML({
    to: 'test@example.com',
    name: 'John Doe',
    cartData: [/* sample data */],
    recoveryUrl: 'http://localhost:3000/cart/recover?token=test',
    discountCode: 'SAVE10',
    businessName: 'Test Lawn Care'
  })
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
```

2. Visit: http://localhost:3000/api/test/email-preview

---

## Monitoring Email Delivery

### Check Email Logs
```javascript
// View recovery logs in MongoDB
db.cartrecoverylogs.find({
  contact_type: 'email'
}).sort({ sent_at: -1 })
```

### Email Statistics
```bash
# Get email statistics via API
curl http://localhost:3000/api/cart/recovery/process
```

---

## Security Best Practices

1. **Never commit credentials**
   - Keep .env.local in .gitignore
   - Use environment variables in production

2. **Rate Limiting**
   - Implement rate limiting for email sending
   - Prevent spam and abuse

3. **Email Validation**
   - Validate email addresses before sending
   - Handle bounces and complaints

4. **GDPR Compliance**
   - Include unsubscribe links
   - Honor opt-out requests
   - Store consent records

---

## Quick Test Checklist

- [ ] Email configuration in .env.local
- [ ] SMTP connection successful
- [ ] Test email sends and receives
- [ ] Recovery emails have correct content
- [ ] Links in emails work correctly
- [ ] Discount codes apply properly
- [ ] Tracking pixels/opens work
- [ ] Unsubscribe links function