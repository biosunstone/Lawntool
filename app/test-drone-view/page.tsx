'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Coordinate } from '@/types/manualSelection'
import { WOODBINE_PROPERTY } from '@/lib/measurement/GoogleEarthPropertyData'
import { 
  Camera, MapPin, Maximize, Home, Trees, Download, Share2, Search, 
  Loader2, X, Layers, Settings, Database, ChevronRight, Eye, EyeOff
} from 'lucide-react'
import PropertyMeasurementBreakdown from '@/components/PropertyMeasurementBreakdown'
import MosquitoControlMap from '@/components/mosquito/MosquitoControlMap'
import { generatePropertyBoundaries, generateAreaBreakdown } from '@/lib/autoPropertyDetection'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'

const libraries: ('drawing' | 'geometry' | 'places' | 'visualization')[] = ['drawing', 'geometry', 'places', 'visualization']

// Dynamic imports to prevent SSR issues
const DroneViewPropertyMap = dynamic(() => import('@/components/DroneViewPropertyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Initializing drone view...</p>
      </div>
    </div>
  )
})

// Dynamic import of MosquitoMeasurementTool with polygon features
const MosquitoMeasurementTool = dynamic(
  () => import('@/components/mosquito/MosquitoMeasurementTool'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <Layers className="w-8 h-8 text-gray-400 animate-pulse mx-auto mb-2" />
          <p className="text-gray-400">Loading polygon tools...</p>
        </div>
      </div>
    )
  }
)

// Sample properties with different sizes and shapes
const SAMPLE_PROPERTIES = [
  {
    id: 'woodbine',
    name: 'Woodbine Avenue Property',
    address: '12072 Woodbine Avenue, Gormley, ON L0H 1G0',
    type: 'Residential',
    size: '0.5 acres',
    center: WOODBINE_PROPERTY.center,
    polygon: WOODBINE_PROPERTY.coordinates,
    businessId: 'sample-business-1'
  },
  {
    id: 'suburban',
    name: 'Suburban Home',
    address: '456 Oak Street, Toronto, ON',
    type: 'Residential',
    size: '0.25 acres',
    center: { lat: 43.7000, lng: -79.4000 },
    polygon: [
      { lat: 43.7002, lng: -79.4003 },
      { lat: 43.7002, lng: -79.3997 },
      { lat: 43.6998, lng: -79.3997 },
      { lat: 43.6998, lng: -79.4003 }
    ] as Coordinate[],
    businessId: 'sample-business-1'
  },
  {
    id: 'large-estate',
    name: 'Large Estate',
    address: '789 Estate Drive, Mississauga, ON',
    type: 'Estate',
    size: '2.5 acres',
    center: { lat: 43.5890, lng: -79.6441 },
    polygon: [
      { lat: 43.5895, lng: -79.6448 },
      { lat: 43.5895, lng: -79.6434 },
      { lat: 43.5885, lng: -79.6434 },
      { lat: 43.5885, lng: -79.6448 }
    ] as Coordinate[],
    businessId: 'sample-business-2'
  },
  {
    id: 'commercial',
    name: 'Commercial Property',
    address: '123 Business Park, Vaughan, ON',
    type: 'Commercial',
    size: '1.2 acres',
    center: { lat: 43.8361, lng: -79.4983 },
    polygon: [
      { lat: 43.8365, lng: -79.4988 },
      { lat: 43.8365, lng: -79.4978 },
      { lat: 43.8357, lng: -79.4978 },
      { lat: 43.8357, lng: -79.4988 }
    ] as Coordinate[],
    businessId: 'sample-business-3'
  }
]

