'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { calculateMosquitoControl } from '@/lib/accurateMeasurements'
import { AlertCircle, Bug } from 'lucide-react'

export default function TestMosquitoPage() {
  const testCases = [
    { name: 'Small Urban Lot', perimeter: 200, area: 2500 },
    { name: 'Medium Suburban', perimeter: 370, area: 8500 },
    { name: 'Large Suburban', perimeter: 520, area: 16900 },
    { name: 'Estate Property', perimeter: 800, area: 40000 },
    { name: 'Irregular Shape', perimeter: 600, area: 12000 }
  ]

  const [customPerimeter, setCustomPerimeter] = useState('')
  const [customResults, setCustomResults] = useState<ReturnType<typeof calculateMosquitoControl> | null>(null)

  const handleCustomTest = () => {
    const perimeter = parseInt(customPerimeter)
    if (perimeter > 0) {
      setCustomResults(calculateMosquitoControl(perimeter))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Bug className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">Mosquito Control Calculator Test</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Cases</h2>
          <div className="space-y-4">
            {testCases.map((testCase) => {
              const results = calculateMosquitoControl(testCase.perimeter)
              return (
                <div key={testCase.name} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{testCase.name}</h3>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{testCase.area.toLocaleString()} sq ft</span> property
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Perimeter</p>
                      <p className="font-semibold">{results.perimeterLength} ft</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Treatment Area</p>
                      <p className="font-semibold">{results.treatmentArea.toLocaleString()} sq ft</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Cost/Treatment</p>
                      <p className="font-semibold text-green-600">${results.costPerTreatment}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Annual Cost</p>
                      <p className="font-semibold text-red-600">${results.annualCost}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {results.treatmentsPerYear} treatments per year @ $0.75/linear ft
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Calculator</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="number"
              placeholder="Enter perimeter (ft)"
              value={customPerimeter}
              onChange={(e) => setCustomPerimeter(e.target.value)}
              className="flex-1 px-4 py-2 border rounded"
            />
            <button
              onClick={handleCustomTest}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Calculate
            </button>
          </div>
          
          {customResults && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900">Custom Calculation Results</h4>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">Treatment Area</p>
                      <p className="font-semibold text-blue-900">{customResults.treatmentArea.toLocaleString()} sq ft</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Cost per Treatment</p>
                      <p className="font-semibold text-blue-900">${customResults.costPerTreatment}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Treatments per Year</p>
                      <p className="font-semibold text-blue-900">{customResults.treatmentsPerYear}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Annual Cost</p>
                      <p className="font-semibold text-blue-900">${customResults.annualCost}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Calculation Method</h4>
              <ul className="mt-2 text-sm text-yellow-800 space-y-1">
                <li>• Treatment area: 12 feet from property perimeter</li>
                <li>• Cost: $0.75 per linear foot of perimeter</li>
                <li>• Frequency: 8 treatments per year (monthly during mosquito season)</li>
                <li>• Annual cost = Perimeter × $0.75 × 8 treatments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}