'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit,
  X,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface TeamMember {
  _id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin?: string
  joinedAt: string
  permissions?: string[]
}

interface TeamInvitation {
  _id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
  invitedBy: {
    name: string
  }
}

interface Subscription {
  plan: string
  features: {
    teamMembers: number
  }
}

export default function TeamPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      
      // Fetch team members
      const membersRes = await fetch('/api/team/members')
      if (membersRes.ok) {
        const data = await membersRes.json()
        setTeamMembers(data.members || [])
      }

      // Fetch invitations
      const invitesRes = await fetch('/api/team/invites')
      if (invitesRes.ok) {
        const data = await invitesRes.json()
        setInvitations(data.invitations || [])
      }

      // Fetch subscription for team limits
      const subRes = await fetch('/api/billing/subscription')
      if (subRes.ok) {
        const data = await subRes.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Error fetching team data:', error)
      toast.error('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Team member removed successfully')
        fetchTeamData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove team member')
      }
    } catch (error) {
      toast.error('Failed to remove team member')
    }
  }

  const handleCancelInvitation = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/team/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Invitation cancelled')
        fetchTeamData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      toast.error('Failed to cancel invitation')
    }
  }

  const handleResendInvitation = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/team/invites/${inviteId}/resend`, {
        method: 'POST',
      })

      if (res.ok) {
        toast.success('Invitation resent successfully')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to resend invitation')
      }
    } catch (error) {
      toast.error('Failed to resend invitation')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'business_owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'staff':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const teamLimit = subscription?.features?.teamMembers || 1
  const currentTeamSize = teamMembers.length
  const canInviteMore = teamLimit === -1 || currentTeamSize < teamLimit

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your team members and permissions
          </p>
        </div>
        <Link
          href="/team/invite"
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            canInviteMore
              ? 'bg-primary hover:bg-primary-dark'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          onClick={(e) => {
            if (!canInviteMore) {
              e.preventDefault()
              toast.error('Team member limit reached. Upgrade your plan to add more members.')
            }
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Link>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentTeamSize}
                {teamLimit !== -1 && (
                  <span className="text-sm text-gray-500 font-normal">
                    {' '}/ {teamLimit}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Mail className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending Invitations</p>
              <p className="text-2xl font-bold text-gray-900">
                {invitations.filter(i => i.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Your Role</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {(session?.user as any)?.role?.replace('_', ' ') || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Team Members ({teamMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Invitations ({invitations.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        {activeTab === 'members' ? (
          <div className="divide-y divide-gray-200">
            {teamMembers.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by inviting team members to collaborate.
                </p>
                <div className="mt-6">
                  <Link
                    href="/team/invite"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Link>
                </div>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div key={member._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                          {member.name[0]?.toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          {member.name}
                          {member._id === (session?.user as any)?._id && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        <div className="mt-1 flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                            {member.role.replace('_', ' ')}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(member.status)}`}>
                            {member.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            Joined {formatDate(member.joinedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/team/${member._id}`}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      {member._id !== (session?.user as any)?._id && (
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {invitations.length === 0 ? (
              <div className="p-6 text-center">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending invitations</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All invitations have been accepted or expired.
                </p>
              </div>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{invitation.email}</h3>
                      <div className="mt-1 flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                          {invitation.role.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(invitation.status)}`}>
                          {invitation.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          Invited by {invitation.invitedBy.name}
                        </span>
                        {invitation.status === 'pending' && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Expires {formatDate(invitation.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    {invitation.status === 'pending' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleResendInvitation(invitation._id)}
                          className="text-sm text-primary hover:text-primary-dark"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleCancelInvitation(invitation._id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Upgrade Notice */}
      {!canInviteMore && teamLimit !== -1 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Team member limit reached</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Your current plan allows up to {teamLimit} team members.{' '}
                <Link href="/billing" className="font-medium underline">
                  Upgrade your plan
                </Link>{' '}
                to add more team members.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}