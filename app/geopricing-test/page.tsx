'use client'

import { useState, useEffect } from 'react'
import { 
  MapPin, Calculator, Settings, BarChart3, Loader2, 
  CheckCircle, AlertCircle, Clock, TrendingDown, 
  TrendingUp, Minus, FileText, Eye
} from 'lucide-react'

export default function GeopricingTestPage() {
  // Form State
  const [customerAddress, setCustomerAddress] = useState('')
  const [propertySize, setPropertySize] = useState('5000')
  const [generateTable, setGenerateTable] = useState(true)
  const [saveToDatabase, setSaveToDatabase] = useState(true)
  
  // Config State
  const [config, setConfig] = useState<any>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [editingConfig, setEditingConfig] = useState(false)
  const [configForm, setConfigForm] = useState({
    baseRate: 20,
    shopAddress: '100 Queen St W, Toronto, ON M5H 2N1',
    shopLat: 43.6532,
    shopLng: -79.3832,
    closeMax: 5,
    closeAdjustment: -5,
    standardMin: 5,
    standardMax: 20,
    standardAdjustment: 0,
    extendedMin: 20,
    extendedAdjustment: 10
  })
  
  // Results State
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [calculations, setCalculations] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  
  // Test addresses
  const testAddresses = [
    { name: 'CN Tower (Close)', address: '290 Bremner Blvd, Toronto, ON', size: 5000 },
    { name: 'Casa Loma (Standard)', address: '1 Austin Terrace, Toronto, ON', size: 7500 },
    { name: 'Toronto Zoo (Extended)', address: '2000 Meadowvale Rd, Toronto, ON', size: 10000 },
    { name: 'Eaton Centre (Close)', address: '220 Yonge St, Toronto, ON', size: 3000 },
    { name: 'High Park (Standard)', address: '1873 Bloor St W, Toronto, ON', size: 6000 }
  ]

  // Load initial config
  useEffect(() => {
    loadConfig()
    loadAnalytics()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/geopricing/config')
      const data = await response.json()
      if (data.success && data.config) {
        setConfig(data.config)
        setConfigForm({
          baseRate: data.config.pricing.baseRatePer1000SqFt,
          shopAddress: data.config.shopLocation.address,
          shopLat: data.config.shopLocation.coordinates.lat,
          shopLng: data.config.shopLocation.coordinates.lng,
          closeMax: data.config.zones.close.driveTimeThreshold.max,
          closeAdjustment: data.config.zones.close.adjustmentValue,
          standardMin: data.config.zones.standard.driveTimeThreshold.min,
          standardMax: data.config.zones.standard.driveTimeThreshold.max,
          standardAdjustment: data.config.zones.standard.adjustmentValue,
          extendedMin: data.config.zones.extended.driveTimeThreshold.min,
          extendedAdjustment: data.config.zones.extended.adjustmentValue
        })
      }
    } catch (err) {
      console.log('No existing config, will create on first save')
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/geopricing/analytics?type=summary')
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/geopricing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: {
            baseRatePer1000SqFt: configForm.baseRate,
            currency: 'CAD',
            minimumCharge: 50
          },
          shopLocation: {
            address: configForm.shopAddress,
            lat: configForm.shopLat,
            lng: configForm.shopLng,
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5H 2N1'
          },
          zones: {
            close: {
              driveTimeThreshold: { min: 0, max: configForm.closeMax },
              adjustmentValue: configForm.closeAdjustment
            },
            standard: {
              driveTimeThreshold: { 
                min: configForm.standardMin, 
                max: configForm.standardMax 
              },
              adjustmentValue: configForm.standardAdjustment
            },
            extended: {
              driveTimeThreshold: { 
                min: configForm.extendedMin, 
                max: 999999 
              },
              adjustmentValue: configForm.extendedAdjustment
            }
          }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Configuration saved successfully!')
        setEditingConfig(false)
        loadConfig()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const processAddress = async (address?: string, size?: number) => {
    setLoading(true)
    setError('')
    setResult(null)
    
    const targetAddress = address || customerAddress
    const targetSize = size || parseInt(propertySize)
    
    if (!targetAddress || !targetSize) {
      setError('Please enter address and property size')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/geopricing/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerAddress: targetAddress,
          propertySize: targetSize,
          generateTable,
          saveToDatabase,
          source: 'test-interface'
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Processing failed')
      }
      
      setResult(data)
      
      // Add to calculations list
      setCalculations(prev => [{
        id: data.calculationId,
        address: targetAddress,
        size: targetSize,
        zone: data.pricing.zone,
        driveTime: data.pricing.driveTime,
        finalPrice: data.pricing.finalPrice,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)])
      
      // Reload analytics
      loadAnalytics()
      
    } catch (err: any) {
      setError(err.message || 'Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  const retrieveCalculation = async (calculationId: string) => {
    try {
      const response = await fetch(`/api/geopricing/process?id=${calculationId}`)
      const data = await response.json()
      
      if (data.success) {
        setResult({
          calculationId: data.calculation.id,
          pricing: data.calculation.pricing,
          formattedOutput: data.calculation.formattedOutput
        })
      }
    } catch (err) {
      console.error('Failed to retrieve calculation:', err)
    }
  }

  const runBatchTest = async () => {
    setLoading(true)
    setError('')
    
    for (const test of testAddresses) {
      await processAddress(test.address, test.size)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Delay between requests
    }
    
    setLoading(false)
    alert('Batch test completed!')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Geopricing Backend Test Interface
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configuration
              </button>
              <button
                onClick={loadAnalytics}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Configuration Panel */}
        {showConfig && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">System Configuration</h2>
              <button
                onClick={() => setEditingConfig(!editingConfig)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingConfig ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {editingConfig ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Base Rate per 1,000 sq ft</label>
                  <input
                    type="number"
                    value={configForm.baseRate}
                    onChange={(e) => setConfigForm({...configForm, baseRate: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Shop Address</label>
                  <input
                    type="text"
                    value={configForm.shopAddress}
                    onChange={(e) => setConfigForm({...configForm, shopAddress: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Close Zone (0-X min)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={configForm.closeMax}
                      onChange={(e) => setConfigForm({...configForm, closeMax: parseInt(e.target.value)})}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="Max minutes"
                    />
                    <input
                      type="number"
                      value={configForm.closeAdjustment}
                      onChange={(e) => setConfigForm({...configForm, closeAdjustment: parseInt(e.target.value)})}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="Adjustment %"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Standard Zone (X-Y min)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={configForm.standardMin}
                      onChange={(e) => setConfigForm({...configForm, standardMin: parseInt(e.target.value)})}
                      className="w-1/3 px-3 py-2 border rounded"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      value={configForm.standardMax}
                      onChange={(e) => setConfigForm({...configForm, standardMax: parseInt(e.target.value)})}
                      className="w-1/3 px-3 py-2 border rounded"
                      placeholder="Max"
                    />
                    <input
                      type="number"
                      value={configForm.standardAdjustment}
                      onChange={(e) => setConfigForm({...configForm, standardAdjustment: parseInt(e.target.value)})}
                      className="w-1/3 px-3 py-2 border rounded"
                      placeholder="Adj %"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Extended Zone (Y+ min)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={configForm.extendedMin}
                      onChange={(e) => setConfigForm({...configForm, extendedMin: parseInt(e.target.value)})}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="Min minutes"
                    />
                    <input
                      type="number"
                      value={configForm.extendedAdjustment}
                      onChange={(e) => setConfigForm({...configForm, extendedAdjustment: parseInt(e.target.value)})}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="Adjustment %"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <button
                    onClick={saveConfig}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Base Rate:</span>
                  <span className="ml-2 font-semibold">${config?.pricing?.baseRatePer1000SqFt}/1000 sqft</span>
                </div>
                <div>
                  <span className="text-gray-600">Shop Location:</span>
                  <span className="ml-2 font-semibold">{config?.shopLocation?.city}</span>
                </div>
                <div>
                  <span className="text-gray-600">Version:</span>
                  <span className="ml-2 font-semibold">{config?.version || 1}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Summary */}
        {analytics && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.totalCalculations || 0}
                </div>
                <div className="text-sm text-gray-600">Total Calculations</div>
              </div>
              {analytics.zoneDistribution?.map((zone: any) => (
                <div key={zone._id}>
                  <div className="text-2xl font-bold text-gray-900">
                    {zone.count}
                  </div>
                  <div className="text-sm text-gray-600">
                    {zone._id === 'close' ? 'Close Zone' :
                     zone._id === 'standard' ? 'Standard Zone' :
                     'Extended Zone'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Test Pricing Calculation
            </h2>

            {/* Quick Test Buttons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Tests:
              </label>
              <div className="space-y-2">
                {testAddresses.map((test, idx) => (
                  <button
                    key={idx}
                    onClick={() => processAddress(test.address, test.size)}
                    className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{test.name}</span>
                      <span className="text-gray-500">{test.size} sqft</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={runBatchTest}
                className="mt-2 w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Run All Tests
              </button>
            </div>

            {/* Manual Input */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Address:
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Enter full address"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                Property Size (sq ft):
              </label>
              <input
                type="number"
                value={propertySize}
                onChange={(e) => setPropertySize(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generateTable}
                    onChange={(e) => setGenerateTable(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Generate formatted table</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saveToDatabase}
                    onChange={(e) => setSaveToDatabase(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Save to database</span>
                </label>
              </div>
              
              <button
                onClick={() => processAddress()}
                disabled={loading}
                className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    Process Calculation
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Processing Results
            </h2>

            {result ? (
              <div className="space-y-4">
                {/* Calculation ID */}
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600">Calculation ID</div>
                  <div className="font-mono text-sm">{result.calculationId}</div>
                </div>

                {/* Pricing Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="text-sm text-blue-600">Drive Time</div>
                    <div className="text-xl font-bold">{result.pricing?.driveTime} min</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <div className="text-sm text-green-600">Zone</div>
                    <div className="text-xl font-bold">{result.pricing?.zone}</div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border rounded p-3">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Base Price:</span>
                    <span>{formatCurrency(result.pricing?.basePrice || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Adjusted Price:</span>
                    <span>{formatCurrency(result.pricing?.adjustedPrice || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold border-t pt-2">
                    <span>Final Price:</span>
                    <span className="text-green-600">
                      {formatCurrency(result.pricing?.finalPrice || 0)}
                    </span>
                  </div>
                </div>

                {/* Formatted Table */}
                {result.formattedOutput?.table && (
                  <div className="border rounded p-3">
                    <div className="text-sm font-medium mb-2">Generated Table:</div>
                    <div 
                      dangerouslySetInnerHTML={{ __html: result.formattedOutput.table }}
                      className="text-xs overflow-x-auto"
                    />
                  </div>
                )}

                {/* Explanation */}
                {result.formattedOutput?.explanation && (
                  <div className="bg-blue-50 rounded p-3">
                    <div className="text-sm font-medium mb-1">Explanation:</div>
                    <p className="text-sm text-gray-700">
                      {result.formattedOutput.explanation}
                    </p>
                  </div>
                )}

                {/* Performance Metrics */}
                {result.performance && (
                  <div className="text-xs text-gray-500">
                    <div>Total processing time: {result.performance.totalProcessingTime}ms</div>
                    {result.performance.breakdown && (
                      <div className="mt-1">
                        Geocoding: {result.performance.breakdown.breakdown?.geocoding}ms |
                        Drive time: {result.performance.breakdown.breakdown?.driveTimeApi}ms |
                        Calculation: {result.performance.breakdown.breakdown?.priceCalculation}ms
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No results yet. Process an address to see results.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Calculations */}
        {calculations.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Calculations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Address</th>
                    <th className="text-right py-2">Size</th>
                    <th className="text-center py-2">Zone</th>
                    <th className="text-right py-2">Drive Time</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-center py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc) => (
                    <tr key={calc.id} className="border-b">
                      <td className="py-2 font-mono text-xs">{calc.id.substring(0, 12)}...</td>
                      <td className="py-2">{calc.address.substring(0, 30)}...</td>
                      <td className="py-2 text-right">{calc.size} sqft</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          calc.zone?.includes('Close') ? 'bg-green-100 text-green-700' :
                          calc.zone?.includes('Extended') ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {calc.zone}
                        </span>
                      </td>
                      <td className="py-2 text-right">{calc.driveTime} min</td>
                      <td className="py-2 text-right font-semibold">
                        {formatCurrency(calc.finalPrice)}
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => retrieveCalculation(calc.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}