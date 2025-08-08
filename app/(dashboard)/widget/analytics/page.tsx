'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BarChart3, TrendingUp, Users, DollarSign, 
  Eye, MousePointer, CheckCircle, XCircle,
  Calendar, Clock, Filter, Download,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'

interface AnalyticsData {
  overview: {
    totalViews: number
    totalClicks: number
    totalSubmissions: number
    conversionRate: number
    averageQuoteValue: number
    totalRevenue: number
  }
  trends: {
    viewsTrend: number
    clicksTrend: number
    conversionTrend: number
    revenueTrend: number
  }
  chartData: {
    date: string
    views: number
    clicks: number
    submissions: number
    revenue: number
  }[]
  topServices: {
    service: string
    count: number
    revenue: number
  }[]
  conversionFunnel: {
    stage: string
    count: number
    percentage: number
  }[]
  deviceBreakdown: {
    device: string
    count: number
    percentage: number
  }[]
  sourceBreakdown: {
    source: string
    count: number
    conversions: number
  }[]
}

export default function WidgetAnalyticsPage() {
  const { data: session }: any = useSession()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7days')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Mock data for demonstration
      const mockData: AnalyticsData = {
        overview: {
          totalViews: 1847,
          totalClicks: 423,
          totalSubmissions: 89,
          conversionRate: 21.04,
          averageQuoteValue: 285.50,
          totalRevenue: 25409.50
        },
        trends: {
          viewsTrend: 12.5,
          clicksTrend: 8.3,
          conversionTrend: 15.2,
          revenueTrend: 18.7
        },
        chartData: Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i)
          return {
            date: format(date, 'MMM dd'),
            views: Math.floor(Math.random() * 300) + 200,
            clicks: Math.floor(Math.random() * 80) + 40,
            submissions: Math.floor(Math.random() * 20) + 5,
            revenue: Math.floor(Math.random() * 5000) + 2000
          }
        }),
        topServices: [
          { service: 'Lawn Care', count: 45, revenue: 12750 },
          { service: 'Driveway Cleaning', count: 28, revenue: 8400 },
          { service: 'Gutter Cleaning', count: 12, revenue: 3600 },
          { service: 'Sidewalk Maintenance', count: 4, revenue: 659.50 }
        ],
        conversionFunnel: [
          { stage: 'Widget Loaded', count: 1847, percentage: 100 },
          { stage: 'Widget Opened', count: 423, percentage: 22.9 },
          { stage: 'Service Selected', count: 312, percentage: 16.9 },
          { stage: 'Address Entered', count: 189, percentage: 10.2 },
          { stage: 'Measurement Complete', count: 134, percentage: 7.3 },
          { stage: 'Contact Submitted', count: 89, percentage: 4.8 }
        ],
        deviceBreakdown: [
          { device: 'Desktop', count: 923, percentage: 50 },
          { device: 'Mobile', count: 739, percentage: 40 },
          { device: 'Tablet', count: 185, percentage: 10 }
        ],
        sourceBreakdown: [
          { source: 'Direct', count: 554, conversions: 28 },
          { source: 'Organic Search', count: 462, conversions: 31 },
          { source: 'Social Media', count: 369, conversions: 18 },
          { source: 'Email Campaign', count: 277, conversions: 8 },
          { source: 'Paid Ads', count: 185, conversions: 4 }
        ]
      }
      
      setAnalyticsData(mockData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportData = () => {
    if (!analyticsData) return
    
    // Create CSV content
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Views', analyticsData.overview.totalViews],
      ['Total Clicks', analyticsData.overview.totalClicks],
      ['Total Submissions', analyticsData.overview.totalSubmissions],
      ['Conversion Rate', `${analyticsData.overview.conversionRate}%`],
      ['Average Quote Value', `$${analyticsData.overview.averageQuoteValue}`],
      ['Total Revenue', `$${analyticsData.overview.totalRevenue}`]
    ].map(row => row.join(',')).join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `widget-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    
    toast.success('Analytics exported successfully')
  }

  const renderTrend = (value: number) => {
    if (value > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm font-medium">
          <ArrowUp className="h-4 w-4 mr-1" />
          {value}%
        </span>
      )
    } else if (value < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm font-medium">
          <ArrowDown className="h-4 w-4 mr-1" />
          {Math.abs(value)}%
        </span>
      )
    }
    return (
      <span className="flex items-center text-gray-500 text-sm font-medium">
        <Minus className="h-4 w-4 mr-1" />
        0%
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Widget Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track your widget performance and conversions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Eye className="h-8 w-8 text-blue-500" />
            {renderTrend(analyticsData.trends.viewsTrend)}
          </div>
          <p className="text-2xl font-bold">{analyticsData.overview.totalViews.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Views</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <MousePointer className="h-8 w-8 text-purple-500" />
            {renderTrend(analyticsData.trends.clicksTrend)}
          </div>
          <p className="text-2xl font-bold">{analyticsData.overview.totalClicks.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Widget Opens</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            {renderTrend(analyticsData.trends.conversionTrend)}
          </div>
          <p className="text-2xl font-bold">{analyticsData.overview.totalSubmissions}</p>
          <p className="text-sm text-gray-600">Submissions</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            {renderTrend(analyticsData.trends.conversionTrend)}
          </div>
          <p className="text-2xl font-bold">{analyticsData.overview.conversionRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Conversion Rate</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            {renderTrend(0)}
          </div>
          <p className="text-2xl font-bold">${analyticsData.overview.averageQuoteValue.toFixed(0)}</p>
          <p className="text-sm text-gray-600">Avg Quote</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 text-green-700" />
            {renderTrend(analyticsData.trends.revenueTrend)}
          </div>
          <p className="text-2xl font-bold">${(analyticsData.overview.totalRevenue / 1000).toFixed(1)}k</p>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
          <div className="space-y-3">
            {analyticsData.conversionFunnel.map((stage, index) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <span className="text-sm text-gray-600">
                    {stage.count} ({stage.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Services</h2>
          <div className="space-y-4">
            {analyticsData.topServices.map((service) => {
              const maxRevenue = Math.max(...analyticsData.topServices.map(s => s.revenue))
              const percentage = (service.revenue / maxRevenue) * 100
              
              return (
                <div key={service.service}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{service.service}</span>
                    <span className="text-sm text-gray-600">
                      {service.count} quotes • ${service.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Device and Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Device Breakdown</h2>
          <div className="space-y-3">
            {analyticsData.deviceBreakdown.map((device) => (
              <div key={device.device} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    device.device === 'Desktop' ? 'bg-blue-500' :
                    device.device === 'Mobile' ? 'bg-green-500' : 'bg-purple-500'
                  }`} />
                  <span className="text-sm font-medium">{device.device}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-4">{device.count} views</span>
                  <span className="text-sm font-medium">{device.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <div className="flex-1 bg-blue-500 h-2 rounded-l" style={{ width: '50%' }} />
              <div className="flex-1 bg-green-500 h-2" style={{ width: '40%' }} />
              <div className="flex-1 bg-purple-500 h-2 rounded-r" style={{ width: '10%' }} />
            </div>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Traffic Sources</h2>
          <div className="space-y-3">
            {analyticsData.sourceBreakdown.map((source) => {
              const conversionRate = ((source.conversions / source.count) * 100).toFixed(1)
              
              return (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{source.source}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{source.count} visits</span>
                    <span className="text-sm font-medium text-green-600">
                      {source.conversions} conv ({conversionRate}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Activity Over Time</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {analyticsData.chartData.map((day) => {
            const maxViews = Math.max(...analyticsData.chartData.map(d => d.views))
            const height = (day.views / maxViews) * 100
            
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t transition-all hover:opacity-80"
                     style={{ height: `${height}%` }}
                     title={`${day.views} views`}
                />
                <p className="text-xs text-gray-600 mt-2">{day.date}</p>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2" />
            <span className="text-sm text-gray-600">Views</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2" />
            <span className="text-sm text-gray-600">Clicks</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded mr-2" />
            <span className="text-sm text-gray-600">Submissions</span>
          </div>
        </div>
      </div>
    </div>
  )
}