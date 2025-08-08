# Complete Pricing Rules Implementation Plan

## Overview
This document outlines the complete implementation plan to make all pricing rules (zone, service, seasonal, customer, volume) fully functional throughout the Sunstone Digital Tech application.

## Current State Analysis

### What Exists:
- **Database Model**: `PricingRule` model with full schema support for all rule types
- **Basic Calculator**: `pricing-calculator.ts` with partial implementation (has bugs)
- **UI Page**: Basic pricing rules management page at `/pricing`
- **Partial Integration**: Only widget submissions use pricing rules

### What's Missing:
- Pricing rules not applied in main quote creation flow
- Calculator has bugs (references non-existent fields)
- No UI for creating/editing rules
- Missing API endpoints for CRUD operations
- No testing/preview functionality

## Implementation Plan

### 1. Fix Pricing Calculator Core Logic (`/lib/saas/pricing-calculator.ts`)

#### Current Issues:
- References `rule.adjustmentType` and `rule.adjustmentValue` which don't exist in model
- Doesn't properly use the `pricing` object structure
- Missing support for all rule types

#### Fix Required:
```javascript
// Correct structure from model:
rule.pricing = {
  priceMultiplier: Number,     // e.g., 1.25 for 25% increase
  fixedPrices: {
    lawnPerSqFt: Number,
    drivewayPerSqFt: Number,
    sidewalkPerSqFt: Number,
  },
  minimumCharge: Number,
  surcharge: Number,
  discount: {
    type: Number,
    percentage: Boolean
  }
}
```

### 2. Integrate Pricing Rules in Quote Creation (`/app/api/quotes/route.ts`)

Add pricing rule calculation:
```javascript
// Extract data for rule matching
const customerTags = customer.tags || []
const zipCode = measurement.address?.split(',').pop()?.trim().match(/\d{5}/)?.[0]
const totalArea = measurement.measurements.totalArea

// Apply pricing rules
const { services: adjustedServices, appliedRules } = await calculatePricing(
  businessId,
  calculatedServices,
  customerTags,
  zipCode,
  totalArea
)

// Store applied rules in quote metadata
quote.metadata = {
  appliedRules,
  originalPrices: calculatedServices.map(s => ({ 
    name: s.name, 
    originalPrice: s.pricePerUnit 
  }))
}
```

### 3. Update Quote Creation UI (`/app/(dashboard)/quotes/new/page.tsx`)

#### Add Features:
- Real-time pricing preview
- Show applied rules
- Display price adjustments
- Explain why prices changed

```javascript
// Fetch applicable rules
const fetchApplicableRules = async () => {
  const response = await fetch('/api/pricing-rules/preview', {
    method: 'POST',
    body: JSON.stringify({
      zipCode: selectedMeasurement?.address,
      customerTags: customerData.tags,
      totalArea: selectedMeasurement?.measurements.totalArea,
      services: services.map(s => s.name)
    })
  })
  const { rules, adjustedPrices } = await response.json()
  setAppliedRules(rules)
  setAdjustedServices(adjustedPrices)
}
```

### 4. Enhance Pricing Rules Management UI (`/app/(dashboard)/pricing/page.tsx`)

#### Zone Rules Form:
```javascript
{
  name: "Premium Downtown Zone",
  type: "zone",
  conditions: {
    zipCodes: ["90210", "10001", "94105"]  // Multi-select input
  },
  pricing: {
    priceMultiplier: 1.25,  // 25% increase
    minimumCharge: 100,     // Higher minimum
    surcharge: 20           // Additional travel fee
  },
  priority: 10,
  description: "Premium pricing for downtown areas"
}
```

#### Service Rules Form:
```javascript
{
  name: "Driveway Discount",
  type: "service",
  conditions: {
    serviceTypes: ["driveway"]
  },
  pricing: {
    priceMultiplier: 0.9,  // 10% discount
  },
  priority: 5,
  description: "Promotional discount on driveway cleaning"
}
```

