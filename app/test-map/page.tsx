'use client'

export const dynamic = 'force-dynamic'

export default function TestMapPage() {
  const apiKey = 'AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4'
  const lat = 43.6532
  const lng = -79.3832
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Map Test</h1>
      <div className="bg-gray-100 rounded-lg overflow-hidden">
        <img 
          src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=800x500&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${apiKey}`}
          alt="Test map"
          className="w-full"
          onLoad={() => console.log('Map loaded successfully')}
          onError={(e) => console.error('Map failed to load:', e)}
        />
      </div>
    </div>
  )
}