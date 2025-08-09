'use client'

import { useState, useEffect } from 'react'
import { Zap, Key, Webhook, Copy, CheckCircle, Info, ExternalLink, Shield } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function BusinessIntegrationsPage() {
  const { data: session } = useSession()
  const [integration, setIntegration] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'webhooks'>('overview')
  const [copiedText, setCopiedText] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchIntegration()
    }
  }, [session])

  const fetchIntegration = async () => {
    try {
      const response = await fetch('/api/business/integrations/config')
      const data = await response.json()
      if (data.success) {
        setIntegration(data.integration)
      }
    } catch (error) {
      console.error('Error fetching integration:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const requestApiKey = async () => {
    if (!confirm('Request a new API key for Zapier integration? An admin will need to approve this request.')) {
      return
    }

    try {
      const response = await fetch('/api/business/integrations/request-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'Zapier Integration'
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('API key request submitted! You will receive an email once approved.')
      }
    } catch (error) {
      alert('Failed to request API key')
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Zap className="w-6 h-6 text-purple-600" />
            Integrations
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your account with Zapier and other services
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'api'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              API Access
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'webhooks'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Webhooks
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'overview' && (
            <div>
              {/* Zapier Integration */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Zapier Integration
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    integration?.zapier?.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {integration?.zapier?.enabled ? 'Connected' : 'Not Connected'}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold mb-3">What is Zapier?</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Zapier lets you connect your lawn care business with 5,000+ apps to automate workflows.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>Auto-send quotes to your CRM</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>Create calendar events for services</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>Send SMS notifications to customers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>Update spreadsheets automatically</span>
                      </li>
                    </ul>
                  </div>

                  <div className="border border-purple-200 bg-purple-50 rounded-lg p-6">
                    <h3 className="font-semibold mb-3">Get Started</h3>
                    <ol className="text-sm space-y-3">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                          1
                        </span>
                        <div>
                          <p className="font-medium">Request API Key</p>
                          <p className="text-gray-600">Click the button below to request access</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                          2
                        </span>
                        <div>
                          <p className="font-medium">Connect on Zapier</p>
                          <p className="text-gray-600">Use our Zapier app to create zaps</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                          3
                        </span>
                        <div>
                          <p className="font-medium">Automate</p>
                          <p className="text-gray-600">Set up your automated workflows</p>
                        </div>
                      </li>
                    </ol>
                    
                    <div className="mt-6 space-y-3">
                      {!integration?.zapier?.enabled && (
                        <button
                          onClick={requestApiKey}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          Request API Key
                        </button>
                      )}
                      <a
                        href="https://zapier.com/apps/lawn-care/integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2 bg-white border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Zapier
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Available Triggers */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Available Triggers & Actions</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Triggers (When this happens...)</h4>
                    <div className="space-y-2">
                      {[
                        'New Quote Created',
                        'Quote Accepted',
                        'Measurement Completed',
                        'Customer Created',
                        'Service Scheduled'
                      ].map((trigger) => (
                        <div key={trigger} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-purple-600 rounded-full" />
                          <span>{trigger}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Actions (Do this...)</h4>
                    <div className="space-y-2">
                      {[
                        'Create Quote',
                        'Calculate Pricing',
                        'Get Measurement',
                        'Update Customer',
                        'Check Service Area'
                      ].map((action) => (
                        <div key={action} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-600 rounded-full" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">API Access</h2>
                <p className="text-gray-600">
                  Manage your API keys for external integrations
                </p>
              </div>

              {integration?.zapier?.enabled ? (
                <div>
                  {/* API Endpoint */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Endpoint
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                        https://api.lawntool.com/v1
                      </code>
                      <button
                        onClick={() => copyToClipboard('https://api.lawntool.com/v1', 'endpoint')}
                        className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                      >
                        {copiedText === 'endpoint' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* API Keys */}
                  <div>
                    <h3 className="font-semibold mb-3">Your API Keys</h3>
                    <div className="space-y-3">
                      {integration?.zapier?.apiKeys?.map((key: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <Key className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{key.name}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  key.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {key.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                  {key.key.substring(0, 20)}...
                                </code>
                                <button
                                  onClick={() => copyToClipboard(key.key, key.key)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  {copiedText === key.key ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Created: {new Date(key.createdAt).toLocaleDateString()}
                                {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Documentation */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <Info className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-sm text-blue-900">
                      View our complete API documentation for integration details.
                    </p>
                    <a
                      href="/api-docs"
                      target="_blank"
                      className="inline-flex items-center gap-2 mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      API Documentation
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    API Access Not Enabled
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Request an API key to start using external integrations
                  </p>
                  <button
                    onClick={requestApiKey}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Request API Access
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Webhooks</h2>
                <p className="text-gray-600">
                  Receive real-time notifications when events occur
                </p>
              </div>

              {integration?.zapier?.enabled ? (
                <div>
                  <div className="space-y-4">
                    {integration?.zapier?.webhooks?.map((webhook: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{webhook.name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${
                            webhook.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <code className="bg-gray-100 px-2 py-1 rounded">{webhook.url}</code>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {webhook.events.map((event: string) => (
                            <span key={event} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                              {event}
                            </span>
                          ))}
                        </div>
                        {webhook.lastTriggered && (
                          <div className="mt-2 text-xs text-gray-500">
                            Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {(!integration?.zapier?.webhooks || integration.zapier.webhooks.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No webhooks configured yet.</p>
                      <p className="text-sm mt-2">
                        Webhooks are automatically configured when you connect with Zapier.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Webhooks Not Available
                  </h3>
                  <p className="text-gray-600">
                    Enable API access to use webhooks
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}