'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { WOODBINE_PROPERTY } from '@/lib/measurement/GoogleEarthPropertyData'
import { CheckCircle, XCircle, Info } from 'lucide-react'

// Dynamic imports for map components
const GoogleEarthMap = dynamic(() => import('@/components/GoogleEarthMap'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading Map...</div>
})

const GoogleEarthSimpleMap = dynamic(() => import('@/components/GoogleEarthSimpleMap'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading Map...</div>
})

export default function TestMeasurementAccuracy() {
  const [measurement1, setMeasurement1] = useState<any>(null)
  const [measurement2, setMeasurement2] = useState<any>(null)
  const [activeMap, setActiveMap] = useState<'both' | 'map1' | 'map2'>('both')
  
  // Calculate accuracy
  const calculateAccuracy = (actual: number, expected: number) => {
    return 100 - Math.abs((actual - expected) / expected * 100)
  }
  
  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy >= 99) return { icon: CheckCircle, color: 'text-green-600', status: 'Excellent' }
    if (accuracy >= 98) return { icon: CheckCircle, color: 'text-green-500', status: 'Pass' }
    if (accuracy >= 95) return { icon: Info, color: 'text-yellow-600', status: 'Good' }
    return { icon: XCircle, color: 'text-red-600', status: 'Needs Adjustment' }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold">Google Earth Measurement Accuracy Test</h1>
          <p className="text-gray-600 mt-1">
            Testing property at: {WOODBINE_PROPERTY.address}
          </p>
        </div>
      </div>
      
      {/* Expected Values */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="px-6 py-3">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold text-blue-900">Expected (Google Earth):</span>
            <span>Perimeter: <strong>{WOODBINE_PROPERTY.expected.perimeter.feet} ft</strong></span>
            <span>Area: <strong>{WOODBINE_PROPERTY.expected.area.squareFeet.toLocaleString()} sq ft</strong></span>
            <span>Acres: <strong>{WOODBINE_PROPERTY.expected.area.acres}</strong></span>
          </div>
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="px-6 py-3 bg-white border-b">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveMap('both')}
            className={`px-4 py-2 rounded ${activeMap === 'both' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setActiveMap('map1')}
            className={`px-4 py-2 rounded ${activeMap === 'map1' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            GoogleEarthMap Only
          </button>
          <button
            onClick={() => setActiveMap('map2')}
            className={`px-4 py-2 rounded ${activeMap === 'map2' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            GoogleEarthSimpleMap Only
          </button>
        </div>
      </div>
      
      {/* Maps Container */}
      <div className="flex-1 flex">
        {/* GoogleEarthMap */}
        {(activeMap === 'both' || activeMap === 'map1') && (
          <div className={`${activeMap === 'both' ? 'w-1/2' : 'w-full'} border-r`}>
            <div className="h-16 bg-gray-100 px-4 py-2 border-b">
              <h3 className="font-semibold">GoogleEarthMap Component</h3>
              {measurement1 && (
                <div className="flex gap-4 text-sm mt-1">
                  <span>Perimeter: {measurement1.perimeter.feet.toFixed(2)} ft</span>
                  <span>Area: {measurement1.area.squareFeet.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>
            <div className="h-[600px]">
              <GoogleEarthMap
                center={WOODBINE_PROPERTY.center}
                address={WOODBINE_PROPERTY.address}
                onMeasurementComplete={setMeasurement1}
              />
            </div>
          </div>
        )}
        
        {/* GoogleEarthSimpleMap */}
        {(activeMap === 'both' || activeMap === 'map2') && (
          <div className={`${activeMap === 'both' ? 'w-1/2' : 'w-full'}`}>
            <div className="h-16 bg-gray-100 px-4 py-2 border-b">
              <h3 className="font-semibold">GoogleEarthSimpleMap Component</h3>
              {measurement2 && (
                <div className="flex gap-4 text-sm mt-1">
                  <span>Perimeter: {measurement2.perimeter.feet.toFixed(2)} ft</span>
                  <span>Area: {measurement2.area.squareFeet.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>
            <div className="h-[600px]">
              <GoogleEarthSimpleMap
                center={WOODBINE_PROPERTY.center}
                address={WOODBINE_PROPERTY.address}
                onMeasurementComplete={setMeasurement2}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Results Table */}
      <div className="bg-white border-t">
        <div className="px-6 py-4">
          <h3 className="font-semibold mb-3">Measurement Results</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Component</th>
                <th className="text-center py-2">Perimeter (ft)</th>
                <th className="text-center py-2">Accuracy</th>
                <th className="text-center py-2">Area (sq ft)</th>
                <th className="text-center py-2">Accuracy</th>
                <th className="text-center py-2">Overall Status</th>
              </tr>
            </thead>
            <tbody>
              {/* GoogleEarthMap Results */}
              {measurement1 && (
                <tr className="border-b">
                  <td className="py-2 font-medium">GoogleEarthMap</td>
                  <td className="text-center py-2">{measurement1.perimeter.feet.toFixed(2)}</td>
                  <td className="text-center py-2">
                    {(() => {
                      const accuracy = calculateAccuracy(measurement1.perimeter.feet, WOODBINE_PROPERTY.expected.perimeter.feet)
                      const status = getAccuracyStatus(accuracy)
                      const Icon = status.icon
                      return (
                        <span className={`flex items-center justify-center gap-1 ${status.color}`}>
                          <Icon className="w-4 h-4" />
                          {accuracy.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </td>
                  <td className="text-center py-2">{measurement1.area.squareFeet.toLocaleString()}</td>
                  <td className="text-center py-2">
                    {(() => {
                      const accuracy = calculateAccuracy(measurement1.area.squareFeet, WOODBINE_PROPERTY.expected.area.squareFeet)
                      const status = getAccuracyStatus(accuracy)
                      const Icon = status.icon
                      return (
                        <span className={`flex items-center justify-center gap-1 ${status.color}`}>
                          <Icon className="w-4 h-4" />
                          {accuracy.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </td>
                  <td className="text-center py-2">
                    {(() => {
                      const perimeterAcc = calculateAccuracy(measurement1.perimeter.feet, WOODBINE_PROPERTY.expected.perimeter.feet)
                      const areaAcc = calculateAccuracy(measurement1.area.squareFeet, WOODBINE_PROPERTY.expected.area.squareFeet)
                      const avgAcc = (perimeterAcc + areaAcc) / 2
                      const status = getAccuracyStatus(avgAcc)
                      const Icon = status.icon
                      return (
                        <span className={`flex items-center justify-center gap-1 ${status.color}`}>
                          <Icon className="w-4 h-4" />
                          {status.status}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              )}
              
              {/* GoogleEarthSimpleMap Results */}
              {measurement2 && (
                <tr className="border-b">
                  <td className="py-2 font-medium">GoogleEarthSimpleMap</td>
                  <td className="text-center py-2">{measurement2.perimeter.feet.toFixed(2)}</td>
                  <td className="text-center py-2">
                    {(() => {
                      const accuracy = calculateAccuracy(measurement2.perimeter.feet, WOODBINE_PROPERTY.expected.perimeter.feet)
                      const status = getAccuracyStatus(accuracy)
                      const Icon = status.icon
                      return (
                        <span className={`flex items-center justify-center gap-1 ${status.color}`}>
                          <Icon className="w-4 h-4" />
                          {accuracy.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </td>
                  <td className="text-center py-2">{measurement2.area.squareFeet.toLocaleString()}</td>
                  <td className="text-center py-2">
                    {(() => {
                      const accuracy = calculateAccuracy(measurement2.area.squareFeet, WOODBINE_PROPERTY.expected.area.squareFeet)
                      const status = getAccuracyStatus(accuracy)
                      const Icon = status.icon
                      return (
                        <span className={`flex items-center justify-center gap-1 ${status.color}`}>
                          <Icon className="w-4 h-4" />
                          {accuracy.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </td>
                  <td className="text-center py-2">
                    {(() => {
                      const perimeterAcc = calculateAccuracy(measurement2.perimeter.feet, WOODBINE_PROPERTY.expected.perimeter.feet)
                      const areaAcc = calculateAccuracy(measurement2.area.squareFeet, WOODBINE_PROPERTY.expected.area.squareFeet)
                      const avgAcc = (perimeterAcc + areaAcc) / 2
                      const status = getAccuracyStatus(avgAcc)
                      const Icon = status.icon
                      return (
                        <span className={`flex items-center justify-center gap-1 ${status.color}`}>
                          <Icon className="w-4 h-4" />
                          {status.status}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              )}
              
              {/* Expected Values Row */}
              <tr className="bg-blue-50">
                <td className="py-2 font-medium">Expected (Google Earth)</td>
                <td className="text-center py-2 font-semibold">{WOODBINE_PROPERTY.expected.perimeter.feet}</td>
                <td className="text-center py-2">-</td>
                <td className="text-center py-2 font-semibold">{WOODBINE_PROPERTY.expected.area.squareFeet.toLocaleString()}</td>
                <td className="text-center py-2">-</td>
                <td className="text-center py-2 font-semibold">Target</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-gray-100 border-t px-6 py-4">
        <h3 className="font-semibold mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click the "Load test property" button (📍) in either map to load the Woodbine Avenue property</li>
          <li>Or click the ruler icon (📏) to manually draw a polygon around the property</li>
          <li>The measurements will automatically update and show accuracy compared to Google Earth</li>
          <li>Green checkmarks indicate measurements within 2% of Google Earth values</li>
          <li>Both map components should produce identical, accurate results</li>
        </ol>
      </div>
    </div>
  )
}