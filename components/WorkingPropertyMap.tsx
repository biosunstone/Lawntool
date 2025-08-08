'use client'

import { useState, useCallback } from 'react'
import { GoogleMap, Polygon } from '@react-google-maps/api'

interface WorkingPropertyMapProps {
  center: { lat: number; lng: number }
  address?: string
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.5rem'
}

const mapOptions: google.maps.MapOptions = {
  mapTypeId: 'satellite',
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  tilt: 0
}

export default function WorkingPropertyMap({ center, address }: WorkingPropertyMapProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  
  const onLoad = useCallback(() => {
    console.log('Map loaded successfully for:', address)
    setIsLoaded(true)
  }, [address])
  
  // Create a simple property boundary around the center point
  const propertyBounds = [
    { lat: center.lat + 0.0002, lng: center.lng - 0.0002 },
    { lat: center.lat + 0.0002, lng: center.lng + 0.0002 },
    { lat: center.lat - 0.0002, lng: center.lng + 0.0002 },
    { lat: center.lat - 0.0002, lng: center.lng - 0.0002 }
  ]

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={19}
      options={mapOptions}
      onLoad={onLoad}
    >
      {/* Property outline */}
      <Polygon
        paths={propertyBounds}
        options={{
          fillColor: '#FF0000',
          fillOpacity: 0.1,
          strokeColor: '#FF0000',
          strokeWeight: 3,
          strokeOpacity: 0.8,
          zIndex: 1
        }}
      />
      
      {/* Building */}
      <Polygon
        paths={[
          { lat: center.lat + 0.0001, lng: center.lng - 0.0001 },
          { lat: center.lat + 0.0001, lng: center.lng + 0.0001 },
          { lat: center.lat - 0.0001, lng: center.lng + 0.0001 },
          { lat: center.lat - 0.0001, lng: center.lng - 0.0001 }
        ]}
        options={{
          fillColor: '#8B4513',
          fillOpacity: 0.6,
          strokeColor: '#654321',
          strokeWeight: 2,
          strokeOpacity: 0.8,
          zIndex: 2
        }}
      />
      
      {/* Lawn area */}
      <Polygon
        paths={[
          { lat: center.lat - 0.0002, lng: center.lng - 0.0002 },
          { lat: center.lat - 0.0002, lng: center.lng + 0.0002 },
          { lat: center.lat - 0.0001, lng: center.lng + 0.0002 },
          { lat: center.lat - 0.0001, lng: center.lng - 0.0002 }
        ]}
        options={{
          fillColor: '#00FF00',
          fillOpacity: 0.3,
          strokeColor: '#00AA00',
          strokeWeight: 2,
          strokeOpacity: 0.8,
          zIndex: 1
        }}
      />
    </GoogleMap>
  )
}