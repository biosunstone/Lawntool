/**
 * Setup Geopricing Zones for Toronto
 * Creates three drive-time based pricing zones with specified adjustments
 */

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Define GeopricingZone schema inline
const GeopricingZoneSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  type: { 
    type: String, 
    enum: ['radius', 'polygon', 'zipcode', 'city', 'drivetime'],
    required: true 
  },
  
  // Drive-time configuration
  driveTime: {
    baseLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: String
    },
    maxMinutes: { type: Number, required: true },
    minMinutes: { type: Number, default: 0 },
    trafficModel: { 
      type: String, 
      enum: ['bestguess', 'pessimistic', 'optimistic'],
      default: 'bestguess'
    }
  },
  
  // Pricing configuration
  pricing: {
    adjustmentType: { 
      type: String, 
      enum: ['percentage', 'fixed', 'multiplier'],
      required: true,
      default: 'percentage'
    },
    adjustmentValue: { 
      type: Number, 
      required: true 
    },
    serviceAdjustments: {
      type: Map,
      of: Number
    },
    minPrice: Number,
    maxPrice: Number
  },
  
  // Priority and status
  priority: { 
    type: Number, 
    default: 1,
    index: true 
  },
  active: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  
  // Route optimization
  routeOptimization: {
    preferredDays: [Number],
    preferredTimeSlots: [{
      start: String,
      end: String
    }],
    maxDailyServices: Number,
    routeDensityBonus: Number
  }
}, {
  timestamps: true
})

