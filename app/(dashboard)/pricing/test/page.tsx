'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Calculator, 
  TestTube, 
  DollarSign,
  MapPin,
  Users,
  Calendar,
  Package,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface TestScenario {
  name: string
  zipCode: string
  customerTags: string[]
  totalArea: number
  services: {
    name: string
    area: number
    pricePerUnit: number
    totalPrice: number
  }[]
  date: string
}

export default function PricingTestPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  
  // Test scenario state
  const [scenario, setScenario] = useState<TestScenario>({
    name: 'Custom Test',
    zipCode: '90210',
    customerTags: [],
    totalArea: 5000,
    services: [
      { name: 'Lawn Treatment', area: 3000, pricePerUnit: 0.02, totalPrice: 60 },
      { name: 'Driveway Cleaning', area: 1500, pricePerUnit: 0.03, totalPrice: 45 },
      { name: 'Sidewalk Maintenance', area: 500, pricePerUnit: 0.025, totalPrice: 12.5 }
    ],
    date: new Date().toISOString().split('T')[0]
  })
  
  const [customTags, setCustomTags] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('custom')

  const presetScenarios = {
    default: {
      name: 'Standard Customer',
      zipCode: '90210',
      customerTags: [],
      totalArea: 5000,
      services: [
        { name: 'Lawn Treatment', area: 3000, pricePerUnit: 0.02, totalPrice: 60 },
        { name: 'Driveway Cleaning', area: 1500, pricePerUnit: 0.03, totalPrice: 45 },
        { name: 'Sidewalk Maintenance', area: 500, pricePerUnit: 0.025, totalPrice: 12.5 }
      ],
      date: new Date().toISOString().split('T')[0]
    },
    vip: {
      name: 'VIP Customer',
      zipCode: '10001',
      customerTags: ['vip', 'premium'],
      totalArea: 8000,
      services: [
        { name: 'Lawn Treatment', area: 5000, pricePerUnit: 0.02, totalPrice: 100 },
        { name: 'Driveway Cleaning', area: 2000, pricePerUnit: 0.03, totalPrice: 60 },
        { name: 'Sidewalk Maintenance', area: 1000, pricePerUnit: 0.025, totalPrice: 25 }
      ],
      date: new Date().toISOString().split('T')[0]
    },
    large: {
      name: 'Large Property',
      zipCode: '94105',
      customerTags: [],
      totalArea: 15000,
      services: [
        { name: 'Lawn Treatment', area: 10000, pricePerUnit: 0.02, totalPrice: 200 },
        { name: 'Driveway Cleaning', area: 3000, pricePerUnit: 0.03, totalPrice: 90 },
        { name: 'Sidewalk Maintenance', area: 2000, pricePerUnit: 0.025, totalPrice: 50 }
      ],
      date: new Date().toISOString().split('T')[0]
    },
  }

  const loadPreset = (presetKey: string) => {
    if (presetKey === 'custom') return
    
    const preset = presetScenarios[presetKey as keyof typeof presetScenarios]
    if (preset) {
      setScenario(preset)
      setCustomTags(preset.customerTags.join(', '))
      setSelectedPreset(presetKey)
    }
  }

  const runTest = async () => {
    try {
      setLoading(true)
      
      // Update customer tags from the input
      const tags = customTags.split(',').map(t => t.trim()).filter(Boolean)
      const testData = {
        ...scenario,
        customerTags: tags
      }

      const response = await fetch('/api/pricing-rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testScenario: 'custom',
          customScenario: testData
        })
      })

      if (!response.ok) throw new Error('Failed to run test')
      
      const results = await response.json()
      setTestResults(results)
    } catch (error) {
      console.error('Error running test:', error)
      toast.error('Failed to run pricing test')
    } finally {
      setLoading(false)
    }
  }

  const updateService = (index: number, field: string, value: any) => {
    const newServices = [...scenario.services]
    newServices[index] = {
      ...newServices[index],
      [field]: field === 'area' || field === 'pricePerUnit' ? parseFloat(value) || 0 : value
    }
    
    // Recalculate total price
    if (field === 'area' || field === 'pricePerUnit') {
      newServices[index].totalPrice = newServices[index].area * newServices[index].pricePerUnit
    }
    
    // Update total area
    const totalArea = newServices.reduce((sum, s) => sum + s.area, 0)
    
    setScenario({
      ...scenario,
      services: newServices,
      totalArea
    })
  }

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'zone': return <MapPin className="h-4 w-4" />
      case 'customer': return <Users className="h-4 w-4" />
      case 'service': return <Package className="h-4 w-4" />
      case 'volume': return <TrendingUp className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <TestTube className="h-6 w-6 mr-2 text-primary" />
              Pricing Rules Test Lab
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Test how pricing rules affect quotes with different scenarios
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <div className="space-y-6">
          {/* Preset Scenarios */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preset Scenarios</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presetScenarios).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => loadPreset(key)}
                  className={`px-3 py-2 rounded border text-sm ${
                    selectedPreset === key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Configuration */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scenario Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={scenario.zipCode}
                  onChange={(e) => setScenario({ ...scenario, zipCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="90210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="vip, premium, loyal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Date
                </label>
                <input
                  type="date"
                  value={scenario.date}
                  onChange={(e) => setScenario({ ...scenario, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Area: <span className="font-semibold">{scenario.totalArea} sq ft</span>
                </label>
              </div>
            </div>
          </div>

          {/* Services Configuration */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
            
            <div className="space-y-3">
              {scenario.services.map((service, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => updateService(index, 'name', e.target.value)}
                    className="w-full mb-2 px-2 py-1 text-sm font-medium border-b border-gray-200 focus:border-primary focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Area (sq ft)</label>
                      <input
                        type="number"
                        value={service.area}
                        onChange={(e) => updateService(index, 'area', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">$/sq ft</label>
                      <input
                        type="number"
                        step="0.001"
                        value={service.pricePerUnit}
                        onChange={(e) => updateService(index, 'pricePerUnit', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Total</label>
                      <div className="px-2 py-1 text-sm bg-gray-50 rounded font-medium">
                        ${service.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={runTest}
              disabled={loading}
              className="mt-4 w-full btn-primary flex items-center justify-center"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Run Pricing Test
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-6">
          {testResults ? (
            <>
              {/* Summary */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Original Total</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${testResults.results.originalTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${
                    testResults.results.totalAdjustment > 0 
                      ? 'bg-red-50' 
                      : testResults.results.totalAdjustment < 0 
                      ? 'bg-green-50' 
                      : 'bg-gray-50'
                  }`}>
                    <p className="text-sm text-gray-600">Adjusted Total</p>
                    <p className="text-xl font-bold">
                      ${testResults.results.adjustedTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Total Adjustment</span>
                  <span className={`text-lg font-bold ${
                    testResults.results.totalAdjustment > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {testResults.results.totalAdjustment > 0 ? '+' : ''}
                    ${testResults.results.totalAdjustment.toFixed(2)} 
                    ({testResults.results.percentageChange}%)
                  </span>
                </div>
              </div>

              {/* Applied Rules */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Applied Rules ({testResults.appliedRules.length})
                </h2>
                
                {testResults.appliedRules.length > 0 ? (
                  <div className="space-y-2">
                    {testResults.appliedRules.map((rule: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          {getRuleTypeIcon(rule.ruleType)}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{rule.ruleName}</p>
                            <p className="text-xs text-gray-600">Type: {rule.ruleType}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${
                          rule.adjustment > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {rule.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No pricing rules applied to this scenario</p>
                  </div>
                )}
              </div>

              {/* Service Breakdown */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h2>
                
                <div className="space-y-2">
                  {testResults.adjustedServices.map((service: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <p className="font-medium text-gray-900 mb-2">{service.name}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Original:</span>
                          <span className="ml-2">${service.originalTotal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Adjusted:</span>
                          <span className={`ml-2 font-medium ${
                            service.difference > 0 ? 'text-red-600' : 
                            service.difference < 0 ? 'text-green-600' : ''
                          }`}>
                            ${service.adjustedTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {service.difference !== 0 && (
                        <p className={`text-xs mt-1 ${
                          service.difference > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {service.difference > 0 ? '+' : ''}${service.difference.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Unapplied Rules */}
              {testResults.unappliedRules.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Why Other Rules Didn't Apply
                  </h2>
                  
                  <div className="space-y-2">
                    {testResults.unappliedRules.slice(0, 5).map((rule: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start">
                          <XCircle className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{rule.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Configure a test scenario and click "Run Pricing Test" to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}