'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      measurementQuota: 10,
      teamMembers: 1,
      apiAccess: false,
      whiteLabel: false,
      customBranding: false,
      advancedReporting: false,
    },
  },
  starter: {
    name: 'Starter',
    price: 49,
    features: {
      measurementQuota: 100,
      teamMembers: 3,
      apiAccess: false,
      whiteLabel: false,
      customBranding: true,
      advancedReporting: false,
    },
  },
  professional: {
    name: 'Professional',
    price: 149,
    features: {
      measurementQuota: 500,
      teamMembers: 10,
      apiAccess: true,
      whiteLabel: false,
      customBranding: true,
      advancedReporting: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    features: {
      measurementQuota: -1, // Unlimited
      teamMembers: -1, // Unlimited
      apiAccess: true,
      whiteLabel: true,
      customBranding: true,
      advancedReporting: true,
    },
  },
}

interface Subscription {
  plan: string
  status: string
  currentPeriodEnd?: string
  measurementQuota: number
  measurementsUsed: number
  features: {
    teamMembers: number
    apiAccess: boolean
    whiteLabel: boolean
    customBranding: boolean
    advancedReporting: boolean
  }
}

interface Invoice {
  _id: string
  amount: number
  status: string
  created: string
  invoicePdf?: string
}

export default function BillingPage() {
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      setLoading(true)

      // Fetch subscription
      const subRes = await fetch('/api/billing/subscription')
      if (subRes.ok) {
        const data = await subRes.json()
        setSubscription(data.subscription)
      }

      // Fetch recent invoices
      const invoicesRes = await fetch('/api/billing/invoices?limit=5')
      if (invoicesRes.ok) {
        const data = await invoicesRes.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }

    setCancelLoading(true)

    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
      })

      if (res.ok) {
        toast.success('Subscription cancelled successfully')
        fetchBillingData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      toast.error('Failed to cancel subscription')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleResumeSubscription = async () => {
    try {
      const res = await fetch('/api/billing/resume', {
        method: 'POST',
      })

      if (res.ok) {
        toast.success('Subscription resumed successfully')
        fetchBillingData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to resume subscription')
      }
    } catch (error) {
      toast.error('Failed to resume subscription')
    }
  }

  const openCustomerPortal = async () => {
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      } else {
        toast.error('Failed to open billing portal')
      }
    } catch (error) {
      toast.error('Failed to open billing portal')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getUsagePercentage = () => {
    if (!subscription || subscription.measurementQuota === -1) return 0
    return Math.round((subscription.measurementsUsed / subscription.measurementQuota) * 100)
  }

  const getUsageColor = () => {
    const percentage = getUsagePercentage()
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const currentPlan = subscription ? PLANS[subscription.plan as keyof typeof PLANS] : PLANS.free

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your subscription and billing information
          </p>
        </div>
        <button
          onClick={openCustomerPortal}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Billing Portal
        </button>
      </div>

      {/* Current Plan */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Current Plan</h2>
          {subscription?.status === 'canceled' && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
              Cancelling
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan Details */}
          <div>
            <p className="text-sm text-gray-500">Plan</p>
            <p className="text-2xl font-bold text-gray-900">{currentPlan.name}</p>
            <p className="text-sm text-gray-500">
              ${currentPlan.price}/month
            </p>
          </div>

          {/* Billing Period */}
          {subscription?.currentPeriodEnd && (
            <div>
              <p className="text-sm text-gray-500">
                {subscription.status === 'canceled' ? 'Access until' : 'Next billing date'}
              </p>
              <p className="text-lg font-medium text-gray-900">
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            {subscription?.plan !== 'free' && (
              <>
                {subscription?.status === 'canceled' ? (
                  <button
                    onClick={handleResumeSubscription}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resume Subscription
                  </button>
                ) : (
                  <>
                    <Link
                      href="/billing/upgrade"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                    >
                      Upgrade Plan
                    </Link>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      {cancelLoading ? 'Cancelling...' : 'Cancel Plan'}
                    </button>
                  </>
                )}
              </>
            )}
            {subscription?.plan === 'free' && (
              <Link
                href="/billing/upgrade"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage This Month</h2>
        
        <div className="space-y-4">
          {/* Measurements Usage */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Measurements</span>
              <span className="font-medium">
                {subscription?.measurementsUsed || 0}
                {subscription?.measurementQuota !== -1 && (
                  <span className="text-gray-500"> / {subscription?.measurementQuota}</span>
                )}
                {subscription?.measurementQuota === -1 && (
                  <span className="text-gray-500"> (Unlimited)</span>
                )}
              </span>
            </div>
            {subscription?.measurementQuota !== -1 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    getUsagePercentage() >= 90 ? 'bg-red-600' :
                    getUsagePercentage() >= 70 ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Team Members */}
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Team Members</span>
              <span className="font-medium">
                {subscription?.features?.teamMembers === -1 ? 'Unlimited' : `Up to ${subscription?.features?.teamMembers || 1}`}
              </span>
            </div>
          </div>
        </div>

        {getUsagePercentage() >= 80 && subscription?.measurementQuota !== -1 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  You've used {getUsagePercentage()}% of your monthly measurement quota.{' '}
                  <Link href="/billing/upgrade" className="font-medium underline">
                    Upgrade your plan
                  </Link>{' '}
                  for more measurements.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Plan Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            {subscription?.features?.apiAccess ? (
              <Check className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <X className="h-5 w-5 text-gray-300 mr-2" />
            )}
            <span className={subscription?.features?.apiAccess ? '' : 'text-gray-400'}>
              API Access
            </span>
          </div>
          <div className="flex items-center">
            {subscription?.features?.whiteLabel ? (
              <Check className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <X className="h-5 w-5 text-gray-300 mr-2" />
            )}
            <span className={subscription?.features?.whiteLabel ? '' : 'text-gray-400'}>
              White Label
            </span>
          </div>
          <div className="flex items-center">
            {subscription?.features?.customBranding ? (
              <Check className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <X className="h-5 w-5 text-gray-300 mr-2" />
            )}
            <span className={subscription?.features?.customBranding ? '' : 'text-gray-400'}>
              Custom Branding
            </span>
          </div>
          <div className="flex items-center">
            {subscription?.features?.advancedReporting ? (
              <Check className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <X className="h-5 w-5 text-gray-300 mr-2" />
            )}
            <span className={subscription?.features?.advancedReporting ? '' : 'text-gray-400'}>
              Advanced Reporting
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link
            href="/billing/upgrade"
            className="text-sm text-primary hover:text-primary-dark font-medium"
          >
            Compare all plans →
          </Link>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Invoices</h2>
          <Link
            href="/billing/invoices"
            className="text-sm text-primary hover:text-primary-dark"
          >
            View all →
          </Link>
        </div>

        {invoices.length === 0 ? (
          <p className="text-sm text-gray-500">No invoices yet</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice._id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    ${(invoice.amount / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(invoice.created)}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status}
                  </span>
                  {invoice.invoicePdf && (
                    <a
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}