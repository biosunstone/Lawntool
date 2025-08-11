'use client'

import { useState, useEffect } from 'react'
import { Home, Trees, Car, Square, Building, Ruler, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { formatArea } from '@/lib/propertyMeasurement'
import PropertyOverlayMap from './PropertyOverlayMap'
import EditableMeasurements from './EditableMeasurements'



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
}


export default function MeasurementResults({ measurements, isLoading, onMeasurementsUpdated }: MeasurementResultsProps) {
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [currentMeasurements, setCurrentMeasurements] = useState(measurements)

  // Show measurements immediately after loading
  useEffect(() => {
    if (measurements && !isLoading) {
      setShowMeasurements(true)
      setCurrentMeasurements(measurements)
    }
  }, [measurements, isLoading])

  const handleMeasurementsUpdate = (updatedMeasurements: PropertyMeasurements) => {
    setCurrentMeasurements(updatedMeasurements)
    if (onMeasurementsUpdated) {
      onMeasurementsUpdated(updatedMeasurements)
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
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      icon: Square,
      label: 'Sidewalk',
      value: currentMeasurements.sidewalk || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Building,
      label: 'Building',
      value: currentMeasurements.building || 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Home,
      label: 'Total Property',
      value: currentMeasurements.totalArea || 0,
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
      
      {/* Measurements Display - Show after animation completes */}
      <div className={`bg-white rounded-lg shadow-lg p-8 transition-all duration-500 ${showMeasurements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="text-2xl font-bold mb-2">Property Measurements</h2>
        <p className="text-gray-600 mb-2">{measurements.address}</p>
        <div className="mb-6 p-3 bg-primary/10 rounded-lg inline-block">
          <p className="text-lg font-semibold text-primary">
            Total Property: {formatArea(currentMeasurements.totalArea)}
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
          </div>
        ))}
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
        
        {/* Lawn Treatment Estimate */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Lawn Treatment Estimate</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Coverage Area</p>
              <p className="font-semibold text-blue-900">{(currentMeasurements.lawn?.total || 0).toLocaleString()} sq ft</p>
            </div>
            <div>
              <p className="text-blue-700">Fertilizer Needed</p>
              <p className="font-semibold text-blue-900">{Math.ceil((currentMeasurements.lawn?.total || 0) / 5000)} bags per application</p>
            </div>
            <div>
              <p className="text-blue-700">Annual Cost Estimate</p>
              <p className="font-semibold text-blue-900">${Math.ceil((currentMeasurements.lawn?.total || 0) / 5000) * 4 * 25}</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}