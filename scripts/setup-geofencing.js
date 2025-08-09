const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schema inline
const geofencingConfigSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, required: true },
  
  shopLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true },
    name: { type: String, default: 'Main Shop' }
  },
  
  baseRatePer1000SqFt: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  minimumCharge: { type: Number, default: 50 },
  
  zones: [{
    zoneId: { type: String, required: true },
    zoneName: { type: String, required: true },
    minDriveTimeMinutes: { type: Number, required: true },
    maxDriveTimeMinutes: { type: Number },
    surchargePercentage: { type: Number, default: 0 },
    color: { type: String, default: '#000000' },
    description: { type: String, required: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  }],
  
  serviceRules: [{
    serviceName: { type: String, required: true },
    serviceType: { type: String, required: true },
    availableInZones: [{ type: String }],
    additionalFeePercentage: { type: Number, default: 0 },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  }],
  
  maxServiceDistanceMinutes: { type: Number, default: 30 },
  outOfServiceMessage: { type: String },
  contactSalesLink: { type: String },
  
  displaySettings: {
    showAllZones: { type: Boolean, default: true },
    highlightCustomerZone: { type: Boolean, default: true },
    availableServiceColor: { type: String, default: '#16a34a' },
    surchargeServiceColor: { type: String, default: '#eab308' },
    unavailableServiceColor: { type: String, default: '#9ca3af' }
  },
  
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  effectiveDate: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId
}, {
  timestamps: true
});

async function setupGeofencing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const GeofencingConfig = mongoose.models.GeofencingConfig || 
      mongoose.model('GeofencingConfig', geofencingConfigSchema);
    
    // Clear existing configs
    await GeofencingConfig.deleteMany({});
    console.log('Cleared existing geofencing configurations');
    
    // Get all businesses
    const businesses = await db.collection('businesses').find({}).toArray();
    console.log(`Found ${businesses.length} businesses`);
    
    // Define zones based on drive time
    const zones = [
      {
        zoneId: 'zone1',
        zoneName: 'Zone 1 - Primary Service Area',
        minDriveTimeMinutes: 0,
        maxDriveTimeMinutes: 10,
        surchargePercentage: 0, // Base rate
        color: '#16a34a', // Green
        description: 'Our primary service area with standard pricing',
        priority: 1,
        isActive: true
      },
      {
        zoneId: 'zone2',
        zoneName: 'Zone 2 - Extended Service Area',
        minDriveTimeMinutes: 10,
        maxDriveTimeMinutes: 60,  // Extended to 60 minutes
        surchargePercentage: 15, // 15% surcharge
        color: '#eab308', // Yellow
        description: 'Extended service area with distance surcharge',
        priority: 1,
        isActive: true
      }
    ];
    
    // Define service rules
    const serviceRules = [
      {
        serviceName: 'Lawn Mowing',
        serviceType: 'mowing',
        availableInZones: ['zone1', 'zone2'], // Available in all zones
        additionalFeePercentage: 0,
        description: 'Weekly or bi-weekly lawn mowing service',
        isActive: true
      },
      {
        serviceName: 'Fertilization',
        serviceType: 'fertilization',
        availableInZones: ['zone1'], // Only available in Zone 1
        additionalFeePercentage: 0,
        description: 'Professional lawn fertilization treatment',
        isActive: true
      },
      {
        serviceName: 'Pest Control',
        serviceType: 'pest_control',
        availableInZones: ['zone2'], // Only available in Zone 2
        additionalFeePercentage: 10, // Additional 10% fee after zone surcharge
        description: 'Comprehensive pest control service',
        isActive: true
      }
    ];
    
    // Shop locations (using different locations for variety)
    const shopLocations = [
      {
        // Toronto Downtown
        latitude: 43.6532,
        longitude: -79.3832,
        address: '100 Queen St W, Toronto, ON M5H 2N2',
        name: 'Toronto Main Shop'
      },
      {
        // Mississauga
        latitude: 43.5890,
        longitude: -79.6441,
        address: '201 City Centre Dr, Mississauga, ON L5B 2T4',
        name: 'Mississauga Shop'
      },
      {
        // New York
        latitude: 40.7128,
        longitude: -74.0060,
        address: '1 Liberty Plaza, New York, NY 10006',
        name: 'NYC Shop'
      }
    ];
    
    // Create configuration for each business
    let created = 0;
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      const shopLocation = shopLocations[i % shopLocations.length]; // Rotate through shop locations
      
      const config = await GeofencingConfig.create({
        businessId: business._id,
        shopLocation,
        baseRatePer1000SqFt: 25, // $25 per 1,000 sq ft base rate
        currency: 'USD',
        minimumCharge: 50,
        zones,
        serviceRules,
        maxServiceDistanceMinutes: 60,  // Extended to 60 minutes
        outOfServiceMessage: 'Sorry, your location is outside our service area (more than 60 minutes drive time). Please contact our sales team to discuss special arrangements.',
        contactSalesLink: '/contact-sales',
        displaySettings: {
          showAllZones: true,
          highlightCustomerZone: true,
          availableServiceColor: '#16a34a', // green
          surchargeServiceColor: '#eab308', // yellow
          unavailableServiceColor: '#9ca3af' // gray
        },
        isActive: true,
        effectiveDate: new Date(),
        createdBy: business._id
      });
      
      console.log(`✅ Created geofencing config for "${business.name}" with shop at ${shopLocation.name}`);
      created++;
    }
    
    console.log('\n========== Configuration Summary ==========');
    console.log('Base Rate: $25 per 1,000 sq ft');
    console.log('\nZones:');
    console.log('  • Zone 1: 0-10 min drive → Base rate');
    console.log('  • Zone 2: 10-60 min drive → +15% surcharge');
    console.log('  • Beyond 60 min → Out of service area');
    
    console.log('\nService Availability:');
    console.log('  • Lawn Mowing: Available in all zones');
    console.log('  • Fertilization: Zone 1 only');
    console.log('  • Pest Control: Zone 2 only (+10% service fee)');
    
    console.log('\n========== Example Pricing (5,000 sq ft property) ==========');
    const exampleSize = 5000;
    const baseTotal = (exampleSize / 1000) * 25;
    
    console.log('\nZone 1 Customer (5 min drive):');
    console.log(`  • Lawn Mowing: $${baseTotal.toFixed(2)} (base rate)`);
    console.log(`  • Fertilization: $${baseTotal.toFixed(2)} (available)`);
    console.log(`  • Pest Control: Not available in Zone 1`);
    
    const zone2Rate = 25 * 1.15; // 15% surcharge
    const zone2Base = (exampleSize / 1000) * zone2Rate;
    const pestControlRate = zone2Base * 1.10; // Additional 10% for pest control
    
    console.log('\nZone 2 Customer (20 min drive):');
    console.log(`  • Lawn Mowing: $${zone2Base.toFixed(2)} (+15% zone surcharge)`);
    console.log(`  • Fertilization: Not available in Zone 2`);
    console.log(`  • Pest Control: $${pestControlRate.toFixed(2)} (+15% zone + 10% service)`);
    
    console.log('\nOut of Service (35 min drive):');
    console.log('  • No services available - contact sales');
    
    console.log('\n✅ All businesses now have geofencing configurations!');
    
  } catch (error) {
    console.error('Error setting up geofencing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

setupGeofencing();