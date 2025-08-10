/**
 * Interactive Property Boundary Map Component
 * Allows users to draw and edit property perimeters
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleMap, Polygon, Marker, useJsApiLoader } from '@react-google-maps/api'
import { PropertyBoundaryService, LatLng, MeasurementData } from '@/lib/maps/propertyBoundaryService'
import { 
  MapPin, Edit3, Save, RotateCcw, Maximize2, 
  Square, Home, Car, Trees, Info 
} from 'lucide-react'

interface PropertyBoundaryMapProps {
  address: string
  center: LatLng
  onBoundaryChange?: (measurements: MeasurementData) => void
  onPolygonChange?: (polygon: LatLng[]) => void
  initialPolygon?: LatLng[]
  height?: string
  showMeasurements?: boolean
  editMode?: boolean
}

const mapStyles = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  }
]

type DrawingMode = 'lot' | 'house' | 'driveway' | null

export default function PropertyBoundaryMap({
  address,
  center,
  onBoundaryChange,
  onPolygonChange,
  initialPolygon,
  height = '500px',
  showMeasurements = true,
  editMode = true
}: PropertyBoundaryMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [lotPolygon, setLotPolygon] = useState<LatLng[]>(initialPolygon || [])
  const [housePolygon, setHousePolygon] = useState<LatLng[]>([])
  const [drivewayPolygon, setDrivewayPolygon] = useState<LatLng[]>([])
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('lot')
  const [isEditing, setIsEditing] = useState(false)
  const [measurements, setMeasurements] = useState<MeasurementData>({})
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('satellite')
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['drawing', 'geometry', 'places']
  })
  
  // Initialize map
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMap(map)
    
    // Set initial view
    map.setCenter(center)
    map.setZoom(20)
    map.setMapTypeId('satellite')
    map.setTilt(0)
    
    // If no initial polygon, generate default boundary
    if (!initialPolygon || initialPolygon.length === 0) {
      const defaultBoundary = PropertyBoundaryService.generateDefaultBoundary(center, 7000)
      setLotPolygon(defaultBoundary)
      handlePolygonUpdate(defaultBoundary, [], [])
    }
  }, [center, initialPolygon])
  
  // Handle polygon updates
  const handlePolygonUpdate = useCallback((
    lot: LatLng[],
    house: LatLng[],
    driveway: LatLng[]
  ) => {
    const measurementData = PropertyBoundaryService.createMeasurementData(lot, house, driveway)
    setMeasurements(measurementData)
    
    if (onBoundaryChange) {
      onBoundaryChange(measurementData)
    }
    
    if (onPolygonChange && lot.length > 0) {
      onPolygonChange(lot)
    }
  }, [onBoundaryChange, onPolygonChange])
  
  // Handle polygon edit
  const handlePolygonEdit = (
    path: google.maps.MVCArray<google.maps.LatLng>,
    type: 'lot' | 'house' | 'driveway'
  ) => {
    const newPolygon = path.getArray().map(latLng => ({
      lat: latLng.lat(),
      lng: latLng.lng()
    }))
    
    switch (type) {
      case 'lot':
        setLotPolygon(newPolygon)
        handlePolygonUpdate(newPolygon, housePolygon, drivewayPolygon)
        break
      case 'house':
        setHousePolygon(newPolygon)
        handlePolygonUpdate(lotPolygon, newPolygon, drivewayPolygon)
        break
      case 'driveway':
        setDrivewayPolygon(newPolygon)
        handlePolygonUpdate(lotPolygon, housePolygon, newPolygon)
        break
    }
  }
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
  }
  
  // Reset to default boundary
  const resetBoundary = () => {
    const defaultBoundary = PropertyBoundaryService.generateDefaultBoundary(center, 7000)
    setLotPolygon(defaultBoundary)
    setHousePolygon([])
    setDrivewayPolygon([])
    handlePolygonUpdate(defaultBoundary, [], [])
  }
  
  // Auto-detect property boundaries (placeholder for AI/ML integration)
  const autoDetectBoundaries = async () => {
    // In production, this would call an AI service to detect boundaries
    // For now, create a more realistic polygon
    const offset = 0.0003
    const irregularPolygon = [
      { lat: center.lat + offset * 1.1, lng: center.lng - offset * 0.9 },
      { lat: center.lat + offset * 1.2, lng: center.lng + offset * 0.8 },
      { lat: center.lat + offset * 0.3, lng: center.lng + offset * 1.1 },
      { lat: center.lat - offset * 0.9, lng: center.lng + offset * 1.0 },
      { lat: center.lat - offset * 1.1, lng: center.lng - offset * 0.2 },
      { lat: center.lat - offset * 0.5, lng: center.lng - offset * 1.0 },
    ]
    
    setLotPolygon(irregularPolygon)
    handlePolygonUpdate(irregularPolygon, housePolygon, drivewayPolygon)
  }
  
  // Fit map to polygon bounds
  const fitMapToBounds = () => {
    if (!map || lotPolygon.length === 0) return
    
    const bounds = new google.maps.LatLngBounds()
    lotPolygon.forEach(point => {
      bounds.extend(new google.maps.LatLng(point.lat, point.lng))
    })
    
    map.fitBounds(bounds)
  }
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100" style={{ height }}>
        <div className="animate-pulse text-gray-500">Loading map...</div>
      </div>
    )
  }
  
  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={center}
        zoom={20}
        onLoad={onMapLoad}
        mapTypeId={mapType}
        options={{
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          rotateControl: false
        }}
      >
        {/* Lot/Property Polygon - Yard perimeter with green outline */}
        {lotPolygon.length > 0 && (
          <Polygon
            paths={lotPolygon}
            options={{
              fillColor: '#00A651',
              fillOpacity: 0.15,
              strokeColor: '#00A651',
              strokeOpacity: 1,
              strokeWeight: 4,
              editable: isEditing && drawingMode === 'lot',
              draggable: false
            }}
            onEdit={(e: any) => {
              if (e.path) {
                handlePolygonEdit(e.path, 'lot')
              }
            }}
          />
        )}
        
        {/* House Polygon */}
        {housePolygon.length > 0 && (
          <Polygon
            paths={housePolygon}
            options={{
              fillColor: '#8b4513',
              fillOpacity: 0.4,
              strokeColor: '#654321',
              strokeOpacity: 1,
              strokeWeight: 2,
              editable: isEditing && drawingMode === 'house',
              draggable: false
            }}
            onEdit={(e: any) => {
              if (e.path) {
                handlePolygonEdit(e.path, 'house')
              }
            }}
          />
        )}
        
        {/* Driveway Polygon */}
        {drivewayPolygon.length > 0 && (
          <Polygon
            paths={drivewayPolygon}
            options={{
              fillColor: '#6b7280',
              fillOpacity: 0.5,
              strokeColor: '#4b5563',
              strokeOpacity: 1,
              strokeWeight: 2,
              editable: isEditing && drawingMode === 'driveway',
              draggable: false
            }}
            onEdit={(e: any) => {
              if (e.path) {
                handlePolygonEdit(e.path, 'driveway')
              }
            }}
          />
        )}
        
        {/* Center marker */}
        <Marker
          position={center}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }}
        />
      </GoogleMap>
      
      {/* Controls Panel */}
      {editMode && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
          <div className="text-sm font-semibold text-gray-700 mb-2">Drawing Mode</div>
          
          <button
            onClick={() => setDrawingMode('lot')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm w-full ${
              drawingMode === 'lot' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Square className="w-4 h-4" />
            Property Line
          </button>
          
          <button
            onClick={() => setDrawingMode('house')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm w-full ${
              drawingMode === 'house' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Home className="w-4 h-4" />
            House
          </button>
          
          <button
            onClick={() => setDrawingMode('driveway')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm w-full ${
              drawingMode === 'driveway' 
                ? 'bg-gray-200 text-gray-700' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Car className="w-4 h-4" />
            Driveway
          </button>
          
          <div className="border-t pt-2 space-y-2">
            <button
              onClick={toggleEditMode}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm w-full ${
                isEditing 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? 'Save' : 'Edit'}
            </button>
            
            <button
              onClick={autoDetectBoundaries}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-purple-50 text-purple-600 hover:bg-purple-100 w-full"
            >
              <Maximize2 className="w-4 h-4" />
              Auto-Detect
            </button>
            
            <button
              onClick={resetBoundary}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 w-full"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
          
          <div className="border-t pt-2">
            <button
              onClick={() => setMapType(mapType === 'satellite' ? 'roadmap' : 'satellite')}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 w-full"
            >
              {mapType === 'satellite' ? '🗺️' : '🛰️'}
              {mapType === 'satellite' ? 'Map View' : 'Satellite'}
            </button>
          </div>
        </div>
      )}
      
      {/* Measurements Panel */}
      {showMeasurements && measurements.lot && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[250px]">
          <div className="text-sm font-semibold text-gray-700 mb-3">Property Measurements</div>
          
          <div className="space-y-3">
            {measurements.lot && (
              <div className="flex items-start gap-2">
                <Square className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Lot Size</div>
                  <div className="font-semibold text-gray-900">
                    {PropertyBoundaryService.formatArea(measurements.lot.area)}
                  </div>
                </div>
              </div>
            )}
            
            {measurements.lawn && (
              <div className="flex items-start gap-2">
                <Trees className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Lawn Area</div>
                  <div className="font-semibold text-gray-900">
                    {PropertyBoundaryService.formatArea(measurements.lawn.area)}
                  </div>
                </div>
              </div>
            )}
            
            {measurements.house && (
              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500">House</div>
                  <div className="font-semibold text-gray-900">
                    {PropertyBoundaryService.formatArea(measurements.house.area)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Perimeter: {PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}
                  </div>
                </div>
              </div>
            )}
            
            {measurements.driveway && (
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Driveway</div>
                  <div className="font-semibold text-gray-900">
                    {PropertyBoundaryService.formatArea(measurements.driveway.area)}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-start gap-1">
              <Info className="w-3 h-3 text-gray-400 mt-0.5" />
              <p className="text-xs text-gray-500">
                Click "Edit" then drag points to adjust boundaries
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}