'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef } from 'react'
import { Coordinate } from '@/types/manualSelection'
import { WOODBINE_PROPERTY } from '@/lib/measurement/GoogleEarthPropertyData'
import { Camera, MapPin, Maximize, Home, Trees, Download, Share2, Search, Loader2, X } from 'lucide-react'
import PropertyMeasurementBreakdown from '@/components/PropertyMeasurementBreakdown'
import MosquitoControlMap from '@/components/mosquito/MosquitoControlMap'
import { generatePropertyBoundaries, generateAreaBreakdown } from '@/lib/autoPropertyDetection'

// Dynamic import to prevent SSR issues
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

// Sample properties with different sizes and shapes
const SAMPLE_PROPERTIES = [
  {
    id: 'woodbine',
    name: 'Woodbine Avenue Property',
    address: '12072 Woodbine Avenue, Gormley, ON L0H 1G0',
    type: 'Residential',
    size: '0.5 acres',
    center: WOODBINE_PROPERTY.center,
    polygon: WOODBINE_PROPERTY.coordinates
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
    ] as Coordinate[]
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
    ] as Coordinate[]
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
    ] as Coordinate[]
  }
]

export default function TestDroneView() {
  const [selectedProperty, setSelectedProperty] = useState(SAMPLE_PROPERTIES[0])
  const [measurementData, setMeasurementData] = useState<any>(null)
  const [autoCenter, setAutoCenter] = useState(true)
  const [showFeatures, setShowFeatures] = useState(true)
  const [searchAddress, setSearchAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showAddressSearch, setShowAddressSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
  
  // Handle address search
  const handleAddressSearch = useCallback(async () => {
    if (!searchAddress.trim()) {
      setSearchError('Please enter an address')
      return
    }
    
    setIsSearching(true)
    setSearchError(null)
    
    try {
      // Call geocoding API
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchAddress })
      })
      
      if (!response.ok) {
        throw new Error('Failed to geocode address')
      }
      
      const data = await response.json()
      
      if (data.coordinates && data.coordinates.lat && data.coordinates.lng) {
        const center = { lat: data.coordinates.lat, lng: data.coordinates.lng }
        const formattedAddress = data.formattedAddress || searchAddress
        
        // Generate automatic property boundaries
        const propertyEstimate = generatePropertyBoundaries(center, formattedAddress)
        
        // Generate area breakdown
        const areaBreakdown = generateAreaBreakdown(propertyEstimate.polygon, propertyEstimate.propertyType)
        
        // Create a new property from the search result with auto-generated boundaries
        const searchedProperty = {
          id: 'searched-' + Date.now(),
          name: 'Auto-Detected Property',
          address: formattedAddress,
          type: propertyEstimate.propertyType === 'commercial' ? 'Commercial' : 'Residential',
          size: `~${(propertyEstimate.estimatedSize / 1000).toFixed(1)}k sq ft`,
          center: center,
          polygon: propertyEstimate.polygon,
          autoDetected: true,
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
        console.log('Property auto-detected:', searchedProperty)
      } else {
        throw new Error('Could not find coordinates for this address')
      }
    } catch (error) {
      console.error('Address search error:', error)
      setSearchError(error instanceof Error ? error.message : 'Failed to search address')
    } finally {
      setIsSearching(false)
    }
  }, [searchAddress])
  
  // Handle Enter key in search input
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleAddressSearch()
    }
  }, [handleAddressSearch, isSearching])

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Camera className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Drone View Property Measurement</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Ultra HD aerial imagery with intelligent zoom presets
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAddressSearch(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search Address
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
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="e.g., 123 Main St, Toronto, ON"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  autoFocus
                />
              </div>
              
              {searchError && (
                <div className="bg-red-900 bg-opacity-50 text-red-300 px-4 py-2 rounded-lg text-sm">
                  {searchError}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleAddressSearch}
                  disabled={isSearching || !searchAddress.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddressSearch(false)
                    setSearchAddress('')
                    setSearchError(null)
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
              
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <div className="bg-blue-900 bg-opacity-30 p-3 rounded-lg border border-blue-700">
                  <p className="text-xs text-blue-300">
                    <strong>🎯 Auto-Detection:</strong> When you search an address, we automatically:
                  </p>
                  <ul className="text-xs text-gray-400 mt-2 space-y-1">
                    <li>• Generate property boundaries</li>
                    <li>• Calculate lawn, driveway & building areas</li>
                    <li>• Provide instant measurements</li>
                  </ul>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400 mb-2">Quick examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '6698 Castlederg Side Road, ON',
                      '12072 Woodbine Avenue, Gormley',
                      'CN Tower, Toronto',
                      '1 Dundas St W, Toronto',
                      'Casa Loma, Toronto'
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setSearchAddress(example)}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
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
          <DroneViewPropertyMap
            propertyPolygon={selectedProperty.polygon}
            center={selectedProperty.center}
            address={selectedProperty.address}
            onMeasurementComplete={handleMeasurementComplete}
            autoCenter={autoCenter}
          />
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
                      💡 You can redraw boundaries for more accuracy
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
                    <span className="text-xs text-yellow-400">💡 Use the ruler tool to draw property boundaries</span>
                  </div>
                )}
              </div>
            </div>
            
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
              </div>
            </div>
            
            {/* Property Measurement Breakdown */}
            <PropertyMeasurementBreakdown
              propertyPolygon={selectedProperty.polygon}
              center={selectedProperty.center}
              address={selectedProperty.address}
              onMeasurementComplete={(data) => {
                console.log('Property breakdown:', data)
              }}
            />
            
            {/* Mosquito Control Analysis */}
            <MosquitoControlMap
              address={selectedProperty.address}
              coordinates={selectedProperty.center}
              propertySize={(selectedProperty as any).measurements ? 
                (selectedProperty as any).measurements.totalArea / 43560 : 1}
            />
            
            {/* Basic Measurement Results */}
            {measurementData && (
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
                    <Maximize className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Smart Zoom Presets</div>
                      <div className="text-gray-400">One-click views: Full Property, Structure Focus, Yard Detail</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Camera className="w-4 h-4 text-green-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Ultra HD Imagery</div>
                      <div className="text-gray-400">Drone-quality resolution with visible property features</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Auto-Center & Frame</div>
                      <div className="text-gray-400">Properties automatically centered with optimal zoom</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Home className="w-4 h-4 text-purple-400 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Historical Imagery</div>
                      <div className="text-gray-400">View property changes over time with date selection</div>
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
                  <span>Select a property from the dropdown or draw your own</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">2.</span>
                  <span>Use zoom presets for instant views (Full, Structure, Yard)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">3.</span>
                  <span>Save custom views with the Save button</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">4.</span>
                  <span>Select historical imagery to see seasonal changes</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">5.</span>
                  <span>Use smooth zoom controls for detailed inspection</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}