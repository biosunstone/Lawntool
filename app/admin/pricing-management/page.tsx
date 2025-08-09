'use client'

import { useState, useEffect } from 'react'
import { Settings, MapPin, DollarSign, Clock, Save, Plus, Trash2, Edit2 } from 'lucide-react'

interface Zone {
  zoneId: string
  zoneName: string
  minDriveTimeMinutes: number
  maxDriveTimeMinutes: number | null
  surchargePercentage: number
  color: string
  description: string
  priority: number
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

interface GeofencingConfig {
  _id?: string
  businessId: string
  businessName?: string
  shopLocation: {
    latitude: number
    longitude: number
    address: string
    name: string
  }
  baseRatePer1000SqFt: number
  currency: string
  minimumCharge: number
  zones: Zone[]
  serviceRules: ServiceRule[]
  maxServiceDistanceMinutes: number
  isActive: boolean
}

export default function PricingManagementPage() {
  const [configs, setConfigs] = useState<GeofencingConfig[]>([])
  const [selectedConfig, setSelectedConfig] = useState<GeofencingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'geofencing' | 'zipcode'>('geofencing')

  useEffect(() => {
    fetchConfigurations()
  }, [])

  const fetchConfigurations = async () => {
    try {
      const response = await fetch('/api/admin/geofencing/configs')
      const data = await response.json()
      if (data.success) {
        setConfigs(data.configs)
        if (data.configs.length > 0) {
          setSelectedConfig(data.configs[0])
        }
      }
    } catch (error) {
      console.error('Error fetching configurations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!selectedConfig) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/admin/geofencing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedConfig)
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Configuration saved successfully!')
        fetchConfigurations()
      } else {
        alert('Failed to save configuration: ' + data.error)
      }
    } catch (error) {
      alert('Error saving configuration')
    } finally {
      setSaving(false)
    }
  }

  const updateZone = (index: number, field: keyof Zone, value: any) => {
    if (!selectedConfig) return
    
    const updatedZones = [...selectedConfig.zones]
    updatedZones[index] = { ...updatedZones[index], [field]: value }
    setSelectedConfig({ ...selectedConfig, zones: updatedZones })
  }

  const addZone = () => {
    if (!selectedConfig) return
    
    const newZone: Zone = {
      zoneId: `zone${selectedConfig.zones.length + 1}`,
      zoneName: `Zone ${selectedConfig.zones.length + 1}`,
      minDriveTimeMinutes: 0,
      maxDriveTimeMinutes: null,
      surchargePercentage: 0,
      color: '#000000',
      description: 'New zone',
      priority: 1,
      isActive: true
    }
    
    setSelectedConfig({
      ...selectedConfig,
      zones: [...selectedConfig.zones, newZone]
    })
  }

  const deleteZone = (index: number) => {
    if (!selectedConfig || selectedConfig.zones.length <= 1) return
    
    const updatedZones = selectedConfig.zones.filter((_, i) => i !== index)
    setSelectedConfig({ ...selectedConfig, zones: updatedZones })
  }

  const updateServiceRule = (index: number, field: keyof ServiceRule, value: any) => {
    if (!selectedConfig) return
    
    const updatedRules = [...selectedConfig.serviceRules]
    updatedRules[index] = { ...updatedRules[index], [field]: value }
    setSelectedConfig({ ...selectedConfig, serviceRules: updatedRules })
  }

  const addServiceRule = () => {
    if (!selectedConfig) return
    
    const newRule: ServiceRule = {
      serviceName: 'New Service',
      serviceType: 'custom',
      availableInZones: [],
      additionalFeePercentage: 0,
      description: 'New service description',
      isActive: true
    }
    
    setSelectedConfig({
      ...selectedConfig,
      serviceRules: [...selectedConfig.serviceRules, newRule]
    })
  }

  const deleteServiceRule = (index: number) => {
    if (!selectedConfig) return
    
    const updatedRules = selectedConfig.serviceRules.filter((_, i) => i !== index)
    setSelectedConfig({ ...selectedConfig, serviceRules: updatedRules })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4">Loading configurations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-green-600" />
            Super Admin - Pricing Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage geofencing zones, service rules, and pricing configurations for all businesses
          </p>
        </div>

        {/* Business Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Business
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            value={selectedConfig?._id || ''}
            onChange={(e) => {
              const config = configs.find(c => c._id === e.target.value)
              setSelectedConfig(config || null)
            }}
          >
            {configs.map((config) => (
              <option key={config._id} value={config._id}>
                {config.businessName || 'Business'} - {config.shopLocation.name}
              </option>
            ))}
          </select>
        </div>

        {selectedConfig && (
          <>
            {/* Basic Configuration */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Basic Configuration
              </h2>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Rate (per 1,000 sq ft)
                  </label>
                  <input
                    type="number"
                    value={selectedConfig.baseRatePer1000SqFt}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      baseRatePer1000SqFt: parseFloat(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Charge
                  </label>
                  <input
                    type="number"
                    value={selectedConfig.minimumCharge}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      minimumCharge: parseFloat(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Service Distance (minutes)
                  </label>
                  <input
                    type="number"
                    value={selectedConfig.maxServiceDistanceMinutes}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      maxServiceDistanceMinutes: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Shop Location */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shop Location
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={selectedConfig.shopLocation.name}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      shopLocation: { ...selectedConfig.shopLocation, name: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={selectedConfig.shopLocation.address}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      shopLocation: { ...selectedConfig.shopLocation, address: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={selectedConfig.shopLocation.latitude}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      shopLocation: { ...selectedConfig.shopLocation, latitude: parseFloat(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={selectedConfig.shopLocation.longitude}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      shopLocation: { ...selectedConfig.shopLocation, longitude: parseFloat(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Zones Configuration */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Service Zones
                </h2>
                <button
                  onClick={addZone}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Zone
                </button>
              </div>
              
              {selectedConfig.zones.map((zone, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{zone.zoneName}</h3>
                    <button
                      onClick={() => deleteZone(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zone Name
                      </label>
                      <input
                        type="text"
                        value={zone.zoneName}
                        onChange={(e) => updateZone(index, 'zoneName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Drive Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={zone.minDriveTimeMinutes}
                        onChange={(e) => updateZone(index, 'minDriveTimeMinutes', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Drive Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={zone.maxDriveTimeMinutes || ''}
                        onChange={(e) => updateZone(index, 'maxDriveTimeMinutes', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Leave empty for no limit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Surcharge (%)
                      </label>
                      <input
                        type="number"
                        value={zone.surchargePercentage}
                        onChange={(e) => updateZone(index, 'surchargePercentage', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zone Color
                      </label>
                      <input
                        type="color"
                        value={zone.color}
                        onChange={(e) => updateZone(index, 'color', e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Active
                      </label>
                      <select
                        value={zone.isActive ? 'true' : 'false'}
                        onChange={(e) => updateZone(index, 'isActive', e.target.value === 'true')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={zone.description}
                        onChange={(e) => updateZone(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Service Rules */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Service Rules</h2>
                <button
                  onClick={addServiceRule}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </button>
              </div>
              
              {selectedConfig.serviceRules.map((rule, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{rule.serviceName}</h3>
                    <button
                      onClick={() => deleteServiceRule(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Name
                      </label>
                      <input
                        type="text"
                        value={rule.serviceName}
                        onChange={(e) => updateServiceRule(index, 'serviceName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Type
                      </label>
                      <select
                        value={rule.serviceType}
                        onChange={(e) => updateServiceRule(index, 'serviceType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="mowing">Mowing</option>
                        <option value="fertilization">Fertilization</option>
                        <option value="pest_control">Pest Control</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available in Zones
                      </label>
                      <div className="space-y-2">
                        {selectedConfig.zones.map((zone) => (
                          <label key={zone.zoneId} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={rule.availableInZones.includes(zone.zoneId)}
                              onChange={(e) => {
                                const zones = e.target.checked
                                  ? [...rule.availableInZones, zone.zoneId]
                                  : rule.availableInZones.filter(z => z !== zone.zoneId)
                                updateServiceRule(index, 'availableInZones', zones)
                              }}
                              className="rounded border-gray-300"
                            />
                            {zone.zoneName}
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Fee (%)
                      </label>
                      <input
                        type="number"
                        value={rule.additionalFeePercentage}
                        onChange={(e) => updateServiceRule(index, 'additionalFeePercentage', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={rule.description}
                        onChange={(e) => updateServiceRule(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}