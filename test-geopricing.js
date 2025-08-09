/**
 * Test Script for Geopricing Feature
 * This script tests various Toronto addresses to verify zone pricing
 */

const fetch = require('node-fetch');
const colors = require('console-colors-even-when-not-a-tty');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = ''; // Add your auth token if needed

// Test addresses representing different zones
const TEST_ADDRESSES = [
  // Zone 1: Close Proximity (0-5 min) - 5% discount
  {
    name: 'CN Tower (Downtown Core)',
    location: {
      address: '290 Bremner Blvd, Toronto, ON',
      lat: 43.6426,
      lng: -79.3771,
      zipcode: 'M5V 3T3',
      city: 'Toronto'
    },
    expectedZone: 1,
    expectedAdjustment: -5
  },
  {
    name: 'Rogers Centre (Downtown)',
    location: {
      address: '1 Blue Jays Way, Toronto, ON',
      lat: 43.6414,
      lng: -79.3894,
      zipcode: 'M5V 1J1',
      city: 'Toronto'
    },
    expectedZone: 1,
    expectedAdjustment: -5
  },
  
  // Zone 2: Standard Service (5-20 min) - base pricing
  {
    name: 'Casa Loma (Midtown)',
    location: {
      address: '1 Austin Terrace, Toronto, ON',
      lat: 43.6780,
      lng: -79.4094,
      zipcode: 'M5R 1X8',
      city: 'Toronto'
    },
    expectedZone: 2,
    expectedAdjustment: 0
  },
  {
    name: 'High Park',
    location: {
      address: '1873 Bloor St W, Toronto, ON',
      lat: 43.6465,
      lng: -79.4637,
      zipcode: 'M6R 2Z3',
      city: 'Toronto'
    },
    expectedZone: 2,
    expectedAdjustment: 0
  },
  {
    name: 'The Beaches',
    location: {
      address: '2075 Queen St E, Toronto, ON',
      lat: 43.6689,
      lng: -79.2926,
      zipcode: 'M4E 2S2',
      city: 'Toronto'
    },
    expectedZone: 2,
    expectedAdjustment: 0
  },
  
  // Zone 3: Extended Service (20+ min) - 10% surcharge
  {
    name: 'Toronto Zoo (Scarborough)',
    location: {
      address: '2000 Meadowvale Rd, Scarborough, ON',
      lat: 43.8177,
      lng: -79.1859,
      zipcode: 'M1B 5K7',
      city: 'Toronto'
    },
    expectedZone: 3,
    expectedAdjustment: 10
  },
  {
    name: 'Pearson Airport Area',
    location: {
      address: '6301 Silver Dart Dr, Mississauga, ON',
      lat: 43.6772,
      lng: -79.6306,
      zipcode: 'L5P 1B2',
      city: 'Mississauga'
    },
    expectedZone: 3,
    expectedAdjustment: 10
  },
  {
    name: 'Scarborough Town Centre',
    location: {
      address: '300 Borough Dr, Scarborough, ON',
      lat: 43.7764,
      lng: -79.2573,
      zipcode: 'M1P 4P5',
      city: 'Toronto'
    },
    expectedZone: 3,
    expectedAdjustment: 10
  }
];

// Test services with different sizes
const TEST_SERVICES = [
  {
    name: 'Small Lawn (2,500 sqft)',
    services: [{
      name: 'Lawn Care',
      area: 2500,
      pricePerUnit: 0.02,
      totalPrice: 50
    }]
  },
  {
    name: 'Medium Lawn (5,000 sqft)',
    services: [{
      name: 'Lawn Care',
      area: 5000,
      pricePerUnit: 0.02,
      totalPrice: 100
    }]
  },
  {
    name: 'Large Property Bundle',
    services: [
      {
        name: 'Lawn Care',
        area: 8000,
        pricePerUnit: 0.02,
        totalPrice: 160
      },
      {
        name: 'Driveway Cleaning',
        area: 1000,
        pricePerUnit: 0.03,
        totalPrice: 30
      },
      {
        name: 'Sidewalk Maintenance',
        area: 500,
        pricePerUnit: 0.025,
        totalPrice: 12.50
      }
    ]
  }
];

