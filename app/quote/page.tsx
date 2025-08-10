/**
 * Quote Request Page
 * Allows users to request quotes with property measurement
 */

'use client'

import { useState } from 'react'
import QuoteForm from '@/components/quote/QuoteForm'
import { MapPin, CheckCircle, FileText, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function QuotePage() {
  const [submitted, setSubmitted] = useState(false)
  const [quoteData, setQuoteData] = useState<any>(null)
  const router = useRouter()

  const handleQuoteSubmit = (data: any) => {
    setQuoteData(data)
    setSubmitted(true)
    
    // Redirect to thank you page after a short delay
    setTimeout(() => {
      router.push('/quote/thank-you')
    }, 3000)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Quote Request Submitted!
              </h1>
              
              <p className="text-lg text-gray-600 mb-6">
                Thank you for your interest! We've received your property measurements
                and will send you a detailed quote shortly.
              </p>
              
              <div className="bg-green-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Check your email</p>
                      <p className="text-sm text-gray-600">
                        We've sent your property measurements to {quoteData?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Review your quote</p>
                      <p className="text-sm text-gray-600">
                        Our team will prepare a detailed quote within 24 hours
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                Redirecting to confirmation page...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Get Your Free Lawn Care Quote
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We'll measure your property using satellite imagery and provide
              an accurate quote based on your actual lawn size
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-600">2,500+</div>
                <p className="text-gray-600">Happy Customers</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">98%</div>
                <p className="text-gray-600">Satisfaction Rate</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">24hr</div>
                <p className="text-gray-600">Quote Turnaround</p>
              </div>
            </div>
          </div>

          {/* Quote Form */}
          <QuoteForm onSubmit={handleQuoteSubmit} showMap={true} autoSave={true} />

          {/* FAQ Section */}
          <div className="mt-12 bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  How accurate are the measurements?
                </h3>
                <p className="text-gray-600">
                  Our satellite measurement technology is 95% accurate. You can also
                  manually adjust the boundaries on the map for perfect precision.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  What services do you offer?
                </h3>
                <p className="text-gray-600">
                  We provide lawn mowing, fertilization, weed control, pest control,
                  and driveway cleaning services. Each service is priced based on
                  your actual property measurements.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  How long does it take to get a quote?
                </h3>
                <p className="text-gray-600">
                  You'll receive an instant estimate with your property measurements
                  via email. Our team will follow up with a detailed quote within
                  24 hours.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Is there any obligation?
                </h3>
                <p className="text-gray-600">
                  No! Our quotes are completely free with no obligation. You can
                  review the pricing and decide if our services are right for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}