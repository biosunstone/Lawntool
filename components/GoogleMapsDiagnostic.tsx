'use client'

import { useJsApiLoader } from '@react-google-maps/api'
import { useEffect } from 'react'

export default function GoogleMapsDiagnostic() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'drawing', 'geometry'],
  })

  useEffect(() => {
    // Log the current state
    console.log('=== Google Maps Diagnostic ===')
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 
        `${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 10)}...` : 
        'NOT SET'
    })
    console.log('Load Status:', { isLoaded, loadError: loadError?.message })
    
    // Check if Google Maps is available globally
    if (typeof window !== 'undefined') {
      console.log('Window.google:', window.google ? 'Available' : 'Not Available')
      console.log('Window.google.maps:', window.google?.maps ? 'Available' : 'Not Available')
    }
  }, [isLoaded, loadError])

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">Google Maps Status</h3>
      <div className="text-xs space-y-1">
        <div>API Key: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅' : '❌'}</div>
        <div>Loaded: {isLoaded ? '✅' : '⏳'}</div>
        <div>Error: {loadError ? `❌ ${loadError.message}` : '✅'}</div>
      </div>
    </div>
  )
}