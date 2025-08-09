# Geopricing™ Documentation

## Overview

Geopricing™ is a location-based dynamic pricing system that automatically adjusts service prices based on geographic factors such as distance, drive time, neighborhood, and route density. This feature is inspired by Deep Lawn's Geopricing system and provides businesses with powerful tools to optimize pricing across their service areas.

## Features

### 1. **Zone Types**

#### Radius Zones
- Define circular service areas around a central point
- Set pricing adjustments based on distance from your shop/office
- Example: 10% discount within 5 miles, 15% surcharge beyond 20 miles

#### Drive Time Zones
- Price based on actual drive time using Google Maps traffic data
- Account for traffic patterns with different models (optimistic, pessimistic, best guess)
- Example: Base pricing for <15 min, 10% surcharge for 30+ min drives

#### Zipcode Zones
- Set specific pricing for individual ZIP codes
- Perfect for targeting specific neighborhoods
- Example: Premium pricing for high-income ZIP codes

#### City Zones
- Apply pricing rules to entire cities or municipalities
- Useful for multi-city operations
- Example: Different pricing for Toronto vs. Mississauga

#### Polygon Zones
- Draw custom boundaries on a map
- Define irregular service areas
- Example: Premium pricing for waterfront properties

### 2. **Pricing Adjustments**

#### Adjustment Types
- **Percentage**: Add/subtract a percentage (e.g., +10%, -5%)
- **Fixed Amount**: Add/subtract a fixed dollar amount
- **Multiplier**: Multiply prices by a factor (e.g., 1.5x for premium areas)

#### Service-Specific Adjustments
- Different adjustments for lawn, driveway, sidewalk services
- Example: 20% premium for lawn care in gated communities, standard pricing for driveways

#### Seasonal Adjustments
- Vary pricing by month or season
- Example: 15% winter surcharge for snow-covered areas

### 3. **Route Density Optimization**

Automatically adjust pricing to encourage efficient routing:
- **Density Bonus**: Offer discounts in areas with many customers
- **Sparse Penalty**: Add surcharges to isolated service locations
- **Auto-Adjust**: System learns and optimizes over time

## Implementation

### Database Schema

```typescript
GeopricingZone {
  businessId: ObjectId
  name: string
  type: 'radius' | 'polygon' | 'zipcode' | 'city' | 'drivetime'
  active: boolean
  
  // Zone definition
  radius?: { center: {lat, lng}, distance, unit }
  driveTime?: { origin: {lat, lng}, maxMinutes, trafficModel }
  zipcodes?: string[]
  cities?: string[]
  geometry?: GeoJSON
  
  // Pricing
  pricing: {
    adjustmentType: 'percentage' | 'fixed' | 'multiplier'
    adjustmentValue: number
    serviceAdjustments?: { lawn?, driveway?, sidewalk? }
    seasonalAdjustments?: [{startMonth, endMonth, adjustmentValue}]
  }
  
  // Route optimization
  routeDensity?: {
    enabled: boolean
    targetDensity: number
    densityBonus: number
    sparsePenalty: number
  }
  
  priority: number  // Higher priority zones override lower
}
```

### API Endpoints

#### Zone Management
```
GET    /api/geopricing/zones       # List all zones
POST   /api/geopricing/zones       # Create new zone
PUT    /api/geopricing/zones       # Update zone
DELETE /api/geopricing/zones?id=X  # Delete zone
```

#### Testing
```
POST /api/geopricing/test  # Test pricing for an address
GET  /api/geopricing/test  # Get sample test scenarios
```

### Integration with Existing Pricing

Geopricing is applied **after** all other pricing rules:

1. Base pricing calculated
2. Service-specific rules applied
3. Customer tags/discounts applied
4. **Geopricing adjustments applied last**

This ensures geopricing works seamlessly with your existing pricing structure.

## Usage Examples

### Example 1: Basic Distance-Based Pricing

```javascript
// Create radius zones for Toronto lawn care business
const zones = [
  {
    name: "Inner City - Quick Service",
    type: "radius",
    radius: {
      center: { lat: 43.6532, lng: -79.3832, address: "Downtown Toronto" },
      distance: 5,
      unit: "miles"
    },
    pricing: {
      adjustmentType: "percentage",
      adjustmentValue: -5  // 5% discount for nearby customers
    }
  },
  {
    name: "Extended Service Area",
    type: "radius",
    radius: {
      center: { lat: 43.6532, lng: -79.3832 },
      distance: 20,
      unit: "miles"
    },
    pricing: {
      adjustmentType: "percentage",
      adjustmentValue: 15  // 15% surcharge for distant customers
    }
  }
]
```

### Example 2: Drive Time with Traffic

