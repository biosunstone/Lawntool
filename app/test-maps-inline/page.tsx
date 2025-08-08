'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Script from 'next/script'

export default function TestMapsInline() {
  const [status, setStatus] = useState<string>('Loading...')
  const [errors, setErrors] = useState<string[]>([])
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const initializeMap = () => {
    console.log('Attempting to initialize map...')
    
    if (typeof window === 'undefined' || !(window as any).google) {
      setStatus('Google Maps not loaded yet')
      return
    }

    try {
      const google = (window as any).google
      
      if (!google.maps) {
        throw new Error('google.maps is undefined')
      }

      setStatus('Creating map instance...')

      const mapOptions = {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      }

      if (mapRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions)
        
        // Add marker
        new google.maps.Marker({
          position: { lat: 37.7749, lng: -122.4194 },
          map: mapInstanceRef.current,
          title: 'San Francisco'
        })

        setStatus('Map loaded successfully!')
      }
    } catch (error: any) {
      console.error('Map initialization error:', error)
      setErrors(prev => [...prev, error.message])
      setStatus('Failed to initialize map')
    }
  }

  useEffect(() => {
    // Set up global callback
    (window as any).initMap = initializeMap

    // Monitor for Google Maps availability
    const checkInterval = setInterval(() => {
      if ((window as any).google && (window as any).google.maps) {
        clearInterval(checkInterval)
        initializeMap()
      }
    }, 100)

    return () => {
      clearInterval(checkInterval)
      delete (window as any).initMap
    }
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Google Maps Inline Script Test</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <p><strong>Status:</strong> {status}</p>
        <p><strong>API Key:</strong> {apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found'}</p>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 rounded">
          <h3 className="font-semibold text-red-700 mb-2">Errors:</h3>
          {errors.map((error, idx) => (
            <p key={idx} className="text-red-600 text-sm">{error}</p>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Map Container:</h2>
        <div 
          ref={mapRef}
          className="w-full h-96 bg-gray-200 border-2 border-gray-300 rounded"
          id="map"
        />
      </div>

      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=places,drawing,geometry`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Script tag loaded')
          setStatus('Script loaded, initializing...')
        }}
        onError={(e) => {
          console.error('Script loading error:', e)
          setErrors(prev => [...prev, 'Failed to load Google Maps script'])
          setStatus('Script loading failed')
        }}
      />

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <pre className="text-xs">
{`// Check these in browser console:
console.log(window.google)
console.log(window.google?.maps)
console.log(window.google?.maps?.version)`}
        </pre>
      </div>
    </div>
  )
}