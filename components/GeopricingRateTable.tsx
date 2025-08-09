'use client'

import { useState, useEffect } from 'react'
import { MapPin, TrendingDown, TrendingUp, Check, Info } from 'lucide-react'
import { 
  GeopricingResult, 
  SERVICE_PACKAGES, 
  calculatePackagePricing,
  formatCurrency 
} from '@/lib/geopricing/dynamicPricingEngine'

interface GeopricingRateTableProps {
  geopricingResult: GeopricingResult
  onPackageSelect?: (packageName: string, totalPrice: number) => void
  showPackageSelection?: boolean
}

export default function GeopricingRateTable({ 
  geopricingResult, 
  onPackageSelect,
  showPackageSelection = true 
}: GeopricingRateTableProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>('Standard')
  const [isExpanded, setIsExpanded] = useState(true)

  // Get icon based on adjustment
  const getZoneIcon = (adjustment: number) => {
    if (adjustment < 0) return <TrendingDown className="w-5 h-5 text-green-600" />
    if (adjustment > 0) return <TrendingUp className="w-5 h-5 text-red-600" />
    return <Check className="w-5 h-5 text-blue-600" />
  }

  // Get styling classes based on adjustment
  const getZoneStyling = (adjustment: number, isCurrent: boolean) => {
    let baseClasses = "transition-all duration-200 "
    
    if (isCurrent) {
      baseClasses += "font-semibold "
      if (adjustment < 0) {
        baseClasses += "bg-green-50 border-l-4 border-green-500 "
      } else if (adjustment > 0) {
        baseClasses += "bg-red-50 border-l-4 border-red-500 "
      } else {
        baseClasses += "bg-blue-50 border-l-4 border-blue-500 "
      }
    }
    
    return baseClasses
  }

  const handlePackageSelection = (packageName: string) => {
    setSelectedPackage(packageName)
    if (onPackageSelect && geopricingResult.propertySize) {
      const totalPrice = calculatePackagePricing(
        geopricingResult.adjustedRate,
        packageName as any,
        geopricingResult.propertySize
      )
      onPackageSelect(packageName, totalPrice)
    }
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Your Personalized Pricing</h2>
              <p className="text-green-100 mt-1">
                Based on your location in {geopricingResult.city}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Drive Time Info */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Drive time from our shop:</span>
                <span className="font-semibold text-gray-900">
                  {Math.round(geopricingResult.driveTimeMinutes)} minutes
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                geopricingResult.adjustment < 0 ? 'bg-green-100 text-green-700' :
                geopricingResult.adjustment > 0 ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {geopricingResult.adjustment < 0 ? `${Math.abs(geopricingResult.adjustment)}% Discount` :
                 geopricingResult.adjustment > 0 ? `${geopricingResult.adjustment}% Surcharge` :
                 'Standard Rate'}
              </div>
            </div>
          </div>

          {/* Rate Table */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Zone-Based Pricing</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4">Zone Name</th>
                    <th className="text-left py-3 px-4">Distance/Drive Time</th>
                    <th className="text-right py-3 px-4">Rate per 1,000 sq ft</th>
                    {geopricingResult.propertySize && (
                      <th className="text-right py-3 px-4">
                        Your Price ({geopricingResult.propertySize.toLocaleString()} sq ft)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {geopricingResult.rateTable.map((entry, index) => (
                    <tr 
                      key={index}
                      className={getZoneStyling(
                        entry.ratePer1000SqFt < geopricingResult.baseRate ? -5 :
                        entry.ratePer1000SqFt > geopricingResult.baseRate ? 10 : 0,
                        entry.isCurrent
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getZoneIcon(
                            entry.ratePer1000SqFt < geopricingResult.baseRate ? -5 :
                            entry.ratePer1000SqFt > geopricingResult.baseRate ? 10 : 0
                          )}
                          <span>{entry.zoneName}</span>
                          {entry.isCurrent && (
                            <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                              YOUR ZONE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {entry.distanceDriveTime}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        entry.ratePer1000SqFt < geopricingResult.baseRate ? 'text-green-600' :
                        entry.ratePer1000SqFt > geopricingResult.baseRate ? 'text-red-600' :
                        'text-gray-900'
                      }`}>
                        {formatCurrency(entry.ratePer1000SqFt)}
                      </td>
                      {entry.priceForProperty !== undefined && (
                        <td className={`py-3 px-4 text-right font-bold ${
                          entry.ratePer1000SqFt < geopricingResult.baseRate ? 'text-green-600' :
                          entry.ratePer1000SqFt > geopricingResult.baseRate ? 'text-red-600' :
                          'text-gray-900'
                        }`}>
                          {formatCurrency(entry.priceForProperty)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explanation */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                {geopricingResult.explanation}
              </p>
            </div>
          </div>

          {/* Package Selection */}
          {showPackageSelection && geopricingResult.propertySize && (
            <div className="border-t bg-gray-50 p-6">
              <h3 className="text-lg font-semibold mb-4">Select Your Service Package</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {SERVICE_PACKAGES.map((pkg) => {
                  const packagePrice = calculatePackagePricing(
                    geopricingResult.adjustedRate,
                    pkg.name as any,
                    geopricingResult.propertySize!
                  )
                  const isSelected = selectedPackage === pkg.name

                  return (
                    <div
                      key={pkg.name}
                      onClick={() => handlePackageSelection(pkg.name)}
                      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        isSelected 
                          ? 'border-green-500 bg-green-50 shadow-lg scale-105' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full">
                            SELECTED
                          </span>
                        </div>
                      )}
                      
                      <h4 className={`font-bold text-lg mb-2 ${
                        isSelected ? 'text-green-700' : 'text-gray-900'
                      }`}>
                        {pkg.name}
                      </h4>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {pkg.description}
                      </p>
                      
                      <div className={`text-2xl font-bold mb-3 ${
                        isSelected ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {formatCurrency(packagePrice)}
                        <span className="text-sm font-normal text-gray-500 block">
                          per service
                        </span>
                      </div>
                      
                      <ul className="space-y-1">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-1">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>

              {/* Continue Button */}
              <div className="mt-6 text-center">
                <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg">
                  Continue with {selectedPackage} Package - {
                    formatCurrency(
                      calculatePackagePricing(
                        geopricingResult.adjustedRate,
                        selectedPackage as any,
                        geopricingResult.propertySize!
                      )
                    )
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}