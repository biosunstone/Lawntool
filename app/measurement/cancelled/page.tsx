'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle, ArrowLeft } from 'lucide-react'

// Separate component that uses useSearchParams
function MeasurementCancelledContent() {
  const searchParams = useSearchParams()
  const measurementId = searchParams.get('measurement_id')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
        <p className="text-gray-600 mb-8">
          Your payment was cancelled. No charges were made to your card.
        </p>
        
        <div className="bg-white rounded-lg p-6 shadow-md mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Your property measurements have been saved, but you'll need to complete the payment to access the full detailed report.
          </p>
          <p className="text-sm text-gray-500">
            You can return to this page anytime from the email we sent you.
          </p>
        </div>
        
        <div className="space-y-3">
          <Link 
            href="/" 
            className="block w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Return to Home
          </Link>
        </div>
        
        <p className="text-xs text-gray-500 mt-8">
          Need help? Contact support at support@sunstone.com
        </p>
      </div>
    </div>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function MeasurementCancelledPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MeasurementCancelledContent />
    </Suspense>
  )
}