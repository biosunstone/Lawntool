'use client'

import { useState, useEffect } from 'react'
import { 
  MapPin, 
  DollarSign, 
  Plus, 
  Search, 
  Upload, 
  Download,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface ZipCodeRule {
  _id: string
  zipCode: string
  postalCode: string
  country: 'US' | 'CA'
  region: string
  city: string
  state: string
  basePrice: number
  pricePerSqFt: number
  surchargePercentage: number
  discountPercentage: number
  minimumPrice: number
  maximumPrice: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ZipCodePricingAdmin() {
  const [rules, setRules] = useState<ZipCodeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'US' | 'CA'>('ALL')
  const [editingRule, setEditingRule] = useState<ZipCodeRule | null>(null)
  const [newRule, setNewRule] = useState<Partial<ZipCodeRule>>({
    country: 'US',
    basePrice: 50,
    pricePerSqFt: 0.05,
    surchargePercentage: 0,
    discountPercentage: 0,
    minimumPrice: 30,
    maximumPrice: 500,
    isActive: true
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/admin/zipcode-pricing')
      const data = await response.json()
      if (data.success) {
        setRules(data.rules || [])
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
      setAlert({ type: 'error', message: 'Failed to fetch pricing rules' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRule = async (rule: Partial<ZipCodeRule>) => {
    try {
      const response = await fetch('/api/admin/zipcode-pricing', {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      })
      
      const data = await response.json()
      if (data.success) {
        setAlert({ type: 'success', message: 'Rule saved successfully' })
        fetchRules()
        setEditingRule(null)
        setShowAddForm(false)
        setNewRule({
          country: 'US',
          basePrice: 50,
          pricePerSqFt: 0.05,
          surchargePercentage: 0,
          discountPercentage: 0,
          minimumPrice: 30,
          maximumPrice: 500,
          isActive: true
        })
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save rule' })
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    
    try {
      const response = await fetch(`/api/admin/zipcode-pricing?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      if (data.success) {
        setAlert({ type: 'success', message: 'Rule deleted successfully' })
        fetchRules()
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to delete rule' })
    }
  }

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/zipcode-pricing/bulk-upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      if (data.success) {
        setAlert({ type: 'success', message: `Uploaded ${data.count} rules successfully` })
        fetchRules()
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to upload file' })
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/zipcode-pricing/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zipcode-pricing-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to export data' })
    }
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch = searchTerm === '' || 
      rule.zipCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.postalCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.region?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCountry = selectedCountry === 'ALL' || rule.country === selectedCountry
    
    return matchesSearch && matchesCountry
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-blue-600" />
                  ZIP/Postal Code Pricing Management
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage pricing rules based on ZIP codes and postal codes
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Rule
                </button>
                <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  Bulk Upload
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleBulkUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            alert.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {alert.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {alert.message}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Rules</p>
                <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">US ZIP Codes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rules.filter(r => r.country === 'US').length}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">CA Postal Codes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rules.filter(r => r.country === 'CA').length}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Rules</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rules.filter(r => r.isActive).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ZIP, postal code, city, or region..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCountry('ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCountry === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Countries
              </button>
              <button
                onClick={() => setSelectedCountry('US')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCountry === 'US'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                USA
              </button>
              <button
                onClick={() => setSelectedCountry('CA')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCountry === 'CA'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Canada
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingRule ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
              </h2>
              <button
                onClick={() => {
                  setEditingRule(null)
                  setShowAddForm(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  value={editingRule?.country || newRule.country}
                  onChange={(e) => {
                    const value = e.target.value as 'US' | 'CA'
                    if (editingRule) {
                      setEditingRule({ ...editingRule, country: value })
                    } else {
                      setNewRule({ ...newRule, country: value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {(editingRule?.country || newRule.country) === 'US' ? 'ZIP Code' : 'Postal Code'}
                </label>
                <input
                  type="text"
                  value={editingRule?.zipCode || editingRule?.postalCode || newRule.zipCode || newRule.postalCode || ''}
                  onChange={(e) => {
                    const field = (editingRule?.country || newRule.country) === 'US' ? 'zipCode' : 'postalCode'
                    if (editingRule) {
                      setEditingRule({ ...editingRule, [field]: e.target.value })
                    } else {
                      setNewRule({ ...newRule, [field]: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={(editingRule?.country || newRule.country) === 'US' ? '10001' : 'K1A 0B1'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={editingRule?.city || newRule.city || ''}
                  onChange={(e) => {
                    if (editingRule) {
                      setEditingRule({ ...editingRule, city: e.target.value })
                    } else {
                      setNewRule({ ...newRule, city: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  value={editingRule?.state || newRule.state || ''}
                  onChange={(e) => {
                    if (editingRule) {
                      setEditingRule({ ...editingRule, state: e.target.value })
                    } else {
                      setNewRule({ ...newRule, state: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRule?.basePrice || newRule.basePrice || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (editingRule) {
                      setEditingRule({ ...editingRule, basePrice: value })
                    } else {
                      setNewRule({ ...newRule, basePrice: value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Sq Ft ($)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={editingRule?.pricePerSqFt || newRule.pricePerSqFt || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (editingRule) {
                      setEditingRule({ ...editingRule, pricePerSqFt: value })
                    } else {
                      setNewRule({ ...newRule, pricePerSqFt: value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surcharge (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingRule?.surchargePercentage || newRule.surchargePercentage || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (editingRule) {
                      setEditingRule({ ...editingRule, surchargePercentage: value })
                    } else {
                      setNewRule({ ...newRule, surchargePercentage: value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingRule?.discountPercentage || newRule.discountPercentage || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (editingRule) {
                      setEditingRule({ ...editingRule, discountPercentage: value })
                    } else {
                      setNewRule({ ...newRule, discountPercentage: value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRule?.minimumPrice || newRule.minimumPrice || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (editingRule) {
                      setEditingRule({ ...editingRule, minimumPrice: value })
                    } else {
                      setNewRule({ ...newRule, minimumPrice: value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRule?.maximumPrice || newRule.maximumPrice || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (editingRule) {
                      setEditingRule({ ...editingRule, maximumPrice: value })
                    } else {
                      setNewRule({ ...newRule, maximumPrice: value })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingRule?.isActive ?? newRule.isActive ?? true}
                    onChange={(e) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, isActive: e.target.checked })
                      } else {
                        setNewRule({ ...newRule, isActive: e.target.checked })
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setEditingRule(null)
                  setShowAddForm(false)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRule(editingRule || newRule)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Per Sq Ft
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adjustments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No pricing rules found
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            rule.country === 'US' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {rule.country}
                          </span>
                          <span className="ml-2 font-medium">
                            {rule.zipCode || rule.postalCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{rule.city}</div>
                        <div className="text-sm text-gray-500">{rule.state}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${rule.basePrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${rule.pricePerSqFt.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {rule.surchargePercentage > 0 && (
                          <span className="text-red-600">+{rule.surchargePercentage}%</span>
                        )}
                        {rule.discountPercentage > 0 && (
                          <span className="text-green-600 ml-2">-{rule.discountPercentage}%</span>
                        )}
                        {rule.surchargePercentage === 0 && rule.discountPercentage === 0 && (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${rule.minimumPrice} - ${rule.maximumPrice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rule.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}