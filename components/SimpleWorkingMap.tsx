'use client'

import { useEffect, useRef } from 'react'

interface SimpleWorkingMapProps {
  center: { lat: number; lng: number }
  onMapLoad?: () => void
}

// Declare global google maps types
declare global {
  interface Window {
    initMap?: () => void
  }
}

export default function SimpleWorkingMap({ center, onMapLoad }: SimpleWorkingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const mapInitializedRef = useRef(false)

  useEffect(() => {
    // Define the init function globally
    window.initMap = () => {
      if (!mapRef.current || mapInitializedRef.current) return
      
      mapInitializedRef.current = true
      console.log('Initializing map...')
      
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: 19,
        mapTypeId: 'satellite'
      })

      // Add property overlay
      new google.maps.Polygon({
        paths: [
          { lat: center.lat + 0.0002, lng: center.lng - 0.0002 },
          { lat: center.lat + 0.0002, lng: center.lng + 0.0002 },
          { lat: center.lat - 0.0002, lng: center.lng + 0.0002 },
          { lat: center.lat - 0.0002, lng: center.lng - 0.0002 }
        ],
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#FF0000',
        fillOpacity: 0.1,
        map: mapInstanceRef.current
      })
      
      // Call the onMapLoad callback
      if (onMapLoad) {
        onMapLoad()
      }
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      window.initMap()
    } else {
      // Load the script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      
      if (!existingScript) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initMap`
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
    }

    // Update center when it changes
    if (mapInstanceRef.current && mapInitializedRef.current) {
      mapInstanceRef.current.setCenter(center)
    }
    
    // Cleanup
    return () => {
      mapInitializedRef.current = false
    }
  }, [center])

  return (
    <div>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '500px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px'
        }}
      />
    </div>
  )
}