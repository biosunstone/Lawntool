'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

// Dynamic import to prevent SSR issues
const GoogleEarthHDMap = dynamic(() => import('@/components/GoogleEarthHDMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading high-definition map...</p>
      </div>
    </div>
  )
})

const GoogleEarthMap = dynamic(() => import('@/components/GoogleEarthMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  )
})

// Test properties with different zoom levels
const TEST_PROPERTIES = [
  {
    name: 'Woodbine Property (Default)',
    address: '12072 Woodbine Avenue, Gormley, ON L0H 1G0',
    center: { lat: 43.862394, lng: -79.361531 },
    zoom: 20 // Matching screenshot zoom level
  },
  {
    name: 'Test Property 2',
    address: '123 Main Street, Toronto, ON',
    center: { lat: 43.6532, lng: -79.3832 },
    zoom: 20
  },
  {
    name: 'Large Property',
    address: '456 Oak Avenue, Mississauga, ON',
    center: { lat: 43.5890, lng: -79.6441 },
    zoom: 19 // Slightly zoomed out for larger property
  }
]

export default function TestGoogleEarthHD() {
  const [selectedProperty, setSelectedProperty] = useState(TEST_PROPERTIES[0])
  const [measurementData, setMeasurementData] = useState<any>(null)
  const [mapVersion, setMapVersion] = useState<'hd' | 'standard'>('hd')

  const handleMeasurementComplete = (data: any) => {
    setMeasurementData(data)
    console.log('Measurement completed:', data)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Google Earth HD Test</h1>
              <p className="text-sm text-gray-600 mt-1">
                High-definition satellite imagery with zoom level optimized to match Google Earth
              </p>
            </div>
            
            {/* Map version toggle */}
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMapVersion('hd')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mapVersion === 'hd' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  HD Map
                </button>
                <button
                  onClick={() => setMapVersion('standard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mapVersion === 'standard' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Standard Map
                </button>
              </div>
            </div>
          </div>
          
          {/* Property selector */}
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Test Property:</label>
            <select
              value={selectedProperty.name}
              onChange={(e) => {
                const property = TEST_PROPERTIES.find(p => p.name === e.target.value)
                if (property) setSelectedProperty(property)
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TEST_PROPERTIES.map((property) => (
                <option key={property.name} value={property.name}>
                  {property.name}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              Zoom Level: <span className="font-mono font-bold">{selectedProperty.zoom}</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex">
        {/* Map container */}
        <div className="flex-1 relative">
          {mapVersion === 'hd' ? (
            <GoogleEarthHDMap
              center={selectedProperty.center}
              address={selectedProperty.address}
              initialZoom={selectedProperty.zoom}
              onMeasurementComplete={handleMeasurementComplete}
            />
          ) : (
            <GoogleEarthMap
              center={selectedProperty.center}
              address={selectedProperty.address}
              onMeasurementComplete={handleMeasurementComplete}
            />
          )}
        </div>
        
        {/* Side panel */}
        <div className="w-96 bg-white border-l shadow-lg overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Map Information</h2>
            
            {/* Current property info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Property</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Address:</span>
                  <div className="font-medium text-gray-900">{selectedProperty.address}</div>
                </div>
                <div>
                  <span className="text-gray-600">Coordinates:</span>
                  <div className="font-mono text-xs text-gray-700">
                    {selectedProperty.center.lat.toFixed(6)}, {selectedProperty.center.lng.toFixed(6)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Zoom Level:</span>
                  <span className="ml-2 font-mono font-bold text-gray-900">{selectedProperty.zoom}</span>
                </div>
              </div>
            </div>
            
            {/* HD Map Features */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">HD Map Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Zoom level 20 - matches Google Earth screenshot</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>High-resolution satellite imagery (512px tiles)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>2x resolution scale for crisp details</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Tighter property bounds for focused view</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Optimized for single property measurement</span>
                </li>
              </ul>
            </div>
            
            {/* Measurement data */}
            {measurementData && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Last Measurement</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">Area</div>
                      <div className="font-semibold text-gray-900">
                        {measurementData.area?.formatted || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {measurementData.area?.squareFeet?.toLocaleString()} ft² 
                        {measurementData.area?.acres > 0.01 && ` (${measurementData.area.acres.toFixed(3)} acres)`}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Perimeter</div>
                      <div className="font-semibold text-gray-900">
                        {measurementData.perimeter?.formatted || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {measurementData.perimeter?.feet?.toFixed(2)} ft
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div className="mt-6 border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">How to Use</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li>1. Select a test property from the dropdown</li>
                <li>2. Click the ruler icon to start measuring</li>
                <li>3. Click on the map to add measurement points</li>
                <li>4. Click the checkmark to complete the measurement</li>
                <li>5. Compare HD vs Standard map quality</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}