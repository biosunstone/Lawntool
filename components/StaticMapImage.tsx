'use client'

interface StaticMapImageProps {
  center: { lat: number; lng: number }
  address?: string
}

export default function StaticMapImage({ center, address }: StaticMapImageProps) {
  // Use Google Static Maps API - this will definitely work
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=19&size=800x500&maptype=satellite&markers=color:red%7C${center.lat},${center.lng}&key=${apiKey}`
  
  // Debug info
  console.log('StaticMapImage rendering with:', {
    center,
    address,
    apiKey: apiKey ? 'Present' : 'Missing',
    mapUrl
  })

  return (
    <div className="relative">
      <div className="w-full h-[500px] bg-gray-200 rounded-lg overflow-hidden">
        {apiKey ? (
          <img 
            src={mapUrl}
            alt={`Map of ${address || 'property'}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Map image failed to load')
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500"%3E%3Crect fill="%23e5e7eb" width="800" height="500"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="20"%3EMap unavailable%3C/text%3E%3C/svg%3E'
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Google Maps API key not found</p>
          </div>
        )}
      </div>
      {address && (
        <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-2 rounded shadow-lg">
          <p className="text-sm font-semibold">{address}</p>
          <p className="text-xs text-gray-600">{center.lat.toFixed(6)}, {center.lng.toFixed(6)}</p>
        </div>
      )}
    </div>
  )
}