'use client'

export const dynamic = 'force-dynamic'

import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api'
import { useEffect, useState } from 'react'

const libraries: any[] = ['places', 'drawing', 'geometry']

export default function TestMapsHook() {
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [windowGoogle, setWindowGoogle] = useState<boolean>(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  })

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${info}`])
    console.log(info)
  }

  useEffect(() => {
    // Check environment
    addDebugInfo(`Running in browser: ${typeof window !== 'undefined'}`)
    addDebugInfo(`API Key configured: ${!!apiKey}`)
    addDebugInfo(`API Key value: ${apiKey.substring(0, 10)}...`)
    
    // Check for Google Maps in window
    const checkGoogle = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        setWindowGoogle(true)
        addDebugInfo('Google object detected in window')
        if ((window as any).google.maps) {
          addDebugInfo('Google Maps API is available')
          addDebugInfo(`Google Maps version: ${(window as any).google.maps.version}`)
        }
      }
    }

    checkGoogle()
    const interval = setInterval(checkGoogle, 1000)

    // Check for content security policy
    const metaTags = document.getElementsByTagName('meta')
    for (let i = 0; i < metaTags.length; i++) {
      if (metaTags[i].httpEquiv === 'Content-Security-Policy') {
        addDebugInfo(`CSP found: ${metaTags[i].content}`)
      }
    }

    // Monitor errors
    const errorHandler = (event: ErrorEvent) => {
      if (event.filename?.includes('googleapis.com')) {
        addDebugInfo(`Google Maps error: ${event.message}`)
      }
    }
    window.addEventListener('error', errorHandler)

    return () => {
      clearInterval(interval)
      window.removeEventListener('error', errorHandler)
    }
  }, [apiKey])

  useEffect(() => {
    if (isLoaded) {
      addDebugInfo('useJsApiLoader reports: Maps loaded successfully')
    }
    if (loadError) {
      addDebugInfo(`useJsApiLoader reports error: ${loadError.message}`)
    }
  }, [isLoaded, loadError])

  const mapContainerStyle = {
    width: '100%',
    height: '400px'
  }

  const center = {
    lat: 37.7749,
    lng: -122.4194
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Google Maps Hook Test</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Status</h3>
          <p>isLoaded: {isLoaded ? 'Yes' : 'No'}</p>
          <p>loadError: {loadError ? 'Yes' : 'No'}</p>
          <p>window.google: {windowGoogle ? 'Yes' : 'No'}</p>
        </div>
        
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Configuration</h3>
          <p>API Key: {apiKey ? 'Present' : 'Missing'}</p>
          <p>Libraries: {libraries.join(', ')}</p>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
          <h3 className="font-semibold text-red-700">Load Error Details:</h3>
          <pre className="text-sm mt-2">{JSON.stringify(loadError, null, 2)}</pre>
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Map:</h2>
        <div className="border-2 border-gray-300 rounded">
          {!isLoaded && !loadError && (
            <div className="h-96 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading Google Maps...</p>
              </div>
            </div>
          )}
          
          {loadError && (
            <div className="h-96 bg-red-50 flex items-center justify-center">
              <div className="text-center text-red-600">
                <p className="text-xl mb-2">Failed to load Google Maps</p>
                <p className="text-sm">Check console for details</p>
              </div>
            </div>
          )}
          
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={12}
              onLoad={(map) => {
                addDebugInfo('Map instance created successfully')
                console.log('Map object:', map)
              }}
            >
              <Marker 
                position={center}
                onClick={() => addDebugInfo('Marker clicked')}
              />
            </GoogleMap>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Debug Log:</h2>
        <div className="bg-black text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-xs">
          {debugInfo.map((info, idx) => (
            <div key={idx}>{info}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-4 bg-yellow-100 rounded">
        <h3 className="font-semibold mb-2">Troubleshooting Tips:</h3>
        <ul className="list-disc list-inside text-sm">
          <li>Check browser console (F12) for additional errors</li>
          <li>Verify API key is enabled for Maps JavaScript API</li>
          <li>Check if localhost:3000 is in allowed referrers</li>
          <li>Try the standalone HTML test at: /test-google-maps.html</li>
        </ul>
      </div>
    </div>
  )
}