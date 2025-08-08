'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function InvalidInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">
              This invitation link is invalid or has already been used.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              If you believe this is an error, please contact the person who sent you the invitation.
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