# Role-Based Access Control Testing Guide

## Setup Test Users

### 1. Install Dependencies (if needed)
```bash
npm install mongoose bcryptjs
```

### 2. Create Test Users
```bash
node scripts/create-test-users.js
```

This will create the following test accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Business Owner | owner@test.com | Test123! | Full Access |
| Admin | admin@test.com | Test123! | Admin Access |
| Staff | staff@test.com | Test123! | Limited Access |
| Customer | customer@test.com | Test123! | Minimal Access |
| Inactive | inactive@test.com | Test123! | No Access (test denial) |

---

## Testing Matrix by Role

### 🔵 Business Owner (owner@test.com)
**Expected Access: FULL**

#### ✅ Should Have Access To:
- [x] Dashboard - `/dashboard`
- [x] Measurements - `/measurements` (create, view, edit, delete)
- [x] Quotes - `/quotes` (full CRUD operations)
- [x] Customers - `/customers` (full management)
- [x] Pricing Rules - `/pricing` (create and manage)
- [x] Widget - `/widget` (configure and embed)
- [x] Analytics - `/analytics` (view all metrics)
- [x] Settings - `/settings` (all settings)
- [x] Team Management - `/team` (add/remove users)
- [x] Billing - `/billing` (manage subscription)

#### Test Scenarios:
1. **Login Test**
   - Navigate to `/login`
   - Enter credentials
   - Should redirect to `/dashboard`

2. **Create Measurement**
   - Go to `/measurements`
   - Click "New Measurement"
   - Complete a measurement
   - Should save successfully

3. **Generate Quote**
   - Go to `/quotes/new`
   - Select measurement
   - Add services and pricing
   - Should create and send quote

4. **Manage Team**
   - Go to `/team`
   - Add new staff member
   - Should create user with staff role

---

### 🟢 Admin (admin@test.com)
**Expected Access: ADMINISTRATIVE**

#### ✅ Should Have Access To:
- [x] Dashboard - `/dashboard`
- [x] Measurements - `/measurements`
- [x] Quotes - `/quotes`
- [x] Customers - `/customers`
- [x] Pricing Rules - `/pricing`
- [x] Widget - `/widget`
- [x] Analytics - `/analytics`
- [x] Settings - `/settings`
- [x] Team Management - `/team`
- [x] Billing - `/billing`

#### ❌ Should NOT Have Access To:
- [ ] Delete business account
- [ ] Transfer ownership

#### Test Scenarios:
1. **Settings Access**
   - Navigate to `/settings`
   - Should see all tabs
   - Can modify business settings

2. **Team Management**
   - Go to `/team`
   - Should see team members
   - Can add/edit staff

---

### 🟡 Staff (staff@test.com)
**Expected Access: OPERATIONAL**

#### ✅ Should Have Access To:
- [x] Dashboard - `/dashboard` (view only)
- [x] Measurements - `/measurements` (create and view own)
- [x] Quotes - `/quotes` (create and manage)
- [x] Customers - `/customers` (view and edit)
- [x] Analytics - `/analytics` (limited view)

#### ❌ Should NOT Have Access To:
- [ ] Settings - `/settings` (no access or limited)
- [ ] Team Management - `/team`
- [ ] Billing - `/billing`
- [ ] Pricing Rules - `/pricing` (view only)
- [ ] Widget Configuration - `/widget` (view only)

#### Test Scenarios:
1. **Navigation Test**
   - Login as staff
   - Check sidebar menu
   - Should NOT see Team, Billing, Settings links

2. **Create Quote**
   - Go to `/quotes/new`
   - Should be able to create quote
   - Cannot modify pricing rules

3. **View Analytics**
   - Go to `/analytics`
   - Should see performance metrics
   - Cannot see financial data

---

### 🔴 Customer (customer@test.com)
**Expected Access: MINIMAL**

#### ✅ Should Have Access To:
- [x] View own quotes (public links)
- [x] Accept/decline quotes
- [x] View quote history

#### ❌ Should NOT Have Access To:
- [ ] Dashboard (redirect to customer portal)
- [ ] Any admin pages
- [ ] Other customers' data
- [ ] Business settings

#### Test Scenarios:
1. **Login Redirect**
   - Login as customer
   - Should redirect to customer portal (if implemented)
   - Or show limited dashboard

2. **Quote Access**
   - Access quote via public link
   - Should see own quotes only
   - Can accept/decline

---

## Component-Level Testing

### 1. Dashboard Layout (`/app/(dashboard)/layout.tsx`)
```javascript
// Test navigation filtering
const isAdmin = (session?.user as any)?.role === 'admin' || 
                (session?.user as any)?.role === 'business_owner'
const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin)
```

