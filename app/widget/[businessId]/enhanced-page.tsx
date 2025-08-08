'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  X, Loader2, CheckCircle, MapPin, User, Mail, Phone, 
  ArrowRight, ArrowLeft, Calculator, Sparkles, Home,
  DollarSign, Shield, Star
} from 'lucide-react'

// Dynamically import the measurement component
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

interface Service {
  id: string
  name: string
  description: string
  icon: any
  basePrice: number
  pricePerSqFt: number
  selected: boolean
  frequency?: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly'
  addOns?: AddOn[]
}

interface AddOn {
  id: string
  name: string
  price: number
  selected: boolean
}

interface WidgetConfig {
  businessId: string
  businessName: string
  settings: any
  pricing?: any
  taxRate?: number
}

type Step = 'services' | 'measure' | 'contact' | 'review' | 'success'

export default function EnhancedWidgetPage() {
  const params = useParams()
  const businessId = params.businessId as string
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<Step>('services')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // Form data
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [propertyAddress, setPropertyAddress] = useState('')
  const [measurements, setMeasurements] = useState<any>(null)
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  })
  
  // Pricing calculation
  const [estimatedPrice, setEstimatedPrice] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [availableServices, setAvailableServices] = useState<Service[]>([])

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'services', label: 'Select Services', icon: Sparkles },
    { id: 'measure', label: 'Measure Property', icon: Calculator },
    { id: 'contact', label: 'Contact Info', icon: User },
    { id: 'review', label: 'Review Quote', icon: DollarSign },
    { id: 'success', label: 'Complete', icon: CheckCircle }
  ]

  useEffect(() => {
    fetchConfig()
  }, [businessId])

  // Calculate pricing whenever services or measurements change
  useEffect(() => {
    calculatePricing()
  }, [selectedServices, measurements])

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
      
      // Set up services based on business pricing settings
      const pricing = data.pricing || {
        lawnPerSqFt: 0.02,
        drivewayPerSqFt: 0.03,
        sidewalkPerSqFt: 0.025,
        buildingPerSqFt: 0.015,
        minimumCharge: 50
      }
      
      const services: Service[] = [
        {
          id: 'lawn',
          name: 'Lawn Measurement',
          description: 'Accurate lawn area measurement for landscaping services',
          icon: Home,
          basePrice: pricing.minimumCharge || 50,
          pricePerSqFt: pricing.lawnPerSqFt || 0.02,
          selected: false
        },
        {
          id: 'driveway',
          name: 'Driveway Measurement',
          description: 'Precise driveway area calculation for sealing or paving',
          icon: Home,
          basePrice: pricing.minimumCharge || 50,
          pricePerSqFt: pricing.drivewayPerSqFt || 0.03,
          selected: false
        },
        {
          id: 'sidewalk',
          name: 'Sidewalk Measurement',
          description: 'Sidewalk and walkway measurements for maintenance',
          icon: Home,
          basePrice: pricing.minimumCharge || 50,
          pricePerSqFt: pricing.sidewalkPerSqFt || 0.025,
          selected: false
        },
        {
          id: 'building',
          name: 'Building Measurement',
          description: 'Building footprint and roof area calculations',
          icon: Home,
          basePrice: pricing.minimumCharge || 50,
          pricePerSqFt: pricing.buildingPerSqFt || 0.015,
          selected: false
        }
      ]
      
      setAvailableServices(services)
    } catch (error) {
      console.error('Error loading widget config:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePricing = () => {
    if (!selectedServices.length) {
      setEstimatedPrice(0)
      setTotalPrice(0)
      return
    }

    let subtotal = 0
    
    selectedServices.forEach(service => {
      // Calculate price based on area measurements
      if (measurements && measurements.measurements) {
        let area = 0
        
        // Get the specific area for each service type
        switch(service.id) {
          case 'lawn':
            area = measurements.measurements.lawn?.total || measurements.measurements.lawn || 0
            break
          case 'driveway':
            area = measurements.measurements.driveway || 0
            break
          case 'sidewalk':
            area = measurements.measurements.sidewalk || 0
            break
          case 'building':
            area = measurements.measurements.building || 0
            break
          default:
            area = 0
        }
        
        // Calculate price: base price or area-based pricing (whichever is higher)
        const areaBasedPrice = area * service.pricePerSqFt
        const finalPrice = Math.max(service.basePrice, areaBasedPrice)
        subtotal += finalPrice
      } else {
        // If no measurements yet, just use base price
        subtotal += service.basePrice
      }
      
      // Add-ons
      if (service.addOns) {
        service.addOns.forEach(addOn => {
          if (addOn.selected) {
            subtotal += addOn.price
          }
        })
      }
    })
    
    // Apply discounts (example: 10% for 3+ services)
    const discountAmount = selectedServices.length >= 3 ? subtotal * 0.1 : 0
    const taxAmount = (subtotal - discountAmount) * (config?.taxRate || 0.08)
    const total = subtotal - discountAmount + taxAmount
    
    setEstimatedPrice(subtotal)
    setDiscount(discountAmount)
    setTax(taxAmount)
    setTotalPrice(total)
  }

  const handleServiceToggle = (serviceId: string) => {
    const service = availableServices.find(s => s.id === serviceId)
    if (!service) return
    
    const isSelected = selectedServices.some(s => s.id === serviceId)
    
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== serviceId))
    } else {
      setSelectedServices([...selectedServices, { ...service, selected: true }])
    }
  }

  const handleAddOnToggle = (serviceId: string, addOnId: string) => {
    setSelectedServices(selectedServices.map(service => {
      if (service.id === serviceId && service.addOns) {
        return {
          ...service,
          addOns: service.addOns.map(addOn => 
            addOn.id === addOnId ? { ...addOn, selected: !addOn.selected } : addOn
          )
        }
      }
      return service
    }))
  }

  const handleMeasurementComplete = (measurementData: any) => {
    // Store the full measurement data but don't show it to user
    setMeasurements(measurementData)
    // Extract the address from measurement data if available
    if (measurementData.address) {
      setPropertyAddress(measurementData.address)
    }
    calculatePricing()
    // Automatically move to next step after measurement
    nextStep()
  }

  const submitWidget = async () => {
    setSubmitting(true)
    
    try {
      // Prepare measurement data with actual measurements or estimates
      const measurementData = measurements || {
        address: propertyAddress,
        coordinates: { lat: 0, lng: 0 },
        measurements: {
          totalArea: 5000, // Default estimate
          perimeter: 300,
          lawn: {
            total: 3000,
            frontYard: 1000,
            backYard: 1500,
            sideYard: 500
          },
          driveway: 500,
          sidewalk: 200,
          building: 1200,
          other: 100
        }
      }
      
      // Ensure address is included
      if (!measurementData.address) {
        measurementData.address = propertyAddress
      }
      
      const response = await fetch('/api/widget/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          customerData: {
            ...customerData,
            address: { 
              street: propertyAddress,
              city: '',
              state: '',
              zip: ''
            }
          },
          measurementData,
          services: selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            selected: true,
            basePrice: s.basePrice,
            pricePerSqFt: s.pricePerSqFt
          })),
          pricing: {
            subtotal: estimatedPrice,
            discount,
            tax,
            total: totalPrice
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit')
      }
      
      const data = await response.json()
      setResult(data.data)
      setCurrentStep('success')
    } catch (error: any) {
      console.error('Error submitting:', error)
      alert(`Failed to submit: ${error?.message || 'Unknown error'}. Please try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  const nextStep = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id)
    }
  }

  const prevStep = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id)
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              {config.settings.showCompanyName && (
                <h1 className="text-xl font-bold" style={{ color: config.settings.primaryColor }}>
                  {config.businessName}
                </h1>
              )}
            </div>
            {totalPrice > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Estimated Total</p>
                <p className="text-2xl font-bold" style={{ color: config.settings.primaryColor }}>
                  ${totalPrice.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index
              const Icon = step.icon
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-colors
                        ${isActive ? 'bg-primary text-white' : ''}
                        ${isCompleted ? 'bg-green-500 text-white' : ''}
                        ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-400' : ''}
                      `}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`
                        h-1 flex-1 mx-2 transition-colors
                        ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                      `} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Service Selection */}
          {currentStep === 'services' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Select Your Services</h2>
              <p className="text-gray-600 mb-8">Choose the services you need for your property</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {availableServices.map(service => {
                  const Icon = service.icon
                  const isSelected = selectedServices.some(s => s.id === service.id)
                  
                  return (
                    <div
                      key={service.id}
                      onClick={() => handleServiceToggle(service.id)}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-all
                        ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <div className="flex items-start">
                        <div className={`
                          w-12 h-12 rounded-lg flex items-center justify-center mr-4
                          ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}
                        `}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          <p className="text-sm font-medium mt-2">
                            Starting at ${service.basePrice}
                            {service.pricePerSqFt > 0 && ` + $${service.pricePerSqFt}/sq ft`}
                          </p>
                        </div>
                        <div className={`
                          w-6 h-6 rounded-full border-2 ml-4
                          ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}
                        `}>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <button
                onClick={nextStep}
                disabled={selectedServices.length === 0}
                className="w-full py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          )}


          {/* Measurement */}
          {currentStep === 'measure' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Measure Your Property</h2>
              <p className="text-gray-600 mb-4">Enter your property address to measure the selected areas</p>
              
              {/* Show selected services */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Measuring for:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedServices.map(service => (
                    <span key={service.id} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">
                      {service.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="min-h-[500px] mb-8 relative">
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <DynamicMeasurementSection
                    onMeasurementComplete={handleMeasurementComplete}
                    selectedServices={selectedServices.map(s => s.id)}
                    hideResults={true}
                  />
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Please complete the measurement to continue. Search for your property address above and our system will automatically calculate the areas.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </button>
              </div>
            </div>
          )}


          {/* Contact Information */}
          {currentStep === 'contact' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              <p className="text-gray-600 mb-8">How can we reach you?</p>
              
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="inline h-4 w-4 mr-1" />
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Any special requests or gate codes?"
                    value={customerData.notes}
                    onChange={(e) => setCustomerData({...customerData, notes: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!customerData.name || !customerData.email}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center"
                >
                  Review Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Review Quote */}
          {currentStep === 'review' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Review Your Quote</h2>
              <p className="text-gray-600 mb-8">Please review your service details and pricing</p>
              
              {/* Service Summary */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-lg mb-4">Selected Services</h3>
                <div className="space-y-3">
                  {selectedServices.map(service => {
                    // Calculate service price based on measurements
                    let area = 0
                    let servicePrice = service.basePrice
                    
                    if (measurements && measurements.measurements) {
                      switch(service.id) {
                        case 'lawn':
                          area = measurements.measurements.lawn?.total || measurements.measurements.lawn || 0
                          break
                        case 'driveway':
                          area = measurements.measurements.driveway || 0
                          break
                        case 'sidewalk':
                          area = measurements.measurements.sidewalk || 0
                          break
                        case 'building':
                          area = measurements.measurements.building || 0
                          break
                      }
                      
                      const areaBasedPrice = area * service.pricePerSqFt
                      servicePrice = Math.max(service.basePrice, areaBasedPrice)
                    }
                    
                    const addOnsTotal = service.addOns?.filter(a => a.selected).reduce((sum, a) => sum + a.price, 0) || 0
                    const totalServicePrice = servicePrice + addOnsTotal
                    
                    return (
                      <div key={service.id} className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {area > 0 && (
                            <p className="text-sm text-gray-600">
                              {area.toLocaleString()} sq ft × ${service.pricePerSqFt.toFixed(3)}/sq ft
                            </p>
                          )}
                          {service.addOns?.filter(a => a.selected).map(addOn => (
                            <p key={addOn.id} className="text-sm text-gray-600 ml-4">
                              + {addOn.name}
                            </p>
                          ))}
                        </div>
                        <p className="font-medium">
                          ${totalServicePrice.toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Pricing Breakdown */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">${estimatedPrice.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount (10% for 3+ services)</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span style={{ color: config.settings.primaryColor }}>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Customer Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Contact:</strong> {customerData.name} • {customerData.email}
                  {customerData.phone && ` • ${customerData.phone}`}
                </p>
                {customerData.preferredDate && (
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Preferred Schedule:</strong> {customerData.preferredDate} {customerData.preferredTime && `(${customerData.preferredTime})`}
                  </p>
                )}
              </div>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </button>
                <button
                  onClick={submitWidget}
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center"
                  style={{ backgroundColor: config.settings.primaryColor }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Get Quote
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {currentStep === 'success' && result && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-4">Quote Generated Successfully!</h2>
              <p className="text-gray-600 mb-8">
                Thank you for your request! We've sent the detailed quote to your email.
              </p>
              
              {result.quoteNumber && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <p className="text-sm text-gray-600 mb-2">Your Quote Number</p>
                  <p className="text-3xl font-bold mb-4">{result.quoteNumber}</p>
                  
                  {result.total && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                      <p className="text-4xl font-bold" style={{ color: config.settings.primaryColor }}>
                        ${result.total.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-3">
                {result.viewUrl && (
                  <a
                    href={result.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    style={{ backgroundColor: config.settings.primaryColor }}
                  >
                    View Your Quote Online
                  </a>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Get Another Quote
                </button>
              </div>
              
              <div className="mt-8 flex items-center justify-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-2" />
                Your information is secure and will never be shared
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}