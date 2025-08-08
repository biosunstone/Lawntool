'use client'

import { useEffect, useState } from 'react'

interface SimpleMapProps {
  center: { lat: number; lng: number }
  address?: string
}

export default function SimpleMap({ center, address }: SimpleMapProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Use environment variable with fallback
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4'
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=19&size=800x500&maptype=satellite&markers=color:red%7C${center.lat},${center.lng}&key=${apiKey}`

  useEffect(() => {
    console.log('SimpleMap rendering with:', {
      center,
      address,
      apiKey: apiKey ? 'Present' : 'Missing',
      mapUrl
    })
    setImageError(false)
    setImageLoaded(false)
  }, [center, address, apiKey, mapUrl])

  return (
    <div className="w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden relative">
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading satellite view...</p>
          </div>
        </div>
      )}
      
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load map</p>
            <p className="text-sm text-gray-600">Please check your internet connection</p>
          </div>
        </div>
      )}
      
      <img 
        src={mapUrl}
        alt={`Satellite view of ${address || 'property'}`}
        className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => {
          console.log('Map loaded successfully')
          setImageLoaded(true)
          setImageError(false)
        }}
        onError={(e) => {
          console.error('Map failed to load:', e)
          setImageError(true)
          setImageLoaded(false)
        }}
      />
    </div>
  )
}