#### Seasonal Rules Form:
```javascript
{
  name: "Summer Peak Pricing",
  type: "seasonal",
  conditions: {
    dateRange: {
      start: "2024-06-01",
      end: "2024-08-31"
    },
    dayOfWeek: [1, 2, 3, 4, 5],  // Weekdays only
  },
  pricing: {
    priceMultiplier: 1.15  // 15% increase
  },
  priority: 8,
  description: "Peak season pricing"
}
```

#### Customer Rules Form:
```javascript
{
  name: "VIP Customer Discount",
  type: "customer",
  conditions: {
    customerTags: ["vip", "premium"]
  },
  pricing: {
    discount: {
      type: 15,
      percentage: true  // 15% off
    }
  },
  priority: 15,  // High priority
  description: "Loyalty discount for VIP customers"
}
```

#### Volume Rules Form:
```javascript
{
  name: "Large Property Discount",
  type: "volume",
  conditions: {
    minArea: 10000,  // sq ft
    maxArea: null    // No upper limit
  },
  pricing: {
    priceMultiplier: 0.85  // 15% discount for large areas
  },
  priority: 7,
  description: "Volume discount for properties over 10,000 sq ft"
}
```

### 5. Create Complete API Endpoints

#### POST /api/pricing-rules - Create Rule
```javascript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const businessId = session.user.businessId
  
  const body = await request.json()
  const rule = await PricingRule.create({
    ...body,
    businessId
  })
  
  return NextResponse.json(rule)
}
```

#### GET /api/pricing-rules/[id] - Get Single Rule
```javascript
export async function GET(request: NextRequest, { params }) {
  const rule = await PricingRule.findOne({
    _id: params.id,
    businessId: session.user.businessId
  })
  
  return NextResponse.json(rule)
}
```

#### PATCH /api/pricing-rules/[id] - Update Rule
```javascript
export async function PATCH(request: NextRequest, { params }) {
  const body = await request.json()
  const rule = await PricingRule.findOneAndUpdate(
    { _id: params.id, businessId: session.user.businessId },
    body,
    { new: true }
  )
  
  return NextResponse.json(rule)
}
```

#### DELETE /api/pricing-rules/[id] - Delete Rule
```javascript
export async function DELETE(request: NextRequest, { params }) {
  await PricingRule.deleteOne({
    _id: params.id,
    businessId: session.user.businessId
  })
  
  return NextResponse.json({ success: true })
}
```

#### POST /api/pricing-rules/preview - Preview Rules
```javascript
export async function POST(request: NextRequest) {
  const { zipCode, customerTags, totalArea, services } = await request.json()
  
  // Get applicable rules
  const rules = await PricingRule.find({
    businessId: session.user.businessId,
    isActive: true,
    // Match conditions...
  }).sort({ priority: -1 })
  
  // Calculate adjusted prices
  const adjustedServices = calculateAdjustedPrices(services, rules)
  
  return NextResponse.json({
    applicableRules: rules,
    adjustedServices,
    totalAdjustment: calculateTotalAdjustment(services, adjustedServices)
  })
}
```

### 6. Implement Complete Rule Conditions Logic

