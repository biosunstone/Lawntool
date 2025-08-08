'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  UserX,
  Building,
  FileText,
  TrendingUp,
  Settings,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  adminCount: number
  businessOwnerCount: number
  staffCount: number
  customerCount: number
}

interface RecentUser {
  _id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [systemSettings, setSystemSettings] = useState<any>(null)

  useEffect(() => {
    // Check if user is admin
    if (session?.user && (session.user as any).role !== 'admin') {
      router.push('/dashboard')
      return
    }
    
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch user stats
      const usersResponse = await fetch('/api/admin/users?limit=5&sortBy=createdAt&sortOrder=desc')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setStats(usersData.stats)
        setRecentUsers(usersData.users)
      }

      // Fetch system settings
      const settingsResponse = await fetch('/api/admin/settings')
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSystemSettings(settingsData.settings)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/users'
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      color: 'bg-green-500',
      link: '/admin/users?status=active'
    },
    {
      title: 'Suspended Users',
      value: stats?.suspendedUsers || 0,
      icon: UserX,
      color: 'bg-red-500',
      link: '/admin/users?status=suspended'
    },
    {
      title: 'Businesses',
      value: stats?.businessOwnerCount || 0,
      icon: Building,
      color: 'bg-purple-500',
      link: '/admin/users?role=business_owner'
    }
  ]

  const roleDistribution = [
    { role: 'Admin', count: stats?.adminCount || 0, color: 'bg-red-500' },
    { role: 'Business Owner', count: stats?.businessOwnerCount || 0, color: 'bg-purple-500' },
    { role: 'Staff', count: stats?.staffCount || 0, color: 'bg-yellow-500' },
    { role: 'Customer', count: stats?.customerCount || 0, color: 'bg-green-500' }
  ]

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      link: '/admin/users',
      color: 'text-blue-600'
    },
    {
      title: 'Tax Settings',
      description: 'Configure tax rates for businesses',
      icon: DollarSign,
      link: '/admin/tax-settings',
      color: 'text-green-600'
    },
    {
      title: 'System Settings',
      description: 'Configure global system settings',
      icon: Settings,
      link: '/admin/settings',
      color: 'text-purple-600'
    },
    {
      title: 'Activity Logs',
      description: 'View system activity and audit logs',
      icon: Activity,
      link: '/admin/logs',
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          System overview and administration tools
        </p>
      </div>

      {/* System Status */}
      {systemSettings?.maintenanceMode && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Maintenance Mode Active:</strong> {systemSettings.maintenanceMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            href={stat.link}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.link}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start">
                    <action.icon className={`h-6 w-6 ${action.color} mt-1`} />
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Roles</h2>
          <div className="space-y-3">
            {roleDistribution.map((item) => (
              <div key={item.role}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.role}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full`}
                    style={{
                      width: `${(item.count / (stats?.totalUsers || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
          <Link
            href="/admin/users"
            className="text-sm text-primary hover:text-primary-dark"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-gray-600">
              Registration: {systemSettings?.allowNewRegistrations ? 'Open' : 'Closed'}
            </span>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-gray-600">
              Default Tax: {((systemSettings?.defaultTaxRate || 0.08) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center">
            <Users className="h-5 w-5 text-purple-500 mr-2" />
            <span className="text-gray-600">
              Max Users/Business: {systemSettings?.maxUsersPerBusiness || 10}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}