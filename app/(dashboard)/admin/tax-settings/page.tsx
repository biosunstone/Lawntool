'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Save,
  RefreshCw,
  Building,
  Percent,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BusinessTax {
  id: string
  name: string
  taxRate: number
  owner?: {
    name: string
    email: string
  }
}

export default function TaxSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [defaultTaxRate, setDefaultTaxRate] = useState(0.08)
  const [businesses, setBusinesses] = useState<BusinessTax[]>([])
  const [editingBusinesses, setEditingBusinesses] = useState<{ [key: string]: number }>({})
  const [applyToAll, setApplyToAll] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (session?.user && (session.user as any).role !== 'admin') {
      router.push('/dashboard')
      return
    }
    
    if (session?.user) {
      fetchTaxSettings()
    }
  }, [session, router, currentPage])

  const fetchTaxSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/settings/tax?page=${currentPage}&limit=10`)

      console.log('ERTERTERTERTERTER',response)
      if (response.ok) {
        const data = await response.json()
        setDefaultTaxRate(data.defaultTaxRate)
        setBusinesses(data.businesses)
        setTotalPages(data.pagination?.pages || 1)
      } else {
        toast.error('Failed to fetch tax settings')
      }
    } catch (error) {
      console.error('Error fetching tax settings:', error)
      toast.error('Failed to load tax settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDefaultTax = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/admin/settings/tax', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultTaxRate,
          applyToAll
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Default tax rate updated successfully')
        if (applyToAll) {
          toast.success(`Updated ${data.results.businessesUpdated} businesses`)
          fetchTaxSettings() // Refresh the list
        }
      } else {
        toast.error('Failed to update tax settings')
      }
    } catch (error) {
      console.error('Error updating tax settings:', error)
      toast.error('Failed to save tax settings')
    } finally {
      setSaving(false)
      setApplyToAll(false)
    }
  }

  const handleSaveBusinessTax = async (businessId: string) => {
    const newRate = editingBusinesses[businessId]
    if (newRate === undefined) return

    try {
      const response = await fetch('/api/admin/settings/tax', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessUpdates: [
            { businessId, taxRate: newRate }
          ]
        })
      })

      if (response.ok) {
        toast.success('Business tax rate updated')
        setBusinesses(prev =>
          prev.map(b => b.id === businessId ? { ...b, taxRate: newRate } : b)
        )
        setEditingBusinesses(prev => {
          const newState = { ...prev }
          delete newState[businessId]
          return newState
        })
      } else {
        toast.error('Failed to update business tax rate')
      }
    } catch (error) {
      console.error('Error updating business tax:', error)
      toast.error('Failed to save business tax rate')
    }
  }

  const formatTaxPercentage = (rate: number) => {
    return (rate * 100).toFixed(2)
  }

  const parseTaxPercentage = (value: string) => {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) return 0
    return Math.min(100, Math.max(0, parsed)) / 100
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure tax rates for quotes and invoices
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-gray-400" />
        </div>
      </div>

      {/* Default Tax Rate */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Tax Rate</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 w-32">
              Tax Rate:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formatTaxPercentage(defaultTaxRate)}
                onChange={(e) => setDefaultTaxRate(parseTaxPercentage(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="applyToAll"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="applyToAll" className="text-sm text-gray-700">
              Apply this rate to all existing businesses
            </label>
          </div>

          {applyToAll && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Warning:</strong> This will override all individual business tax rates.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSaveDefaultTax}
              disabled={saving}
              className="btn-primary flex items-center"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Default Rate
            </button>
            <button
              onClick={fetchTaxSettings}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Business Tax Rates */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Tax Rates</h2>
        <div className="text-sm text-gray-600 mb-4">
          Individual business tax rates override the default rate for their quotes.
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {businesses.map((business) => (
                <tr key={business.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {business.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {business.owner && (
                      <div>
                        <div className="text-sm text-gray-900">{business.owner.name}</div>
                        <div className="text-xs text-gray-500">{business.owner.email}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingBusinesses[business.id] !== undefined ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formatTaxPercentage(editingBusinesses[business.id])}
                          onChange={(e) => setEditingBusinesses(prev => ({
                            ...prev,
                            [business.id]: parseTaxPercentage(e.target.value)
                          }))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-primary focus:border-primary"
                        />
                        <Percent className="h-4 w-4 text-gray-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-900">
                          {formatTaxPercentage(business.taxRate)}%
                        </span>
                        {business.taxRate === defaultTaxRate && (
                          <span className="text-xs text-gray-500">(default)</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingBusinesses[business.id] !== undefined ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveBusinessTax(business.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingBusinesses(prev => {
                            const newState = { ...prev }
                            delete newState[business.id]
                            return newState
                          })}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingBusinesses(prev => ({
                          ...prev,
                          [business.id]: business.taxRate
                        }))}
                        className="text-primary hover:text-primary-dark"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How Tax Rates Work</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• New businesses will use the default tax rate</p>
              <p>• Individual business rates override the default</p>
              <p>• Tax is automatically calculated when creating quotes</p>
              <p>• Changes apply to new quotes only, existing quotes are not affected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}