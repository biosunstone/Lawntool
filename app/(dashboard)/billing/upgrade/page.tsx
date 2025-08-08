'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: {
      measurementQuota: 10,
      teamMembers: 1,
      apiAccess: false,
      whiteLabel: false,
      customBranding: false,
      advancedReporting: false,
      support: 'Community',
    },
    highlights: ['10 measurements/month', '1 team member', 'Basic features'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Great for small businesses',
    features: {
      measurementQuota: 100,
      teamMembers: 3,
      apiAccess: false,
      whiteLabel: false,
      customBranding: true,
      advancedReporting: false,
      support: 'Email',
    },
    highlights: ['100 measurements/month', '3 team members', 'Custom branding', 'Email support'],
    popular: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149,
    description: 'For growing teams',
    features: {
      measurementQuota: 500,
      teamMembers: 10,
      apiAccess: true,
      whiteLabel: false,
      customBranding: true,
      advancedReporting: true,
      support: 'Priority',
    },
    highlights: ['500 measurements/month', '10 team members', 'API access', 'Advanced analytics', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    description: 'For large organizations',
    features: {
      measurementQuota: -1,
      teamMembers: -1,
      apiAccess: true,
      whiteLabel: true,
      customBranding: true,
      advancedReporting: true,
      support: 'Dedicated',
    },
    highlights: ['Unlimited measurements', 'Unlimited team members', 'White label', 'Dedicated support', 'Custom integrations'],
  },
]

const ALL_FEATURES = [
  { key: 'measurementQuota', label: 'Monthly Measurements', format: (val: any) => val === -1 ? 'Unlimited' : val.toString() },
  { key: 'teamMembers', label: 'Team Members', format: (val: any) => val === -1 ? 'Unlimited' : val.toString() },
  { key: 'apiAccess', label: 'API Access', format: (val: any) => val },
  { key: 'whiteLabel', label: 'White Label', format: (val: any) => val },
  { key: 'customBranding', label: 'Custom Branding', format: (val: any) => val },
  { key: 'advancedReporting', label: 'Advanced Analytics', format: (val: any) => val },
  { key: 'support', label: 'Support Level', format: (val: any) => val },
]

export default function UpgradePage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentPlan()
  }, [])

  const fetchCurrentPlan = async () => {
    try {
      const res = await fetch('/api/billing/subscription')
      if (res.ok) {
        const data = await res.json()
        setCurrentPlan(data.subscription?.plan || 'free')
      }
    } catch (error) {
      console.error('Error fetching current plan:', error)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) {
      toast.error('You are already on this plan')
      return
    }

    setSelectedPlan(planId)
    setLoading(true)

    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planId }),
      })

      const data = await res.json()

      if (res.ok) {
        if (data.checkoutUrl) {
          // Redirect to Stripe checkout
          window.location.href = data.checkoutUrl
        } else {
          toast.success('Plan updated successfully')
          router.push('/billing')
        }
      } else {
        toast.error(data.error || 'Failed to update plan')
      }
    } catch (error) {
      console.error('Error upgrading plan:', error)
      toast.error('Failed to update plan')
    } finally {
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/billing"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Billing
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select the plan that best fits your business needs
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow-lg overflow-hidden ${
              plan.popular ? 'ring-2 ring-primary' : ''
            }`}
          >
            {plan.popular && (
              <div className="bg-primary text-white text-center text-sm font-medium py-1">
                Most Popular
              </div>
            )}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500">/month</span>
              </div>

              {/* Highlights */}
              <ul className="mt-6 space-y-3">
                {plan.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading || plan.id === currentPlan}
                className={`mt-6 w-full py-2 px-4 rounded-md font-medium transition-colors ${
                  plan.id === currentPlan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {loading && selectedPlan === plan.id ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Processing...
                  </span>
                ) : plan.id === currentPlan ? (
                  'Current Plan'
                ) : plan.price === 0 ? (
                  'Downgrade'
                ) : (
                  'Upgrade'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Feature Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                {PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ALL_FEATURES.map((feature) => (
                <tr key={feature.key}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {feature.label}
                  </td>
                  {PLANS.map((plan) => {
                    const value = plan.features[feature.key as keyof typeof plan.features]
                    const formatted = typeof value !== 'undefined' ? feature.format(value as any) : '-'
                    
                    return (
                      <td key={plan.id} className="px-6 py-4 whitespace-nowrap text-center">
                        {typeof formatted === 'boolean' ? (
                          formatted ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-gray-900">{formatted}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          All plans include secure data storage, regular backups, and 99.9% uptime SLA.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Need a custom plan?{' '}
          <a href="mailto:sales@sunstonedigital.com" className="text-primary hover:text-primary-dark">
            Contact our sales team
          </a>
        </p>
      </div>
    </div>
  )
}