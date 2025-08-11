'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Layers, Settings, TestTube } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

// Dynamic import of mosquito measurement tool
const MosquitoMeasurementTool = dynamic(
  () => import('@/components/mosquito/MosquitoMeasurementTool'),
  { ssr: false }
)

export default function TestPolygonFeatures() {
  const [isReady, setIsReady] = useState(false)
  
  // Test data
  const testAddress = "123 Main Street, New York, NY 10001"
  const testCenter = { lat: 40.7128, lng: -74.0060 } // NYC coordinates
  const testBusinessId = "test-business-123"
  const testPropertyId = "test-property-456"
  
  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsReady(true), 500)
  }, [])
  
  const handleQuoteGenerated = (quoteId: string) => {
    toast.success(`Quote generated: ${quoteId}`)
    console.log('Quote generated:', quoteId)
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TestTube className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Polygon Features Test Page
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Test polygon templates, editor, and management features
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.href = '/admin/polygon-manager'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Test Info Panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Testing Instructions
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-semibold mb-1">1. Polygon Templates:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Click "Polygon Templates" button in the mode selector</li>
                <li>Select from categories: Basic, Property, Landscape</li>
                <li>Click any template to add it to the map</li>
                <li>Templates auto-position at map center</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-1">2. Advanced Polygon Editor:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>View all polygons in the right panel</li>
                <li>Edit names, colors, visibility, lock status</li>
                <li>Duplicate, delete, or reorder polygons</li>
                <li>Visual indicators for easy identification</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-1">3. Measurement Modes:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Lot Perimeter - Full property boundary</li>
                <li>Structure - Building footprint</li>
                <li>Custom Path - Manual drawing</li>
                <li>Area Band - Treatment zones</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-1">4. Test Scenarios:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Add multiple templates and edit them</li>
                <li>Test color changes and visibility toggles</li>
                <li>Try duplicating and reordering</li>
                <li>Mix templates with manual drawings</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Test Property Info */}
        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Test Address:</span>
              <p className="text-gray-900">{testAddress}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Coordinates:</span>
              <p className="text-gray-900">
                {testCenter.lat.toFixed(4)}, {testCenter.lng.toFixed(4)}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Business ID:</span>
              <p className="text-gray-900">{testBusinessId}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Measurement Tool */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '700px' }}>
          {isReady ? (
            <MosquitoMeasurementTool
              propertyId={testPropertyId}
              businessId={testBusinessId}
              address={testAddress}
              center={testCenter}
              onQuoteGenerated={handleQuoteGenerated}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Layers className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading measurement tool...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Links for Testing:</h3>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/polygon-manager"
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Admin Panel
            </a>
            <a
              href="/api/admin/polygons"
              target="_blank"
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              View API Data
            </a>
            <button
              onClick={() => {
                console.log('Test Center:', testCenter)
                console.log('Test Address:', testAddress)
                toast.success('Check console for test data')
              }}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              Log Test Data
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                toast.success('Local storage cleared')
              }}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Clear Storage
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}