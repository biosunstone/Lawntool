'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { CheckCircle, Loader2, AlertCircle, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invitation {
  email: string
  role: string
  businessName: string
  invitedBy: string
  expiresAt: string
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchInvitation()
    } else {
      setError('No invitation token provided')
      setLoading(false)
    }
  }, [token])

  const fetchInvitation = async () => {
    try {
      const res = await fetch(`/api/team/invites/info/${token}`)
      
      if (res.ok) {
        const data = await res.json()
        setInvitation(data.invitation)
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid invitation')
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!token || !invitation) return

    setAccepting(true)

    try {
      // For existing users who are logged in
      if (session?.user?.email === invitation.email) {
        const res = await fetch(`/api/team/invites/accept/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: session.user.email
          }),
        })

        const data = await res.json()

        if (res.ok) {
          toast.success('Invitation accepted successfully!')
          
          // Sign out and sign back in to refresh the session with new business context
          toast.loading('Updating your access...')
          await signOut({ redirect: false })
          
          // Redirect to login to re-authenticate with new permissions
          setTimeout(() => {
            router.push(`/login?message=Please login again to access your new team&email=${invitation.email}`)
          }, 1000)
        } else {
          toast.error(data.error || 'Failed to accept invitation')
          setAccepting(false)
        }
      } else {
        // User needs to login or signup first
        toast.error('Please login with the invited email address')
        setAccepting(false)
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation')
      setAccepting(false)
    }
  }

  const handleDecline = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <Link
              href="/"
              className="mt-6 inline-block px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-4">
            <div className="flex items-center justify-center">
              <Users className="h-8 w-8 text-white mr-2" />
              <h1 className="text-xl font-bold text-white">Team Invitation</h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {invitation ? (
              <>
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    You've been invited!
                  </h2>
                  <p className="text-gray-600">
                    {invitation.invitedBy} has invited you to join
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mt-2">
                    {invitation.businessName}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Invitation Details</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Email:</dt>
                      <dd className="text-gray-900">{invitation.email}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Role:</dt>
                      <dd className="text-gray-900 capitalize">
                        {invitation.role.replace('_', ' ')}
                      </dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Expires:</dt>
                      <dd className="text-gray-900">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>

                {session?.user?.email === invitation.email ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleAccept}
                      disabled={accepting}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Accepting...
                        </>
                      ) : (
                        'Accept Invitation'
                      )}
                    </button>
                    <button
                      onClick={handleDecline}
                      disabled={accepting}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Decline
                    </button>
                  </div>
                ) : session?.user ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      This invitation is for <strong>{invitation.email}</strong>.
                      You are currently logged in as <strong>{session.user.email}</strong>.
                    </p>
                    <Link
                      href={`/login?invite=${token}&email=${invitation.email}`}
                      className="mt-3 block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                    >
                      Login with Correct Account
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 text-center">
                      To accept this invitation, please login or create an account.
                    </p>
                    <Link
                      href={`/login?invite=${token}&email=${invitation.email}`}
                      className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                    >
                      Login to Accept
                    </Link>
                    <Link
                      href={`/signup?invite=${token}&email=${invitation.email}`}
                      className="block w-full text-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Create Account
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No invitation details available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}