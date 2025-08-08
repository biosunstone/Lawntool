# Teams and Billing Pages Implementation Plan

## Overview
This document outlines the detailed implementation plan for the Teams and Billing pages in the Sunstone Digital Tech application. Both features are essential for the SaaS platform's multi-tenant architecture.

## Current State Analysis

### Existing Infrastructure
- **Authentication**: NextAuth with role-based access (admin, business_owner, staff, customer)
- **Database Models**: User, Business, Subscription models already exist
- **Navigation**: Links to /team and /billing already present in dashboard layout
- **Stripe Integration**: Basic setup exists but needs expansion
- **Team Structure**: Business model has `teamMembers` array field

### Key Findings
1. Routes `/team` and `/billing` are referenced but pages don't exist
2. Business model supports team members but no management interface
3. Subscription model exists with plan features but no billing UI
4. Role-based access control is implemented but staff role unused

---

## 1. TEAMS FUNCTIONALITY

### 1.1 Frontend Components

#### Pages to Create:
```
app/(dashboard)/team/page.tsx
app/(dashboard)/team/invite/page.tsx
app/(dashboard)/team/[memberId]/page.tsx
```

#### Components to Create:
```
components/team/TeamMembersList.tsx
components/team/InviteTeamMember.tsx
components/team/TeamMemberCard.tsx
components/team/RoleSelector.tsx
components/team/PermissionsManager.tsx
```

### 1.2 Backend API Routes

#### New API Endpoints:
```
/api/team/members         - GET, POST (list/invite members)
/api/team/members/[id]    - GET, PATCH, DELETE (manage member)
/api/team/invites         - GET, POST (manage invitations)
/api/team/invites/[token] - GET, POST (accept invitation)
/api/team/permissions     - GET, PATCH (manage permissions)
```

### 1.3 Database Schema Updates

#### New Model: TeamInvitation
```typescript
interface ITeamInvitation {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  email: string;
  role: 'staff' | 'business_owner';
  invitedBy: Types.ObjectId;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Update Business Model:
- Add `permissions` schema for granular access control
- Add `maxTeamMembers` based on subscription plan

### 1.4 Features to Implement

1. **Team Overview**
   - Display current team members with roles
   - Show team member limit based on subscription
   - Quick stats (active/pending invitations)

2. **Invite System**
   - Send email invitations with secure tokens
   - Set role and permissions during invitation
   - Track invitation status
   - Auto-expire after 7 days

3. **Member Management**
   - Edit member roles and permissions
   - Remove team members
   - View member activity logs
   - Transfer ownership functionality

4. **Permissions System**
   - Granular permissions:
     - View measurements
     - Create measurements
     - Manage customers
     - Create quotes
     - View analytics
     - Manage pricing
     - Manage team
     - Access billing

5. **Email Templates**
   - Team invitation email
   - Welcome email for new members
   - Removal notification

---

## 2. BILLING FUNCTIONALITY

### 2.1 Frontend Components

#### Pages to Create:
```
app/(dashboard)/billing/page.tsx
app/(dashboard)/billing/upgrade/page.tsx
app/(dashboard)/billing/invoices/page.tsx
app/(dashboard)/billing/payment-methods/page.tsx
```

#### Components to Create:
```
components/billing/SubscriptionCard.tsx
components/billing/PlanSelector.tsx
components/billing/UsageChart.tsx
components/billing/InvoicesList.tsx
components/billing/PaymentMethodCard.tsx
components/billing/BillingAlert.tsx
components/billing/PlanComparison.tsx
```

### 2.2 Backend API Routes

#### New API Endpoints:
```
/api/billing/subscription          - GET, PATCH (current subscription)
/api/billing/plans                 - GET (available plans)
/api/billing/upgrade               - POST (upgrade/downgrade)
/api/billing/cancel                - POST (cancel subscription)
/api/billing/resume                - POST (resume cancelled)
/api/billing/invoices              - GET (list invoices)
/api/billing/payment-methods       - GET, POST, DELETE
/api/billing/usage                 - GET (usage statistics)
/api/stripe/webhook                - POST (Stripe webhooks)
/api/billing/portal                - POST (Stripe customer portal)
```

### 2.3 Stripe Integration

#### Stripe Products/Prices Setup:
```javascript
const STRIPE_PRODUCTS = {
  starter: {
    priceId: 'price_starter_monthly',
    amount: 4900, // $49.00
    interval: 'month'
  },
  professional: {
    priceId: 'price_professional_monthly',
    amount: 14900, // $149.00
    interval: 'month'
  },
  enterprise: {
    priceId: 'price_enterprise_monthly',
    amount: 49900, // $499.00
    interval: 'month'
  }
}
```

#### Webhook Events to Handle:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.updated`

