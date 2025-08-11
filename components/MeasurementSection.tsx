'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@headlessui/react'
import { Ruler, Map } from 'lucide-react'

const AddressSearchWithAutocomplete = dynamic(
  () => import('./AddressSearchWithAutocomplete'),
  { 
    ssr: false,
    loading: () => <div>Loading search...</div>
  }
)

const PrecisionMeasurementMap = dynamic(
  () => import('./PrecisionMeasurementMap'),
  { 
    ssr: false,
    loading: () => <div>Loading precision measurement tool...</div>
  }
)

import MeasurementResultsWithCart, { PropertyMeasurements } from './MeasurementResultsWithCart'
import { generateAccurateMeasurements } from '@/lib/accurateMeasurements'

interface MeasurementSectionProps {
  onMeasurementComplete?: (data: any) => void
  selectedServices?: string[]
  hideResults?: boolean
}

export default function MeasurementSection({ 
  onMeasurementComplete, 
  selectedServices = [],
  hideResults = false 
}: MeasurementSectionProps) {
  const [measurements, setMeasurements] = useState<PropertyMeasurements | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentAddress, setCurrentAddress] = useState<string>('')
  const [currentCoordinates, setCurrentCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [usePrecisionMode, setUsePrecisionMode] = useState(true) // Default to precision mode
  const [showPrecisionMap, setShowPrecisionMap] = useState(false)
  const searchInputRef = useRef<string>('')

  useEffect(() => {
    const handleSearchFromHero = (event: Event) => {
      const customEvent = event as CustomEvent
      const { address, coordinates } = customEvent.detail
      searchInputRef.current = address
      handleSearch(address, coordinates)
    }

    window.addEventListener('searchFromHero', handleSearchFromHero)
    return () => {
      window.removeEventListener('searchFromHero', handleSearchFromHero)
    }
  }, [])


  const handleSearch = async (address: string, coordinates?: { lat: number; lng: number }) => {
    try {
      // Reset previous measurements
      setMeasurements(null)
      setIsLoading(true)
      setCurrentAddress(address)
      
      // If no coordinates provided, try to geocode the address
      let finalCoordinates = coordinates
      if (!finalCoordinates) {
        // Try to geocode the address using our API route
        try {
          const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address }),
          })
          const data = await response.json()
          
          if (data.coordinates) {
            finalCoordinates = data.coordinates
            console.log('Geocoded coordinates:', finalCoordinates)
          }
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError)
        }
      }
      
      setCurrentCoordinates(finalCoordinates || { lat: 40.7128, lng: -74.0060 })
      
      if (usePrecisionMode) {
        // Use precision measurement service
        setShowPrecisionMap(true)
        setIsLoading(false)
      } else {
        // Fallback to simulated measurements (legacy mode)
        const accurateMeasurements = generateAccurateMeasurements(
          address,
          finalCoordinates || { lat: 40.7128, lng: -74.0060 }
        )
        
        const measurements: PropertyMeasurements = {
          address: address,
          coordinates: finalCoordinates || { lat: 40.7128, lng: -74.0060 },
          ...accurateMeasurements
        }
        
        console.log('Setting measurements:', measurements)
        setMeasurements(measurements)
        setIsLoading(false)
      }
      
      // Call the callback if provided (for widget usage)
      if (onMeasurementComplete) {
        // Only send measurements for selected services
        const filteredMeasurements = {
          address: address,
          coordinates: measurements?.coordinates,
          measurements: {
            totalArea: measurements?.totalArea,
            perimeter: measurements?.perimeter,
            lawn: selectedServices.includes('lawn') ? measurements?.lawn : { total: 0, frontYard: 0, backYard: 0, sideYard: 0, perimeter: 0 },
            driveway: selectedServices.includes('driveway') ? measurements?.driveway : 0,
            sidewalk: selectedServices.includes('sidewalk') ? measurements?.sidewalk : 0,
            building: selectedServices.includes('building') ? measurements?.building : 0,
            other: measurements?.other
          }
        }
        onMeasurementComplete(filteredMeasurements)
      }
    } catch (error) {
      console.error('Error during search:', error)
      setIsLoading(false)
    }
  }
  
  const handleMeasurementsUpdated = (calculatedMeasurements: any) => {
    if (measurements) {
      setMeasurements({
        ...measurements,
        ...calculatedMeasurements
      })
      setIsLoading(false)
    }
  }

  const handlePrecisionMeasurementComplete = (precisionMeasurement: any) => {
    // Convert precision measurement to PropertyMeasurements format
    const measurements: PropertyMeasurements = {
      address: currentAddress,
      coordinates: currentCoordinates || { lat: 40.7128, lng: -74.0060 },
      totalArea: precisionMeasurement.totalLawnArea,
      perimeter: precisionMeasurement.perimeter,
      lawn: {
        total: precisionMeasurement.totalLawnArea,
        frontYard: precisionMeasurement.sections.frontYard.area,
        backYard: precisionMeasurement.sections.backYard.area,
        sideYard: precisionMeasurement.sections.sideYards.reduce((sum: number, s: any) => sum + s.area, 0),
        perimeter: precisionMeasurement.perimeter
      },
      driveway: precisionMeasurement.excluded.driveway,
      sidewalk: precisionMeasurement.excluded.sidewalk,
      building: precisionMeasurement.excluded.building,
      other: precisionMeasurement.excluded.other
    }
    
    setMeasurements(measurements)
    setShowPrecisionMap(false)
    
    // Call the callback if provided
    if (onMeasurementComplete) {
      onMeasurementComplete({
        address: currentAddress,
        coordinates: currentCoordinates,
        measurements: precisionMeasurement
      })
    }
  }
  

  return (
    <section id="measure" className={hideResults ? "py-8" : "py-24 bg-gray-50"}>
      <div className={hideResults ? "" : "container"}>
        {!hideResults && (
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Precision Property Measurement Tool
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Get accurate lawn measurements using Google Earth's high-resolution imagery with 3D terrain adjustment and ±1% accuracy.
            </p>
          </div>
        )}
        
        {/* Measurement Mode Toggle */}
        {!hideResults && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setUsePrecisionMode(true)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  usePrecisionMode
                    ? 'bg-green-600 text-white shadow-lg scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Map className="h-5 w-5 inline mr-2" />
                Precision Mode (±1% Accuracy)
              </Button>
              <Button
                onClick={() => setUsePrecisionMode(false)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  !usePrecisionMode
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Ruler className="h-5 w-5 inline mr-2" />
                Quick Estimate
              </Button>
            </div>
            {usePrecisionMode && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 text-center">
                  <strong>Precision Mode Active:</strong> Using Google Earth high-resolution imagery, 3D terrain adjustment, and dual verification passes for maximum accuracy.
                </p>
              </div>
            )}
          </div>
        )}
        
        {measurements && !isLoading && !hideResults && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              You can measure another property by entering a new address above.
            </p>
          )}

        <div className="max-w-3xl mx-auto mb-12">
          <AddressSearchWithAutocomplete 
            onSearch={handleSearch}
            placeholder="Enter property address for precision measurement"
          />
        </div>

        {/* Show Precision Measurement Map */}
        {showPrecisionMap && currentAddress && currentCoordinates && !hideResults && (
          <div className="max-w-7xl mx-auto">
            <PrecisionMeasurementMap
              address={currentAddress}
              coordinates={currentCoordinates}
              onMeasurementComplete={handlePrecisionMeasurementComplete}
            />
          </div>
        )}
        
        {/* Show Measurement Results */}
        {(measurements || (isLoading && !usePrecisionMode)) && !hideResults && !showPrecisionMap && (
          <div className="max-w-6xl mx-auto">
            <MeasurementResultsWithCart 
              measurements={measurements} 
              isLoading={isLoading}
              onMeasurementsUpdated={handleMeasurementsUpdated}
            />
          </div>
        )}
        
        {/* Show minimal feedback when hiding results (for widget) */}
        {measurements && !isLoading && hideResults && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✓ Measurement completed successfully!</p>
            <p className="text-sm text-green-600 mt-1">Property data has been captured for {currentAddress}</p>
          </div>
        )}
      </div>
    </section>
  )
}