'use client'

import { useState, useEffect } from 'react'
import { Home, Trees, Car, Square, Building, Ruler, MapPin, ShoppingCart, Check } from 'lucide-react'
import { formatArea } from '@/lib/propertyMeasurement'
import PropertyOverlayMap from './PropertyOverlayMap'
import EditableMeasurements from './EditableMeasurements'
import { useCart } from '@/contexts/CartContext'
import { ICartItem } from '@/models/Cart'
import toast from 'react-hot-toast'

export interface PropertyMeasurements {
  address: string
  coordinates?: {
    lat: number
    lng: number
  }
  totalArea: number
  perimeter: number
  lawn: {
    frontYard: number
    backYard: number
    sideYard: number
    total: number
    perimeter: number
  }
  driveway: number
  sidewalk: number
  building: number
  other: number
}

interface MeasurementResultsProps {
  measurements: PropertyMeasurements | null
  isLoading: boolean
  onMeasurementsUpdated?: (measurements: any) => void
  businessId?: string
}

// Default pricing per square foot (can be customized per business)
const DEFAULT_PRICING = {
  lawn: 0.05,      // $0.05 per sq ft
  driveway: 0.15,  // $0.15 per sq ft
  sidewalk: 0.10,  // $0.10 per sq ft
  building: 0.08   // $0.08 per sq ft
}

