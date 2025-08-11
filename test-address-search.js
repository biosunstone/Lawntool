// Test script for address search functionality

async function testAddressSearch() {
  console.log('Testing Address Search Functionality...\n');
  
  // Test addresses
  const testAddresses = [
    'CN Tower, Toronto, ON',
    '1 Yonge Street, Toronto, ON',
    '100 Queen Street West, Toronto, ON',
    'Casa Loma, Toronto, ON'
  ];
  
  for (const address of testAddresses) {
    console.log(`Testing: "${address}"`);
    
    try {
      const response = await fetch('http://localhost:3001/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success:');
        console.log(`   Formatted: ${data.formattedAddress}`);
        console.log(`   Coordinates: ${data.coordinates.lat}, ${data.coordinates.lng}`);
      } else {
        console.log('❌ Failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('');
  }
  
  // Test the page
  console.log('Testing /test-drone-view page...');
  try {
    const pageResponse = await fetch('http://localhost:3001/test-drone-view');
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      
      const features = [
        { text: 'Search Address', found: false },
        { text: 'Enter property address', found: false },
        { text: 'Property Selector & Search', found: false }
      ];
      
      features.forEach(feature => {
        feature.found = html.includes(feature.text);
        console.log(`${feature.found ? '✅' : '❌'} ${feature.text}`);
      });
      
      const allFound = features.every(f => f.found);
      if (allFound) {
        console.log('\n✨ Address search feature successfully integrated!');
      }
    }
  } catch (error) {
    console.log('❌ Page test error:', error.message);
  }
  
  console.log('\n📍 Instructions:');
  console.log('1. Visit http://localhost:3001/test-drone-view');
  console.log('2. Click "Search Address" button in header');
  console.log('3. Enter any address and click Search');
  console.log('4. Map will center on the searched location');
  console.log('5. Use the ruler tool to draw property boundaries');
}

// Run the test
testAddressSearch();