'use client'

import { Libraries, useJsApiLoader } from '@react-google-maps/api'
import { ReactNode } from 'react'

const libraries: Libraries = ['places', 'drawing', 'geometry']

interface GoogleMapsProviderProps {
  children: ReactNode
}

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('GoogleMapsProvider Debug:', {
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing',
      isLoaded,
      loadError: loadError?.message || 'None'
    })
  }

  if (loadError) {
    console.error('Google Maps Load Error:', loadError)
    return (
      <div className="text-center p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading Google Maps: {loadError.message}
        <br />
        <span className="text-sm">Check console for details.</span>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="text-center p-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}