'use client'

import { useState } from 'react'
import { MapPin, Calculator, Loader2, CheckCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Google Maps
const AddressAutocomplete = dynamic(
  () => import('@/components/AddressAutocomplete'),
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

export default function GeopricingFormPage() {
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
      const response = await fetch('/api/geopricing/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerAddress: formData.address,
          propertySize: parseInt(formData.propertySize),
          customerEmail: formData.email,
          customerPhone: formData.phone,
          generateTable: true,
          saveToDatabase: true,
          source: 'website'
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
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-green-600 text-white p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Your Personalized Quote</h1>
              <p className="text-green-100">
                Quote ID: {result.calculationId}
              </p>
            </div>

            {/* Results */}
            <div className="p-8">
              {/* Address & Zone Info */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin className="w-5 h-5" />
                  <span>Service Address:</span>
                </div>
                <p className="text-lg font-semibold mb-4">{formData.address}</p>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600">Drive Time</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {result.pricing.driveTime} minutes
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600">Service Zone</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {result.pricing.zone}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600">Property Size</div>
                    <div className="text-2xl font-bold text-green-700">
                      {formData.propertySize} sq ft
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Table */}
              {result.formattedOutput?.table && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Zone-Based Pricing</h2>
                  <div 
                    dangerouslySetInnerHTML={{ __html: result.formattedOutput.table }}
                    className="overflow-x-auto"
                  />
                </div>
              )}

              {/* Explanation */}
              {result.formattedOutput?.explanation && (
                <div className="mb-8 p-6 bg-blue-50 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">
                    {result.formattedOutput.explanation}
                  </p>
                </div>
              )}

              {/* Final Price */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 text-center">
                <p className="text-lg mb-2">Your Total Price</p>
                <p className="text-4xl font-bold">
                  {formatCurrency(result.pricing.finalPrice)}
                </p>
                <p className="text-green-100 mt-2">
                  for {formData.propertySize} sq ft property
                </p>
              </div>

              {/* Next Steps */}
              <div className="mt-8 text-center">
                <p className="text-gray-600 mb-4">
                  We've saved your quote and will be in touch soon!
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setResult(null)
                    setFormData({ address: '', propertySize: '', email: '', phone: '' })
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              Enter your property details for personalized pricing
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Address *
              </label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(address) => setFormData({...formData, address})}
                placeholder="Start typing your address..."
                required
              />
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
                placeholder="(416) 555-0123"
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
              <li>• Prices adjust based on distance from our service center</li>
              <li>• Close locations (0-5 min): 5% discount</li>
              <li>• Standard locations (5-20 min): Base rate</li>
              <li>• Extended locations (20+ min): 10% surcharge</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}