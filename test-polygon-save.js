// Test polygon save endpoint
// Use native fetch in Node.js 18+

async function testPolygonSave() {
  console.log('Testing polygon save endpoint...\n')
  
  const testData = {
    businessId: 'test-business-123',
    propertyAddress: '123 Test Street, Toronto, ON',
    geometries: [
      {
        id: 'test-geo-1',
        name: 'Test Perimeter',
        type: 'lot_perimeter',
        coordinates: [
          { lat: 43.6532, lng: -79.3832 },
          { lat: 43.6533, lng: -79.3832 },
          { lat: 43.6533, lng: -79.3831 },
          { lat: 43.6532, lng: -79.3831 },
          { lat: 43.6532, lng: -79.3832 }
        ],
        linearFeet: 150,
        color: '#22c55e',
        visible: true,
        locked: false
      }
    ],
    exclusionZones: [],
    type: 'mosquito'
  }
  
  try {
    console.log('Sending POST request to /api/admin/polygons...')
    console.log('Request body:', JSON.stringify(testData, null, 2))
    
    const response = await fetch('http://localhost:3000/api/admin/polygons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Simulate a session - in production this would come from NextAuth
        'Cookie': 'next-auth.session-token=test-session'
      },
      body: JSON.stringify(testData)
    })
    
    const responseText = await response.text()
    console.log('\nResponse status:', response.status)
    console.log('Response headers:', response.headers.raw())
    
    try {
      const data = JSON.parse(responseText)
      console.log('\nResponse data:', JSON.stringify(data, null, 2))
      
      if (response.ok) {
        console.log('\n✅ Success! Polygon saved with ID:', data.polygon?.id)
      } else {
        console.log('\n❌ Error:', data.error)
        if (data.details) {
          console.log('Details:', data.details)
        }
      }
    } catch (parseError) {
      console.log('\nRaw response:', responseText)
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message)
  }
}

// Run the test
testPolygonSave()