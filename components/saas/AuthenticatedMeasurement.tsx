'use client'

import { useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

// Import ManualSelectionWrapper which wraps the MeasurementSection
const ManualSelectionWrapper = dynamic(
  () => import('@/components/saas/ManualSelectionWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
)

interface AuthenticatedMeasurementProps {
  onMeasurementComplete?: () => void
}

export default function AuthenticatedMeasurement({ onMeasurementComplete }: AuthenticatedMeasurementProps) {
  const { data: session } = useSession()
  const lastSavedAddress = useRef<string>('')
  
  // Define saveMeasurement as useCallback to avoid recreating it
  const saveMeasurement = useCallback(async (measurementData: any) => {
    if (!session?.user) {
      console.error('No session available')
      return
    }

    try {
      console.log('Saving measurement:', measurementData)
      
      // Ensure all required fields are present
      const dataToSave = {
        address: measurementData.address,
        coordinates: measurementData.coordinates || { lat: 0, lng: 0 },
        measurements: {
          totalArea: measurementData.totalArea || 0,
          perimeter: measurementData.perimeter || 0,
          lawn: {
            frontYard: measurementData.lawn?.frontYard || 0,
            backYard: measurementData.lawn?.backYard || 0,
            sideYard: measurementData.lawn?.sideYard || 0,
            total: measurementData.lawn?.total || 0,
            perimeter: measurementData.lawn?.perimeter || 0,
          },
          driveway: measurementData.driveway || 0,
          sidewalk: measurementData.sidewalk || 0,
          building: measurementData.building || 0,
          other: measurementData.other || 0,
        },
        selectionMethod: measurementData.selectionMethod || 'ai',
        manualSelections: measurementData.manualSelections || undefined
      }

      const response = await fetch('/api/measurements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Measurement saved successfully!')
        if (onMeasurementComplete) {
          onMeasurementComplete()
        }
      } else {
        console.error('Save error:', result)
        if (response.status === 403 && result.error?.includes('quota')) {
          toast.error(result.error)
          // Optionally redirect to billing page
          setTimeout(() => {
            window.location.href = '/billing'
          }, 2000)
        } else {
          toast.error(result.error || 'Failed to save measurement')
        }
      }
    } catch (error) {
      console.error('Error saving measurement:', error)
      toast.error('Failed to save measurement. Please try again.')
    }
  }, [session, onMeasurementComplete])
  
  // Handle manual selection save
  const handleManualMeasurementSave = useCallback((enhancedMeasurements: any) => {
    // Save the enhanced measurements with manual selections
    saveMeasurement(enhancedMeasurements)
  }, [saveMeasurement])

  useEffect(() => {
    if (!session?.user) return

    // Create a MutationObserver to watch for measurement results
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check for measurement results in the DOM
          const measurementResults = document.querySelector('[class*="MeasurementResults"]')
          if (measurementResults) {
            checkAndSaveMeasurement()
          }
        }
      })
    })

    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Also intercept console.log to capture measurements
    const originalLog = console.log
    console.log = function(...args) {
      originalLog.apply(console, args)
      
      // Check if this is a measurement being set
      if (args[0] === 'Setting measurements:' && args[1]) {
        const measurementData = args[1]
        
        // Avoid saving the same measurement twice
        if (measurementData.address && measurementData.address !== lastSavedAddress.current) {
          lastSavedAddress.current = measurementData.address
          saveMeasurement(measurementData)
        }
      }
    }

    return () => {
      observer.disconnect()
      console.log = originalLog
    }
  }, [session, onMeasurementComplete])

  const checkAndSaveMeasurement = () => {
    // Try to extract measurement data from the DOM
    const addressElement = document.querySelector('[class*="text-gray-600"]:has-text("sq ft")')
    if (addressElement) {
      // Extract measurements from the display
      const measurementElements = document.querySelectorAll('[class*="font-bold"]:has-text("sq ft")')
      if (measurementElements.length > 0) {
        // This is a backup method if console.log interception doesn't work
        console.log('Measurement detected in DOM')
      }
    }
  }

  if (!session) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Please sign in to use the measurement tool</p>
      </div>
    )
  }

  return <ManualSelectionWrapper onMeasurementComplete={handleManualMeasurementSave} />
}