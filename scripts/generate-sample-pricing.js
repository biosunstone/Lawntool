const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define the PricingCalculation schema inline
const pricingCalculationSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, required: true },
  calculationId: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['draft', 'quoted', 'accepted', 'declined', 'expired', 'converted'],
    default: 'quoted'
  },
  source: { type: String, default: 'website' },
  
  customer: {
    name: String,
    email: String,
    phone: String,
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    propertySize: { type: Number, required: true },
    propertyType: String
  },
  
  driveTimeCalculation: {
    result: {
      driveTimeMinutes: { type: Number, required: true },
      distanceKm: { type: Number, required: true },
      distanceText: String,
      durationText: String,
      origin: {
        address: String,
        lat: Number,
        lng: Number
      },
      destination: {
        address: String,
        lat: Number,
        lng: Number
      },
      calculatedAt: Date,
      fromCache: { type: Boolean, default: false }
    },
    apiProvider: { type: String, default: 'google' },
    apiResponseTime: Number,
    fromCache: Boolean,
    cacheKey: String
  },
  
  zoneAssignment: {
    matchedZone: String,
    zoneDetails: {
      name: String,
      driveTimeThreshold: {
        min: Number,
        max: Number
      },
      adjustmentType: String,
      adjustmentValue: Number,
      color: String
    },
    adjustmentType: { type: String, default: 'percentage' },
    adjustmentValue: Number
  },
  
  pricing: {
    baseRatePer1000SqFt: Number,
    basePrice: Number,
    adjustment: {
      type: { type: String },
      value: Number,
      amount: Number
    },
    adjustedPrice: Number,
    finalPrice: { type: Number, required: true },
    currency: { type: String, default: 'CAD' },
    breakdown: [{
      description: String,
      amount: Number
    }]
  },
  
  formattedOutput: {
    table: String,
    explanation: String,
    generatedBy: { type: String, default: 'claude' },
    generatedAt: Date
  },
  
  performance: {
    totalProcessingTime: Number,
    breakdownTimes: {
      configRetrieval: Number,
      geocoding: Number,
      driveTimeApi: Number,
      zoneMatching: Number,
      priceCalculation: Number,
      claudeFormatting: Number,
      databaseSave: Number
    }
  },
  
  followUp: {
    lastContactedAt: Date,
    contactAttempts: { type: Number, default: 0 },
    notes: [String],
    nextFollowUpDate: Date
  },
  
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  }
}, {
  timestamps: true
});

