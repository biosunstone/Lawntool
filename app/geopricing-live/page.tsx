'use client'

import { useState } from 'react'
import { MapPin, Calculator, Loader2, CheckCircle, AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'

export default function LiveGeopricingPage() {
  const [address, setAddress] = useState('')
  const [services, setServices] = useState({
    lawn: { enabled: true, area: 5000 },
    driveway: { enabled: false, area: 1000 },
    sidewalk: { enabled: false, area: 500 }
  })
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [quoteGenerated, setQuoteGenerated] = useState(false)

  // Test addresses for quick testing
  const testAddresses = [
    { name: 'CN Tower', address: '290 Bremner Blvd, Toronto, ON', zone: 'close' },
    { name: 'Casa Loma', address: '1 Austin Terrace, Toronto, ON', zone: 'standard' },
    { name: 'Toronto Zoo', address: '2000 Meadowvale Rd, Toronto, ON', zone: 'extended' },
    { name: 'Eaton Centre', address: '220 Yonge St, Toronto, ON', zone: 'close' },
    { name: 'High Park', address: '1873 Bloor St W, Toronto, ON', zone: 'standard' }
  ]

  const calculatePricing = async () => {
    if (!address) {
      setError('Please enter an address')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setQuoteGenerated(false)

    try {
      // Prepare services array
      const servicesList = Object.entries(services)
        .filter(([_, config]) => config.enabled)
        .map(([type, config]) => ({
          type,
          area: config.area
        }))

      if (servicesList.length === 0) {
        setError('Please select at least one service')
        setLoading(false)
        return
      }

      // Call the real backend API
      const response = await fetch('/api/geopricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerAddress: address,
          services: servicesList,
          useCache: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to calculate pricing')
      }

      setResult(data)
    } catch (err: any) {
      console.error('Calculation error:', err)
      setError(err.message || 'Failed to calculate pricing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateQuote = async () => {
    if (!result) return

    setLoading(true)
    setError('')

    try {
      const servicesList = Object.entries(services)
        .filter(([_, config]) => config.enabled)
        .map(([type, config]) => ({
          type,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          area: config.area
        }))

      const response = await fetch('/api/geopricing/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          customerAddress: address,
          services: servicesList,
          sendQuote: !!customerInfo.email,
          notes: `Generated from live Geopricing demo`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate quote')
      }

      setQuoteGenerated(true)
      alert(`Quote #${data.quote.quoteNumber} generated successfully!${customerInfo.email ? ' Email sent to customer.' : ''}`)
    } catch (err: any) {
      console.error('Quote generation error:', err)
      setError(err.message || 'Failed to generate quote')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const getZoneIcon = (adjustment: number) => {
    if (adjustment < 0) return <TrendingDown className="w-5 h-5 text-green-600" />
    if (adjustment > 0) return <TrendingUp className="w-5 h-5 text-red-600" />
    return <Minus className="w-5 h-5 text-blue-600" />
  }

  const getZoneColor = (adjustment: number) => {
    if (adjustment < 0) return 'text-green-600'
    if (adjustment > 0) return 'text-red-600'
    return 'text-blue-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Live Geopricing™ System
          </h1>
          <p className="text-xl text-gray-600">
            Real-time pricing calculation with Google Maps integration
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-green-600" />
              Service Details
            </h2>

            {/* Quick Test Addresses */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Test Addresses:
              </label>
              <div className="space-y-1">
                {testAddresses.map((test, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAddress(test.address)}
                    className="w-full text-left px-3 py-2 text-sm border rounded hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{test.name}</span>
                    <span className="text-gray-500 ml-2">({test.zone} zone)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Address Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Address:
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter full address"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Services */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services:
              </label>
              <div className="space-y-3">
                {Object.entries(services).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setServices({
                        ...services,
                        [type]: { ...config, enabled: e.target.checked }
                      })}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="capitalize w-20">{type}:</span>
                    <input
                      type="number"
                      value={config.area}
                      onChange={(e) => setServices({
                        ...services,
                        [type]: { ...config, area: parseInt(e.target.value) || 0 }
                      })}
                      disabled={!config.enabled}
                      className="flex-1 px-2 py-1 border rounded disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-500">sq ft</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Info (Optional) */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Info (Optional - for quote generation):
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculatePricing}
              disabled={loading || !address}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Calculate Pricing
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-600" />
              Pricing Results
            </h2>

            {result ? (
              <div className="space-y-4">
                {/* Shop Location */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Servicing from:</div>
                  <div className="font-semibold">{result.calculation.shopLocation.name}</div>
                  <div className="text-sm text-gray-500">{result.calculation.shopLocation.city}</div>
                </div>

                {/* Drive Time & Zone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600">Drive Time</div>
                    <div className="text-xl font-bold text-blue-700">
                      {result.calculation.driveTime.minutes} min
                    </div>
                    <div className="text-xs text-blue-500">
                      {result.calculation.driveTime.distanceText}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    result.calculation.zone.adjustment < 0 ? 'bg-green-50' :
                    result.calculation.zone.adjustment > 0 ? 'bg-red-50' :
                    'bg-gray-50'
                  }`}>
                    <div className="text-sm text-gray-600">Zone</div>
                    <div className="flex items-center gap-2">
                      {getZoneIcon(result.calculation.zone.adjustment)}
                      <div className={`text-xl font-bold ${getZoneColor(result.calculation.zone.adjustment)}`}>
                        {result.calculation.zone.adjustment > 0 ? '+' : ''}{result.calculation.zone.adjustment}%
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{result.calculation.zone.name}</div>
                  </div>
                </div>

                {/* Services Breakdown */}
                {result.calculation.services && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Service Pricing:</div>
                    {Object.entries(result.calculation.services).map(([type, service]: [string, any]) => (
                      <div key={type} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <span className="capitalize font-medium">{type}</span>
                          <span className="text-sm text-gray-500 ml-2">({service.area} sqft)</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 line-through">
                            {formatCurrency(service.basePrice)}
                          </div>
                          <div className={`font-bold ${getZoneColor(result.calculation.zone.adjustment)}`}>
                            {formatCurrency(service.adjustedPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Quote:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(result.summary.totalPrice || 0)}
                    </span>
                  </div>
                </div>

                {/* Generate Quote Button */}
                {!quoteGenerated && (
                  <button
                    onClick={generateQuote}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Quote...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Generate Official Quote
                      </>
                    )}
                  </button>
                )}

                {quoteGenerated && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Quote generated successfully!</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Enter an address and click Calculate to see pricing</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How Live Geopricing™ Works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Real-time drive time calculation using Google Maps Distance Matrix API</li>
            <li>• Automatic zone detection based on actual driving distance</li>
            <li>• Dynamic pricing adjustments: -5% for close, +10% for distant locations</li>
            <li>• Persistent quotes stored in MongoDB database</li>
            <li>• Optional email notifications to customers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}