// Import required modules
async function setupTorontoGeopricing() {
  console.log('🗺️  Setting up Toronto Geopricing Zones\n')
  console.log('='.repeat(60))
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get or create the GeopricingZone model
    const GeopricingZone = mongoose.models.GeopricingZone || mongoose.model('GeopricingZone', GeopricingZoneSchema)
    
    // Get the Business model (it should already exist)
    const Business = mongoose.models.Business || mongoose.model('Business', new mongoose.Schema({
      name: String,
      ownerId: mongoose.Schema.Types.ObjectId,
      address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String
      },
      settings: mongoose.Schema.Types.Mixed
    }))
    
    // Get the User model (it should already exist)
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String
    }))
    
    // Find a business to set up zones for (you can modify this)
    // For demo, we'll use the first business or create a test one
    let business = await Business.findOne({ name: 'Toronto Lawn Care Services' })
    let user = await User.findOne({ role: 'business_owner' })
    
    if (!business) {
      // Create a demo business if none exists
      if (!user) {
        user = await User.create({
          name: 'Toronto Business Owner',
          email: 'owner@torontolawncare.com',
          password: 'demo123',
          role: 'business_owner'
        })
      }
      
      business = await Business.create({
        name: 'Toronto Lawn Care Services',
        ownerId: user._id,
        address: {
          street: '100 Queen St W',
          city: 'Toronto',
          state: 'ON',
          zip: 'M5H 2N1',
          country: 'Canada'
        },
        settings: {
          defaultPricing: {
            lawnPerSqFt: 0.02,      // $0.02 per sq ft
            drivewayPerSqFt: 0.03,  // $0.03 per sq ft
            sidewalkPerSqFt: 0.025, // $0.025 per sq ft
            minimumCharge: 50       // $50 minimum
          }
        }
      })
      console.log('📍 Created demo business: Toronto Lawn Care Services')
    }
    
    // Business headquarters location (Downtown Toronto)
    const shopLocation = {
      lat: 43.6532,
      lng: -79.3832,
      address: '100 Queen St W, Toronto, ON M5H 2N1'
    }
    
    console.log(`📍 Shop Location: ${shopLocation.address}`)
    console.log(`   Coordinates: ${shopLocation.lat}, ${shopLocation.lng}\n`)
    console.log(`   Business ID: ${business._id}\n`)
    
    // Clear existing zones for this business (optional)
    await GeopricingZone.deleteMany({ businessId: business._id })
    console.log('🧹 Cleared existing zones\n')
    
    // Create Zone 1: Close Proximity (Within 5 minutes - 5% discount)
    const zone1 = await GeopricingZone.create({
      businessId: business._id,
      name: 'Close Proximity - Quick Service',
      description: 'Customers within 5-minute drive receive 5% discount for efficient routing',
      type: 'drivetime',
      active: true,
      driveTime: {
        baseLocation: shopLocation,
        minMinutes: 0,
        maxMinutes: 5,
        trafficModel: 'bestguess'
      },
      pricing: {
        adjustmentType: 'percentage',
        adjustmentValue: -5,  // 5% discount
        serviceAdjustments: {
          lawn: -5,
          driveway: -5,
          sidewalk: -5
        }
      },
      priority: 3,  // Highest priority
      routeOptimization: {
        routeDensityBonus: -2  // Additional 2% for dense routes
      }
    })
    
    console.log('✅ Zone 1 Created: Close Proximity')
    console.log('   • Drive time: 0-5 minutes')
    console.log('   • Adjustment: 5% DISCOUNT')
    console.log('   • Priority: 3 (Highest)\n')
    
    // Create Zone 2: Standard Service (5-20 minutes - base pricing)
    const zone2 = await GeopricingZone.create({
      businessId: business._id,
      name: 'Standard Service Area',
      description: 'Standard pricing for regular service area (5-20 minute drive)',
      type: 'drivetime',
      active: true,
      driveTime: {
        baseLocation: shopLocation,
        minMinutes: 5,
        maxMinutes: 20,
        trafficModel: 'bestguess'
      },
      pricing: {
        adjustmentType: 'percentage',
        adjustmentValue: 0,  // No adjustment (base pricing)
        serviceAdjustments: {
          lawn: 0,
          driveway: 0,
          sidewalk: 0
        }
      },
      priority: 2,  // Medium priority
      routeOptimization: {
        routeDensityBonus: 0
      }
    })
    
    console.log('✅ Zone 2 Created: Standard Service Area')
    console.log('   • Drive time: 5-20 minutes')
    console.log('   • Adjustment: BASE PRICING (0%)')
    console.log('   • Priority: 2 (Medium)\n')
    
    // Create Zone 3: Extended Service (Over 20 minutes - 10% surcharge)
    const zone3 = await GeopricingZone.create({
      businessId: business._id,
      name: 'Extended Service Area',
      description: 'Areas beyond 20-minute drive incur 10% surcharge for travel time',
      type: 'drivetime',
      active: true,
      driveTime: {
        baseLocation: shopLocation,
        minMinutes: 20,
        maxMinutes: 60,  // Up to 60 minutes
        trafficModel: 'bestguess'
      },
      pricing: {
        adjustmentType: 'percentage',
        adjustmentValue: 10,  // 10% surcharge
        serviceAdjustments: {
          lawn: 10,
          driveway: 10,
          sidewalk: 10
        }
      },
      priority: 1,  // Lowest priority (catches everything beyond 20 min)
      routeOptimization: {
        routeDensityBonus: 0
      }
    })
    
    console.log('✅ Zone 3 Created: Extended Service Area')
    console.log('   • Drive time: 20-60 minutes')
    console.log('   • Adjustment: 10% SURCHARGE')
    console.log('   • Priority: 1 (Lowest)\n')
    
    // Generate Rate Tables
    console.log('='.repeat(60))
    console.log('📊 TORONTO GEOPRICING RATE TABLES')
    console.log('='.repeat(60))
    
    const basePrices = {
      lawn: 0.02,
      driveway: 0.03,
      sidewalk: 0.025
    }
    
    // Helper function to calculate prices
    const calculatePrice = (basePrice, adjustment) => {
      return basePrice * (1 + adjustment / 100)
    }
    
    // Zone 1 Rate Table (5% Discount)
    console.log('\n🟢 ZONE 1: CLOSE PROXIMITY (0-5 min drive)')
    console.log('   5% DISCOUNT on all services')
    console.log('-'.repeat(50))
    console.log('Service          Base Rate    →  Adjusted Rate')
    console.log('-'.repeat(50))
    console.log(`Lawn Care        $${basePrices.lawn.toFixed(3)}/sqft  →  $${calculatePrice(basePrices.lawn, -5).toFixed(3)}/sqft`)
    console.log(`Driveway         $${basePrices.driveway.toFixed(3)}/sqft  →  $${calculatePrice(basePrices.driveway, -5).toFixed(3)}/sqft`)
    console.log(`Sidewalk         $${basePrices.sidewalk.toFixed(3)}/sqft  →  $${calculatePrice(basePrices.sidewalk, -5).toFixed(3)}/sqft`)
    console.log('\nExample: 5,000 sqft lawn')
    console.log(`  Base: $${(5000 * basePrices.lawn).toFixed(2)}`)
    console.log(`  With discount: $${(5000 * calculatePrice(basePrices.lawn, -5)).toFixed(2)} (Save $${(5000 * basePrices.lawn * 0.05).toFixed(2)})`)
    
    // Zone 2 Rate Table (Base Pricing)
    console.log('\n🔵 ZONE 2: STANDARD SERVICE (5-20 min drive)')
    console.log('   BASE PRICING (no adjustment)')
    console.log('-'.repeat(50))
    console.log('Service          Rate')
    console.log('-'.repeat(50))
    console.log(`Lawn Care        $${basePrices.lawn.toFixed(3)}/sqft`)
    console.log(`Driveway         $${basePrices.driveway.toFixed(3)}/sqft`)
    console.log(`Sidewalk         $${basePrices.sidewalk.toFixed(3)}/sqft`)
    console.log('\nExample: 5,000 sqft lawn')
    console.log(`  Price: $${(5000 * basePrices.lawn).toFixed(2)}`)
    
    // Zone 3 Rate Table (10% Surcharge)
    console.log('\n🔴 ZONE 3: EXTENDED SERVICE (20+ min drive)')
    console.log('   10% SURCHARGE on all services')
    console.log('-'.repeat(50))
    console.log('Service          Base Rate    →  Adjusted Rate')
    console.log('-'.repeat(50))
    console.log(`Lawn Care        $${basePrices.lawn.toFixed(3)}/sqft  →  $${calculatePrice(basePrices.lawn, 10).toFixed(3)}/sqft`)
    console.log(`Driveway         $${basePrices.driveway.toFixed(3)}/sqft  →  $${calculatePrice(basePrices.driveway, 10).toFixed(3)}/sqft`)
    console.log(`Sidewalk         $${basePrices.sidewalk.toFixed(3)}/sqft  →  $${calculatePrice(basePrices.sidewalk, 10).toFixed(3)}/sqft`)
    console.log('\nExample: 5,000 sqft lawn')
    console.log(`  Base: $${(5000 * basePrices.lawn).toFixed(2)}`)
    console.log(`  With surcharge: $${(5000 * calculatePrice(basePrices.lawn, 10)).toFixed(2)} (Extra $${(5000 * basePrices.lawn * 0.10).toFixed(2)})`)
    
    // Summary Table
    console.log('\n' + '='.repeat(60))
    console.log('📋 PRICING SUMMARY BY AREA')
    console.log('='.repeat(60))
    
    const areas = [
      { name: 'Downtown Core', driveTime: 3, zone: 1, adjustment: -5 },
      { name: 'Liberty Village', driveTime: 4, zone: 1, adjustment: -5 },
      { name: 'The Annex', driveTime: 8, zone: 2, adjustment: 0 },
      { name: 'Yorkville', driveTime: 10, zone: 2, adjustment: 0 },
      { name: 'Forest Hill', driveTime: 15, zone: 2, adjustment: 0 },
      { name: 'Etobicoke', driveTime: 25, zone: 3, adjustment: 10 },
      { name: 'Scarborough', driveTime: 30, zone: 3, adjustment: 10 },
      { name: 'North York (Far)', driveTime: 35, zone: 3, adjustment: 10 }
    ]
    
    console.log('Neighborhood         Drive Time   Zone   Adjustment   5000sqft Lawn')
    console.log('-'.repeat(70))
    
    areas.forEach(area => {
      const price = 5000 * calculatePrice(basePrices.lawn, area.adjustment)
      const emoji = area.adjustment < 0 ? '💰' : area.adjustment > 0 ? '📈' : '✓'
      console.log(
        `${area.name.padEnd(20)} ${String(area.driveTime + ' min').padEnd(11)} ${String(area.zone).padEnd(6)} ` +
        `${(area.adjustment >= 0 ? '+' : '') + area.adjustment + '%'}`.padEnd(12) +
        `$${price.toFixed(2)} ${emoji}`
      )
    })
    
    // Configuration Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ GEOPRICING CONFIGURATION COMPLETE!')
    console.log('='.repeat(60))
    console.log('\nBusiness: ' + business.name)
    console.log('Business ID: ' + business._id)
    console.log('\nZones Created:')
    console.log('  • Zone 1: 0-5 min (5% discount) - Priority 3')
    console.log('  • Zone 2: 5-20 min (base pricing) - Priority 2')
    console.log('  • Zone 3: 20+ min (10% surcharge) - Priority 1')
    console.log('\nHow zones work:')
    console.log('  1. Customer enters address')
    console.log('  2. System calculates drive time from shop')
    console.log('  3. Appropriate zone pricing is applied')
    console.log('  4. Higher priority zones override lower ones')
    
    // Test examples
    console.log('\n' + '='.repeat(60))
    console.log('🧪 TEST EXAMPLES')
    console.log('='.repeat(60))
    console.log('\nTo test pricing for an address, use:')
    console.log('\nPOST /api/geopricing/test')
    console.log(JSON.stringify({
      location: {
        address: "1 Yonge St, Toronto, ON",
        lat: 43.6426,
        lng: -79.3771
      },
      services: [{
        name: "Lawn Care",
        area: 5000,
        pricePerUnit: 0.02,
        totalPrice: 100
      }]
    }, null, 2))
    
    console.log('\nTest addresses to try:')
    console.log('  • Close (Zone 1): CN Tower, 290 Bremner Blvd')
    console.log('  • Medium (Zone 2): Casa Loma, 1 Austin Terrace')
    console.log('  • Far (Zone 3): Toronto Zoo, 2000 Meadowvale Rd')
    
  } catch (error) {
    console.error('❌ Error setting up geopricing:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n👋 Database connection closed')
  }
}

// Run the setup
setupTorontoGeopricing()