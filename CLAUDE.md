# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sunstone Digital Tech is a multi-tenant SaaS property measurement application that enables businesses to provide instant lawn care quotes using Google Maps satellite imagery, with customer management and automated pricing.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev              # Default port 3000

# Build and deployment
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Test utilities (run from project root)
node test-mongodb.js              # Test MongoDB connection
node test-email.js                # Test email sending
node test-email-config.js         # Test email configuration  
node test-quote-generation.js     # Test quote generation
node test-pricing-rules.js        # Test pricing rules
node test-geofencing.js           # Test geofencing features
node test-zapier-integration.js   # Test Zapier integration

# Setup scripts
node scripts/create-test-users.js           # Create test users
node scripts/create-test-business.js        # Create test business
node scripts/setup-comprehensive-pricing.js # Setup pricing rules
node scripts/setup-geofencing.js           # Setup geofencing zones
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14.2.5 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose ODM  
- **Authentication**: NextAuth.js v4 with credentials provider
- **Maps**: Google Maps JavaScript API (@react-google-maps/api)
- **Email**: Nodemailer
- **Payments**: Stripe subscriptions
- **State**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form with Zod validation
- **PDF**: jsPDF for quote exports

### Environment Configuration (.env.local)
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=    # Google Maps API key
MONGODB_URI=                        # MongoDB connection string
NEXTAUTH_SECRET=                    # NextAuth secret for JWT
NEXTAUTH_URL=http://localhost:3000  # NextAuth base URL
STRIPE_SECRET_KEY=                  # Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Stripe publishable key
EMAIL_FROM=                         # Sender email address
EMAIL_SERVER_HOST=                  # SMTP host
EMAIL_SERVER_PORT=                  # SMTP port
EMAIL_SERVER_USER=                  # SMTP username
EMAIL_SERVER_PASSWORD=              # SMTP password
```

### Required Google APIs
Enable in Google Cloud Console:
- Maps JavaScript API
- Places API  
- Geocoding API
- Maps Embed API

## Core Architecture

### Authentication & Authorization
- **NextAuth Configuration**: `lib/saas/auth.ts` - JWT strategy with role-based access
- **Middleware**: `middleware.ts` - Route protection by role (admin, business_owner, staff, customer)
- **Multi-Business Support**: Users can belong to multiple businesses with role-based permissions
- **Session Management**: JWT tokens include businessId for tenant context

### Database Models (Mongoose)
- `User` - Authentication with roles and multi-business associations
- `Business` - Multi-tenant accounts with settings and branding
- `Customer` - Business-linked customer records
- `Measurement` - Property measurements with polygon data
- `Quote` - Quote generation with email notifications
- `PricingRule` - Complex pricing engine with multiple calculation methods
- `Subscription` - Stripe subscription management
- `TeamInvitation` - Team member invitations with permissions
- `SystemSettings` - Global configuration
- `ZapierIntegration` - Zapier webhook configurations
- `GeofencingConfig` - Location-based pricing zones

### API Routes Structure
- `/api/auth/*` - Authentication (signup, login, session)
- `/api/customers/*` - Customer CRUD operations
- `/api/measurements/*` - Measurement saving and retrieval
- `/api/quotes/*` - Quote generation and management
- `/api/pricing-rules/*` - Business pricing configuration
- `/api/team/*` - Team management and invitations
- `/api/billing/*` - Stripe subscription management
- `/api/admin/*` - Admin-only operations
- `/api/geocode` - Server-side geocoding (avoids CORS)
- `/api/public/quote/*` - Public quote viewing
- `/api/zapier/*` - Zapier integration endpoints
- `/api/geofencing/*` - Geofencing configuration
- `/api/geopricing/*` - Location-based pricing
- `/api/zipcode-pricing/*` - ZIP code pricing rules

### Measurement System Flow
1. **Address Input**: `AddressSearchWithAutocomplete` component with Google Places
2. **Geocoding**: Server-side via `/api/geocode` endpoint
3. **Calculation Engine**:
   - `lib/propertyMeasurement.ts` - Shoelace formula for area calculation
   - `lib/geospatialAnalysis.ts` - Property type detection
   - `lib/accurateMeasurements.ts` - Measurement generation (simulated)
   - `lib/manualSelection/polygonCalculator.ts` - Manual polygon calculations
4. **Map Components**: EmbedMap, SimpleMap, WorkingMap, InteractiveMapOverlay
5. **Results Display**: `MeasurementResults` component

### SaaS Features
- **Multi-Tenancy**: Complete business isolation with tenant context
- **Team Management**: Invitation system with role-based permissions
- **Subscription Tiers**: Stripe integration with usage limits
- **White-Label Widget**: Embeddable at `/widget/[businessId]`
- **Pricing Engine**: Multiple calculation methods (per sqft, flat rate, tiered)
- **Geofencing**: Location-based pricing with polygon zones
- **Zapier Integration**: Webhook triggers for automation
- **Manual Selection**: Polygon drawing tool for accurate measurements

## Implementation Guidelines

### Dynamic Imports
Map components must use dynamic imports to prevent SSR errors:
```typescript
dynamic(() => import('...'), { ssr: false })
```

### API Route Pattern
```typescript
// Always start with database connection
await connectDB()

// Verify authentication
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Check business context for multi-tenant isolation
const businessId = session.user.businessId

// Use hasRole() helper for permission checks
if (!hasRole(session.user, ['admin', 'business_owner'])) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### TypeScript Path Alias
Use `@/` for imports (maps to project root)

### State Management
- React Query for server state
- Context API for UI state (ManualSelectionContext)
- Local state for component-specific needs

### Error Handling
API routes should return appropriate HTTP status codes with error messages

### Business Context
Always verify business context in API routes for data isolation

## Current Limitations
- Measurements are simulated (no actual satellite image analysis)
- No computer vision for boundary detection
- Basic HTML email templates
- No automated test suite (only manual test scripts)

## Testing Approach
Use the test scripts in project root for verifying functionality:
- Database connectivity
- Email configuration
- Pricing rules
- Geofencing zones
- Zapier webhooks

## Manual Selection Mode
Toggle between automatic and manual measurement modes:
- `contexts/ManualSelectionContext.tsx` - State management
- `components/manual/InteractiveMapOverlay.tsx` - Drawing interface
- `components/manual/SelectionToolbar.tsx` - UI controls
- Polygon drawing with real-time area calculation