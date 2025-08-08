# Widget Testing Plan

## 🎯 Overview
Comprehensive testing plan for the Sunstone Widget across all scenarios, environments, and user flows.

## 📋 Pre-Testing Setup

### 1. Create Test Business Account
```javascript
// Run this script to create a test business with widget settings
node scripts/create-test-business.js
```

Create file: `scripts/create-test-business.js`
```javascript
const mongoose = require('mongoose');
const Business = require('../models/Business');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function createTestBusiness() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Create test user
  const hashedPassword = await bcrypt.hash('testpassword123', 10);
  const user = await User.create({
    email: 'widget.test@example.com',
    password: hashedPassword,
    name: 'Widget Test User',
    role: 'business_owner'
  });
  
  // Create test business with full widget configuration
  const business = await Business.create({
    name: 'Test Widget Business',
    ownerId: user._id,
    widgetSettings: {
      primaryColor: '#00A651',
      secondaryColor: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px',
      showCompanyName: true,
      showDescription: true,
      description: 'Get instant property measurement quotes',
      buttonText: 'Get Quote Now',
      position: 'bottom-right',
      collectPhone: true,
      collectAddress: true,
      requiredFields: ['name', 'email'],
      allowedServices: ['lawn', 'driveway', 'sidewalk', 'gutter'],
      autoGenerateQuote: true,
      sendQuoteEmail: false, // Disable for testing
      autoOpen: false,
      delay: 0,
      enableManualSelection: true,
      enableAIDetection: true,
      showPriceBreakdown: true,
      allowServiceCustomization: true,
      triggerOn: 'click',
      scrollPercentage: 50,
      exitIntentSensitivity: 20,
      enableAnalytics: true,
      isActive: true,
      domains: ['localhost:3000', 'localhost:3001']
    },
    settings: {
      defaultPricing: {
        lawnPerSqFt: 0.02,
        drivewayPerSqFt: 0.03,
        sidewalkPerSqFt: 0.025,
        minimumCharge: 50
      }
    }
  });
  
  console.log('Test Business Created:');
  console.log('Business ID:', business._id);
  console.log('Login Email: widget.test@example.com');
  console.log('Password: testpassword123');
  
  process.exit(0);
}

createTestBusiness().catch(console.error);
```

### 2. Environment Variables
Ensure `.env.local` has all required variables:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
MONGODB_URI=mongodb://localhost:27017/sunstone
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Start Development Server
```bash
npm run dev
```

## 🧪 Testing Scenarios

### Test 1: Basic Widget Loading

#### 1.1 Direct Widget Page
**URL**: `http://localhost:3000/widget/[BUSINESS_ID]`

**Test Steps**:
1. Open widget URL directly
2. Verify widget loads without errors
3. Check console for any errors
4. Verify business name appears
5. Check custom styling is applied

**Expected Results**:
- ✅ Widget loads in < 3 seconds
- ✅ No console errors
- ✅ Custom colors and fonts applied
- ✅ Form fields display correctly

#### 1.2 Iframe Embed
**Test File**: Create `public/test-iframe.html`
```html
<!DOCTYPE html>
<html>
<head>
    <title>Widget Iframe Test</title>
</head>
<body>
    <h1>Iframe Widget Test</h1>
    <iframe 
        src="http://localhost:3000/widget/YOUR_BUSINESS_ID"
        width="100%" 
        height="800" 
        frameborder="0">
    </iframe>
</body>
</html>
```

**Test Steps**:
1. Open `http://localhost:3000/test-iframe.html`
2. Verify widget loads in iframe
3. Test form submission
4. Check responsive behavior

#### 1.3 Floating Widget
**Test File**: Use existing `public/widget-test.html`

**Test Steps**:
1. Open `http://localhost:3000/widget-test.html`
2. Click floating button
3. Verify widget opens as overlay
4. Test close functionality
5. Test programmatic controls

### Test 2: Form Validation

#### 2.1 Required Fields
**Test Cases**:
- Submit with empty name → Should show error
- Submit with invalid email → Should show error
- Submit with all required fields → Should proceed

#### 2.2 Optional Fields
**Test Cases**:
- Submit without phone (when optional) → Should work
- Submit without address (when optional) → Should work

