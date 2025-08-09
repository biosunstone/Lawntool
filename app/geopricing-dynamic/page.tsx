'use client'

import { useState } from 'react'
import { MapPin, Calculator, Building2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import GeopricingRateTable from '@/components/GeopricingRateTable'
import { 
  calculateDynamicGeopricing,
  getShopLocation,
  ShopLocation,
  GeopricingResult,
  formatCurrency
} from '@/lib/geopricing/dynamicPricingEngine'

// Sample addresses for different Canadian cities
const CITY_SAMPLES = {
  Toronto: [
    { name: 'CN Tower', address: '290 Bremner Blvd, Toronto, ON', expectedZone: 'Close' },
    { name: 'Casa Loma', address: '1 Austin Terrace, Toronto, ON', expectedZone: 'Standard' },
    { name: 'Toronto Zoo', address: '2000 Meadowvale Rd, Toronto, ON', expectedZone: 'Extended' }
  ],
  Ottawa: [
    { name: 'Parliament Hill', address: '111 Wellington St, Ottawa, ON', expectedZone: 'Close' },
    { name: 'ByWard Market', address: '55 ByWard Market Square, Ottawa, ON', expectedZone: 'Standard' },
    { name: 'Ottawa Airport', address: '1000 Airport Parkway, Ottawa, ON', expectedZone: 'Extended' }
  ],
  Vancouver: [
    { name: 'Canada Place', address: '999 Canada Place, Vancouver, BC', expectedZone: 'Close' },
    { name: 'Stanley Park', address: '2099 Beach Ave, Vancouver, BC', expectedZone: 'Standard' },
    { name: 'UBC', address: '2329 West Mall, Vancouver, BC', expectedZone: 'Extended' }
  ],
  Calgary: [
    { name: 'Calgary Tower', address: '101 9 Ave SW, Calgary, AB', expectedZone: 'Close' },
    { name: 'Calgary Zoo', address: '210 St George Dr NE, Calgary, AB', expectedZone: 'Standard' },
    { name: 'Calgary Airport', address: '2000 Airport Rd NE, Calgary, AB', expectedZone: 'Extended' }
  ],
  Mississauga: [
    { name: 'Square One', address: '100 City Centre Dr, Mississauga, ON', expectedZone: 'Close' },
    { name: 'Port Credit', address: '70 Mineola Rd E, Mississauga, ON', expectedZone: 'Standard' },
    { name: 'Meadowvale', address: '6855 Meadowvale Town Centre, Mississauga, ON', expectedZone: 'Extended' }
  ]
}

export default function DynamicGeopricingPage() {
  const [selectedCity, setSelectedCity] = useState<string>('Toronto')
  const [customAddress, setCustomAddress] = useState<string>('')
  const [propertySize, setPropertySize] = useState<string>('5000')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeopricingResult | null>(null)
  const [shopLocation, setShopLocation] = useState<ShopLocation | null>(null)

  const calculatePricing = async (address: string, city?: string) => {
    setLoading(true)
    setResult(null)
    
    try {
      const targetCity = city || selectedCity
      const shop = await getShopLocation(targetCity)
      
      if (!shop) {
        alert(`Sorry, we don't currently service ${targetCity}`)
        setLoading(false)
        return
      }
      
      setShopLocation(shop)
      
      // For demo purposes, simulate the calculation
      const mockResult = await simulateGeopricing(
        address,
        shop,
        parseInt(propertySize) || 5000
      )
      
      setResult(mockResult)
    } catch (error) {
      console.error('Error calculating pricing:', error)
      alert('Error calculating pricing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Simulate geopricing calculation for demo
  const simulateGeopricing = async (
    address: string,
    shop: ShopLocation,
    size: number
  ): Promise<GeopricingResult> => {
    // Simulate drive time based on address keywords
    let driveTime = 15
    if (address.toLowerCase().includes('tower') || address.toLowerCase().includes('place')) {
      driveTime = 3
    } else if (address.toLowerCase().includes('zoo') || address.toLowerCase().includes('airport')) {
      driveTime = 25
    }
    
    // Use the actual dynamic pricing engine logic
    const result = await calculateDynamicGeopricing(address, shop, size)
    
    // Override with simulated drive time for demo
    return {
      ...result,
      driveTimeMinutes: driveTime
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Dynamic Geopricing™ Engine
          </h1>
          <p className="text-xl text-gray-600">
            Location-based pricing that works across all Canadian cities
          </p>
        </div>

        {/* City Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Select Service City
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.keys(CITY_SAMPLES).map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedCity === city
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
          
          {shopLocation && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Shop Location:</strong> {shopLocation.address}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Base Rate:</strong> {formatCurrency(shopLocation.baseRatePer1000SqFt)}/1,000 sq ft
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Test Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-green-600" />
              Test Address
            </h2>
            
            {/* Quick Test Addresses */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Quick test addresses for {selectedCity}:</p>
              <div className="space-y-2">
                {CITY_SAMPLES[selectedCity as keyof typeof CITY_SAMPLES]?.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => calculatePricing(sample.address)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium group-hover:text-blue-600">
                          {sample.name}
                        </div>
                        <div className="text-sm text-gray-500">{sample.address}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        sample.expectedZone === 'Close' ? 'bg-green-100 text-green-700' :
                        sample.expectedZone === 'Extended' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {sample.expectedZone}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom Address Input */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter a custom address:
              </label>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder={`123 Main St, ${selectedCity}`}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                Property Size (sq ft):
              </label>
              <input
                type="number"
                value={propertySize}
                onChange={(e) => setPropertySize(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <button
                onClick={() => calculatePricing(customAddress)}
                disabled={!customAddress || loading}
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Calculating...' : 'Calculate Pricing'}
              </button>
            </div>
          </div>

          {/* Zone Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-purple-600" />
              Pricing Zones
            </h2>
            
            <div className="space-y-3">
              <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700">Close Proximity</span>
                  </div>
                  <span className="text-green-600 font-bold">5% OFF</span>
                </div>
                <p className="text-sm text-gray-600">0-5 minutes drive time</p>
                <p className="text-xs text-gray-500 mt-1">
                  Quick service with minimal travel = savings for you!
                </p>
              </div>
              
              <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Minus className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-700">Standard Service</span>
                  </div>
                  <span className="text-blue-600 font-bold">BASE RATE</span>
                </div>
                <p className="text-sm text-gray-600">5-20 minutes drive time</p>
                <p className="text-xs text-gray-500 mt-1">
                  Our regular service area with standard competitive pricing
                </p>
              </div>
              
              <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-700">Extended Service</span>
                  </div>
                  <span className="text-red-600 font-bold">10% SURCHARGE</span>
                </div>
                <p className="text-sm text-gray-600">20+ minutes drive time</p>
                <p className="text-xs text-gray-500 mt-1">
                  Additional travel time & fuel costs for distant locations
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-800">
                <strong>How it works:</strong> We calculate the actual driving time from our 
                shop to your property. Pricing adjusts automatically based on the zone you fall into. 
                This fair system helps us optimize routes and provide the best service to all customers.
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6">
            <GeopricingRateTable 
              geopricingResult={result}
              showPackageSelection={true}
            />
          </div>
        )}
      </div>
    </div>
  )
}