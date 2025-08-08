# Sunstone Digital Tech - SaaS Platform Setup

## Prerequisites
- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)
- Google Maps API Key

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Edit `.env.local` and add your actual API keys and configuration.

### 3. Setup Database
```bash
# Make sure MongoDB is running
# The app will create collections automatically on first run
```

### 4. Create Test Users (Optional)
```bash
node scripts/create-test-users.js
```

This creates test accounts:
- owner@test.com / Test123! (Business Owner)
- admin@test.com / Test123! (Admin)
- staff@test.com / Test123! (Staff)
- customer@test.com / Test123! (Customer)

### 5. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

## Project Structure
```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   ├── widget/            # Embeddable widget
│   └── quote/             # Public quote viewer
├── components/            # React components
│   └── saas/             # SaaS-specific components
├── lib/                   # Utility libraries
│   └── saas/             # SaaS utilities
├── models/               # MongoDB models
├── types/                # TypeScript definitions
├── public/               # Static assets
└── styles/               # Global styles
```

## Key Features
- ✅ Multi-tenant SaaS architecture
- ✅ Role-based access control
- ✅ Property measurement tool
- ✅ Quote generation system
- ✅ Customer management (CRM)
- ✅ Dynamic pricing rules
- ✅ Analytics dashboard
- ✅ Embeddable widget
- ✅ Email notifications

## Documentation
- `.claude/IMPLEMENTATION_PLAN.md` - Complete development plan
- `ROLE_BASED_TESTING_GUIDE.md` - Testing different user roles
- `EMAIL_NOTIFICATIONS.md` - Email system documentation
- `CUSTOMER_MANAGEMENT.md` - CRM documentation
- `MAP_VIEW_FIX.md` - Map configuration notes
- `MEASUREMENT_FLOW_FIX.md` - Measurement workflow

## Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## Environment Variables Guide

### Required
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - For map functionality
- `MONGODB_URI` - Database connection
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Application URL

### Optional
- `EMAIL_SERVER` - SMTP configuration
- `EMAIL_FROM` - From email address
- `STRIPE_*` - Payment processing (future feature)

## Common Issues

### MongoDB Connection Failed
- Ensure MongoDB is running
- Check MONGODB_URI in .env.local
- For MongoDB Atlas, whitelist your IP

### Google Maps Not Loading
- Verify API key is valid
- Enable required APIs in Google Cloud Console
- Check browser console for errors

### Authentication Issues
- Generate a secure NEXTAUTH_SECRET
- Ensure NEXTAUTH_URL matches your domain

## Support
For questions or issues, refer to the documentation files or create an issue in the repository.
