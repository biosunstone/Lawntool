'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Shield, Save, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const PERMISSIONS = [
  {
    id: 'view_measurements',
    name: 'View Measurements',
    description: 'Can view all property measurements',
  },
  {
    id: 'create_measurements',
    name: 'Create Measurements',
    description: 'Can create new property measurements',
  },
  {
    id: 'manage_customers',
    name: 'Manage Customers',
    description: 'Can add, edit, and delete customers',
  },
  {
    id: 'create_quotes',
    name: 'Create Quotes',
    description: 'Can create and send quotes to customers',
  },
  {
    id: 'view_analytics',
    name: 'View Analytics',
    description: 'Can view business analytics and reports',
  },
  {
    id: 'manage_pricing',
    name: 'Manage Pricing',
    description: 'Can modify pricing rules and settings',
  },
  {
    id: 'manage_team',
    name: 'Manage Team',
    description: 'Can invite and manage team members',
  },
  {
    id: 'access_billing',
    name: 'Access Billing',
    description: 'Can view and manage billing information',
  },
]

interface TeamMember {
  _id: string
  name: string
  email: string
  role: string
  status: string
  permissions: string[]
  lastLogin?: string
  joinedAt: string
  loginCount: number
}

export default function TeamMemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const memberId = params.memberId as string

  const [member, setMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState('staff')
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    fetchMemberDetails()
  }, [memberId])

  const fetchMemberDetails = async () => {
    try {
      const res = await fetch(`/api/team/members/${memberId}`)
      if (res.ok) {
        const data = await res.json()
        setMember(data.member)
        setRole(data.member.role)
        setPermissions(data.member.permissions || [])
      } else {
        toast.error('Failed to load member details')
        router.push('/team')
      }
    } catch (error) {
      console.error('Error fetching member:', error)
      toast.error('Failed to load member details')
      router.push('/team')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permissionId: string) => {
    setPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleSave = async () => {
    if (permissions.length === 0) {
      toast.error('Please select at least one permission')
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          permissions,
        }),
      })

      if (res.ok) {
        toast.success('Member updated successfully')
        router.push('/team')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update member')
      }
    } catch (error) {
      console.error('Error updating member:', error)
      toast.error('Failed to update member')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Member not found</h3>
        <div className="mt-6">
          <Link
            href="/team"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
          >
            Back to Team
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/team"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Team
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Team Member</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage role and permissions for {member.name}
        </p>
      </div>

      {/* Member Info */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white text-lg">
              {member.name[0]?.toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
            <p className="text-sm text-gray-500">{member.email}</p>
            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
              <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
              {member.lastLogin && (
                <span>Last login: {new Date(member.lastLogin).toLocaleDateString()}</span>
              )}
              <span>{member.loginCount} logins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="radio"
                name="role"
                value="staff"
                checked={role === 'staff'}
                onChange={(e) => setRole(e.target.value)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
            </div>
            <div className="ml-3">
              <label className="font-medium text-gray-900">Staff Member</label>
              <p className="text-sm text-gray-500">Limited access for daily operations</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="radio"
                name="role"
                value="business_owner"
                checked={role === 'business_owner'}
                onChange={(e) => setRole(e.target.value)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
            </div>
            <div className="ml-3">
              <label className="font-medium text-gray-900">Business Owner</label>
              <p className="text-sm text-gray-500">Full access to all features</p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
        <div className="space-y-3">
          {PERMISSIONS.map((permission) => (
            <div key={permission.id} className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id={permission.id}
                  checked={permissions.includes(permission.id)}
                  onChange={() => handlePermissionToggle(permission.id)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor={permission.id} className="font-medium text-gray-900">
                  {permission.name}
                </label>
                <p className="text-sm text-gray-500">{permission.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Link
          href="/team"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}