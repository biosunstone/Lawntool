# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sunstone Digital Tech is a multi-tenant SaaS property measurement application that enables businesses to provide instant lawn care quotes using Google Maps satellite imagery, with customer management, automated pricing, and advanced features like cart recovery and geofencing.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev              # Default port 3000
PORT=3001 npm run dev    # Alternative port if 3000 is in use

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
node test-geopricing.js           # Test geo-based pricing
node test-cart-recovery.js        # Test cart recovery flow
node test-abandonment-flow.js     # Test cart abandonment

# Setup scripts
node scripts/create-test-users.js           # Create test users
node scripts/create-test-business.js        # Create test business
node scripts/setup-comprehensive-pricing.js # Setup pricing rules
node scripts/setup-geofencing.js           # Setup geofencing zones
node scripts/setup-geopricing-config.js    # Setup geo-pricing
node scripts/setup-zipcode-pricing.js      # Setup ZIP code pricing
node scripts/setup-toronto-geopricing.js   # Setup Toronto area pricing

# Business switching and team management tests
node test-business-switching.mjs   # Test multi-business features
node test-invitation-flow.mjs      # Test team invitations
node test-multi-business.mjs       # Test multi-tenant isolation
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14.2.5 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose ODM  
- **Authentication**: NextAuth.js v4 with JWT sessions
- **Maps**: Google Maps JavaScript API (@react-google-maps/api)
- **Email**: Nodemailer
- **Payments**: Stripe subscriptions
- **State**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form with Zod validation
- **PDF**: jsPDF for quote exports
- **Canvas**: Konva for advanced map overlays

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
- **Multi-Business Support**: Users can belong to multiple businesses via BusinessMembership
- **Session Management**: JWT tokens include businessId for tenant context
- **Business Switching**: `useBusinessContext` hook for dynamic business context

### Database Models (Mongoose)
- `User` - Authentication with roles and multi-business associations
- `Business` - Multi-tenant accounts with settings and branding
- `BusinessMembership` - Many-to-many user-business relationships
- `Customer` - Business-linked customer records
- `Measurement` - Property measurements with polygon data
- `Quote` - Quote generation with email notifications
- `PricingRule` - Complex pricing engine with multiple calculation methods
- `Subscription` - Stripe subscription management
- `TeamInvitation` - Team member invitations with permissions
- `SystemSettings` - Global configuration
- `GeofencingConfig` - Location-based pricing zones
- `GeopricingConfig` - Geographic pricing configuration
- `GeopricingZone` - Pricing zones with drive time calculations
- `ShopLocation` - Business physical locations
- `ZipCodePricing` - ZIP code specific pricing rules
- `Cart` - Shopping cart for quote-to-purchase flow
- `AbandonedCart` - Cart recovery tracking
- `CartRecoveryLog` - Recovery email tracking
- `Integration` - Third-party service configurations
- Zapier Models: `ZapierConfig`, `ZapierEventQueue`, `ZapierLog`, `ZapierWebhook`

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
- `/api/geopricing/*` - Location-based pricing with drive time
- `/api/zipcode-pricing/*` - ZIP code pricing rules
- `/api/cart/*` - Shopping cart management
  - `/api/cart/recovery/*` - Cart abandonment recovery
  - `/api/cart/sync` - Cart synchronization
  - `/api/cart/checkout` - Checkout processing
- `/api/widget/*` - Embeddable widget configuration
- `/api/maps/*` - Advanced map generation (Enterprise, Professional)
- `/api/payment/*` - Payment processing

### Measurement System Flow
1. **Address Input**: `AddressSearchWithAutocomplete` component with Google Places
2. **Geocoding**: Server-side via `/api/geocode` endpoint
3. **Calculation Engine**:
   - `lib/propertyMeasurement.ts` - Shoelace formula for area calculation
   - `lib/geospatialAnalysis.ts` - Property type detection
   - `lib/accurateMeasurements.ts` - Measurement generation (simulated)
   - `lib/manualSelection/polygonCalculator.ts` - Manual polygon calculations
4. **Map Components**: 
   - Basic: `EmbedMap`, `SimpleMap`, `WorkingMap`
   - Advanced: `InteractiveMapOverlay`, `PropertyBoundaryMap`
   - Professional: `ProfessionalPropertyMap`, `EnterprisePropertyMap`
5. **Results Display**: `MeasurementResults`, `MeasurementResultsWithCart`

### SaaS Features

#### Multi-Tenancy
- Complete business isolation with tenant context
- Business switching via `/api/user/switch-business`
- Role-based permissions per business
- Shared user accounts across businesses

#### Cart & Recovery System
- **Cart Service**: `lib/cart/cartService.ts` - Client-side cart management
- **Cart Context**: `contexts/CartContext.tsx` - React context for cart state
- **Abandonment Detection**: 15-minute timeout tracking
- **Recovery Flow**: Email/SMS with discount codes
- **Exit Intent**: Modal capture for abandoning users
- **Guest Recovery**: Email capture without authentication

#### Pricing Engine
- Multiple calculation methods (per sqft, flat rate, tiered, percentage)
- Service type specific pricing
- Property size-based pricing tiers
- Geofencing zones with custom rates
- ZIP code overrides
- Drive time-based pricing adjustments
- Discount code system

#### Advanced Features
- **Team Management**: Invitation system with role-based permissions
- **Subscription Tiers**: Stripe integration with usage limits
- **White-Label Widget**: Embeddable at `/widget/[businessId]`
- **Zapier Integration**: Webhook triggers for automation
- **Manual Selection**: Polygon drawing tool for accurate measurements
- **Professional Maps**: High-resolution property visualizations
- **Quote System**: Draft saving, public sharing, PDF export

## Implementation Guidelines

### Dynamic Imports
Map components must use dynamic imports to prevent SSR errors:
```typescript
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => <div>Loading map...</div>
})
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

// Always validate businessId for data isolation
const data = await Model.find({ businessId })
```

### Cart Recovery Implementation
- Track last activity timestamp
- Debounced backend sync (5 second delay)
- Minimum sync interval (30 seconds)
- Session-based tracking with localStorage backup
- Automatic recovery email triggers

### TypeScript Path Alias
Use `@/` for imports (maps to project root)

### State Management
- React Query for server state
- Context API for UI state (CartContext, ManualSelectionContext)
- Local storage for cart persistence
- Session storage for temporary data

### Error Handling
- API routes return appropriate HTTP status codes
- Client-side error boundaries
- Toast notifications for user feedback
- Detailed logging for debugging

### Testing Approach
- Manual test scripts for all major features
- Business context switching validation
- Multi-tenant data isolation verification
- Cart recovery flow testing
- Pricing rule validation

## Current Limitations
- Measurements are simulated (no actual satellite image analysis)
- No computer vision for boundary detection
- Basic HTML email templates (inline styles only)
- No automated test suite (only manual test scripts)
- Cart recovery cron requires manual initialization

## Manual Selection Mode
Toggle between automatic and manual measurement modes:
- `contexts/ManualSelectionContext.tsx` - State management
- `components/manual/InteractiveMapOverlay.tsx` - Drawing interface
- `components/manual/SelectionToolbar.tsx` - UI controls
- Polygon drawing with real-time area calculation
- Undo/redo support
- Multiple selection areas

## Widget Integration
Embeddable widget for external websites:
- Public endpoint: `/widget/[businessId]`
- Embed script: `/public/widget/embed.js`
- Configuration via `/api/widget/config`
- Lead capture and webhook support
- Customizable styling and branding