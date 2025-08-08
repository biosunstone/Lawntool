/**
 * Test script to verify quote number generation fix
 * This script simulates concurrent quote creation to test for duplicate key errors
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import the generator
const generateQuoteNumber = require('./lib/saas/quoteNumberGenerator').default;

async function testQuoteGeneration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test business ID (you can change this to a real business ID from your database)
    const testBusinessId = '6500000000000000deadbeef';
    
    console.log('\n=== Testing Sequential Generation ===');
    // Test sequential generation
    for (let i = 0; i < 5; i++) {
      const quoteNumber = await generateQuoteNumber(testBusinessId);
      console.log(`Generated quote number ${i + 1}: ${quoteNumber}`);
    }

    console.log('\n=== Testing Concurrent Generation ===');
    // Test concurrent generation (simulates multiple requests at once)
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        generateQuoteNumber(testBusinessId).then(num => {
          console.log(`Concurrent quote ${i + 1}: ${num}`);
          return num;
        })
      );
    }

    const results = await Promise.all(promises);
    
    // Check for duplicates
    const uniqueResults = [...new Set(results)];
    if (results.length === uniqueResults.length) {
      console.log('\n✅ SUCCESS: All quote numbers are unique!');
      console.log(`Generated ${results.length} unique quote numbers`);
    } else {
      console.log('\n❌ ERROR: Duplicate quote numbers detected!');
      console.log(`Total: ${results.length}, Unique: ${uniqueResults.length}`);
    }

    // Display all generated numbers for verification
    console.log('\nAll generated quote numbers:');
    results.forEach((num, idx) => {
      console.log(`  ${idx + 1}. ${num}`);
    });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
console.log('Starting quote number generation test...');
testQuoteGeneration();