### 2.4 Features to Implement

1. **Subscription Overview**
   - Current plan details
   - Usage statistics (measurements used/remaining)
   - Next billing date
   - Payment status

2. **Plan Management**
   - Compare plans side-by-side
   - Upgrade/downgrade with proration
   - Cancel subscription with retention flow
   - Resume cancelled subscription

3. **Usage Tracking**
   - Real-time measurement usage
   - Usage history chart
   - Overage alerts
   - Export usage reports

4. **Invoice Management**
   - List all invoices
   - Download PDF invoices
   - Email invoice copies
   - Payment history

5. **Payment Methods**
   - Add/remove credit cards
   - Set default payment method
   - Update billing address
   - Payment method validation

6. **Billing Alerts**
   - Payment failure notifications
   - Usage limit warnings (80%, 90%, 100%)
   - Subscription expiry reminders
   - Plan upgrade suggestions

---

## 3. IMPLEMENTATION PHASES

### Phase 1: Team Management (Week 1-2)
1. Create database models and migrations
2. Implement basic team CRUD operations
3. Build team member list and invite UI
4. Set up invitation email system
5. Test role-based permissions

### Phase 2: Billing Core (Week 2-3)
1. Set up Stripe products and prices
2. Implement subscription management APIs
3. Build billing overview page
4. Create plan selector component
5. Handle basic Stripe webhooks

### Phase 3: Advanced Features (Week 3-4)
1. Implement usage tracking and charts
2. Add invoice management
3. Build payment methods interface
4. Create billing alerts system
5. Add team permissions management

### Phase 4: Testing & Polish (Week 4-5)
1. Comprehensive testing of all flows
2. Error handling and edge cases
3. Performance optimization
4. Documentation update
5. Migration scripts if needed

---

## 4. TECHNICAL CONSIDERATIONS

### Security
- Validate team member limits based on subscription
- Secure invitation tokens with JWT
- Rate limit invitation endpoints
- Audit log for team/billing changes
- PCI compliance for payment handling

### Performance
- Cache subscription data in Redis
- Pagination for team members and invoices
- Lazy load usage charts
- Optimize Stripe API calls

### Error Handling
- Graceful degradation if Stripe is down
- Clear error messages for users
- Retry logic for failed webhooks
- Fallback for email delivery failures

### Testing Requirements
- Unit tests for all new models
- Integration tests for API endpoints
- E2E tests for critical flows
- Stripe webhook testing with ngrok
- Load testing for team operations

---

## 5. ENVIRONMENT VARIABLES

### New Variables Required:
```bash
# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Products
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Email
EMAIL_TEAM_INVITE_TEMPLATE_ID=...

# Security
INVITATION_TOKEN_SECRET=...
```

---

## 6. DATABASE MIGRATIONS

### Migration Scripts Needed:
1. Add TeamInvitation collection
2. Update Business with permissions schema
3. Add billing-related fields to Subscription
4. Create audit log collection

---

## 7. MONITORING & ANALYTICS

### Key Metrics to Track:
- Team invitation acceptance rate
- Average team size by plan
- Subscription upgrade/downgrade rate
- Payment failure rate
- Feature usage by plan
- Churn rate by team size

### Logging Requirements:
- All team member changes
- Subscription modifications
- Payment events
- Permission changes
- API usage per team

---

## 8. ROLLBACK PLAN

### If Issues Arise:
1. Feature flags for gradual rollout
2. Database backup before migration
3. Stripe test mode for initial deployment
4. Keep old subscription logic as fallback
5. Revert endpoints individually if needed

---

## 9. SUCCESS CRITERIA

### Teams Feature:
- [ ] Business owners can invite team members
- [ ] Email invitations work reliably
- [ ] Role-based access control enforced
- [ ] Team size limits based on plan
- [ ] Audit trail for all changes

### Billing Feature:
- [ ] Users can upgrade/downgrade plans
- [ ] Stripe webhooks process correctly
- [ ] Invoices downloadable as PDF
- [ ] Usage tracking accurate
- [ ] Payment methods manageable
- [ ] Cancellation flow works

---

## 10. DEPENDENCIES

### External Services:
- Stripe API
- SendGrid/Nodemailer for emails
- PDF generation for invoices

### Internal Dependencies:
- Authentication system stable
- Database connection pooling
- Session management
- Error tracking system

---

## Next Steps

1. Review and approve this plan
2. Set up Stripe products in dashboard
3. Create feature branches for development
4. Begin Phase 1 implementation
5. Schedule weekly progress reviews

This implementation ensures both Teams and Billing features integrate seamlessly with the existing codebase while maintaining security, performance, and user experience standards.