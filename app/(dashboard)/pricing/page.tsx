'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  DollarSign, 
  Plus, 
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Calendar,
  Users,
  Package,
  TrendingUp,
  Info,
  TestTube
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface PricingRule {
  _id: string
  name: string
  type: 'zone' | 'service' | 'customer' | 'volume'
  conditions: any
  pricing: {
    priceMultiplier?: number
    fixedPrices?: {
      lawnPerSqFt?: number
      drivewayPerSqFt?: number
      sidewalkPerSqFt?: number
    }
    minimumCharge?: number
    surcharge?: number
    discount?: {
      type: number
      percentage: boolean
    }
  }
  priority: number
  isActive: boolean
  description?: string
  appliedCount: number
  createdAt: string
}

export default function PricingRulesPage() {
  const { data: session } = useSession()
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewRuleModal, setShowNewRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    fetchRules()
  }, [filterType])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== 'all') {
        params.append('type', filterType)
      }

      const response = await fetch(`/api/pricing-rules?${params}`)
      if (!response.ok) throw new Error('Failed to fetch rules')
      
      const data = await response.json()
      setRules(data)
    } catch (error) {
      console.error('Error fetching rules:', error)
      toast.error('Failed to load pricing rules')
    } finally {
      setLoading(false)
    }
  }

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!response.ok) throw new Error('Failed to update rule')
      
      toast.success(`Rule ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchRules()
    } catch (error) {
      console.error('Error updating rule:', error)
      toast.error('Failed to update rule')
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return

    try {
      const response = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete rule')
      
      toast.success('Rule deleted successfully')
      fetchRules()
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error('Failed to delete rule')
    }
  }

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'zone': return <MapPin className="h-5 w-5" />
      case 'customer': return <Users className="h-5 w-5" />
      case 'service': return <Package className="h-5 w-5" />
      case 'volume': return <TrendingUp className="h-5 w-5" />
      default: return <DollarSign className="h-5 w-5" />
    }
  }

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'zone': return 'bg-blue-100 text-blue-800'
      case 'customer': return 'bg-purple-100 text-purple-800'
      case 'service': return 'bg-orange-100 text-orange-800'
      case 'volume': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatConditions = (rule: PricingRule) => {
    const conditions = []
    
    if (rule.conditions.zipCodes?.length) {
      conditions.push(`ZIP: ${rule.conditions.zipCodes.join(', ')}`)
    }
    if (rule.conditions.customerTags?.length) {
      conditions.push(`Tags: ${rule.conditions.customerTags.join(', ')}`)
    }
    if (rule.conditions.dateRange) {
      conditions.push(`${new Date(rule.conditions.dateRange.start).toLocaleDateString()} - ${new Date(rule.conditions.dateRange.end).toLocaleDateString()}`)
    }
    if (rule.conditions.minArea) {
      conditions.push(`Min area: ${rule.conditions.minArea.toLocaleString()} sq ft`)
    }
    if (rule.conditions.serviceTypes?.length) {
      conditions.push(`Services: ${rule.conditions.serviceTypes.join(', ')}`)
    }
    
    return conditions.join(' • ')
  }

  const formatPricing = (pricing: PricingRule['pricing']) => {
    const items = []
    
    if (pricing.priceMultiplier && pricing.priceMultiplier !== 1) {
      const percentage:any = ((pricing.priceMultiplier - 1) * 100).toFixed(0)
      items.push(`${percentage > 0 ? '+' : ''}${percentage}% adjustment`)
    }
    if (pricing.fixedPrices?.lawnPerSqFt) {
      items.push(`Lawn: $${pricing.fixedPrices.lawnPerSqFt}/sqft`)
    }
    if (pricing.minimumCharge) {
      items.push(`Min: $${pricing.minimumCharge}`)
    }
    if (pricing.surcharge) {
      items.push(`+$${pricing.surcharge} surcharge`)
    }
    
    return items.join(' • ') || 'Custom pricing'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create dynamic pricing rules based on zones, seasons, and customer segments
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/pricing/test"
              className="btn-secondary flex items-center"
            >
              <TestTube className="h-5 w-5 mr-2" />
              Test Rules
            </Link>
            <button
              onClick={() => setShowNewRuleModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Rule
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex gap-2">
          {['all', 'zone', 'customer', 'service', 'volume'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filterType === type
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Rules' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pricing rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pricing rules yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first pricing rule to automate your pricing strategy
            </p>
            <button
              onClick={() => setShowNewRuleModal(true)}
              className="btn-primary inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create First Rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${getRuleTypeColor(rule.type)}`}>
                      {getRuleIcon(rule.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getRuleTypeColor(rule.type)} mt-1`}>
                        {rule.type}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => toggleRuleStatus(rule._id, rule.isActive)}
                        className={`p-2 rounded-lg ${rule.isActive ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {rule.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                      </button>
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {rule.description && (
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Conditions: </span>
                      <span className="text-gray-600">{formatConditions(rule) || 'No conditions'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Pricing: </span>
                      <span className="text-gray-600">{formatPricing(rule.pricing)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Priority: {rule.priority}</span>
                    <span>•</span>
                    <span>Applied {rule.appliedCount} times</span>
                    <span>•</span>
                    <span>Created {new Date(rule.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New/Edit Rule Modal */}
      {(showNewRuleModal || editingRule) && (
        <PricingRuleModal
          rule={editingRule}
          onClose={() => {
            setShowNewRuleModal(false)
            setEditingRule(null)
          }}
          onSuccess={() => {
            setShowNewRuleModal(false)
            setEditingRule(null)
            fetchRules()
          }}
        />
      )}
    </div>
  )
}

function PricingRuleModal({ 
  rule, 
  onClose, 
  onSuccess 
}: { 
  rule?: PricingRule | null, 
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    type: rule?.type || 'zone',
    description: rule?.description || '',
    priority: rule?.priority || 0,
    isActive: rule?.isActive ?? true,
    conditions: {
      zipCodes: rule?.conditions?.zipCodes?.join(', ') || '',
      customerTags: rule?.conditions?.customerTags?.join(', ') || '',
      serviceTypes: rule?.conditions?.serviceTypes?.join(', ') || '',
      dateRange: {
        start: rule?.conditions?.dateRange?.start ? new Date(rule.conditions.dateRange.start).toISOString().split('T')[0] : '',
        end: rule?.conditions?.dateRange?.end ? new Date(rule.conditions.dateRange.end).toISOString().split('T')[0] : ''
      },
      minArea: rule?.conditions?.minArea || '',
      maxArea: rule?.conditions?.maxArea || ''
    },
    pricing: {
      priceMultiplier: rule?.pricing?.priceMultiplier || 1,
      fixedPrices: {
        lawnPerSqFt: rule?.pricing?.fixedPrices?.lawnPerSqFt || '',
        drivewayPerSqFt: rule?.pricing?.fixedPrices?.drivewayPerSqFt || '',
        sidewalkPerSqFt: rule?.pricing?.fixedPrices?.sidewalkPerSqFt || ''
      },
      minimumCharge: rule?.pricing?.minimumCharge || '',
      surcharge: rule?.pricing?.surcharge || ''
    }
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        conditions: {
          ...formData.conditions,
          zipCodes: formData.conditions.zipCodes ? formData.conditions.zipCodes.split(',').map((z:any) => z.trim()) : [],
          customerTags: formData.conditions.customerTags ? formData.conditions.customerTags.split(',').map((t:any) => t.trim()) : [],
          serviceTypes: formData.conditions.serviceTypes ? formData.conditions.serviceTypes.split(',').map((s:any) => s.trim()) : [],
          minArea: formData.conditions.minArea || undefined,
          maxArea: formData.conditions.maxArea || undefined,
          dateRange: (formData.conditions.dateRange.start && formData.conditions.dateRange.end) ? formData.conditions.dateRange : undefined
        },
        pricing: {
          ...formData.pricing,
          fixedPrices: {
            lawnPerSqFt: formData.pricing.fixedPrices.lawnPerSqFt || undefined,
            drivewayPerSqFt: formData.pricing.fixedPrices.drivewayPerSqFt || undefined,
            sidewalkPerSqFt: formData.pricing.fixedPrices.sidewalkPerSqFt || undefined
          },
          minimumCharge: formData.pricing.minimumCharge || undefined,
          surcharge: formData.pricing.surcharge || undefined
        }
      }

      const response = await fetch(
        rule ? `/api/pricing-rules/${rule._id}` : '/api/pricing-rules',
        {
          method: rule ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save rule')
      }

      toast.success(rule ? 'Rule updated successfully' : 'Rule created successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Error saving rule:', error)
      toast.error(error.message || 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {rule ? 'Edit Pricing Rule' : 'New Pricing Rule'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  disabled={!!rule}
                >
                  <option value="zone">Zone-based</option>
                  <option value="customer">Customer Segment</option>
                  <option value="service">Service Type</option>
                  <option value="volume">Volume-based</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (higher = applied first)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Conditions</h3>
            
            {formData.type === 'zone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP/Postal Codes (comma-separated)*
                </label>
                <input
                  type="text"
                  required
                  placeholder="12345, 67890, 11111"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.conditions.zipCodes}
                  onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, zipCodes: e.target.value}})}
                />
              </div>
            )}

            {formData.type === 'customer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Tags (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="premium, residential, commercial"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.conditions.customerTags}
                  onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, customerTags: e.target.value}})}
                />
              </div>
            )}

            {formData.type === 'service' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Types (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="lawn, driveway, sidewalk"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.conditions.serviceTypes}
                  onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, serviceTypes: e.target.value}})}
                />
              </div>
            )}

            {formData.type === 'volume' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Area (sq ft)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={formData.conditions.minArea}
                    onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, minArea: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Area (sq ft)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={formData.conditions.maxArea}
                    onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, maxArea: e.target.value}})}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Pricing Adjustments</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Multiplier (1 = no change, 1.2 = 20% increase)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                value={formData.pricing.priceMultiplier}
                onChange={(e) => setFormData({...formData, pricing: {...formData.pricing, priceMultiplier: parseFloat(e.target.value) || 1}})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lawn ($/sq ft)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.02"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.pricing.fixedPrices.lawnPerSqFt}
                  onChange={(e) => setFormData({...formData, pricing: {...formData.pricing, fixedPrices: {...formData.pricing.fixedPrices, lawnPerSqFt: e.target.value}}})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driveway ($/sq ft)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.03"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.pricing.fixedPrices.drivewayPerSqFt}
                  onChange={(e) => setFormData({...formData, pricing: {...formData.pricing, fixedPrices: {...formData.pricing.fixedPrices, drivewayPerSqFt: e.target.value}}})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sidewalk ($/sq ft)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.pricing.fixedPrices.sidewalkPerSqFt}
                  onChange={(e) => setFormData({...formData, pricing: {...formData.pricing, fixedPrices: {...formData.pricing.fixedPrices, sidewalkPerSqFt: e.target.value}}})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Charge ($)
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.pricing.minimumCharge}
                  onChange={(e) => setFormData({...formData, pricing: {...formData.pricing, minimumCharge: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surcharge ($)
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.pricing.surcharge}
                  onChange={(e) => setFormData({...formData, pricing: {...formData.pricing, surcharge: e.target.value}})}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}