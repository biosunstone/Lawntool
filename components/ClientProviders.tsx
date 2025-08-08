'use client'

import { ReactNode } from 'react'
import GoogleMapsProvider from './GoogleMapsProvider'
import GoogleMapsDiagnostic from './GoogleMapsDiagnostic'

interface ClientProvidersProps {
  children: ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <GoogleMapsProvider>
      {children}
      {process.env.NODE_ENV === 'development' && <GoogleMapsDiagnostic />}
    </GoogleMapsProvider>
  )
}