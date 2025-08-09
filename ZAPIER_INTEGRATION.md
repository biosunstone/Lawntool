# Zapier Integration Documentation

## Overview

Sunstone Digital Tech now supports Zapier integration, allowing businesses to connect their property measurement data with 5,000+ apps. This integration is **completely backward compatible** and **disabled by default**, ensuring existing functionality remains unaffected.

## Architecture

### Key Principles
1. **Non-Breaking**: All Zapier code is isolated and optional
2. **Async Processing**: Events are queued and processed in background
3. **Feature Flagged**: Disabled by default at both global and business levels
4. **Safe Failures**: Zapier errors never affect main application flow

### Components

```
/app/api/zapier/          # Zapier-specific API endpoints
/lib/zapier/              # Zapier utilities and processors
/models/zapier/           # Zapier data models
```

## Implementation Status

### ✅ Completed Features

1. **Event System**
   - Non-blocking event emitter
   - Background queue processing
   - Automatic retry with exponential backoff

2. **Authentication**
   - API key generation and validation
   - Rate limiting per business
   - Tier-based access control

3. **Webhook Management**
   - Subscribe/unsubscribe endpoints
   - Signature verification
   - Delivery tracking and statistics

4. **Integrated Events**
   - Customer creation/update/archive
   - Measurement completion
   - Quote creation/sent/accepted/rejected
   - Widget submissions

5. **Background Processing**
   - Webhook delivery processor
   - Health monitoring
   - Auto-cleanup of old events

### 🚧 Pending Features

1. **Zapier Triggers** (Polling endpoints)
   - Recent customers
   - Recent quotes
   - Recent measurements

2. **Zapier Actions**
   - Create customer
   - Create quote
   - Send quote email

## Configuration

### Environment Variables

```bash
# .env.local
ZAPIER_ENABLED=false  # Set to 'true' to enable globally
```

### Business Configuration

Each business must be individually configured for Zapier:

```javascript
// Business model includes:
zapierSettings: {
  enabled: false,      // Business-level toggle
  tier: 'none',       // none | basic | pro | enterprise
  apiKey: '...',      // Generated API key (hidden)
  configId: '...'     // Reference to ZapierConfig
}
```

## Supported Events

### Customer Events
- `customer.created` - New customer added
- `customer.updated` - Customer information modified
- `customer.archived` - Customer archived

### Measurement Events
- `measurement.completed` - Measurement saved
- `measurement.manual_selection` - Manual polygon drawn
- `measurement.large_property` - Property over 10,000 sq ft

### Quote Events
- `quote.created` - New quote generated
- `quote.sent` - Quote emailed to customer
- `quote.viewed` - Customer viewed quote
- `quote.accepted` - Quote accepted
- `quote.rejected` - Quote rejected

### Widget Events
- `widget.submission` - New lead from widget
- `widget.quote_generated` - Auto-quote generated

### Team Events
- `team.member_invited` - Invitation sent
- `team.member_joined` - Member accepted invite
- `team.member_removed` - Member removed

### Business Events
- `subscription.upgraded` - Plan upgraded
- `subscription.downgraded` - Plan downgraded
- `quota.exceeded` - Usage limit reached

## API Endpoints

### Authentication
- `POST /api/zapier/auth/validate` - Validate API key
- `GET /api/zapier/auth/test` - Test connection

### Webhooks
- `POST /api/zapier/webhooks/subscribe` - Subscribe to events
- `POST /api/zapier/webhooks/unsubscribe` - Unsubscribe
- `GET /api/zapier/webhooks/subscribe` - List subscriptions

### Triggers (Coming Soon)
- `GET /api/zapier/triggers/customers` - Poll recent customers
- `GET /api/zapier/triggers/quotes` - Poll recent quotes
- `GET /api/zapier/triggers/measurements` - Poll recent measurements

### Actions (Coming Soon)
- `POST /api/zapier/actions/create-customer` - Create customer
- `POST /api/zapier/actions/create-quote` - Generate quote
- `POST /api/zapier/actions/send-quote` - Email quote

## Testing

### Test Script
```bash
# Run integration test
node test-zapier-integration.js
```

This script verifies:
- Models load correctly
- Event emission is safe when disabled
- Existing APIs are unaffected
- Background processor health

### Manual Testing

1. **Enable Zapier globally**:
   ```bash
   # Set in .env.local
   ZAPIER_ENABLED=true
   ```

2. **Create test business with Zapier**:
   ```javascript
   // Use admin panel or database to enable for specific business
   business.zapierSettings.enabled = true
   business.zapierSettings.tier = 'basic'
   ```

3. **Generate API key**:
   ```javascript
   const config = new ZapierConfig({...})
   const apiKey = config.generateApiKey()
   ```

4. **Test webhook delivery**:
   - Create customer/quote/measurement
   - Check ZapierEventQueue for pending events
   - Run processor to deliver webhooks

## Security

### API Key Format
```
zap_[businessId]_[randomHash]
```

### Webhook Signatures
All webhooks include HMAC-SHA256 signature in `X-Zapier-Signature` header.

### Rate Limiting
- Default: 10 requests/minute per business
- Configurable per tier

## Monitoring

### Health Check
```javascript
const health = await ZapierWebhookProcessor.getHealth()
// Returns: { healthy, queueSize, failedEvents, processingRate }
```

### Logs
All Zapier activity logged in `ZapierLog` collection:
- Authentication attempts
- Webhook deliveries
- API calls
- Errors

### Auto-Disable
System automatically disables webhooks if:
- Failure rate > 50% (after 10 deliveries)
- Queue size > 1000 events
- Too many failed events

## Rollback Plan

### Level 0: Instant Disable
```bash
ZAPIER_ENABLED=false
```

### Level 1: Disable Per Business
```javascript
business.zapierSettings.enabled = false
```

### Level 2: Remove Integration
Delete `/api/zapier`, `/lib/zapier`, `/models/zapier` folders - no impact on existing code.

## Usage Examples

### For Lawn Care Business
```
Quote Accepted → Create invoice in QuickBooks
              → Schedule in ServiceTitan
              → Send confirmation SMS
              → Update HubSpot deal
```

### For Property Management
```
50 Properties Measured → Export to Google Sheets
                      → Generate reports in Monday.com
                      → Update Buildium records
                      → Email summary to owners
```

### For Contractors
```
Large Property Detected → Calculate materials
                       → Create purchase order
                       → Notify sales team in Slack
                       → Add to project timeline
```

## Performance Guarantees

1. **No Response Time Impact**: Events emitted after response sent
2. **No Database Impact**: Separate collections, indexed queries
3. **No Memory Impact**: Queue in database, not memory
4. **Circuit Breaker**: Auto-disable on health failures

## Next Steps

1. Complete Zapier triggers (polling endpoints)
2. Implement Zapier actions (write operations)
3. Submit app to Zapier for review
4. Create Zapier app documentation
5. Add to Zapier app directory

## Support

For issues or questions:
- Check `ZapierLog` collection for errors
- Run `test-zapier-integration.js` for diagnostics
- Verify `ZAPIER_ENABLED` environment variable
- Ensure business has Zapier enabled and valid tier