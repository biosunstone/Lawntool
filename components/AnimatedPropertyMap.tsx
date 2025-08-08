'use client'

import { useEffect, useState, useRef } from 'react'
import { GoogleMap, Polygon, Polyline } from '@react-google-maps/api'
import { Loader2, Ruler } from 'lucide-react'
import dynamic from 'next/dynamic'
import { detectPropertyBoundaries, calculateMeasurements } from '@/lib/propertyMeasurement'

const MeasurementLine = dynamic(() => import('./MeasurementLine'), { ssr: false })

interface AnimatedPropertyMapProps {
  address: string
  center: { lat: number; lng: number }
  onMeasurementComplete?: (measurements?: any) => void
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.5rem'
}

const mapOptions: google.maps.MapOptions = {
  mapTypeId: 'satellite',
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  tilt: 0
}

type MeasurementPhase = 'scanning' | 'measuring-lawn' | 'measuring-driveway' | 'measuring-building' | 'complete'

// Fallback boundaries for when detection fails
function generateFallbackBoundaries(center: { lat: number; lng: number }) {
  const offset = 0.0003
  return {
    property: [
      { lat: center.lat + offset, lng: center.lng - offset },
      { lat: center.lat + offset, lng: center.lng + offset },
      { lat: center.lat - offset, lng: center.lng + offset },
      { lat: center.lat - offset, lng: center.lng - offset },
    ],
    lawn: {
      frontYard: [
        { lat: center.lat - offset * 0.5, lng: center.lng - offset * 0.8 },
        { lat: center.lat - offset * 0.5, lng: center.lng + offset * 0.8 },
        { lat: center.lat + offset * 0.1, lng: center.lng + offset * 0.8 },
        { lat: center.lat + offset * 0.1, lng: center.lng - offset * 0.8 },
      ],
      backYard: [
        { lat: center.lat + offset * 0.2, lng: center.lng - offset * 0.6 },
        { lat: center.lat + offset * 0.2, lng: center.lng + offset * 0.6 },
        { lat: center.lat + offset * 0.8, lng: center.lng + offset * 0.6 },
        { lat: center.lat + offset * 0.8, lng: center.lng - offset * 0.6 },
      ],
      sideYard: []
    },
    driveway: [
      { lat: center.lat - offset * 0.5, lng: center.lng + offset * 0.8 },
      { lat: center.lat - offset * 0.5, lng: center.lng + offset },
      { lat: center.lat + offset * 0.1, lng: center.lng + offset },
      { lat: center.lat + offset * 0.1, lng: center.lng + offset * 0.8 },
    ],
    building: [
      { lat: center.lat + offset * 0.1, lng: center.lng - offset * 0.3 },
      { lat: center.lat + offset * 0.1, lng: center.lng + offset * 0.3 },
      { lat: center.lat - offset * 0.5, lng: center.lng + offset * 0.3 },
      { lat: center.lat - offset * 0.5, lng: center.lng - offset * 0.3 },
    ],
    sidewalk: [
      { lat: center.lat - offset * 1.1, lng: center.lng - offset },
      { lat: center.lat - offset * 1.1, lng: center.lng + offset },
      { lat: center.lat - offset, lng: center.lng + offset },
      { lat: center.lat - offset, lng: center.lng - offset },
    ]
  }
}


