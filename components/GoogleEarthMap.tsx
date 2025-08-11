'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Polygon, Polyline, Marker, useLoadScript } from '@react-google-maps/api'
import { Coordinate } from '@/types/manualSelection'
import { GoogleEarthAccurateMeasurement } from '@/lib/measurement/GoogleEarthAccurateMeasurement'
import { WOODBINE_PROPERTY } from '@/lib/measurement/GoogleEarthPropertyData'
import { Ruler, MapPin, Square, Navigation } from 'lucide-react'

const libraries: any[] = ['drawing', 'geometry', 'places', 'visualization']

interface GoogleEarthMapProps {
  center: { lat: number; lng: number }
  address?: string
  onMeasurementComplete?: (data: any) => void
}

export default function GoogleEarthMap({ 
  center, 
  address = '12072 Woodbine Avenue, Gormley, ON L0H 1G0',
  onMeasurementComplete 
}: GoogleEarthMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const measurementService = useRef<GoogleEarthAccurateMeasurement>(new GoogleEarthAccurateMeasurement())
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [vertices, setVertices] = useState<Coordinate[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<any>(null)
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'terrain'>('satellite')
  const [showLabels, setShowLabels] = useState(true)
  
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  })
  
  // Map configuration to match Google Earth exactly
  const getMapOptions = useCallback((): google.maps.MapOptions => {
    if (!window.google?.maps) {
      return {
        zoom: 20, // Optimal zoom for property focus matching screenshot
        mapTypeId: mapType,
        tilt: 0,
        heading: 0,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: true,
        fullscreenControl: true,
        minZoom: 19,
        maxZoom: 22
      }
    }
    
    return {
      zoom: 20, // Optimal zoom level matching Google Earth screenshot
      mapTypeId: mapType,
      tilt: 0, // No tilt for accurate measurement
      heading: 0, // North-up orientation
      
      // UI controls matching Google Earth
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: true,
      fullscreenControl: true,
      
      // Control positions
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_LEFT,
        mapTypeIds: ['satellite', 'hybrid', 'terrain', 'roadmap']
      },
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      
      // Styles to match Google Earth appearance
      styles: showLabels ? [] : [
        {
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      
      // Additional options for property focus with high-def imagery
      gestureHandling: 'greedy',
      minZoom: 19, // Don't zoom out too far from property
      maxZoom: 22, // Allow maximum zoom for detail
      // Request high-resolution tiles
      clickableIcons: false,
      disableDefaultUI: false,
      restriction: {
        // Keep map focused on property area - tighter bounds
        latLngBounds: {
          north: center.lat + 0.0015,
          south: center.lat - 0.0015,
          east: center.lng + 0.0025,
          west: center.lng - 0.0025
        },
        strictBounds: false
      }
    }
  }, [mapType, showLabels, center])
  
  // Initialize map
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    
    // Only set up drawing manager if google.maps.drawing is available
    if (window.google?.maps?.drawing) {
      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
          fillColor: '#FFFF00',
          fillOpacity: 0.3,
          strokeColor: '#FFFF00',
          strokeOpacity: 1,
          strokeWeight: 2,
          clickable: true,
          editable: true,
          draggable: false,
          geodesic: true // Important for accurate Earth measurements
        }
      })
      
      drawingManager.setMap(map)
      
      // Handle polygon completion
      google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        handlePolygonComplete(polygon)
        drawingManager.setDrawingMode(null)
      })
    }
    
    // Add custom measurement controls
    addMeasurementControls(map)
  }, [])
  
  // Add Google Earth-style measurement controls
  const addMeasurementControls = (map: google.maps.Map) => {
    // Create ruler control
    const rulerControl = document.createElement('div')
    rulerControl.style.backgroundColor = '#fff'
    rulerControl.style.border = '2px solid #fff'
    rulerControl.style.borderRadius = '3px'
    rulerControl.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)'
    rulerControl.style.cursor = 'pointer'
    rulerControl.style.marginTop = '10px'
    rulerControl.style.marginLeft = '10px'
    rulerControl.style.padding = '5px'
    rulerControl.title = 'Measure distance and area'
    
    const rulerIcon = document.createElement('div')
    rulerIcon.style.width = '24px'
    rulerIcon.style.height = '24px'
    rulerIcon.innerHTML = '📏'
    rulerControl.appendChild(rulerIcon)
    
    rulerControl.addEventListener('click', () => {
      startMeasurement()
    })
    
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(rulerControl)
  }
  
  // Start measurement mode
  const startMeasurement = useCallback(() => {
    setIsDrawing(true)
    setVertices([])
    setCurrentMeasurement(null)
    
    if (mapRef.current) {
      // Change cursor to crosshair
      mapRef.current.setOptions({ draggableCursor: 'crosshair' })
      
      // Clear any existing polygon
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
      }
      
      // Set up click listener for adding vertices
      const clickListener = mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          addVertex({ lat: e.latLng.lat(), lng: e.latLng.lng() })
        }
      })
      
      // Store listener for cleanup
      mapRef.current.set('measureClickListener', clickListener)
    }
  }, [])
  
  // Add vertex to polygon
  const addVertex = useCallback((coordinate: Coordinate) => {
    const newVertices = [...vertices, coordinate]
    setVertices(newVertices)
    
    // Update or create polygon
    if (newVertices.length >= 3) {
      if (polygonRef.current) {
        polygonRef.current.setPath(newVertices)
      } else {
        const polygon = new google.maps.Polygon({
          paths: newVertices,
          fillColor: '#FFFF00',
          fillOpacity: 0.3,
          strokeColor: '#FFFF00',
          strokeOpacity: 1,
          strokeWeight: 2,
          map: mapRef.current,
          geodesic: true
        })
        polygonRef.current = polygon
      }
      
      // Calculate measurement
      updateMeasurement(newVertices)
    }
  }, [vertices])
  
  // Update measurement display
  const updateMeasurement = useCallback((coords: Coordinate[]) => {
    const measurement = measurementService.current.getMeasurementSummary(coords)
    setCurrentMeasurement(measurement)
    
    if (onMeasurementComplete) {
      onMeasurementComplete(measurement)
    }
  }, [onMeasurementComplete])
  
  // Complete measurement
  const completeMeasurement = useCallback(() => {
    setIsDrawing(false)
    
    if (mapRef.current) {
      // Reset cursor
      mapRef.current.setOptions({ draggableCursor: null })
      
      // Remove click listener
      const listener = mapRef.current.get('measureClickListener')
      if (listener) {
        google.maps.event.removeListener(listener)
      }
    }
    
    // Make polygon editable
    if (polygonRef.current) {
      polygonRef.current.setEditable(true)
      
      // Update measurement on edit
      google.maps.event.addListener(polygonRef.current.getPath(), 'set_at', () => {
        const path = polygonRef.current!.getPath()
        const coords: Coordinate[] = []
        path.forEach((latLng) => {
          coords.push({ lat: latLng.lat(), lng: latLng.lng() })
        })
        updateMeasurement(coords)
      })
      
      google.maps.event.addListener(polygonRef.current.getPath(), 'insert_at', () => {
        const path = polygonRef.current!.getPath()
        const coords: Coordinate[] = []
        path.forEach((latLng) => {
          coords.push({ lat: latLng.lat(), lng: latLng.lng() })
        })
        updateMeasurement(coords)
      })
    }
  }, [updateMeasurement])
  
  // Clear measurement
  const clearMeasurement = useCallback(() => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    setVertices([])
    setCurrentMeasurement(null)
    setIsDrawing(false)
    
    if (mapRef.current) {
      mapRef.current.setOptions({ draggableCursor: null })
      const listener = mapRef.current.get('measureClickListener')
      if (listener) {
        google.maps.event.removeListener(listener)
      }
    }
  }, [])
  
  // Handle polygon completion
  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    polygonRef.current = polygon
    
    const path = polygon.getPath()
    const coords: Coordinate[] = []
    
    path.forEach((latLng) => {
      coords.push({ lat: latLng.lat(), lng: latLng.lng() })
    })
    
    setVertices(coords)
    updateMeasurement(coords)
    completeMeasurement()
  }, [updateMeasurement, completeMeasurement])
  
  // Test with known coordinates (matching your Google Earth screenshot)
  const loadTestProperty = useCallback(() => {
    // Use accurate coordinates from Google Earth data
    const testCoordinates = WOODBINE_PROPERTY.coordinates
    
    setVertices(testCoordinates)
    
    if (mapRef.current) {
      const polygon = new google.maps.Polygon({
        paths: testCoordinates,
        fillColor: '#FFFF00',
        fillOpacity: 0.3,
        strokeColor: '#FFFF00',
        strokeOpacity: 1,
        strokeWeight: 2,
        map: mapRef.current,
        geodesic: true,
        editable: true
      })
      
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
      }
      polygonRef.current = polygon
      
      // Center map on property with tight zoom
      const bounds = new google.maps.LatLngBounds()
      testCoordinates.forEach(coord => {
        bounds.extend(new google.maps.LatLng(coord.lat, coord.lng))
      })
      mapRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      })
      
      // Ensure we're zoomed in enough to focus on single property
      setTimeout(() => {
        const currentZoom:any = mapRef?.current?.getZoom()
        if (currentZoom < 20) {
          mapRef?.current?.setZoom(20)
        }
      }, 100)
      
      updateMeasurement(testCoordinates)
    }
  }, [updateMeasurement])
  
  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full">Loading Google Earth view...</div>
  }
  
  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        options={getMapOptions()}
        onLoad={onMapLoad}
      >
        {/* Show markers for vertices when drawing */}
        {isDrawing && window.google?.maps && vertices.map((vertex, index) => (
          <Marker
            key={index}
            position={vertex}
            label={{
              text: String(index + 1),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#FFFF00',
              fillOpacity: 1,
              strokeColor: '#000',
              strokeWeight: 1
            }}
          />
        ))}
      </GoogleMap>
      
      {/* Google Earth-style controls */}
      <div className="absolute top-4 left-4 space-y-2">
        {/* Measurement tools */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="flex gap-1">
            <button
              onClick={startMeasurement}
              disabled={isDrawing}
              className={`p-2 rounded hover:bg-gray-100 ${isDrawing ? 'bg-blue-100' : ''}`}
              title="Measure distance"
            >
              <Ruler className="w-5 h-5" />
            </button>
            <button
              onClick={loadTestProperty}
              className="p-2 rounded hover:bg-gray-100"
              title="Load test property"
            >
              <MapPin className="w-5 h-5" />
            </button>
            {isDrawing && (
              <>
                <button
                  onClick={completeMeasurement}
                  className="p-2 rounded hover:bg-gray-100 text-green-600"
                  title="Complete measurement"
                >
                  ✓
                </button>
                <button
                  onClick={clearMeasurement}
                  className="p-2 rounded hover:bg-gray-100 text-red-600"
                  title="Clear measurement"
                >
                  ✗
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Map type selector */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <select 
            value={mapType}
            onChange={(e) => setMapType(e.target.value as any)}
            className="text-sm"
          >
            <option value="satellite">Satellite</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>
        
        {/* Labels toggle */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Labels
          </label>
        </div>
      </div>
      
      {/* Address display */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-sm">
        <p className="text-sm font-medium">{address}</p>
      </div>
      
      {/* Measurement display (Google Earth style) */}
      {currentMeasurement && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
          <div className="space-y-2">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-gray-600">Total area:</span>
              <span className="font-bold">
                {currentMeasurement.area.formatted}
              </span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-gray-600">Total distance:</span>
              <span className="font-bold">
                {currentMeasurement.perimeter.formatted}
              </span>
            </div>
            <div className="text-xs text-gray-500 pt-1">
              <div>Area: {currentMeasurement.area.squareMeters.toFixed(2)} m² ({(currentMeasurement.area.squareFeet).toLocaleString()} ft²)</div>
              <div>Perimeter: {currentMeasurement.perimeter.meters.toFixed(2)} m ({currentMeasurement.perimeter.feet.toFixed(2)} ft)</div>
              {currentMeasurement.area.acres > 0.01 && (
                <div>Acres: {currentMeasurement.area.acres.toFixed(3)}</div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <button
              onClick={clearMeasurement}
              className="flex-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Clear
            </button>
            <button
              onClick={() => {
                if (onMeasurementComplete && currentMeasurement) {
                  onMeasurementComplete({
                    ...currentMeasurement,
                    vertices,
                    timestamp: new Date()
                  })
                }
              }}
              className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              Save
            </button>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {isDrawing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
            Click on the map to add measurement points
          </div>
        </div>
      )}
    </div>
  )
}