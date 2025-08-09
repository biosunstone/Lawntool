'use client'

import { useState } from 'react'
import { MapPin, Calculator, Loader2, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react'
import dynamic from 'next/dynamic'

const AddressInput = dynamic(
  () => import('@/components/AddressInputSimple'),
  { 
    ssr: false,
    loading: () => (
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          disabled
          placeholder="Loading address search..."
          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50"
        />
      </div>
    )
  }
)

export default function GeofencingPage() {
  const [formData, setFormData] = useState({
    address: '',
    propertySize: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/geofencing/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerAddress: formData.address,
          propertySize: parseInt(formData.propertySize),
          customerEmail: formData.email,
          customerPhone: formData.phone
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        setSubmitted(true)
      } else {
        alert(data.error || 'Something went wrong')
      }
    } catch (error) {
      alert('Failed to calculate pricing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className={`${result.inServiceArea ? 'bg-green-600' : 'bg-orange-600'} text-white p-8`}>
              <div className="max-w-4xl mx-auto">
                {result.inServiceArea ? (
                  <>
                    <CheckCircle className="w-16 h-16 mb-4" />
                    <h1 className="text-3xl font-bold mb-2">Service Available!</h1>
                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-green-100 text-sm">Your Location</div>
                        <div className="font-semibold">{result.customerAddress}</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-green-100 text-sm">Drive Time</div>
                        <div className="font-semibold">{result.formattedDriveTime || `${result.driveTimeMinutes} min`}</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-green-100 text-sm">Service Zone</div>
                        <div className="font-semibold">{result.assignedZone?.zoneName}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-16 h-16 mb-4" />
                    <h1 className="text-3xl font-bold mb-2">Outside Service Area</h1>
                    <p className="text-orange-100 mt-2">
                      Drive time: {result.formattedDriveTime || `${result.driveTimeMinutes} minutes`}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="p-8">
              {result.inServiceArea ? (
                <>
                  {/* Service Pricing Table */}
                  {result.services && (
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold mb-4">Available Services</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-3 text-left border">Service</th>
                              <th className="px-4 py-3 text-center border">Status</th>
                              <th className="px-4 py-3 text-right border">Base Rate</th>
                              <th className="px-4 py-3 text-right border">Your Rate</th>
                              <th className="px-4 py-3 text-right border">Total Price</th>
                              <th className="px-4 py-3 text-center border">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.services.map((service: any, index: number) => (
                              <tr key={index} className={service.isAvailable ? '' : 'opacity-50 bg-gray-50'}>
                                <td className="px-4 py-3 border">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: service.labelColor }}
                                    />
                                    <span className="font-medium">{service.serviceName}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {service.description}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center border">
                                  {service.isAvailable ? (
                                    <span className="text-green-600">✓ Available</span>
                                  ) : (
                                    <span className="text-gray-400">✗ Unavailable</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right border">
                                  ${service.baseRate.toFixed(2)}/1000 sq ft
                                </td>
                                <td className="px-4 py-3 text-right border">
                                  ${service.finalRate.toFixed(2)}/1000 sq ft
                                  {service.finalRate !== service.baseRate && (
                                    <div className="text-xs text-gray-500">
                                      {service.zoneAdjustedRate !== service.baseRate && (
                                        <div>Zone: +{((service.zoneAdjustedRate / service.baseRate - 1) * 100).toFixed(0)}%</div>
                                      )}
                                      {service.serviceSpecificAdjustment > 0 && (
                                        <div>Service: +{service.serviceSpecificAdjustment}%</div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right border font-bold">
                                  {service.isAvailable ? formatCurrency(service.totalPrice) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center border">
                                  {service.isAvailable ? (
                                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                                      Book Now
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      {service.unavailableReason}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Zone Information */}
                  {result.allZonesTable && (
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold mb-4">Service Zone Information</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-3 text-left border">Zone</th>
                              <th className="px-4 py-3 text-left border">Drive Time</th>
                              <th className="px-4 py-3 text-right border">Base Rate</th>
                              <th className="px-4 py-3 text-right border">Adjusted Rate</th>
                              <th className="px-4 py-3 text-left border">Available Services</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.allZonesTable.map((zone: any, index: number) => (
                              <tr 
                                key={index}
                                className={zone.isCustomerZone ? 'bg-yellow-50 font-semibold' : ''}
                              >
                                <td className="px-4 py-3 border">
                                  {zone.zoneName}
                                  {zone.isCustomerZone && ' ⭐'}
                                </td>
                                <td className="px-4 py-3 border">
                                  <Clock className="inline w-4 h-4 mr-1" />
                                  {zone.driveTimeRange}
                                </td>
                                <td className="px-4 py-3 text-right border">
                                  ${zone.baseRate.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right border">
                                  ${zone.zoneAdjustedRate.toFixed(2)}
                                  {zone.zoneAdjustedRate !== zone.baseRate && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      (+{((zone.zoneAdjustedRate / zone.baseRate - 1) * 100).toFixed(0)}%)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 border">
                                  {zone.servicesAvailable.join(', ') || 'None'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {result.summary && (
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="font-bold text-blue-900 mb-3">Service Summary</h3>
                      <div className="text-blue-800 whitespace-pre-line">
                        {result.summary}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Out of Service Message */}
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <p className="text-lg text-gray-700 mb-6">
                      {result.noServiceMessage}
                    </p>
                    {result.contactSalesLink && (
                      <a 
                        href={result.contactSalesLink}
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Contact Sales Team
                      </a>
                    )}
                  </div>

                  {/* Show service zones for reference */}
                  {result.allZonesTable && result.allZonesTable.length > 0 && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-semibold mb-4 text-center">
                        Our Service Areas:
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-3 text-left border">Zone</th>
                              <th className="px-4 py-3 text-left border">Drive Time</th>
                              <th className="px-4 py-3 text-left border">Services</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.allZonesTable.map((zone: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-3 border">{zone.zoneName}</td>
                                <td className="px-4 py-3 border">{zone.driveTimeRange}</td>
                                <td className="px-4 py-3 border">
                                  {zone.servicesAvailable.join(', ') || 'None'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Try Another Quote */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setResult(null)
                    setFormData({ address: '', propertySize: '', email: '', phone: '' })
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Get Another Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Check Service Availability
            </h1>
            <p className="text-gray-600">
              Enter your address to see available services and pricing
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Address *
              </label>
              <AddressInput
                value={formData.address}
                onChange={(address) => setFormData({...formData, address})}
                placeholder="Start typing your address..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Suggestions will appear as you type
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Size (square feet) *
              </label>
              <input
                type="number"
                required
                min="100"
                value={formData.propertySize}
                onChange={(e) => setFormData({...formData, propertySize: e.target.value})}
                placeholder="5000"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the total lawn area in square feet
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="your@email.com"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Calculating Service Availability...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Check Availability & Pricing
                </>
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How Our Service Zones Work:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Zone 1 (0-10 min): Standard pricing, all services</li>
              <li>• Zone 2 (10-30 min): 15% surcharge, limited services</li>
              <li>• Pricing based on actual drive time from our shop</li>
              <li>• Service availability varies by zone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}