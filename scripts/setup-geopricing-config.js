const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schemas inline since we can't import TypeScript models
const geopricingConfigSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, required: true },
  version: { type: Number, default: 1 },
  effectiveDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true },
  
  pricing: {
    baseRatePer1000SqFt: { type: Number, required: true },
    currency: { type: String, default: 'CAD' },
    minimumCharge: { type: Number, default: 50 },
    serviceRates: mongoose.Schema.Types.Mixed
  },
  
  shopLocation: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    city: String,
    province: String,
    country: { type: String, default: 'Canada' },
    postalCode: String
  },
  
  zones: {
    close: {
      name: String,
      driveTimeThreshold: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 5 }
      },
      adjustmentType: { type: String, default: 'percentage' },
      adjustmentValue: { type: Number, default: -5 },
      description: String,
      color: String
    },
    standard: {
      name: String,
      driveTimeThreshold: {
        min: { type: Number, default: 5 },
        max: { type: Number, default: 20 }
      },
      adjustmentType: { type: String, default: 'percentage' },
      adjustmentValue: { type: Number, default: 0 },
      description: String,
      color: String
    },
    extended: {
      name: String,
      driveTimeThreshold: {
        min: { type: Number, default: 20 },
        max: { type: Number, default: 999999 }
      },
      adjustmentType: { type: String, default: 'percentage' },
      adjustmentValue: { type: Number, default: 10 },
      description: String,
      color: String
    }
  },
  
  apiSettings: {
    trafficModel: { type: String, default: 'best_guess' },
    avoidHighways: { type: Boolean, default: false },
    avoidTolls: { type: Boolean, default: false },
    cacheDuration: { type: Number, default: 15 }
  },
  
  businessRules: {
    allowManualOverride: { type: Boolean, default: true },
    requireApprovalAboveThreshold: Number,
    autoExpireQuotesAfterDays: { type: Number, default: 30 },
    roundPriceTo: { type: Number, default: 0.01 },
    includeTrafficInCalculation: { type: Boolean, default: true }
  },
  
  createdBy: mongoose.Schema.Types.ObjectId,
  lastModifiedBy: mongoose.Schema.Types.ObjectId
}, {
  timestamps: true
});

async function setupGeopricingConfig() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create model
    const GeopricingConfig = mongoose.models.GeopricingConfig || 
      mongoose.model('GeopricingConfig', geopricingConfigSchema);
    
    // Use the specific business ID from the previous setup
    const businessId = new mongoose.Types.ObjectId('68979e9cdc69bf60a36742b4');
    
    // Check if config already exists
    const existingConfig = await GeopricingConfig.findOne({ 
      businessId,
      isActive: true 
    });
    
    if (existingConfig) {
      console.log('Active configuration already exists for this business');
      process.exit(0);
    }
    
    // Create new configuration
    const config = await GeopricingConfig.create({
      businessId,
      version: 1,
      effectiveDate: new Date(),
      isActive: true,
      createdBy: businessId, // Use businessId as createdBy for now
      
      pricing: {
        baseRatePer1000SqFt: 20,
        currency: 'CAD',
        minimumCharge: 50
      },
      
      shopLocation: {
        address: '100 Queen St W, Toronto, ON M5H 2N1',
        coordinates: {
          lat: 43.6532,
          lng: -79.3832
        },
        city: 'Toronto',
        province: 'ON',
        country: 'Canada',
        postalCode: 'M5H 2N1'
      },
      
      zones: {
        close: {
          name: 'Close Proximity - Quick Service',
          driveTimeThreshold: { min: 0, max: 5 },
          adjustmentType: 'percentage',
          adjustmentValue: -5,
          description: 'Locations within 5 minutes drive time receive a 5% discount',
          color: 'green'
        },
        standard: {
          name: 'Standard Service Area',
          driveTimeThreshold: { min: 5, max: 20 },
          adjustmentType: 'percentage',
          adjustmentValue: 0,
          description: 'Standard pricing for locations 5-20 minutes away',
          color: 'blue'
        },
        extended: {
          name: 'Extended Service Area',
          driveTimeThreshold: { min: 20, max: 999999 },
          adjustmentType: 'percentage',
          adjustmentValue: 10,
          description: 'Locations over 20 minutes away incur a 10% surcharge',
          color: 'red'
        }
      },
      
      apiSettings: {
        trafficModel: 'best_guess',
        avoidHighways: false,
        avoidTolls: false,
        cacheDuration: 15
      },
      
      businessRules: {
        allowManualOverride: true,
        requireApprovalAboveThreshold: 500,
        autoExpireQuotesAfterDays: 30,
        roundPriceTo: 0.01,
        includeTrafficInCalculation: true
      }
    });
    
    console.log('✅ Geopricing configuration created successfully!');
    console.log('Configuration ID:', config._id);
    console.log('Business ID:', businessId);
    console.log('\nZone Configuration:');
    console.log('- Close (0-5 min): -5% discount');
    console.log('- Standard (5-20 min): Base rate');
    console.log('- Extended (20+ min): +10% surcharge');
    console.log('\nBase rate: $20 per 1,000 sq ft');
    console.log('Shop location: Toronto, ON');
    
  } catch (error) {
    console.error('Error setting up configuration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

setupGeopricingConfig();