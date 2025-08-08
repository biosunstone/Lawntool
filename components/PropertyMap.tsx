'use client'

import { useEffect, useRef } from 'react'
import { GoogleMap, Polygon } from '@react-google-maps/api'

interface PropertyMapProps {
  address: string
  center: { lat: number; lng: number }
  propertyBounds?: google.maps.LatLngLiteral[]
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

// Mock property boundaries - in production, these would come from AI analysis
const generateMockBoundaries = (center: { lat: number; lng: number }) => {
  const offset = 0.0003 // Approximately 100 feet
  
  return {
    property: [
      { lat: center.lat + offset, lng: center.lng - offset },
      { lat: center.lat + offset, lng: center.lng + offset },
      { lat: center.lat - offset, lng: center.lng + offset },
      { lat: center.lat - offset, lng: center.lng - offset },
    ],
    frontYard: [
      { lat: center.lat + offset * 0.3, lng: center.lng - offset * 0.8 },
      { lat: center.lat + offset * 0.3, lng: center.lng + offset * 0.8 },
      { lat: center.lat - offset * 0.2, lng: center.lng + offset * 0.8 },
      { lat: center.lat - offset * 0.2, lng: center.lng - offset * 0.8 },
    ],
    backYard: [
      { lat: center.lat + offset * 0.8, lng: center.lng - offset * 0.6 },
      { lat: center.lat + offset * 0.8, lng: center.lng + offset * 0.6 },
      { lat: center.lat + offset * 0.4, lng: center.lng + offset * 0.6 },
      { lat: center.lat + offset * 0.4, lng: center.lng - offset * 0.6 },
    ],
    driveway: [
      { lat: center.lat - offset * 0.3, lng: center.lng - offset * 0.9 },
      { lat: center.lat - offset * 0.3, lng: center.lng - offset * 0.5 },
      { lat: center.lat - offset * 0.8, lng: center.lng - offset * 0.5 },
      { lat: center.lat - offset * 0.8, lng: center.lng - offset * 0.9 },
    ],
    building: [
      { lat: center.lat + offset * 0.2, lng: center.lng - offset * 0.3 },
      { lat: center.lat + offset * 0.2, lng: center.lng + offset * 0.3 },
      { lat: center.lat - offset * 0.3, lng: center.lng + offset * 0.3 },
      { lat: center.lat - offset * 0.3, lng: center.lng - offset * 0.3 },
    ]
  }
}

export default function PropertyMap({ address, center }: PropertyMapProps) {
  const boundaries = generateMockBoundaries(center)

  return (
    <div className="space-y-4">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={19}
        options={mapOptions}
      >
        {/* Property outline */}
        <Polygon
          paths={boundaries.property}
          options={{
            fillColor: 'transparent',
            strokeColor: '#FF0000',
            strokeWeight: 3,
            strokeOpacity: 1,
            zIndex: 1
          }}
        />
        
        {/* Front Yard */}
        <Polygon
          paths={boundaries.frontYard}
          options={{
            fillColor: '#00FF00',
            fillOpacity: 0.3,
            strokeColor: '#00AA00',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            zIndex: 2
          }}
        />
        
        {/* Back Yard */}
        <Polygon
          paths={boundaries.backYard}
          options={{
            fillColor: '#00FF00',
            fillOpacity: 0.3,
            strokeColor: '#00AA00',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            zIndex: 2
          }}
        />
        
        {/* Driveway */}
        <Polygon
          paths={boundaries.driveway}
          options={{
            fillColor: '#808080',
            fillOpacity: 0.4,
            strokeColor: '#505050',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            zIndex: 2
          }}
        />
        
        {/* Building */}
        <Polygon
          paths={boundaries.building}
          options={{
            fillColor: '#8B4513',
            fillOpacity: 0.5,
            strokeColor: '#654321',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            zIndex: 3
          }}
        />
      </GoogleMap>
      
      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Map Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 opacity-50 border-2 border-green-700"></div>
            <span>Lawn Areas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 opacity-50 border-2 border-gray-700"></div>
            <span>Driveway</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-700 opacity-50 border-2 border-amber-900"></div>
            <span>Building</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-600"></div>
            <span>Property Boundary</span>
          </div>
        </div>
      </div>
    </div>
  )
}