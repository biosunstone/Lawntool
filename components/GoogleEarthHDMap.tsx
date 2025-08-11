'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Polygon, Marker, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import { Coordinate } from '@/types/manualSelection'
import { GoogleEarthAccurateMeasurement } from '@/lib/measurement/GoogleEarthAccurateMeasurement'
import { WOODBINE_PROPERTY } from '@/lib/measurement/GoogleEarthPropertyData'
import { Ruler, MapPin, Check, X, Maximize2, Layers } from 'lucide-react'

const libraries: ('drawing' | 'geometry' | 'places' | 'visualization')[] = ['drawing', 'geometry', 'places', 'visualization']

interface GoogleEarthHDMapProps {
  center?: { lat: number; lng: number }
  address?: string
  onMeasurementComplete?: (data: any) => void
  initialZoom?: number
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

// High-definition map configuration
const HD_MAP_CONFIG = {
  // Optimal zoom level matching Google Earth screenshot (close property view)
  DEFAULT_ZOOM: 20,
  MIN_ZOOM: 19,
  MAX_ZOOM: 22,
  
  // High-resolution imagery settings
  TILE_SIZE: 512, // Request larger tiles for better quality
  SCALE: 2, // Request 2x resolution tiles
  
  // Property focus bounds (tighter for better detail)
  BOUNDS_PADDING: {
    north: 0.0012,
    south: 0.0012,
    east: 0.002,
    west: 0.002
  }
}

export default function GoogleEarthHDMap({ 
  center = WOODBINE_PROPERTY.center,
  address = WOODBINE_PROPERTY.address,
  onMeasurementComplete,
  initialZoom = HD_MAP_CONFIG.DEFAULT_ZOOM
}: GoogleEarthHDMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    // Request high-DPI version
    version: 'weekly',
    language: 'en',
    region: 'US'
  })
  
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const measurementService = useRef<GoogleEarthAccurateMeasurement>(new GoogleEarthAccurateMeasurement())
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [vertices, setVertices] = useState<Coordinate[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<any>(null)
  const [mapType, setMapType] = useState<string>('satellite')
  const [showLabels, setShowLabels] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(initialZoom)
  
  // High-definition map options
  const getMapOptions = useCallback(() => {
    const options: google.maps.MapOptions = {
      zoom: initialZoom,
      mapTypeId: mapType,
      tilt: 0, // No tilt for accurate top-down view
      heading: 0, // North-up orientation
      
      // UI controls
      zoomControl: true,
      mapTypeControl: false, // Custom control
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      
      // Control positions
      zoomControlOptions: {
        position: window.google?.maps?.ControlPosition?.RIGHT_CENTER
      },
      
      // Gesture handling
      gestureHandling: 'greedy',
      
      // Zoom constraints
      minZoom: HD_MAP_CONFIG.MIN_ZOOM,
      maxZoom: HD_MAP_CONFIG.MAX_ZOOM,
      
      // High-quality rendering
      clickableIcons: false,
      disableDefaultUI: false,
      
      // Restrict to property area for better focus
      restriction: {
        latLngBounds: {
          north: center.lat + HD_MAP_CONFIG.BOUNDS_PADDING.north,
          south: center.lat - HD_MAP_CONFIG.BOUNDS_PADDING.south,
          east: center.lng + HD_MAP_CONFIG.BOUNDS_PADDING.east,
          west: center.lng - HD_MAP_CONFIG.BOUNDS_PADDING.west
        },
        strictBounds: false
      },
      
      // Label visibility
      styles: showLabels ? [] : [
        {
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          elementType: 'labels.icon',
          stylers: [{ visibility: 'off' }]
        }
      ]
    }
    
    return options
  }, [mapType, showLabels, center, initialZoom])
  
  // Initialize map with HD settings
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    
    // Force high-resolution tiles
    const mapDiv = map.getDiv()
    if (mapDiv) {
      mapDiv.style.imageRendering = 'crisp-edges'
      mapDiv.style.imageRendering = '-webkit-optimize-contrast'
    }
    
    // Add zoom change listener
    map.addListener('zoom_changed', () => {
      setCurrentZoom(map.getZoom() || HD_MAP_CONFIG.DEFAULT_ZOOM)
    })
    
    // Ensure optimal initial zoom
    setTimeout(() => {
      map.setZoom(initialZoom)
      map.setCenter(center)
    }, 100)
  }, [center, initialZoom])
  
  // Start drawing mode
  const startDrawing = useCallback(() => {
    if (!mapRef.current) return
    
    setIsDrawing(true)
    setVertices([])
    setCurrentMeasurement(null)
    
    // Clear existing polygon
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    
    // Change cursor
    mapRef.current.setOptions({ draggableCursor: 'crosshair' })
    
    // Remove any existing listener
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current)
    }
    
    // Add click listener
    clickListenerRef.current = mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newVertex = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        setVertices(prev => [...prev, newVertex])
      }
    })
  }, [])
  
  // Complete drawing
  const completeDrawing = useCallback(() => {
    if (!mapRef.current) return
    
    setIsDrawing(false)
    
    // Reset cursor
    mapRef.current.setOptions({ draggableCursor: null })
    
    // Remove click listener
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current)
      clickListenerRef.current = null
    }
    
    // Create final polygon if we have vertices
    if (vertices.length >= 3) {
      const polygon = new google.maps.Polygon({
        paths: vertices,
        fillColor: '#FFFF00',
        fillOpacity: 0.25,
        strokeColor: '#FFFF00',
        strokeOpacity: 1,
        strokeWeight: 2,
        map: mapRef.current,
        geodesic: true,
        editable: true,
        draggable: false
      })
      
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
      }
      polygonRef.current = polygon
      
      // Calculate measurement
      const measurement = measurementService.current.getMeasurementSummary(vertices)
      setCurrentMeasurement(measurement)
      
      if (onMeasurementComplete) {
        onMeasurementComplete(measurement)
      }
      
      // Add edit listeners
      const path = polygon.getPath()
      google.maps.event.addListener(path, 'set_at', () => {
        const newVertices: Coordinate[] = []
        path.forEach(latLng => {
          newVertices.push({ lat: latLng.lat(), lng: latLng.lng() })
        })
        setVertices(newVertices)
        const measurement = measurementService.current.getMeasurementSummary(newVertices)
        setCurrentMeasurement(measurement)
        if (onMeasurementComplete) {
          onMeasurementComplete(measurement)
        }
      })
      
      google.maps.event.addListener(path, 'insert_at', () => {
        const newVertices: Coordinate[] = []
        path.forEach(latLng => {
          newVertices.push({ lat: latLng.lat(), lng: latLng.lng() })
        })
        setVertices(newVertices)
        const measurement = measurementService.current.getMeasurementSummary(newVertices)
        setCurrentMeasurement(measurement)
        if (onMeasurementComplete) {
          onMeasurementComplete(measurement)
        }
      })
    }
  }, [vertices, onMeasurementComplete])
  
  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    if (!mapRef.current) return
    
    setIsDrawing(false)
    setVertices([])
    
    // Reset cursor
    mapRef.current.setOptions({ draggableCursor: null })
    
    // Remove click listener
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current)
      clickListenerRef.current = null
    }
  }, [])
  
  // Clear all
  const clearAll = useCallback(() => {
    setVertices([])
    setCurrentMeasurement(null)
    setIsDrawing(false)
    
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    
    if (mapRef.current) {
      mapRef.current.setOptions({ draggableCursor: null })
    }
    
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current)
      clickListenerRef.current = null
    }
  }, [])
  
  // Load test property with optimal zoom
  const loadTestProperty = useCallback(() => {
    const testVertices = WOODBINE_PROPERTY.coordinates
    setVertices(testVertices)
    
    if (mapRef.current) {
      // Clear existing
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
      }
      
      // Create new polygon
      const polygon = new google.maps.Polygon({
        paths: testVertices,
        fillColor: '#FFFF00',
        fillOpacity: 0.25,
        strokeColor: '#FFFF00',
        strokeOpacity: 1,
        strokeWeight: 2,
        map: mapRef.current,
        geodesic: true,
        editable: true
      })
      
      polygonRef.current = polygon
      
      // Fit bounds with optimal padding for property focus
      const bounds = new google.maps.LatLngBounds()
      testVertices.forEach(v => bounds.extend(new google.maps.LatLng(v.lat, v.lng)))
      
      // Fit to bounds first
      mapRef.current.fitBounds(bounds, {
        top: 80,
        right: 80,
        bottom: 80,
        left: 80
      })
      
      // Then ensure optimal zoom level matching screenshot
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.setZoom(HD_MAP_CONFIG.DEFAULT_ZOOM)
        }
      }, 200)
      
      // Calculate measurement
      const measurement = measurementService.current.getMeasurementSummary(testVertices)
      setCurrentMeasurement(measurement)
      
      if (onMeasurementComplete) {
        onMeasurementComplete(measurement)
      }
    }
  }, [onMeasurementComplete])
  
  // Update polygon while drawing
  useEffect(() => {
    if (!mapRef.current || vertices.length < 3) return
    
    if (isDrawing) {
      // Update temporary polygon while drawing
      if (polygonRef.current) {
        polygonRef.current.setPath(vertices)
      } else {
        const polygon = new google.maps.Polygon({
          paths: vertices,
          fillColor: '#FFFF00',
          fillOpacity: 0.25,
          strokeColor: '#FFFF00',
          strokeOpacity: 1,
          strokeWeight: 2,
          map: mapRef.current,
          geodesic: true
        })
        polygonRef.current = polygon
      }
      
      // Update measurement
      const measurement = measurementService.current.getMeasurementSummary(vertices)
      setCurrentMeasurement(measurement)
    }
  }, [vertices, isDrawing])
  
  if (loadError) {
    return <div className="flex items-center justify-center h-full text-red-600">Error loading maps</div>
  }
  
  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full">Loading high-definition map...</div>
  }
  
  return (
    <div className="relative h-full bg-gray-900">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={HD_MAP_CONFIG.DEFAULT_ZOOM}
        options={getMapOptions()}
        onLoad={onMapLoad}
      >
        {/* Vertex markers */}
        {vertices.map((vertex, index) => (
          <Marker
            key={index}
            position={vertex}
            label={{
              text: String(index + 1),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              className: 'font-mono'
            }}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: 8,
              fillColor: '#FFFF00',
              fillOpacity: 0.9,
              strokeColor: '#000000',
              strokeWeight: 1.5
            }}
          />
        ))}
        
        {/* Measurement lines between vertices while drawing */}
        {isDrawing && vertices.length >= 2 && (
          <Polygon
            paths={[...vertices, vertices[0]]}
            options={{
              fillColor: 'transparent',
              strokeColor: '#FFFF00',
              strokeOpacity: 1,
              strokeWeight: 2,
              geodesic: true
            }}
          />
        )}
      </GoogleMap>
      
      {/* Google Earth style controls */}
      <div className="absolute top-4 left-4 space-y-2">
        {/* Tool buttons */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="flex gap-1">
            {!isDrawing ? (
              <>
                <button
                  onClick={startDrawing}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  title="Start measuring"
                >
                  <Ruler className="w-5 h-5" />
                </button>
                <button
                  onClick={loadTestProperty}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  title="Load test property"
                >
                  <MapPin className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={completeDrawing}
                  className="p-2 rounded hover:bg-gray-100 text-green-600 transition-colors"
                  title="Complete"
                  disabled={vertices.length < 3}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={cancelDrawing}
                  className="p-2 rounded hover:bg-gray-100 text-red-600 transition-colors"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
            {currentMeasurement && !isDrawing && (
              <button
                onClick={clearAll}
                className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                title="Clear"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Map type and labels */}
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
            className="text-sm outline-none w-full px-2 py-1 rounded"
          >
            <option value="satellite">Satellite</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer px-2">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded"
            />
            <span>Labels</span>
          </label>
        </div>
        
        {/* Zoom indicator */}
        <div className="bg-white rounded-lg shadow-lg px-3 py-2">
          <div className="text-xs text-gray-600">Zoom</div>
          <div className="font-mono font-bold">{currentZoom}</div>
        </div>
      </div>
      
      {/* Address */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-sm">
        <p className="text-sm font-medium">{address}</p>
        <p className="text-xs text-gray-500 mt-1">High-Definition Mode</p>
      </div>
      
      {/* Drawing instructions */}
      {isDrawing && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg shadow-xl">
          <div className="text-sm">
            Click on the map to add points ({vertices.length} point{vertices.length !== 1 ? 's' : ''})
            {vertices.length >= 3 && ' - Click ✓ to complete'}
          </div>
        </div>
      )}
      
      {/* Measurement display - Google Earth style */}
      {currentMeasurement && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-md">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Measurement</h3>
          </div>
          
          <div className="space-y-3">
            {/* Area */}
            <div className="bg-gray-50 rounded p-3">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-gray-600">Total area:</span>
                <span className="text-lg font-bold text-gray-900">
                  {currentMeasurement.area.formatted}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>• {currentMeasurement.area.squareMeters.toFixed(2)} m²</div>
                <div>• {currentMeasurement.area.squareFeet.toLocaleString()} ft²</div>
                {currentMeasurement.area.acres > 0.01 && (
                  <div>• {currentMeasurement.area.acres.toFixed(3)} acres</div>
                )}
              </div>
            </div>
            
            {/* Perimeter */}
            <div className="bg-gray-50 rounded p-3">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-gray-600">Perimeter:</span>
                <span className="text-lg font-bold text-gray-900">
                  {currentMeasurement.perimeter.formatted}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>• {currentMeasurement.perimeter.meters.toFixed(2)} m</div>
                <div>• {currentMeasurement.perimeter.feet.toFixed(2)} ft</div>
              </div>
            </div>
            
            {/* Google Earth comparison */}
            <div className="border-t pt-3">
              <div className="text-xs text-gray-600 mb-1">Expected values (Google Earth):</div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>• Perimeter: {WOODBINE_PROPERTY.expected.perimeter.feet} ft</div>
                <div>• Area: {WOODBINE_PROPERTY.expected.area.squareFeet.toLocaleString()} ft²</div>
                <div>• Acres: {WOODBINE_PROPERTY.expected.area.acres}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}