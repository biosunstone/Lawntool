'use client'

import React, { useEffect, useState } from 'react'
import { Coordinate } from '@/types/manualSelection'
import { 
  calculatePolygonArea, 
  calculateMeasurements, 
  formatArea, 
  createPropertyBoundaries 
} from '@/lib/propertyMeasurementSimple'
import { Home, Trees, Car, FootprintsIcon, Square, Loader2, Info } from 'lucide-react'

interface PropertyMeasurementBreakdownProps {
  propertyPolygon: Coordinate[]
  center: { lat: number; lng: number }
  address: string
  onMeasurementComplete?: (data: any) => void
}

interface MeasurementData {
  totalArea: number
  lawn: {
    frontYard: number
    backYard: number
    sideYard: number
    total: number
  }
  driveway: number
  sidewalk: number
  building: number
  other: number
}

export default function PropertyMeasurementBreakdown({
  propertyPolygon,
  center,
  address,
  onMeasurementComplete
}: PropertyMeasurementBreakdownProps) {
  const [measurements, setMeasurements] = useState<MeasurementData | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  useEffect(() => {
    if (propertyPolygon && propertyPolygon.length >= 3) {
      calculatePropertyMeasurements()
    }
  }, [propertyPolygon])

  const calculatePropertyMeasurements = async () => {
    if (!propertyPolygon || propertyPolygon.length < 3) return
    
    setIsCalculating(true)
    
    try {
      // Create property boundaries from polygon
      const boundaries = createPropertyBoundaries(propertyPolygon, center)
      
      // Calculate measurements
      const measurementData = calculateMeasurements(boundaries)
      setMeasurements(measurementData)
      
      if (onMeasurementComplete) {
        onMeasurementComplete({
          ...measurementData,
          address,
          timestamp: new Date()
        })
      }
    } catch (error) {
      console.error('Error calculating measurements:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  // Calculate percentages
  const getPercentage = (value: number, total: number) => {
    if (!total || total === 0) return 0
    return Math.round((value / total) * 100)
  }

  // Get color for area type
  const getAreaColor = (type: string) => {
    switch(type) {
      case 'lawn': return 'bg-green-500'
      case 'driveway': return 'bg-gray-600'
      case 'sidewalk': return 'bg-gray-400'
      case 'building': return 'bg-red-600'
      case 'other': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  if (!propertyPolygon || propertyPolygon.length < 3) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-gray-400 text-sm">
          Draw property boundaries to see measurement breakdown
        </p>
      </div>
    )
  }

  if (isCalculating) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-gray-300">Analyzing property areas...</span>
        </div>
      </div>
    )
  }

  if (!measurements) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Property Breakdown</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-400 hover:text-white"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Total Area */}
      <div className="bg-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total Property Area</span>
          <Square className="w-4 h-4 text-gray-400" />
        </div>
        <div className="text-2xl font-bold text-white">
          {formatArea(measurements.totalArea)}
        </div>
      </div>

      {/* Area Breakdown */}
      <div className="space-y-3">
        {/* Lawn Areas */}
        <div className="border border-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <Trees className="w-5 h-5 text-green-500" />
            <span className="font-medium text-white">Lawn Areas</span>
            <span className="ml-auto text-lg font-bold text-green-400">
              {formatArea(measurements.lawn.total)}
            </span>
          </div>
          
          {showDetails && (
            <div className="space-y-2 ml-7">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Front Yard</span>
                <span className="text-gray-300">
                  {formatArea(measurements.lawn.frontYard)}
                  <span className="text-gray-500 ml-2">
                    ({getPercentage(measurements.lawn.frontYard, measurements.totalArea)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Back Yard</span>
                <span className="text-gray-300">
                  {formatArea(measurements.lawn.backYard)}
                  <span className="text-gray-500 ml-2">
                    ({getPercentage(measurements.lawn.backYard, measurements.totalArea)}%)
                  </span>
                </span>
              </div>
              {measurements.lawn.sideYard > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Side Yard</span>
                  <span className="text-gray-300">
                    {formatArea(measurements.lawn.sideYard)}
                    <span className="text-gray-500 ml-2">
                      ({getPercentage(measurements.lawn.sideYard, measurements.totalArea)}%)
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500"
              style={{ width: `${getPercentage(measurements.lawn.total, measurements.totalArea)}%` }}
            />
          </div>
        </div>

        {/* Driveway */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-gray-400" />
            <span className="text-white">Driveway</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-300">
              {formatArea(measurements.driveway)}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              ({getPercentage(measurements.driveway, measurements.totalArea)}%)
            </span>
          </div>
        </div>

        {/* Sidewalk */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <FootprintsIcon className="w-5 h-5 text-gray-400" />
            <span className="text-white">Sidewalk</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-300">
              {formatArea(measurements.sidewalk)}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              ({getPercentage(measurements.sidewalk, measurements.totalArea)}%)
            </span>
          </div>
        </div>

        {/* Building */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-red-500" />
            <span className="text-white">Building</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-300">
              {formatArea(measurements.building)}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              ({getPercentage(measurements.building, measurements.totalArea)}%)
            </span>
          </div>
        </div>

        {/* Other */}
        {measurements.other > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <Square className="w-5 h-5 text-yellow-500" />
              <span className="text-white">Other Areas</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-300">
                {formatArea(measurements.other)}
              </span>
              <span className="text-sm text-gray-500 ml-2">
                ({getPercentage(measurements.other, measurements.totalArea)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Breakdown Chart */}
      <div className="pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Area Distribution</span>
          <span className="text-xs text-gray-500">Visual breakdown</span>
        </div>
        <div className="h-8 flex rounded-lg overflow-hidden">
          {measurements.lawn.total > 0 && (
            <div 
              className="bg-green-500 relative group"
              style={{ width: `${getPercentage(measurements.lawn.total, measurements.totalArea)}%` }}
              title={`Lawn: ${getPercentage(measurements.lawn.total, measurements.totalArea)}%`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100">
                {getPercentage(measurements.lawn.total, measurements.totalArea)}%
              </div>
            </div>
          )}
          {measurements.driveway > 0 && (
            <div 
              className="bg-gray-600 relative group"
              style={{ width: `${getPercentage(measurements.driveway, measurements.totalArea)}%` }}
              title={`Driveway: ${getPercentage(measurements.driveway, measurements.totalArea)}%`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100">
                {getPercentage(measurements.driveway, measurements.totalArea)}%
              </div>
            </div>
          )}
          {measurements.sidewalk > 0 && (
            <div 
              className="bg-gray-400 relative group"
              style={{ width: `${getPercentage(measurements.sidewalk, measurements.totalArea)}%` }}
              title={`Sidewalk: ${getPercentage(measurements.sidewalk, measurements.totalArea)}%`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100">
                {getPercentage(measurements.sidewalk, measurements.totalArea)}%
              </div>
            </div>
          )}
          {measurements.building > 0 && (
            <div 
              className="bg-red-600 relative group"
              style={{ width: `${getPercentage(measurements.building, measurements.totalArea)}%` }}
              title={`Building: ${getPercentage(measurements.building, measurements.totalArea)}%`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100">
                {getPercentage(measurements.building, measurements.totalArea)}%
              </div>
            </div>
          )}
          {measurements.other > 0 && (
            <div 
              className="bg-yellow-500 relative group"
              style={{ width: `${getPercentage(measurements.other, measurements.totalArea)}%` }}
              title={`Other: ${getPercentage(measurements.other, measurements.totalArea)}%`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100">
                {getPercentage(measurements.other, measurements.totalArea)}%
              </div>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-xs text-gray-400">Lawn</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-600 rounded"></div>
            <span className="text-xs text-gray-400">Driveway</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span className="text-xs text-gray-400">Sidewalk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span className="text-xs text-gray-400">Building</span>
          </div>
          {measurements.other > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-xs text-gray-400">Other</span>
            </div>
          )}
        </div>
      </div>

      {/* Service Recommendations */}
      {showDetails && (
        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Recommended Services</h4>
          <div className="space-y-1 text-xs text-gray-400">
            {measurements.lawn.total > 0 && (
              <div>• Lawn care for {formatArea(measurements.lawn.total)}</div>
            )}
            {measurements.driveway > 0 && (
              <div>• Driveway sealing for {formatArea(measurements.driveway)}</div>
            )}
            {measurements.sidewalk > 0 && (
              <div>• Sidewalk maintenance for {formatArea(measurements.sidewalk)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}