async function testGeofencing(address, propertySize, description) {
  try {
    const response = await fetch('http://localhost:3000/api/geofencing/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerAddress: address,
        propertySize: propertySize
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✓ ${description}`);
      console.log(`  Address: ${data.customerAddress || address}`);
      console.log(`  Drive Time: ${data.driveTimeMinutes} minutes`);
      console.log(`  Zone: ${data.assignedZone ? data.assignedZone.zoneName : 'Out of service'}`);
      console.log(`  In Service Area: ${data.inServiceArea ? 'Yes' : 'No'}`);
      
      if (data.services) {
        console.log('  Services:');
        data.services.forEach(service => {
          const status = service.isAvailable ? '✓' : '✗';
          const price = service.isAvailable ? `$${service.totalPrice.toFixed(2)}` : 'N/A';
          console.log(`    ${status} ${service.serviceName}: ${price}`);
        });
      }
      console.log('');
    } else {
      console.log(`✗ ${description} - Error: ${data.error}`);
      console.log('');
    }
  } catch (error) {
    console.log(`✗ ${description} - Failed: ${error.message}`);
    console.log('');
  }
}

async function runTests() {
  console.log('========== Testing Geofencing System ==========\n');
  
  // Test with various Toronto addresses
  await testGeofencing(
    '200 Queen St W, Toronto, ON',
    5000,
    'Near address (should be Zone 1)'
  );
  
  await testGeofencing(
    '5100 Yonge St, North York, ON',
    5000,
    'Medium distance (should be Zone 2)'
  );
  
  await testGeofencing(
    '100 City Centre Dr, Mississauga, ON',
    5000,
    'Far address (might be out of service)'
  );
  
  console.log('========== Service Pricing Summary ==========');
  console.log('Zone 1 (0-10 min): Base rate, all services except Pest Control');
  console.log('Zone 2 (10-30 min): +15% surcharge, Mowing and Pest Control only');
  console.log('Out of Service (>30 min): No services available');
}

runTests();