'use client'

import { useState, useEffect } from 'react'
import { MapPin, Calculator, DollarSign, Clock, Navigation, Info, ChevronDown, ChevronUp } from 'lucide-react'

// Sample test addresses for Toronto
const SAMPLE_ADDRESSES = [
  { 
    name: 'CN Tower (Downtown)', 
    address: '290 Bremner Blvd, Toronto, ON',
    lat: 43.6426,
    lng: -79.3771,
    expectedZone: 1,
    expectedAdjustment: -5
  },
  { 
    name: 'Casa Loma (Midtown)', 
    address: '1 Austin Terrace, Toronto, ON',
    lat: 43.6780,
    lng: -79.4094,
    expectedZone: 2,
    expectedAdjustment: 0
  },
  { 
    name: 'Toronto Zoo (Scarborough)', 
    address: '2000 Meadowvale Rd, Toronto, ON',
    lat: 43.8177,
    lng: -79.1859,
    expectedZone: 3,
    expectedAdjustment: 10
  },
  { 
    name: 'High Park', 
    address: '1873 Bloor St W, Toronto, ON',
    lat: 43.6465,
    lng: -79.4637,
    expectedZone: 2,
    expectedAdjustment: 0
  },
  { 
    name: 'Scarborough Town Centre', 
    address: '300 Borough Dr, Toronto, ON',
    lat: 43.7764,
    lng: -79.2573,
    expectedZone: 3,
    expectedAdjustment: 10
  }
]

