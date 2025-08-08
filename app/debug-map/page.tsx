'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

export default function DebugMapPage() {
  const [status, setStatus] = useState<any>({})
  
  useEffect(() => {
    const checkGoogleMaps = () => {
      setStatus({
        windowGoogle: typeof window.google !== 'undefined',
        googleMaps: typeof window.google?.maps !== 'undefined',
        googleMapsGeometry: typeof window.google?.maps?.geometry !== 'undefined',
        googleMapsPlaces: typeof window.google?.maps?.places !== 'undefined',
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'Not set',
        apiKeyLength: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.length || 0,
      })
    }
    
    // Check immediately
    checkGoogleMaps()
    
    // Check again after a delay
    const timer = setTimeout(checkGoogleMaps, 2000)
    
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Google Maps Debug Info</h1>
      
      <div className="bg-gray-100 rounded-lg p-6 space-y-2 font-mono text-sm">
        <p>window.google exists: {status.windowGoogle ? '✅ Yes' : '❌ No'}</p>
        <p>google.maps exists: {status.googleMaps ? '✅ Yes' : '❌ No'}</p>
        <p>geometry library: {status.googleMapsGeometry ? '✅ Loaded' : '❌ Not loaded'}</p>
        <p>places library: {status.googleMapsPlaces ? '✅ Loaded' : '❌ Not loaded'}</p>
        <p>API Key: {status.apiKeyLength > 0 ? `✅ Set (${status.apiKeyLength} chars)` : '❌ Not set'}</p>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Simple Map Test</h2>
        <div 
          id="map" 
          className="w-full h-[400px] bg-gray-200 rounded-lg"
        />
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined') {
            console.log('Debug: window.google =', window.google);
            console.log('Debug: API Key =', '${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}');
          }
        `
      }} />
    </div>
  )
}