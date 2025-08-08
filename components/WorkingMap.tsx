'use client'

import { useState, useEffect } from 'react'

interface WorkingMapProps {
  center: { lat: number; lng: number }
  address?: string
}

export default function WorkingMap({ center, address }: WorkingMapProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Create a simple static map URL
  const apiKey = 'AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4'
  
  // Use coordinates directly for more reliable results
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${center.lat},${center.lng}` +
    `&zoom=19` +
    `&size=800x500` +
    `&scale=2` +
    `&maptype=satellite` +
    `&markers=color:red%7Clabel:P%7C${center.lat},${center.lng}` +
    `&key=${apiKey}`

  useEffect(() => {
    console.log('WorkingMap URL:', mapUrl)
    setImageError(false)
    setIsLoading(true)
  }, [mapUrl])

  if (imageError) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Unable to load map</p>
          <p className="text-sm text-gray-600">Please check your internet connection</p>
          <button 
            onClick={() => {
              setImageError(false)
              setIsLoading(true)
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
        <img 
          src={mapUrl}
          alt={`Satellite view of ${address || 'property'}`}
          className="w-full h-auto"
          style={{ maxHeight: '500px', objectFit: 'cover', display: isLoading ? 'none' : 'block' }}
          onLoad={() => {
            console.log('Map image loaded successfully')
            setIsLoading(false)
          }}
          onError={(e) => {
            console.error('Map image failed to load:', e)
            setImageError(true)
            setIsLoading(false)
          }}
        />
        {address && !isLoading && (
          <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-2 rounded shadow-lg">
            <p className="text-sm font-semibold">{address}</p>
            <p className="text-xs text-gray-600">{center.lat.toFixed(6)}, {center.lng.toFixed(6)}</p>
          </div>
        )}
      </div>
    </div>
  )
}