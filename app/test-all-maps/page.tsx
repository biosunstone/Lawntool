'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const DirectMap = dynamic(() => import('@/components/DirectMap'), { ssr: false })
const IframeMap = dynamic(() => import('@/components/IframeMap'), { ssr: false })

export default function TestAllMapsPage() {
  const [mapType, setMapType] = useState<'direct' | 'iframe'>('direct')
  const testLocation = { lat: 40.7128, lng: -74.0060 } // NYC

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test All Map Implementations</h1>
      
      <div className="mb-6">
        <label className="mr-4">
          <input
            type="radio"
            value="direct"
            checked={mapType === 'direct'}
            onChange={(e) => setMapType('direct')}
            className="mr-2"
          />
          Direct Implementation
        </label>
        <label>
          <input
            type="radio"
            value="iframe"
            checked={mapType === 'iframe'}
            onChange={(e) => setMapType('iframe')}
            className="mr-2"
          />
          Iframe Implementation
        </label>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm">
          <strong>API Key:</strong> {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}<br />
          <strong>Test Location:</strong> New York City ({testLocation.lat}, {testLocation.lng})
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {mapType === 'direct' ? (
          <DirectMap center={testLocation} address="New York City" />
        ) : (
          <IframeMap center={testLocation} address="New York City" />
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="font-bold mb-2">Debugging Steps:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open browser console (F12)</li>
          <li>Look for any error messages</li>
          <li>Check Network tab for failed requests</li>
          <li>Try both map types above</li>
          <li>If iframe works but direct doesn't, it's a script loading issue</li>
          <li>If neither works, check API key configuration</li>
        </ol>
      </div>
    </div>
  )
}