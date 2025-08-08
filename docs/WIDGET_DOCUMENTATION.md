# Sunstone Widget Documentation

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Installation Methods](#installation-methods)
4. [Configuration](#configuration)
5. [Advanced Features](#advanced-features)
6. [API Reference](#api-reference)
7. [Webhooks](#webhooks)
8. [Analytics](#analytics)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Overview

The Sunstone Property Measurement Widget is a powerful, embeddable tool that allows businesses to offer instant property measurement quotes directly on their websites. It integrates seamlessly with your existing website and provides a complete quote generation experience for your customers.

### Key Features
- 🚀 **Instant Measurements**: AI-powered property measurements in seconds
- 💰 **Real-time Pricing**: Dynamic quote calculation based on your pricing rules
- 📱 **Mobile Responsive**: Works perfectly on all devices
- 🎨 **Fully Customizable**: Match your brand colors and style
- 📊 **Analytics Dashboard**: Track conversions and performance
- 🔗 **Webhook Support**: Integrate with your existing systems
- 🛡️ **Security**: Rate limiting and domain restrictions

## Quick Start

### 1. Get Your Business ID
Log in to your dashboard and find your Business ID in Settings.

### 2. Add the Widget Script
Add this code to your website just before the closing `</body>` tag:

```html
<script src="https://yourdomain.com/widget/embed.js"></script>
<script>
  ssWidget('init', {
    businessId: 'YOUR_BUSINESS_ID'
  });
</script>
```

### 3. That's It!
The widget will automatically appear on your website as a floating button.

## Installation Methods

### Method 1: JavaScript Widget (Recommended)

The JavaScript widget appears as a floating button that opens an overlay when clicked.

```html
<!-- Basic Installation -->
<script src="https://yourdomain.com/widget/embed.js"></script>
<script>
  ssWidget('init', {
    businessId: 'YOUR_BUSINESS_ID'
  });
</script>
```

#### Advanced Configuration

```html
<script src="https://yourdomain.com/widget/embed.js"></script>
<script>
  ssWidget('init', {
    businessId: 'YOUR_BUSINESS_ID',
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    autoOpen: false,          // Auto-open on page load
    delay: 3000,              // Delay before auto-open (ms)
    triggerOn: 'click'       // click, pageLoad, scroll, exitIntent, timer
  });
  
  // Callback handler for widget events
  window.ssWidgetCallback = function(event, data) {
    switch(event) {
      case 'open':
        console.log('Widget opened');
        // Track in Google Analytics
        gtag('event', 'widget_open', {
          event_category: 'Widget',
          event_label: 'Property Measurement'
        });
        break;
      case 'close':
        console.log('Widget closed');
        break;
      case 'complete':
        console.log('Quote generated:', data);
        // Track conversion
        gtag('event', 'conversion', {
          event_category: 'Widget',
          event_label: 'Quote Generated',
          value: data.total
        });
        break;
    }
  };
</script>
```

### Method 2: Iframe Embed

Embed the widget directly in your page content.

```html
<iframe 
  src="https://yourdomain.com/widget/YOUR_BUSINESS_ID"
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: none; max-width: 100%;">
</iframe>
```

#### Responsive Iframe

```html
<div style="position: relative; padding-bottom: 150%; height: 0; overflow: hidden;">
  <iframe 
    src="https://yourdomain.com/widget/YOUR_BUSINESS_ID"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;">
  </iframe>
</div>
```

### Method 3: Direct Link

Link directly to the widget page.

```html
<a href="https://yourdomain.com/widget/YOUR_BUSINESS_ID" 
   target="_blank" 
   class="btn btn-primary">
  Get Instant Quote
</a>
```

### Method 4: WordPress Plugin

For WordPress sites, use our dedicated plugin:

1. Download the plugin from your dashboard
2. Upload to WordPress via Plugins > Add New
3. Activate the plugin
4. Configure with your Business ID
5. Use shortcode: `[sunstone_widget]`

## Configuration

### Dashboard Settings

Configure your widget from the dashboard at `/widget`:

#### Visual Settings
- **Primary Color**: Main widget color (buttons, highlights)
- **Secondary Color**: Accent color
- **Font Family**: Choose from popular web fonts
- **Border Radius**: Rounded or square corners
- **Logo**: Upload your company logo

#### Display Options
- **Show Company Name**: Display your business name
- **Show Description**: Custom welcome message
- **Button Text**: Customize the CTA button
- **Position**: Widget placement on page

#### Form Configuration
- **Collect Phone**: Make phone number required/optional
- **Collect Address**: Pre-fill or collect address
- **Required Fields**: Choose mandatory fields
- **Custom Fields**: Add business-specific fields

#### Services
- **Allowed Services**: Enable/disable specific services
- **Service Descriptions**: Add helpful descriptions
- **Service Images**: Upload service photos
- **Pricing Display**: Show/hide pricing breakdown

#### Automation
- **Auto Generate Quote**: Instant quotes without manual review
- **Send Quote Email**: Automatic email delivery
- **Follow-up Emails**: Scheduled reminders
- **SMS Notifications**: Text message alerts

### Programmatic API

Control the widget programmatically:

```javascript
// Open widget
ssWidget('open');

// Close widget
ssWidget('close');

// Toggle widget
ssWidget('toggle');

// Destroy widget
ssWidget('destroy');

// Update configuration
ssWidget('config', {
  position: 'bottom-left',
  autoOpen: true
});

// Pre-fill customer data
ssWidget('prefill', {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  address: '123 Main St'
});

// Set service selection
ssWidget('services', ['lawn', 'driveway']);

// Track custom event
ssWidget('track', 'custom_event', {
  category: 'Widget',
  action: 'Button Click',
  label: 'CTA'
});
```

## Advanced Features

### Multi-Step Form

The enhanced widget includes a multi-step form:

1. **Service Selection**: Choose from available services
2. **Property Address**: Enter service location
3. **Measurement**: Interactive map for property outline
4. **Customization**: Add-ons and service options
5. **Contact Info**: Customer details
6. **Review**: Quote summary and confirmation

Enable by setting:
```javascript
{
  allowServiceCustomization: true,
  showPriceBreakdown: true
}
```

### Real-time Pricing

Display pricing as customers make selections:

```javascript
{
  showPriceBreakdown: true,
  enableRealtimePricing: true,
  displayTaxes: true,
  showDiscounts: true
}
```

### Manual Selection Mode

Allow customers to draw custom polygons:

```javascript
{
  enableManualSelection: true,
  enableAIDetection: true, // AI assistance
  drawingTools: ['polygon', 'rectangle', 'circle']
}
```

### Geopricing

Apply location-based pricing:

```javascript
{
  enableGeopricing: true,
  pricingZones: [
    { zipCodes: ['12345', '12346'], multiplier: 1.1 },
    { zipCodes: ['12347'], multiplier: 0.9 }
  ]
}
```

### A/B Testing

Test different widget configurations:

```javascript
{
  enableABTesting: true,
  variants: [
    { id: 'a', primaryColor: '#00A651' },
    { id: 'b', primaryColor: '#0066CC' }
  ],
  trackingId: 'experiment-001'
}
```

## API Reference

### Widget Configuration API

#### GET /api/widget/config
Retrieve widget configuration for a business.

**Parameters:**
- `businessId` (required): Your business ID

**Response:**
```json
{
  "businessId": "xxx",
  "businessName": "Your Business",
  "settings": {
    "primaryColor": "#00A651",
    "autoGenerateQuote": true,
    ...
  }
}
```

### Widget Submission API

#### POST /api/widget/submit
Submit widget form data.

**Request Body:**
```json
{
  "businessId": "xxx",
  "customerData": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234"
  },
  "measurementData": {
    "address": "123 Main St",
    "coordinates": { "lat": 40.7128, "lng": -74.0060 },
    "measurements": {
      "lawn": 5000,
      "driveway": 800
    }
  },
  "services": ["lawn", "driveway"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quoteId": "xxx",
    "quoteNumber": "Q-2024-001",
    "total": 285.50,
    "viewUrl": "https://yourdomain.com/quote/xxx"
  }
}
```

### Rate Limits

- Widget Config: 60 requests/minute
- Widget Submit: 10 requests/minute per IP/business
- Analytics: 30 requests/minute

## Webhooks

### Setup

Configure webhooks in your dashboard or via API:

```json
{
  "enabled": true,
  "url": "https://your-server.com/webhook",
  "secret": "your-secret-key",
  "events": [
    "widget.loaded",
    "widget.opened",
    "widget.submission",
    "widget.quote_generated"
  ],
  "retryOnFailure": true,
  "maxRetries": 3
}
```

### Event Types

#### widget.loaded
Triggered when widget loads on a page.

```json
{
  "event": "widget.loaded",
  "businessId": "xxx",
  "timestamp": "2024-01-01T12:00:00Z",
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://example.com"
  }
}
```

#### widget.submission
Triggered when a form is submitted.

```json
{
  "event": "widget.submission",
  "businessId": "xxx",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "customer": {
      "id": "xxx",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "measurement": {
      "id": "xxx",
      "address": "123 Main St",
      "measurements": { ... }
    }
  }
}
```

### Webhook Security

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## Analytics

### Dashboard Metrics

Track widget performance in the Analytics dashboard:

- **Total Views**: Widget impressions
- **Widget Opens**: Engagement rate
- **Submissions**: Form completions
- **Conversion Rate**: Views to submissions
- **Average Quote Value**: Revenue metrics
- **Top Services**: Popular selections

### Custom Tracking

Integrate with your analytics platform:

```javascript
// Google Analytics 4
gtag('event', 'widget_view', {
  event_category: 'Widget',
  business_id: 'YOUR_BUSINESS_ID'
});

// Facebook Pixel
fbq('track', 'ViewContent', {
  content_name: 'Property Widget',
  content_category: 'Lead Generation'
});

// Custom Analytics
fetch('/api/analytics/track', {
  method: 'POST',
  body: JSON.stringify({
    event: 'widget_interaction',
    properties: { ... }
  })
});
```

### Conversion Tracking

Track ROI and conversions:

```javascript
window.ssWidgetCallback = function(event, data) {
  if (event === 'complete') {
    // Google Ads Conversion
    gtag('event', 'conversion', {
      'send_to': 'AW-XXXXXXXXX/XXXXXXXXX',
      'value': data.total,
      'currency': 'USD'
    });
    
    // Facebook Conversion
    fbq('track', 'Lead', {
      value: data.total,
      currency: 'USD'
    });
  }
};
```

## Troubleshooting

### Common Issues

#### Widget Not Appearing

1. **Check Business ID**: Ensure correct ID is used
2. **Verify Domain**: Check domain restrictions in settings
3. **Console Errors**: Open browser console for errors
4. **Script Loading**: Ensure script loads before initialization

```javascript
// Debug mode
ssWidget('debug', true);
```

#### Slow Performance

1. **Optimize Images**: Use compressed images
2. **Lazy Loading**: Enable lazy loading for maps
3. **CDN Usage**: Use CDN for static assets
4. **Caching**: Enable browser caching

#### Mobile Issues

1. **Viewport Meta**: Ensure proper viewport tag
2. **Touch Events**: Test on actual devices
3. **Responsive Design**: Check different screen sizes

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify Business ID |
| 403 | Forbidden | Check domain restrictions |
| 429 | Rate Limited | Reduce request frequency |
| 500 | Server Error | Contact support |

### Debug Mode

Enable detailed logging:

```javascript
ssWidget('init', {
  businessId: 'YOUR_BUSINESS_ID',
  debug: true,
  verbose: true
});
```

## Best Practices

### Performance

1. **Async Loading**: Load widget asynchronously
```html
<script async src="https://yourdomain.com/widget/embed.js"></script>
```

2. **Lazy Initialization**: Initialize only when needed
```javascript
document.addEventListener('DOMContentLoaded', function() {
  if (window.innerWidth > 768) {
    ssWidget('init', { ... });
  }
});
```

3. **Resource Optimization**: Minimize widget impact
```javascript
{
  lazyLoad: true,
  preloadImages: false,
  cacheTimeout: 3600
}
```

### Security

1. **Domain Restrictions**: Limit to your domains
2. **HTTPS Only**: Always use secure connections
3. **Content Security Policy**: Add CSP headers
4. **Input Validation**: Validate all user inputs

### SEO

1. **Fallback Content**: Provide no-JS alternative
```html
<noscript>
  <a href="https://yourdomain.com/widget/YOUR_BUSINESS_ID">
    Get Instant Quote
  </a>
</noscript>
```

2. **Structured Data**: Add schema markup
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Property Measurement",
  "provider": {
    "@type": "Organization",
    "name": "Your Business"
  }
}
</script>
```

### User Experience

1. **Loading Indicators**: Show progress
2. **Error Messages**: Clear, helpful errors
3. **Mobile First**: Design for mobile
4. **Accessibility**: ARIA labels, keyboard nav
5. **Localization**: Support multiple languages

## Support

### Resources

- **Documentation**: https://docs.yourdomain.com
- **API Reference**: https://api.yourdomain.com/docs
- **Status Page**: https://status.yourdomain.com
- **Community Forum**: https://community.yourdomain.com

### Contact

- **Email**: support@yourdomain.com
- **Phone**: 1-800-XXX-XXXX
- **Live Chat**: Available in dashboard

### Changelog

#### Version 2.0.0
- Enhanced multi-step form
- Real-time pricing
- Webhook support
- Analytics dashboard
- Rate limiting

#### Version 1.5.0
- Manual selection mode
- Mobile optimizations
- A/B testing framework

#### Version 1.0.0
- Initial release
- Basic widget functionality
- Quote generation

---

© 2024 Sunstone Digital Tech. All rights reserved.