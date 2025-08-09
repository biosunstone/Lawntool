'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MapPin, Ruler, Calculator, Package, ChevronRight } from 'lucide-react'
import GeopricingRateTable from '@/components/GeopricingRateTable'
import { 
  calculateDynamicGeopricing, 
  getShopLocation,
  formatCurrency,
  GeopricingResult 
} from '@/lib/geopricing/dynamicPricingEngine'

interface MeasurementData {
  address: string
  city: string
  propertySize: number
  lawnSize: number
  drivewaySize: number
  sidewalkSize: number
  timestamp: string
}

export default function MeasurementResultsPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [measurementData, setMeasurementData] = useState<MeasurementData | null>(null)
  const [geopricingResult, setGeopricingResult] = useState<GeopricingResult | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [totalPrice, setTotalPrice] = useState<number>(0)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadMeasurementData()
  }, [searchParams])

  const loadMeasurementData = async () => {
    try {
      setLoading(true)
      setError('')

      // Get data from URL params or session
      const address = searchParams.get('address') || '290 Bremner Blvd, Toronto, ON'
      const city = searchParams.get('city') || 'Toronto'
      const propertySize = parseInt(searchParams.get('propertySize') || '8500')
      const lawnSize = parseInt(searchParams.get('lawnSize') || '5000')
      const drivewaySize = parseInt(searchParams.get('drivewaySize') || '1500')
      const sidewalkSize = parseInt(searchParams.get('sidewalkSize') || '500')

      const measurement: MeasurementData = {
        address,
        city,
        propertySize,
        lawnSize,
        drivewaySize,
        sidewalkSize,
        timestamp: new Date().toISOString()
      }

      setMeasurementData(measurement)

      // Get shop location for the city
      const shopLocation = await getShopLocation(city)
      
      if (!shopLocation) {
        setError(`We don't currently service ${city}. Please contact us for availability.`)
        return
      }

      // Calculate geopricing
      const pricing = await calculateDynamicGeopricing(
        address,
        shopLocation,
        lawnSize // Using lawn size for pricing calculation
      )

      setGeopricingResult(pricing)

    } catch (err: any) {
      console.error('Error loading measurement data:', err)
      setError('Unable to calculate pricing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePackageSelection = (packageName: string, price: number) => {
    setSelectedPackage(packageName)
    setTotalPrice(price)
  }

  const handleContinueToCheckout = () => {
    // Navigate to checkout with selected package and pricing
    const checkoutData = {
      address: measurementData?.address,
      city: measurementData?.city,
      propertySize: measurementData?.propertySize,
      lawnSize: measurementData?.lawnSize,
      package: selectedPackage,
      totalPrice: totalPrice,
      driveTime: geopricingResult?.driveTimeMinutes,
      adjustment: geopricingResult?.adjustment
    }
    
    console.log('Proceeding to checkout with:', checkoutData)
    // window.location.href = `/checkout?data=${encodeURIComponent(JSON.stringify(checkoutData))}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating your personalized pricing...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 text-center">
            <p className="text-xl font-semibold mb-2">Service Unavailable</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Lawn Care Quote</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Measurement</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-green-600">Pricing</span>
              <ChevronRight className="w-4 h-4" />
              <span>Checkout</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Property Information Card */}
        <div className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Ruler className="w-6 h-6" />
              Your Property Measurements
            </h2>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Service Address:</span>
              </div>
              <p className="text-lg text-gray-900 ml-7">{measurementData?.address}</p>
            </div>

            <div className="grid md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Property</div>
                <div className="text-2xl font-bold text-gray-900">
                  {measurementData?.propertySize.toLocaleString()} sq ft
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <div className="text-sm text-green-600 mb-1">Lawn Area</div>
                <div className="text-2xl font-bold text-green-700">
                  {measurementData?.lawnSize.toLocaleString()} sq ft
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">Driveway</div>
                <div className="text-2xl font-bold text-blue-700">
                  {measurementData?.drivewaySize.toLocaleString()} sq ft
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">Sidewalk</div>
                <div className="text-2xl font-bold text-purple-700">
                  {measurementData?.sidewalkSize.toLocaleString()} sq ft
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> These measurements were calculated using advanced satellite imagery analysis. 
                Actual measurements may vary slightly. Our team will verify during the first service visit.
              </p>
            </div>
          </div>
        </div>

        {/* Geopricing Rate Table */}
        {geopricingResult && (
          <GeopricingRateTable 
            geopricingResult={geopricingResult}
            onPackageSelect={handlePackageSelection}
            showPackageSelection={true}
          />
        )}

        {/* Next Steps */}
        {selectedPackage && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Ready to proceed?</h3>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-sm text-gray-600">Selected Package</p>
                <p className="text-xl font-bold text-gray-900">{selectedPackage} Package</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Service Price</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPrice)}</p>
              </div>
              <button
                onClick={handleContinueToCheckout}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                Continue to Checkout
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}