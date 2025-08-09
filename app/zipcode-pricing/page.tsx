'use client'

import { useState } from 'react'
import { MapPin, Calculator, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function ZipCodePricingPage() {
  const [formData, setFormData] = useState({
    zipCode: '',
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
      const response = await fetch('/api/zipcode-pricing/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipCode: formData.zipCode,
          propertySize: parseInt(formData.propertySize),
          customerEmail: formData.email,
          customerPhone: formData.phone,
          saveToDatabase: true
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

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className={`${result.inServiceArea ? 'bg-green-600' : 'bg-yellow-600'} text-white p-8 text-center`}>
              {result.inServiceArea ? (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold mb-2">Your Personalized Quote</h1>
                  <p className="text-green-100">
                    ZIP Code: {result.zipCode}
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold mb-2">Service Not Available</h1>
                  <p className="text-yellow-100">
                    ZIP Code: {result.zipCode}
                  </p>
                </>
              )}
            </div>

            {/* Results */}
            <div className="p-8">
              {result.inServiceArea ? (
                <>
                  {/* Service Details */}
                  <div className="mb-8">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600">ZIP Code</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {result.zipCode}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600">Property Size</div>
                        <div className="text-2xl font-bold text-purple-700">
                          {parseInt(formData.propertySize).toLocaleString()} sq ft
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600">Total Price</div>
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(result.pricing.totalPrice, result.pricing.currency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Table */}
                  {result.formattedTable && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold mb-4">Zone-Based Pricing</h2>
                      <div 
                        dangerouslySetInnerHTML={{ __html: result.formattedTable }}
                        className="overflow-x-auto"
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  {result.explanation && (
                    <div className="mb-8 p-6 bg-blue-50 rounded-lg">
                      <p className="text-gray-700 leading-relaxed">
                        {result.explanation}
                      </p>
                    </div>
                  )}

                  {/* Adjustment Details */}
                  {result.pricing.adjustment && (
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Pricing Details:</h3>
                      <ul className="space-y-1 text-sm">
                        <li>Base Rate: {formatCurrency(result.pricing.baseRate, result.pricing.currency)} per 1,000 sq ft</li>
                        <li>
                          Adjustment: {' '}
                          <span style={{ color: result.pricing.adjustment.value < 0 ? '#16a34a' : result.pricing.adjustment.value > 0 ? '#dc2626' : '#000' }}>
                            {result.pricing.adjustment.value < 0 ? 'Discount' : result.pricing.adjustment.value > 0 ? 'Surcharge' : 'None'}
                            {result.pricing.adjustment.value !== 0 && (
                              <> ({result.pricing.adjustment.type === 'fixed' ? formatCurrency(Math.abs(result.pricing.adjustment.value), result.pricing.currency) : `${result.pricing.adjustment.value}%`})</>
                            )}
                          </span>
                        </li>
                        <li>Adjusted Rate: {formatCurrency(result.pricing.adjustedRate, result.pricing.currency)} per 1,000 sq ft</li>
                        <li className="font-semibold pt-2 border-t">
                          Total: {formatCurrency(result.pricing.totalPrice, result.pricing.currency)} for {parseInt(formData.propertySize).toLocaleString()} sq ft
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="text-center">
                    <button className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                      Select This Package
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* No Service Message */}
                  <div className="text-center py-8">
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

                  {/* Show available zones */}
                  {result.allZonesTable && result.allZonesTable.length > 0 && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-semibold mb-4 text-center">
                        Our Current Service Areas:
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {result.allZonesTable.map((zone: any) => (
                          <div key={zone.zipCode} className="p-3 bg-gray-50 rounded-lg text-center">
                            <div className="font-semibold">{zone.zipCode}</div>
                            <div className="text-sm text-gray-600">{zone.adjustment}</div>
                          </div>
                        ))}
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
                    setFormData({ zipCode: '', propertySize: '', email: '', phone: '' })
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
              <Calculator className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Get Your Instant Quote
            </h1>
            <p className="text-gray-600">
              Enter your ZIP code and property size for personalized pricing
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP/Postal Code *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.zipCode}
                  onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                  placeholder="12345 or M5H 2N1"
                  pattern="^(\d{5}(-\d{4})?|[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)$"
                  title="Please enter a valid ZIP code (12345) or Canadian postal code (M5H 2N1)"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                US: 5-digit ZIP code (12345) | Canada: Postal code (M5H 2N1)
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
                  Calculating Your Price...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Get Instant Quote
                </>
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How Our Pricing Works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Zone-based pricing varies by ZIP code</li>
              <li>• High-density routes receive discounts</li>
              <li>• Remote locations may have surcharges</li>
              <li>• All prices include standard service</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}