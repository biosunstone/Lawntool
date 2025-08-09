const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schema inline
const zipCodePricingSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, required: true },
  baseRatePer1000SqFt: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  minimumCharge: { type: Number, default: 50 },
  
  serviceZipCodes: [{
    zipCode: { type: String, required: true },
    adjustmentType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    adjustmentValue: { type: Number, required: true },
    description: { type: String, required: true },
    routeDensity: { type: String, enum: ['high', 'medium', 'low'] },
    isActive: { type: Boolean, default: true }
  }],
  
  noServiceMessage: { type: String },
  contactSalesLink: { type: String },
  
  displaySettings: {
    showAllZones: { type: Boolean, default: true },
    highlightCustomerZone: { type: Boolean, default: true },
    discountColor: { type: String, default: '#16a34a' },
    surchargeColor: { type: String, default: '#dc2626' },
    baseRateColor: { type: String, default: '#000000' }
  },
  
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  effectiveDate: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId
}, {
  timestamps: true
});

async function setupZipCodePricing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const ZipCodePricing = mongoose.models.ZipCodePricing || 
      mongoose.model('ZipCodePricing', zipCodePricingSchema);
    
    // Get all businesses
    const businesses = await db.collection('businesses').find({}).toArray();
    console.log(`Found ${businesses.length} businesses`);
    
    // Sample ZIP codes and Canadian postal codes with different pricing rules
    const sampleZipCodes = [
      // US ZIP CODES
      // Base rate zones (no adjustment)
      {
        zipCode: '12345',
        adjustmentType: 'fixed',
        adjustmentValue: 0,
        description: 'Standard service area with base pricing',
        routeDensity: 'medium',
        isActive: true
      },
      {
        zipCode: '12350',
        adjustmentType: 'fixed',
        adjustmentValue: 0,
        description: 'Standard service area with base pricing',
        routeDensity: 'medium',
        isActive: true
      },
      
      // CANADIAN POSTAL CODES
      // Toronto area codes
      {
        zipCode: 'M5H2N1',  // Downtown Toronto (no spaces)
        adjustmentType: 'fixed',
        adjustmentValue: 0,
        description: 'Downtown Toronto - Standard pricing',
        routeDensity: 'high',
        isActive: true
      },
      {
        zipCode: 'M4V1L4',  // Rosedale
        adjustmentType: 'fixed',
        adjustmentValue: -5,
        description: 'Premium neighborhood with route density',
        routeDensity: 'high',
        isActive: true
      },
      {
        zipCode: 'M6P2T3',  // West Toronto
        adjustmentType: 'fixed',
        adjustmentValue: 0,
        description: 'West Toronto - Standard pricing',
        routeDensity: 'medium',
        isActive: true
      },
      {
        zipCode: 'L4L5H1',  // Woodbridge
        adjustmentType: 'fixed',
        adjustmentValue: 5,
        description: 'Suburban area with additional travel',
        routeDensity: 'low',
        isActive: true
      },
      {
        zipCode: 'L6A1B2',  // Maple
        adjustmentType: 'percentage',
        adjustmentValue: 10,
        description: 'Extended service area north of Toronto',
        routeDensity: 'low',
        isActive: true
      },
      
      // Discount zones (clustering incentive)
      {
        zipCode: '12347',
        adjustmentType: 'fixed',
        adjustmentValue: -5,
        description: 'High-density route with clustering incentive',
        routeDensity: 'high',
        isActive: true
      },
      {
        zipCode: '12348',
        adjustmentType: 'fixed',
        adjustmentValue: -5,
        description: 'High-density route with clustering incentive',
        routeDensity: 'high',
        isActive: true
      },
      {
        zipCode: '12349',
        adjustmentType: 'percentage',
        adjustmentValue: -10,
        description: 'Premium route with volume discount',
        routeDensity: 'high',
        isActive: true
      },
      
      // Surcharge zones (low density)
      {
        zipCode: '12346',
        adjustmentType: 'fixed',
        adjustmentValue: 5,
        description: 'Low route density zone',
        routeDensity: 'low',
        isActive: true
      },
      {
        zipCode: '12351',
        adjustmentType: 'fixed',
        adjustmentValue: 10,
        description: 'Remote area with additional travel',
        routeDensity: 'low',
        isActive: true
      },
      {
        zipCode: '12352',
        adjustmentType: 'percentage',
        adjustmentValue: 15,
        description: 'Extended service area',
        routeDensity: 'low',
        isActive: true
      },
      
      // Mixed adjustment zones
      {
        zipCode: '12353',
        adjustmentType: 'fixed',
        adjustmentValue: -3,
        description: 'Slight discount for nearby clusters',
        routeDensity: 'medium',
        isActive: true
      },
      {
        zipCode: '12354',
        adjustmentType: 'fixed',
        adjustmentValue: 7,
        description: 'Moderate surcharge for distant locations',
        routeDensity: 'low',
        isActive: true
      }
    ];
    
    // Create configuration for each business
    let created = 0;
    for (const business of businesses) {
      // Check if config already exists
      const existingConfig = await ZipCodePricing.findOne({ 
        businessId: business._id,
        isActive: true 
      });
      
      if (existingConfig) {
        console.log(`✓ Business "${business.name}" already has ZIP code pricing config`);
        continue;
      }
      
      const config = await ZipCodePricing.create({
        businessId: business._id,
        baseRatePer1000SqFt: 25, // $25 per 1,000 sq ft base rate
        currency: 'USD',
        minimumCharge: 50,
        serviceZipCodes: sampleZipCodes,
        noServiceMessage: 'Sorry, we do not currently service this ZIP code. Please contact our sales team for more information.',
        contactSalesLink: '/contact-sales',
        displaySettings: {
          showAllZones: true,
          highlightCustomerZone: true,
          discountColor: '#16a34a',
          surchargeColor: '#dc2626',
          baseRateColor: '#000000'
        },
        isActive: true,
        effectiveDate: new Date(),
        createdBy: business._id // Use businessId as createdBy
      });
      
      console.log(`✅ Created ZIP code pricing config for "${business.name}"`);
      created++;
    }
    
    console.log('\n========== Configuration Summary ==========');
    console.log(`Base Rate: $25 per 1,000 sq ft`);
    console.log(`Service ZIP Codes: ${sampleZipCodes.length}`);
    console.log('\nZIP Code Rules:');
    console.log('  Standard (Base Rate): 12345, 12350');
    console.log('  Discounts:');
    console.log('    • 12347, 12348: -$5 (clustering incentive)');
    console.log('    • 12349: -10% (volume discount)');
    console.log('    • 12353: -$3 (nearby clusters)');
    console.log('  Surcharges:');
    console.log('    • 12346: +$5 (low density)');
    console.log('    • 12351: +$10 (remote area)');
    console.log('    • 12352: +15% (extended service)');
    console.log('    • 12354: +$7 (distant location)');
    
    console.log('\n========== Summary ==========');
    console.log(`Total businesses: ${businesses.length}`);
    console.log(`Newly configured: ${created}`);
    console.log('\nAll businesses now have ZIP code pricing configurations!');
    
    // Display example calculations
    console.log('\n========== Example Calculations (5,000 sq ft property) ==========');
    const exampleSize = 5000;
    const baseTotal = (exampleSize / 1000) * 25;
    
    console.log(`ZIP 12345 (Base): $${baseTotal.toFixed(2)}`);
    console.log(`ZIP 12347 (Clustering): $${((exampleSize / 1000) * 20).toFixed(2)} (-$5/1000 sqft discount)`);
    console.log(`ZIP 12346 (Low Density): $${((exampleSize / 1000) * 30).toFixed(2)} (+$5/1000 sqft surcharge)`);
    console.log(`ZIP 12349 (Volume): $${(baseTotal * 0.9).toFixed(2)} (-10% discount)`);
    console.log(`ZIP 12352 (Extended): $${(baseTotal * 1.15).toFixed(2)} (+15% surcharge)`);
    
  } catch (error) {
    console.error('Error setting up ZIP code pricing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

setupZipCodePricing();