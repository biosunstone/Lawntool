'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useManualSelection } from '@/contexts/ManualSelectionContext'
import { GoogleMap, Polygon, DrawingManager, useLoadScript } from '@react-google-maps/api'
import { Coordinate, AREA_COLORS } from '@/types/manualSelection'
import { calculatePolygonArea, rectangleToPolygon } from '@/lib/manualSelection/polygonCalculator'

interface InteractiveMapOverlayProps {
  center: { lat: number; lng: number }
  measurementData: any
}

const libraries: any[] = ['drawing', 'geometry']

export default function InteractiveMapOverlay({ center, measurementData }: InteractiveMapOverlayProps) {
  const {
    mode,
    selections,
    currentAreaType,
    currentTool,
    isDrawing,
    currentPolygon,
    addSelection,
    addPointToPolygon,
    completePolygon,
    clearCurrentPolygon,
    startDrawing,
    stopDrawing,
    removeSelection
  } = useManualSelection()

  const mapRef = useRef<google.maps.Map | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [currentDrawingMode, setCurrentDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null)
  const currentAreaTypeRef = useRef(currentAreaType) // Keep track of current area type

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  })

  // Map options
  const mapOptions: google.maps.MapOptions = {
    zoom: 20,
    mapTypeId: 'satellite',
    tilt: 0,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true,
    clickableIcons: false
  }

  // Update ref when area type changes
  useEffect(() => {
    currentAreaTypeRef.current = currentAreaType
  }, [currentAreaType])

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMapReady(true)
  }, [])

  // Initialize drawing manager when map is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google) return

    // Create drawing manager if it doesn't exist
    if (!drawingManagerRef.current) {
      drawingManagerRef.current = new google.maps.drawing.DrawingManager({
        drawingControl: false, // We'll use our own controls
        drawingMode: null,
        polygonOptions: {
          fillColor: AREA_COLORS[currentAreaType],
          fillOpacity: 0.4,
          strokeColor: AREA_COLORS[currentAreaType],
          strokeOpacity: 0.8,
          strokeWeight: 2,
          clickable: true,
          editable: true,
          draggable: false
        },
        rectangleOptions: {
          fillColor: AREA_COLORS[currentAreaType],
          fillOpacity: 0.4,
          strokeColor: AREA_COLORS[currentAreaType],
          strokeOpacity: 0.8,
          strokeWeight: 2,
          clickable: true,
          editable: true,
          draggable: false
        }
      })

      drawingManagerRef.current.setMap(mapRef.current)

      // Handle polygon complete
      google.maps.event.addListener(drawingManagerRef.current, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        const path = polygon.getPath()
        const coordinates: Coordinate[] = []
        
        for (let i = 0; i < path.getLength(); i++) {
          const latLng = path.getAt(i)
          coordinates.push({
            lat: latLng.lat(),
            lng: latLng.lng()
          })
        }

        // Use the ref to get the current area type
        addSelection(coordinates, currentAreaTypeRef.current)
        polygon.setMap(null) // Remove the drawing polygon
        drawingManagerRef.current?.setDrawingMode(null)
        setCurrentDrawingMode(null)
      })

      // Handle rectangle complete
      google.maps.event.addListener(drawingManagerRef.current, 'rectanglecomplete', (rectangle: google.maps.Rectangle) => {
        const bounds = rectangle.getBounds()
        if (bounds) {
          const ne = bounds.getNorthEast()
          const sw = bounds.getSouthWest()
          
          const coordinates = rectangleToPolygon(
            { lat: sw.lat(), lng: sw.lng() },
            { lat: ne.lat(), lng: ne.lng() }
          )

          // Use the ref to get the current area type
          addSelection(coordinates, currentAreaTypeRef.current)
          rectangle.setMap(null) // Remove the drawing rectangle
          drawingManagerRef.current?.setDrawingMode(null)
          setCurrentDrawingMode(null)
        }
      })
    }

    // Update drawing manager options when area type changes
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({
        polygonOptions: {
          fillColor: AREA_COLORS[currentAreaType],
          fillOpacity: 0.4,
          strokeColor: AREA_COLORS[currentAreaType],
          strokeOpacity: 0.8,
          strokeWeight: 2,
          clickable: true,
          editable: true
        },
        rectangleOptions: {
          fillColor: AREA_COLORS[currentAreaType],
          fillOpacity: 0.4,
          strokeColor: AREA_COLORS[currentAreaType],
          strokeOpacity: 0.8,
          strokeWeight: 2,
          clickable: true,
          editable: true
        }
      })
    }
  }, [mapReady, addSelection]) // Removed currentAreaType since we use ref

  // Handle drawing mode changes
  useEffect(() => {
    if (!drawingManagerRef.current) return

    if (isDrawing) {
      const drawingMode = currentTool === 'polygon' 
        ? google.maps.drawing.OverlayType.POLYGON
        : google.maps.drawing.OverlayType.RECTANGLE
      
      drawingManagerRef.current.setDrawingMode(drawingMode)
      setCurrentDrawingMode(drawingMode)
    } else {
      drawingManagerRef.current.setDrawingMode(null)
      setCurrentDrawingMode(null)
    }
  }, [isDrawing, currentTool])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        clearCurrentPolygon()
        stopDrawing()
        if (drawingManagerRef.current) {
          drawingManagerRef.current.setDrawingMode(null)
          setCurrentDrawingMode(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isDrawing, clearCurrentPolygon, stopDrawing])

  if (loadError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
        <div className="text-red-600">Error loading Google Maps</div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Only show overlay in manual or hybrid mode
  if (mode === 'ai') return null

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <div className="relative w-full h-full pointer-events-auto">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '500px' }}
          center={center}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {/* Render existing selections */}
          {selections.map((selection) => (
            <Polygon
              key={selection.id}
              paths={selection.polygon}
              options={{
                fillColor: selection.color,
                fillOpacity: 0.4,
                strokeColor: selection.color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                clickable: true,
                editable: false
              }}
              onClick={() => {
                if (window.confirm(`Remove this ${selection.type} selection?`)) {
                  removeSelection(selection.id)
                }
              }}
            />
          ))}

          {/* Render current drawing polygon */}
          {currentPolygon.length > 0 && (
            <Polygon
              paths={currentPolygon}
              options={{
                fillColor: AREA_COLORS[currentAreaType],
                fillOpacity: 0.2,
                strokeColor: AREA_COLORS[currentAreaType],
                strokeOpacity: 1,
                strokeWeight: 2
              }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  )
}