// Sample Toronto addresses with realistic property sizes
const sampleCustomers = [
  // Close Zone (0-5 minutes)
  {
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(416) 555-0101',
    address: '220 Yonge St, Toronto, ON',
    coordinates: { lat: 43.6544, lng: -79.3807 },
    propertySize: 3500,
    driveTime: 4,
    distance: 1.2,
    zone: 'close',
    status: 'converted'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '(416) 555-0102',
    address: '88 Queens Quay W, Toronto, ON',
    coordinates: { lat: 43.6389, lng: -79.3816 },
    propertySize: 5000,
    driveTime: 5,
    distance: 1.8,
    zone: 'close',
    status: 'quoted'
  },
  {
    name: 'Michael Chen',
    email: 'mchen@email.com',
    phone: '(416) 555-0103',
    address: '1 Dundas St W, Toronto, ON',
    coordinates: { lat: 43.6561, lng: -79.3806 },
    propertySize: 2800,
    driveTime: 3,
    distance: 1.0,
    zone: 'close',
    status: 'converted'
  },
  
  // Standard Zone (5-20 minutes)
  {
    name: 'Emily Davis',
    email: 'emily.davis@email.com',
    phone: '(416) 555-0201',
    address: '1 Austin Terrace, Toronto, ON',
    coordinates: { lat: 43.6756, lng: -79.4097 },
    propertySize: 7500,
    driveTime: 12,
    distance: 5.5,
    zone: 'standard',
    status: 'accepted'
  },
  {
    name: 'Robert Wilson',
    email: 'rwilson@email.com',
    phone: '(416) 555-0202',
    address: '1873 Bloor St W, Toronto, ON',
    coordinates: { lat: 43.6515, lng: -79.4644 },
    propertySize: 6000,
    driveTime: 15,
    distance: 8.2,
    zone: 'standard',
    status: 'quoted'
  },
  {
    name: 'Lisa Anderson',
    email: 'lisa.a@email.com',
    phone: '(416) 555-0203',
    address: '789 Yonge St, Toronto, ON',
    coordinates: { lat: 43.6711, lng: -79.3869 },
    propertySize: 4500,
    driveTime: 8,
    distance: 3.5,
    zone: 'standard',
    status: 'converted'
  },
  {
    name: 'David Martinez',
    email: 'dmartinez@email.com',
    phone: '(416) 555-0204',
    address: '2300 Yonge St, Toronto, ON',
    coordinates: { lat: 43.7077, lng: -79.3988 },
    propertySize: 8000,
    driveTime: 18,
    distance: 9.8,
    zone: 'standard',
    status: 'declined'
  },
  
  // Extended Zone (20+ minutes)
  {
    name: 'Jennifer Brown',
    email: 'jbrown@email.com',
    phone: '(416) 555-0301',
    address: '2000 Meadowvale Rd, Toronto, ON',
    coordinates: { lat: 43.8361, lng: -79.1889 },
    propertySize: 10000,
    driveTime: 35,
    distance: 28.5,
    zone: 'extended',
    status: 'quoted'
  },
  {
    name: 'William Taylor',
    email: 'wtaylor@email.com',
    phone: '(416) 555-0302',
    address: '123 Steeles Ave E, North York, ON',
    coordinates: { lat: 43.8241, lng: -79.3267 },
    propertySize: 12000,
    driveTime: 28,
    distance: 22.3,
    zone: 'extended',
    status: 'accepted'
  },
  {
    name: 'Patricia Garcia',
    email: 'pgarcia@email.com',
    phone: '(416) 555-0303',
    address: '4700 Keele St, North York, ON',
    coordinates: { lat: 43.7735, lng: -79.4927 },
    propertySize: 9000,
    driveTime: 25,
    distance: 18.7,
    zone: 'extended',
    status: 'converted'
  },
  {
    name: 'James Rodriguez',
    email: 'jrodriguez@email.com',
    phone: '(416) 555-0304',
    address: '1265 Military Trail, Scarborough, ON',
    coordinates: { lat: 43.7845, lng: -79.1885 },
    propertySize: 15000,
    driveTime: 40,
    distance: 32.5,
    zone: 'extended',
    status: 'expired'
  },
  
  // More varied samples
  {
    name: 'Maria Thompson',
    email: 'mthompson@email.com',
    phone: '(416) 555-0401',
    address: '545 Lake Shore Blvd W, Toronto, ON',
    coordinates: { lat: 43.6369, lng: -79.3956 },
    propertySize: 5500,
    driveTime: 7,
    distance: 2.8,
    zone: 'standard',
    status: 'converted'
  },
  {
    name: 'Kevin Lee',
    email: 'klee@email.com',
    phone: '(416) 555-0402',
    address: '50 Carlton St, Toronto, ON',
    coordinates: { lat: 43.6616, lng: -79.3798 },
    propertySize: 3200,
    driveTime: 4,
    distance: 1.5,
    zone: 'close',
    status: 'quoted'
  },
  {
    name: 'Nancy White',
    email: 'nwhite@email.com',
    phone: '(416) 555-0403',
    address: '3401 Dufferin St, North York, ON',
    coordinates: { lat: 43.7259, lng: -79.4541 },
    propertySize: 11000,
    driveTime: 22,
    distance: 15.6,
    zone: 'extended',
    status: 'accepted'
  },
  {
    name: 'Christopher Hall',
    email: 'chall@email.com',
    phone: '(416) 555-0404',
    address: '585 Dundas St E, Toronto, ON',
    coordinates: { lat: 43.6595, lng: -79.3625 },
    propertySize: 4200,
    driveTime: 6,
    distance: 2.3,
    zone: 'standard',
    status: 'converted'
  }
];

