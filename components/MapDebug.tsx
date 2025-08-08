'use client'

interface MapDebugProps {
  center: { lat: number; lng: number }
  address?: string
}

export default function MapDebug({ center, address }: MapDebugProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-yellow-800 mb-2">Map Debug Info:</h3>
      <div className="text-sm space-y-1 font-mono">
        <p>API Key: {apiKey ? `✅ ${apiKey.substring(0, 10)}...` : '❌ Missing'}</p>
        <p>Address: {address || 'No address'}</p>
        <p>Latitude: {center.lat}</p>
        <p>Longitude: {center.lng}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
      </div>
    </div>
  )
}