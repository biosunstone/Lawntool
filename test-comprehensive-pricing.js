async function testPricing(zipCode, description) {
  try {
    const response = await fetch('http://localhost:3000/api/zipcode-pricing/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zipCode: zipCode,
        propertySize: 5000
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.pricing) {
      const adjustment = data.pricing.adjustment;
      const adjustmentText = adjustment.value < 0 
        ? `Discount: -$${Math.abs(adjustment.value)}` 
        : adjustment.value > 0 
        ? `Surcharge: +$${adjustment.value}`
        : 'Base rate';
      
      console.log(`✓ ${zipCode} (${description})`);
      console.log(`  Adjustment: ${adjustmentText} - ${adjustment.description}`);
      console.log(`  Total: $${data.pricing.totalPrice} for 5,000 sq ft`);
      console.log('');
    } else if (data.success && !data.inServiceArea) {
      console.log(`✗ ${zipCode} (${description}) - Not in service area`);
      console.log('');
    } else {
      console.log(`✗ ${zipCode} (${description}) - Error: ${data.error}`);
      console.log('');
    }
  } catch (error) {
    console.log(`✗ ${zipCode} - Failed to connect: ${error.message}`);
  }
}

async function runTests() {
  console.log('========== Testing Comprehensive ZIP/Postal Code Coverage ==========\n');
  
  console.log('US ZIP CODES:\n');
  // Test specific overrides
  await testPricing('10001', 'Manhattan NYC - specific override');
  await testPricing('90210', 'Beverly Hills - specific override');
  
  // Test region-based rules
  await testPricing('02108', 'Boston - New England region');
  await testPricing('75234', 'Dallas TX - Texas urban region');
  await testPricing('85001', 'Phoenix AZ - Southwest region');
  await testPricing('99801', 'Juneau AK - specific override');
  await testPricing('45678', 'Ohio - Great Lakes region');
  await testPricing('94102', 'San Francisco - California urban');
  
  console.log('\nCANADIAN POSTAL CODES:\n');
  // Test specific overrides
  await testPricing('M5V3A8', 'Toronto Financial - specific override');
  await testPricing('H3A2M4', 'Montreal Downtown - specific override');
  await testPricing('V6C2X8', 'Vancouver Downtown - specific override');
  
  // Test region-based rules
  await testPricing('M4K1N2', 'Toronto East - Toronto region');
  await testPricing('K1A0B1', 'Ottawa - Eastern Ontario');
  await testPricing('S7K0J5', 'Saskatoon - Saskatchewan');
  await testPricing('X0A0H0', 'NWT - Territories');
  await testPricing('B3H4R2', 'Halifax - Nova Scotia');
  await testPricing('T2P2M5', 'Calgary Downtown - specific override');
  
  console.log('\nRANDOM TEST CODES:\n');
  // Test random codes to verify default rule
  await testPricing('12345', 'Random US ZIP');
  await testPricing('L5B2C9', 'Mississauga - Central Ontario');
  await testPricing('G1V3V9', 'Quebec City - Eastern Quebec');
}

runTests();
