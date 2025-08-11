'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Polygon, Polyline, DrawingManager, useLoadScript, Marker } from '@react-google-maps/api'
import { Coordinate } from '@/types/manualSelection'
import { 
  MeasurementMode, 
  YardSection, 
  ExclusionZone,
  LinearMeasurement,
  PerimeterMeasurementService
} from '@/lib/mosquito/PerimeterMeasurementService'
import { PolygonEditor } from '../PolygonEditor'
import { DeletionConfirmation } from '../DeletionConfirmation'
import toast from 'react-hot-toast'

const libraries: any[] = ['drawing', 'geometry', 'places']

interface MosquitoMapProps {
  center: { lat: number; lng: number }
  mode: MeasurementMode
  yardSection: YardSection
  useHybrid: boolean
  showHistorical: boolean
  geometries: any[]
  exclusionZones: ExclusionZone[]
  selectedGeometry: string | null
  onMeasurementComplete: (measurement: LinearMeasurement, name?: string) => void
  onGeometryUpdate: (id: string, coordinates: Coordinate[]) => void
}

// Color scheme for different geometry types
const GEOMETRY_COLORS = {
  lot_perimeter: '#10B981', // Green
  structure_perimeter: '#8B5CF6', // Purple
  custom_path: '#F59E0B', // Amber
  area_band: '#3B82F6', // Blue
  exclusion: '#EF4444' // Red
}

