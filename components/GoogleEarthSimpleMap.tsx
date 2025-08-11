'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Polygon, Marker, useJsApiLoader } from '@react-google-maps/api'
import { Coordinate } from '@/types/manualSelection'
import { GoogleEarthAccurateMeasurement } from '@/lib/measurement/GoogleEarthAccurateMeasurement'
import { WOODBINE_PROPERTY } from '@/lib/measurement/GoogleEarthPropertyData'
import { Ruler, MapPin, Check, X } from 'lucide-react'

const libraries = ['drawing', 'geometry', 'places', 'visualization'] as const

interface GoogleEarthSimpleMapProps {
  center?: { lat: number; lng: number }
  address?: string
  onMeasurementComplete?: (data: any) => void
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

export default function GoogleEarthSimpleMap({ 
  center = WOODBINE_PROPERTY.center,
  address = WOODBINE_PROPERTY.address,
  onMeasurementComplete 
}: GoogleEarthSimpleMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any
  })
  
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const measurementService = useRef<GoogleEarthAccurateMeasurement>(new GoogleEarthAccurateMeasurement())
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [vertices, setVertices] = useState<Coordinate[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<any>(null)
  const [mapType, setMapType] = useState<string>('satellite')
  
  // Map options - optimized zoom level for property focus matching Google Earth
  const mapOptions = {
    zoom: 20, // Optimal zoom for property-level detail matching screenshot
    mapTypeId: mapType,
    tilt: 0,
    heading: 0,
    zoomControl: true,
    mapTypeControl: false, // We'll use our own
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true,
    gestureHandling: 'greedy', // Allow all gestures
    minZoom: 19, // Don't allow zooming out too far
    maxZoom: 22, // Allow maximum detail
    // Request high-resolution imagery
    clickableIcons: false,
    disableDefaultUI: false,
    restriction: {
      // Restrict panning to stay focused on property area - tighter bounds
      latLngBounds: {
        north: center.lat + 0.0015,
        south: center.lat - 0.0015,
        east: center.lng + 0.0025,
        west: center.lng - 0.0025
      },
      strictBounds: false
    }
  }
  
  // Initialize map
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])
  
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
    
    // Add click listener
    const clickListener = mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newVertex = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        setVertices(prev => [...prev, newVertex])
      }
    })
    
    // Store listener for cleanup
    mapRef.current.set('clickListener', clickListener)
  }, [])
  
  // Complete drawing
  const completeDrawing = useCallback(() => {
    if (!mapRef.current) return
    
    setIsDrawing(false)
    
    // Reset cursor
    mapRef.current.setOptions({ draggableCursor: null })
    
    // Remove click listener
    const listener = mapRef.current.get('clickListener')
    if (listener) {
      google.maps.event.removeListener(listener)
    }
    
    // Create polygon if we have vertices
    if (vertices.length >= 3) {
      const polygon = new google.maps.Polygon({
        paths: vertices,
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
      
      // Calculate measurement
      const measurement = measurementService.current.getMeasurementSummary(vertices)
      setCurrentMeasurement(measurement)
      
      if (onMeasurementComplete) {
        onMeasurementComplete(measurement)
      }
      
      // Add edit listeners
      google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
        const path = polygon.getPath()
        const newVertices: Coordinate[] = []
        path.forEach(latLng => {
          newVertices.push({ lat: latLng.lat(), lng: latLng.lng() })
        })
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
    const listener = mapRef.current.get('clickListener')
    if (listener) {
      google.maps.event.removeListener(listener)
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
      const listener = mapRef.current.get('clickListener')
      if (listener) {
        google.maps.event.removeListener(listener)
      }
    }
  }, [])
  
  // Load test property
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
        fillOpacity: 0.3,
        strokeColor: '#FFFF00',
        strokeOpacity: 1,
        strokeWeight: 2,
        map: mapRef.current,
        geodesic: true,
        editable: true
      })
      
      polygonRef.current = polygon
      
      // Fit bounds with padding for tight focus on property
      const bounds = new google.maps.LatLngBounds()
      testVertices.forEach(v => bounds.extend(new google.maps.LatLng(v.lat, v.lng)))
      mapRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      })
      // After fitting, ensure optimal zoom for property view
      setTimeout(() => {
        const currentZoom:any = mapRef?.current?.getZoom()
        if (currentZoom < 20) {
          mapRef?.current?.setZoom(20)
        }
      }, 100)
      
      // Calculate measurement
      const measurement = measurementService.current.getMeasurementSummary(testVertices)
      setCurrentMeasurement(measurement)
      
      if (onMeasurementComplete) {
        onMeasurementComplete(measurement)
      }
    }
  }, [onMeasurementComplete])
  
  // Update polygon when vertices change
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
          fillOpacity: 0.3,
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
    return <div className="flex items-center justify-center h-full">Loading Google Maps...</div>
  }
  
  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={20}
        options={mapOptions}
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
              fontWeight: 'bold'
            }}
          />
        ))}
      </GoogleMap>
      
      {/* Controls */}
      <div className="absolute top-4 left-4 space-y-2">
        {/* Tool buttons */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="flex gap-1">
            {!isDrawing ? (
              <>
                <button
                  onClick={startDrawing}
                  className="p-2 rounded hover:bg-gray-100"
                  title="Start measuring"
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
              </>
            ) : (
              <>
                <button
                  onClick={completeDrawing}
                  className="p-2 rounded hover:bg-gray-100 text-green-600"
                  title="Complete"
                  disabled={vertices.length < 3}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={cancelDrawing}
                  className="p-2 rounded hover:bg-gray-100 text-red-600"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
            {currentMeasurement && !isDrawing && (
              <button
                onClick={clearAll}
                className="p-2 rounded hover:bg-gray-100 text-gray-600"
                title="Clear"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Map type selector */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
            className="text-sm outline-none"
          >
            <option value="satellite">Satellite</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
            <option value="roadmap">Roadmap</option>
          </select>
        </div>
      </div>
      
      {/* Address */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-sm">
        <p className="text-sm font-medium">{address}</p>
      </div>
      
      {/* Drawing instructions */}
      {isDrawing && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
          Click on the map to add points ({vertices.length} point{vertices.length !== 1 ? 's' : ''})
          {vertices.length >= 3 && ' - Click ✓ to complete'}
        </div>
      )}
      
      {/* Measurement display */}
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
              <span className="text-sm text-gray-600">Perimeter:</span>
              <span className="font-bold">
                {currentMeasurement.perimeter.formatted}
              </span>
            </div>
            <div className="text-xs text-gray-500 pt-1 space-y-1">
              <div>• {currentMeasurement.area.squareMeters.toFixed(2)} m² ({currentMeasurement.area.squareFeet.toLocaleString()} ft²)</div>
              <div>• {currentMeasurement.perimeter.meters.toFixed(2)} m ({currentMeasurement.perimeter.feet.toFixed(2)} ft)</div>
              {currentMeasurement.area.acres > 0.01 && (
                <div>• {currentMeasurement.area.acres.toFixed(3)} acres</div>
              )}
            </div>
            
            {/* Google Earth comparison */}
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-600">Expected (Google Earth):</div>
              <div className="text-xs space-y-1">
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