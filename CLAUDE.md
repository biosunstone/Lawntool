# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sunstone Digital Tech is a SaaS property measurement application using Google Maps satellite imagery. It allows businesses to provide instant measurements for lawns, driveways, sidewalks, and buildings to their customers, with quote generation and customer management features.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server on localhost:3000
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Test utilities (run from project root)
node test-mongodb.js              # Test MongoDB connection
node test-email.js                # Test email sending
node test-email-config.js         # Test email configuration
node test-quote-generation.js     # Test quote generation
node scripts/create-test-users.js # Create test users in database
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14.2.5 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with credentials provider
- **Maps**: Google Maps JavaScript API (@react-google-maps/api)
- **Email**: Nodemailer for notifications
- **Payments**: Stripe for subscriptions
- **Icons**: Lucide React
- **PDF**: jsPDF for quote exports
- **Forms**: React Hook Form with Zod validation

### Environment Configuration
Required in `.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_google_maps_api_key>
MONGODB_URI=<your_mongodb_connection_string>
NEXTAUTH_SECRET=<your_nextauth_secret>
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=<your_stripe_secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your_stripe_public_key>
EMAIL_FROM=<sender_email>
EMAIL_SERVER_HOST=<smtp_host>
EMAIL_SERVER_PORT=<smtp_port>
EMAIL_SERVER_USER=<smtp_user>
EMAIL_SERVER_PASSWORD=<smtp_password>
```

### Key APIs Required
Google Cloud Console APIs to enable:
- Maps JavaScript API
- Places API
- Geocoding API
- Maps Embed API

### Core Architecture

#### Authentication & Authorization
- `lib/saas/auth.ts` - NextAuth configuration with role-based access (admin, business_owner, staff, customer)
- `middleware.ts` - Route protection based on user roles with business context
- Session management with JWT tokens including business selection
- Multi-business support - users can belong to multiple businesses

#### Database Models (Mongoose)
- `User` - Authentication and user profiles with role management
- `Business` - Multi-tenant business accounts with settings and branding
- `Customer` - Customer records linked to businesses
- `Measurement` - Property measurement history with polygons
- `Quote` - Quote generation and tracking with email notifications
- `PricingRule` - Business-specific pricing configuration with complex rule engine
- `Subscription` - Stripe subscription tracking with plan management
- `TeamInvitation` - Team member invitation system with permissions
- `SystemSettings` - Global system configuration

#### API Routes Pattern
- `/api/auth/*` - Authentication endpoints
- `/api/customers/*` - Customer CRUD operations
- `/api/measurements/*` - Measurement saving and retrieval
- `/api/quotes/*` - Quote generation and management
- `/api/pricing-rules/*` - Business pricing configuration
- `/api/team/*` - Team management and invitations
- `/api/admin/*` - Admin-only operations
- `/api/geocode` - Server-side geocoding (avoids CORS)
- `/api/public/quote/*` - Public quote viewing/response

#### Measurement System
1. **Address Input**: `AddressSearchWithAutocomplete` uses Google Places Autocomplete
2. **Geocoding**: Server-side via `/api/geocode` to get coordinates
3. **Calculation Engine**:
   - `lib/propertyMeasurement.ts` - Area calculations using Shoelace formula
   - `lib/geospatialAnalysis.ts` - Property type detection and boundary analysis
   - `lib/accurateMeasurements.ts` - Generates realistic measurements (currently simulated)
4. **Map Display**: Multiple implementations available (EmbedMap, SimpleMap, WorkingMap)
5. **Results**: `MeasurementResults` component displays calculations

#### SaaS Features
- Multi-tenant architecture with business isolation
- Role-based dashboards (admin/business_owner/staff/customer)
- Team management with invitation system and permissions
- Subscription management with Stripe integration
- White-label widget for embedding (`/widget/[businessId]`)
- Email notifications for quotes and customer interactions
- Complex pricing rule engine with multiple calculation methods
- Business branding and customization options

### Component Organization

#### Layout Structure
- `(auth)` - Public authentication pages
- `(dashboard)` - Protected dashboard routes with shared layout
- `widget` - Embeddable widget for businesses

#### Key Components
- `MeasurementSection` - Main measurement orchestrator
- `AuthenticatedMeasurement` - Measurement with save functionality
- `ClientProviders` - Context providers for auth and state
- `GoogleMapsProvider` - Maps API initialization wrapper

### Test Infrastructure
Multiple test pages exist for debugging map implementations:
- `/api-test`, `/test-map`, `/direct-map-test` - Various map component tests
- `/test-maps-*` - Different map loading strategies
- Public HTML test files in `/public` for isolated testing

## Important Implementation Notes

1. **Dynamic Imports**: Map components require `dynamic(() => import(...), { ssr: false })` to prevent SSR errors

2. **CORS Handling**: Always use server-side `/api/geocode` for geocoding operations

3. **TypeScript Path Alias**: Use `@/` for imports (mapped to root directory)

4. **Measurement Accuracy**: Currently uses simulated measurements - actual satellite image analysis not implemented

5. **Authentication Flow**: Protected routes check session in middleware, API routes verify in handlers

6. **Database Connections**: Use `connectDB()` at start of API routes, connection pooling handled by mongoose

7. **Error Handling**: API routes should return appropriate status codes with error messages

8. **State Management**: Using React Query for server state, local state for UI

9. **Business Context**: Always check business context in API routes for multi-tenant data isolation

10. **Role Verification**: Use `hasRole()` helper to verify user permissions in API routes

## Current Limitations

- Measurements are simulated, not from actual image analysis
- No real computer vision for boundary detection
- Widget customization limited to basic branding
- Email templates are basic HTML
- No automated testing setup

## Manual Selection Mode

The application includes a manual polygon drawing feature for accurate property measurements:
- `contexts/ManualSelectionContext.tsx` - State management for manual selection mode
- `components/manual/InteractiveMapOverlay.tsx` - Drawing interface on Google Maps
- `components/manual/SelectionToolbar.tsx` - UI controls for drawing tools
- `lib/manualSelection/polygonCalculator.ts` - Area calculation for drawn polygons
- Toggle between automatic and manual measurement modes in the UI