```javascript
function checkRuleApplicability(rule, context) {
  const { zipCode, customerTags, totalArea, services, date = new Date() } = context
  
  switch (rule.type) {
    case 'zone':
      if (!rule.conditions.zipCodes?.length) return true
      return rule.conditions.zipCodes.includes(zipCode)
    
    case 'service':
      if (!rule.conditions.serviceTypes?.length) return true
      return services.some(s => 
        rule.conditions.serviceTypes.includes(s.name.toLowerCase())
      )
    
    case 'seasonal':
      let applies = true
      if (rule.conditions.dateRange) {
        applies = date >= new Date(rule.conditions.dateRange.start) && 
                  date <= new Date(rule.conditions.dateRange.end)
      }
      if (applies && rule.conditions.dayOfWeek?.length) {
        applies = rule.conditions.dayOfWeek.includes(date.getDay())
      }
      if (applies && rule.conditions.timeOfDay) {
        const currentTime = date.toTimeString().slice(0, 5)
        applies = currentTime >= rule.conditions.timeOfDay.start && 
                  currentTime <= rule.conditions.timeOfDay.end
      }
      return applies
    
    case 'customer':
      if (!rule.conditions.customerTags?.length) return true
      return rule.conditions.customerTags.some(tag => 
        customerTags.includes(tag)
      )
    
    case 'volume':
      let volumeApplies = true
      if (rule.conditions.minArea) {
        volumeApplies = totalArea >= rule.conditions.minArea
      }
      if (volumeApplies && rule.conditions.maxArea) {
        volumeApplies = totalArea <= rule.conditions.maxArea
      }
      return volumeApplies
    
    default:
      return false
  }
}
```

### 7. Apply Pricing Adjustments Correctly

```javascript
function applyPricingRule(service, rule) {
  let adjustedService = { ...service }
  
  // 1. Apply multiplier (percentage change)
  if (rule.pricing.priceMultiplier && rule.pricing.priceMultiplier !== 1) {
    adjustedService.pricePerUnit *= rule.pricing.priceMultiplier
  }
  
  // 2. Or apply fixed prices (overrides multiplier)
  if (rule.pricing.fixedPrices) {
    const serviceType = service.name.toLowerCase()
    if (serviceType.includes('lawn') && rule.pricing.fixedPrices.lawnPerSqFt) {
      adjustedService.pricePerUnit = rule.pricing.fixedPrices.lawnPerSqFt
    } else if (serviceType.includes('driveway') && rule.pricing.fixedPrices.drivewayPerSqFt) {
      adjustedService.pricePerUnit = rule.pricing.fixedPrices.drivewayPerSqFt
    } else if (serviceType.includes('sidewalk') && rule.pricing.fixedPrices.sidewalkPerSqFt) {
      adjustedService.pricePerUnit = rule.pricing.fixedPrices.sidewalkPerSqFt
    }
  }
  
  // 3. Recalculate total
  adjustedService.totalPrice = adjustedService.area * adjustedService.pricePerUnit
  
  // 4. Add surcharge
  if (rule.pricing.surcharge) {
    adjustedService.totalPrice += rule.pricing.surcharge
  }
  
  // 5. Apply discount
  if (rule.pricing.discount) {
    if (rule.pricing.discount.percentage) {
      adjustedService.totalPrice *= (1 - rule.pricing.discount.type / 100)
    } else {
      adjustedService.totalPrice -= rule.pricing.discount.type
    }
  }
  
  // 6. Enforce minimum charge
  if (rule.pricing.minimumCharge && adjustedService.totalPrice < rule.pricing.minimumCharge) {
    adjustedService.totalPrice = rule.pricing.minimumCharge
  }
  
  // Add metadata about applied rule
  adjustedService.appliedRules = adjustedService.appliedRules || []
  adjustedService.appliedRules.push({
    ruleId: rule._id,
    ruleName: rule.name,
    adjustment: adjustedService.totalPrice - (service.area * service.pricePerUnit)
  })
  
  return adjustedService
}
```

### 8. Add Rule Testing/Preview Feature

Create a dedicated testing page:
```javascript
// /app/(dashboard)/pricing/test/page.tsx
function PricingRuleTest() {
  const [testScenario, setTestScenario] = useState({
    zipCode: '',
    customerTags: [],
    services: [
      { name: 'Lawn Service', area: 5000, pricePerUnit: 0.02 },
      { name: 'Driveway Service', area: 1000, pricePerUnit: 0.03 }
    ],
    date: new Date()
  })
  
  const [results, setResults] = useState(null)
  
  const testRules = async () => {
    const response = await fetch('/api/pricing-rules/test', {
      method: 'POST',
      body: JSON.stringify(testScenario)
    })
    const data = await response.json()
    setResults(data)
  }
  
  return (
    // UI to input test scenarios and see results
  )
}
```

