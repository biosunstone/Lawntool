/**
 * Quote Thank You Page
 * Displayed after successful quote submission
 */

'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Mail, Phone, Calendar, ArrowRight, Home, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function ThankYouPage() {
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    // Get email from localStorage if available
    const savedData = localStorage.getItem('quote_form_draft')
    if (savedData) {
      try {
        const data = JSON.parse(savedData)
        setEmail(data.email || '')
      } catch (e) {
        console.error('Error parsing saved data:', e)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Thank You for Your Quote Request!
              </h1>
              <p className="text-green-50 text-lg">
                We've received your property information
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Email Confirmation */}
              {email && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        Property measurements sent to:
                      </p>
                      <p className="text-gray-700">{email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* What's Next */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  What Happens Next?
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-semibold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Check Your Email</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        We've sent your property measurements and initial pricing estimate
                        to your email address.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-semibold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Review & Refinement</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Our team will review your property details and prepare a customized
                        service plan within 24 hours.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-semibold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Personal Consultation</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        A lawn care specialist will contact you to discuss your specific
                        needs and answer any questions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-semibold">4</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Schedule Service</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Once you approve the quote, we'll schedule your first service
                        at your convenience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Need Immediate Assistance?
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <a
                    href="tel:1-800-LAWN-CARE"
                    className="flex items-center gap-3 text-green-600 hover:text-green-700"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">1-800-LAWN-CARE</span>
                  </a>
                  <a
                    href="mailto:quotes@lawncare.com"
                    className="flex items-center gap-3 text-green-600 hover:text-green-700"
                  >
                    <Mail className="w-5 h-5" />
                    <span className="font-medium">quotes@lawncare.com</span>
                  </a>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  href="/quote"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  Request Another Quote
                </Link>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Return to Homepage
                </Link>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Why Choose Our Lawn Care Service?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-semibold text-gray-900">Precise Pricing</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Based on actual property measurements
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl mb-2">🌟</div>
                <h4 className="font-semibold text-gray-900">Professional Service</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Licensed and insured technicians
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl mb-2">✅</div>
                <h4 className="font-semibold text-gray-900">Satisfaction Guaranteed</h4>
                <p className="text-sm text-gray-600 mt-1">
                  100% satisfaction or your money back
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}