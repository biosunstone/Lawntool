'use client'

export const dynamic = 'force-dynamic'

export default function SimpleTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Google Maps Test</h1>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-2">Static Map (Direct URL)</h2>
          <img 
            src="https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=15&size=600x400&maptype=satellite&key=AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4"
            alt="NYC Map"
            width="600"
            height="400"
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Embed Map (iframe)</h2>
          <iframe
            width="600"
            height="400"
            src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4&q=Space+Needle,Seattle+WA&maptype=satellite"
          />
        </div>
      </div>
    </div>
  )
}