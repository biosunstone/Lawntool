'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Mail, Shield, Info } from 'lucide-react'
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

const ROLE_PRESETS = {
  business_owner: {
    name: 'Business Owner',
    description: 'Full access to all features',
    permissions: PERMISSIONS.map((p) => p.id),
  },
  staff: {
    name: 'Staff Member',
    description: 'Limited access for daily operations',
    permissions: [
      'view_measurements',
      'create_measurements',
      'manage_customers',
      'create_quotes',
      'view_analytics',
    ],
  },
}

export default function InviteTeamMemberPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'staff',
    permissions: ROLE_PRESETS.staff.permissions,
    sendEmail: true,
  })

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role,
      permissions: ROLE_PRESETS[role as keyof typeof ROLE_PRESETS].permissions,
    })
  }

  const handlePermissionToggle = (permissionId: string) => {
    const newPermissions = formData.permissions.includes(permissionId)
      ? formData.permissions.filter((p) => p !== permissionId)
      : [...formData.permissions, permissionId]

    setFormData({
      ...formData,
      permissions: newPermissions,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email) {
      toast.error('Please enter an email address')
      return
    }

    if (formData.permissions.length === 0) {
      toast.error('Please select at least one permission')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Invitation sent successfully!')
        router.push('/team')
      } else {
        toast.error(data.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation')
    } finally {
      setLoading(false)
    }
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
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Invite Team Member</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send an invitation to add a new member to your team
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1 relative">
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="colleague@example.com"
                required
              />
              <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Send Email Option */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendEmail"
              checked={formData.sendEmail}
              onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-900">
              Send invitation email
            </label>
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Role</h3>
          <div className="space-y-3">
            {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
              <div key={key} className="relative">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.role === key
                      ? 'border-primary bg-primary bg-opacity-5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRoleChange(key)}
                >
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="role"
                        value={key}
                        checked={formData.role === key}
                        onChange={() => handleRoleChange(key)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                    </div>
                    <div className="ml-3">
                      <label className="font-medium text-gray-900">{preset.name}</label>
                      <p className="text-sm text-gray-500">{preset.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
            <div className="flex items-center text-sm text-gray-500">
              <Info className="h-4 w-4 mr-1" />
              Customize permissions for this team member
            </div>
          </div>
          <div className="space-y-3">
            {PERMISSIONS.map((permission) => (
              <div key={permission.id} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id={permission.id}
                    checked={formData.permissions.includes(permission.id)}
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
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}