// Helper function to test geopricing
async function testGeopricing(location, services) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/geopricing/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
      },
      body: JSON.stringify({
        location,
        services,
        date: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    return null;
  }
}

// Calculate expected prices
function calculateExpectedPrice(basePrice, adjustment) {
  return basePrice * (1 + adjustment / 100);
}

// Format currency
function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

// Main test function
async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan.bold('🧪 GEOPRICING TEST SUITE FOR TORONTO'));
  console.log('='.repeat(80));
  console.log(`\n📍 Testing ${TEST_ADDRESSES.length} locations with ${TEST_SERVICES.length} service configurations\n`);

  let testResults = [];
  let passedTests = 0;
  let failedTests = 0;

  // Test each address
  for (const testCase of TEST_ADDRESSES) {
    console.log('\n' + '-'.repeat(60));
    console.log(colors.yellow.bold(`📍 Testing: ${testCase.name}`));
    console.log(`   Address: ${testCase.location.address}`);
    console.log(`   Coordinates: ${testCase.location.lat}, ${testCase.location.lng}`);
    console.log(`   Expected Zone: ${testCase.expectedZone} (${testCase.expectedAdjustment >= 0 ? '+' : ''}${testCase.expectedAdjustment}%)`);
    console.log('-'.repeat(60));

    // Test with medium lawn (standard test)
    const mediumLawnService = TEST_SERVICES[1].services;
    const result = await testGeopricing(testCase.location, mediumLawnService);

    if (result && result.geopricing) {
      const appliedAdjustment = result.geopricing.finalAdjustment.value;
      const isCorrect = appliedAdjustment === testCase.expectedAdjustment;
      
      if (isCorrect) {
        console.log(colors.green('✅ PASS: Correct zone and pricing applied'));
        passedTests++;
      } else {
        console.log(colors.red(`❌ FAIL: Expected ${testCase.expectedAdjustment}%, got ${appliedAdjustment}%`));
        failedTests++;
      }

      // Show pricing details
      if (result.geopricing.applicableZones.length > 0) {
        const zone = result.geopricing.applicableZones[0];
        console.log(`   Zone Applied: ${zone.zoneName}`);
        console.log(`   Reason: ${zone.reason}`);
      }

      // Show metadata
      if (result.geopricing.metadata) {
        const meta = result.geopricing.metadata;
        if (meta.distanceFromBase) {
          console.log(`   Distance: ${meta.distanceFromBase.toFixed(1)} miles`);
        }
        if (meta.driveTimeMinutes) {
          console.log(`   Drive Time: ${meta.driveTimeMinutes} minutes`);
        }
      }

      // Show price comparison
      if (result.pricing && result.pricing.services) {
        console.log('\n   Price Breakdown:');
        result.pricing.services.forEach(service => {
          const basePrice = service.area * service.pricePerUnit;
          const finalPrice = service.totalPrice;
          const savings = basePrice - finalPrice;
          
          console.log(`   • ${service.name}:`);
          console.log(`     Base: ${formatCurrency(basePrice)}`);
          console.log(`     Final: ${formatCurrency(finalPrice)}`);
          
          if (savings > 0) {
            console.log(colors.green(`     Savings: ${formatCurrency(savings)}`));
          } else if (savings < 0) {
            console.log(colors.yellow(`     Surcharge: ${formatCurrency(Math.abs(savings))}`));
          }
        });
      }

      testResults.push({
        location: testCase.name,
        passed: isCorrect,
        expected: testCase.expectedAdjustment,
        actual: appliedAdjustment
      });
    } else {
      console.log(colors.red('❌ FAIL: No response from API'));
      failedTests++;
      testResults.push({
        location: testCase.name,
        passed: false,
        error: 'No API response'
      });
    }
  }

  // Summary Report
  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan.bold('📊 TEST SUMMARY'));
  console.log('='.repeat(80));
  
  const totalTests = passedTests + failedTests;
  const passRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(colors.green(`✅ Passed: ${passedTests}`));
  console.log(colors.red(`❌ Failed: ${failedTests}`));
  console.log(`Pass Rate: ${passRate}%`);
  
  // Detailed results table
  console.log('\n' + '-'.repeat(60));
  console.log('Location'.padEnd(30) + 'Expected'.padEnd(15) + 'Actual'.padEnd(15) + 'Result');
  console.log('-'.repeat(60));
  
  testResults.forEach(result => {
    const locationCol = result.location.substring(0, 29).padEnd(30);
    const expectedCol = (result.expected !== undefined ? `${result.expected >= 0 ? '+' : ''}${result.expected}%` : 'N/A').padEnd(15);
    const actualCol = (result.actual !== undefined ? `${result.actual >= 0 ? '+' : ''}${result.actual}%` : 'ERROR').padEnd(15);
    const resultCol = result.passed ? colors.green('✅ PASS') : colors.red('❌ FAIL');
    
    console.log(locationCol + expectedCol + actualCol + resultCol);
  });

  // Price comparison table
  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan.bold('💰 PRICE COMPARISON BY ZONE'));
  console.log('='.repeat(80));
  
  const serviceSizes = [
    { name: 'Small (2,500 sqft)', area: 2500, base: 50 },
    { name: 'Medium (5,000 sqft)', area: 5000, base: 100 },
    { name: 'Large (10,000 sqft)', area: 10000, base: 200 }
  ];
  
  console.log('\nService Size'.padEnd(25) + 'Zone 1 (-5%)'.padEnd(20) + 'Zone 2 (0%)'.padEnd(20) + 'Zone 3 (+10%)');
  console.log('-'.repeat(80));
  
  serviceSizes.forEach(size => {
    const zone1Price = calculateExpectedPrice(size.base, -5);
    const zone2Price = size.base;
    const zone3Price = calculateExpectedPrice(size.base, 10);
    
    console.log(
      size.name.padEnd(25) +
      colors.green(formatCurrency(zone1Price).padEnd(20)) +
      formatCurrency(zone2Price).padEnd(20) +
      colors.yellow(formatCurrency(zone3Price))
    );
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test suite completed!');
  console.log('='.repeat(80) + '\n');
}

// Interactive test mode
async function interactiveTest() {
  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan.bold('🎯 INTERACTIVE GEOPRICING TEST'));
  console.log('='.repeat(80));
  console.log('\nEnter a Toronto address to test pricing:\n');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Address: ', async (address) => {
    readline.question('Lawn size (sqft): ', async (size) => {
      const sqft = parseInt(size) || 5000;
      
      console.log('\n🔄 Calculating geopricing...\n');
      
      const result = await testGeopricing(
        { address, city: 'Toronto' },
        [{
          name: 'Lawn Care',
          area: sqft,
          pricePerUnit: 0.02,
          totalPrice: sqft * 0.02
        }]
      );

      if (result && result.geopricing) {
        console.log('📍 Location Analysis:');
        console.log(`   Address: ${address}`);
        
        if (result.geopricing.metadata.driveTimeMinutes) {
          console.log(`   Drive Time: ${result.geopricing.metadata.driveTimeMinutes} minutes`);
        }
        
        if (result.geopricing.applicableZones.length > 0) {
          const zone = result.geopricing.applicableZones[0];
          console.log(`   Zone: ${zone.zoneName}`);
          console.log(`   Adjustment: ${zone.adjustmentValue >= 0 ? '+' : ''}${zone.adjustmentValue}%`);
        }
        
        console.log('\n💰 Pricing:');
        const basePrice = sqft * 0.02;
        const finalPrice = result.pricing?.services[0]?.totalPrice || basePrice;
        console.log(`   Base Price: ${formatCurrency(basePrice)}`);
        console.log(`   Final Price: ${formatCurrency(finalPrice)}`);
        
        const difference = finalPrice - basePrice;
        if (difference < 0) {
          console.log(colors.green(`   You Save: ${formatCurrency(Math.abs(difference))}`));
        } else if (difference > 0) {
          console.log(colors.yellow(`   Travel Surcharge: ${formatCurrency(difference)}`));
        }
      } else {
        console.log(colors.red('❌ Unable to calculate pricing for this address'));
      }
      
      readline.close();
    });
  });
}

// Run tests based on command line argument
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveTest();
} else {
  runTests().catch(console.error);
}