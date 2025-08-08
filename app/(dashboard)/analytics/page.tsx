'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  CheckCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
  Activity,
  Target,
  MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AnalyticsData {
  overview: {
    totalMeasurements: number
    totalQuotes: number
    acceptedQuotes: number
    totalCustomers: number
    newCustomers: number
    totalRevenue: number
    avgQuoteValue: number
    conversionRate: number
  }
  summary:any;
  topServices: Array<{
    _id: string
    revenue: number
    count: number
  }>
  dailyRevenue?: Array<{
    _id: string
    revenue: number
    count: number
  }>
  customerGrowth?: Array<{
    _id: string
    newCustomers: number
  }>
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?period=${period}&type=${activeTab}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [period, activeTab])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const getChangeIndicator = (value: number, isPositive: boolean = true) => {
    const color = (value >= 0 && isPositive) || (value < 0 && !isPositive) 
      ? 'text-green-600' 
      : 'text-red-600'
    const Icon = value >= 0 ? ArrowUp : ArrowDown
    
    return (
      <span className={`flex items-center text-sm ${color}`}>
        <Icon className="h-4 w-4" />
        {Math.abs(value)}%
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track your business performance and insights
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex gap-2">
          {['overview', 'revenue', 'customers', 'performance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {analytics && (
        <>
          {activeTab === 'overview' && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Revenue"
                  value={formatCurrency(analytics.overview.totalRevenue)}
                  icon={DollarSign}
                  color="text-green-600"
                  bgColor="bg-green-100"
                />
                <MetricCard
                  title="Total Quotes"
                  value={formatNumber(analytics.overview.totalQuotes)}
                  icon={FileText}
                  color="text-blue-600"
                  bgColor="bg-blue-100"
                  subtext={`${analytics.overview.acceptedQuotes} accepted`}
                />
                <MetricCard
                  title="Conversion Rate"
                  value={`${analytics.overview.conversionRate}%`}
                  icon={Target}
                  color="text-purple-600"
                  bgColor="bg-purple-100"
                />
                <MetricCard
                  title="Total Customers"
                  value={formatNumber(analytics.overview.totalCustomers)}
                  icon={Users}
                  color="text-orange-600"
                  bgColor="bg-orange-100"
                  subtext={`+${analytics.overview.newCustomers} new`}
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Measurements</h3>
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold">{formatNumber(analytics.overview.totalMeasurements)}</p>
                  <p className="text-sm text-gray-600 mt-2">Properties measured</p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Avg Quote Value</h3>
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(analytics.overview.avgQuoteValue)}</p>
                  <p className="text-sm text-gray-600 mt-2">Per accepted quote</p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Success Rate</h3>
                    <CheckCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold">
                    {analytics.overview.totalQuotes > 0 
                      ? `${((analytics.overview.acceptedQuotes / analytics.overview.totalQuotes) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Quotes accepted</p>
                </div>
              </div>

              {/* Top Services */}
              {analytics.topServices.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Services</h3>
                  <div className="space-y-4">
                    {analytics.topServices.map((service:any, index:any) => (
                      <div key={service._id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-600 w-8">{index + 1}.</span>
                          <span className="font-medium">{service._id}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">{service.count} orders</span>
                          <span className="font-semibold">{formatCurrency(service.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'revenue' && analytics.dailyRevenue && (
            <>
              {/* Revenue Chart */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                <div className="h-64 flex items-end justify-between gap-2">
                  {analytics.dailyRevenue.map((day:any) => {
                    const maxRevenue = Math.max(...analytics?.dailyRevenue?.map((d:any) => d.revenue) ?? [])
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
                    
                    return (
                      <div
                        key={day._id}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-primary rounded-t hover:bg-primary/80 transition-colors relative group"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatCurrency(day.revenue)}
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 mt-2 rotate-45 origin-left">
                          {new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Revenue Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analytics.summary?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Avg Daily Revenue</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analytics.summary?.avgDailyRevenue || 0)}
                  </p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Total Transactions</h4>
                  <p className="text-2xl font-bold">
                    {formatNumber(analytics.summary?.totalTransactions || 0)}
                  </p>
                </div>
              </div>

              {/* Revenue by Service */}
              {analytics?.revenueByService && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue by Service</h3>
                  <div className="space-y-3">
                    {analytics.revenueByService.map((service: any) => (
                      <div key={service._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{service._id}</p>
                          <p className="text-sm text-gray-600">{service.count} sales • Avg: {formatCurrency(service.avgPrice)}</p>
                        </div>
                        <p className="text-lg font-semibold">{formatCurrency(service.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'customers' && analytics.customerGrowth && (
            <>
              {/* Customer Growth Chart */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Customer Acquisition</h3>
                <div className="h-64 flex items-end justify-between gap-2">
                  {analytics.customerGrowth.map((day:any) => {
                    const maxCustomers = Math.max(...analytics.customerGrowth.map((d:any) => d.newCustomers))
                    const height = maxCustomers > 0 ? (day.newCustomers / maxCustomers) * 100 : 0
                    
                    return (
                      <div
                        key={day._id}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.newCustomers}
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 mt-2 rotate-45 origin-left">
                          {new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Customer Metrics */}
              {analytics.customerLTV && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white shadow rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Avg Customer LTV</h4>
                    <p className="text-2xl font-bold">
                      {formatCurrency(analytics.customerLTV.avgLTV || 0)}
                    </p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Retention Rate</h4>
                    <p className="text-2xl font-bold">
                      {analytics.retentionRate || '0'}%
                    </p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Paying Customers</h4>
                    <p className="text-2xl font-bold">
                      {formatNumber(analytics.customerLTV.payingCustomers || 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Top Customers */}
              {analytics.topCustomers && analytics.topCustomers.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Customer</th>
                          <th className="text-right py-2">Quotes</th>
                          <th className="text-right py-2">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topCustomers.map((customer: any) => (
                          <tr key={customer._id} className="border-b">
                            <td className="py-2">
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-gray-600">{customer.email}</p>
                            </td>
                            <td className="text-right py-2">{customer.quoteCount}</td>
                            <td className="text-right py-2 font-semibold">
                              {formatCurrency(customer.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'performance' && (
            <>
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analytics.responseTime && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Avg Response Time</h4>
                    <p className="text-2xl font-bold">
                      {analytics.responseTime.avgResponseTime?.toFixed(1) || '0'} hrs
                    </p>
                  </div>
                )}
                
                {analytics.conversionFunnel && (
                  <>
                    <div className="bg-white shadow rounded-lg p-6">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Measurement → Quote</h4>
                      <p className="text-2xl font-bold">
                        {analytics.conversionFunnel.totalMeasurements > 0
                          ? `${((analytics.conversionFunnel.measurementsWithQuotes / analytics.conversionFunnel.totalMeasurements) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                    <div className="bg-white shadow rounded-lg p-6">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Quote → Sale</h4>
                      <p className="text-2xl font-bold">
                        {analytics.conversionFunnel.measurementsWithQuotes > 0
                          ? `${((analytics.conversionFunnel.measurementsWithAcceptedQuotes / analytics.conversionFunnel.measurementsWithQuotes) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Service Areas */}
              {analytics.serviceAreas && analytics.serviceAreas.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Service Areas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.serviceAreas.map((area: any) => (
                      <div key={area._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="font-medium">Area {area._id || 'Unknown'}</p>
                            <p className="text-sm text-gray-600">{area.count} measurements</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{formatNumber(area.totalArea)} sq ft</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Rules Performance */}
              {analytics.pricingRuleStats && analytics.pricingRuleStats.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Pricing Rules Performance</h3>
                  <div className="space-y-3">
                    {analytics.pricingRuleStats.map((rule: any) => (
                      <div key={rule._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-gray-600">Type: {rule.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{rule.appliedCount} uses</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor, 
  subtext 
}: { 
  title: string
  value: string | number
  icon: any
  color: string
  bgColor: string
  subtext?: string
}) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtext && (
            <p className="text-sm text-gray-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  )
}