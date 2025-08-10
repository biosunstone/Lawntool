'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, TrendingUp, Mail, Users, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface RecoveryStats {
  totalAbandoned: number
  totalRecovered: number
  conversionRate: number
  revenueRecovered: number
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  averageRecoveryTime: number
  topDiscountCodes: Array<{
    code: string
    uses: number
    revenue: number
  }>
  recoveryByDay: Array<{
    date: string
    abandoned: number
    recovered: number
  }>
}

export default function CartRecoveryDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<RecoveryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30) // days
  const [abandonmentThreshold, setAbandonmentThreshold] = useState(15) // minutes
  const [savingThreshold, setSavingThreshold] = useState(false)

  useEffect(() => {
    // Check if user is admin
    if (session && (session.user as any)?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/cart-recovery/stats?days=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        // Ensure data has default values for missing properties
        setStats({
          totalAbandoned: data.totalAbandoned || 0,
          totalRecovered: data.totalRecovered || 0,
          conversionRate: data.conversionRate || 0,
          revenueRecovered: data.revenueRecovered || 0,
          emailsSent: data.emailsSent || 0,
          emailsOpened: data.emailsOpened || 0,
          emailsClicked: data.emailsClicked || 0,
          averageRecoveryTime: data.averageRecoveryTime || 0,
          topDiscountCodes: data.topDiscountCodes || [],
          recoveryByDay: data.recoveryByDay || []
        })
      } else {
        console.error('Failed to fetch stats:', response.statusText)
        // Set default empty stats
        setStats({
          totalAbandoned: 0,
          totalRecovered: 0,
          conversionRate: 0,
          revenueRecovered: 0,
          emailsSent: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          averageRecoveryTime: 0,
          topDiscountCodes: [],
          recoveryByDay: []
        })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Set default empty stats on error
      setStats({
        totalAbandoned: 0,
        totalRecovered: 0,
        conversionRate: 0,
        revenueRecovered: 0,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        averageRecoveryTime: 0,
        topDiscountCodes: [],
        recoveryByDay: []
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAbandonmentThreshold = async () => {
    setSavingThreshold(true)
    try {
      const response = await fetch('/api/admin/settings/abandonment-threshold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: abandonmentThreshold })
      })
      
      if (response.ok) {
        alert('Abandonment threshold updated successfully')
      }
    } catch (error) {
      console.error('Failed to update threshold:', error)
      alert('Failed to update threshold')
    } finally {
      setSavingThreshold(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cart Recovery Dashboard</h1>
          <p className="text-gray-600 mt-1">Track abandoned cart recovery performance and conversion rates</p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Conversion Rate */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-green-600">
                {stats.conversionRate.toFixed(1)}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
            <p className="text-xs text-gray-400 mt-1">
              {stats.totalRecovered} of {stats.totalAbandoned} recovered
            </p>
          </div>

          {/* Revenue Recovered */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                ${stats.revenueRecovered.toFixed(0)}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Revenue Recovered</h3>
            <p className="text-xs text-gray-400 mt-1">From recovered carts</p>
          </div>

          {/* Emails Sent */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-purple-600">
                {stats.emailsSent}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Recovery Emails</h3>
            <p className="text-xs text-gray-400 mt-1">
              {stats.emailsSent > 0 ? ((stats.emailsClicked / stats.emailsSent) * 100).toFixed(1) : 0}% click rate
            </p>
          </div>

          {/* Average Recovery Time */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-yellow-600">
                {(stats.averageRecoveryTime / 60).toFixed(1)}h
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Avg Recovery Time</h3>
            <p className="text-xs text-gray-400 mt-1">After abandonment</p>
          </div>
        </div>

        {/* Recovery Chart */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Recovery Trend</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[600px] h-64 flex items-end gap-2">
              {stats.recoveryByDay.length > 0 ? stats.recoveryByDay.slice(-14).map((day, index) => {
                const maxValue = Math.max(...stats.recoveryByDay.map(d => d.abandoned), 1)
                const abandonedHeight = (day.abandoned / maxValue) * 100
                const recoveredHeight = (day.recovered / maxValue) * 100
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col gap-1">
                      <div
                        className="bg-red-200 rounded-t"
                        style={{ height: `${abandonedHeight}px` }}
                        title={`Abandoned: ${day.abandoned}`}
                      />
                      <div
                        className="bg-green-400 rounded-b"
                        style={{ height: `${recoveredHeight}px` }}
                        title={`Recovered: ${day.recovered}`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )
              }) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  No data available for the selected period
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>Abandoned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span>Recovered</span>
            </div>
          </div>
        </div>

        {/* Top Discount Codes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Top Performing Discount Codes</h2>
            <div className="space-y-3">
              {stats.topDiscountCodes.slice(0, 5).map((code, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-mono font-medium text-green-600">{code.code}</span>
                    <p className="text-xs text-gray-500 mt-1">{code.uses} uses</p>
                  </div>
                  <span className="font-semibold">${code.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Recovery Settings</h2>
            
            <div className="space-y-4">
              {/* Abandonment Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abandonment Time Threshold
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={abandonmentThreshold}
                    onChange={(e) => setAbandonmentThreshold(Number(e.target.value))}
                    min={5}
                    max={120}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="flex items-center px-3 text-gray-500">minutes</span>
                  <button
                    onClick={updateAbandonmentThreshold}
                    disabled={savingThreshold}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingThreshold ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Carts inactive for this duration will be marked as abandoned
                </p>
              </div>

              {/* Cron Status */}
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Recovery system active
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Checking for abandoned carts every 10 minutes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Performance */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Email Campaign Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-900">{stats.emailsSent}</div>
              <div className="text-sm text-gray-500 mt-1">Emails Sent</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {stats.emailsSent > 0 ? ((stats.emailsOpened / stats.emailsSent) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Open Rate</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {stats.emailsSent > 0 ? ((stats.emailsClicked / stats.emailsSent) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Click Rate</div>
            </div>
          </div>
        </div>
    </div>
  )
}