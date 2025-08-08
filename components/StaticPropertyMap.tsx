'use client'

import { GoogleMap, Polygon } from '@react-google-maps/api'

interface StaticPropertyMapProps {
  center: { lat: number; lng: number }
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem'
}

export default function StaticPropertyMap({ center }: StaticPropertyMapProps) {
  // Simple static property boundaries
  const propertyBoundary = [
    { lat: center.lat + 0.0002, lng: center.lng - 0.0002 },
    { lat: center.lat + 0.0002, lng: center.lng + 0.0002 },
    { lat: center.lat - 0.0002, lng: center.lng + 0.0002 },
    { lat: center.lat - 0.0002, lng: center.lng - 0.0002 }
  ]

  const buildingBoundary = [
    { lat: center.lat + 0.0001, lng: center.lng - 0.0001 },
    { lat: center.lat + 0.0001, lng: center.lng + 0.0001 },
    { lat: center.lat - 0.0001, lng: center.lng + 0.0001 },
    { lat: center.lat - 0.0001, lng: center.lng - 0.0001 }
  ]

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={19}
      options={{
        mapTypeId: 'satellite',
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false
      }}
    >
      {/* Property outline */}
      <Polygon
        paths={propertyBoundary}
        options={{
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.1
        }}
      />
      
      {/* Building */}
      <Polygon
        paths={buildingBoundary}
        options={{
          strokeColor: '#FFA500',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FFA500',
          fillOpacity: 0.3
        }}
      />
    </GoogleMap>
  )
}