export default function MosquitoMap({
  center,
  mode,
  yardSection,
  useHybrid,
  showHistorical,
  geometries,
  exclusionZones,
  selectedGeometry,
  onMeasurementComplete,
  onGeometryUpdate
}: MosquitoMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const measurementService = useRef<PerimeterMeasurementService | null>(null)
  const currentPolygonRef = useRef<google.maps.Polygon | null>(null)
  const currentPolylineRef = useRef<google.maps.Polyline | null>(null)
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [editingPolygon, setEditingPolygon] = useState<google.maps.Polygon | null>(null)
  const [deletionTarget, setDeletionTarget] = useState<any>(null)
  const [totalDistance, setTotalDistance] = useState(0)
  const [vertices, setVertices] = useState<Coordinate[]>([])
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  })
  
  // Initialize measurement service
  useEffect(() => {
    if (isLoaded && mapRef.current && !measurementService.current) {
      measurementService.current = new PerimeterMeasurementService()
      measurementService.current.initialize(mapRef.current)
    }
  }, [isLoaded])
  
  // Map options
  const mapOptions: google.maps.MapOptions = {
    zoom: 20,
    mapTypeId: showHistorical ? 'satellite' : 'hybrid',
    tilt: 0,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true,
    clickableIcons: false,
    mapTypeControlOptions: {
      mapTypeIds: ['hybrid', 'satellite', 'roadmap'],
      position: google.maps.ControlPosition.TOP_RIGHT
    }
  }
  
  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    
    // Initialize drawing manager
    if (!drawingManagerRef.current) {
      drawingManagerRef.current = new google.maps.drawing.DrawingManager({
        drawingControl: false,
        drawingMode: null,
        polygonOptions: {
          fillColor: GEOMETRY_COLORS[mode],
          fillOpacity: 0.35,
          strokeColor: GEOMETRY_COLORS[mode],
          strokeOpacity: 0.8,
          strokeWeight: 2,
          clickable: true,
          editable: false,
          draggable: false
        },
        polylineOptions: {
          strokeColor: GEOMETRY_COLORS[mode],
          strokeOpacity: 0.8,
          strokeWeight: 3,
          clickable: true,
          editable: false,
          draggable: false
        }
      })
      
      drawingManagerRef.current.setMap(map)
      
      // Add listeners
      google.maps.event.addListener(
        drawingManagerRef.current,
        'polygoncomplete',
        handlePolygonComplete
      )
      
      google.maps.event.addListener(
        drawingManagerRef.current,
        'polylinecomplete',
        handlePolylineComplete
      )
    }
  }, [mode])
  
  // Start drawing based on mode
  const startDrawing = useCallback(() => {
    if (!drawingManagerRef.current) return
    
    setIsDrawing(true)
    setVertices([])
    setTotalDistance(0)
    
    // Set drawing mode based on measurement type
    let drawingMode: google.maps.drawing.OverlayType
    
    if (mode === 'lot_perimeter' || mode === 'area_band') {
      drawingMode = google.maps.drawing.OverlayType.POLYGON
    } else {
      drawingMode = google.maps.drawing.OverlayType.POLYLINE
    }
    
    // Update colors
    drawingManagerRef.current.setOptions({
      drawingMode,
      polygonOptions: {
        ...drawingManagerRef.current.get('polygonOptions'),
        fillColor: GEOMETRY_COLORS[mode],
        strokeColor: GEOMETRY_COLORS[mode]
      },
      polylineOptions: {
        ...drawingManagerRef.current.get('polylineOptions'),
        strokeColor: GEOMETRY_COLORS[mode]
      }
    })
    
    drawingManagerRef.current.setDrawingMode(drawingMode)
  }, [mode])
  
  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null)
    }
    setIsDrawing(false)
  }, [])
  
  // Handle polygon completion
  const handlePolygonComplete = useCallback(async (polygon: google.maps.Polygon) => {
    stopDrawing()
    currentPolygonRef.current = polygon
    
    // Get vertices
    const path = polygon.getPath()
    const coordinates: Coordinate[] = []
    
    path.forEach((latLng) => {
      coordinates.push({
        lat: latLng.lat(),
        lng: latLng.lng()
      })
    })
    
    // Process based on mode
    if (!measurementService.current) {
      toast.error('Measurement service not initialized')
      return
    }
    
    try {
      let measurement: LinearMeasurement
      
      if (mode === 'lot_perimeter') {
        measurement = await measurementService.current.measureLotPerimeter(
          center.toString(), // Using center as address placeholder
          coordinates,
          {
            yardSection,
            snapToParcel: useHybrid,
            excludeNeighbors: true
          }
        )
      } else if (mode === 'structure_perimeter') {
        // For structure, we should auto-detect but using manual for now
        measurement = await measurementService.current.measureCustomPath(
          coordinates,
          { snapToEdges: useHybrid }
        )
      } else {
        measurement = await measurementService.current.measureCustomPath(
          coordinates,
          { snapToEdges: useHybrid }
        )
      }
      
      // Apply hybrid snapping if enabled
      if (useHybrid && measurement.coordinates !== coordinates) {
        // Update polygon with snapped coordinates
        const snappedPath = measurement.coordinates.map(coord => 
          new google.maps.LatLng(coord.lat, coord.lng)
        )
        polygon.setPath(snappedPath)
        
        toast.success('Applied boundary snapping')
      }
      
      onMeasurementComplete(measurement)
      
      // Remove polygon after measurement
      polygon.setMap(null)
    } catch (error) {
      console.error('Measurement failed:', error)
      toast.error('Failed to complete measurement')
      polygon.setMap(null)
    }
  }, [mode, yardSection, useHybrid, center, onMeasurementComplete, stopDrawing])
  
  // Handle polyline completion
  const handlePolylineComplete = useCallback(async (polyline: google.maps.Polyline) => {
    stopDrawing()
    currentPolylineRef.current = polyline
    
    // Get vertices
    const path = polyline.getPath()
    const coordinates: Coordinate[] = []
    
    path.forEach((latLng) => {
      coordinates.push({
        lat: latLng.lat(),
        lng: latLng.lng()
      })
    })
    
    if (!measurementService.current) {
      toast.error('Measurement service not initialized')
      return
    }
    
    try {
      const measurement = await measurementService.current.measureCustomPath(
        coordinates,
        {
          snapToEdges: useHybrid,
          pathType: mode === 'custom_path' ? 'fence' : undefined
        }
      )
      
      // Apply snapping if enabled
      if (useHybrid && measurement.coordinates !== coordinates) {
        const snappedPath = measurement.coordinates.map(coord => 
          new google.maps.LatLng(coord.lat, coord.lng)
        )
        polyline.setPath(snappedPath)
        
        toast.success('Applied edge snapping')
      }
      
      onMeasurementComplete(measurement)
      
      // Remove polyline after measurement
      polyline.setMap(null)
    } catch (error) {
      console.error('Measurement failed:', error)
      toast.error('Failed to complete measurement')
      polyline.setMap(null)
    }
  }, [mode, useHybrid, onMeasurementComplete, stopDrawing])
  
  // Render existing geometries
  const renderGeometries = useCallback(() => {
    return geometries.map(geometry => {
      const isSelected = geometry.id === selectedGeometry
      const color = GEOMETRY_COLORS[geometry.type as keyof typeof GEOMETRY_COLORS] || '#4285F4'
      
      // Check if it's a closed shape or path
      const isClosed = geometry.type === 'lot_perimeter' || geometry.type === 'structure_perimeter'
      
      if (isClosed) {
        return (
          <Polygon
            key={geometry.id}
            paths={geometry.coordinates}
            options={{
              fillColor: color,
              fillOpacity: isSelected ? 0.5 : 0.35,
              strokeColor: color,
              strokeOpacity: isSelected ? 1 : 0.8,
              strokeWeight: isSelected ? 3 : 2,
              clickable: true,
              editable: isSelected,
              draggable: false,
              zIndex: isSelected ? 1000 : 1
            }}
            onClick={() => {
              if (!isSelected) {
                // Select geometry
              }
            }}
            onRightClick={() => {
              setDeletionTarget({
                id: geometry.id,
                name: geometry.name,
                areaType: geometry.type,
                vertices: geometry.coordinates,
                area: geometry.linearFeet,
                perimeter: geometry.linearFeet,
                createdAt: new Date()
              })
            }}
          />
        )
      } else {
        return (
          <Polyline
            key={geometry.id}
            path={geometry.coordinates}
            options={{
              strokeColor: color,
              strokeOpacity: isSelected ? 1 : 0.8,
              strokeWeight: isSelected ? 4 : 3,
              clickable: true,
              editable: isSelected,
              draggable: false,
              zIndex: isSelected ? 1000 : 1
            }}
            onClick={() => {
              if (!isSelected) {
                // Select geometry
              }
            }}
            onRightClick={() => {
              setDeletionTarget({
                id: geometry.id,
                name: geometry.name,
                areaType: geometry.type,
                vertices: geometry.coordinates,
                area: geometry.linearFeet,
                perimeter: geometry.linearFeet,
                createdAt: new Date()
              })
            }}
          />
        )
      }
    })
  }, [geometries, selectedGeometry])
  
  // Render exclusion zones
  const renderExclusionZones = useCallback(() => {
    return exclusionZones.map(zone => (
      <React.Fragment key={zone.id}>
        {/* Base exclusion zone */}
        <Polygon
          paths={zone.geometry}
          options={{
            fillColor: '#EF4444',
            fillOpacity: 0.2,
            strokeColor: '#EF4444',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            clickable: false,
            zIndex: 100
          }}
        />
        
        {/* Buffer zone */}
        {zone.bufferedGeometry && (
          <Polygon
            paths={zone.bufferedGeometry}
            options={{
              fillColor: '#FCA5A5',
              fillOpacity: 0.1,
              strokeColor: '#F87171',
              strokeOpacity: 0.5,
              strokeWeight: 1,
              strokeStyle: 'dashed' as any,
              clickable: false,
              zIndex: 99
            }}
          />
        )}
        
        {/* Label marker */}
        <Marker
          position={zone.geometry[0]}
          label={{
            text: zone.name,
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
            fillOpacity: 0
          }}
        />
      </React.Fragment>
    ))
  }, [exclusionZones])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'd' && !isDrawing) {
        startDrawing()
      } else if (e.key === 'Escape' && isDrawing) {
        stopDrawing()
      }
    }
    
    window.addEventListener('keypress', handleKeyPress)
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isDrawing, startDrawing, stopDrawing])
  
  if (loadError) {
    return <div className="flex items-center justify-center h-full">Error loading maps</div>
  }
  
  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full">Loading maps...</div>
  }
  
  return (
    <>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* Render existing geometries */}
        {renderGeometries()}
        
        {/* Render exclusion zones */}
        {renderExclusionZones()}
        
        {/* Show editing controls if geometry is selected */}
        {selectedGeometry && editingPolygon && (
          <PolygonEditor
            polygon={editingPolygon}
            onUpdate={(vertices) => onGeometryUpdate(selectedGeometry, vertices)}
            // color={GEOMETRY_COLORS[geometries.find(g => g.id === selectedGeometry)?.type || 'lot_perimeter']}
            name={geometries.find(g => g.id === selectedGeometry)?.name}
          />
        )}
      </GoogleMap>
      
      {/* Drawing controls */}
      {!isDrawing && (
        <button
          onClick={startDrawing}
          className="absolute bottom-24 left-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
        >
          Start Drawing
        </button>
      )}
      
      {isDrawing && (
        <div className="absolute bottom-24 left-4 bg-white rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-600 mb-2">
            {mode === 'lot_perimeter' ? 'Draw property boundary' :
             mode === 'structure_perimeter' ? 'Draw around structure' :
             mode === 'custom_path' ? 'Draw treatment path' :
             'Draw treatment area'}
          </p>
          <button
            onClick={stopDrawing}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Cancel (ESC)
          </button>
        </div>
      )}
      
      {/* Real-time measurement display */}
      {isDrawing && totalDistance > 0 && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2">
          <p className="text-sm font-medium">
            Distance: {totalDistance.toFixed(1)} ft
          </p>
        </div>
      )}
      
      {/* Deletion confirmation */}
      {deletionTarget && (
        <DeletionConfirmation
          selection={deletionTarget}
          onConfirm={() => {
            // Handle deletion
            setDeletionTarget(null)
          }}
          onCancel={() => setDeletionTarget(null)}
          isOpen={true}
        />
      )}
    </>
  )
}