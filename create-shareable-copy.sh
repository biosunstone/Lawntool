#!/bin/bash

# Script to create a shareable compressed copy of the project
# This will exclude unnecessary files and sensitive data

PROJECT_NAME="sunstone-digital-tech"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_NAME="${PROJECT_NAME}_shareable_${TIMESTAMP}"

echo "🚀 Creating shareable copy of ${PROJECT_NAME}..."

# Create a temporary directory for the clean copy
TEMP_DIR="/tmp/${OUTPUT_NAME}"
mkdir -p "${TEMP_DIR}"

echo "📁 Copying project files..."

# Copy the project excluding unnecessary files
rsync -av \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='*.lock' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  --exclude='*.swp' \
  --exclude='*.swo' \
  --exclude='*.bak' \
  --exclude='*.tmp' \
  --exclude='coverage' \
  --exclude='.nyc_output' \
  --exclude='.vscode' \
  --exclude='.idea' \
  --exclude='*.iml' \
  --exclude='out' \
  --exclude='.vercel' \
  --exclude='*.pem' \
  --exclude='*.key' \
  --exclude='*.cert' \
  --exclude='uploads' \
  --exclude='temp' \
  --exclude='cache' \
  . "${TEMP_DIR}/"

echo "📝 Creating environment template..."

# Create .env.example file with template values
cat > "${TEMP_DIR}/.env.example" << 'EOF'
# Google Maps API Key
# Get your API key from: https://console.cloud.google.com/
# Enable these APIs: Maps JavaScript API, Places API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# MongoDB Database
MONGODB_URI=mongodb://localhost:27017/sunstone-saas

# NextAuth Configuration
NEXTAUTH_SECRET=generate-a-secure-random-string-here
NEXTAUTH_URL=http://localhost:3000

# Stripe Configuration (Optional - for future payment features)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration (Optional - for notifications)
# Example formats:
# Gmail: smtp://username@gmail.com:password@smtp.gmail.com:587
# SendGrid: smtp://apikey:YOUR_API_KEY@smtp.sendgrid.net:587
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com
EOF

echo "📋 Creating setup instructions..."

# Create README for developers
cat > "${TEMP_DIR}/SETUP_INSTRUCTIONS.md" << 'EOF'
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
EOF

echo "📊 Creating project statistics..."

# Count files and lines of code
cat > "${TEMP_DIR}/PROJECT_STATS.md" << EOF
# Project Statistics
Generated: $(date)

## File Counts
- TypeScript/TSX files: $(find "${TEMP_DIR}" -name "*.ts" -o -name "*.tsx" | wc -l)
- JavaScript files: $(find "${TEMP_DIR}" -name "*.js" -o -name "*.jsx" | wc -l)
- CSS files: $(find "${TEMP_DIR}" -name "*.css" | wc -l)
- Markdown files: $(find "${TEMP_DIR}" -name "*.md" | wc -l)
- Total files: $(find "${TEMP_DIR}" -type f | wc -l)

## Features Implemented
- 5 Major Phases Completed
- 50+ Components Created
- 20+ API Endpoints
- 7 Database Models
- Role-based Access Control
- Multi-tenant Architecture

## Technology Stack
- Next.js 14.2.5 (App Router)
- TypeScript
- MongoDB with Mongoose
- NextAuth.js
- Tailwind CSS
- Google Maps API
- Nodemailer
EOF

echo "🔒 Creating security notes..."

cat > "${TEMP_DIR}/SECURITY_NOTES.md" << 'EOF'
# Security Notes for Developers

## Before Deployment

### 1. Environment Variables
- [ ] Generate new NEXTAUTH_SECRET (use: openssl rand -base64 32)
- [ ] Update NEXTAUTH_URL to production domain
- [ ] Use production MongoDB connection
- [ ] Configure proper EMAIL_SERVER credentials
- [ ] Never commit .env files to version control

### 2. API Keys
- [ ] Restrict Google Maps API key to your domain
- [ ] Set up API key rotation schedule
- [ ] Use environment-specific keys

### 3. Database Security
- [ ] Enable MongoDB authentication
- [ ] Use connection string with credentials
- [ ] Set up database backups
- [ ] Implement rate limiting

### 4. Authentication
- [ ] Enforce strong password requirements
- [ ] Implement session timeout
- [ ] Add 2FA for admin accounts (future)
- [ ] Regular security audits

### 5. Production Checklist
- [ ] Enable HTTPS only
- [ ] Set secure headers
- [ ] Implement CSRF protection
- [ ] Enable CORS properly
- [ ] Remove all console.logs
- [ ] Minify and optimize assets
EOF

echo "📦 Compressing project..."

# Create tar.gz archive
cd /tmp
tar -czf "${OUTPUT_NAME}.tar.gz" "${OUTPUT_NAME}"

# Get file size
SIZE=$(du -h "${OUTPUT_NAME}.tar.gz" | cut -f1)

echo "🧹 Cleaning up temporary files..."
rm -rf "${TEMP_DIR}"

echo "✅ Shareable copy created successfully!"
echo ""
echo "📦 Archive: /tmp/${OUTPUT_NAME}.tar.gz"
echo "📏 Size: ${SIZE}"
echo ""
echo "📤 To share with developers:"
echo "1. Send the file: /tmp/${OUTPUT_NAME}.tar.gz"
echo "2. They should extract: tar -xzf ${OUTPUT_NAME}.tar.gz"
echo "3. Follow SETUP_INSTRUCTIONS.md in the extracted folder"
echo ""
echo "⚠️  Remember to:"
echo "- Share API keys securely (not in the archive)"
echo "- Provide database access if needed"
echo "- Share any additional documentation"