'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  MapPin, 
  DollarSign, 
  Zap, 
  ChevronRight,
  Database,
  Globe,
  Clock,
  Key,
  BarChart,
  Shield,
  Info
} from 'lucide-react'

export default function BusinessOwnerSettingsPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string>('')

  const categories = [
    {
      id: 'zipcode-pricing',
      title: 'ZIP/Postal Code Pricing',
      description: 'Configure location-based pricing for your service areas',
      icon: MapPin,
      color: 'bg-blue-500',
      stats: {
        label: 'Custom Rules',
        value: '5'
      },
      features: [
        'Set default base pricing',
        'Configure price per square foot',
        'Add location-specific surcharges',
        'Apply discounts for certain areas'
      ],
      actions: [
        {
          label: 'Configure Pricing',
          path: '/dashboard/business-owner/zipcode-pricing'
        }
      ]
    },
    {
      id: 'geofencing',
      title: 'Geofencing & Service Zones',
      description: 'Manage your service areas and drive time zones',
      icon: Clock,
      color: 'bg-green-500',
      stats: {
        label: 'Active Zones',
        value: '2'
      },
      features: [
        'Define service boundaries',
        'Set zone-based pricing',
        'Configure availability rules',
        'Manage shop locations'
      ],
      actions: [
        {
          label: 'Manage Zones',
          path: '/dashboard/business-owner/pricing-config'
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Zapier Integration',
      description: 'Connect your business with thousands of apps via Zapier',
      icon: Zap,
      color: 'bg-purple-500',
      stats: {
        label: 'API Keys',
        value: '2 Active'
      },
      features: [
        'Generate API keys',
        'Configure webhooks',
        'Monitor API usage',
        'Automate workflows'
      ],
      actions: [
        {
          label: 'Manage Integration',
          path: '/dashboard/business-owner/integrations'
        }
      ]
    }
  ]

  const quickStats = [
    { label: 'Monthly API Calls', value: '1,245', icon: Key, color: 'text-purple-500' },
    { label: 'Service Areas', value: '3', icon: Globe, color: 'text-green-500' },
    { label: 'Price Rules Active', value: '12', icon: DollarSign, color: 'text-blue-500' },
    { label: 'Automation Runs', value: '89', icon: Zap, color: 'text-orange-500' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Settings className="w-8 h-8 text-gray-600" />
                  Business Settings & Configuration
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your pricing, service zones, and integrations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Welcome to your Business Settings</h3>
              <p className="text-sm text-blue-800 mt-1">
                Configure your pricing rules, service zones, and integrations to optimize your business operations. 
                All changes are applied in real-time to your customer-facing tools.
              </p>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Category Header */}
                <div className={`${category.color} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="w-10 h-10" />
                    <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                      {category.stats.label}: {category.stats.value}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-2">{category.title}</h2>
                  <p className="text-white/90 text-sm">{category.description}</p>
                </div>

                {/* Features */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Features</h3>
                  <ul className="space-y-2 mb-6">
                    {category.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Actions */}
                  <div className="space-y-2">
                    {category.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => router.push(action.path)}
                        className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                          index === 0
                            ? `${category.color} text-white hover:opacity-90`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Additional Settings */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API Access */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold">API Access</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Active API Keys</span>
                <span className="text-sm font-medium">2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Monthly Usage</span>
                <span className="text-sm font-medium">1,245 / 10,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Rate Limit</span>
                <span className="text-sm font-medium">1000/hour</span>
              </div>
            </div>
            <button 
              onClick={() => router.push('/dashboard/business-owner/integrations')}
              className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Manage API Keys →
            </button>
          </div>

          {/* Service Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Service Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Pricing Engine</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Geofencing</span>
                <span className="text-sm font-medium text-green-600">Enabled</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Zapier Integration</span>
                <span className="text-sm font-medium text-green-600">Connected</span>
              </div>
            </div>
            <button 
              onClick={() => router.push('/dashboard/business-owner/status')}
              className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              View Full Status →
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            Our support team is here to help you configure your business settings and get the most out of our platform.
          </p>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50">
              View Documentation
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}