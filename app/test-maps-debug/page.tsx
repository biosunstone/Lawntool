'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'

export default function TestMapsDebug() {
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [networkRequests, setNetworkRequests] = useState<any[]>([])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${info}`])
  }

  // Monitor network requests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Override fetch to monitor API calls
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const url = args[0]?.toString() || ''
        if (url.includes('googleapis.com')) {
          addDebugInfo(`Fetch request to: ${url}`)
          setNetworkRequests(prev => [...prev, { type: 'fetch', url, time: new Date().toISOString() }])
        }
        return originalFetch(...args)
      }

      // Check for existing Google Maps
      if ((window as any).google) {
        addDebugInfo('Google Maps already loaded in window')
      }

      // Monitor script tags
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'SCRIPT') {
              const script = node as HTMLScriptElement
              if (script.src.includes('maps.googleapis.com')) {
                addDebugInfo(`Google Maps script added: ${script.src}`)
                setNetworkRequests(prev => [...prev, { 
                  type: 'script', 
                  url: script.src, 
                  time: new Date().toISOString() 
                }])
              }
            }
          })
        })
      })

      observer.observe(document.head, { childList: true })

      return () => {
        window.fetch = originalFetch
        observer.disconnect()
      }
    }
  }, [])

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
      <h1 className="text-2xl font-bold mb-4">Google Maps Debug Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Configuration:</h2>
        <p>API Key present: {apiKey ? 'Yes' : 'No'}</p>
        <p>API Key length: {apiKey.length}</p>
        <p>API Key prefix: {apiKey.substring(0, 10)}...</p>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Map Container:</h2>
        <LoadScript
          googleMapsApiKey={apiKey}
          libraries={['places', 'drawing', 'geometry']}
          onLoad={() => {
            setIsLoaded(true)
            addDebugInfo('LoadScript onLoad fired')
          }}
          onError={(error) => {
            setLoadError(error)
            addDebugInfo(`LoadScript error: ${error.message}`)
          }}
        >
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={12}
              onLoad={(map) => {
                addDebugInfo('GoogleMap component loaded')
                console.log('Map instance:', map)
              }}
            >
              <Marker position={center} />
            </GoogleMap>
          ) : (
            <div className="h-96 bg-gray-200 flex items-center justify-center">
              <p>Loading map...</p>
            </div>
          )}
        </LoadScript>
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-semibold mb-2">Load Error:</h2>
          <pre>{JSON.stringify(loadError, null, 2)}</pre>
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Network Requests:</h2>
        <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
          {networkRequests.length === 0 ? (
            <p>No Google Maps API requests detected</p>
          ) : (
            networkRequests.map((req, idx) => (
              <div key={idx} className="mb-2 text-sm">
                <span className="font-mono">[{req.type}] {req.time}</span>
                <br />
                <span className="text-xs text-gray-600">{req.url}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Debug Log:</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded max-h-60 overflow-y-auto font-mono text-sm">
          {debugInfo.map((info, idx) => (
            <div key={idx}>{info}</div>
          ))}
        </div>
      </div>
    </div>
  )
}