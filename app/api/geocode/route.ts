import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()
    
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4'
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    
    const response = await fetch(geocodeUrl)
    const data = await response.json()
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return NextResponse.json({
        coordinates: {
          lat: location.lat,
          lng: location.lng
        },
        formattedAddress: data.results[0].formatted_address
      })
    } else {
      return NextResponse.json({ error: 'Could not geocode address' }, { status: 404 })
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}