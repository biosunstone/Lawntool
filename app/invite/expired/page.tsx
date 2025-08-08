'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'

export default function ExpiredInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
            <p className="text-gray-600 mb-6">
              This invitation has expired. Team invitations are valid for 7 days.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please contact the person who sent you the invitation to request a new one.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}