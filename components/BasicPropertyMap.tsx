'use client'

import { useEffect, useState } from 'react'
import { GoogleMap, Polygon } from '@react-google-maps/api'

interface BasicPropertyMapProps {
  address: string
  center: { lat: number; lng: number }
  onMeasurementsCalculated?: (measurements: any) => void
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.5rem'
}

export default function BasicPropertyMap({ 
  address, 
  center, 
  onMeasurementsCalculated 
}: BasicPropertyMapProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  console.log('BasicPropertyMap rendering with:', { address, center })

  useEffect(() => {
    if (isMapLoaded && onMeasurementsCalculated) {
      console.log('Calculating measurements for:', address)
      
      // Simple area calculation based on typical suburban lot
      const measurements = {
        totalArea: 11250, // 75x150 feet typical lot
        lawn: {
          frontYard: 2250,
          backYard: 3750,
          sideYard: 1500,
          total: 7500
        },
        driveway: 1080, // 12x90 feet
        sidewalk: 300,
        building: 2370, // ~21% of lot
        other: 0
      }
      
      onMeasurementsCalculated(measurements)
    }
  }, [isMapLoaded, address, onMeasurementsCalculated])

  // Simple property boundary (75x150 feet)
  const offset = 0.00025 // Approximate for typical lot
  const propertyBoundary = [
    { lat: center.lat + offset, lng: center.lng - offset/2 },
    { lat: center.lat + offset, lng: center.lng + offset/2 },
    { lat: center.lat - offset, lng: center.lng + offset/2 },
    { lat: center.lat - offset, lng: center.lng - offset/2 }
  ]

  const buildingBoundary = [
    { lat: center.lat + offset*0.3, lng: center.lng - offset*0.3 },
    { lat: center.lat + offset*0.3, lng: center.lng + offset*0.3 },
    { lat: center.lat - offset*0.3, lng: center.lng + offset*0.3 },
    { lat: center.lat - offset*0.3, lng: center.lng - offset*0.3 }
  ]

  if (!window.google) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Google Maps is loading...</p>
      </div>
    )
  }

  return (
    <div>
      {mapError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-4">
          Error: {mapError}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={19}
        options={{
          mapTypeId: 'satellite',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
          tilt: 0
        }}
        onLoad={() => {
          console.log('Map component loaded')
          setIsMapLoaded(true)
          setMapError(null)
        }}
      >
        {/* Property boundary */}
        <Polygon
          paths={propertyBoundary}
          options={{
            fillColor: 'transparent',
            strokeColor: '#FF0000',
            strokeWeight: 3,
            strokeOpacity: 1,
            zIndex: 1
          }}
        />
        
        {/* Building */}
        <Polygon
          paths={buildingBoundary}
          options={{
            fillColor: '#8B4513',
            fillOpacity: 0.7,
            strokeColor: '#654321',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            zIndex: 3
          }}
        />
        
        {/* Lawn areas */}
        <Polygon
          paths={[
            { lat: center.lat - offset, lng: center.lng - offset/2 },
            { lat: center.lat - offset, lng: center.lng + offset/2 },
            { lat: center.lat - offset*0.3, lng: center.lng + offset/2 },
            { lat: center.lat - offset*0.3, lng: center.lng - offset/2 }
          ]}
          options={{
            fillColor: '#00FF00',
            fillOpacity: 0.3,
            strokeColor: '#00AA00',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            zIndex: 2
          }}
        />
      </GoogleMap>
    </div>
  )
}