# Geopricing Testing Guide

## 🚀 Quick Start Testing

### Step 1: Set Up the Zones
First, run the setup script to create the Toronto zones in your database:

```bash
node scripts/setup-toronto-geopricing.js
```

This will create three zones and display rate tables.

### Step 2: Start Your Server
Make sure your application is running:

```bash
npm run dev
```

### Step 3: Run Automated Tests
Run the comprehensive test suite:

```bash
node test-geopricing.js
```

Or test interactively:

```bash
node test-geopricing.js --interactive
```

---

## 🧪 Manual Testing Methods

### Method 1: Using cURL (Command Line)

#### Test Downtown Toronto (Zone 1 - 5% Discount)
```bash
curl -X POST http://localhost:3000/api/geopricing/test \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "address": "CN Tower, 290 Bremner Blvd, Toronto",
      "lat": 43.6426,
      "lng": -79.3771
    },
    "services": [{
      "name": "Lawn Care",
      "area": 5000,
      "pricePerUnit": 0.02,
      "totalPrice": 100
    }]
  }'
```

**Expected Result**: 5% discount = $95.00 final price

#### Test Midtown Toronto (Zone 2 - Base Pricing)
```bash
curl -X POST http://localhost:3000/api/geopricing/test \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "address": "Casa Loma, 1 Austin Terrace, Toronto",
      "lat": 43.6780,
      "lng": -79.4094
    },
    "services": [{
      "name": "Lawn Care",
      "area": 5000,
      "pricePerUnit": 0.02,
      "totalPrice": 100
    }]
  }'
```

**Expected Result**: Base pricing = $100.00

#### Test Scarborough (Zone 3 - 10% Surcharge)
```bash
curl -X POST http://localhost:3000/api/geopricing/test \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "address": "Scarborough Town Centre, 300 Borough Dr, Toronto",
      "lat": 43.7764,
      "lng": -79.2573
    },
    "services": [{
      "name": "Lawn Care",
      "area": 5000,
      "pricePerUnit": 0.02,
      "totalPrice": 100
    }]
  }'
```

**Expected Result**: 10% surcharge = $110.00 final price

---

### Method 2: Using Postman

1. **Import the API**
   - Open Postman
   - Create a new POST request
   - URL: `http://localhost:3000/api/geopricing/test`
   - Headers: `Content-Type: application/json`

2. **Test Different Addresses**

**Body for Zone 1 Test:**
```json
{
  "location": {
    "address": "Rogers Centre, 1 Blue Jays Way, Toronto",
    "lat": 43.6414,
    "lng": -79.3894
  },
  "services": [
    {
      "name": "Lawn Care",
      "area": 5000,
      "pricePerUnit": 0.02,
      "totalPrice": 100
    },
    {
      "name": "Driveway Cleaning",
      "area": 1000,
      "pricePerUnit": 0.03,
      "totalPrice": 30
    }
  ]
}
```

---

### Method 3: Using the Browser Console

Open your browser console (F12) and run:

```javascript
// Test Zone 1 (Downtown)
fetch('http://localhost:3000/api/geopricing/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: {
      address: "Eaton Centre, 220 Yonge St, Toronto",
      lat: 43.6544,
      lng: -79.3807
    },
    services: [{
      name: "Lawn Care",
      area: 5000,
      pricePerUnit: 0.02,
      totalPrice: 100
    }]
  })
})
.then(res => res.json())
.then(data => console.log('Zone 1 Result:', data));

// Test Zone 2 (Midtown)
fetch('http://localhost:3000/api/geopricing/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: {
      address: "High Park, 1873 Bloor St W, Toronto",
      lat: 43.6465,
      lng: -79.4637
    },
    services: [{
      name: "Lawn Care",
      area: 5000,
      pricePerUnit: 0.02,
      totalPrice: 100
    }]
  })
})
.then(res => res.json())
.then(data => console.log('Zone 2 Result:', data));

// Test Zone 3 (Far)
fetch('http://localhost:3000/api/geopricing/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: {
      address: "Toronto Zoo, 2000 Meadowvale Rd, Toronto",
      lat: 43.8177,
      lng: -79.1859
    },
    services: [{
      name: "Lawn Care",
      area: 5000,
      pricePerUnit: 0.02,
      totalPrice: 100
    }]
  })
})
.then(res => res.json())
.then(data => console.log('Zone 3 Result:', data));
```

---

## 📍 Test Addresses by Zone

### Zone 1: Close Proximity (0-5 min) - 5% Discount

| Location | Address | Coordinates |
|----------|---------|-------------|
| CN Tower | 290 Bremner Blvd | 43.6426, -79.3771 |
| Rogers Centre | 1 Blue Jays Way | 43.6414, -79.3894 |
| Eaton Centre | 220 Yonge St | 43.6544, -79.3807 |
| Union Station | 65 Front St W | 43.6453, -79.3806 |
| St. Lawrence Market | 93 Front St E | 43.6487, -79.3715 |

### Zone 2: Standard Service (5-20 min) - Base Pricing