export default function GeopricingTestPage() {
  const [address, setAddress] = useState('')
  const [customLat, setCustomLat] = useState('')
  const [customLng, setCustomLng] = useState('')
  const [lawnSize, setLawnSize] = useState('5000')
  const [drivewaySize, setDrivewaySize] = useState('0')
  const [sidewalkSize, setSidewalkSize] = useState('0')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [zones, setZones] = useState<any[]>([])
  const [loadingZones, setLoadingZones] = useState(true)

  // Base prices
  const basePrices = {
    lawn: 0.02,
    driveway: 0.03,
    sidewalk: 0.025
  }

  // Fetch existing zones
  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/geopricing/zones')
      if (response.ok) {
        const data = await response.json()
        setZones(data.zones || [])
      }
    } catch (err) {
      console.error('Failed to fetch zones:', err)
    } finally {
      setLoadingZones(false)
    }
  }

  const testGeopricing = async (testAddress?: any) => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Build location object
      const location: any = {}
      
      if (testAddress) {
        // Using sample address
        location.address = testAddress.address
        location.lat = testAddress.lat
        location.lng = testAddress.lng
      } else if (customLat && customLng) {
        // Using custom coordinates
        location.lat = parseFloat(customLat)
        location.lng = parseFloat(customLng)
        if (address) location.address = address
      } else if (address) {
        // Using address only
        location.address = address
        location.city = 'Toronto'
      } else {
        throw new Error('Please provide an address or coordinates')
      }

      // Build services array
      const services = []
      
      if (parseInt(lawnSize) > 0) {
        services.push({
          name: 'Lawn Care',
          area: parseInt(lawnSize),
          pricePerUnit: basePrices.lawn,
          totalPrice: parseInt(lawnSize) * basePrices.lawn
        })
      }
      
      if (parseInt(drivewaySize) > 0) {
        services.push({
          name: 'Driveway Cleaning',
          area: parseInt(drivewaySize),
          pricePerUnit: basePrices.driveway,
          totalPrice: parseInt(drivewaySize) * basePrices.driveway
        })
      }
      
      if (parseInt(sidewalkSize) > 0) {
        services.push({
          name: 'Sidewalk Maintenance',
          area: parseInt(sidewalkSize),
          pricePerUnit: basePrices.sidewalk,
          totalPrice: parseInt(sidewalkSize) * basePrices.sidewalk
        })
      }

      if (services.length === 0) {
        throw new Error('Please specify at least one service size')
      }

      // Call API
      const response = await fetch('/api/geopricing/public-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          services,
          date: new Date().toISOString()
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate pricing')
      }

      setResult(data)
      setShowDetails(true)

    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getZoneColor = (adjustment: number) => {
    if (adjustment < 0) return 'text-green-600'
    if (adjustment > 0) return 'text-orange-600'
    return 'text-blue-600'
  }

  const getZoneBadgeColor = (adjustment: number) => {
    if (adjustment < 0) return 'bg-green-100 text-green-800'
    if (adjustment > 0) return 'bg-orange-100 text-orange-800'
    return 'bg-blue-100 text-blue-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-green-600" />
            Geopricing™ Test Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Test location-based pricing for Toronto lawn care services
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Test Addresses */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Test Addresses</h2>
              <div className="space-y-2">
                {SAMPLE_ADDRESSES.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => testGeopricing(sample)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">{sample.name}</div>
                    <div className="text-sm text-gray-500">{sample.address}</div>
                    <div className="text-xs mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded ${getZoneBadgeColor(sample.expectedAdjustment)}`}>
                        Zone {sample.expectedZone} • {sample.expectedAdjustment > 0 ? '+' : ''}{sample.expectedAdjustment}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Address Input */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Custom Address</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., 123 Queen St W, Toronto"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      placeholder="43.6532"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      placeholder="-79.3832"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Service Sizes */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Service Sizes (sq ft)</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lawn Size
                  </label>
                  <input
                    type="number"
                    value={lawnSize}
                    onChange={(e) => setLawnSize(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-500">Base: {formatCurrency(basePrices.lawn)}/sqft</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driveway Size
                  </label>
                  <input
                    type="number"
                    value={drivewaySize}
                    onChange={(e) => setDrivewaySize(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-500">Base: {formatCurrency(basePrices.driveway)}/sqft</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sidewalk Size
                  </label>
                  <input
                    type="number"
                    value={sidewalkSize}
                    onChange={(e) => setSidewalkSize(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-500">Base: {formatCurrency(basePrices.sidewalk)}/sqft</span>
                </div>
              </div>

              <button
                onClick={() => testGeopricing()}
                disabled={loading}
                className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Calculating...' : 'Calculate Geopricing'}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Zone Configuration */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Active Pricing Zones</h2>
              
              {loadingZones ? (
                <div className="text-gray-500">Loading zones...</div>
              ) : zones.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {zones.slice(0, 3).map((zone, idx) => (
                    <div key={zone._id} className="border rounded-lg p-4">
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Type: {zone.type}
                      </div>
                      <div className={`text-2xl font-bold mt-2 ${getZoneColor(zone.pricing.adjustmentValue)}`}>
                        {zone.pricing.adjustmentValue > 0 ? '+' : ''}{zone.pricing.adjustmentValue}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Priority: {zone.priority}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">
                  No zones configured. Run: <code className="bg-gray-100 px-2 py-1 rounded">node scripts/setup-toronto-geopricing.js</code>
                </div>
              )}
            </div>

            {/* Results */}
            {result && (
              <>
                {/* Summary Card */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold mb-4">Pricing Results</h2>
                  
                  {result.geopricing?.applicableZones?.length > 0 ? (
                    <div className="space-y-4">
                      {/* Zone Applied */}
                      <div className="border-l-4 border-green-500 pl-4">
                        <div className="text-sm text-gray-600">Zone Applied</div>
                        <div className="text-xl font-semibold">
                          {result.geopricing.applicableZones[0].zoneName}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {result.geopricing.applicableZones[0].reason}
                        </div>
                      </div>

                      {/* Adjustment */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border-l-4 border-blue-500 pl-4">
                          <div className="text-sm text-gray-600">Adjustment</div>
                          <div className={`text-2xl font-bold ${getZoneColor(result.geopricing.finalAdjustment.value)}`}>
                            {result.geopricing.finalAdjustment.value > 0 ? '+' : ''}
                            {result.geopricing.finalAdjustment.value}%
                          </div>
                        </div>

                        {result.geopricing.metadata?.driveTimeMinutes !== undefined && (
                          <div className="border-l-4 border-purple-500 pl-4">
                            <div className="text-sm text-gray-600">Drive Time</div>
                            <div className="text-2xl font-bold text-purple-600">
                              {result.geopricing.metadata.driveTimeMinutes} min
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Price Breakdown */}
                      {result.pricing?.services && (
                        <div className="mt-6">
                          <h3 className="font-medium mb-3">Service Pricing</h3>
                          <div className="space-y-2">
                            {result.pricing.services.map((service: any, idx: number) => {
                              const basePrice = service.area * service.pricePerUnit
                              const savings = basePrice - service.totalPrice
                              
                              return (
                                <div key={idx} className="border rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">{service.name}</div>
                                      <div className="text-sm text-gray-500">
                                        {service.area} sqft × {formatCurrency(service.pricePerUnit)}/sqft
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-gray-500 line-through">
                                        {formatCurrency(basePrice)}
                                      </div>
                                      <div className="text-xl font-bold">
                                        {formatCurrency(service.totalPrice)}
                                      </div>
                                      {savings !== 0 && (
                                        <div className={`text-sm ${savings > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                          {savings > 0 ? 'Save' : 'Extra'} {formatCurrency(Math.abs(savings))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Total */}
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex justify-between items-center">
                              <div className="text-lg font-semibold">Total</div>
                              <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(
                                  result.pricing.services.reduce((sum: number, s: any) => sum + s.totalPrice, 0)
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      No geopricing zones applied. Using base pricing.
                    </div>
                  )}
                </div>

                {/* Detailed JSON Response */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h2 className="text-lg font-semibold">API Response Details</h2>
                    {showDetails ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  
                  {showDetails && (
                    <pre className="mt-4 p-4 bg-gray-50 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              </>
            )}

            {/* Info Card */}
            {!result && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <div className="font-semibold mb-2">How Geopricing Works:</div>
                    <ul className="space-y-1">
                      <li>• <strong>Zone 1 (0-5 min):</strong> 5% discount for nearby customers</li>
                      <li>• <strong>Zone 2 (5-20 min):</strong> Standard base pricing</li>
                      <li>• <strong>Zone 3 (20+ min):</strong> 10% surcharge for distant locations</li>
                    </ul>
                    <div className="mt-3">
                      Click a sample address or enter your own to see pricing in action!
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}