'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Polygon, Marker, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import { Coordinate } from '@/types/manualSelection'
import { GoogleEarthAccurateMeasurement } from '@/lib/measurement/GoogleEarthAccurateMeasurement'
import { PropertyZoomManager } from '@/lib/googleEarth/propertyZoomManager'
import { 
  Maximize2, Eye, Home, Trees, Pin, Calendar, Loader2, 
  ZoomIn, ZoomOut, RotateCw, Ruler, Save, Info
} from 'lucide-react'

const libraries: ('drawing' | 'geometry' | 'places' | 'visualization')[] = ['drawing', 'geometry', 'places', 'visualization']

interface DroneViewPropertyMapProps {
  propertyPolygon?: Coordinate[]
  center?: { lat: number; lng: number }
  address?: string
  onMeasurementComplete?: (data: any) => void
  autoCenter?: boolean
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

// HD Map configuration for drone-like quality
const HD_CONFIG = {
  // Maximum quality settings
  TILE_SIZE: 512,
  SCALE: window.devicePixelRatio || 2,
  
  // Imagery options
  IMAGERY_TYPES: [
    { id: 'current', name: 'Current', date: 'Latest available' },
    { id: '2023', name: '2023', date: 'Spring 2023' },
    { id: '2022', name: '2022', date: 'Summer 2022' },
    { id: '2021', name: '2021', date: 'Fall 2021' }
  ],
  
  // Loading states
  TILE_LOAD_TIMEOUT: 3000,
  
  // Smooth zoom settings
  ZOOM_ANIMATION_DURATION: 500,
  PAN_ANIMATION_DURATION: 300
}

export default function DroneViewPropertyMap({
  propertyPolygon = [],
  center,
  address = 'Property Address',
  onMeasurementComplete,
  autoCenter = true
}: DroneViewPropertyMapProps) {
  // Google Maps loader
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    version: 'weekly', // Latest features
    language: 'en',
    region: 'US'
  })
  
  // Refs
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const areaPolygonsRef = useRef<google.maps.Polygon[]>([]) // For area overlays
  const zoomManagerRef = useRef<PropertyZoomManager>(new PropertyZoomManager())
  const measurementServiceRef = useRef<GoogleEarthAccurateMeasurement>(new GoogleEarthAccurateMeasurement())
  const tilesLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoCenterRef = useRef(autoCenter)
  const onMeasurementCompleteRef = useRef(onMeasurementComplete)
  const isInitialLoadRef = useRef(true)
  
  // State
  const [isDrawing, setIsDrawing] = useState(false)
  const [vertices, setVertices] = useState<Coordinate[]>(propertyPolygon)
  const [currentMeasurement, setCurrentMeasurement] = useState<any>(null)
  const [selectedImagery, setSelectedImagery] = useState('current')
  const [currentZoomPreset, setCurrentZoomPreset] = useState('full-property')
  const [isLoadingTiles, setIsLoadingTiles] = useState(false)
  const [mapType, setMapType] = useState('satellite')
  const [showLabels, setShowLabels] = useState(false)
  const [zoomInfo, setZoomInfo] = useState({ level: 20, quality: 'High', description: '' })
  const [showInfo, setShowInfo] = useState(false)
  const [showAreaOverlays, setShowAreaOverlays] = useState(true)
  
  // Ultra HD map options
  const getMapOptions = useCallback((): google.maps.MapOptions => {
    return {
      zoom: 20, // Start with high zoom
      mapTypeId: mapType,
      tilt: 0, // Top-down view for accurate measurement
      heading: 0, // North orientation
      
      // UI Controls
      zoomControl: false, // Custom controls
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      
      // Interaction
      gestureHandling: 'greedy',
      clickableIcons: false,
      disableDefaultUI: false,
      
      // Zoom limits for HD
      minZoom: 17,
      maxZoom: 22,
      
      // Style for HD rendering
      styles: [
        ...(showLabels ? [] : [
          {
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            elementType: 'labels.icon',
            stylers: [{ visibility: 'off' }]
          }
        ]),
        // Enhance satellite imagery contrast
        {
          elementType: 'geometry',
          stylers: [
            { saturation: 5 },
            { lightness: -5 }
          ]
        }
      ]
    }
  }, [mapType, showLabels])
  
  // Initialize map with HD settings
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    zoomManagerRef.current.setMap(map)
    
    // Force high-quality rendering
    const mapDiv = map.getDiv()
    if (mapDiv) {
      // CSS for crisp rendering
      mapDiv.style.imageRendering = 'crisp-edges'
      mapDiv.style.imageRendering = '-webkit-optimize-contrast'
      
      // Add custom class for HD styling
      mapDiv.classList.add('hd-map-container')
    }
    
    // Listen for zoom changes with debouncing to prevent infinite loops
    let zoomTimeout: NodeJS.Timeout | null = null
    map.addListener('zoom_changed', () => {
      if (zoomTimeout) clearTimeout(zoomTimeout)
      zoomTimeout = setTimeout(() => {
        const info = zoomManagerRef.current.getZoomInfo()
        setZoomInfo(info)
      }, 100) // Debounce for 100ms
    })
    
    // Listen for tile loading
    map.addListener('tilesloaded', () => {
      setIsLoadingTiles(false)
      if (tilesLoadingTimeoutRef.current) {
        clearTimeout(tilesLoadingTimeoutRef.current)
      }
    })
    
    // Set initial zoom info
    const initialInfo = zoomManagerRef.current.getZoomInfo()
    setZoomInfo(initialInfo)
  }, [])
  
  // Update refs when props change
  useEffect(() => {
    autoCenterRef.current = autoCenter
  }, [autoCenter])
  
  useEffect(() => {
    onMeasurementCompleteRef.current = onMeasurementComplete
  }, [onMeasurementComplete])
  
  // Load property polygon and auto-center
  const loadPropertyPolygon = useCallback((coords: Coordinate[]) => {
    if (!mapRef.current || coords.length < 3) return
    
    setVertices(coords)
    
    // Clear existing polygon
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
    }
    
    // Create new polygon
    const polygon = new google.maps.Polygon({
      paths: coords,
      fillColor: '#22C55E',
      fillOpacity: 0.15,
      strokeColor: '#16A34A',
      strokeOpacity: 1,
      strokeWeight: 2,
      map: mapRef.current,
      geodesic: true,
      editable: false
    })
    
    polygonRef.current = polygon
    
    // Set polygon in zoom manager
    zoomManagerRef.current.setPropertyPolygon(polygon)
    
    // Auto-center if enabled (use ref to avoid stale closure)
    if (autoCenterRef.current) {
      setTimeout(() => {
        zoomManagerRef.current.autoCenterProperty(true)
      }, 100)
    }
    
    // Calculate measurement
    const measurement = measurementServiceRef.current.getMeasurementSummary(coords)
    setCurrentMeasurement(measurement)
    
    // Create area overlays if enabled
    if (showAreaOverlays) {
      createAreaOverlays(coords)
    }
    
    if (onMeasurementCompleteRef.current) {
      onMeasurementCompleteRef.current(measurement)
    }
  }, [])
  
  // Create area overlays for lawn, driveway, etc.
  const createAreaOverlays = useCallback((propertyCoords: Coordinate[]) => {
    if (!mapRef.current || propertyCoords.length < 3) return
    
    // Clear existing overlays
    areaPolygonsRef.current.forEach(polygon => {
      polygon.setMap(null)
    })
    areaPolygonsRef.current = []
    
    // Simulate different areas (in production, this would use actual detection)
    const bounds = new google.maps.LatLngBounds()
    propertyCoords.forEach(coord => {
      bounds.extend(new google.maps.LatLng(coord.lat, coord.lng))
    })
    
    const center = bounds.getCenter()
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    
    // Create simulated lawn area (front yard)
    const frontYardCoords = [
      { lat: sw.lat(), lng: sw.lng() },
      { lat: sw.lat(), lng: center.lng() },
      { lat: center.lat(), lng: center.lng() },
      { lat: center.lat(), lng: sw.lng() }
    ]
    
    const frontYardPolygon = new google.maps.Polygon({
      paths: frontYardCoords,
      fillColor: '#22C55E',
      fillOpacity: 0.2,
      strokeColor: '#16A34A',
      strokeOpacity: 0.8,
      strokeWeight: 1,
      map: mapRef.current,
      clickable: false
    })
    areaPolygonsRef.current.push(frontYardPolygon)
    
    // Create simulated driveway area
    const drivewayCoords = [
      { lat: center.lat(), lng: sw.lng() },
      { lat: center.lat(), lng: sw.lng() + (ne.lng() - sw.lng()) * 0.2 },
      { lat: ne.lat(), lng: sw.lng() + (ne.lng() - sw.lng()) * 0.2 },
      { lat: ne.lat(), lng: sw.lng() }
    ]
    
    const drivewayPolygon = new google.maps.Polygon({
      paths: drivewayCoords,
      fillColor: '#6B7280',
      fillOpacity: 0.3,
      strokeColor: '#4B5563',
      strokeOpacity: 0.8,
      strokeWeight: 1,
      map: mapRef.current,
      clickable: false
    })
    areaPolygonsRef.current.push(drivewayPolygon)
    
    // Create simulated building area
    const buildingCoords = [
      { lat: center.lat() - (ne.lat() - sw.lat()) * 0.1, lng: center.lng() - (ne.lng() - sw.lng()) * 0.1 },
      { lat: center.lat() - (ne.lat() - sw.lat()) * 0.1, lng: center.lng() + (ne.lng() - sw.lng()) * 0.1 },
      { lat: center.lat() + (ne.lat() - sw.lat()) * 0.1, lng: center.lng() + (ne.lng() - sw.lng()) * 0.1 },
      { lat: center.lat() + (ne.lat() - sw.lat()) * 0.1, lng: center.lng() - (ne.lng() - sw.lng()) * 0.1 }
    ]
    
    const buildingPolygon = new google.maps.Polygon({
      paths: buildingCoords,
      fillColor: '#DC2626',
      fillOpacity: 0.3,
      strokeColor: '#991B1B',
      strokeOpacity: 0.8,
      strokeWeight: 1,
      map: mapRef.current,
      clickable: false
    })
    areaPolygonsRef.current.push(buildingPolygon)
  }, [])
  
  // Handle zoom preset changes
  const handleZoomPreset = useCallback((presetId: string) => {
    setCurrentZoomPreset(presetId)
    
    // Show loading for HD tiles
    setIsLoadingTiles(true)
    tilesLoadingTimeoutRef.current = setTimeout(() => {
      setIsLoadingTiles(false)
    }, HD_CONFIG.TILE_LOAD_TIMEOUT)
    
    // Apply preset
    zoomManagerRef.current.applyPreset(presetId, true)
  }, [])
  
  // Save custom view
  const handleSaveCustomView = useCallback(() => {
    zoomManagerRef.current.saveCustomView()
    setCurrentZoomPreset('custom')
  }, [])
  
  // Smooth zoom controls
  const handleZoomIn = useCallback(() => {
    if (!mapRef.current) return
    const currentZoom = mapRef.current.getZoom() || 20
    zoomManagerRef.current.smoothZoom(Math.min(22, currentZoom + 1), HD_CONFIG.ZOOM_ANIMATION_DURATION)
  }, [])
  
  const handleZoomOut = useCallback(() => {
    if (!mapRef.current) return
    const currentZoom = mapRef.current.getZoom() || 20
    zoomManagerRef.current.smoothZoom(Math.max(17, currentZoom - 1), HD_CONFIG.ZOOM_ANIMATION_DURATION)
  }, [])
  
  // Reset to full property view
  const handleReset = useCallback(() => {
    handleZoomPreset('full-property')
  }, [handleZoomPreset])
  
  // Handle imagery date selection
  const handleImageryChange = useCallback((imageryId: string) => {
    setSelectedImagery(imageryId)
    // In production, this would load historical imagery tiles
    // For now, we'll just show the selection
    setIsLoadingTiles(true)
    setTimeout(() => {
      setIsLoadingTiles(false)
    }, 1000)
  }, [])
  
  // Drawing functions
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
    
    // Set drawing cursor
    mapRef.current.setOptions({ draggableCursor: 'crosshair' })
    
    // Add click listener
    const clickListener = mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newVertex = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        setVertices(prev => [...prev, newVertex])
      }
    })
    
    mapRef.current.set('drawingListener', clickListener)
  }, [])
  
  const completeDrawing = useCallback(() => {
    if (!mapRef.current) return
    
    setIsDrawing(false)
    mapRef.current.setOptions({ draggableCursor: null })
    
    // Remove listener
    const listener = mapRef.current.get('drawingListener')
    if (listener) {
      google.maps.event.removeListener(listener)
    }
    
    // Load the drawn polygon
    if (vertices.length >= 3) {
      loadPropertyPolygon(vertices)
    }
  }, [vertices, loadPropertyPolygon])
  
  const cancelDrawing = useCallback(() => {
    if (!mapRef.current) return
    
    setIsDrawing(false)
    setVertices([])
    mapRef.current.setOptions({ draggableCursor: null })
    
    const listener = mapRef.current.get('drawingListener')
    if (listener) {
      google.maps.event.removeListener(listener)
    }
  }, [])
  
  // Update polygon while drawing
  useEffect(() => {
    if (!mapRef.current || !isDrawing || vertices.length < 2) return
    
    // Show temporary polygon while drawing
    if (polygonRef.current) {
      polygonRef.current.setPath(vertices)
    } else if (vertices.length >= 3) {
      const polygon = new google.maps.Polygon({
        paths: vertices,
        fillColor: '#3B82F6',
        fillOpacity: 0.2,
        strokeColor: '#2563EB',
        strokeOpacity: 1,
        strokeWeight: 2,
        map: mapRef.current,
        geodesic: true
      })
      polygonRef.current = polygon
    }
  }, [vertices, isDrawing])
  
  // Load initial property on mount
  useEffect(() => {
    if (isLoaded && mapRef.current && propertyPolygon.length > 0 && isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      // Use setTimeout to ensure map is fully initialized
      const timeoutId = setTimeout(() => {
        loadPropertyPolygon(propertyPolygon)
      }, 200)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isLoaded, propertyPolygon, loadPropertyPolygon])
  
  if (loadError) {
    return <div className="flex items-center justify-center h-full text-red-600">Error loading maps</div>
  }
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">Loading HD aerial imagery...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative h-full bg-gray-900">
      {/* Add custom styles for HD rendering */}
      <style jsx global>{`
        .hd-map-container img {
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: crisp-edges !important;
        }
      `}</style>
      
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center || { lat: 43.862394, lng: -79.361531 }}
        zoom={20}
        options={getMapOptions()}
        onLoad={onMapLoad}
      >
        {/* Vertex markers while drawing */}
        {vertices.map((vertex, index) => (
          <Marker
            key={index}
            position={vertex}
            label={{
              text: String(index + 1),
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: 7,
              fillColor: isDrawing ? '#3B82F6' : '#22C55E',
              fillOpacity: 0.9,
              strokeColor: '#FFFFFF',
              strokeWeight: 2
            }}
          />
        ))}
      </GoogleMap>
      
      {/* HD Loading Indicator */}
      {isLoadingTiles && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black bg-opacity-80 text-white px-6 py-4 rounded-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading HD tiles...</span>
          </div>
        </div>
      )}
      
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        {/* Left side - Zoom Presets */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Zoom Preset Buttons */}
          <div className="bg-white rounded-lg shadow-xl p-1 flex gap-1">
            <button
              onClick={() => handleZoomPreset('full-property')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
                currentZoomPreset === 'full-property' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Full Property Overview"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm font-medium">Full Property</span>
            </button>
            <button
              onClick={() => handleZoomPreset('structure-focus')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
                currentZoomPreset === 'structure-focus' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Structure Focus"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Structure</span>
            </button>
            <button
              onClick={() => handleZoomPreset('yard-detail')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
                currentZoomPreset === 'yard-detail' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Yard Detail"
            >
              <Trees className="w-4 h-4" />
              <span className="text-sm font-medium">Yard Detail</span>
            </button>
            <button
              onClick={() => handleZoomPreset('custom')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
                currentZoomPreset === 'custom' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Custom Area"
            >
              <Pin className="w-4 h-4" />
              <span className="text-sm font-medium">Custom</span>
            </button>
            {currentZoomPreset !== 'custom' && (
              <button
                onClick={handleSaveCustomView}
                className="px-3 py-2 rounded hover:bg-gray-100 text-gray-600"
                title="Save current view as custom"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Historical Imagery Selector */}
          <div className="bg-white rounded-lg shadow-xl p-2">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Imagery Date</span>
            </div>
            <select
              value={selectedImagery}
              onChange={(e) => handleImageryChange(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {HD_CONFIG.IMAGERY_TYPES.map(imagery => (
                <option key={imagery.id} value={imagery.id}>
                  {imagery.name} - {imagery.date}
                </option>
              ))}
            </select>
          </div>
          
          {/* Drawing Tools */}
          <div className="bg-white rounded-lg shadow-xl p-2">
            {!isDrawing ? (
              <button
                onClick={startDrawing}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 w-full"
              >
                <Ruler className="w-4 h-4" />
                <span className="text-sm font-medium">Draw Property</span>
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={completeDrawing}
                  disabled={vertices.length < 3}
                  className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Complete
                </button>
                <button
                  onClick={cancelDrawing}
                  className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Property Info & Controls */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Address */}
          <div className="bg-white rounded-lg shadow-xl p-3">
            <p className="text-sm font-medium text-gray-900">{address}</p>
            <p className="text-xs text-gray-500 mt-1">Property Measurement</p>
          </div>
          
          {/* Map Controls */}
          <div className="bg-white rounded-lg shadow-xl p-2">
            <div className="flex flex-col gap-2">
              {/* Map Type */}
              <select
                value={mapType}
                onChange={(e) => setMapType(e.target.value)}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value="satellite">Satellite HD</option>
                <option value="hybrid">Hybrid</option>
                <option value="terrain">Terrain</option>
              </select>
              
              {/* Labels Toggle */}
              <label className="flex items-center gap-2 text-sm cursor-pointer px-2">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded"
                />
                <span>Show Labels</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Zoom Controls - Right Side */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
        <div className="bg-white rounded-lg shadow-xl p-1 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded hover:bg-gray-100"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="px-2 py-1 text-center">
            <div className="text-xs text-gray-500">Zoom</div>
            <div className="font-mono font-bold text-sm">{zoomInfo.level}</div>
          </div>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded hover:bg-gray-100"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <div className="border-t mt-1 pt-1">
            <button
              onClick={handleReset}
              className="p-2 rounded hover:bg-gray-100"
              title="Reset View"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Quality Indicator - Top Right Corner */}
      <div className="absolute top-24 right-4 pointer-events-auto space-y-2">
        <div className="bg-white rounded-lg shadow-xl p-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              zoomInfo.quality === 'Ultra HD' ? 'bg-green-500' :
              zoomInfo.quality === 'Very High' ? 'bg-blue-500' :
              zoomInfo.quality === 'High' ? 'bg-yellow-500' :
              'bg-gray-500'
            } animate-pulse`} />
            <div>
              <div className="text-sm font-medium">{zoomInfo.quality}</div>
              <div className="text-xs text-gray-500">{zoomInfo.description}</div>
            </div>
          </div>
        </div>
        
        {/* Area Overlays Toggle */}
        {vertices.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAreaOverlays}
                onChange={(e) => {
                  setShowAreaOverlays(e.target.checked)
                  if (e.target.checked && vertices.length >= 3) {
                    createAreaOverlays(vertices)
                  } else {
                    // Clear overlays
                    areaPolygonsRef.current.forEach(polygon => {
                      polygon.setMap(null)
                    })
                    areaPolygonsRef.current = []
                  }
                }}
                className="rounded text-blue-600"
              />
              <span className="text-sm">Show Areas</span>
            </label>
            <div className="text-xs text-gray-500 mt-1">
              Lawn, driveway, building
            </div>
          </div>
        )}
      </div>
      
      {/* Measurement Display - Bottom Left */}
      {currentMeasurement && (
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Property Measurement
              </h3>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Area */}
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Total Area</div>
                <div className="text-lg font-bold text-gray-900">
                  {currentMeasurement.area.formatted}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentMeasurement.area.squareFeet.toLocaleString()} ft²
                  {currentMeasurement.area.acres > 0.01 && 
                    ` • ${currentMeasurement.area.acres.toFixed(3)} acres`
                  }
                </div>
              </div>
              
              {/* Perimeter */}
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Perimeter</div>
                <div className="text-lg font-bold text-gray-900">
                  {currentMeasurement.perimeter.formatted}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentMeasurement.perimeter.feet.toFixed(1)} ft
                  • {currentMeasurement.perimeter.meters.toFixed(1)} m
                </div>
              </div>
            </div>
            
            {/* Additional Info */}
            {showInfo && (
              <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                <div>Vertices: {vertices.length}</div>
                <div>Imagery: {selectedImagery === 'current' ? 'Latest' : selectedImagery}</div>
                <div>Quality: {zoomInfo.quality}</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Drawing Instructions */}
      {isDrawing && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="bg-black bg-opacity-90 text-white px-6 py-3 rounded-lg shadow-xl">
            <div className="text-sm font-medium">
              Click to add points • {vertices.length} point{vertices.length !== 1 ? 's' : ''} added
              {vertices.length >= 3 && ' • Click "Complete" to finish'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}