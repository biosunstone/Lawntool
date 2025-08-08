'use client'

import { useEffect, useState } from 'react'

interface EmbedMapProps {
  center: { lat: number; lng: number }
  address?: string
}

export default function EmbedMap({ center, address }: EmbedMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const apiKey = 'AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4'
  const q = address ? encodeURIComponent(address) : `${center.lat},${center.lng}`
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}&maptype=satellite&zoom=19`

  useEffect(() => {
    console.log('EmbedMap mounting with:', {
      center,
      address,
      embedUrl
    })
    setIsLoading(true)
    setError(null)
  }, [center, address, embedUrl])

  return (
    <div className="w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load map</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      )}
      
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={embedUrl}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => {
          console.log('Map iframe loaded successfully')
          setIsLoading(false)
        }}
        onError={() => {
          console.error('Map iframe failed to load')
          setError('Failed to load Google Maps')
          setIsLoading(false)
        }}
      />
    </div>
  )
}