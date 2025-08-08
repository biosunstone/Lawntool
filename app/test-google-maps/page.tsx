'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import WorkingPropertyMap from '@/components/WorkingPropertyMap'
import { useJsApiLoader } from '@react-google-maps/api'

export default function TestGoogleMapsPage() {
  const [showMap, setShowMap] = useState(false)
  
  // This hook is already being called in GoogleMapsProvider, 
  // but we'll use it here to check the loading status
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'drawing', 'geometry'],
  })

  const testLocation = { lat: 40.7128, lng: -74.0060 } // New York City

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Google Maps Test Page</h1>
      
      <div className="space-y-4 mb-8">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Status Check:</h2>
          <ul className="space-y-1">
            <li>API Key Present: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Yes' : '❌ No'}</li>
            <li>Google Maps Loaded: {isLoaded ? '✅ Yes' : '❌ No'}</li>
            <li>Load Error: {loadError ? `❌ ${loadError.message}` : '✅ None'}</li>
          </ul>
        </div>
        
        <button
          onClick={() => setShowMap(!showMap)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {showMap && isLoaded && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Map (New York City)</h2>
          <WorkingPropertyMap 
            center={testLocation}
            address="New York, NY, USA"
          />
        </div>
      )}
      
      {showMap && !isLoaded && (
        <div className="bg-yellow-100 p-4 rounded">
          <p>Loading Google Maps...</p>
        </div>
      )}
      
      {loadError && (
        <div className="bg-red-100 p-4 rounded mt-4">
          <p className="text-red-600">Error loading Google Maps: {loadError.message}</p>
          <p className="text-sm mt-2">Please check:</p>
          <ul className="list-disc list-inside text-sm">
            <li>API key is valid</li>
            <li>API key has Maps JavaScript API enabled</li>
            <li>Billing is enabled on the Google Cloud project</li>
            <li>Domain restrictions (if any) include localhost and your production domain</li>
          </ul>
        </div>
      )}
    </div>
  )
}