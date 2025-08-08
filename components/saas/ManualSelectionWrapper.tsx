'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ManualSelectionProvider, useManualSelection } from '@/contexts/ManualSelectionContext'
import { PropertyMeasurements } from '@/components/MeasurementResults'
import { calculateTotalAreas, polygonToArray, mergeSelections } from '@/lib/manualSelection/polygonCalculator'
import { SelectionMode, ManualMeasurements } from '@/types/manualSelection'

// Import existing measurement component without SSR
const MeasurementSection = dynamic(
  () => import('@/components/MeasurementSection'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
)

// Import manual selection components
const SelectionToolbar = dynamic(
  () => import('@/components/manual/SelectionToolbar'),
  { ssr: false }
)

const InteractiveMapOverlay = dynamic(
  () => import('@/components/manual/InteractiveMapOverlay'),
  { ssr: false }
)

interface ManualSelectionWrapperProps {
  onMeasurementComplete?: (measurements: any) => void
}

function ManualSelectionContent({ onMeasurementComplete }: ManualSelectionWrapperProps) {
  const {
    mode,
    selections,
    getTotalAreaByType,
    setMode
  } = useManualSelection()

  const [measurementData, setMeasurementData] = useState<PropertyMeasurements | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Build manual selections data for storage
  const buildManualSelectionsData = useCallback((): ManualMeasurements | undefined => {
    if (selections.length === 0) return undefined

    const grouped = mergeSelections(selections)
    const manualData: ManualMeasurements = {}

    grouped.forEach((areaSelections, type) => {
      if (areaSelections.length > 0) {
        // Combine all polygons of the same type
        const allPoints = areaSelections.flatMap(s => s.polygon)
        const totalArea = areaSelections.reduce((sum, s) => sum + s.area, 0)
        
        manualData[type] = {
          polygon: polygonToArray(allPoints),
          area: totalArea,
          selections: areaSelections as any // Store full selection objects
        }
      }
    })

    return manualData
  }, [selections])

  // Enhance measurements with manual selections - ONLY updates areas that were manually selected
  const enhanceMeasurements = useCallback((aiMeasurements: PropertyMeasurements) => {
    const enhanced: any = { ...aiMeasurements }
    
    // Add selection method and manual data
    enhanced.selectionMethod = mode
    
    if (mode === 'ai' || selections.length === 0) {
      return enhanced
    }

    enhanced.manualSelections = buildManualSelectionsData()
    const manualAreas = calculateTotalAreas(selections)
    
    if (mode === 'manual') {
      // Full manual mode - replace ALL measurements with manual (or 0 if not selected)
      enhanced.lawn = {
        ...aiMeasurements.lawn,
        total: manualAreas.lawn || 0,
        frontYard: manualAreas.lawn * 0.4 || 0,
        backYard: manualAreas.lawn * 0.4 || 0,
        sideYard: manualAreas.lawn * 0.2 || 0
      }
      enhanced.driveway = manualAreas.driveway || 0
      enhanced.sidewalk = manualAreas.sidewalk || 0
      enhanced.building = manualAreas.building || 0
      
      // Recalculate total based on manual selections only
      enhanced.totalArea = manualAreas.lawn + manualAreas.driveway + 
                          manualAreas.sidewalk + manualAreas.building
    } else if (mode === 'hybrid') {
      // Hybrid mode - ONLY update areas that have manual selections, keep AI for others
      
      // Only update lawn if user manually selected lawn areas
      if (manualAreas.lawn > 0) {
        enhanced.lawn = {
          ...aiMeasurements.lawn,
          total: manualAreas.lawn,
          frontYard: manualAreas.lawn * 0.4,
          backYard: manualAreas.lawn * 0.4,
          sideYard: manualAreas.lawn * 0.2
        }
      }
      // else keep AI lawn measurements
      
      // Only update driveway if user manually selected driveway areas  
      if (manualAreas.driveway > 0) {
        enhanced.driveway = manualAreas.driveway
      }
      // else keep AI driveway measurement
      
      // Only update sidewalk if user manually selected sidewalk areas
      if (manualAreas.sidewalk > 0) {
        enhanced.sidewalk = manualAreas.sidewalk
      }
      // else keep AI sidewalk measurement
      
      // Only update building if user manually selected building areas
      if (manualAreas.building > 0) {
        enhanced.building = manualAreas.building
      }
      // else keep AI building measurement
      
      // Recalculate total using the mixed measurements
      enhanced.totalArea = 
        enhanced.lawn.total +
        enhanced.driveway +
        enhanced.sidewalk +
        enhanced.building +
        (enhanced.other || 0)
    }
    
    return enhanced
  }, [mode, selections, buildManualSelectionsData])

  // Intercept console.log to capture measurement data and map center
  useEffect(() => {
    const originalLog = console.log
    
    console.log = function(...args) {
      originalLog.apply(console, args)
      
      // Capture measurement data
      if (args[0] === 'Setting measurements:' && args[1]) {
        const measurements = args[1] as PropertyMeasurements
        setMeasurementData(measurements)
        
        // Extract coordinates for map center
        if (measurements.coordinates) {
          setMapCenter(measurements.coordinates)
        }
        
        // DO NOT enhance measurements automatically - only on save button click
      }
      
      // Capture geocoded coordinates
      if (args[0] === 'Geocoded coordinates:' && args[1]) {
        setMapCenter(args[1])
      }
    }
    
    return () => {
      console.log = originalLog
    }
  }, [])

  // Apply and Save manual selections
  const applyAndSaveSelections = useCallback(async () => {
    if (!measurementData) return
    
    setIsSaving(true)
    
    try {
      const enhanced = enhanceMeasurements(measurementData)
      
      // Trigger the save through console.log interception
      console.log('Setting measurements:', enhanced)
      
      // The AuthenticatedMeasurement component will handle the actual save
      if (onMeasurementComplete) {
        onMeasurementComplete(enhanced)
      }
      
      // Show success message
      const toast = (await import('react-hot-toast')).default
      toast.success('Manual selections applied and saved!')
    } catch (error) {
      console.error('Error saving manual selections:', error)
      const toast = (await import('react-hot-toast')).default
      toast.error('Failed to save manual selections')
    } finally {
      setIsSaving(false)
    }
  }, [measurementData, enhanceMeasurements, onMeasurementComplete])

  return (
    <div className="relative">
      {/* Mode Toggle */}
      <div className="mb-4 flex justify-center gap-2">
        <button
          onClick={() => setMode('ai')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'ai'
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          AI Automatic
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Manual Selection
        </button>
        <button
          onClick={() => setMode('hybrid')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'hybrid'
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Hybrid Mode
        </button>
      </div>

      {/* Selection Toolbar - Shows when in manual or hybrid mode */}
      {(mode === 'manual' || mode === 'hybrid') && (
        <SelectionToolbar />
      )}

      {/* Original Measurement Section */}
      <div className="relative">
        <MeasurementSection />
        
        {/* Interactive Map Overlay - Shows when in manual or hybrid mode and map is ready */}
        {(mode === 'manual' || mode === 'hybrid') && mapCenter && (
          <InteractiveMapOverlay
            center={mapCenter}
            measurementData={measurementData}
          />
        )}
      </div>

      {/* Selection Summary and Save Button */}
      {(mode === 'manual' || mode === 'hybrid') && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          {selections.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">
                  Manual Selections {mode === 'hybrid' && '(Hybrid Mode - Only selected areas will be updated)'}
                </h3>
                <button
                  onClick={applyAndSaveSelections}
                  disabled={isSaving || !measurementData}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isSaving || !measurementData
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Apply & Save</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Show what will be saved */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">Areas to be Updated:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-3 rounded-lg ${getTotalAreaByType('lawn') > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <span className="text-sm text-gray-600">Lawn:</span>
                    <p className={`font-medium ${getTotalAreaByType('lawn') > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {getTotalAreaByType('lawn') > 0 
                        ? `${getTotalAreaByType('lawn').toFixed(0)} sq ft`
                        : mode === 'hybrid' ? 'Keep AI' : '0 sq ft'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${getTotalAreaByType('driveway') > 0 ? 'bg-gray-100 border border-gray-300' : 'bg-gray-50'}`}>
                    <span className="text-sm text-gray-600">Driveway:</span>
                    <p className={`font-medium ${getTotalAreaByType('driveway') > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                      {getTotalAreaByType('driveway') > 0 
                        ? `${getTotalAreaByType('driveway').toFixed(0)} sq ft`
                        : mode === 'hybrid' ? 'Keep AI' : '0 sq ft'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${getTotalAreaByType('sidewalk') > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <span className="text-sm text-gray-600">Sidewalk:</span>
                    <p className={`font-medium ${getTotalAreaByType('sidewalk') > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {getTotalAreaByType('sidewalk') > 0 
                        ? `${getTotalAreaByType('sidewalk').toFixed(0)} sq ft`
                        : mode === 'hybrid' ? 'Keep AI' : '0 sq ft'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${getTotalAreaByType('building') > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                    <span className="text-sm text-gray-600">Building:</span>
                    <p className={`font-medium ${getTotalAreaByType('building') > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {getTotalAreaByType('building') > 0 
                        ? `${getTotalAreaByType('building').toFixed(0)} sq ft`
                        : mode === 'hybrid' ? 'Keep AI' : '0 sq ft'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Manual Selection:</span>
                  <p className="text-lg font-bold text-primary">
                    {(getTotalAreaByType('lawn') + getTotalAreaByType('driveway') + 
                     getTotalAreaByType('sidewalk') + getTotalAreaByType('building')).toFixed(0)} sq ft
                  </p>
                </div>
                {mode === 'hybrid' && measurementData && (
                  <p className="text-xs text-gray-500 mt-2">
                    Note: In hybrid mode, only the areas you manually select will be updated. 
                    Areas marked as "Keep AI" will retain their original AI-measured values.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No manual selections yet. Start drawing areas on the map above.</p>
              <p className="text-xs text-gray-400 mt-2">
                {mode === 'hybrid' 
                  ? 'In hybrid mode, you can select specific areas to override while keeping AI measurements for others.'
                  : 'In manual mode, all measurements will be based on your selections.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ManualSelectionWrapper(props: ManualSelectionWrapperProps) {
  return (
    <ManualSelectionProvider>
      <ManualSelectionContent {...props} />
    </ManualSelectionProvider>
  )
}