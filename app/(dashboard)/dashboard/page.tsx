'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Map,
  FileText,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowRight,
  Calendar,
  Clock,
  CheckCircle,
} from 'lucide-react'

interface DashboardStats {
  measurementsToday: number
  quotesThisMonth: number
  totalCustomers: number
  revenue: number
  recentActivity: Array<{
    id: string
    type: string
    description: string
    time: string
  }>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    measurementsToday: 0,
    quotesThisMonth: 0,
    totalCustomers: 0,
    revenue: 0,
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Measurements Today',
      value: stats.measurementsToday,
      icon: Map,
      color: 'bg-blue-500',
      href: '/measurements',
    },
    {
      name: 'Quotes This Month',
      value: stats.quotesThisMonth,
      icon: FileText,
      color: 'bg-green-500',
      href: '/quotes',
    },
    {
      name: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-purple-500',
      href: '/customers',
    },
    {
      name: 'Revenue (MTD)',
      value: `$${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      href: '/analytics',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {loading ? '-' : stat.value}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/measurements"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Map className="h-5 w-5 text-primary mr-3" />
                <span className="text-sm font-medium text-gray-900">New Measurement</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>
            <Link
              href="/quotes/new"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-primary mr-3" />
                <span className="text-sm font-medium text-gray-900">Create Quote</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>
            <Link
              href="/customers/new"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 text-primary mr-3" />
                <span className="text-sm font-medium text-gray-900">Add Customer</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start">
                  <div className="flex-shrink-0">
                    {activity.type === 'measurement' && (
                      <Map className="h-5 w-5 text-blue-500" />
                    )}
                    {activity.type === 'quote' && (
                      <FileText className="h-5 w-5 text-green-500" />
                    )}
                    {activity.type === 'customer' && (
                      <Users className="h-5 w-5 text-purple-500" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>

      {/* Getting Started Guide (for new users) */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">1. Complete Your Profile</p>
              <p className="text-sm opacity-90 mt-1">Add your business details and logo</p>
            </div>
          </div>
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">2. Set Your Pricing</p>
              <p className="text-sm opacity-90 mt-1">Configure your service rates</p>
            </div>
          </div>
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">3. Start Measuring</p>
              <p className="text-sm opacity-90 mt-1">Create your first measurement</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/settings"
            className="inline-flex items-center px-4 py-2 bg-white text-primary rounded-md hover:bg-gray-100 transition-colors"
          >
            Complete Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}