'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  Plus, 
  Trash2, 
  Calculator,
  Save,
  Send,
  Tag,
  Info,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Measurement {
  _id: string
  address: string
  measurements: {
    totalArea: number
    lawn: {
      total: number
      frontYard: number
      backYard: number
      sideYard: number
    }
    driveway: number
    sidewalk: number
    building: number
  }
  createdAt: string
}

interface Service {
  name: string
  description: string
  area: number
  pricePerUnit: number
  totalPrice: number
}

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const measurementIdFromUrl = searchParams.get('measurementId')
  
  const [loading, setLoading] = useState(false)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null)
  
  // Customer data
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    tags: [] as string[]
  })
  
  // Quote data
  const [services, setServices] = useState<Service[]>([])
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)
  const [validDays, setValidDays] = useState(30)
  const [taxRate, setTaxRate] = useState(0.08) // Default 8%
  
  // Pricing rules preview
  const [pricingPreview, setPricingPreview] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [customerTags, setCustomerTags] = useState('')
  
  // Default pricing
  const defaultPricing = {
    lawnPerSqFt: 0.02,
    drivewayPerSqFt: 0.03,
    sidewalkPerSqFt: 0.025,
    minimumCharge: 50
  }

  useEffect(() => {
    fetchMeasurements()
    fetchBusinessSettings()
  }, [])

  const fetchBusinessSettings = async () => {
    try {
      const response = await fetch('/api/business/tax-rate')
      if (response.ok) {
        const data = await response.json()
        setTaxRate(data.taxRate || 0.08)
      } else {
        setTaxRate(0.08) // Default 8% if fetch fails
      }
    } catch (error) {
      console.error('Error fetching business settings:', error)
      setTaxRate(0.08) // Default 8% on error
    }
  }

  useEffect(() => {
    if (selectedMeasurement) {
      generateDefaultServices()
    }
  }, [selectedMeasurement])

  // Auto-check pricing rules when services are generated
  useEffect(() => {
    if (services.length > 0 && selectedMeasurement) {
      // Delay slightly to allow services to be set
      const timer = setTimeout(() => {
        previewPricingRules()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [selectedMeasurement]) // Trigger when measurement changes

  const fetchMeasurements = async () => {
    try {
      const response = await fetch('/api/measurements')
      if (response.ok) {
        const data = await response.json()
        setMeasurements(data)
        
        // Auto-select measurement if ID provided in URL
        if (measurementIdFromUrl) {
          const measurement = data.find((m: Measurement) => m._id === measurementIdFromUrl)
          if (measurement) {
            setSelectedMeasurement(measurement)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch measurements:', error)
    }
  }

  const generateDefaultServices = () => {
    if (!selectedMeasurement) return
    
    const m = selectedMeasurement.measurements
    const newServices: Service[] = []
    
    // Lawn service
    if (m.lawn.total > 0) {
      newServices.push({
        name: 'Lawn Treatment',
        description: 'Complete lawn care service including mowing, edging, and treatment',
        area: m.lawn.total,
        pricePerUnit: defaultPricing.lawnPerSqFt,
        totalPrice: Math.max(m.lawn.total * defaultPricing.lawnPerSqFt, defaultPricing.minimumCharge)
      })
    }
    
    // Driveway service
    if (m.driveway > 0) {
      newServices.push({
        name: 'Driveway Cleaning',
        description: 'Power washing and cleaning service',
        area: m.driveway,
        pricePerUnit: defaultPricing.drivewayPerSqFt,
        totalPrice: m.driveway * defaultPricing.drivewayPerSqFt
      })
    }
    
    // Sidewalk service
    if (m.sidewalk > 0) {
      newServices.push({
        name: 'Sidewalk Maintenance',
        description: 'Sidewalk cleaning and treatment',
        area: m.sidewalk,
        pricePerUnit: defaultPricing.sidewalkPerSqFt,
        totalPrice: m.sidewalk * defaultPricing.sidewalkPerSqFt
      })
    }
    
    setServices(newServices)
  }

  const previewPricingRules = async () => {
    if (!selectedMeasurement || services.length === 0) return
    
    setPreviewLoading(true)
    try {
      // Extract ZIP code from address
      const addressParts = selectedMeasurement.address?.split(',') || []
      const zipCodeMatch = addressParts[addressParts.length - 1]?.trim().match(/\d{5}/)
      const zipCode = zipCodeMatch ? zipCodeMatch[0] : undefined
      
      // Parse customer tags
      const tags = customerTags.split(',').map(t => t.trim()).filter(Boolean)
      
      const response = await fetch('/api/pricing-rules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipCode,
          customerTags: tags,
          totalArea: selectedMeasurement.measurements.totalArea,
          services,
          date: new Date()
        })
      })
      
      if (response.ok) {
        const preview = await response.json()
        setPricingPreview(preview)
        
        // Update services with adjusted prices
        if (preview.services && preview.services.length > 0) {
          setServices(preview.services)
          
          if (preview.appliedRules.length > 0) {
            toast.success(`${preview.appliedRules.length} pricing rule(s) applied!`)
          }
        }
      }
    } catch (error) {
      console.error('Error previewing pricing:', error)
      toast.error('Failed to preview pricing rules')
    } finally {
      setPreviewLoading(false)
    }
  }

  const addService = () => {
    setServices([...services, {
      name: '',
      description: '',
      area: 0,
      pricePerUnit: 0,
      totalPrice: 0
    }])
  }

  const updateService = (index: number, field: keyof Service, value: any) => {
    const updated = [...services]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    
    // Recalculate total if area or price changed
    if (field === 'area' || field === 'pricePerUnit') {
      updated[index].totalPrice = updated[index].area * updated[index].pricePerUnit
    }
    
    setServices(updated)
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = services.reduce((sum, service) => sum + service.totalPrice, 0)
    const tax = subtotal * taxRate
    const total = subtotal + tax - discount
    
    return { subtotal, tax, total }
  }

  const handleSubmit = async (sendNow = false) => {
    if (!selectedMeasurement) {
      toast.error('Please select a measurement')
      return
    }
    
    if (!customerData.name || !customerData.email) {
      toast.error('Please fill in customer information')
      return
    }
    
    if (services.length === 0) {
      toast.error('Please add at least one service')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurementId: selectedMeasurement._id,
          customerData: {
            ...customerData,
            tags: customerTags.split(',').map(t => t.trim()).filter(Boolean)
          },
          services,
          notes,
          discount,
          validDays,
          status: sendNow ? 'sent' : 'draft'
        })
      })
      
      if (response.ok) {
        const { quote } = await response.json()
        if (sendNow) {
          toast.success('Quote sent successfully! Email notification has been sent to the customer.')
        } else {
          toast.success('Quote saved as draft!')
        }
        router.push(`/quotes/${quote._id}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create quote')
      }
    } catch (error) {
      console.error('Failed to create quote:', error)
      toast.error('Failed to create quote')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, tax, total } = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/quotes"
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Quote</h1>
              <p className="mt-1 text-sm text-gray-600">
                Generate a quote from property measurements
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Measurement Selection */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <MapPin className="inline h-5 w-5 mr-2" />
              Select Measurement
            </h2>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              value={selectedMeasurement?._id || ''}
              onChange={(e) => {
                const m = measurements.find(m => m._id === e.target.value)
                setSelectedMeasurement(m || null)
              }}
            >
              <option value="">Select a measurement...</option>
              {measurements.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.address} - {m.measurements.totalArea.toLocaleString()} sq ft 
                  ({new Date(m.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
            
            {selectedMeasurement && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Property Details:</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>Total Area: {selectedMeasurement.measurements.totalArea.toLocaleString()} sq ft</div>
                  <div>Lawn: {selectedMeasurement.measurements.lawn.total.toLocaleString()} sq ft</div>
                  <div>Driveway: {selectedMeasurement.measurements.driveway.toLocaleString()} sq ft</div>
                  <div>Sidewalk: {selectedMeasurement.measurements.sidewalk.toLocaleString()} sq ft</div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <User className="inline h-5 w-5 mr-2" />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Tags
                  <span className="ml-1 text-xs text-gray-500">(for pricing rules)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={customerTags}
                  onChange={(e) => setCustomerTags(e.target.value)}
                  placeholder="vip, premium, loyal (comma-separated)"
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                <Calculator className="inline h-5 w-5 mr-2" />
                Services
              </h2>
              <button
                onClick={addService}
                className="flex items-center px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </button>
            </div>
            
            {services.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No services added. Select a measurement to generate default services.
              </p>
            ) : (
              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                          value={service.name}
                          onChange={(e) => updateService(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Area (sq ft)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                          value={service.area}
                          onChange={(e) => updateService(index, 'area', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price per sq ft
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                          value={service.pricePerUnit}
                          onChange={(e) => updateService(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Price
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                            value={service.totalPrice}
                            onChange={(e) => updateService(index, 'totalPrice', parseFloat(e.target.value) || 0)}
                          />
                          <button
                            onClick={() => removeService(index)}
                            className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                          value={service.description}
                          onChange={(e) => updateService(index, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Rules Preview */}
          {services.length > 0 && selectedMeasurement && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  <Tag className="inline h-5 w-5 mr-2" />
                  Pricing Rules
                </h2>
                <button
                  onClick={previewPricingRules}
                  disabled={previewLoading}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {previewLoading ? (
                    <>
                      <Calculator className="h-4 w-4 mr-1 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-1" />
                      Check for Pricing Rules
                    </>
                  )}
                </button>
              </div>

              {/* Show automatically detected context */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-900 mb-2">Automatically Detected Context:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                  <div>
                    <span className="font-medium">ZIP Code:</span>{' '}
                    {(() => {
                      const addressParts = selectedMeasurement.address?.split(',') || []
                      const zipMatch = addressParts[addressParts.length - 1]?.trim().match(/\d{5}/)
                      return zipMatch ? zipMatch[0] : 'Not detected'
                    })()}
                  </div>
                  <div>
                    <span className="font-medium">Total Area:</span>{' '}
                    {selectedMeasurement.measurements.totalArea} sq ft
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date().toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Services:</span>{' '}
                    {services.length} selected
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2 italic">
                  These values are used to match Zone, Volume, and Service rules automatically
                </p>
              </div>

              {pricingPreview && (
                <div className="space-y-3">
                  {pricingPreview.appliedRules && pricingPreview.appliedRules.length > 0 ? (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">
                              {pricingPreview.appliedRules.length} pricing rule(s) applied
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              {pricingPreview.summary?.percentageChange > 0 ? 'Increased' : 'Decreased'} by {Math.abs(pricingPreview.summary?.percentageChange || 0)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {pricingPreview.appliedRules.map((rule: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{rule.ruleName}</p>
                                <p className="text-xs text-gray-600 mt-0.5">Type: {rule.ruleType}</p>
                                {rule.description && (
                                  <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                                )}
                              </div>
                              <span className={`text-sm font-bold ${
                                rule.adjustment > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {rule.adjustment > 0 ? '+' : ''}${rule.adjustment.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Original Total:</span>
                          <span className="line-through text-gray-500">
                            ${pricingPreview.originalTotal?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="font-medium text-gray-900">Adjusted Total:</span>
                          <span className="font-bold text-primary">
                            ${pricingPreview.adjustedTotal?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center">
                        <Info className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-600">
                          No pricing rules apply to this quote
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!pricingPreview && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    Click "Check for Pricing Rules" to see if any automatic price adjustments apply
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or terms..."
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(1)}%):</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount:</span>
                <div className="flex items-center">
                  <span className="mr-1">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-semibold text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid for (days):
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
              />
            </div>
            
            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <Save className="h-5 w-5 mr-2" />
                Save as Draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-5 w-5 mr-2" />
                Send Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}