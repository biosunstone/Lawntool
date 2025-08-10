/**
 * Professional Property Map Component
 * High-quality aerial map visualization with measurement annotations
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleMap, Polygon, Marker, OverlayView, useJsApiLoader } from '@react-google-maps/api'
import { PropertyBoundaryService, LatLng, MeasurementData } from '@/lib/maps/propertyBoundaryService'
import { 
  MapPin, Edit3, Save, RotateCcw, Maximize2, 
  Square, Home, Car, Trees, Info, Bug, Shield,
  Undo, Redo, Move, CheckCircle, XCircle
} from 'lucide-react'

interface ProfessionalPropertyMapProps {
  address: string
  center: LatLng
  onBoundaryChange?: (measurements: MeasurementData) => void
  onPolygonChange?: (polygon: LatLng[]) => void
  initialPolygon?: LatLng[]
  height?: string
  showMeasurements?: boolean
  editMode?: boolean
  serviceType?: 'outdoor' | 'perimeter' | 'mosquito' | 'all'
}

// Professional map styling for satellite view
const mapStyles = [
  { elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
]

// Service zone colors
const SERVICE_COLORS = {
  outdoor: { fill: 'rgba(0, 166, 81, 0.15)', stroke: '#00A651', label: 'Outdoor Pest Control' },
  perimeter: { fill: 'rgba(0, 102, 204, 0.15)', stroke: '#0066CC', label: 'Perimeter Pest Control' },
  mosquito: { fill: 'rgba(204, 0, 0, 0.15)', stroke: '#CC0000', label: 'Mosquito Control' }
}

type DrawingMode = 'lot' | 'house' | 'driveway' | null
type HistoryAction = { type: string; polygon: LatLng[]; mode: DrawingMode }

export default function ProfessionalPropertyMap({
  address,
  center,
  onBoundaryChange,
  onPolygonChange,
  initialPolygon,
  height = '600px',
  showMeasurements = true,
  editMode = true,
  serviceType = 'all'
}: ProfessionalPropertyMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [lotPolygon, setLotPolygon] = useState<LatLng[]>(initialPolygon || [])
  const [housePolygon, setHousePolygon] = useState<LatLng[]>([])
  const [drivewayPolygon, setDrivewayPolygon] = useState<LatLng[]>([])
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('lot')
  const [isEditing, setIsEditing] = useState(false)
  const [measurements, setMeasurements] = useState<MeasurementData>({})
  const [hoveredVertex, setHoveredVertex] = useState<number | null>(null)
  const [selectedService, setSelectedService] = useState<'outdoor' | 'perimeter' | 'mosquito'>('outdoor')
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryAction[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['drawing', 'geometry', 'places']
  })
  
  // Initialize map with professional settings
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMap(map)
    
    // Professional map settings
    map.setCenter(center)
    map.setZoom(20) // High detail zoom
    map.setMapTypeId('satellite')
    map.setTilt(0) // No tilt for accurate measurements
    
    // Set map options for professional appearance
    map.setOptions({
      gestureHandling: 'greedy',
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      styles: mapStyles
    })
    
    // If no initial polygon, generate default boundary
    if (!initialPolygon || initialPolygon.length === 0) {
      const defaultBoundary = PropertyBoundaryService.generateDefaultBoundary(center, 7000)
      setLotPolygon(defaultBoundary)
      handlePolygonUpdate(defaultBoundary, [], [])
      addToHistory('init', defaultBoundary, 'lot')
    }
  }, [center, initialPolygon])
  
  // Add action to history for undo/redo
  const addToHistory = (type: string, polygon: LatLng[], mode: DrawingMode) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ type, polygon: [...polygon], mode })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }
  
  // Undo action
  const undo = () => {
    if (historyIndex > 0) {
      const prevAction = history[historyIndex - 1]
      applyHistoryAction(prevAction)
      setHistoryIndex(historyIndex - 1)
    }
  }
  
  // Redo action
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextAction = history[historyIndex + 1]
      applyHistoryAction(nextAction)
      setHistoryIndex(historyIndex + 1)
    }
  }
  
  // Apply history action
  const applyHistoryAction = (action: HistoryAction) => {
    switch (action.mode) {
      case 'lot':
        setLotPolygon(action.polygon)
        break
      case 'house':
        setHousePolygon(action.polygon)
        break
      case 'driveway':
        setDrivewayPolygon(action.polygon)
        break
    }
  }
  
  // Handle polygon updates with history
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
  
  // Smart zoom to fit polygon bounds
  const fitMapToBounds = useCallback(() => {
    if (!map || lotPolygon.length === 0) return
    
    const bounds = new google.maps.LatLngBounds()
    lotPolygon.forEach(point => {
      bounds.extend(new google.maps.LatLng(point.lat, point.lng))
    })
    
    // Add padding for better visualization
    const padding = { top: 100, right: 100, bottom: 100, left: 100 }
    map.fitBounds(bounds, padding)
  }, [map, lotPolygon])
  
  // Handle polygon edit with smooth updates
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
        addToHistory('edit', newPolygon, 'lot')
        break
      case 'house':
        setHousePolygon(newPolygon)
        handlePolygonUpdate(lotPolygon, newPolygon, drivewayPolygon)
        addToHistory('edit', newPolygon, 'house')
        break
      case 'driveway':
        setDrivewayPolygon(newPolygon)
        handlePolygonUpdate(lotPolygon, housePolygon, newPolygon)
        addToHistory('edit', newPolygon, 'driveway')
        break
    }
  }
  
  // Get polygon style based on service type
  const getPolygonStyle = (type: 'lot' | 'house' | 'driveway', serviceType: string) => {
    if (type === 'lot') {
      const service = SERVICE_COLORS[serviceType as keyof typeof SERVICE_COLORS] || SERVICE_COLORS.outdoor
      return {
        fillColor: service.fill,
        fillOpacity: 1,
        strokeColor: service.stroke,
        strokeOpacity: 1,
        strokeWeight: 4,
        editable: isEditing && drawingMode === 'lot',
        draggable: false
      }
    }
    
    if (type === 'house') {
      return {
        fillColor: 'rgba(139, 69, 19, 0.6)',
        fillOpacity: 1,
        strokeColor: '#8B4513',
        strokeOpacity: 1,
        strokeWeight: 2,
        editable: isEditing && drawingMode === 'house',
        draggable: false
      }
    }
    
    return {
      fillColor: 'rgba(107, 114, 128, 0.5)',
      fillOpacity: 1,
      strokeColor: '#4B5563',
      strokeOpacity: 1,
      strokeWeight: 2,
      editable: isEditing && drawingMode === 'driveway',
      draggable: false
    }
  }
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 animate-pulse" style={{ height }}>
        <div className="text-gray-500">Loading professional map...</div>
      </div>
    )
  }
  
  return (
    <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Professional Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        {/* Drawing Tools */}
        <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <button
            onClick={() => setDrawingMode('lot')}
            className={`p-2 rounded ${drawingMode === 'lot' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Edit Property Boundary"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDrawingMode('house')}
            className={`p-2 rounded ${drawingMode === 'house' ? 'bg-amber-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Edit House Footprint"
          >
            <Home className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDrawingMode('driveway')}
            className={`p-2 rounded ${drawingMode === 'driveway' ? 'bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Edit Driveway"
          >
            <Car className="w-5 h-5" />
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded ${isEditing ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title={isEditing ? 'Save Changes' : 'Edit Mode'}
          >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          </button>
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>
          <button
            onClick={fitMapToBounds}
            className="p-2 rounded bg-gray-100 hover:bg-gray-200"
            title="Fit to Bounds"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* Service Type Selector */}
        <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <button
            onClick={() => setSelectedService('outdoor')}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              selectedService === 'outdoor' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Trees className="w-4 h-4" />
            <span className="text-sm font-medium">Outdoor</span>
          </button>
          <button
            onClick={() => setSelectedService('perimeter')}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              selectedService === 'perimeter' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Perimeter</span>
          </button>
          <button
            onClick={() => setSelectedService('mosquito')}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              selectedService === 'mosquito' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Bug className="w-4 h-4" />
            <span className="text-sm font-medium">Mosquito</span>
          </button>
        </div>
      </div>
      
      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={center}
        zoom={20}
        onLoad={onMapLoad}
        options={{
          mapTypeId: 'satellite',
          tilt: 0,
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false
        }}
      >
        {/* Lot/Property Polygon with service-specific coloring */}
        {lotPolygon.length > 0 && (
          <>
            <Polygon
              paths={lotPolygon}
              options={getPolygonStyle('lot', selectedService)}
              onEdit={(e: any) => {
                if (e.path) {
                  handlePolygonEdit(e.path, 'lot')
                }
              }}
            />
            
            {/* Vertices for editing */}
            {isEditing && drawingMode === 'lot' && lotPolygon.map((point, index) => (
              <OverlayView
                key={`vertex-${index}`}
                position={point}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  className={`w-4 h-4 bg-white border-2 rounded-full cursor-move transform -translate-x-1/2 -translate-y-1/2 ${
                    hoveredVertex === index ? 'border-green-600 scale-125' : 'border-green-500'
                  }`}
                  onMouseEnter={() => setHoveredVertex(index)}
                  onMouseLeave={() => setHoveredVertex(null)}
                  style={{
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
              </OverlayView>
            ))}
          </>
        )}
        
        {/* House Polygon */}
        {housePolygon.length > 0 && (
          <Polygon
            paths={housePolygon}
            options={getPolygonStyle('house', '')}
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
            options={getPolygonStyle('driveway', '')}
            onEdit={(e: any) => {
              if (e.path) {
                handlePolygonEdit(e.path, 'driveway')
              }
            }}
          />
        )}
        
        {/* Professional Measurement Annotations */}
        {showMeasurements && measurements.lot && (
          <>
            {/* Outdoor Pest Control Label */}
            {selectedService === 'outdoor' && measurements.lawn && (
              <OverlayView
                position={{
                  lat: lotPolygon[0].lat + 0.0001,
                  lng: lotPolygon[0].lng
                }}
                mapPaneName={OverlayView.OVERLAY_LAYER}
              >
                <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-green-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Trees className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-gray-800">Outdoor Pest Control</span>
                  </div>
                  <div className="text-gray-600">
                    Lawn Size - <span className="font-semibold text-black">
                      {PropertyBoundaryService.formatArea(measurements.lawn.area)}
                    </span>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                    border-l-[8px] border-l-transparent
                    border-t-[8px] border-t-white
                    border-r-[8px] border-r-transparent">
                  </div>
                </div>
              </OverlayView>
            )}
            
            {/* Perimeter Pest Control Label */}
            {selectedService === 'perimeter' && measurements.house && (
              <OverlayView
                position={{
                  lat: center.lat,
                  lng: center.lng + 0.0002
                }}
                mapPaneName={OverlayView.OVERLAY_LAYER}
              >
                <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-800">Perimeter Pest Control</span>
                  </div>
                  <div className="text-gray-600">
                    House Area - <span className="font-semibold text-black">
                      {PropertyBoundaryService.formatArea(measurements.house.area)}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    Perimeter - <span className="font-semibold text-black">
                      {PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}
                    </span>
                  </div>
                </div>
              </OverlayView>
            )}
            
            {/* Mosquito Control Label */}
            {selectedService === 'mosquito' && measurements.lot && (
              <OverlayView
                position={{
                  lat: lotPolygon[lotPolygon.length - 1].lat,
                  lng: lotPolygon[lotPolygon.length - 1].lng
                }}
                mapPaneName={OverlayView.OVERLAY_LAYER}
              >
                <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-red-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Bug className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-gray-800">Mosquito Control</span>
                  </div>
                  <div className="text-gray-600">
                    Lot Size - <span className="font-semibold text-black">
                      {PropertyBoundaryService.formatArea(measurements.lot.area)}
                    </span>
                  </div>
                </div>
              </OverlayView>
            )}
          </>
        )}
      </GoogleMap>
      
      {/* Professional Measurement Summary */}
      {showMeasurements && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-sm">
          <h3 className="font-bold text-gray-800 mb-3">Property Measurements</h3>
          <div className="space-y-2">
            {measurements.lot && (
              <div className="flex justify-between">
                <span className="text-gray-600">Total Lot:</span>
                <span className="font-semibold">{PropertyBoundaryService.formatArea(measurements.lot.area)}</span>
              </div>
            )}
            {measurements.lawn && (
              <div className="flex justify-between">
                <span className="text-gray-600">Lawn Area:</span>
                <span className="font-semibold text-green-600">{PropertyBoundaryService.formatArea(measurements.lawn.area)}</span>
              </div>
            )}
            {measurements.house && (
              <div className="flex justify-between">
                <span className="text-gray-600">House:</span>
                <span className="font-semibold">{PropertyBoundaryService.formatArea(measurements.house.area)}</span>
              </div>
            )}
            {measurements.driveway && (
              <div className="flex justify-between">
                <span className="text-gray-600">Driveway:</span>
                <span className="font-semibold">{PropertyBoundaryService.formatArea(measurements.driveway.area)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}