```javascript
{
  name: "Rush Hour Pricing",
  type: "drivetime",
  driveTime: {
    origin: { lat: 43.6532, lng: -79.3832 },
    maxMinutes: 30,
    trafficModel: "pessimistic"  // Account for traffic
  },
  pricing: {
    adjustmentType: "percentage",
    adjustmentValue: 10,
    serviceAdjustments: {
      lawn: 15,  // Extra charge for lawn service
      driveway: 5  // Less charge for quick driveway service
    }
  }
}
```

### Example 3: Premium Neighborhood Zones

```javascript
{
  name: "Forest Hill Premium",
  type: "zipcode",
  zipcodes: ["M4V", "M5N", "M4W"],  // Wealthy Toronto neighborhoods
  pricing: {
    adjustmentType: "multiplier",
    adjustmentValue: 1.25  // 25% premium pricing
  },
  metadata: {
    color: "#FFD700",  // Gold color on map
    tags: ["premium", "high-value"]
  }
}
```

### Example 4: Route Density Optimization

```javascript
{
  name: "Etobicoke Service Cluster",
  type: "city",
  cities: ["Etobicoke"],
  pricing: {
    adjustmentType: "percentage",
    adjustmentValue: 0  // Base adjustment
  },
  routeDensity: {
    enabled: true,
    targetDensity: 20,  // Target 20 customers in area
    densityBonus: 8,    // 8% discount when dense
    sparsePenalty: 12,  // 12% surcharge when sparse
    autoAdjust: true    // Learn optimal density
  }
}
```

## Testing Geopricing

### Using the Test Endpoint

```bash
# Test pricing for a specific address
curl -X POST /api/geopricing/test \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "address": "123 Queen St W, Toronto",
      "lat": 43.6489,
      "lng": -79.4044,
      "zipcode": "M5V 2A9"
    },
    "services": [
      {
        "name": "Lawn Measurement",
        "area": 5000,
        "pricePerUnit": 0.02,
        "totalPrice": 100
      }
    ]
  }'
```

### Response Example

```json
{
  "geopricing": {
    "applicableZones": [{
      "zoneId": "...",
      "zoneName": "Downtown Quick Service",
      "adjustmentType": "percentage",
      "adjustmentValue": -5,
      "reason": "Within 5 miles of base"
    }],
    "finalAdjustment": {
      "type": "percentage",
      "value": -5,
      "description": "Downtown Quick Service: Within 5 miles of base"
    },
    "metadata": {
      "distanceFromBase": 3.2,
      "driveTimeMinutes": 8,
      "isHighDensityArea": true
    }
  },
  "pricing": {
    "services": [{
      "name": "Lawn Measurement",
      "originalPrice": 100,
      "adjustedPrice": 95,
      "geopricingApplied": true
    }]
  }
}
```

## Best Practices

### 1. Zone Priority
- Set higher priority for specific zones (neighborhoods) over general zones (radius)
- Zones are evaluated in priority order, first match wins

### 2. Overlap Handling
- Avoid overlapping zones of the same type
- Use priority to control which zone applies when overlaps exist

### 3. Testing
- Always test zones with real addresses before activating
- Monitor zone performance and adjust based on data

### 4. Route Density
- Start with conservative density targets
- Enable auto-adjust to let the system optimize
- Review density reports monthly

### 5. Seasonal Adjustments
- Plan seasonal pricing in advance
- Consider weather patterns and demand fluctuations
- Test seasonal rules before peak seasons

## Performance Considerations

### Caching
- Zone calculations are cached for 5 minutes per address
- Google Maps API calls are minimized through batching

### Limits
- Maximum 100 zones per business
- Drive time calculations limited to 2,500/day (Google Maps quota)
- Polygon zones limited to 50 vertices

### Optimization
- Use radius zones for simple distance-based pricing (fastest)
- Use zipcode/city zones for known areas (no API calls)
- Use drive time zones sparingly (API quota)

## Troubleshooting

### Common Issues

1. **Zone not applying**
   - Check zone is active
   - Verify priority settings
   - Test with exact coordinates

2. **Drive time not calculating**
   - Verify Google Maps API key has Distance Matrix API enabled
   - Check API quota limits
   - Ensure origin coordinates are valid

3. **Unexpected pricing**
   - Review zone priorities
   - Check for overlapping zones
   - Verify adjustment calculations

## Future Enhancements

- [ ] Visual zone editor with map interface
- [ ] Real-time traffic integration
- [ ] Historical pricing analytics
- [ ] Competitor pricing zones
- [ ] Dynamic pricing based on demand
- [ ] Integration with routing optimization
- [ ] Customer heatmaps
- [ ] Automatic zone suggestions based on data

## Support

For questions or issues with Geopricing:
1. Check zone configuration in admin panel
2. Test with `/api/geopricing/test` endpoint
3. Review logs for calculation details
4. Contact support with zone ID and test address