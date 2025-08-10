/**
 * Ultra HD Property Map Component
 * Premium real-time map visualization with advanced overlays
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleMap, Polygon, OverlayView, useJsApiLoader, DrawingManager } from '@react-google-maps/api'
import { PropertyBoundaryService, LatLng, MeasurementData } from '@/lib/maps/propertyBoundaryService'
import { 
  MapPin, Edit3, Save, RotateCcw, Maximize2, Download,
  Square, Home, Car, Trees, Shield, Bug, Layers,
  Undo, Redo, Move, CheckCircle, Camera, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UltraHDPropertyMapProps {
  address: string
  center: LatLng
  onBoundaryChange?: (measurements: MeasurementData) => void
  onPolygonChange?: (polygon: LatLng[]) => void
  onImageGenerated?: (imageUrl: string) => void
  initialPolygon?: LatLng[]
  height?: string
  showMeasurements?: boolean
  editMode?: boolean
  serviceType?: 'outdoor' | 'perimeter' | 'mosquito' | 'all'
}

// Ultra HD map styling for maximum clarity
const ultraHDMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] }
]

// Service configurations
const SERVICE_CONFIGS = {
  outdoor: { 
    fill: 'rgba(0, 166, 81, 0.25)', 
    stroke: '#00A651', 
    label: 'Outdoor Pest Control',
    icon: '🌿',
    description: 'Lawn treatment area'
  },
  perimeter: { 
    fill: 'rgba(0, 102, 204, 0.25)', 
    stroke: '#0066CC', 
    label: 'Perimeter Pest Control',
    icon: '🛡️',
    description: 'House perimeter protection'
  },
  mosquito: { 
    fill: 'rgba(204, 0, 0, 0.25)', 
    stroke: '#CC0000', 
    label: 'Mosquito Control',
    icon: '🦟',
    description: 'Full property coverage'
  }
}

type DrawingMode = 'lot' | 'house' | 'driveway' | null
type ViewMode = 'satellite' | 'hybrid' | 'roadmap'

export default function UltraHDPropertyMap({
  address,
  center,
  onBoundaryChange,
  onPolygonChange,
  onImageGenerated,
  initialPolygon,
  height = '700px',
  showMeasurements = true,
  editMode = true,
  serviceType = 'outdoor'
}: UltraHDPropertyMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [lotPolygon, setLotPolygon] = useState<LatLng[]>(initialPolygon || [])
  const [housePolygon, setHousePolygon] = useState<LatLng[]>([])
  const [drivewayPolygon, setDrivewayPolygon] = useState<LatLng[]>([])
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('lot')
  const [isEditing, setIsEditing] = useState(false)
  const [measurements, setMeasurements] = useState<MeasurementData>({})
  const [selectedService, setSelectedService] = useState<'outdoor' | 'perimeter' | 'mosquito'>(serviceType as any)
  const [viewMode, setViewMode] = useState<ViewMode>('satellite')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [hoveredVertex, setHoveredVertex] = useState<number | null>(null)
  const [showOverlays, setShowOverlays] = useState(true)
  
  // History for undo/redo
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['drawing', 'geometry', 'places', 'visualization']
  })
  
  // Initialize map with ultra HD settings
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMap(map)
    
    // Ultra HD map configuration
    map.setCenter(center)
    map.setZoom(20) // Maximum detail
    map.setMapTypeId('satellite')
    map.setTilt(0)
    
    // Enhanced map options
    map.setOptions({
      gestureHandling: 'greedy',
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      styles: viewMode === 'satellite' ? [] : ultraHDMapStyles,
      mapTypeControlOptions: {
        mapTypeIds: ['satellite', 'hybrid', 'roadmap']
      }
    })
    
    // Initialize with default boundary if needed
    if (!initialPolygon || initialPolygon.length === 0) {
      const defaultBoundary = PropertyBoundaryService.generateDefaultBoundary(center, 7000)
      setLotPolygon(defaultBoundary)
      handlePolygonUpdate(defaultBoundary, [], [])
    }
    
    // Add custom controls
    addCustomControls(map)
  }, [center, initialPolygon, viewMode])
  
  // Add custom map controls
  const addCustomControls = (map: google.maps.Map) => {
    // Zoom indicator
    const zoomIndicator = document.createElement('div')
    zoomIndicator.className = 'zoom-indicator'
    zoomIndicator.innerHTML = `<div style="background:white;padding:5px 10px;border-radius:4px;font-size:12px;font-weight:bold;">Zoom: ${map.getZoom()}</div>`
    
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(zoomIndicator)
    
    map.addListener('zoom_changed', () => {
      zoomIndicator.innerHTML = `<div style="background:white;padding:5px 10px;border-radius:4px;font-size:12px;font-weight:bold;">Zoom: ${map.getZoom()}</div>`
    })
  }
  
  // Generate professional map image
  const generateProfessionalImage = async () => {
    if (!lotPolygon.length) {
      toast.error('Please draw property boundaries first')
      return
    }
    
    setIsGeneratingImage(true)
    
    try {
      const response = await fetch('/api/maps/generate-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center,
          polygon: lotPolygon,
          measurements,
          address,
          serviceType: selectedService,
          width: 1200,
          height: 800,
          labelStyle: 'bubble',
          includeAnnotations: true
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Professional map image generated!')
        if (onImageGenerated) {
          onImageGenerated(data.imageUrl)
        }
        
        // Download the image
        const link = document.createElement('a')
        link.href = `/api/maps/generate-professional?id=${data.imageId}`
        link.download = `property-map-${address.replace(/[^a-z0-9]/gi, '-')}.png`
        link.click()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error generating image:', error)
      toast.error('Failed to generate map image')
    } finally {
      setIsGeneratingImage(false)
    }
  }
  
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
  
  // Get polygon style based on service
  const getPolygonStyle = (type: 'lot' | 'house' | 'driveway') => {
    if (type === 'lot') {
      const config = SERVICE_CONFIGS[selectedService]
      return {
        fillColor: config.fill,
        fillOpacity: 1,
        strokeColor: config.stroke,
        strokeOpacity: 1,
        strokeWeight: 4,
        editable: isEditing && drawingMode === 'lot',
        draggable: false,
        geodesic: true
      }
    }
    
    if (type === 'house') {
      return {
        fillColor: 'rgba(139, 69, 19, 0.6)',
        fillOpacity: 1,
        strokeColor: '#8B4513',
        strokeOpacity: 1,
        strokeWeight: 3,
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
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" style={{ height }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Ultra HD Map...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Premium Control Panel */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        {/* Drawing Tools */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-3 flex gap-2 pointer-events-auto">
          <button
            onClick={() => setDrawingMode('lot')}
            className={`p-3 rounded-lg transition-all ${
              drawingMode === 'lot' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 hover:shadow-md'
            }`}
            title="Property Boundary"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDrawingMode('house')}
            className={`p-3 rounded-lg transition-all ${
              drawingMode === 'house' 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 hover:shadow-md'
            }`}
            title="House Footprint"
          >
            <Home className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDrawingMode('driveway')}
            className={`p-3 rounded-lg transition-all ${
              drawingMode === 'driveway' 
                ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 hover:shadow-md'
            }`}
            title="Driveway"
          >
            <Car className="w-5 h-5" />
          </button>
          <div className="w-px bg-gray-300" />
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-3 rounded-lg transition-all ${
              isEditing 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                : 'bg-gray-100 hover:bg-gray-200 hover:shadow-md'
            }`}
          >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          </button>
          <button
            onClick={generateProfessionalImage}
            disabled={isGeneratingImage}
            className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-lg disabled:opacity-50 transition-all"
          >
            {isGeneratingImage ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Service Selector */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-2 flex gap-2 pointer-events-auto">
          {Object.entries(SERVICE_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedService(key as any)}
              className={`px-4 py-3 rounded-lg flex items-center gap-2 transition-all ${
                selectedService === key 
                  ? `bg-gradient-to-r ${
                      key === 'outdoor' ? 'from-green-500 to-green-600' :
                      key === 'perimeter' ? 'from-blue-500 to-blue-600' :
                      'from-red-500 to-red-600'
                    } text-white shadow-lg scale-105` 
                  : 'bg-gray-100 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              <span className="text-lg">{config.icon}</span>
              <span className="text-sm font-semibold">{config.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        
        {/* View Controls */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-2 flex gap-2 pointer-events-auto">
          <button
            onClick={() => setViewMode('satellite')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'satellite' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setViewMode('hybrid')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'hybrid' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Hybrid
          </button>
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`p-2 rounded-lg transition-all ${
              showOverlays ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-5 h-5" />
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
          mapTypeId: viewMode,
          tilt: 0,
          styles: viewMode === 'satellite' ? [] : ultraHDMapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          restriction: {
            latLngBounds: {
              north: center.lat + 0.01,
              south: center.lat - 0.01,
              east: center.lng + 0.01,
              west: center.lng - 0.01
            }
          }
        }}
      >
        {/* Property Polygon */}
        {lotPolygon.length > 0 && (
          <Polygon
            paths={lotPolygon}
            options={getPolygonStyle('lot')}
            onEdit={(e: any) => {
              if (e.path) {
                const newPolygon = e.path.getArray().map((latLng: google.maps.LatLng) => ({
                  lat: latLng.lat(),
                  lng: latLng.lng()
                }))
                setLotPolygon(newPolygon)
                handlePolygonUpdate(newPolygon, housePolygon, drivewayPolygon)
              }
            }}
          />
        )}
        
        {/* House Footprint */}
        {housePolygon.length > 0 && (
          <Polygon
            paths={housePolygon}
            options={getPolygonStyle('house')}
            onEdit={(e: any) => {
              if (e.path) {
                const newPolygon = e.path.getArray().map((latLng: google.maps.LatLng) => ({
                  lat: latLng.lat(),
                  lng: latLng.lng()
                }))
                setHousePolygon(newPolygon)
                handlePolygonUpdate(lotPolygon, newPolygon, drivewayPolygon)
              }
            }}
          />
        )}
        
        {/* Driveway */}
        {drivewayPolygon.length > 0 && (
          <Polygon
            paths={drivewayPolygon}
            options={getPolygonStyle('driveway')}
            onEdit={(e: any) => {
              if (e.path) {
                const newPolygon = e.path.getArray().map((latLng: google.maps.LatLng) => ({
                  lat: latLng.lat(),
                  lng: latLng.lng()
                }))
                setDrivewayPolygon(newPolygon)
                handlePolygonUpdate(lotPolygon, housePolygon, newPolygon)
              }
            }}
          />
        )}
        
        {/* Premium Measurement Overlays */}
        {showMeasurements && showOverlays && measurements.lot && (
          <>
            {/* Service-specific overlay labels */}
            <OverlayView
              position={center}
              mapPaneName={OverlayView.OVERLAY_LAYER}
            >
              <div className="absolute -top-20 -left-40">
                <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-4 border-2 border-green-500 min-w-[320px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                      {SERVICE_CONFIGS[selectedService].icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{SERVICE_CONFIGS[selectedService].label}</h3>
                      <p className="text-sm text-gray-600">{SERVICE_CONFIGS[selectedService].description}</p>
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Coverage Area:</span>
                      <span className="font-bold text-xl text-gray-900">
                        {selectedService === 'outdoor' && measurements.lawn 
                          ? PropertyBoundaryService.formatArea(measurements.lawn.area)
                          : selectedService === 'perimeter' && measurements.house
                          ? PropertyBoundaryService.formatArea(measurements.house.area)
                          : measurements.lot
                          ? PropertyBoundaryService.formatArea(measurements.lot.area)
                          : 'N/A'
                        }
                      </span>
                    </div>
                    {selectedService === 'perimeter' && measurements.house && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-600">Perimeter:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Arrow pointer */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                    border-l-[10px] border-l-transparent
                    border-t-[10px] border-t-white
                    border-r-[10px] border-r-transparent">
                  </div>
                </div>
              </div>
            </OverlayView>
          </>
        )}
      </GoogleMap>
      
      {/* Ultra HD Measurement Dashboard */}
      {showMeasurements && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">Property Analysis</h3>
            <div className="grid grid-cols-4 gap-4">
              {measurements.lot && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Property</div>
                  <div className="text-2xl font-bold text-gray-900">{PropertyBoundaryService.formatArea(measurements.lot.area)}</div>
                </div>
              )}
              {measurements.lawn && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <div className="text-green-600 text-xs uppercase tracking-wider mb-1">Lawn Area</div>
                  <div className="text-2xl font-bold text-green-700">{PropertyBoundaryService.formatArea(measurements.lawn.area)}</div>
                </div>
              )}
              {measurements.house && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                  <div className="text-amber-600 text-xs uppercase tracking-wider mb-1">House</div>
                  <div className="text-2xl font-bold text-amber-700">{PropertyBoundaryService.formatArea(measurements.house.area)}</div>
                  <div className="text-sm text-amber-600 mt-1">Perimeter: {PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}</div>
                </div>
              )}
              {measurements.driveway && (
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4">
                  <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Driveway</div>
                  <div className="text-2xl font-bold text-gray-700">{PropertyBoundaryService.formatArea(measurements.driveway.area)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}