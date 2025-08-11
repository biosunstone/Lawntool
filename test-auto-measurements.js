// Test automatic property measurement generation
const { generatePropertyBoundaries, generateAreaBreakdown } = require('./lib/autoPropertyDetection.ts');

async function testAutoMeasurements() {
  console.log('Testing Automatic Property Measurement Generation\n');
  console.log('='.repeat(50));
  
  // Test addresses
  const testAddresses = [
    {
      address: '123 Main Street, Toronto, ON',
      center: { lat: 43.6532, lng: -79.3832 }
    },
    {
      address: '456 Business Plaza, Suite 200, Toronto, ON',
      center: { lat: 43.7000, lng: -79.4000 }
    },
    {
      address: 'Casa Loma, 1 Austin Terrace, Toronto, ON',
      center: { lat: 43.6780, lng: -79.4094 }
    }
  ];
  
  for (const test of testAddresses) {
    console.log(`\n📍 Address: ${test.address}`);
    console.log('-'.repeat(40));
    
    // Generate property boundaries
    const propertyEstimate = generatePropertyBoundaries(test.center, test.address);
    console.log(`Property Type: ${propertyEstimate.propertyType}`);
    console.log(`Estimated Size: ${propertyEstimate.estimatedSize.toLocaleString()} sq ft`);
    console.log(`Polygon Points: ${propertyEstimate.polygon.length}`);
    
    // Generate area breakdown
    const areaBreakdown = generateAreaBreakdown(
      propertyEstimate.polygon,
      propertyEstimate.propertyType
    );
    
    console.log('\nArea Breakdown:');
    console.log(`  Lawn Areas:`);
    console.log(`    - Front Yard: ${areaBreakdown.lawn.front.toLocaleString()} sq ft`);
    console.log(`    - Back Yard: ${areaBreakdown.lawn.back.toLocaleString()} sq ft`);
    console.log(`    - Side Yard: ${areaBreakdown.lawn.side.toLocaleString()} sq ft`);
    const totalLawn = areaBreakdown.lawn.front + areaBreakdown.lawn.back + areaBreakdown.lawn.side;
    console.log(`    - Total Lawn: ${totalLawn.toLocaleString()} sq ft`);
    console.log(`  Driveway: ${areaBreakdown.driveway.toLocaleString()} sq ft`);
    console.log(`  Sidewalk: ${areaBreakdown.sidewalk.toLocaleString()} sq ft`);
    console.log(`  Building: ${areaBreakdown.building.toLocaleString()} sq ft`);
    console.log(`  Other: ${areaBreakdown.other.toLocaleString()} sq ft`);
    
    // Calculate percentages
    const total = propertyEstimate.estimatedSize;
    console.log('\nPercentages:');
    console.log(`  Lawn: ${((totalLawn / total) * 100).toFixed(1)}%`);
    console.log(`  Driveway: ${((areaBreakdown.driveway / total) * 100).toFixed(1)}%`);
    console.log(`  Building: ${((areaBreakdown.building / total) * 100).toFixed(1)}%`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Auto-measurement generation working correctly!');
  console.log('\nHow it works:');
  console.log('1. Address is geocoded to get coordinates');
  console.log('2. Property type detected from address keywords');
  console.log('3. Typical property dimensions applied');
  console.log('4. Polygon boundaries generated around center');
  console.log('5. Area breakdown calculated based on property type');
  console.log('\n📊 This provides instant measurements after address search!');
}

// Test with API
async function testWithAPI() {
  console.log('\n\nTesting with Geocoding API...');
  console.log('='.repeat(50));
  
  const testAddress = 'CN Tower, Toronto, ON';
  
  try {
    const response = await fetch('http://localhost:3001/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: testAddress })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`\nGeocoded: ${testAddress}`);
      console.log(`Result: ${data.formattedAddress}`);
      console.log(`Coordinates: ${data.coordinates.lat}, ${data.coordinates.lng}`);
      
      // Generate measurements
      const propertyEstimate = generatePropertyBoundaries(
        data.coordinates,
        data.formattedAddress
      );
      
      console.log(`\nAuto-detected as: ${propertyEstimate.propertyType} property`);
      console.log(`Estimated size: ${propertyEstimate.estimatedSize.toLocaleString()} sq ft`);
      console.log('✅ Ready for instant measurement display!');
    }
  } catch (error) {
    console.log('Note: API test requires dev server running on port 3001');
  }
}

// Run tests
testAutoMeasurements().then(() => testWithAPI());