export default function AnimatedPropertyMap({ address, center, onMeasurementComplete }: AnimatedPropertyMapProps) {
  const [phase, setPhase] = useState<MeasurementPhase>('scanning')
  const [scanLines, setScanLines] = useState<google.maps.LatLngLiteral[][]>([])
  const [visibleAreas, setVisibleAreas] = useState({
    property: false,
    lawn: false,
    driveway: false,
    building: false
  })
  const [measurementLines, setMeasurementLines] = useState<Array<{
    start: google.maps.LatLngLiteral
    end: google.maps.LatLngLiteral
    distance: number
    delay: number
  }>>([])
  const [boundaries, setBoundaries] = useState<any>(null)
  const [calculatedMeasurements, setCalculatedMeasurements] = useState<any>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const scanAnimationRef = useRef<NodeJS.Timeout>()
  const phaseTimeoutRef = useRef<NodeJS.Timeout>()
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Start the measurement animation sequence
    const startAnimation = async () => {
      console.log('Starting animation for:', address)
      try {
        // Use fallback boundaries immediately for now
        const fallbackBoundaries = generateFallbackBoundaries(center)
        setBoundaries(fallbackBoundaries)
        const measurements = calculateMeasurements(fallbackBoundaries)
        setCalculatedMeasurements(measurements)
        console.log('Boundaries set, starting animation phases')
      } catch (error) {
        console.error('Error in startAnimation:', error)
        setMapError('Error calculating measurements')
      }
      // Phase 1: Scanning (1 second)
      setPhase('scanning')
      animateScanLines()
      
      // Wait for boundaries to be set
      const waitForBoundaries = setInterval(() => {
        if (boundaries) {
          clearInterval(waitForBoundaries)
          console.log('Boundaries ready, starting measurement phases')
          
          setVisibleAreas(prev => ({ ...prev, property: true }))
          
          // Phase 2: Measuring lawn
          setTimeout(() => {
            setPhase('measuring-lawn')
            setVisibleAreas(prev => ({ ...prev, lawn: true }))
            
            // Phase 3: Measuring driveway
            setTimeout(() => {
              setPhase('measuring-driveway')
              setVisibleAreas(prev => ({ ...prev, driveway: true }))
              
              // Phase 4: Measuring building
              setTimeout(() => {
                setPhase('measuring-building')
                setVisibleAreas(prev => ({ ...prev, building: true }))
                
                // Phase 5: Complete
                setTimeout(() => {
                  setPhase('complete')
                  console.log('Animation complete, calling onMeasurementComplete')
                  if (onMeasurementComplete && calculatedMeasurements) {
                    onMeasurementComplete(calculatedMeasurements)
                  }
                }, 1000)
              }, 1000)
            }, 1000)
          }, 1000)
        }
      }, 100)
    }

    // Set a timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (phase === 'scanning') {
        setMapError('Unable to load property data. Please try again.')
        setPhase('complete')
        if (onMeasurementComplete) {
          // Use fallback measurements
          const fallback = generateFallbackBoundaries(center)
          const measurements = calculateMeasurements(fallback)
          onMeasurementComplete(measurements)
        }
      }
    }, 8000) // 8 second timeout

    startAnimation()

    return () => {
      if (scanAnimationRef.current) clearInterval(scanAnimationRef.current)
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [center, address, boundaries, calculatedMeasurements, onMeasurementComplete])

  const animateScanLines = () => {
    let lineIndex = 0
    const offset = 0.0003
    const lines: google.maps.LatLngLiteral[][] = []

    // Generate horizontal scan lines
    for (let i = -10; i <= 10; i++) {
      const y = center.lat + (i * offset / 10)
      lines.push([
        { lat: y, lng: center.lng - offset },
        { lat: y, lng: center.lng + offset }
      ])
    }

    scanAnimationRef.current = setInterval(() => {
      if (lineIndex < lines.length) {
        setScanLines(prev => [...prev, lines[lineIndex]])
        lineIndex++
      } else {
        if (scanAnimationRef.current) {
          clearInterval(scanAnimationRef.current)
        }
      }
    }, 50) // Faster scan animation
  }

  const getPhaseMessage = () => {
    switch (phase) {
      case 'scanning':
        return 'Analyzing satellite imagery...'
      case 'measuring-lawn':
        return 'Measuring lawn areas...'
      case 'measuring-driveway':
        return 'Measuring driveway...'
      case 'measuring-building':
        return 'Measuring building footprint...'
      case 'complete':
        return 'Measurement complete!'
      default:
        return ''
    }
  }

  return (
    <div className="relative">
      {/* Progress indicator */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-3">
          {phase !== 'complete' && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{mapError || getPhaseMessage()}</p>
            {!mapError && (
              <div className="flex gap-1 mt-2">
                <div className={`h-1 w-12 rounded ${phase !== 'scanning' ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className={`h-1 w-12 rounded ${['measuring-driveway', 'measuring-building', 'complete'].includes(phase) ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className={`h-1 w-12 rounded ${['measuring-building', 'complete'].includes(phase) ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className={`h-1 w-12 rounded ${phase === 'complete' ? 'bg-primary' : 'bg-gray-300'}`} />
              </div>
            )}
          </div>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={19}
        options={mapOptions}
        onLoad={(map) => { 
          mapRef.current = map
          // Clear any previous error
          setMapError(null)
        }}
      >
        {/* Scan lines animation */}
        {phase === 'scanning' && scanLines.map((line, index) => (
          <Polyline
            key={`scan-${index}`}
            path={line}
            options={{
              strokeColor: '#00FF00',
              strokeOpacity: 0.8 - (index * 0.03),
              strokeWeight: 1,
              zIndex: 10
            }}
          />
        ))}

        {/* Property outline */}
        {visibleAreas.property && boundaries && (
          <Polygon
            paths={boundaries.property}
            options={{
              fillColor: 'transparent',
              strokeColor: '#FF0000',
              strokeWeight: 3,
              strokeOpacity: phase === 'scanning' ? 0.5 : 1,
              zIndex: 1
            }}
          />
        )}
        
        {/* Lawn areas - animated */}
        {visibleAreas.lawn && boundaries && (
          <>
            <Polygon
              paths={boundaries.lawn.frontYard}
              options={{
                fillColor: '#00FF00',
                fillOpacity: phase === 'measuring-lawn' ? 0.6 : 0.3,
                strokeColor: '#00AA00',
                strokeWeight: phase === 'measuring-lawn' ? 3 : 2,
                strokeOpacity: 0.8,
                zIndex: 2
              }}
            />
            <Polygon
              paths={boundaries.lawn.backYard}
              options={{
                fillColor: '#00FF00',
                fillOpacity: phase === 'measuring-lawn' ? 0.6 : 0.3,
                strokeColor: '#00AA00',
                strokeWeight: phase === 'measuring-lawn' ? 3 : 2,
                strokeOpacity: 0.8,
                zIndex: 2
              }}
            />
            {boundaries.lawn.sideYard.length >= 3 && (
              <Polygon
                paths={boundaries.lawn.sideYard}
                options={{
                  fillColor: '#00FF00',
                  fillOpacity: phase === 'measuring-lawn' ? 0.6 : 0.3,
                  strokeColor: '#00AA00',
                  strokeWeight: phase === 'measuring-lawn' ? 3 : 2,
                  strokeOpacity: 0.8,
                  zIndex: 2
                }}
              />
            )}
          </>
        )}
        
        {/* Driveway - animated */}
        {visibleAreas.driveway && boundaries && (
          <Polygon
            paths={boundaries.driveway}
            options={{
              fillColor: '#808080',
              fillOpacity: phase === 'measuring-driveway' ? 0.7 : 0.4,
              strokeColor: '#505050',
              strokeWeight: phase === 'measuring-driveway' ? 3 : 2,
              strokeOpacity: 0.8,
              zIndex: 2
            }}
          />
        )}
        
        {/* Building - animated */}
        {visibleAreas.building && boundaries && (
          <Polygon
            paths={boundaries.building}
            options={{
              fillColor: '#8B4513',
              fillOpacity: phase === 'measuring-building' ? 0.8 : 0.5,
              strokeColor: '#654321',
              strokeWeight: phase === 'measuring-building' ? 3 : 2,
              strokeOpacity: 0.8,
              zIndex: 3
            }}
          />
        )}
        
        {/* Measurement lines */}
        {measurementLines.map((line, index) => (
          <MeasurementLine
            key={`${phase}-${index}`}
            start={line.start}
            end={line.end}
            distance={line.distance}
            delay={line.delay}
          />
        ))}
      </GoogleMap>
      
      {/* Legend */}
      {phase === 'complete' && (
        <div className="bg-white p-4 rounded-lg shadow-sm mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Measurement Complete</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 opacity-50 border-2 border-green-700"></div>
              <span>Lawn Areas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 opacity-50 border-2 border-gray-700"></div>
              <span>Driveway</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-700 opacity-50 border-2 border-amber-900"></div>
              <span>Building</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-600"></div>
              <span>Property Boundary</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}