**Test Cases:**
- Staff user: Should not see admin-only menu items
- Admin user: Should see all menu items
- Business owner: Should see all menu items

### 2. API Endpoints Protection
Test each API endpoint with different roles:

```bash
# Test as staff (should fail for admin endpoints)
curl -X GET http://localhost:3000/api/team \
  -H "Cookie: next-auth.session-token=STAFF_SESSION_TOKEN"

# Test as admin (should succeed)
curl -X GET http://localhost:3000/api/team \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION_TOKEN"
```

### 3. Measurement Creation Test
```javascript
// Test measurement saving with different roles
// File: /app/api/measurements/route.ts

// Staff should only save to their own account
if (session.user.role === 'staff') {
  measurementData.userId = session.user.id
}
```

---

## Testing Checklist by Phase

### ✅ Phase 1: Authentication
- [ ] Login with each role
- [ ] Logout functionality
- [ ] Session persistence
- [ ] Invalid credentials rejection
- [ ] Inactive user denial

### ✅ Phase 2: Measurements & Quotes
- [ ] Business Owner: Full CRUD on all measurements
- [ ] Staff: Create own, view all
- [ ] Customer: No access to measurements page
- [ ] Quote generation with proper businessId

### ✅ Phase 3: Customer Management
- [ ] Business Owner: Full customer management
- [ ] Staff: View and edit customers
- [ ] Customer: Cannot access customer list

### ✅ Phase 4: Pricing & Analytics
- [ ] Business Owner: Create/edit pricing rules
- [ ] Admin: Create/edit pricing rules
- [ ] Staff: View pricing only
- [ ] Analytics data filtered by role

### ✅ Phase 5: Widget
- [ ] Business Owner: Configure widget
- [ ] Admin: Configure widget
- [ ] Staff: View widget settings only
- [ ] Public access works without auth

---

## Manual Testing Steps

### 1. Start the Application
```bash
npm run dev
```

### 2. Test Each Role Sequentially

#### Round 1: Business Owner
1. Login as `owner@test.com`
2. Visit each page in sidebar
3. Create a measurement
4. Generate a quote
5. Add a pricing rule
6. Check analytics
7. Configure widget
8. Logout

#### Round 2: Admin
1. Login as `admin@test.com`
2. Verify same access as owner
3. Try team management
4. Check all settings
5. Logout

#### Round 3: Staff
1. Login as `staff@test.com`
2. Verify limited sidebar menu
3. Create a measurement
4. Generate a quote
5. Try accessing `/settings` (should fail or show limited)
6. Try accessing `/team` (should fail)
7. Logout

#### Round 4: Customer
1. Login as `customer@test.com`
2. Verify minimal access
3. Should not see admin dashboard
4. Logout

#### Round 5: Inactive User
1. Try login as `inactive@test.com`
2. Should be denied or shown inactive message

---

## Automated Testing (Optional)

### Create Test File
```javascript
// __tests__/roles.test.js
import { getServerSession } from 'next-auth'

describe('Role-Based Access', () => {
  test('Business Owner has full access', async () => {
    const session = { user: { role: 'business_owner' } }
    expect(hasAccess('settings', session)).toBe(true)
    expect(hasAccess('team', session)).toBe(true)
  })

  test('Staff has limited access', async () => {
    const session = { user: { role: 'staff' } }
    expect(hasAccess('settings', session)).toBe(false)
    expect(hasAccess('team', session)).toBe(false)
  })
})
```

---

## Common Issues & Fixes

### Issue 1: Staff Can Access Admin Pages
**Fix:** Check middleware and page-level protection
```javascript
// In page component
if (!['admin', 'business_owner'].includes(session.user.role)) {
  redirect('/dashboard')
}
```

### Issue 2: Customer Sees Full Dashboard
**Fix:** Implement customer-specific routing
```javascript
// In layout or middleware
if (session.user.role === 'customer') {
  redirect('/customer-portal')
}
```

### Issue 3: API Endpoints Not Protected
**Fix:** Add role checks in API routes
```javascript
// In API route
if (!session?.user || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

---

## Security Best Practices

1. **Always verify on backend** - Don't trust client-side role checks
2. **Use middleware** - Implement role checking in middleware.ts
3. **Audit regularly** - Test role access after each update
4. **Principle of least privilege** - Default to no access
5. **Log access attempts** - Track unauthorized access attempts

---

## Next Steps

1. Run the test user creation script
2. Test each role systematically
3. Document any issues found
4. Implement fixes if needed
5. Re-test after fixes
6. Consider automated testing for regression prevention

**Important:** After testing, you may want to delete test users or mark them clearly in production.