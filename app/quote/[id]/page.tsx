'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Download,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface QuoteDetails {
  _id: string
  quoteNumber: string
  status: string
  services: Array<{
    name: string
    description?: string
    area: number
    pricePerUnit: number
    totalPrice: number
  }>
  subtotal: number
  tax: number
  discount: number
  total: number
  validUntil: string
  notes?: string
  customer: {
    name: string
    email: string
    phone?: string
  }
  business: {
    name: string
    email?: string
    phone?: string
    address?: {
      street: string
      city: string
      state: string
      zip: string
    }
  }
  measurement: {
    address: string
    totalArea: number
    lawn: number
    driveway: number
    sidewalk: number
  }
  createdAt: string
}

export default function PublicQuotePage() {
  const params = useParams()
  const quoteId = params.id as string
  const [quote, setQuote] = useState<QuoteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    fetchQuote()
  }, [quoteId])

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/public/quote/${quoteId}`)
      if (!response.ok) throw new Error('Quote not found')
      
      const data = await response.json()
      setQuote(data)
    } catch (error) {
      console.error('Error fetching quote:', error)
      toast.error('Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (accepted: boolean) => {
    setResponding(true)
    
    try {
      const response = await fetch(`/api/public/quote/${quoteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted })
      })

      if (!response.ok) throw new Error('Failed to submit response')
      
      toast.success(
        accepted 
          ? 'Quote accepted! We will contact you shortly.' 
          : 'Thank you for your response.'
      )
      
      // Update local status
      setQuote(prev => prev ? { ...prev, status: accepted ? 'accepted' : 'rejected' } : null)
    } catch (error) {
      console.error('Error responding to quote:', error)
      toast.error('Failed to submit response')
    } finally {
      setResponding(false)
    }
  }

  const getStatusIcon = () => {
    if (!quote) return null
    
    switch (quote.status) {
      case 'accepted':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />
    }
  }

  const getStatusText = () => {
    if (!quote) return ''
    
    switch (quote.status) {
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Declined'
      case 'sent':
        return 'Pending Review'
      default:
        return 'Draft'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Quote not found</h2>
          <p className="text-gray-600 mt-2">This quote may have been removed or the link is incorrect.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quote {quote.quoteNumber}</h1>
                <p className="text-sm text-gray-600">From {quote.business.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Created</p>
                <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Valid Until</p>
                <p className="font-medium">{new Date(quote.validUntil).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="font-medium text-lg">${quote.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{quote.customer.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{quote.customer.email}</p>
              </div>
            </div>
            {quote.customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{quote.customer.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Property Details</h2>
          <div className="flex items-start gap-2 mb-4">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Service Address</p>
              <p className="font-medium">{quote.measurement.address}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">Total Area</p>
              <p className="font-semibold">{quote.measurement.totalArea.toLocaleString()} sq ft</p>
            </div>
            {quote.measurement.lawn > 0 && (
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-gray-600">Lawn</p>
                <p className="font-semibold">{quote.measurement.lawn.toLocaleString()} sq ft</p>
              </div>
            )}
            {quote.measurement.driveway > 0 && (
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-gray-600">Driveway</p>
                <p className="font-semibold">{quote.measurement.driveway.toLocaleString()} sq ft</p>
              </div>
            )}
            {quote.measurement.sidewalk > 0 && (
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-xs text-gray-600">Sidewalk</p>
                <p className="font-semibold">{quote.measurement.sidewalk.toLocaleString()} sq ft</p>
              </div>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Services</h2>
          <div className="space-y-3">
            {quote.services.map((service, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      {service.area.toLocaleString()} sq ft × ${service.pricePerUnit.toFixed(3)}/sq ft
                    </p>
                  </div>
                  <p className="text-lg font-semibold">${service.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-6 border-t space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${quote.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">${quote.tax.toFixed(2)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-green-600">-${quote.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">${quote.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Additional Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Actions */}
        {quote.status === 'sent' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Would you like to proceed with this quote?</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleResponse(true)}
                disabled={responding}
                className="flex-1 btn-primary flex items-center justify-center"
              >
                {responding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Quote
                  </>
                )}
              </button>
              <button
                onClick={() => handleResponse(false)}
                disabled={responding}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <XCircle className="h-5 w-5 mr-2 inline" />
                Decline Quote
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              This quote is valid until {new Date(quote.validUntil).toLocaleDateString()}
            </p>
          </div>
        )}

        {quote.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-900">Quote Accepted</h3>
            <p className="text-green-700 mt-2">
              Thank you for accepting this quote. We will contact you shortly to schedule the service.
            </p>
          </div>
        )}

        {quote.status === 'rejected' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Quote Declined</h3>
            <p className="text-gray-600 mt-2">
              This quote has been declined. If you change your mind or would like a revised quote, please contact us.
            </p>
          </div>
        )}

        {/* Business Contact */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Questions? Contact {quote.business.name}</p>
          {quote.business.email && <p>Email: {quote.business.email}</p>}
          {quote.business.phone && <p>Phone: {quote.business.phone}</p>}
        </div>
      </div>
    </div>
  )
}