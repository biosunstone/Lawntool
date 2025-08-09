'use client'

import { useState, useEffect } from 'react'
import { Settings, MapPin, DollarSign, Clock, Save, Info } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Zone {
  zoneId: string
  zoneName: string
  minDriveTimeMinutes: number
  maxDriveTimeMinutes: number | null
  surchargePercentage: number
  color: string
  description: string
  isActive: boolean
}

interface ServiceRule {
  serviceName: string
  serviceType: string
  availableInZones: string[]
  additionalFeePercentage: number
  description: string
  isActive: boolean
}

export default function BusinessPricingConfigPage() {
  const { data: session } = useSession()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'basic' | 'zones' | 'services'>('basic')

  useEffect(() => {
    if (session?.user) {
      fetchConfiguration()
    }
  }, [session])

  const fetchConfiguration = async () => {
    try {
      const response = await fetch('/api/business/geofencing/config')
      const data = await response.json()
      if (data.success) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Error fetching configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/business/geofencing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Configuration saved successfully!')
      } else {
        alert('Failed to save configuration: ' + data.error)
      }
    } catch (error) {
      alert('Error saving configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4">Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <Info className="w-6 h-6 text-yellow-600 mb-2" />
            <h2 className="text-lg font-semibold text-yellow-900">No Configuration Found</h2>
            <p className="text-yellow-700 mt-2">
              Please contact support to set up your pricing configuration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-6 h-6 text-green-600" />
            Pricing Configuration
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your service zones and pricing rules
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveSection('basic')}
              className={`px-6 py-3 font-medium ${
                activeSection === 'basic'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Basic Settings
            </button>
            <button
              onClick={() => setActiveSection('zones')}
              className={`px-6 py-3 font-medium ${
                activeSection === 'zones'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Service Zones
            </button>
            <button
              onClick={() => setActiveSection('services')}
              className={`px-6 py-3 font-medium ${
                activeSection === 'services'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Services
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeSection === 'basic' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Basic Pricing Settings
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Rate (per 1,000 sq ft)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={config.baseRatePer1000SqFt}
                      onChange={(e) => setConfig({
                        ...config,
                        baseRatePer1000SqFt: parseFloat(e.target.value)
                      })}
                      className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This is your standard rate before zone adjustments
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Service Charge
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={config.minimumCharge}
                      onChange={(e) => setConfig({
                        ...config,
                        minimumCharge: parseFloat(e.target.value)
                      })}
                      className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum charge regardless of property size
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Service Distance
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config.maxServiceDistanceMinutes}
                      onChange={(e) => setConfig({
                        ...config,
                        maxServiceDistanceMinutes: parseInt(e.target.value)
                      })}
                      className="w-full pr-16 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <span className="absolute right-3 top-3 text-gray-500">minutes</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Customers beyond this drive time are out of service area
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={config.currency}
                    onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CAD">CAD (C$)</option>
                  </select>
                </div>
              </div>

              {/* Shop Location */}
              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shop Location
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shop Name
                    </label>
                    <input
                      type="text"
                      value={config.shopLocation.name}
                      onChange={(e) => setConfig({
                        ...config,
                        shopLocation: { ...config.shopLocation, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={config.shopLocation.address}
                      onChange={(e) => setConfig({
                        ...config,
                        shopLocation: { ...config.shopLocation, address: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'zones' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Service Zones Configuration
              </h2>
              
              <div className="space-y-4">
                {config.zones.map((zone: Zone, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        {zone.zoneName}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        zone.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Drive Time Range
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={zone.minDriveTimeMinutes}
                            readOnly
                            className="w-20 px-2 py-1 border border-gray-300 rounded bg-gray-50"
                          />
                          <span>to</span>
                          <input
                            type="number"
                            value={zone.maxDriveTimeMinutes || '∞'}
                            readOnly
                            className="w-20 px-2 py-1 border border-gray-300 rounded bg-gray-50"
                          />
                          <span>minutes</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price Adjustment
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            zone.surchargePercentage > 0 ? 'text-red-600' : 
                            zone.surchargePercentage < 0 ? 'text-green-600' : 
                            'text-gray-600'
                          }`}>
                            {zone.surchargePercentage > 0 ? '+' : ''}{zone.surchargePercentage}%
                          </span>
                          {zone.surchargePercentage > 0 && <span className="text-sm text-gray-500">surcharge</span>}
                          {zone.surchargePercentage < 0 && <span className="text-sm text-gray-500">discount</span>}
                          {zone.surchargePercentage === 0 && <span className="text-sm text-gray-500">base rate</span>}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-3">{zone.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-blue-900">
                  Zone configurations determine pricing based on drive time from your shop to the customer.
                  Contact support to modify zone boundaries or add new zones.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'services' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Service Availability</h2>
              
              <div className="space-y-4">
                {config.serviceRules.map((service: ServiceRule, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{service.serviceName}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        service.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Available in Zones
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {config.zones
                            .filter((zone: Zone) => service.availableInZones.includes(zone.zoneId))
                            .map((zone: Zone) => (
                              <span
                                key={zone.zoneId}
                                className="px-3 py-1 rounded-full text-sm"
                                style={{
                                  backgroundColor: zone.color + '20',
                                  color: zone.color
                                }}
                              >
                                {zone.zoneName}
                              </span>
                            ))
                          }
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Additional Service Fee
                        </label>
                        <div className="flex items-center gap-2">
                          {service.additionalFeePercentage > 0 ? (
                            <>
                              <span className="font-semibold text-red-600">
                                +{service.additionalFeePercentage}%
                              </span>
                              <span className="text-sm text-gray-500">
                                (applied after zone surcharge)
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">No additional fee</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-3">{service.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}