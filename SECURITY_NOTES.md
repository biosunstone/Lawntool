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
