'use client'

export const dynamic = 'force-dynamic'

import { GoogleMap } from '@react-google-maps/api'

const containerStyle = {
  width: '100%',
  height: '400px'
}

const center = {
  lat: 40.7128,
  lng: -74.0060
}

export default function TestMapsMinimalPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Minimal Google Maps Test</h1>
      <p className="mb-4">This is the simplest possible Google Maps implementation.</p>
      
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={10}
        >
          {/* No markers or other components - just the map */}
        </GoogleMap>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>If you see a map above, Google Maps is working correctly.</p>
        <p>If not, check the browser console for errors.</p>
      </div>
    </div>
  )
}