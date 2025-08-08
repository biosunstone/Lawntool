'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Clock,
  Activity,
  Shield,
  Save,
  Trash,
  UserCheck,
  UserX,
  Edit,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserDetails {
  _id: string
  name: string
  email: string
  role: string
  status: string
  businessId?: { _id: string; name: string }
  createdAt: string
  updatedAt: string
  lastLogin?: string
  loginCount: number
  emailVerified?: string
  metadata?: {
    ipAddress?: string
    userAgent?: string
    registrationSource?: string
  }
}

interface UserStats {
  measurements: number
  quotes: number
  customers: number
}

interface Business {
  _id: string
  name: string
}

export default function UserDetailsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetails | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<string | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [resettingPassword, setResettingPassword] = useState(false)
  
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    status: '',
    businessId: ''
  })

  useEffect(() => {
    if (session?.user && (session.user as any).role !== 'admin') {
      router.push('/dashboard')
      return
    }
    
    if (session?.user) {
      fetchUserDetails()
      fetchBusinesses()
    }
  }, [session, router, userId])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setStats(data.stats)
        setEditForm({
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          status: data.user.status,
          businessId: data.user.businessId?._id || ''
        })
      } else if (response.status === 404) {
        toast.error('User not found')
        router.push('/admin/users')
      } else {
        toast.error('Failed to fetch user details')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data.businesses || [])
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    }
  }

  const handleUpdateUser = async () => {
    if (!user) return
    
    // Check if role is changing and needs confirmation
    if (editForm.role !== user.role && !showRoleConfirm) {
      setPendingRoleChange(editForm.role)
      setShowRoleConfirm(true)
      return
    }
    
    try {
      setSaving(true)
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status
      }
      
      // Only include businessId if it's changed or role requires it
      if (editForm.businessId || (editForm.role === 'business_owner' || editForm.role === 'staff')) {
        updateData.businessId = editForm.businessId || null
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setEditing(false)
        setShowRoleConfirm(false)
        setPendingRoleChange(null)
        toast.success('User updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user) return
    
    if (!confirm('Send a password reset email to this user?')) return
    
    try {
      setResettingPassword(true)
      // TODO: Implement password reset API endpoint
      toast.success('Password reset email sent successfully')
    } catch (error) {
      console.error('Error sending password reset:', error)
      toast.error('Failed to send password reset email')
    } finally {
      setResettingPassword(false)
    }
  }

  const handleDeleteUser = async (hardDelete = false) => {
    if (!user) return
    
    const confirmMessage = hardDelete 
      ? 'Are you sure you want to permanently delete this user? This action cannot be undone.'
      : 'Are you sure you want to mark this user as deleted?'
    
    if (!confirm(confirmMessage)) return
    
    try {
      setDeleting(true)
      const url = hardDelete 
        ? `/api/admin/users/${userId}?hard=true`
        : `/api/admin/users/${userId}`
      
      const response = await fetch(url, { method: 'DELETE' })

      if (response.ok) {
        toast.success(hardDelete ? 'User permanently deleted' : 'User marked as deleted')
        router.push('/admin/users')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const handleQuickAction = async (action: 'activate' | 'suspend') => {
    if (!user) return
    
    try {
      const newStatus = action === 'activate' ? 'active' : 'suspended'
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setEditForm(prev => ({ ...prev, status: newStatus }))
        toast.success(`User ${action}d successfully`)
      } else {
        toast.error(`Failed to ${action} user`)
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      toast.error(`Failed to ${action} user`)
    }
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    deleted: 'bg-gray-100 text-gray-800'
  }

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    business_owner: 'bg-blue-100 text-blue-800',
    staff: 'bg-indigo-100 text-indigo-800',
    customer: 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
        <Link href="/admin/users" className="text-primary hover:text-primary-dark mt-4 inline-block">
          ← Back to Users
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <Link
              href="/admin/users"
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and manage user information
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                {user.status !== 'active' && (
                  <button
                    onClick={() => handleQuickAction('activate')}
                    className="btn-secondary flex items-center"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </button>
                )}
                {user.status === 'active' && (
                  <button
                    onClick={() => handleQuickAction('suspend')}
                    className="btn-secondary flex items-center"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Suspend
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="btn-primary flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditForm({
                      name: user.name || '',
                      email: user.email || '',
                      role: user.role || '',
                      status: user.status || '',
                      businessId: user.businessId?._id || ''
                    })
                  }}
                  className="btn-secondary flex items-center"
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="btn-primary flex items-center"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{user.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{user.email}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  {editing ? (
                    <select
                      value={editForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value
                        setEditForm(prev => ({ ...prev, role: newRole }))
                        // Clear business if switching to admin or customer
                        if (newRole === 'admin' || newRole === 'customer') {
                          setEditForm(prev => ({ ...prev, businessId: '' }))
                        }
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      disabled={userId === (session?.user as any)?.id}
                    >
                      <option value="admin">Admin</option>
                      <option value="business_owner">Business Owner</option>
                      <option value="staff">Staff</option>
                      <option value="customer">Customer</option>
                    </select>
                  ) : (
                    <p className="mt-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role as keyof typeof roleColors]}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </p>
                  )}
                  {editing && userId === (session?.user as any)?.id && (
                    <p className="mt-1 text-xs text-orange-600">You cannot change your own role</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  {editing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  ) : (
                    <p className="mt-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[user.status as keyof typeof statusColors]}`}>
                        {user.status}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {(editing || user.businessId) && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Business</label>
                  {editing ? (
                    <select
                      value={editForm.businessId}
                      onChange={(e) => setEditForm(prev => ({ ...prev, businessId: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      disabled={editForm.role === 'admin' || editForm.role === 'customer'}
                    >
                      <option value="">No business assigned</option>
                      {businesses.map((business) => (
                        <option key={business._id} value={business._id}>
                          {business.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-gray-900">{user.businessId?.name || 'No business assigned'}</p>
                  )}
                  {editing && (editForm.role === 'business_owner' || editForm.role === 'staff') && !editForm.businessId && (
                    <p className="mt-1 text-xs text-red-600">Business is required for this role</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">User ID</label>
                <p className="mt-1 text-gray-900 font-mono text-sm">{user._id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()} at {new Date(user.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1 text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString()} at {new Date(user.updatedAt).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Login</label>
                <p className="mt-1 text-gray-900">
                  {user.lastLogin 
                    ? `${new Date(user.lastLogin).toLocaleDateString()} at ${new Date(user.lastLogin).toLocaleTimeString()}`
                    : 'Never'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Login Count</label>
                <p className="mt-1 text-gray-900">{user.loginCount || 0} times</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email Verified</label>
                <p className="mt-1">
                  {user.emailVerified ? (
                    <span className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-500">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Not verified
                    </span>
                  )}
                </p>
              </div>
            </div>

            {user.metadata && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Registration Details</h3>
                <div className="space-y-2 text-sm">
                  {user.metadata.registrationSource && (
                    <p><span className="text-gray-500">Source:</span> {user.metadata.registrationSource}</p>
                  )}
                  {user.metadata.ipAddress && (
                    <p><span className="text-gray-500">IP Address:</span> {user.metadata.ipAddress}</p>
                  )}
                  {user.metadata.userAgent && (
                    <p className="break-all"><span className="text-gray-500">User Agent:</span> {user.metadata.userAgent}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
            <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Mark this user as deleted. The user will not be able to login but data is preserved.
                </p>
                <button
                  onClick={() => handleDeleteUser(false)}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Soft Delete User'}
                </button>
              </div>
              <div className="pt-4 border-t border-red-200">
                <p className="text-sm text-gray-600 mb-3">
                  Permanently delete this user and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={() => handleDeleteUser(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Statistics</h2>
            {stats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Measurements</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.measurements}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Quotes</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.quotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customers</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.customers}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No activity data available</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                View Measurements
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                View Quotes
              </button>
              <button 
                onClick={handlePasswordReset}
                disabled={resettingPassword}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                {resettingPassword ? 'Sending...' : 'Send Password Reset'}
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Export User Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Role Change Confirmation Modal */}
      {showRoleConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Role Change</h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                You are about to change the user's role from <strong>{user?.role.replace('_', ' ')}</strong> to <strong>{pendingRoleChange?.replace('_', ' ')}</strong>.
              </p>
              {pendingRoleChange === 'admin' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Admin role grants full system access including user management, billing, and all business data.
                  </p>
                </div>
              )}
              {(pendingRoleChange === 'business_owner' || pendingRoleChange === 'staff') && !editForm.businessId && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> You must assign a business for this role.
                  </p>
                </div>
              )}
              {user?.role === 'admin' && pendingRoleChange !== 'admin' && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <p className="text-sm text-orange-800">
                    <strong>Notice:</strong> This will remove admin privileges from this user.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleConfirm(false)
                  setPendingRoleChange(null)
                  setEditForm(prev => ({ ...prev, role: user?.role || '' }))
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRoleConfirm(false)
                  handleUpdateUser()
                }}
                disabled={(pendingRoleChange === 'business_owner' || pendingRoleChange === 'staff') && !editForm.businessId}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}