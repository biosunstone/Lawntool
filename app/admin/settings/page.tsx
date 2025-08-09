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
  Shield
} from 'lucide-react'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string>('')

  const categories = [
    {
      id: 'zipcode-pricing',
      title: 'ZIP/Postal Code Pricing',
      description: 'Manage ZIP code and postal code based pricing rules',
      icon: MapPin,
      color: 'bg-blue-500',
      stats: {
        label: 'Active Rules',
        value: '50,000+'
      },
      features: [
        'US ZIP code coverage',
        'Canadian postal code coverage',
        'Region-based pricing rules',
        'Custom surcharges/discounts'
      ],
      actions: [
        {
          label: 'Manage Pricing Rules',
          path: '/admin/zipcode-pricing'
        },
        {
          label: 'View Analytics',
          path: '/admin/zipcode-pricing/analytics'
        }
      ]
    },
    {
      id: 'geofencing',
      title: 'Geofencing & Drive Time Zones',
      description: 'Configure service zones based on drive time from shop locations',
      icon: Clock,
      color: 'bg-green-500',
      stats: {
        label: 'Active Zones',
        value: '2 Zones'
      },
      features: [
        'Drive time based zones',
        'Service availability rules',
        'Zone-based surcharges',
        'Shop location management'
      ],
      actions: [
        {
          label: 'Configure Zones',
          path: '/admin/pricing-management'
        },
        {
          label: 'Service Rules',
          path: '/admin/service-rules'
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Zapier Integration',
      description: 'Manage API keys and webhooks for Zapier automation',
      icon: Zap,
      color: 'bg-purple-500',
      stats: {
        label: 'API Calls',
        value: '10.2k/month'
      },
      features: [
        'API key management',
        'Webhook configuration',
        'Rate limiting',
        'Usage monitoring'
      ],
      actions: [
        {
          label: 'Manage Integrations',
          path: '/admin/integrations'
        },
        {
          label: 'API Documentation',
          path: '/admin/api-docs'
        }
      ]
    }
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
                  Admin Settings & Configuration
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage all pricing systems, zones, and integrations from one place
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Businesses</p>
                  <p className="text-2xl font-bold text-gray-900">21</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total API Keys</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <Key className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Zones</p>
                <p className="text-2xl font-bold text-gray-900">42</p>
              </div>
              <Globe className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Price Rules</p>
                <p className="text-2xl font-bold text-gray-900">156</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">API Usage</p>
                <p className="text-2xl font-bold text-gray-900">89%</p>
              </div>
              <BarChart className="w-8 h-8 text-orange-500" />
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
          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold">Security Settings</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Require API authentication</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Enable rate limiting</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">IP whitelist enforcement</span>
                <input type="checkbox" className="rounded" />
              </label>
            </div>
          </div>

          {/* Database Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold">Database & Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Cache TTL</span>
                <span className="text-sm font-medium">15 minutes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">API Response Cache</span>
                <span className="text-sm font-medium text-green-600">Enabled</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Database Pool Size</span>
                <span className="text-sm font-medium">10 connections</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}