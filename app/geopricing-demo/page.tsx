'use client'

import { useState } from 'react'
import { MapPin, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function GeopricingDemo() {
  const [address, setAddress] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'test' | 'rates'>('test')

  // Toronto zone examples
  const zones = [
    {
      name: 'Zone 1: Close Proximity',
      drive: '0-5 minutes',
      adjustment: -5,
      color: 'green',
      examples: ['CN Tower', 'Rogers Centre', 'Union Station'],
      icon: <TrendingDown className="w-5 h-5 text-green-600" />
    },
    {
      name: 'Zone 2: Standard Service',
      drive: '5-20 minutes',
      adjustment: 0,
      color: 'blue',
      examples: ['Casa Loma', 'High Park', 'The Beaches'],
      icon: <Minus className="w-5 h-5 text-blue-600" />
    },
    {
      name: 'Zone 3: Extended Service',
      drive: '20+ minutes',
      adjustment: 10,
      color: 'orange',
      examples: ['Toronto Zoo', 'Scarborough', 'Pearson Airport'],
      icon: <TrendingUp className="w-5 h-5 text-orange-600" />
    }
  ]

  const quickTest = async (testAddress: string) => {
    setAddress(testAddress)
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/geopricing/public-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { 
            address: testAddress + ', Toronto',
            city: 'Toronto'
          },
          services: [{
            name: 'Lawn Care',
            area: 5000,
            pricePerUnit: 0.02,
            totalPrice: 100
          }]
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price)
  }

  const getAdjustmentColor = (value: number) => {
    if (value < 0) return 'text-green-600 bg-green-50'
    if (value > 0) return 'text-orange-600 bg-orange-50'
    return 'text-blue-600 bg-blue-50'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Geopricing™ Demo
          </h1>
          <p className="text-xl text-gray-600">
            Location-based pricing for Toronto lawn care services
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
            <button
              onClick={() => setActiveTab('test')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'test' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Test Pricing
            </button>
            <button
              onClick={() => setActiveTab('rates')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'rates' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rate Zones
            </button>
          </div>
        </div>

        {activeTab === 'test' ? (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Test Panel */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-green-600" />
                Quick Test
              </h2>

              <div className="space-y-4">
                <p className="text-gray-600">
                  Click any address below to test pricing:
                </p>

                {/* Quick test buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => quickTest('CN Tower, 290 Bremner Blvd')}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold group-hover:text-green-700">
                          CN Tower (Downtown)
                        </div>
                        <div className="text-sm text-gray-500">290 Bremner Blvd</div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        -5%
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => quickTest('Casa Loma, 1 Austin Terrace')}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold group-hover:text-blue-700">
                          Casa Loma (Midtown)
                        </div>
                        <div className="text-sm text-gray-500">1 Austin Terrace</div>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        0%
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => quickTest('Toronto Zoo, 2000 Meadowvale Rd')}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold group-hover:text-orange-700">
                          Toronto Zoo (Scarborough)
                        </div>
                        <div className="text-sm text-gray-500">2000 Meadowvale Rd</div>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        +10%
                      </span>
                    </div>
                  </button>
                </div>

                {/* Custom address input */}
                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or enter a custom address:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Any Street"
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => quickTest(address)}
                      disabled={!address || loading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                Pricing Result
              </h2>

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6">
                  {/* Location */}
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Location</div>
                    <div className="font-semibold">{address}</div>
                  </div>

                  {/* Zone Applied */}
                  {result.geopricing?.applicableZones?.[0] && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Zone Applied</div>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                        getAdjustmentColor(result.geopricing.finalAdjustment.value)
                      }`}>
                        <span className="font-semibold">
                          {result.geopricing.applicableZones[0].zoneName}
                        </span>
                        <span className="text-2xl font-bold">
                          {result.geopricing.finalAdjustment.value > 0 ? '+' : ''}
                          {result.geopricing.finalAdjustment.value}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        {result.geopricing.applicableZones[0].reason}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {result.geopricing?.metadata && (
                    <div className="grid grid-cols-2 gap-4">
                      {result.geopricing.metadata.driveTimeMinutes !== undefined && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Drive Time</div>
                          <div className="text-xl font-bold">
                            {result.geopricing.metadata.driveTimeMinutes} min
                          </div>
                        </div>
                      )}
                      {result.geopricing.metadata.distanceFromBase !== undefined && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-gray-600">Distance</div>
                          <div className="text-xl font-bold">
                            {result.geopricing.metadata.distanceFromBase.toFixed(1)} mi
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Calculation */}
                  {result.pricing?.services?.[0] && (
                    <div className="border-t pt-4">
                      <div className="text-sm text-gray-600 mb-2">5,000 sqft Lawn</div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Base Price:</span>
                        <span className="line-through text-gray-400">
                          {formatPrice(100)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold">Final Price:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatPrice(result.pricing.services[0].totalPrice)}
                        </span>
                      </div>
                      {result.pricing.services[0].totalPrice !== 100 && (
                        <div className="mt-2 text-right">
                          <span className={`text-sm ${
                            result.pricing.services[0].totalPrice < 100 
                              ? 'text-green-600' 
                              : 'text-orange-600'
                          }`}>
                            {result.pricing.services[0].totalPrice < 100 ? 'You save' : 'Extra'}: {' '}
                            {formatPrice(Math.abs(100 - result.pricing.services[0].totalPrice))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!result && !loading && (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Select an address to see pricing</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Rate Zones Tab
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Toronto Pricing Zones</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {zones.map((zone, idx) => (
                <div key={idx} className="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    {zone.icon}
                    <span className={`text-3xl font-bold ${
                      zone.adjustment < 0 ? 'text-green-600' :
                      zone.adjustment > 0 ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      {zone.adjustment > 0 ? '+' : ''}{zone.adjustment}%
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{zone.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{zone.drive}</p>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-2">Example areas:</p>
                    <ul className="text-sm space-y-1">
                      {zone.examples.map((example, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">5,000 sqft lawn:</span>
                        <span className="font-semibold">
                          {formatPrice(100 * (1 + zone.adjustment / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">10,000 sqft lawn:</span>
                        <span className="font-semibold">
                          {formatPrice(200 * (1 + zone.adjustment / 100))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Base Rates */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Base Service Rates (Zone 2)</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <span className="text-gray-600">Lawn Care:</span>
                  <span className="ml-2 font-semibold">$0.020/sqft</span>
                </div>
                <div>
                  <span className="text-gray-600">Driveway:</span>
                  <span className="ml-2 font-semibold">$0.030/sqft</span>
                </div>
                <div>
                  <span className="text-gray-600">Sidewalk:</span>
                  <span className="ml-2 font-semibold">$0.025/sqft</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}