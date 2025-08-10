# 🛒 Abandoned Cart Recovery - Complete Test Plan

## ✅ Test Status

### Fixed Issues
1. ✅ **Discount Code Validation** - "Business not found" error fixed
2. ✅ **Checkout Completion** - "Unauthorized" error fixed  
3. ✅ **Email Configuration** - Working with Gmail SMTP
4. ✅ **Email Template** - Recovery email rendering correctly

---

## 📋 Frontend Testing

### Test 1: Cart Creation and Persistence
**Path:** http://localhost:3000

1. Enter an address in the search bar
2. Click "Get Instant Quote"
3. Verify map loads with property overlay
4. Click "Continue to Measurement Results"
5. **Verify:** "Add to Cart" buttons appear for each service
6. Click "Add to Cart" for Lawn service
7. **Verify:** Cart icon in header shows item count
8. Refresh the page
9. **Verify:** Cart persists with items

**✅ Expected:** Cart data saved in LocalStorage and synced to database

---

### Test 2: Exit Intent Modal
**Path:** Any page after adding items to cart

1. Add items to cart
2. Move mouse to top of browser window (simulate exit)
3. **Verify:** Exit intent modal appears with 5% discount
4. Note the discount code shown
5. Click "Continue Shopping"
6. Try to trigger exit intent again
7. **Verify:** Modal only shows once per session

**✅ Expected:** Modal shows once with discount code "SAVE5"

---

### Test 3: Cart Page
**Path:** http://localhost:3000/cart

1. Navigate to cart page
2. **Verify:** All added items display correctly
3. Update quantity for an item
4. **Verify:** Prices update automatically
5. Remove an item
6. **Verify:** Item removed and totals updated
7. Click "Clear Cart"
8. **Verify:** Cart empties

**✅ Expected:** Full cart management functionality works

---

### Test 4: Checkout with Discount
**Path:** http://localhost:3000/checkout

1. Add items to cart
2. Go to checkout page
3. Fill in customer information:
   - Name: Test User
   - Email: test@example.com
   - Phone: 555-0123
4. Enter discount code: SAVE5
5. Click "Apply"
6. **Verify:** Discount applied, total reduced by 5%
7. Complete checkout
8. **Verify:** Redirected to success page

**✅ Expected:** Order completes with discount applied

---

## 📧 Backend Testing

### Test 5: Email Configuration
**Command:** `node test-email.js`

1. Run the email test script
2. **Verify:** SMTP connection successful
3. Check your inbox for test email
4. **Verify:** Email received with proper formatting

**✅ Expected:** Email sends successfully

---

### Test 6: Cart Abandonment Detection
**Manual Test Process:**

1. **Create Abandoned Cart:**
   ```bash
   # Add items to cart on website
   # Note the session ID from browser DevTools > Application > Local Storage
   # Wait 15+ minutes without activity
   ```

2. **Trigger Recovery Process:**
   ```bash
   # As admin user, call the process endpoint
   curl -X POST http://localhost:3000/api/cart/recovery/process \
     -H "Content-Type: application/json" \
     -d '{"minutesAgo": 15}'
   ```

3. **Verify Database:**
   ```javascript
   // In MongoDB:
   db.abandonedcarts.find().sort({abandoned_at: -1}).limit(1)
   db.cartrecoverylogs.find().sort({sent_at: -1}).limit(1)
   ```

**✅ Expected:** Cart marked as abandoned, recovery email sent

---

### Test 7: Recovery Email Flow
**Path:** Check email after abandonment

1. After cart is marked abandoned, check email
2. **Verify:** Recovery email received with:
   - Personal greeting
   - Cart items listed
   - Discount code (SAVE15)
   - Recovery link
3. Click recovery link
4. **Verify:** Redirected to checkout with cart restored
5. **Verify:** Discount automatically applied

**✅ Expected:** Full recovery flow works end-to-end

---

### Test 8: Recovery Tracking
**Path:** http://localhost:3000/api/cart/recovery/track/[token]

1. Get recovery token from email or database
2. Click recovery link
3. **Verify:** Link click tracked in database
4. Complete checkout
5. **Verify:** Recovery marked as completed

**✅ Expected:** All interactions tracked for analytics

---

## 🔍 Database Verification

### MongoDB Collections to Check:

1. **carts** - Active cart sessions
   ```javascript
   db.carts.find({status: 'active'})
   ```

2. **abandonedcarts** - Abandoned cart records
   ```javascript
   db.abandonedcarts.find({reminder_sent: true})
   ```

3. **cartrecoverylogs** - Recovery campaign logs
   ```javascript
   db.cartrecoverylogs.find().sort({sent_at: -1})
   ```

---

## 📊 Analytics Testing

### Test 9: Recovery Stats API
**Endpoint:** GET /api/cart/recovery/stats

```bash
curl http://localhost:3000/api/cart/recovery/stats?days=30
```

**Verify Response Contains:**
- Total abandoned carts
- Recovery emails sent
- Recovery rate percentage
- Revenue recovered

---

## 🚀 Quick Test Commands

```bash
# Test email configuration
node test-email.js

# Test complete abandonment flow (creates test cart)
node test-abandonment-flow.js

# Preview recovery email template
open http://localhost:3000/api/test/email-preview

# Manual cart creation via API
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test",
    "items": [{
      "serviceType": "lawn",
      "name": "Lawn Service",
      "area": 5000,
      "pricePerUnit": 0.05,
      "totalPrice": 250
    }],
    "propertyAddress": "123 Test St"
  }'
```

---

## ✔️ Checklist Summary

### Frontend
- [ ] Cart persistence across sessions
- [ ] Exit intent modal (once per session)
- [ ] Cart management (add/remove/update)
- [ ] Discount code application
- [ ] Checkout flow completion

### Backend
- [ ] Email SMTP configuration working
- [ ] Cart abandonment detection (15 min)
- [ ] Recovery email sending
- [ ] Recovery link tracking
- [ ] Database records created

### Integration
- [ ] End-to-end recovery flow
- [ ] Analytics tracking
- [ ] Multi-business support
- [ ] Guest and authenticated user support

---

## 🔧 Troubleshooting

### Common Issues:

1. **Email not sending:**
   - Check Gmail App Password (not regular password)
   - Verify 2FA enabled on Gmail
   - Check .env.local configuration

2. **Cart not persisting:**
   - Check LocalStorage in DevTools
   - Verify MongoDB connection
   - Check browser console for errors

3. **Discount code not working:**
   - Code is case-sensitive (use SAVE5 or SAVE15)
   - Check expiration in database
   - Verify checkout endpoint is /api/cart/checkout

4. **Recovery link not working:**
   - Check token in database
   - Verify link format: /cart/recover?token=xxx
   - Check token expiration (24 hours)

---

## 📝 Notes

- Abandonment threshold: 15 minutes of inactivity
- Exit intent discount: 5% (SAVE5)
- Recovery email discount: 15% (SAVE15)
- Recovery link valid for: 24 hours
- Cron job should run every 10 minutes in production
