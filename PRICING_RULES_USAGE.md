# How Pricing Rules Work in Sunstone Digital Tech

## Overview
Pricing rules are **automatically applied** when creating quotes. You don't need to manually calculate or apply them - the system does it for you!

## How Rules Are Applied Automatically

### During Quote Creation
When you create a quote, the system automatically:

1. **Extracts context from the measurement**:
   - ZIP code from the address
   - Total area of the property
   - Service types being quoted

2. **Gets customer information**:
   - Customer tags (VIP, premium, etc.)
   - Customer history

3. **Applies all matching rules** based on:
   - Priority (highest priority rules apply first)
   - Rule conditions (zone, customer tags, area, etc.)

4. **Adjusts prices automatically**:
   - The final quote includes all adjustments
   - Original prices are stored for reference

## Types of Pricing Rules

### 1. Zone Rules
Apply pricing based on geographic location (ZIP codes)
- Example: Premium pricing for downtown areas
- Example: Discount for remote areas

### 2. Customer Rules  
Apply pricing based on customer tags
- Example: 15% discount for VIP customers
- Example: 10% discount for loyal customers

### 3. Service Rules
Apply pricing to specific services
- Example: 20% discount on driveway cleaning
- Example: Premium pricing for specialized treatments

### 4. Volume Rules
Apply pricing based on property size
- Example: 15% discount for properties over 10,000 sq ft
- Example: Minimum charge for small properties

### 5. Seasonal Rules
Apply pricing based on date/time
- Example: 20% increase during peak summer months
- Example: Weekend surcharge

## How to Use Pricing Rules

### Step 1: Create Pricing Rules
1. Go to **Pricing** in the dashboard
2. Click **New Rule**
3. Choose rule type and set conditions
4. Set pricing adjustments (multiplier, fixed price, discount, etc.)
5. Set priority (higher = applied first)
6. Save the rule

### Step 2: Test Your Rules
1. Go to **Pricing > Test Rules**
2. Enter test scenarios
3. See which rules apply and why
4. Verify pricing calculations

### Step 3: Create Quotes (Rules Apply Automatically!)
1. Go to **Quotes > New Quote**
2. Select a measurement
3. Enter customer information
4. Add customer tags if applicable (e.g., "vip", "premium")
5. **Optional**: Click "Check for Pricing Rules" to preview adjustments
6. Create the quote - rules are applied automatically!

## Customer Tags
To apply customer-specific pricing:

### When Creating a Quote
- Enter tags in the "Customer Tags" field
- Common tags: `vip`, `premium`, `loyal`, `new`, `commercial`, `residential`
- Separate multiple tags with commas

### Example Customer Tags
- `vip, loyal` - VIP and loyalty discounts apply
- `commercial` - Commercial pricing applies  
- `new` - New customer promotions apply

## Viewing Applied Rules

### In Quote Creation
- Click "Check for Pricing Rules" button
- See which rules apply
- View price adjustments
- See original vs. adjusted totals

### After Quote Creation
- Applied rules are stored in quote metadata
- View in quote details
- Track which rules were used

## Priority System

Rules are applied in priority order (highest to lowest):
- Priority 100: Applied first
- Priority 50: Applied second
- Priority 1: Applied last

**Important**: Only one rule of each type applies (except customer rules which can stack)

## Example Scenarios

### Scenario 1: VIP Customer in Premium Zone
```
Customer Tags: vip
ZIP Code: 90210 (premium zone)
Property Size: 5,000 sq ft

Applied Rules:
1. Premium Zone (+25%) - Priority 10
2. VIP Discount (-15%) - Priority 15

Result: Net 10% increase
```

### Scenario 2: Large Commercial Property
```
Customer Tags: commercial
Property Size: 15,000 sq ft

Applied Rules:
1. Commercial Rate (+10%) - Priority 8
2. Volume Discount (-15%) - Priority 7  

Result: Net 5% discount
```

### Scenario 3: Summer Peak Pricing
```
Date: July 15, 2024
Service: Lawn Treatment

Applied Rules:
1. Summer Peak (+20%) - Priority 9

Result: 20% increase
```

## Best Practices

1. **Set Clear Priorities**: Higher priority rules override lower ones
2. **Test Before Activating**: Use the test page to verify rules work correctly
3. **Use Descriptive Names**: "Downtown Premium Zone" not "Rule 1"
4. **Monitor Usage**: Check applied count to see which rules are used most
5. **Document Rules**: Add descriptions explaining why rules exist

## Troubleshooting

### Rules Not Applying?
- Check rule is active (toggle on)
- Verify conditions match (ZIP, tags, dates, etc.)
- Check priority conflicts
- Use test page to debug

### Wrong Price Calculated?
- Check rule priority order
- Verify pricing adjustments
- Test with sample data
- Review applied rules in quote

### Need Help?
- Test rules at `/pricing/test`
- View all rules at `/pricing`
- Check rule usage statistics
- Contact support if needed

## API Integration

For developers integrating with the API:

### Creating Quotes with Rules
```javascript
POST /api/quotes
{
  "measurementId": "...",
  "customerData": {
    "name": "John Doe",
    "email": "john@example.com",
    "tags": ["vip", "premium"]  // Customer tags for rules
  },
  "services": [...],
  // Rules are applied automatically!
}
```

### Testing Rules via API
```javascript
POST /api/pricing-rules/preview
{
  "zipCode": "90210",
  "customerTags": ["vip"],
  "totalArea": 5000,
  "services": [...],
  "date": "2024-07-15"
}
```

## Summary

Pricing rules make your pricing strategy:
- **Automatic**: No manual calculations
- **Flexible**: Multiple rule types and conditions
- **Transparent**: See exactly what's applied
- **Consistent**: Same rules for everyone
- **Profitable**: Optimize pricing by zone, customer, and season

The system handles all the complexity - you just set the rules and create quotes!