export const dynamic = 'force-dynamic'

export default function BasicMapTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Basic Map Test</h1>
      <p className="mb-4">If you see a satellite map below, the API key is working:</p>
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src="https://maps.googleapis.com/maps/api/staticmap?center=43.6532,-79.3832&zoom=19&size=800x500&maptype=satellite&markers=color:red%7C43.6532,-79.3832&key=AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4"
        alt="Toronto Satellite Map"
        width={800}
        height={500}
        style={{ border: '2px solid #ccc' }}
      />
      
      <div className="mt-4">
        <p className="text-sm text-gray-600">Location: Toronto, Canada</p>
        <p className="text-sm text-gray-600">Coordinates: 43.6532, -79.3832</p>
      </div>
    </div>
  )
}