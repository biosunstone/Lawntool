/**
 * Enterprise Property Map Component
 * Matches exact reference image requirements with labels outside property
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleMap, Polygon, OverlayView, useJsApiLoader, Marker } from '@react-google-maps/api'
import { PropertyBoundaryService, LatLng, MeasurementData } from '@/lib/maps/propertyBoundaryService'
import { 
  MapPin, Edit3, Save, RotateCcw, Maximize2, Download,
  Square, Home, Car, Trees, Shield, Bug, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EnterprisePropertyMapProps {
  address: string
  center: LatLng
  onBoundaryChange?: (measurements: MeasurementData) => void
  onPolygonChange?: (polygon: LatLng[]) => void
  onImageGenerated?: (imageUrl: string) => void
  initialPolygon?: LatLng[]
  height?: string
  showMeasurements?: boolean
  editMode?: boolean
  serviceType?: 'outdoor' | 'perimeter' | 'mosquito'
}

// Service configurations matching reference image
const SERVICE_CONFIGS = {
  outdoor: { 
    fill: 'rgba(0, 166, 81, 0.15)', 
    stroke: '#00A651',
    strokeWidth: 4,
    label: 'Outdoor Pest Control',
    labelBg: '#FFFFFF',
    labelBorder: '#00A651',
    icon: '🌿'
  },
  perimeter: { 
    fill: 'rgba(0, 102, 204, 0.15)', 
    stroke: '#0066CC',
    strokeWidth: 4,
    label: 'Perimeter Pest Control',
    labelBg: '#FFFFFF',
    labelBorder: '#0066CC',
    icon: '🛡️'
  },
  mosquito: { 
    fill: 'rgba(204, 0, 0, 0.15)', 
    stroke: '#CC0000',
    strokeWidth: 4,
    label: 'Mosquito Control',
    labelBg: '#FFFFFF', 
    labelBorder: '#CC0000',
    icon: '🦟'
  }
}

type DrawingMode = 'lot' | 'house' | 'driveway' | null

export default function EnterprisePropertyMap({
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
}: EnterprisePropertyMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [lotPolygon, setLotPolygon] = useState<LatLng[]>(initialPolygon || [])
  const [housePolygon, setHousePolygon] = useState<LatLng[]>([])
  const [drivewayPolygon, setDrivewayPolygon] = useState<LatLng[]>([])
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('lot')
  const [isEditing, setIsEditing] = useState(false)
  const [measurements, setMeasurements] = useState<MeasurementData>({})
  const [selectedService, setSelectedService] = useState<'outdoor' | 'perimeter' | 'mosquito'>(serviceType)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['drawing', 'geometry', 'places']
  })
  
  // Initialize map
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMap(map)
    
    // Set up map for satellite view
    map.setCenter(center)
    map.setZoom(20)
    map.setMapTypeId('satellite')
    map.setTilt(0)
    
    map.setOptions({
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy'
    })
    
    // Initialize with default boundary if needed
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
  
  // Generate professional image
  const generateProfessionalImage = async () => {
    if (!lotPolygon.length) {
      toast.error('Please draw property boundaries first')
      return
    }
    
    setIsGeneratingImage(true)
    
    try {
      const response = await fetch('/api/maps/generate-enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center,
          polygon: lotPolygon,
          housePolygon,
          drivewayPolygon,
          measurements,
          address,
          serviceType: selectedService
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Professional map image generated!')
        if (onImageGenerated) {
          onImageGenerated(data.imageUrl)
        }
        
        // Open image in new tab
        window.open(data.imageUrl, '_blank')
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
  
  // Calculate label positions (outside property bounds)
  const calculateLabelPositions = useCallback(() => {
    if (!lotPolygon.length) return []
    
    // Get polygon bounds
    const lats = lotPolygon.map(p => p.lat)
    const lngs = lotPolygon.map(p => p.lng)
    const bounds = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
    
    // Calculate positions outside the property
    const positions = []
    
    // Outdoor label - top left, outside property
    if (selectedService === 'outdoor' && measurements.lawn) {
      positions.push({
        position: { 
          lat: bounds.north + 0.0002, // Above property
          lng: bounds.west - 0.0001  // Left of property
        },
        type: 'outdoor',
        title: 'Outdoor Pest Control',
        subtitle: `Lawn Size - ${PropertyBoundaryService.formatArea(measurements.lawn.area)}`,
        config: SERVICE_CONFIGS.outdoor
      })
    }
    
    // Perimeter label - top right, outside property
    if (selectedService === 'perimeter' && measurements.house) {
      positions.push({
        position: { 
          lat: bounds.north + 0.0002, // Above property
          lng: bounds.east + 0.0001  // Right of property
        },
        type: 'perimeter',
        title: 'Perimeter Pest Control',
        subtitle: `House Area - ${PropertyBoundaryService.formatArea(measurements.house.area)}`,
        subtitle2: `Perimeter - ${PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}`,
        config: SERVICE_CONFIGS.perimeter
      })
    }
    
    // Mosquito label - bottom right, outside property
    if (selectedService === 'mosquito' && measurements.lot) {
      positions.push({
        position: { 
          lat: bounds.south - 0.0002, // Below property
          lng: bounds.east + 0.0001  // Right of property
        },
        type: 'mosquito',
        title: 'Mosquito Control',
        subtitle: `Lot Size - ${PropertyBoundaryService.formatArea(measurements.lot.area)}`,
        config: SERVICE_CONFIGS.mosquito
      })
    }
    
    return positions
  }, [lotPolygon, measurements, selectedService])
  
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100" style={{ height }}>
        <div className="animate-pulse text-gray-500">Loading map...</div>
      </div>
    )
  }
  
  const labelPositions = calculateLabelPositions()
  
  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
        {/* Drawing Tools */}
        <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <button
            onClick={() => setDrawingMode('lot')}
            className={`p-2 rounded ${drawingMode === 'lot' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDrawingMode('house')}
            className={`p-2 rounded ${drawingMode === 'house' ? 'bg-amber-500 text-white' : 'bg-gray-100'}`}
          >
            <Home className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDrawingMode('driveway')}
            className={`p-2 rounded ${drawingMode === 'driveway' ? 'bg-gray-500 text-white' : 'bg-gray-100'}`}
          >
            <Car className="w-5 h-5" />
          </button>
          <div className="w-px bg-gray-300" />
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded ${isEditing ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          </button>
          <button
            onClick={generateProfessionalImage}
            disabled={isGeneratingImage}
            className="p-2 rounded bg-purple-500 text-white disabled:opacity-50"
          >
            {isGeneratingImage ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Service Selector */}
        <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <button
            onClick={() => setSelectedService('outdoor')}
            className={`px-3 py-2 rounded ${selectedService === 'outdoor' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
          >
            Outdoor
          </button>
          <button
            onClick={() => setSelectedService('perimeter')}
            className={`px-3 py-2 rounded ${selectedService === 'perimeter' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            Perimeter
          </button>
          <button
            onClick={() => setSelectedService('mosquito')}
            className={`px-3 py-2 rounded ${selectedService === 'mosquito' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
          >
            Mosquito
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
          tilt: 0
        }}
      >
        {/* Lot Polygon with service-specific color */}
        {lotPolygon.length > 0 && (
          <Polygon
            paths={lotPolygon}
            options={{
              fillColor: SERVICE_CONFIGS[selectedService].fill,
              fillOpacity: 1,
              strokeColor: SERVICE_CONFIGS[selectedService].stroke,
              strokeOpacity: 1,
              strokeWeight: SERVICE_CONFIGS[selectedService].strokeWidth,
              editable: isEditing && drawingMode === 'lot',
              draggable: false
            }}
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
        
        {/* House Polygon */}
        {housePolygon.length > 0 && (
          <Polygon
            paths={housePolygon}
            options={{
              fillColor: 'rgba(139, 69, 19, 0.6)',
              fillOpacity: 1,
              strokeColor: '#8B4513',
              strokeOpacity: 1,
              strokeWeight: 2,
              editable: isEditing && drawingMode === 'house',
              draggable: false
            }}
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
        
        {/* Driveway Polygon */}
        {drivewayPolygon.length > 0 && (
          <Polygon
            paths={drivewayPolygon}
            options={{
              fillColor: 'rgba(107, 114, 128, 0.5)',
              fillOpacity: 1,
              strokeColor: '#4B5563',
              strokeOpacity: 1,
              strokeWeight: 2,
              editable: isEditing && drawingMode === 'driveway',
              draggable: false
            }}
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
        
        {/* Service Labels - Positioned OUTSIDE property bounds */}
        {showMeasurements && labelPositions.map((label, index) => (
          <OverlayView
            key={`${label.type}-${index}`}
            position={label.position}
            mapPaneName={OverlayView.OVERLAY_LAYER}
          >
            <div 
              className="relative"
              style={{
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Label Box */}
              <div 
                className="bg-white rounded-lg shadow-xl p-3"
                style={{
                  border: `2px solid ${label.config.labelBorder}`,
                  minWidth: '250px'
                }}
              >
                <div className="font-bold text-gray-800 text-sm mb-1">
                  {label.title}
                </div>
                <div className="text-gray-600 text-xs">
                  {label.subtitle}
                </div>
                {label.subtitle2 && (
                  <div className="text-gray-600 text-xs">
                    {label.subtitle2}
                  </div>
                )}
              </div>
              
              {/* Dotted line connector to property */}
              <svg 
                className="absolute"
                style={{
                  width: '100px',
                  height: '100px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none'
                }}
              >
                <line
                  x1="50"
                  y1="50"
                  x2={label.type === 'outdoor' ? "80" : "20"}
                  y2={label.type === 'mosquito' ? "80" : "20"}
                  stroke={label.config.stroke}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.5"
                />
              </svg>
            </div>
          </OverlayView>
        ))}
      </GoogleMap>
      
      {/* Measurements Summary */}
      {showMeasurements && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="font-bold text-gray-800 mb-3">Property Measurements</h3>
          <div className="space-y-2 text-sm">
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