'use client'

import { useEffect, useRef, useState } from 'react'

interface DirectMapProps {
  center: { lat: number; lng: number }
  address?: string
}

export default function DirectMap({ center, address }: DirectMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Create unique ID for this map instance
    const mapId = `map-${Date.now()}`
    if (mapContainerRef.current) {
      mapContainerRef.current.id = mapId
    }

    // Create and inject the map script inline
    const script = document.createElement('script')
    script.innerHTML = `
      (function() {
        // Check if Google Maps is already loaded
        function loadMap() {
          if (!document.getElementById('${mapId}')) return;
          
          try {
            const map = new google.maps.Map(document.getElementById('${mapId}'), {
              center: ${JSON.stringify(center)},
              zoom: 19,
              mapTypeId: 'satellite',
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: true,
              scaleControl: true,
              streetViewControl: false,
              rotateControl: false,
              fullscreenControl: true
            });

            // Add property boundary
            new google.maps.Polygon({
              paths: [
                { lat: ${center.lat + 0.0002}, lng: ${center.lng - 0.0002} },
                { lat: ${center.lat + 0.0002}, lng: ${center.lng + 0.0002} },
                { lat: ${center.lat - 0.0002}, lng: ${center.lng + 0.0002} },
                { lat: ${center.lat - 0.0002}, lng: ${center.lng - 0.0002} }
              ],
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              fillColor: '#FF0000',
              fillOpacity: 0.2,
              map: map
            });

            // Add building
            new google.maps.Polygon({
              paths: [
                { lat: ${center.lat + 0.0001}, lng: ${center.lng - 0.0001} },
                { lat: ${center.lat + 0.0001}, lng: ${center.lng + 0.0001} },
                { lat: ${center.lat - 0.0001}, lng: ${center.lng + 0.0001} },
                { lat: ${center.lat - 0.0001}, lng: ${center.lng - 0.0001} }
              ],
              strokeColor: '#8B4513',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#8B4513',
              fillOpacity: 0.7,
              map: map
            });

            console.log('Map loaded successfully');
          } catch (err) {
            console.error('Map error:', err);
          }
        }

        // Wait for Google Maps to be available
        if (typeof google !== 'undefined' && google.maps) {
          loadMap();
        } else {
          // If Google Maps isn't loaded, load it
          if (!window.mapLoadStarted) {
            window.mapLoadStarted = true;
            const script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry';
            script.onload = loadMap;
            script.onerror = () => console.error('Failed to load Google Maps');
            document.head.appendChild(script);
          } else {
            // Wait for it to load
            const checkInterval = setInterval(() => {
              if (typeof google !== 'undefined' && google.maps) {
                clearInterval(checkInterval);
                loadMap();
              }
            }, 100);
          }
        }
      })();
    `
    document.body.appendChild(script)

    // Cleanup
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [center.lat, center.lng])

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef}
        className="w-full h-[500px] bg-gray-200 rounded-lg"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
}