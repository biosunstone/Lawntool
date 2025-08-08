'use client'

import { useEffect, useState } from 'react'
import { GoogleMap, Polygon } from '@react-google-maps/api'
import { Loader2 } from 'lucide-react'

interface SimplePropertyMapProps {
  address: string
  center: { lat: number; lng: number }
  onMeasurementComplete?: (measurements: any) => void
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

export default function SimplePropertyMap({ address, center, onMeasurementComplete }: SimplePropertyMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)

  useEffect(() => {
    console.log('SimplePropertyMap mounted for:', address)
    
    // Simulate measurement process
    const timer = setTimeout(() => {
      setShowOverlay(true)
      setIsLoading(false)
      
      // Generate simple measurements
      const measurements = {
        totalArea: 12500,
        lawn: {
          frontYard: 2500,
          backYard: 4000,
          sideYard: 1500,
          total: 8000
        },
        driveway: 1200,
        sidewalk: 300,
        building: 2800,
        other: 200
      }
      
      if (onMeasurementComplete) {
        console.log('Calling onMeasurementComplete with:', measurements)
        onMeasurementComplete(measurements)
      }
    }, 2000) // Simple 2 second delay
    
    return () => clearTimeout(timer)
  }, [address, onMeasurementComplete])

  // Simple property boundary
  const propertyBoundary = [
    { lat: center.lat + 0.0003, lng: center.lng - 0.0003 },
    { lat: center.lat + 0.0003, lng: center.lng + 0.0003 },
    { lat: center.lat - 0.0003, lng: center.lng + 0.0003 },
    { lat: center.lat - 0.0003, lng: center.lng - 0.0003 }
  ]

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-semibold text-gray-900">Analyzing property...</p>
          </div>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={19}
        options={mapOptions}
      >
        {showOverlay && (
          <Polygon
            paths={propertyBoundary}
            options={{
              fillColor: '#00FF00',
              fillOpacity: 0.3,
              strokeColor: '#00AA00',
              strokeWeight: 3,
              strokeOpacity: 0.8
            }}
          />
        )}
      </GoogleMap>
      
      {!isLoading && (
        <div className="bg-white p-4 rounded-lg shadow-sm mt-4">
          <p className="text-sm font-semibold text-gray-700">Measurement Complete!</p>
        </div>
      )}
    </div>
  )
}