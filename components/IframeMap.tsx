'use client'

interface IframeMapProps {
  center: { lat: number; lng: number }
  address?: string
}

export default function IframeMap({ center, address }: IframeMapProps) {
  // Create a Google Maps embed URL
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${center.lat},${center.lng}&zoom=19&maptype=satellite`

  return (
    <div className="relative">
      <iframe
        width="100%"
        height="500"
        style={{ border: 0, borderRadius: '0.5rem' }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={mapUrl}
      />
      {address && (
        <div className="absolute bottom-2 right-2 bg-white/90 px-3 py-1 rounded text-sm shadow">
          {address}
        </div>
      )}
    </div>
  )
}