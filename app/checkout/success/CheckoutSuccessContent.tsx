'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Home, Mail, Phone } from 'lucide-react'

export default function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const orderNumber: string | null = searchParams.get('order')

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-lg text-gray-600">
          Thank you for your order
        </p>
      </div>

      {/* Order Details */}
      {orderNumber && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Order Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-medium">{orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="text-green-600 font-medium">Confirmed</span>
            </div>
          </div>
        </div>
      )}

      {/* What's Next */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">What happens next?</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">1</span>
              </div>
            </div>
            <div>
              <h3 className="font-medium">Order Confirmation Email</h3>
              <p className="text-gray-600 text-sm">
                You'll receive an email confirmation with your order details shortly.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
            </div>
            <div>
              <h3 className="font-medium">Service Scheduling</h3>
              <p className="text-gray-600 text-sm">
                Our team will contact you within 24 hours to schedule your service.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">3</span>
              </div>
            </div>
            <div>
              <h3 className="font-medium">Service Delivery</h3>
              <p className="text-gray-600 text-sm">
                Our professional team will arrive at your property on the scheduled date.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-blue-50 rounded-lg p-6 mt-6">
        <h3 className="font-semibold mb-3">Need Help?</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-blue-600" />
            <span>Call us: 1-800-LAWN-CARE</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Email: support@lawncare.com</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link
          href="/"
          className="flex-1 bg-green-600 text-white text-center py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
        
        <Link
          href="/login"
          className="flex-1 bg-gray-100 text-gray-700 text-center py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          Create Account to Track Order
        </Link>
      </div>
    </div>
  )
}