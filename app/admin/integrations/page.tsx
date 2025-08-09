'use client'

import { useState, useEffect } from 'react'
import { Zap, Key, Webhook, Copy, Plus, Trash2, RefreshCw, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'

interface Business {
  _id: string
  name: string
}

interface ApiKey {
  name: string
  key: string
  permissions: string[]
  lastUsed?: Date
  isActive: boolean
  createdAt: Date
}

interface WebhookConfig {
  name: string
  url: string
  events: string[]
  isActive: boolean
  lastTriggered?: Date
}

export default function SuperAdminIntegrationsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [integration, setIntegration] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'zapier' | 'webhooks' | 'settings'>('zapier')
  const [showNewApiKey, setShowNewApiKey] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const availableEvents = [
    { id: 'quote.created', name: 'Quote Created', description: 'When a new quote is generated' },
    { id: 'quote.accepted', name: 'Quote Accepted', description: 'When a customer accepts a quote' },
    { id: 'measurement.completed', name: 'Measurement Completed', description: 'When a property measurement is done' },
    { id: 'pricing.calculated', name: 'Pricing Calculated', description: 'When pricing is calculated for a property' },
    { id: 'customer.created', name: 'Customer Created', description: 'When a new customer is added' },
    { id: 'service.scheduled', name: 'Service Scheduled', description: 'When a service is scheduled' }
  ]

  const availablePermissions = [
    { id: 'read:pricing', name: 'Read Pricing', description: 'Access pricing configurations' },
    { id: 'write:pricing', name: 'Write Pricing', description: 'Update pricing configurations' },
    { id: 'read:quotes', name: 'Read Quotes', description: 'Access quote data' },
    { id: 'write:quotes', name: 'Create Quotes', description: 'Create new quotes' },
    { id: 'read:measurements', name: 'Read Measurements', description: 'Access measurement data' },
    { id: 'read:customers', name: 'Read Customers', description: 'Access customer data' }
  ]

  useEffect(() => {
    fetchBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusinessId) {
      fetchIntegration(selectedBusinessId)
    }
  }, [selectedBusinessId])

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses')
      const data = await response.json()
      if (data.success) {
        setBusinesses(data.businesses)
        if (data.businesses.length > 0) {
          setSelectedBusinessId(data.businesses[0]._id)
        }
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchIntegration = async (businessId: string) => {
    try {
      const response = await fetch(`/api/admin/integrations/${businessId}`)
      const data = await response.json()
      if (data.success) {
        setIntegration(data.integration)
      }
    } catch (error) {
      console.error('Error fetching integration:', error)
    }
  }

  const generateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      alert('Please enter a name for the API key')
      return
    }

    try {
      const response = await fetch('/api/admin/integrations/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          name: newApiKeyName,
          permissions: ['read:pricing', 'read:quotes', 'read:measurements']
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`API Key generated: ${data.apiKey}\n\nPlease copy this key now. It won't be shown again!`)
        setNewApiKeyName('')
        setShowNewApiKey(false)
        fetchIntegration(selectedBusinessId)
      }
    } catch (error) {
      alert('Failed to generate API key')
    }
  }

  const toggleApiKey = async (keyId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/integrations/toggle-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          keyId,
          isActive
        })
      })

      if (response.ok) {
        fetchIntegration(selectedBusinessId)
      }
    } catch (error) {
      alert('Failed to update API key')
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return

    try {
      const response = await fetch('/api/admin/integrations/delete-key', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          keyId
        })
      })

      if (response.ok) {
        fetchIntegration(selectedBusinessId)
      }
    } catch (error) {
      alert('Failed to delete API key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const testWebhook = async (webhookId: string) => {
    try {
      const response = await fetch('/api/admin/integrations/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          webhookId
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('Test webhook sent successfully!')
      } else {
        alert('Failed to send test webhook: ' + data.error)
      }
    } catch (error) {
      alert('Failed to test webhook')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4">Loading integrations...</p>
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
            <Zap className="w-8 h-8 text-purple-600" />
            Super Admin - Integrations Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage Zapier integrations, API keys, and webhooks for all businesses
          </p>
        </div>

        {/* Business Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Business
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
          >
            {businesses.map((business) => (
              <option key={business._id} value={business._id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('zapier')}
              className={`px-6 py-3 font-medium flex items-center gap-2 ${
                activeTab === 'zapier'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              Zapier Integration
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-6 py-3 font-medium flex items-center gap-2 ${
                activeTab === 'webhooks'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Webhook className="w-4 h-4" />
              Webhooks
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'zapier' && (
            <div>
              {/* Zapier Status */}
              <div className="mb-8 p-6 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Zapier Connection Status
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    integration?.zapier?.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {integration?.zapier?.enabled ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">API Calls:</span>
                    <span className="ml-2 font-semibold">{integration?.stats?.totalApiCalls || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Webhooks Sent:</span>
                    <span className="ml-2 font-semibold">{integration?.stats?.totalWebhooksSent || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Keys:</span>
                    <span className="ml-2 font-semibold">
                      {integration?.zapier?.apiKeys?.filter((k: ApiKey) => k.isActive).length || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <a
                    href="https://zapier.com/developer/public-invite/190921/8a7e3f4c0b7f9a2d5e6c3b1a0d9e8f7c/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect with Zapier
                  </a>
                </div>
              </div>

              {/* API Keys */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API Keys
                  </h3>
                  <button
                    onClick={() => setShowNewApiKey(!showNewApiKey)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Generate New Key
                  </button>
                </div>

                {showNewApiKey && (
                  <div className="mb-4 p-4 border border-purple-200 rounded-lg bg-purple-50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="API Key Name (e.g., Zapier Production)"
                        value={newApiKeyName}
                        onChange={(e) => setNewApiKeyName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={generateApiKey}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Generate
                      </button>
                      <button
                        onClick={() => {
                          setShowNewApiKey(false)
                          setNewApiKeyName('')
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {integration?.zapier?.apiKeys?.map((apiKey: ApiKey, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{apiKey.name}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              apiKey.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {apiKey.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {apiKey.key.substring(0, 20)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(apiKey.key)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {copiedKey === apiKey.key ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-500">
                            Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                            {apiKey.lastUsed && ` • Last used: ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleApiKey(apiKey.key, !apiKey.isActive)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteApiKey(apiKey.key)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!integration?.zapier?.apiKeys || integration.zapier.apiKeys.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No API keys generated yet. Click "Generate New Key" to create one.
                    </div>
                  )}
                </div>
              </div>

              {/* Available Triggers */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Available Zapier Triggers</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {availableEvents.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">{event.name}</h4>
                          <p className="text-sm text-gray-600">{event.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Webhook Endpoints</h2>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Webhook
                </button>
              </div>

              <div className="space-y-4">
                {integration?.zapier?.webhooks?.map((webhook: WebhookConfig, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{webhook.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        webhook.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <code className="bg-gray-100 px-2 py-1 rounded">{webhook.url}</code>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {webhook.events.map((event) => (
                        <span key={event} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => testWebhook(webhook.name)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                      >
                        Test Webhook
                      </button>
                      {webhook.lastTriggered && (
                        <span className="text-xs text-gray-500">
                          Last triggered: {new Date(webhook.lastTriggered).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                
                {(!integration?.zapier?.webhooks || integration.zapier.webhooks.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No webhooks configured yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Integration Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={integration?.settings?.allowExternalAccess || false}
                      onChange={(e) => {
                        // Update setting
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="font-medium">Allow External API Access</span>
                  </label>
                  <p className="text-sm text-gray-600 mt-1 ml-7">
                    Enable access to your API from external services like Zapier
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate Limit (requests per hour)
                  </label>
                  <input
                    type="number"
                    value={integration?.settings?.rateLimitPerHour || 1000}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IP Whitelist (optional)
                  </label>
                  <textarea
                    placeholder="Enter IP addresses, one per line"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    value={integration?.settings?.ipWhitelist?.join('\n') || ''}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to allow all IPs. Add Zapier IPs for extra security.
                  </p>
                </div>

                <div className="pt-4">
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}