### Test 3: Widget Flows

#### 3.1 Basic Widget Flow
**Steps**:
1. Load basic widget
2. Fill customer information
3. Continue to measurement
4. Complete measurement (or skip)
5. View success page

**Validation Points**:
- Form data persists between steps
- Measurement component loads
- Quote generates successfully
- Success page shows quote details

#### 3.2 Enhanced Widget Flow
**Enable**: Set `allowServiceCustomization: true` in widget settings

**Steps**:
1. Load enhanced widget
2. Select services (lawn, driveway)
3. Enter property address
4. Complete measurement
5. Customize services (add-ons)
6. Enter contact information
7. Review quote
8. Submit

**Validation Points**:
- Service selection works
- Real-time pricing updates
- Add-ons calculate correctly
- Final price matches calculation

### Test 4: Measurement Integration

#### 4.1 Automatic Detection
**Steps**:
1. Enter valid address
2. Wait for map to load
3. Verify property boundaries appear
4. Check measurement calculations

#### 4.2 Manual Selection
**Steps**:
1. Enable manual mode
2. Draw custom polygon
3. Verify area calculation
4. Submit measurement

### Test 5: Mobile Testing

#### 5.1 Responsive Design
**Devices to Test**:
- iPhone 12/13/14 (Safari)
- Samsung Galaxy (Chrome)
- iPad (Safari)

**Test Points**:
- Widget adapts to screen size
- Touch events work properly
- Form inputs are accessible
- Map interaction works

#### 5.2 Mobile-Specific Features
**Test Cases**:
- Fullscreen mode on mobile
- Touch-to-draw functionality
- Keyboard behavior
- Scroll behavior

### Test 6: Cross-Browser Testing

#### Browsers to Test:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ⚠️ Safari iOS
- ⚠️ Chrome Android

**Test Matrix**:
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Widget Load | | | | |
| Form Submit | | | | |
| Map Display | | | | |
| Animations | | | | |
| Webhooks | | | | |

### Test 7: API & Backend

#### 7.1 Rate Limiting
**Test Script**: `tests/rate-limit-test.js`
```javascript
async function testRateLimit() {
  const businessId = 'YOUR_BUSINESS_ID';
  
  // Send 15 requests rapidly (limit is 10/minute)
  for (let i = 0; i < 15; i++) {
    const response = await fetch('/api/widget/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        customerData: { name: `Test ${i}`, email: `test${i}@example.com` },
        measurementData: { address: '123 Test St' }
      })
    });
    
    console.log(`Request ${i + 1}: ${response.status}`);
    
    if (response.status === 429) {
      console.log('Rate limit hit correctly!');
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Retry after: ${retryAfter} seconds`);
    }
  }
}
```

#### 7.2 Webhook Testing
**Test Steps**:
1. Configure webhook URL (use webhook.site for testing)
2. Submit widget form
3. Verify webhook received
4. Check payload structure
5. Test retry on failure

### Test 8: Analytics Testing

#### 8.1 Event Tracking
**Events to Verify**:
- widget.loaded
- widget.opened
- widget.closed
- widget.submission
- widget.quote_generated

**Verification Method**:
1. Open Analytics Dashboard
2. Perform widget actions
3. Verify events appear
4. Check metrics update

#### 8.2 Conversion Tracking
**Test Flow**:
1. Load widget (impression)
2. Open widget (engagement)
3. Fill form (interaction)
4. Submit (conversion)
5. Check funnel in analytics

### Test 9: Security Testing

#### 9.1 Domain Restrictions
**Test Setup**:
1. Add domain restriction in settings
2. Try loading from unauthorized domain
3. Should receive 403 error

#### 9.2 Input Validation
**Test Cases**:
- SQL injection attempts
- XSS attempts in form fields
- Large payload submissions
- Invalid data types

**Test Inputs**:
```javascript
const maliciousInputs = [
  "'; DROP TABLE users; --",
  "<script>alert('XSS')</script>",
  "javascript:alert('XSS')",
  "A".repeat(10000), // Very long string
  { __proto__: { isAdmin: true } } // Prototype pollution
];
```

#### 9.3 Authentication
**Test Cases**:
- Access widget settings without auth → Should fail
- Access analytics without auth → Should fail
- Submit to widget (public) → Should work

### Test 10: Performance Testing

#### 10.1 Load Time
**Metrics to Measure**:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Total load time

**Tool**: Chrome DevTools Performance tab

#### 10.2 Stress Testing
**Test Scenario**:
- Open 10 widgets simultaneously
- Submit 50 forms in 5 minutes
- Monitor server response times
- Check for memory leaks

### Test 11: Error Handling

#### 11.1 Network Errors
**Test Cases**:
1. Disconnect network after loading
2. Slow 3G simulation
3. API timeout scenarios
4. Server 500 errors

#### 11.2 User Errors
**Test Cases**:
1. Invalid business ID
2. Disabled widget
3. Expired quotes
4. Missing configuration

### Test 12: Integration Testing

#### 12.1 Email Integration
**Test**:
1. Enable email sending
2. Submit widget
3. Check email delivery
4. Verify email content
5. Test email templates

#### 12.2 Quote System
**Test**:
1. Generate quote from widget
2. View quote page
3. Accept/decline quote
4. Check status updates

## 🔄 Regression Testing Checklist

### After Each Update:
- [ ] Basic widget loads
- [ ] Form submission works
- [ ] Measurement integration works
- [ ] Quote generation works
- [ ] Analytics tracking works
- [ ] Email notifications work
- [ ] Mobile responsiveness maintained
- [ ] No new console errors
- [ ] Performance not degraded

## 📊 Test Reporting Template

```markdown
### Test Run: [Date]
**Environment**: Development / Staging / Production
**Browser**: Chrome 120
**Device**: Desktop / Mobile

