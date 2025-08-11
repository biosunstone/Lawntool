'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const PrecisionMeasurementMap = dynamic(
  () => import('@/components/PrecisionMeasurementMap'),
  { ssr: false }
)

export default function TestPrecisionPage() {
  const [measurement, setMeasurement] = useState<any>(null)
  
  // Test address with known coordinates
  const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA'
  const testCoordinates = { lat: 37.4224764, lng: -122.0842499 }
  
  const handleMeasurementComplete = (measurement: any) => {
    console.log('Measurement completed:', measurement)
    setMeasurement(measurement)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Precision Measurement Test
        </h1>
        <p className="text-gray-600 mb-8">
          Testing the new precision measurement system with Google Earth integration
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Property</h2>
          <p className="text-gray-700">
            <strong>Address:</strong> {testAddress}
          </p>
          <p className="text-gray-700">
            <strong>Coordinates:</strong> {testCoordinates.lat}, {testCoordinates.lng}
          </p>
        </div>
        
        <PrecisionMeasurementMap
          address={testAddress}
          coordinates={testCoordinates}
          onMeasurementComplete={handleMeasurementComplete}
        />
        
        {measurement && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Measurement Results</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(measurement, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}