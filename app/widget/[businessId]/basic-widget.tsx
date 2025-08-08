'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { X, Loader2, CheckCircle, MapPin, User, Mail, Phone } from 'lucide-react'

// Dynamically import the measurement component to avoid SSR issues
const DynamicMeasurementSection = dynamic(
  () => import('@/components/MeasurementSection'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
)

interface WidgetConfig {
  businessId: string
  businessName: string
  settings: {
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    borderRadius: string
    showCompanyName: boolean
    showDescription: boolean
    description: string
    buttonText: string
    collectPhone: boolean
    collectAddress: boolean
    allowedServices: string[]
    autoGenerateQuote?: boolean
    sendQuoteEmail?: boolean
  }
}

export default function BasicWidget() {
  const params = useParams()
  const businessId = params.businessId as string
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'info' | 'measure' | 'success'>('info')
  const [measurementData, setMeasurementData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  })

  useEffect(() => {
    fetchConfig()
  }, [businessId])

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/widget/config?businessId=${businessId}`)
      if (!response.ok) throw new Error('Failed to load configuration')
      
      const data = await response.json()
      setConfig(data)
      
      // Apply custom styles
      if (data.settings.primaryColor) {
        document.documentElement.style.setProperty('--widget-primary', data.settings.primaryColor)
      }
      if (data.settings.fontFamily) {
        document.documentElement.style.setProperty('--widget-font', data.settings.fontFamily)
      }
    } catch (error) {
      console.error('Error loading widget config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMeasurementComplete = useCallback(async (measurements: any) => {
    setSubmitting(true)
    
    try {
      const measurementData = {
        address: customerData.address?.street || 'Address from map',
        coordinates: measurements.coordinates || { lat: 0, lng: 0 },
        measurements: measurements
      }
      
      const response = await fetch('/api/widget/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          customerData,
          measurementData
        })
      })

      if (!response.ok) throw new Error('Failed to submit measurement')
      
      const data = await response.json()
      setResult(data.data)
      setStep('success')
    } catch (error) {
      console.error('Error submitting measurement:', error)
      alert('Failed to submit measurement. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [businessId, customerData])

  // Listen for measurement completion events
  useEffect(() => {
    if (step !== 'measure') return

    const handleMeasurementEvent = (event: CustomEvent) => {
      if (event.detail && event.detail.measurements) {
        setMeasurementData(event.detail)
        handleMeasurementComplete(event.detail.measurements)
      }
    }

    // Listen for measurement completion event
    window.addEventListener('measurementComplete', handleMeasurementEvent as EventListener)

    return () => {
      window.removeEventListener('measurementComplete', handleMeasurementEvent as EventListener)
    }
  }, [step, handleMeasurementComplete])

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('measure')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Widget configuration not found</p>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 py-8 px-4"
      style={{ fontFamily: config.settings.fontFamily }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        {config.settings.showCompanyName && (
          <div className="text-center mb-8">
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: config.settings.primaryColor }}
            >
              {config.businessName}
            </h1>
            {config.settings.showDescription && (
              <p className="text-gray-600">{config.settings.description}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div 
          className="bg-white shadow-lg overflow-hidden"
          style={{ borderRadius: config.settings.borderRadius }}
        >
          {step === 'info' && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Get Your Instant Quote</h2>
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <User className="inline h-4 w-4 mr-1" />
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    />
                  </div>
                </div>

                {config.settings.collectPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    />
                  </div>
                )}

                {config.settings.collectAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      Service Address
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Street address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        value={customerData.address.street}
                        onChange={(e) => setCustomerData({...customerData, address: {...customerData.address, street: e.target.value}})}
                      />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          value={customerData.address.city}
                          onChange={(e) => setCustomerData({...customerData, address: {...customerData.address, city: e.target.value}})}
                        />
                        <input
                          type="text"
                          placeholder="State"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          value={customerData.address.state}
                          onChange={(e) => setCustomerData({...customerData, address: {...customerData.address, state: e.target.value}})}
                        />
                        <input
                          type="text"
                          placeholder="ZIP"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          value={customerData.address.zip}
                          onChange={(e) => setCustomerData({...customerData, address: {...customerData.address, zip: e.target.value}})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 text-white font-semibold rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: config.settings.primaryColor,
                    borderRadius: config.settings.borderRadius
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Continue to Measurement →
                </button>
              </form>
            </div>
          )}

          {step === 'measure' && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Measure Your Property</h2>
              <p className="text-gray-600 mb-4">
                Search for your property address, then use the drawing tools to outline the areas you need serviced.
              </p>
              <div className="h-[600px] relative">
                <DynamicMeasurementSection 
                  onMeasurementComplete={(measurements: any) => {
                    // Dispatch custom event for measurement completion
                    const event = new CustomEvent('measurementComplete', {
                      detail: { measurements }
                    })
                    window.dispatchEvent(event)
                  }}
                />
                {submitting && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-lg font-medium">Generating your quote...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'success' && result && (
            <div className="p-8 text-center">
              <CheckCircle 
                className="h-16 w-16 mx-auto mb-4"
                style={{ color: config.settings.primaryColor }}
              />
              <h2 className="text-2xl font-semibold mb-4">Quote Generated Successfully!</h2>
              
              {result.quoteNumber && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Your Quote Number</p>
                  <p className="text-2xl font-bold mb-4">{result.quoteNumber}</p>
                  
                  {result.total && (
                    <>
                      <p className="text-sm text-gray-600 mb-2">Estimated Total</p>
                      <p className="text-3xl font-bold" style={{ color: config.settings.primaryColor }}>
                        ${result.total.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-6">
                We've sent the detailed quote to your email address. You can also view it online using the link below.
              </p>

              {result.viewUrl && (
                <a
                  href={result.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 text-white font-semibold rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: config.settings.primaryColor,
                    borderRadius: config.settings.borderRadius
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  View Your Quote Online
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}