### 9. Add Reporting and Analytics

Track rule performance:
```javascript
// Add to quote creation
await PricingRule.updateMany(
  { _id: { $in: appliedRules.map(r => r.id) } },
  { 
    $inc: { appliedCount: 1 },
    $push: { 
      applicationHistory: {
        date: new Date(),
        quoteId: quote._id,
        adjustment: totalAdjustment
      }
    }
  }
)
```

### 10. Safety Measures and Validation

```javascript
// Validation rules
const validatePricingRule = (rule) => {
  // Ensure positive prices
  if (rule.pricing.priceMultiplier && rule.pricing.priceMultiplier < 0) {
    throw new Error('Price multiplier cannot be negative')
  }
  
  // Ensure valid priority
  if (rule.priority < 0 || rule.priority > 100) {
    throw new Error('Priority must be between 0 and 100')
  }
  
  // Ensure at least one pricing adjustment
  if (!rule.pricing.priceMultiplier && 
      !rule.pricing.fixedPrices && 
      !rule.pricing.surcharge && 
      !rule.pricing.discount) {
    throw new Error('Rule must have at least one pricing adjustment')
  }
  
  // Type-specific validations
  switch (rule.type) {
    case 'zone':
      if (!rule.conditions.zipCodes?.length) {
        throw new Error('Zone rules must have at least one ZIP code')
      }
      break
    case 'seasonal':
      if (!rule.conditions.dateRange && !rule.conditions.dayOfWeek?.length) {
        throw new Error('Seasonal rules must have date range or day of week')
      }
      break
    // ... other type validations
  }
  
  return true
}
```

## Testing Strategy

### Unit Tests:
1. Test each rule type individually
2. Test rule priority ordering
3. Test price calculation accuracy
4. Test edge cases (negative prices, zero area, etc.)

### Integration Tests:
1. Test rule application in quote creation
2. Test multiple rules interaction
3. Test API endpoints
4. Test UI components

### Manual Testing Checklist:
- [ ] Create each type of rule
- [ ] Verify rules apply correctly in quotes
- [ ] Test rule priorities
- [ ] Test rule enable/disable
- [ ] Test rule deletion
- [ ] Verify no breaking changes to existing quotes
- [ ] Test performance with many rules

## Migration Strategy

1. **Phase 1**: Fix calculator and add to quote creation (no breaking changes)
2. **Phase 2**: Add UI for rule management
3. **Phase 3**: Add advanced features (testing, analytics)
4. **Phase 4**: Optimize performance and add caching

## Performance Considerations

- Cache active rules per business
- Index conditions fields for faster queries
- Limit rules per business (e.g., max 50)
- Batch rule applications
- Use MongoDB aggregation for complex queries

## Security Considerations

- Validate all rule inputs
- Ensure business isolation (can't see other business rules)
- Rate limit rule creation
- Audit log all rule changes
- Role-based access (only business owners can manage)

## Rollback Plan

If issues occur:
1. Feature flag to disable rule application
2. Keep original pricing logic as fallback
3. Log all rule applications for debugging
4. Ability to revert quotes to original pricing

## Success Metrics

- Rules applied successfully in 100% of quotes
- No performance degradation (< 100ms added latency)
- Increased average quote value by X%
- Reduced manual pricing adjustments by Y%
- Business owner satisfaction score

## Timeline Estimate

- **Week 1**: Fix calculator, integrate with quotes
- **Week 2**: Build UI for rule management
- **Week 3**: Add testing and preview features
- **Week 4**: Testing, optimization, and deployment

This comprehensive implementation will make all pricing rules fully functional while maintaining system stability and providing a great user experience.