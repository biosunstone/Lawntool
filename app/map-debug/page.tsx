'use client'

export const dynamic = 'force-dynamic'

export default function MapDebugPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const testLat = 40.7128
  const testLng = -74.0060
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${testLat},${testLng}&zoom=15&size=600x400&maptype=satellite&markers=color:red%7C${testLat},${testLng}&key=${apiKey}`

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Map Debug Page</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p><strong>API Key from env:</strong> {apiKey ? 'Present' : 'Not found'}</p>
        <p><strong>API Key value:</strong> {apiKey || 'undefined'}</p>
        <p><strong>Map URL:</strong></p>
        <pre className="text-xs overflow-x-auto">{mapUrl}</pre>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold p-4 bg-gray-50">Static Map Image:</h2>
        <img 
          src={mapUrl}
          alt="Test map"
          className="w-full"
          onError={(e) => {
            console.error('Image failed to load:', e)
          }}
        />
      </div>

      <div className="mt-4 border rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold p-4 bg-gray-50">Direct HTML Image:</h2>
        <img 
          src="https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=15&size=600x400&maptype=satellite&markers=color:red%7C40.7128,-74.0060&key=AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4"
          alt="Direct test map"
          className="w-full"
        />
      </div>
    </div>
  )
}