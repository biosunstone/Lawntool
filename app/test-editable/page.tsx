'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import EditableMeasurements from '@/components/EditableMeasurements'
import PropertyOverlayMap from '@/components/PropertyOverlayMap'
import { PropertyMeasurements } from '@/components/MeasurementResults'

export default function TestEditablePage() {
  const [measurements, setMeasurements] = useState<PropertyMeasurements>({
    address: '123 Test Street, Toronto, ON',
    coordinates: { lat: 43.6532, lng: -79.3832 },
    totalArea: 8500,
    perimeter: 370,
    lawn: {
      frontYard: 1200,
      backYard: 3000,
      sideYard: 800,
      total: 5000,
      perimeter: 290
    },
    driveway: 800,
    sidewalk: 200,
    building: 2000,
    other: 500
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Editable Measurements</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <EditableMeasurements 
              measurements={measurements} 
              onUpdate={setMeasurements}
            />
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Property Visualization</h2>
            <PropertyOverlayMap measurements={measurements} />
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Measurements (Debug)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(measurements, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}