#### Test Results:
- Basic Loading: ✅ PASS / ❌ FAIL
- Form Submission: ✅ PASS / ❌ FAIL
- Measurement: ✅ PASS / ❌ FAIL
- Quote Generation: ✅ PASS / ❌ FAIL
- Mobile: ✅ PASS / ❌ FAIL

#### Issues Found:
1. [Issue description]
   - Steps to reproduce
   - Expected vs Actual
   - Screenshot/Video

#### Performance Metrics:
- Load Time: X.XX seconds
- API Response: XXX ms
- Quote Generation: X.X seconds
```

## 🐛 Common Issues & Solutions

### Issue 1: Widget Not Loading
**Solutions**:
- Check Business ID is valid
- Verify domain is allowed
- Check console for errors
- Ensure scripts load in correct order

### Issue 2: Measurement Not Working
**Solutions**:
- Verify Google Maps API key
- Check address geocoding
- Ensure proper event listeners
- Test manual selection mode

### Issue 3: Quote Not Generating
**Solutions**:
- Check pricing rules configuration
- Verify measurement data
- Check API rate limits
- Review server logs

### Issue 4: Mobile Issues
**Solutions**:
- Test on real devices
- Check viewport settings
- Verify touch events
- Test in different orientations

## 🚀 Automated Testing (Future)

### Recommended Tools:
1. **Cypress** - E2E testing
2. **Jest** - Unit testing
3. **Playwright** - Cross-browser testing
4. **Lighthouse** - Performance testing

### Sample Cypress Test:
```javascript
describe('Widget E2E Tests', () => {
  it('completes full widget flow', () => {
    cy.visit('/widget/test-business-id');
    
    // Fill form
    cy.get('input[type="text"]').first().type('John Doe');
    cy.get('input[type="email"]').type('john@example.com');
    
    // Continue
    cy.contains('Continue').click();
    
    // Wait for measurement
    cy.wait(2000);
    
    // Verify success
    cy.contains('Quote Generated Successfully');
  });
});
```

## 📝 Sign-off Criteria

### Widget is ready for production when:
- [ ] All test scenarios pass
- [ ] No critical bugs
- [ ] Performance meets targets (< 3s load)
- [ ] Works on all major browsers
- [ ] Mobile experience is smooth
- [ ] Security tests pass
- [ ] Analytics tracking verified
- [ ] Documentation complete
- [ ] Stakeholder approval received

---

**Last Updated**: [Date]
**Test Version**: 1.0.0
**Approved By**: [Name]