async function generateSamplePricing() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create model
    const PricingCalculation = mongoose.models.PricingCalculation || 
      mongoose.model('PricingCalculation', pricingCalculationSchema);
    
    const businessId = new mongoose.Types.ObjectId('68979e9cdc69bf60a36742b4');
    const baseRate = 20; // $20 per 1000 sq ft
    const shopLocation = {
      address: '100 Queen St W, Toronto, ON M5H 2N1',
      lat: 43.6532,
      lng: -79.3832
    };
    
    console.log('\nGenerating sample pricing calculations...\n');
    
    for (const customer of sampleCustomers) {
      // Determine zone details and adjustment
      let zoneDetails, adjustmentValue;
      
      if (customer.zone === 'close') {
        zoneDetails = {
          name: 'Close Proximity - Quick Service',
          driveTimeThreshold: { min: 0, max: 5 },
          adjustmentType: 'percentage',
          adjustmentValue: -5,
          color: 'green'
        };
        adjustmentValue = -5;
      } else if (customer.zone === 'standard') {
        zoneDetails = {
          name: 'Standard Service Area',
          driveTimeThreshold: { min: 5, max: 20 },
          adjustmentType: 'percentage',
          adjustmentValue: 0,
          color: 'blue'
        };
        adjustmentValue = 0;
      } else {
        zoneDetails = {
          name: 'Extended Service Area',
          driveTimeThreshold: { min: 20, max: 999999 },
          adjustmentType: 'percentage',
          adjustmentValue: 10,
          color: 'red'
        };
        adjustmentValue = 10;
      }
      
      // Calculate pricing
      const basePrice = (customer.propertySize / 1000) * baseRate;
      const adjustmentAmount = basePrice * (adjustmentValue / 100);
      const finalPrice = basePrice + adjustmentAmount;
      
      // Generate random dates within last 30 days
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      // Create calculation record
      const calculation = await PricingCalculation.create({
        businessId,
        calculationId: `CALC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: customer.status,
        source: ['website', 'phone', 'email'][Math.floor(Math.random() * 3)],
        
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          coordinates: customer.coordinates,
          propertySize: customer.propertySize,
          propertyType: 'residential'
        },
        
        driveTimeCalculation: {
          result: {
            driveTimeMinutes: customer.driveTime,
            distanceKm: customer.distance,
            distanceText: `${customer.distance} km`,
            durationText: `${customer.driveTime} mins`,
            origin: shopLocation,
            destination: {
              address: customer.address,
              ...customer.coordinates
            },
            calculatedAt: createdAt,
            fromCache: Math.random() > 0.5
          },
          apiProvider: 'google',
          apiResponseTime: Math.floor(Math.random() * 500) + 100,
          fromCache: Math.random() > 0.5
        },
        
        zoneAssignment: {
          matchedZone: zoneDetails.name,
          zoneDetails,
          adjustmentType: 'percentage',
          adjustmentValue
        },
        
        pricing: {
          baseRatePer1000SqFt: baseRate,
          basePrice: parseFloat(basePrice.toFixed(2)),
          adjustment: {
            type: 'percentage',
            value: adjustmentValue,
            amount: parseFloat(adjustmentAmount.toFixed(2))
          },
          adjustedPrice: parseFloat(finalPrice.toFixed(2)),
          finalPrice: parseFloat(finalPrice.toFixed(2)),
          currency: 'CAD',
          breakdown: [
            {
              description: 'Base service charge',
              amount: parseFloat(basePrice.toFixed(2))
            },
            {
              description: `Zone adjustment (${adjustmentValue}%)`,
              amount: parseFloat(adjustmentAmount.toFixed(2))
            }
          ]
        },
        
        formattedOutput: {
          explanation: `Property at ${customer.address} is ${customer.driveTime} minutes from our service center, falling within our ${zoneDetails.name.toLowerCase()}.`,
          generatedBy: 'system',
          generatedAt: createdAt
        },
        
        performance: {
          totalProcessingTime: Math.floor(Math.random() * 1000) + 500,
          breakdownTimes: {
            configRetrieval: Math.floor(Math.random() * 100) + 20,
            geocoding: Math.floor(Math.random() * 500) + 200,
            driveTimeApi: Math.floor(Math.random() * 400) + 100,
            zoneMatching: Math.floor(Math.random() * 10) + 1,
            priceCalculation: Math.floor(Math.random() * 10) + 1,
            claudeFormatting: Math.floor(Math.random() * 50) + 10,
            databaseSave: Math.floor(Math.random() * 50) + 10
          }
        },
        
        followUp: customer.status === 'quoted' ? {
          contactAttempts: Math.floor(Math.random() * 3),
          nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        } : {},
        
        metadata: {
          utmSource: ['google', 'facebook', 'direct', 'referral'][Math.floor(Math.random() * 4)],
          utmMedium: ['cpc', 'organic', 'social', 'email'][Math.floor(Math.random() * 4)]
        },
        
        createdAt,
        updatedAt: createdAt
      });
      
      console.log(`✓ Created ${customer.status} calculation for ${customer.name} - ${customer.address}`);
      console.log(`  Zone: ${zoneDetails.name}, Price: $${finalPrice.toFixed(2)}`);
    }
    
    // Get summary statistics
    const stats = await PricingCalculation.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.finalPrice' },
          avgPrice: { $avg: '$pricing.finalPrice' },
          byStatus: {
            $push: {
              status: '$status',
              price: '$pricing.finalPrice'
            }
          }
        }
      }
    ]);
    
    console.log('\n========== Summary Statistics ==========');
    console.log(`Total Calculations: ${stats[0]?.total || 0}`);
    console.log(`Total Potential Revenue: $${stats[0]?.totalRevenue?.toFixed(2) || 0}`);
    console.log(`Average Price: $${stats[0]?.avgPrice?.toFixed(2) || 0}`);
    
    // Count by status
    const statusCounts = await PricingCalculation.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.finalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\nBreakdown by Status:');
    statusCounts.forEach(status => {
      console.log(`  ${status._id}: ${status.count} calculations ($${status.totalValue.toFixed(2)})`);
    });
    
    // Count by zone
    const zoneCounts = await PricingCalculation.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: '$zoneAssignment.matchedZone',
          count: { $sum: 1 },
          avgPrice: { $avg: '$pricing.finalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\nBreakdown by Zone:');
    zoneCounts.forEach(zone => {
      console.log(`  ${zone._id}: ${zone.count} calculations (avg: $${zone.avgPrice.toFixed(2)})`);
    });
    
    console.log('\n✅ Sample pricing data generation complete!');
    
  } catch (error) {
    console.error('Error generating sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

generateSamplePricing();