| Location | Address | Coordinates |
|----------|---------|-------------|
| Casa Loma | 1 Austin Terrace | 43.6780, -79.4094 |
| High Park | 1873 Bloor St W | 43.6465, -79.4637 |
| The Beaches | 2075 Queen St E | 43.6689, -79.2926 |
| Yorkdale Mall | 3401 Dufferin St | 43.7254, -79.4521 |
| Forest Hill | 1 Forest Hill Rd | 43.6969, -79.4058 |

### Zone 3: Extended Service (20+ min) - 10% Surcharge

| Location | Address | Coordinates |
|----------|---------|-------------|
| Toronto Zoo | 2000 Meadowvale Rd | 43.8177, -79.1859 |
| Scarborough Centre | 300 Borough Dr | 43.7764, -79.2573 |
| Pearson Airport | 6301 Silver Dart Dr | 43.6772, -79.6306 |
| Centennial Park | 256 Centennial Park Rd | 43.6507, -79.5914 |
| Rouge Park | 1749 Meadowvale Rd | 43.8125, -79.1775 |

---

## 📊 Understanding Test Results

### Successful Response Structure
```json
{
  "location": {
    "address": "CN Tower, Toronto",
    "lat": 43.6426,
    "lng": -79.3771
  },
  "geopricing": {
    "applicableZones": [{
      "zoneId": "...",
      "zoneName": "Close Proximity - Quick Service",
      "adjustmentType": "percentage",
      "adjustmentValue": -5,
      "reason": "Within 5 minutes drive time"
    }],
    "finalAdjustment": {
      "type": "percentage",
      "value": -5,
      "description": "Close Proximity: Within 5 minutes drive time"
    },
    "metadata": {
      "driveTimeMinutes": 3,
      "distanceFromBase": 1.2
    }
  },
  "pricing": {
    "services": [{
      "name": "Lawn Care",
      "originalPrice": 100,
      "adjustedPrice": 95,
      "geopricingApplied": true,
      "totalPrice": 95
    }],
    "appliedRules": [{
      "ruleId": "geo_123",
      "ruleName": "Geopricing: Close Proximity",
      "ruleType": "geopricing",
      "adjustment": -5,
      "description": "Within 5 minutes drive time"
    }]
  }
}
```

### What to Check

1. **Zone Detection**
   - Verify correct zone is applied based on drive time
   - Check that priority is working (Zone 1 > Zone 2 > Zone 3)

2. **Price Calculations**
   - Zone 1: Original price × 0.95 (5% off)
   - Zone 2: Original price × 1.00 (no change)
   - Zone 3: Original price × 1.10 (10% extra)

3. **Metadata**
   - `driveTimeMinutes`: Should match expected drive time
   - `distanceFromBase`: Straight-line distance in miles

---

## 🔧 Troubleshooting

### Issue: All addresses getting base pricing
**Solution**: Check that zones are created and active:
```javascript
// In MongoDB or through your admin panel
db.geopricingzones.find({ businessId: "YOUR_BUSINESS_ID" })
```

### Issue: Drive time not calculating
**Solution**: Verify Google Maps API key has Distance Matrix API enabled:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services
3. Enable "Distance Matrix API"
4. Check API quota

### Issue: Wrong zone applied
**Solution**: Check zone priorities - higher priority zones override lower:
- Zone 1: Priority 3 (highest)
- Zone 2: Priority 2
- Zone 3: Priority 1 (lowest)

### Issue: No geopricing in response
**Solution**: Ensure location has required fields:
```json
{
  "location": {
    "lat": 43.6426,  // Required
    "lng": -79.3771  // Required
  }
}
```

---

## 📈 Performance Testing

Test multiple addresses simultaneously:

```javascript
// Batch test script
const addresses = [
  { name: "Downtown", lat: 43.6426, lng: -79.3771 },
  { name: "Midtown", lat: 43.6780, lng: -79.4094 },
  { name: "Scarborough", lat: 43.7764, lng: -79.2573 }
];

async function batchTest() {
  const results = await Promise.all(
    addresses.map(addr => 
      fetch('http://localhost:3000/api/geopricing/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: addr,
          services: [{ 
            name: "Lawn Care", 
            area: 5000, 
            pricePerUnit: 0.02, 
            totalPrice: 100 
          }]
        })
      }).then(r => r.json())
    )
  );
  
  console.table(results.map((r, i) => ({
    Location: addresses[i].name,
    Zone: r.geopricing?.applicableZones[0]?.zoneName || 'None',
    Adjustment: r.geopricing?.finalAdjustment.value || 0,
    FinalPrice: r.pricing?.services[0]?.totalPrice || 100
  })));
}

batchTest();
```

---

## ✅ Validation Checklist

- [ ] Zone 1 addresses get 5% discount
- [ ] Zone 2 addresses get base pricing
- [ ] Zone 3 addresses get 10% surcharge
- [ ] Drive time calculation works
- [ ] Multiple services calculated correctly
- [ ] Zones apply in priority order
- [ ] API responds within 2 seconds
- [ ] Error handling for invalid addresses
- [ ] Metadata includes drive time
- [ ] Pricing details in response

---

## 📝 Notes

- Drive times are calculated using Google Maps with "bestguess" traffic model
- Zones overlap is handled by priority (highest wins)
- Minimum charge of $50 still applies after discounts
- Test during different times to see traffic impact on zones
- API rate limits apply to Google Maps calls (2,500/day)