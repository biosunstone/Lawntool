'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Download, FileText, MapPin, Ruler, Home } from 'lucide-react'
import Link from 'next/link'

// Separate component that uses useSearchParams
function MeasurementSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [measurementData, setMeasurementData] = useState<any>(null)
  const [error, setError] = useState('')

  const sessionId = searchParams.get('session_id')
  const measurementId = searchParams.get('measurement_id')

  useEffect(() => {
    if (sessionId && measurementId) {
      verifyPaymentAndGetData()
    } else {
      setError('Invalid payment session')
      setLoading(false)
    }
  }, [sessionId, measurementId])

  const verifyPaymentAndGetData = async () => {
    try {
      // Verify payment with Stripe
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, measurementId })
      })

      if (!response.ok) {
        throw new Error('Payment verification failed')
      }

      const data = await response.json()
      setMeasurementData(data.measurement)
    } catch (error) {
      console.error('Error verifying payment:', error)
      setError('Failed to verify payment. Please contact support.')
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    // In production, this would generate a PDF report
    const reportData = {
      measurementId: measurementData._id,
      address: measurementData.address,
      measurements: measurementData.measurements,
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `measurement-report-${measurementData._id}.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying payment and preparing your report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Issue</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Your property measurement report is ready</p>
          </div>

          {/* Property Information */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              Property Information
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>Address:</strong> {measurementData?.address}
            </p>
            <p className="text-gray-700">
              <strong>Measurement ID:</strong> {measurementData?._id}
            </p>
          </div>

          {/* Detailed Measurements */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Ruler className="h-5 w-5 mr-2 text-blue-600" />
              Detailed Measurements
            </h2>
            
            {measurementData?.measurements && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-2">Total Property</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {measurementData.measurements.totalArea?.toLocaleString() || 0} sq ft
                  </p>
                  <p className="text-sm text-gray-500">
                    Perimeter: {measurementData.measurements.perimeter?.toFixed(0) || 0} ft
                  </p>
                </div>

                {measurementData.measurements.lawn && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-2">Lawn Areas</h3>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">
                        Total: {measurementData.measurements.lawn.total?.toLocaleString() || 0} sq ft
                      </p>
                      {measurementData.measurements.lawn.frontYard > 0 && (
                        <p className="text-sm text-gray-600">
                          Front Yard: {measurementData.measurements.lawn.frontYard.toLocaleString()} sq ft
                        </p>
                      )}
                      {measurementData.measurements.lawn.backYard > 0 && (
                        <p className="text-sm text-gray-600">
                          Back Yard: {measurementData.measurements.lawn.backYard.toLocaleString()} sq ft
                        </p>
                      )}
                      {measurementData.measurements.lawn.sideYard > 0 && (
                        <p className="text-sm text-gray-600">
                          Side Yard: {measurementData.measurements.lawn.sideYard.toLocaleString()} sq ft
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {measurementData.measurements.driveway > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-2">Driveway</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {measurementData.measurements.driveway.toLocaleString()} sq ft
                    </p>
                  </div>
                )}

                {measurementData.measurements.sidewalk > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-2">Sidewalk</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {measurementData.measurements.sidewalk.toLocaleString()} sq ft
                    </p>
                  </div>
                )}

                {measurementData.measurements.building > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-2">Building Footprint</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {measurementData.measurements.building.toLocaleString()} sq ft
                    </p>
                  </div>
                )}

                {measurementData.measurements.other > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-2">Other Areas</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {measurementData.measurements.other.toLocaleString()} sq ft
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Additional Technical Data */}
            {measurementData?.coordinates && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-gray-600">
                  <strong>GPS Coordinates:</strong> {measurementData.coordinates.lat.toFixed(6)}, {measurementData.coordinates.lng.toFixed(6)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Measurement Date:</strong> {new Date(measurementData.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Measurement Method:</strong> {measurementData.selectionMethod || 'AI Detection'}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={downloadReport}
              className="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Full Report
            </button>
            
            <button
              onClick={() => window.print()}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <FileText className="h-5 w-5 mr-2" />
              Print Report
            </button>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold mb-4">What's Next?</h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-semibold">1</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Download Your Report</h3>
                <p className="text-sm text-gray-600">Save the detailed measurement report for your records</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-semibold">2</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Share with Contractors</h3>
                <p className="text-sm text-gray-600">Use these measurements to get accurate quotes from service providers</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-semibold">3</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Access Anytime</h3>
                <p className="text-sm text-gray-600">Your measurement data is saved and can be accessed anytime from your email</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500 text-center">
              Need help? Contact support at support@sunstone.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function MeasurementSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MeasurementSuccessContent />
    </Suspense>
  )
}