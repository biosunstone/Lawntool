'use client'

import dynamic from 'next/dynamic'

const WorkingPropertyMap = dynamic(() => import('@/components/WorkingPropertyMap'), { 
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-100 animate-pulse rounded-lg" />
})

export default function MapTestPage() {
  const testLocation = { lat: 40.7128, lng: -74.0060 } // NYC
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Map Component Test</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm">
          <strong>Test Location:</strong> New York City<br />
          <strong>Coordinates:</strong> {testLocation.lat}, {testLocation.lng}<br />
          <strong>Expected:</strong> Satellite view with red property boundary, brown building, and green lawn
        </p>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <WorkingPropertyMap 
          center={testLocation} 
          address="Test Location, NYC"
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>If the map doesn't appear:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Check browser console for errors (F12)</li>
          <li>Verify Google Maps API is loading</li>
          <li>Ensure GoogleMapsProvider is wrapping the app</li>
        </ul>
      </div>
    </div>
  )
}