export default function MeasurementResultsWithCart({ 
  measurements, 
  isLoading, 
  onMeasurementsUpdated,
  businessId = '507f1f77bcf86cd799439011' // Default business ID for testing
}: MeasurementResultsProps) {
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [currentMeasurements, setCurrentMeasurements] = useState(measurements)
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set())
  const { addToCart, cart } = useCart()

  // Show measurements immediately after loading
  useEffect(() => {
    if (measurements && !isLoading) {
      setShowMeasurements(true)
      setCurrentMeasurements(measurements)
    }
  }, [measurements, isLoading])

  // Check which items are already in cart
  useEffect(() => {
    if (cart) {
      const itemsInCart = new Set(cart.items.map(item => item.serviceType))
      setAddedItems(itemsInCart)
    }
  }, [cart])

  const handleMeasurementsUpdate = (updatedMeasurements: PropertyMeasurements) => {
    setCurrentMeasurements(updatedMeasurements)
    if (onMeasurementsUpdated) {
      onMeasurementsUpdated(updatedMeasurements)
    }
  }

  const handleAddToCart = async (serviceType: 'lawn' | 'driveway' | 'sidewalk' | 'building') => {
    if (!currentMeasurements) return

    let area = 0
    let name = ''
    let description = ''
    let pricePerUnit = DEFAULT_PRICING[serviceType]

    switch(serviceType) {
      case 'lawn':
        area = currentMeasurements.lawn?.total || 0
        name = 'Lawn Mowing & Treatment'
        description = `Complete lawn care service for ${formatArea(area)}`
        break
      case 'driveway':
        area = currentMeasurements.driveway || 0
        name = 'Driveway Sealing'
        description = `Professional driveway sealing for ${formatArea(area)}`
        break
      case 'sidewalk':
        area = currentMeasurements.sidewalk || 0
        name = 'Sidewalk Cleaning'
        description = `Power washing and cleaning for ${formatArea(area)}`
        break
      case 'building':
        area = currentMeasurements.building || 0
        name = 'Building Exterior Service'
        description = `Exterior maintenance for ${formatArea(area)}`
        break
    }

    const cartItem: ICartItem = {
      serviceType,
      name,
      description,
      area,
      pricePerUnit,
      totalPrice: Math.round(area * pricePerUnit * 100) / 100
    }

    try {
      await addToCart(cartItem, businessId)
      setAddedItems(prev => new Set([...Array.from(prev), serviceType]))
    } catch (error) {
      console.error('Failed to add to cart:', error)
      toast.error('Failed to add service to cart')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!measurements || !currentMeasurements) {
    return null
  }

  const measurementItems = [
    {
      icon: Trees,
      label: 'Total Lawn Area',
      value: currentMeasurements.lawn?.total || 0,
      serviceType: 'lawn' as const,
      price: (currentMeasurements.lawn?.total || 0) * DEFAULT_PRICING.lawn,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      breakdown: [
        { label: 'Front Yard', value: currentMeasurements.lawn?.frontYard || 0 },
        { label: 'Back Yard', value: currentMeasurements.lawn?.backYard || 0 },
        { label: 'Side Yard', value: currentMeasurements.lawn?.sideYard || 0 },
      ]
    },
    {
      icon: Car,
      label: 'Driveway',
      value: currentMeasurements.driveway || 0,
      serviceType: 'driveway' as const,
      price: (currentMeasurements.driveway || 0) * DEFAULT_PRICING.driveway,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      icon: Square,
      label: 'Sidewalk',
      value: currentMeasurements.sidewalk || 0,
      serviceType: 'sidewalk' as const,
      price: (currentMeasurements.sidewalk || 0) * DEFAULT_PRICING.sidewalk,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Building,
      label: 'Building',
      value: currentMeasurements.building || 0,
      serviceType: 'building' as const,
      price: (currentMeasurements.building || 0) * DEFAULT_PRICING.building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Home,
      label: 'Total Property',
      value: currentMeasurements.totalArea || 0,
      serviceType: null,
      price: 0,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Map Display */}
      {measurements.coordinates && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-2xl font-bold">Property Satellite View</h2>
          </div>
          <PropertyOverlayMap 
            measurements={measurements}
          />
        </div>
      )}
      
      {/* Measurements Display with Add to Cart */}
      <div className={`bg-white rounded-lg shadow-lg p-8 transition-all duration-500 ${showMeasurements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="text-2xl font-bold mb-2">Property Measurements</h2>
        <p className="text-gray-600 mb-2">{measurements.address}</p>
        <div className="mb-6 p-3 bg-primary/10 rounded-lg inline-block">
          <p className="text-lg font-semibold text-primary">
            Total Property: {formatArea(currentMeasurements.totalArea || 0)}
          </p>
          <p className="text-sm text-primary/80 mt-1">
            Perimeter: {(currentMeasurements.perimeter || 0).toLocaleString()} linear ft
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {measurementItems.map((item, index) => (
            <div 
              key={item.label} 
              className={`border rounded-lg p-6 transition-all duration-500 ${showMeasurements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: showMeasurements ? `${index * 100}ms` : '0ms' }}>
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${item.bgColor} ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className="text-2xl font-bold">{formatArea(item.value)}</p>
                </div>
              </div>
              
              {item.breakdown && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    {item.breakdown.map((sub) => (
                      <div key={sub.label} className="flex justify-between text-sm">
                        <span className="text-gray-600">{sub.label}:</span>
                        <span className="font-medium">
                          {formatArea(sub.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add to Cart Button */}
              {item.serviceType && item.value > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Service Price:</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${item.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${DEFAULT_PRICING[item.serviceType]}/sq ft
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleAddToCart(item.serviceType!)}
                    disabled={addedItems.has(item.serviceType)}
                    className={`
                      w-full py-2 px-4 rounded-lg font-medium transition-all duration-200
                      ${addedItems.has(item.serviceType) 
                        ? 'bg-green-100 text-green-700 cursor-default' 
                        : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {addedItems.has(item.serviceType) ? (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        Added to Cart
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Quick Add All Services */}
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold mb-2">Complete Property Service Package</h3>
          <p className="text-gray-600 mb-4">Add all available services to your cart at once</p>
          <button
            onClick={() => {
              ['lawn', 'driveway', 'sidewalk', 'building'].forEach(serviceType => {
                const service = serviceType as 'lawn' | 'driveway' | 'sidewalk' | 'building'
                if (!addedItems.has(service)) {
                  const item = measurementItems.find(m => m.serviceType === service)
                  if (item && item.value > 0) {
                    handleAddToCart(service)
                  }
                }
              })
            }}
            className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Add All Services to Cart
            </span>
          </button>
        </div>
        
        {/* Editable Measurements Section */}
        <div className="mt-8">
          <EditableMeasurements 
            measurements={currentMeasurements} 
            onUpdate={handleMeasurementsUpdate}
          />
        </div>
        
        <div className="mt-8 space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Ruler className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">
                Measurements are calculated based on property analysis and typical lot sizes for this area
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}