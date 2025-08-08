'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'

export default function ApiTest() {
  const [testResult, setTestResult] = useState<string>('')
  
  const testGoogleMapsApi = async () => {
    const apiKey = 'AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4'
    const testUrl = `https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=15&size=400x300&key=${apiKey}`
    
    try {
      const response = await fetch(testUrl)
      setTestResult(`API Response: ${response.status} ${response.statusText}`)
    } catch (error) {
      setTestResult(`Error: ${error}`)
    }
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Google Maps API Test</h1>
      
      <button 
        onClick={testGoogleMapsApi}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Test API
      </button>
      
      {testResult && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <pre>{testResult}</pre>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Test Image 1: New York</h2>
          <img 
            src="https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=15&size=600x400&maptype=satellite&key=AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4"
            alt="NYC Map"
            className="border"
            onLoad={() => console.log('NYC map loaded')}
            onError={() => console.log('NYC map failed')}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Test Image 2: Toronto</h2>
          <img 
            src="https://maps.googleapis.com/maps/api/staticmap?center=43.6532,-79.3832&zoom=19&size=600x400&maptype=satellite&markers=color:red%7C43.6532,-79.3832&key=AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4"
            alt="Toronto Map"
            className="border"
            onLoad={() => console.log('Toronto map loaded')}
            onError={() => console.log('Toronto map failed')}
          />
        </div>
      </div>
    </div>
  )
}