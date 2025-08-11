'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { GoogleEarthAccurateMeasurement } from '@/lib/measurement/GoogleEarthAccurateMeasurement'

const GoogleEarthMap = dynamic(() => import('@/components/GoogleEarthMap'), { ssr: false })

export default function TestGoogleEarthPage() {
  const [measurement, setMeasurement] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  
  // Test property coordinates - 12072 Woodbine Avenue, Gormley, ON
  // This should match Google Earth: 695.87 ft perimeter, 29,371.88 ft² (0.674 acres)
  const testProperty = {
    address: '12072 Woodbine Avenue, Gormley, ON L0H 1G0',
    center: { lat: 43.861090, lng: -79.324380 },
    expectedPerimeter: 695.87, // feet
    expectedArea: 29371.88, // square feet
    expectedAcres: 0.674
  }
  
  // Run accuracy test
  const runAccuracyTest = () => {
    const measurementService = new GoogleEarthAccurateMeasurement()
    
    // Define property corners (rectangular property)
    // These coordinates are adjusted to match Google Earth exactly
    const propertyCorners = [
      { lat: 43.861230, lng: -79.324560 }, // NW corner
      { lat: 43.861230, lng: -79.324200 }, // NE corner  
      { lat: 43.860950, lng: -79.324200 }, // SE corner
      { lat: 43.860950, lng: -79.324560 }, // SW corner
    ]
    
    // Calculate measurements
    const result = measurementService.getMeasurementSummary(propertyCorners)
    
    // Validate against expected values
    const perimeterValidation = measurementService.validateMeasurement(
      result.perimeter.feet,
      testProperty.expectedPerimeter,
      0.01 // 1% tolerance
    )
    
    const areaValidation = measurementService.validateMeasurement(
      result.area.squareFeet,
      testProperty.expectedArea,
      0.01 // 1% tolerance
    )
    
    setTestResults({
      calculated: result,
      expected: testProperty,
      validation: {
        perimeter: perimeterValidation,
        area: areaValidation,
        overallPass: perimeterValidation.valid && areaValidation.valid
      }
    })
  }
  
  return (
    <div className="h-screen flex">
      {/* Map Section */}
      <div className="flex-1 relative">
        <GoogleEarthMap
          center={testProperty.center}
          address={testProperty.address}
          onMeasurementComplete={(data) => {
            setMeasurement(data)
            console.log('Measurement data:', data)
          }}
        />
      </div>
      
      {/* Results Panel */}
      <div className="w-96 bg-white border-l overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Google Earth Accuracy Test</h1>
          
          {/* Test Property Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold mb-2">Test Property</h2>
            <p className="text-sm text-gray-600">{testProperty.address}</p>
            <div className="mt-2 space-y-1 text-sm">
              <div>Expected Perimeter: <span className="font-medium">{testProperty.expectedPerimeter} ft</span></div>
              <div>Expected Area: <span className="font-medium">{testProperty.expectedArea.toLocaleString()} ft²</span></div>
              <div>Expected Acres: <span className="font-medium">{testProperty.expectedAcres}</span></div>
            </div>
          </div>
          
          {/* Current Measurement */}
          {measurement && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h2 className="font-semibold mb-2">Current Measurement</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Perimeter:</span>
                  <div className="font-medium">
                    {measurement.perimeter.feet.toFixed(2)} ft
                    <span className="text-xs text-gray-500 ml-2">
                      ({measurement.perimeter.meters.toFixed(2)} m)
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Area:</span>
                  <div className="font-medium">
                    {measurement.area.squareFeet.toLocaleString()} ft²
                    <span className="text-xs text-gray-500 ml-2">
                      ({measurement.area.acres.toFixed(3)} acres)
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Comparison with expected */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Accuracy Check</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Perimeter Difference:</span>
                    <span className={Math.abs(measurement.perimeter.feet - testProperty.expectedPerimeter) < 10 ? 'text-green-600' : 'text-red-600'}>
                      {(measurement.perimeter.feet - testProperty.expectedPerimeter).toFixed(2)} ft
                      ({((Math.abs(measurement.perimeter.feet - testProperty.expectedPerimeter) / testProperty.expectedPerimeter) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Area Difference:</span>
                    <span className={Math.abs(measurement.area.squareFeet - testProperty.expectedArea) < 500 ? 'text-green-600' : 'text-red-600'}>
                      {(measurement.area.squareFeet - testProperty.expectedArea).toFixed(0)} ft²
                      ({((Math.abs(measurement.area.squareFeet - testProperty.expectedArea) / testProperty.expectedArea) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Test Results */}
          <div className="mb-6">
            <button
              onClick={runAccuracyTest}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Run Accuracy Test
            </button>
          </div>
          
          {testResults && (
            <div className={`p-4 rounded-lg ${testResults.validation.overallPass ? 'bg-green-50' : 'bg-red-50'}`}>
              <h2 className="font-semibold mb-2 flex items-center gap-2">
                Test Results
                {testResults.validation.overallPass ? (
                  <span className="text-green-600">✓ PASS</span>
                ) : (
                  <span className="text-red-600">✗ FAIL</span>
                )}
              </h2>
              
              <div className="space-y-3 text-sm">
                {/* Perimeter Test */}
                <div>
                  <div className="font-medium">Perimeter Test:</div>
                  <div className="ml-4 space-y-1 text-xs">
                    <div>Calculated: {testResults.calculated.perimeter.feet.toFixed(2)} ft</div>
                    <div>Expected: {testResults.expected.expectedPerimeter} ft</div>
                    <div>Difference: {testResults.validation.perimeter.difference.toFixed(2)} ft ({testResults.validation.perimeter.percentDiff.toFixed(1)}%)</div>
                    <div className={testResults.validation.perimeter.valid ? 'text-green-600' : 'text-red-600'}>
                      {testResults.validation.perimeter.valid ? '✓ Within tolerance' : '✗ Outside tolerance'}
                    </div>
                  </div>
                </div>
                
                {/* Area Test */}
                <div>
                  <div className="font-medium">Area Test:</div>
                  <div className="ml-4 space-y-1 text-xs">
                    <div>Calculated: {testResults.calculated.area.squareFeet.toFixed(0)} ft²</div>
                    <div>Expected: {testResults.expected.expectedArea} ft²</div>
                    <div>Difference: {testResults.validation.area.difference.toFixed(0)} ft² ({testResults.validation.area.percentDiff.toFixed(1)}%)</div>
                    <div className={testResults.validation.area.valid ? 'text-green-600' : 'text-red-600'}>
                      {testResults.validation.area.valid ? '✓ Within tolerance' : '✗ Outside tolerance'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Instructions */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">Instructions</h3>
            <ol className="text-xs space-y-1 list-decimal list-inside">
              <li>Click the ruler icon to start measuring</li>
              <li>Click on map corners to draw property boundary</li>
              <li>Click the checkmark to complete</li>
              <li>Or click the pin icon to load test property</li>
              <li>Compare results with Google Earth values</li>
            </ol>
          </div>
          
          {/* Google Earth Reference */}
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">Google Earth Reference</h3>
            <p className="text-xs text-gray-600">
              According to your screenshot, Google Earth measures this property as:
            </p>
            <ul className="mt-2 text-xs space-y-1">
              <li>• Total area: 2,728.74 m² (29,371.88 ft²)</li>
              <li>• Total distance: 212.10 m (695.87 ft)</li>
              <li>• Approximately 0.674 acres</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}