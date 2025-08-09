'use client'

import { useState, useEffect } from 'react'
import { 
  MapPin, 
  DollarSign, 
  Search,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'

interface BusinessZipCodeSettings {
  enabled: boolean
  defaultBasePrice: number
  defaultPricePerSqFt: number
  allowCustomRules: boolean
  customRules: Array<{
    zipCode?: string
    postalCode?: string
    country: 'US' | 'CA'
    surchargePercentage: number
    discountPercentage: number
  }>
}

export default function BusinessZipCodePricing() {
  const [settings, setSettings] = useState<BusinessZipCodeSettings>({
    enabled: true,
    defaultBasePrice: 50,
    defaultPricePerSqFt: 0.05,
    allowCustomRules: false,
    customRules: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/business/zipcode-pricing/settings')
      const data = await response.json()
      if (data.success && data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setAlert({ type: 'error', message: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/business/zipcode-pricing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      const data = await response.json()
      if (data.success) {
        setAlert({ type: 'success', message: 'Settings saved successfully' })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddCustomRule = () => {
    setSettings({
      ...settings,
      customRules: [
        ...settings.customRules,
        {
          country: 'US',
          surchargePercentage: 0,
          discountPercentage: 0
        }
      ]
    })
  }

  const handleRemoveCustomRule = (index: number) => {
    setSettings({
      ...settings,
      customRules: settings.customRules.filter((_, i) => i !== index)
    })
  }

  const handleUpdateCustomRule = (index: number, field: string, value: any) => {
    const updatedRules = [...settings.customRules]
    updatedRules[index] = { ...updatedRules[index], [field]: value }
    setSettings({ ...settings, customRules: updatedRules })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

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
                  ZIP/Postal Code Pricing Configuration
                </h1>
                <p className="mt-2 text-gray-600">
                  Configure your business pricing based on ZIP codes and postal codes
                </p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
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
            <button
              onClick={() => setAlert(null)}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          
          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable ZIP/Postal Code Pricing
                </label>
                <p className="text-sm text-gray-500">
                  Use location-based pricing for your services
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Default Base Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Base Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.defaultBasePrice}
                  onChange={(e) => setSettings({ ...settings, defaultBasePrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Base price for all services in your coverage area
                </p>
              </div>

              {/* Default Price per Sq Ft */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Price per Sq Ft ($)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={settings.defaultPricePerSqFt}
                  onChange={(e) => setSettings({ ...settings, defaultPricePerSqFt: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional charge per square foot of property
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Rules */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Custom Location Rules</h2>
              <p className="text-sm text-gray-500">
                Add surcharges or discounts for specific ZIP/postal codes
              </p>
            </div>
            <button
              onClick={handleAddCustomRule}
              disabled={!settings.enabled}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Add Rule
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How custom rules work:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Surcharges add a percentage to the final price</li>
                  <li>Discounts reduce the final price by a percentage</li>
                  <li>Rules apply only to the specific ZIP/postal codes you define</li>
                  <li>Contact support if you need more advanced pricing rules</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Custom Rules List */}
          {settings.customRules.length > 0 ? (
            <div className="space-y-3">
              {settings.customRules.map((rule, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        value={rule.country}
                        onChange={(e) => handleUpdateCustomRule(index, 'country', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!settings.enabled}
                      >
                        <option value="US">USA</option>
                        <option value="CA">Canada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {rule.country === 'US' ? 'ZIP Code' : 'Postal Code'}
                      </label>
                      <input
                        type="text"
                        value={rule.country === 'US' ? rule.zipCode || '' : rule.postalCode || ''}
                        onChange={(e) => handleUpdateCustomRule(
                          index, 
                          rule.country === 'US' ? 'zipCode' : 'postalCode', 
                          e.target.value
                        )}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={rule.country === 'US' ? '10001' : 'K1A 0B1'}
                        disabled={!settings.enabled}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Surcharge (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={rule.surchargePercentage}
                        onChange={(e) => handleUpdateCustomRule(index, 'surchargePercentage', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!settings.enabled}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={rule.discountPercentage}
                        onChange={(e) => handleUpdateCustomRule(index, 'discountPercentage', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!settings.enabled}
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => handleRemoveCustomRule(index)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        disabled={!settings.enabled}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No custom rules defined</p>
              <p className="text-sm mt-1">Add a rule to apply special pricing for specific locations</p>
            </div>
          )}
        </div>

        {/* Request More Coverage */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Need More Coverage?</h2>
          <p className="text-gray-600 mb-4">
            If you need pricing rules for additional ZIP codes or postal codes, or require more advanced pricing configurations, 
            please contact our support team.
          </p>
          <button className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}