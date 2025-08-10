'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

const AddressSearchWithAutocomplete = dynamic(
  () => import('./AddressSearchWithAutocomplete'),
  { 
    ssr: false,
    loading: () => <div>Loading search...</div>
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
      
      // Generate accurate measurements based on address and coordinates
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
      
      // Call the callback if provided (for widget usage)
      if (onMeasurementComplete) {
        // Only send measurements for selected services
        const filteredMeasurements = {
          address: address,
          coordinates: measurements.coordinates,
          measurements: {
            totalArea: measurements.totalArea,
            perimeter: measurements.perimeter,
            lawn: selectedServices.includes('lawn') ? measurements.lawn : { total: 0, frontYard: 0, backYard: 0, sideYard: 0, perimeter: 0 },
            driveway: selectedServices.includes('driveway') ? measurements.driveway : 0,
            sidewalk: selectedServices.includes('sidewalk') ? measurements.sidewalk : 0,
            building: selectedServices.includes('building') ? measurements.building : 0,
            other: measurements.other
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
  

  return (
    <section id="measure" className={hideResults ? "py-8" : "py-24 bg-gray-50"}>
      <div className={hideResults ? "" : "container"}>
        {!hideResults && (
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Measure Any Property Instantly
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Enter any address below to get instant AI-powered measurements of lawns, driveways, sidewalks, and buildings.
            </p>
          </div>
        )}
        {measurements && !isLoading && !hideResults && (
            <p className="mt-4 text-sm text-gray-500">
              You can measure another property by entering a new address above.
            </p>
          )}

        <div className="max-w-3xl mx-auto mb-12">
          <AddressSearchWithAutocomplete 
            onSearch={handleSearch}
            placeholder="Enter property address"
          />
        </div>

        {(measurements || isLoading) && !hideResults && (
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