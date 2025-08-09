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
  console.log('========== Testing Extended Zone 2 (10-60 minutes) ==========\n');
  
  // Zone 1: 0-10 minutes
  await testGeofencing(
    '200 Queen St W, Toronto, ON',
    5000,
    'Zone 1 (0-10 min) - Downtown Toronto'
  );
  
  // Zone 2: 10-60 minutes - various distances
  await testGeofencing(
    '2075 Bayview Ave, Toronto, ON',
    5000,
    'Zone 2 (15-20 min) - North Toronto'
  );
  
  await testGeofencing(
    '5100 Yonge St, North York, ON',
    5000,
    'Zone 2 (35-40 min) - North York'
  );
  
  await testGeofencing(
    '100 City Centre Dr, Mississauga, ON',
    5000,
    'Zone 2 (50-55 min) - Mississauga'
  );
  
  // Out of Service: >60 minutes
  await testGeofencing(
    'Hamilton, ON, Canada',
    5000,
    'Out of Service (>60 min) - Hamilton'
  );
  
  await testGeofencing(
    'Niagara Falls, ON, Canada',
    5000,
    'Out of Service (>60 min) - Niagara Falls'
  );
  
  console.log('========== Updated Zone Configuration ==========');
  console.log('Zone 1 (0-10 min): Base rate $25/1000 sq ft');
  console.log('  • Lawn Mowing: Available');
  console.log('  • Fertilization: Available');
  console.log('  • Pest Control: Not available');
  console.log('');
  console.log('Zone 2 (10-60 min): +15% surcharge = $28.75/1000 sq ft');
  console.log('  • Lawn Mowing: Available (+15%)');
  console.log('  • Fertilization: Not available');
  console.log('  • Pest Control: Available (+15% zone + 10% service = +26.5% total)');
  console.log('');
  console.log('Out of Service (>60 min): No services available');
}

runTests();