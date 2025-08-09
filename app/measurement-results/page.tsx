import { Suspense } from 'react'
import MeasurementResultsContent from './MeasurementResultsContent'

// Loading component for Suspense fallback
function LoadingFallback(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading measurement results...</p>
      </div>
    </div>
  )
}

export default function MeasurementResultsPage(): JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MeasurementResultsContent />
    </Suspense>
  )
}