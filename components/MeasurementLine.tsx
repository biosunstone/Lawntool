'use client'

import { useEffect, useState } from 'react'
import { Polyline, Marker } from '@react-google-maps/api'

interface MeasurementLineProps {
  start: google.maps.LatLngLiteral
  end: google.maps.LatLngLiteral
  distance: number
  delay?: number
  onComplete?: () => void
}

export default function MeasurementLine({ start, end, distance, delay = 0, onComplete }: MeasurementLineProps) {
  const [progress, setProgress] = useState(0)
  const [showLabel, setShowLabel] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += 5
        if (currentProgress >= 100) {
          currentProgress = 100
          clearInterval(interval)
          setShowLabel(true)
          if (onComplete) {
            setTimeout(onComplete, 200)
          }
        }
        setProgress(currentProgress)
      }, 20)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay, onComplete])

  // Calculate intermediate point based on progress
  const currentEnd = {
    lat: start.lat + (end.lat - start.lat) * (progress / 100),
    lng: start.lng + (end.lng - start.lng) * (progress / 100)
  }

  // Calculate label position (middle of line)
  const labelPosition = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  }

  return (
    <>
      {/* Ruler line */}
      <Polyline
        path={[start, currentEnd]}
        options={{
          strokeColor: '#FFD700',
          strokeOpacity: 1,
          strokeWeight: 3,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 4
            },
            offset: '0',
            repeat: '20px'
          }]
        }}
      />
      
      {/* End points */}
      {progress > 0 && (
        <>
          <Marker
            position={start}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: '#FFD700',
              fillOpacity: 1,
              strokeColor: '#000',
              strokeWeight: 1
            }}
          />
          <Marker
            position={currentEnd}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: '#FFD700',
              fillOpacity: 1,
              strokeColor: '#000',
              strokeWeight: 1
            }}
          />
        </>
      )}
      
      {/* Distance label */}
      {showLabel && (
        <Marker
          position={labelPosition}
          label={{
            text: `${distance} ft`,
            color: '#000',
            fontSize: '14px',
            fontWeight: 'bold',
            className: 'measurement-label'
          }}
          icon={{
            path: 'M 0,0',
            scale: 0
          }}
        />
      )}
    </>
  )
}