export default function TestDroneView() {
  const { data: session }:any = useSession()
  const router = useRouter()
  
  const [selectedProperty, setSelectedProperty] = useState(SAMPLE_PROPERTIES[0])
  const [measurementData, setMeasurementData] = useState<any>(null)
  const [autoCenter, setAutoCenter] = useState(true)
  const [showFeatures, setShowFeatures] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showAddressSearch, setShowAddressSearch] = useState(false)
  const [viewMode, setViewMode] = useState<'drone' | 'polygon'>('drone')
  const [showPolygonTools, setShowPolygonTools] = useState(false)
  const [savedPolygons, setSavedPolygons] = useState<any[]>([])
  const [searchAddress, setSearchAddress] = useState('')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries
  })

  // Load saved polygons from database
  useEffect(() => {
    loadSavedPolygons()
  }, [])
  
  // Autocomplete handlers
  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
    // Restrict to addresses in USA and Canada
    autocomplete.setComponentRestrictions({ country: ['us', 'ca'] })
    // Set types to address for better results
    autocomplete.setTypes(['address'])
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      if (place.formatted_address) {
        setSearchAddress(place.formatted_address)
        
        // Get coordinates if available
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          handleAddressSelect(place.formatted_address, { lat, lng })
        }
      }
    }
  }, [session])

  const loadSavedPolygons = async () => {
    try {
      const response = await fetch('/api/admin/polygons?limit=10')
      if (response.ok) {
        const data = await response.json()
        setSavedPolygons(data.polygons || [])
      }
    } catch (error) {
      console.error('Failed to load saved polygons:', error)
    }
  }

  const handleMeasurementComplete = (data: any) => {
    setMeasurementData(data)
    console.log('Measurement completed:', data)
  }

  const handlePropertyChange = (propertyId: string) => {
    const property = SAMPLE_PROPERTIES.find(p => p.id === propertyId)
    if (property) {
      setSelectedProperty(property)
      setMeasurementData(null)
    }
  }
  
  // Handle address selection from autocomplete
  const handleAddressSelect = async (address: string, coordinates: { lat: number; lng: number }) => {
    setIsSearching(true)
    setSearchError(null)
    
    try {
      const center = { lat: coordinates.lat, lng: coordinates.lng }
      
      // Generate automatic property boundaries
      const propertyEstimate = generatePropertyBoundaries(center, address)
      
      // Generate area breakdown
      const areaBreakdown = generateAreaBreakdown(propertyEstimate.polygon, propertyEstimate.propertyType)
      
      // Create a new property from the search result with auto-generated boundaries
      const searchedProperty = {
        id: 'searched-' + Date.now(),
        name: 'Auto-Detected Property',
        address: address,
        type: propertyEstimate.propertyType === 'commercial' ? 'Commercial' : 'Residential',
        size: `~${(propertyEstimate.estimatedSize / 1000).toFixed(1)}k sq ft`,
        center: center,
        polygon: propertyEstimate.polygon,
        autoDetected: true,
        businessId: session?.user?.businessId || 'demo-business',
        measurements: {
          totalArea: propertyEstimate.estimatedSize,
          lawn: {
            frontYard: areaBreakdown.lawn.front,
            backYard: areaBreakdown.lawn.back,
            sideYard: areaBreakdown.lawn.side,
            total: areaBreakdown.lawn.front + areaBreakdown.lawn.back + areaBreakdown.lawn.side
          },
          driveway: areaBreakdown.driveway,
          sidewalk: areaBreakdown.sidewalk,
          building: areaBreakdown.building,
          other: areaBreakdown.other
        }
      }
      
      setSelectedProperty(searchedProperty)
      setMeasurementData(searchedProperty.measurements)
      setShowAddressSearch(false)
      setSearchAddress('')
      
      // Show a notification about auto-detection
      toast.success('Property boundaries auto-detected! You can refine them using polygon tools.')
      console.log('Property auto-detected:', searchedProperty)
    } catch (error) {
      console.error('Address search error:', error)
      setSearchError(error instanceof Error ? error.message : 'Failed to process address')
    } finally {
      setIsSearching(false)
    }
  }

  // Handle quote generation from polygon tool
  const handleQuoteGenerated = (quoteId: string) => {
    toast.success(`Quote generated successfully: ${quoteId}`)
    console.log('Quote generated:', quoteId)
  }

  // Save polygon to database
  const savePolygonToDatabase = async (polygonData: any) => {
    try {
      const response = await fetch('/api/admin/polygons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedProperty.businessId || 'demo-business',
          propertyAddress: selectedProperty.address,
          geometries: polygonData.geometries,
          exclusionZones: polygonData.exclusionZones || [],
          type: 'mosquito'
        })
      })
      
      if (response.ok) {
        toast.success('Polygon saved to database!')
        loadSavedPolygons() // Refresh saved polygons list
      }
    } catch (error) {
      console.error('Failed to save polygon:', error)
      toast.error('Failed to save polygon')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Camera className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Advanced Drone View & Polygon Measurement</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Ultra HD aerial imagery with intelligent polygon tools & templates
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('drone')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'drone' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4 inline mr-1" />
                  Drone View
                </button>
                <button
                  onClick={() => setViewMode('polygon')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'polygon' 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 inline mr-1" />
                  Polygon Tools
                </button>
              </div>
              
              <button 
                onClick={() => setShowAddressSearch(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search Address
              </button>
              
              <button
                onClick={() => router.push('/admin/polygon-manager')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Admin Panel
              </button>
              
              <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Address Search Modal */}
      {showAddressSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Property Address
              </h2>
              <button
                onClick={() => {
                  setShowAddressSearch(false)
                  setSearchAddress('')
                  setSearchError(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter property address
                </label>
                <style jsx global>{`
                  .pac-container {
                    background-color: rgb(31, 41, 55) !important;
                    border: 1px solid rgb(55, 65, 81) !important;
                    border-radius: 0.5rem !important;
                    margin-top: 0.25rem !important;
                    font-family: inherit !important;
                    z-index: 9999 !important;
                  }
                  .pac-item {
                    background-color: rgb(31, 41, 55) !important;
                    color: white !important;
                    border-top: 1px solid rgb(55, 65, 81) !important;
                    padding: 0.5rem 1rem !important;
                    cursor: pointer !important;
                  }
                  .pac-item:hover {
                    background-color: rgb(55, 65, 81) !important;
                  }
                  .pac-item-selected, .pac-item-selected:hover {
                    background-color: rgb(75, 85, 99) !important;
                  }
                  .pac-matched {
                    font-weight: bold !important;
                    color: rgb(34, 197, 94) !important;
                  }
                  .pac-item-query {
                    color: rgb(209, 213, 219) !important;
                  }
                  .hdpi .pac-icon {
                    background-image: none !important;
                  }
                `}</style>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{
                      fields: ['formatted_address', 'geometry'],
                      types: ['address']
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      placeholder="Start typing an address..."
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      autoFocus
                    />
                  </Autocomplete>
                ) : (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading...</span>
                  </div>
                )}
              </div>
              
              {searchError && (
                <div className="bg-red-900 bg-opacity-50 text-red-300 px-4 py-2 rounded-lg text-sm">
                  {searchError}
                </div>
              )}
              
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <div className="bg-blue-900 bg-opacity-30 p-3 rounded-lg border border-blue-700">
                  <p className="text-xs text-blue-300">
                    <strong>🎯 Auto-Detection:</strong> When you search an address, we automatically:
                  </p>
                  <ul className="text-xs text-gray-400 mt-2 space-y-1">
                    <li>• Generate property boundaries</li>
                    <li>• Calculate lawn, driveway & building areas</li>
                    <li>• Provide instant measurements</li>
                    <li>• Enable polygon template selection</li>
                  </ul>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400 mb-2">Popular locations to try:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '6698 Castlederg Side Road, ON',
                      '12072 Woodbine Avenue, Gormley',
                      'CN Tower, Toronto',
                      '1 Dundas St W, Toronto',
                      'Casa Loma, Toronto'
                    ].map((example) => (
                      <div
                        key={example}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
                      >
                        {example}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Start typing any address above and select from the dropdown suggestions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map Container */}
        <div className="flex-1 relative">
          {viewMode === 'drone' ? (
            <DroneViewPropertyMap
              propertyPolygon={selectedProperty.polygon}
              center={selectedProperty.center}
              address={selectedProperty.address}
              onMeasurementComplete={handleMeasurementComplete}
              autoCenter={autoCenter}
            />
          ) : (
            <MosquitoMeasurementTool
              propertyId={selectedProperty.id}
              businessId={selectedProperty.businessId || 'demo-business'}
              address={selectedProperty.address}
              center={selectedProperty.center}
              onQuoteGenerated={handleQuoteGenerated}
            />
          )}
          
          {/* View Mode Indicator */}
          <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg px-3 py-2 flex items-center gap-2">
            {viewMode === 'drone' ? (
              <>
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white">Drone View Mode</span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white">Polygon Tools Mode</span>
              </>
            )}
          </div>
        </div>
        
        {/* Control Panel */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Property Selector & Search */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Property</h2>
                <button
                  onClick={() => setShowAddressSearch(true)}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  Search
                </button>
              </div>
              
              {/* Show if current property is from search */}
              {selectedProperty.id.startsWith('searched-') && (
                <div className="mb-3 px-3 py-2 bg-green-900 bg-opacity-30 rounded-lg border border-green-700">
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <MapPin className="w-4 h-4" />
                    <span>Auto-Detected Property</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {(selectedProperty as any).autoDetected 
                      ? '✅ Boundaries and measurements auto-generated'
                      : 'Draw boundaries on map to measure'}
                  </p>
                  {(selectedProperty as any).autoDetected && (
                    <p className="text-xs text-yellow-400 mt-1">
                      💡 Switch to Polygon Tools mode for advanced editing
                    </p>
                  )}
                </div>
              )}
              
              <select
                value={selectedProperty.id}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <optgroup label="Sample Properties">
                  {SAMPLE_PROPERTIES.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} ({property.size})
                    </option>
                  ))}
                </optgroup>
                {selectedProperty.id.startsWith('searched-') && (
                  <optgroup label="Searched">
                    <option value={selectedProperty.id}>
                      📍 {selectedProperty.address.substring(0, 30)}...
                    </option>
                  </optgroup>
                )}
              </select>
            </div>
            
            {/* Property Details */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Property Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Address:</span>
                  <div className="text-white mt-1">{selectedProperty.address}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white">{selectedProperty.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Size:</span>
                  <span className="text-white">
                    {selectedProperty.size}
                    {selectedProperty.id.startsWith('searched-') && selectedProperty.polygon.length === 0 && ' (Draw to measure)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coordinates:</span>
                  <span className="text-white font-mono text-xs">
                    {selectedProperty.center.lat.toFixed(4)}, {selectedProperty.center.lng.toFixed(4)}
                  </span>
                </div>
                {selectedProperty.id.startsWith('searched-') && (
                  <div className="pt-2 border-t border-gray-600">
                    <span className="text-xs text-yellow-400">
                      {viewMode === 'drone' 
                        ? '💡 Switch to Polygon Tools mode for templates'
                        : '🎨 Use polygon templates for quick shapes'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Polygon Tools Info (when in polygon mode) */}
            {viewMode === 'polygon' && (
              <div className="bg-green-900 bg-opacity-30 rounded-lg p-4 border border-green-700">
                <h3 className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Polygon Tools Active
                </h3>
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-green-400" />
                    <span>Click "Polygon Templates" for pre-built shapes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-green-400" />
                    <span>Use measurement modes to draw custom polygons</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-green-400" />
                    <span>Edit colors, names, and properties in the polygon editor</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-green-400" />
                    <span>Save polygons to database for later use</span>
                  </div>
                </div>
                <button
                  onClick={() => toast.success('Polygon data auto-saves to the admin panel')}
                  className="mt-3 w-full px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  View in Admin Panel
                </button>
              </div>
            )}
            
            {/* Saved Polygons */}
            {savedPolygons.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center justify-between">
                  <span>Recent Polygons</span>
                  <span className="text-xs text-gray-500">{savedPolygons.length} saved</span>
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {savedPolygons.slice(0, 5).map((polygon, idx) => (
                    <div key={polygon.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: polygon.geometries[0]?.color || '#22c55e' }}
                        />
                        <span className="text-gray-300 truncate max-w-[200px]">
                          {polygon.propertyAddress}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const center = polygon.geometries[0]?.coordinates[0]
                          if (center) {
                            setSelectedProperty({
                              ...selectedProperty,
                              center,
                              address: polygon.propertyAddress
                            })
                            setViewMode('polygon')
                            toast.success('Loaded saved polygon')
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => router.push('/admin/polygon-manager')}
                  className="mt-2 w-full text-xs text-blue-400 hover:text-blue-300"
                >
                  View all in admin panel →
                </button>
              </div>
            )}
            
            {/* Settings */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Map Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Auto-center on load</span>
                  <input
                    type="checkbox"
                    checked={autoCenter}
                    onChange={(e) => setAutoCenter(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Show feature guide</span>
                  <input
                    type="checkbox"
                    checked={showFeatures}
                    onChange={(e) => setShowFeatures(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Show polygon tools</span>
                  <input
                    type="checkbox"
                    checked={showPolygonTools}
                    onChange={(e) => setShowPolygonTools(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
                  />
                </label>
              </div>
            </div>
            
            {/* Property Measurement Breakdown (only in drone mode) */}
            {viewMode === 'drone' && (
              <PropertyMeasurementBreakdown
                propertyPolygon={selectedProperty.polygon}
                center={selectedProperty.center}
                address={selectedProperty.address}
                onMeasurementComplete={(data) => {
                  console.log('Property breakdown:', data)
                }}
              />
            )}
            
            {/* Mosquito Control Analysis (only in drone mode) */}
            {viewMode === 'drone' && (
              <MosquitoControlMap
                address={selectedProperty.address}
                coordinates={selectedProperty.center}
                propertySize={(selectedProperty as any).measurements ? 
                  (selectedProperty as any).measurements.totalArea / 43560 : 1}
              />
            )}
            
            {/* Basic Measurement Results */}
            {measurementData && viewMode === 'drone' && (
              <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4 border border-blue-700">
                <h3 className="text-sm font-medium text-blue-300 mb-3">Basic Measurements</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-blue-400">Total Area</div>
                    <div className="text-xl font-bold text-white">
                      {measurementData.area?.formatted || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {measurementData.area?.squareFeet?.toLocaleString()} ft² 
                      {measurementData.area?.acres > 0.01 && ` • ${measurementData.area.acres.toFixed(3)} acres`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-400">Perimeter</div>
                    <div className="text-xl font-bold text-white">
                      {measurementData.perimeter?.formatted || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {measurementData.perimeter?.feet?.toFixed(1)} ft • {measurementData.perimeter?.meters?.toFixed(1)} m
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Feature Guide */}
            {showFeatures && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Key Features</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2">
                    <Layers className="w-4 h-4 text-green-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Polygon Templates</div>
                      <div className="text-gray-400">Pre-built shapes: Rectangle, Circle, House Perimeter, Gardens</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Settings className="w-4 h-4 text-purple-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Advanced Editor</div>
                      <div className="text-gray-400">Edit colors, names, visibility, lock status, reorder</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Admin Panel</div>
                      <div className="text-gray-400">Manage all polygons, export data, bulk operations</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Camera className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Dual View Modes</div>
                      <div className="text-gray-400">Switch between drone imagery and polygon tools</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">How to Use</h3>
              <ol className="space-y-2 text-xs text-gray-400">
                <li className="flex gap-2">
                  <span className="text-blue-400">1.</span>
                  <span>Search for an address or select a sample property</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">2.</span>
                  <span>Toggle between Drone View and Polygon Tools modes</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">3.</span>
                  <span>In Polygon mode, use templates for quick shapes</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">4.</span>
                  <span>Edit polygons with the advanced editor on the right</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">5.</span>
                  <span>View all saved polygons in the Admin Panel</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">6.</span>
                  <span>Export polygon data as JSON from admin panel</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}