const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const PricingRule = require('./models/PricingRule').default;
const Business = require('./models/Business').default;

async function testPricingRules() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a business (use the first one found)
    const business = await Business.findOne();
    if (!business) {
      console.log('No business found. Please create a business first.');
      return;
    }
    console.log(`Testing with business: ${business.name}`);

    // Test creating rules of each type (except seasonal)
    const testRules = [
      {
        name: 'Test Zone Rule',
        type: 'zone',
        businessId: business._id,
        conditions: {
          zipCodes: ['90210', '10001']
        },
        pricing: {
          priceMultiplier: 1.2
        },
        priority: 10,
        isActive: true,
        description: 'Test zone-based pricing'
      },
      {
        name: 'Test Customer Rule',
        type: 'customer',
        businessId: business._id,
        conditions: {
          customerTags: ['vip', 'premium']
        },
        pricing: {
          priceMultiplier: 0.9
        },
        priority: 8,
        isActive: true,
        description: 'Test customer segment pricing'
      },
      {
        name: 'Test Service Rule',
        type: 'service',
        businessId: business._id,
        conditions: {
          serviceTypes: ['lawn', 'driveway']
        },
        pricing: {
          fixedPrices: {
            lawnPerSqFt: 0.025,
            drivewayPerSqFt: 0.035
          }
        },
        priority: 6,
        isActive: true,
        description: 'Test service-specific pricing'
      },
      {
        name: 'Test Volume Rule',
        type: 'volume',
        businessId: business._id,
        conditions: {
          minArea: 5000,
          maxArea: 10000
        },
        pricing: {
          priceMultiplier: 0.95
        },
        priority: 4,
        isActive: true,
        description: 'Test volume-based pricing'
      }
    ];

    console.log('\n--- Creating test rules ---');
    for (const ruleData of testRules) {
      try {
        const rule = new PricingRule(ruleData);
        await rule.save();
        console.log(`✓ Created ${ruleData.type} rule: ${ruleData.name}`);
      } catch (error) {
        console.error(`✗ Failed to create ${ruleData.type} rule: ${error.message}`);
      }
    }

    // Verify rules were created
    console.log('\n--- Verifying rules ---');
    const allRules = await PricingRule.find({ businessId: business._id });
    console.log(`Total rules found: ${allRules.length}`);
    
    const ruleTypes = {};
    allRules.forEach(rule => {
      ruleTypes[rule.type] = (ruleTypes[rule.type] || 0) + 1;
    });
    
    console.log('Rules by type:');
    Object.entries(ruleTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Check if any seasonal rules exist (they shouldn't)
    const seasonalRules = allRules.filter(r => r.type === 'seasonal');
    if (seasonalRules.length > 0) {
      console.warn(`⚠️ Found ${seasonalRules.length} seasonal rules - these should be removed or migrated`);
    } else {
      console.log('✓ No seasonal rules found (as expected)');
    }

    // Clean up test rules (optional)
    console.log('\n--- Cleaning up test rules ---');
    const cleanup = await PricingRule.deleteMany({
      businessId: business._id,
      name: { $regex: /^Test / }
    });
    console.log(`Deleted ${cleanup.deletedCount} test rules`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testPricingRules();