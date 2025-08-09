const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schema inline
const zipCodePricingSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, required: true },
  baseRatePer1000SqFt: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  minimumCharge: { type: Number, default: 50 },
  
  // Default rules for codes not explicitly listed
  defaultRule: {
    adjustmentType: { type: String, default: 'fixed' },
    adjustmentValue: { type: Number, default: 0 },
    description: { type: String, default: 'Standard service area' }
  },
  
  // Service all ZIP/postal codes by default
  serviceAllCodes: { type: Boolean, default: true },
  
  // Specific overrides for certain codes/regions
  serviceZipCodes: [{
    zipCode: { type: String, required: true },
    adjustmentType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    adjustmentValue: { type: Number, required: true },
    description: { type: String, required: true },
    routeDensity: { type: String, enum: ['high', 'medium', 'low'] },
    isActive: { type: Boolean, default: true }
  }],
  
  // Region-based rules for broader coverage
  regionRules: [{
    pattern: { type: String, required: true }, // Regex pattern for matching
    name: { type: String, required: true },
    adjustmentType: { type: String, default: 'fixed' },
    adjustmentValue: { type: Number, required: true },
    description: { type: String, required: true },
    priority: { type: Number, default: 0 }, // Higher priority rules override lower ones
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

async function setupComprehensivePricing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const ZipCodePricing = mongoose.models.ZipCodePricing || 
      mongoose.model('ZipCodePricing', zipCodePricingSchema);
    
    // Clear existing configs
    await ZipCodePricing.deleteMany({});
    console.log('Cleared existing configurations');
    
    // Get all businesses
    const businesses = await db.collection('businesses').find({}).toArray();
    console.log(`Found ${businesses.length} businesses`);
    
    // Region-based rules for US ZIP codes (by first 3 digits)
    const usRegionRules = [
      // Northeast US (0-3)
      { pattern: '^0[0-3]\\d{2}', name: 'New England', adjustmentValue: 5, description: 'New England states - moderate surcharge', priority: 1 },
      { pattern: '^0[4-9]\\d{2}', name: 'Mid-Atlantic', adjustmentValue: 0, description: 'Mid-Atlantic region - standard pricing', priority: 1 },
      { pattern: '^1\\d{3}', name: 'New York/Pennsylvania', adjustmentValue: -2, description: 'NY/PA urban areas - slight discount', priority: 1 },
      { pattern: '^2\\d{3}', name: 'DC/Maryland/Virginia', adjustmentValue: 0, description: 'DMV area - standard pricing', priority: 1 },
      { pattern: '^3\\d{3}', name: 'Southeast', adjustmentValue: -3, description: 'Southeast states - route density discount', priority: 1 },
      
      // Midwest US (4-6)
      { pattern: '^4\\d{3}', name: 'Great Lakes', adjustmentValue: 0, description: 'Great Lakes region - standard pricing', priority: 1 },
      { pattern: '^5\\d{3}', name: 'Upper Midwest', adjustmentValue: 2, description: 'Upper Midwest - slight surcharge', priority: 1 },
      { pattern: '^6\\d{3}', name: 'Central Plains', adjustmentValue: 5, description: 'Central Plains - rural surcharge', priority: 1 },
      
      // South/Southwest US (7-8)
      { pattern: '^7[0-4]\\d{2}', name: 'Louisiana/Arkansas', adjustmentValue: 3, description: 'LA/AR area - moderate surcharge', priority: 1 },
      { pattern: '^7[5-9]\\d{2}', name: 'Texas Urban', adjustmentValue: -5, description: 'Texas cities - high density discount', priority: 1 },
      { pattern: '^8[0-4]\\d{2}', name: 'Mountain West', adjustmentValue: 8, description: 'Mountain states - distance surcharge', priority: 1 },
      { pattern: '^8[5-9]\\d{2}', name: 'Southwest', adjustmentValue: 5, description: 'Southwest region - moderate surcharge', priority: 1 },
      
      // West Coast US (9)
      { pattern: '^9[0-4]\\d{2}', name: 'California Urban', adjustmentValue: -5, description: 'California cities - high density discount', priority: 1 },
      { pattern: '^9[5-9]\\d{2}', name: 'Pacific Northwest', adjustmentValue: 0, description: 'Pacific NW - standard pricing', priority: 1 }
    ];
    
    // Canadian postal code rules (by first letter - Forward Sortation Area)
    const canadianRegionRules = [
      // Atlantic Canada
      { pattern: '^A', name: 'Newfoundland', adjustmentValue: 15, description: 'Newfoundland - remote location surcharge', priority: 1 },
      { pattern: '^B', name: 'Nova Scotia', adjustmentValue: 10, description: 'Nova Scotia - maritime surcharge', priority: 1 },
      { pattern: '^C', name: 'PEI', adjustmentValue: 12, description: 'Prince Edward Island - island surcharge', priority: 1 },
      { pattern: '^E', name: 'New Brunswick', adjustmentValue: 8, description: 'New Brunswick - moderate surcharge', priority: 1 },
      
      // Quebec
      { pattern: '^G', name: 'Eastern Quebec', adjustmentValue: 5, description: 'Eastern Quebec - moderate surcharge', priority: 1 },
      { pattern: '^H', name: 'Montreal', adjustmentValue: -5, description: 'Montreal metro - high density discount', priority: 1 },
      { pattern: '^J', name: 'Western Quebec', adjustmentValue: 3, description: 'Western Quebec - slight surcharge', priority: 1 },
      
      // Ontario
      { pattern: '^K', name: 'Eastern Ontario', adjustmentValue: 2, description: 'Eastern Ontario - slight surcharge', priority: 1 },
      { pattern: '^L', name: 'Central Ontario', adjustmentValue: 0, description: 'Central Ontario - standard pricing', priority: 1 },
      { pattern: '^M', name: 'Toronto', adjustmentValue: -5, description: 'Toronto GTA - high density discount', priority: 1 },
      { pattern: '^N', name: 'Southwestern Ontario', adjustmentValue: -2, description: 'SW Ontario - route density discount', priority: 1 },
      { pattern: '^P', name: 'Northern Ontario', adjustmentValue: 10, description: 'Northern Ontario - remote surcharge', priority: 1 },
      
      // Prairie Provinces
      { pattern: '^R', name: 'Manitoba', adjustmentValue: 5, description: 'Manitoba - prairie surcharge', priority: 1 },
      { pattern: '^S', name: 'Saskatchewan', adjustmentValue: 8, description: 'Saskatchewan - rural surcharge', priority: 1 },
      { pattern: '^T', name: 'Alberta', adjustmentValue: 3, description: 'Alberta - moderate surcharge', priority: 1 },
      
      // British Columbia
      { pattern: '^V', name: 'British Columbia', adjustmentValue: 0, description: 'British Columbia - standard pricing', priority: 1 },
      
      // Territories
      { pattern: '^X0A', name: 'Northwest Territories', adjustmentValue: 25, description: 'NWT - extreme remote surcharge', priority: 2 },
      { pattern: '^X0B', name: 'Nunavut', adjustmentValue: 30, description: 'Nunavut - extreme remote surcharge', priority: 2 },
      { pattern: '^X0C', name: 'Northwest Territories', adjustmentValue: 25, description: 'NWT - extreme remote surcharge', priority: 2 },
      { pattern: '^X0E', name: 'Northwest Territories', adjustmentValue: 25, description: 'NWT - extreme remote surcharge', priority: 2 },
      { pattern: '^X1A', name: 'Yellowknife', adjustmentValue: 20, description: 'Yellowknife - territorial capital', priority: 2 },
      { pattern: '^Y', name: 'Yukon', adjustmentValue: 20, description: 'Yukon - territorial surcharge', priority: 1 }
    ];
    
    // Specific high-priority overrides for major cities
    const specificOverrides = [
      // US Major Cities - Better rates
      { zipCode: '10001', adjustmentValue: -8, description: 'Manhattan NYC - premium discount' },
      { zipCode: '90210', adjustmentValue: -7, description: 'Beverly Hills - premium area' },
      { zipCode: '60601', adjustmentValue: -6, description: 'Chicago Downtown - high density' },
      { zipCode: '02108', adjustmentValue: -5, description: 'Boston Downtown - urban discount' },
      { zipCode: '94102', adjustmentValue: -7, description: 'San Francisco - premium market' },
      
      // Canadian Major Cities - Better rates
      { zipCode: 'M5V3A8', adjustmentValue: -10, description: 'Toronto Financial District - premium' },
      { zipCode: 'M4Y1N9', adjustmentValue: -8, description: 'Toronto Downtown - high density' },
      { zipCode: 'H3A2M4', adjustmentValue: -8, description: 'Montreal Downtown - urban center' },
      { zipCode: 'V6C2X8', adjustmentValue: -7, description: 'Vancouver Downtown - premium area' },
      { zipCode: 'T2P2M5', adjustmentValue: -5, description: 'Calgary Downtown - business district' },
      
      // Remote/Difficult areas - Higher rates
      { zipCode: '99801', adjustmentValue: 35, description: 'Alaska - extreme remote location' },
      { zipCode: '96701', adjustmentValue: 30, description: 'Hawaii - island surcharge' }
    ];
    
    // Create configuration for each business
    let created = 0;
    for (const business of businesses) {
      const config = await ZipCodePricing.create({
        businessId: business._id,
        baseRatePer1000SqFt: 25,
        currency: 'USD',
        minimumCharge: 50,
        
        // Enable service for all codes by default
        serviceAllCodes: true,
        
        // Default rule for codes not matching any pattern
        defaultRule: {
          adjustmentType: 'fixed',
          adjustmentValue: 0,
          description: 'Standard service area pricing'
        },
        
        // Region-based rules
        regionRules: [
          ...usRegionRules.map(rule => ({
            pattern: rule.pattern,
            name: rule.name,
            adjustmentType: 'fixed',
            adjustmentValue: rule.adjustmentValue,
            description: rule.description,
            priority: rule.priority,
            isActive: true
          })),
          ...canadianRegionRules.map(rule => ({
            pattern: rule.pattern,
            name: rule.name,
            adjustmentType: 'fixed',
            adjustmentValue: rule.adjustmentValue,
            description: rule.description,
            priority: rule.priority,
            isActive: true
          }))
        ],
        
        // Specific overrides
        serviceZipCodes: specificOverrides.map(override => ({
          zipCode: override.zipCode.toUpperCase().replace(/\s+/g, ''),
          adjustmentType: 'fixed',
          adjustmentValue: override.adjustmentValue,
          description: override.description,
          routeDensity: override.adjustmentValue < 0 ? 'high' : 'low',
          isActive: true
        })),
        
        noServiceMessage: 'We currently service all US ZIP codes and Canadian postal codes. Please contact us if you have any questions.',
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
        createdBy: business._id
      });
      
      console.log(`✅ Created comprehensive pricing config for "${business.name}"`);
      created++;
    }
    
    console.log('\n========== Configuration Summary ==========');
    console.log('Base Rate: $25 per 1,000 sq ft');
    console.log('Coverage: ALL US ZIP codes and Canadian postal codes');
    console.log(`US Region Rules: ${usRegionRules.length}`);
    console.log(`Canadian Region Rules: ${canadianRegionRules.length}`);
    console.log(`Specific City Overrides: ${specificOverrides.length}`);
    
    console.log('\n========== Example Pricing (5,000 sq ft) ==========');
    console.log('US Examples:');
    console.log('  • ZIP 10001 (Manhattan): $85 (-$8 premium discount)');
    console.log('  • ZIP 75001 (Texas): $100 (-$5 urban discount)');
    console.log('  • ZIP 85001 (Arizona): $150 (+$5 regional surcharge)');
    console.log('  • ZIP 99801 (Alaska): $300 (+$35 remote surcharge)');
    
    console.log('\nCanadian Examples:');
    console.log('  • M5V 3A8 (Toronto Financial): $75 (-$10 premium discount)');
    console.log('  • H3A 2M4 (Montreal Downtown): $85 (-$8 urban discount)');
    console.log('  • S7K 0J5 (Saskatchewan): $165 (+$8 rural surcharge)');
    console.log('  • X0A 0H0 (NWT): $250 (+$25 extreme remote)');
    
    console.log('\n✅ All businesses now have comprehensive ZIP/postal code coverage!');
    
  } catch (error) {
    console.error('Error setting up comprehensive pricing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

setupComprehensivePricing();