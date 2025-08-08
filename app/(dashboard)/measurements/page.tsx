'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Download, Search, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// Import authenticated measurement wrapper
const AuthenticatedMeasurement = dynamic(
  () => import('@/components/saas/AuthenticatedMeasurement'),
  { ssr: false }
)

interface MeasurementHistory {
  _id: string
  address: string
  measurements: {
    totalArea: number
    lawn: {
      total: number
    }
    driveway: number
    sidewalk: number
  }
  createdAt: string
}

export default function MeasurementsPage() {
  const { data: session } = useSession()
  const [showNewMeasurement, setShowNewMeasurement] = useState(false)
  const [history, setHistory] = useState<MeasurementHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [measurementSaved, setMeasurementSaved] = useState(false)

  useEffect(() => {
    fetchMeasurementHistory()
  }, [])

  const fetchMeasurementHistory = async () => {
    try {
      const response = await fetch('/api/measurements')
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch measurement history:', error)
      toast.error('Failed to load measurement history')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/measurements/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `measurements-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        toast.success('Measurements exported successfully')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export measurements')
    }
  }

  const filteredHistory = history.filter(item =>
    item.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Property Measurements</h1>
            <p className="mt-1 text-sm text-gray-600">
              Measure properties and manage your measurement history
            </p>
          </div>
          <button
            onClick={() => setShowNewMeasurement(!showNewMeasurement)}
            className="btn-primary"
          >
            {showNewMeasurement ? 'View History' : 'New Measurement'}
          </button>
        </div>
      </div>

      {showNewMeasurement ? (
        // Wrapper for existing measurement tool
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Create New Measurement</h2>
            <p className="text-sm text-gray-600">
              Enter an address to measure the property and save it to your history
            </p>
          </div>
          
          {/* Success Banner */}
          {measurementSaved && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div className="flex-1">
                <p className="text-green-800 font-medium">Measurement saved successfully!</p>
                <p className="text-green-700 text-sm">You can continue measuring or view your history.</p>
              </div>
            </div>
          )}
          <AuthenticatedMeasurement 
            onMeasurementComplete={() => {
              fetchMeasurementHistory()
              setMeasurementSaved(true)
              // Keep showing the measurement view so user can see the results
              // User can manually click "View History" when done
              
              // Reset the saved indicator after a few seconds
              setTimeout(() => {
                setMeasurementSaved(false)
              }, 5000)
            }}
          />
        </div>
      ) : (
        <>
          {/* Search and Export */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by address..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Measurement History */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Measurement History</h2>
            </div>
            
            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredHistory.map((measurement) => (
                  <div key={measurement._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                          <h3 className="text-lg font-medium text-gray-900">
                            {measurement.address}
                          </h3>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Total Area:</span>
                            <p className="font-medium text-gray-900">
                              {measurement.measurements.totalArea.toLocaleString()} sq ft
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Lawn:</span>
                            <p className="font-medium text-green-600">
                              {measurement.measurements.lawn.total.toLocaleString()} sq ft
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Driveway:</span>
                            <p className="font-medium text-gray-600">
                              {measurement.measurements.driveway.toLocaleString()} sq ft
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Sidewalk:</span>
                            <p className="font-medium text-blue-600">
                              {measurement.measurements.sidewalk.toLocaleString()} sq ft
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(measurement.createdAt).toLocaleDateString()} at{' '}
                          {new Date(measurement.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Link 
                          href={`/quotes/new?measurementId=${measurement._id}`}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          Create Quote
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No measurements</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'No measurements found matching your search.' : 'Get started by creating your first measurement.'}
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowNewMeasurement(true)}
                    className="btn-primary"
                  >
                    Create Measurement
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}