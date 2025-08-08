'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Tag,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'

interface QuoteDetails {
  _id: string
  quoteNumber: string
  status: string
  customerId: {
    name: string
    email: string
    phone?: string
  }
  measurementId: {
    address: string
    measurements: {
      totalArea: number
      lawn: {
        total: number
      }
      driveway: number
      sidewalk: number
    }
  }
  services: Array<{
    name: string
    description: string
    area: number
    pricePerUnit: number
    totalPrice: number
  }>
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  validUntil: string
  createdAt: string
  sentAt?: string
  viewedAt?: string
  respondedAt?: string
  metadata?: {
    appliedRules?: Array<{
      ruleId: string
      ruleName: string
      ruleType: string
      adjustment: number
    }>
    originalPrices?: Array<{
      name: string
      originalPrice: number
      originalTotal: number
    }>
    pricingContext?: {
      zipCode?: string
      customerTags?: string[]
      totalArea?: number
    }
  }
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-500'
}

export default function QuoteDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [quote, setQuote] = useState<QuoteDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuote()
  }, [params.id])

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setQuote(data)
      } else {
        toast.error('Quote not found')
        router.push('/quotes')
      }
    } catch (error) {
      console.error('Failed to fetch quote:', error)
      toast.error('Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast.success('Quote status updated')
        fetchQuote()
      } else {
        toast.error('Failed to update quote')
      }
    } catch (error) {
      console.error('Failed to update quote:', error)
      toast.error('Failed to update quote')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quote?')) return
    
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Quote deleted')
        router.push('/quotes')
      } else {
        toast.error('Only draft quotes can be deleted')
      }
    } catch (error) {
      console.error('Failed to delete quote:', error)
      toast.error('Failed to delete quote')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!quote) return null

  const isExpired = new Date(quote.validUntil) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/quotes"
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900 mr-3">
                  {quote.quoteNumber}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[quote.status as keyof typeof statusColors]}`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
                {isExpired && quote.status !== 'accepted' && quote.status !== 'rejected' && (
                  <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    Expired
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Created on {new Date(quote.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {quote.status === 'draft' && (
              <>
                <Link
                  href={`/quotes/${quote._id}/edit`}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Edit className="h-5 w-5 mr-2" />
                  Edit
                </Link>
                <button
                  onClick={() => handleStatusUpdate('sent')}
                  className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Send
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Delete
                </button>
              </>
            )}
            
            {(quote.status === 'sent' || quote.status === 'viewed') && (
              <>
                <button
                  onClick={() => handleStatusUpdate('accepted')}
                  className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Accept
                </button>
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject
                </button>
              </>
            )}
            
            <button
              onClick={() => toast.loading('PDF export coming soon!')}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Download className="h-5 w-5 mr-2" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{quote.customerId.name}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{quote.customerId.email}</p>
                </div>
              </div>
              {quote.customerId.phone && (
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{quote.customerId.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Property Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h2>
            <div className="flex items-start mb-4">
              <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <p className="font-medium">{quote.measurementId.address}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Total Area: {quote.measurementId.measurements.totalArea.toLocaleString()} sq ft
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Lawn</p>
                <p className="font-medium">{quote.measurementId.measurements.lawn.total.toLocaleString()} sq ft</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Driveway</p>
                <p className="font-medium">{quote.measurementId.measurements.driveway.toLocaleString()} sq ft</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Sidewalk</p>
                <p className="font-medium">{quote.measurementId.measurements.sidewalk.toLocaleString()} sq ft</p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
            <div className="space-y-4">
              {quote.services.map((service, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                      )}
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>{service.area.toLocaleString()} sq ft</span>
                        <span className="mx-2">×</span>
                        <span>${service.pricePerUnit.toFixed(3)}/sq ft</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-lg font-semibold">${service.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applied Pricing Rules */}
          {quote.metadata?.appliedRules && quote.metadata.appliedRules.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <Tag className="inline h-5 w-5 mr-2" />
                Applied Pricing Rules
              </h2>
              
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      {quote.metadata.appliedRules.length} pricing rule(s) were applied to this quote
                    </p>
                    {quote.metadata.pricingContext && (
                      <div className="mt-2 text-xs text-green-700">
                        <span>Context: </span>
                        {quote.metadata.pricingContext.zipCode && (
                          <span>ZIP: {quote.metadata.pricingContext.zipCode} • </span>
                        )}
                        {quote.metadata.pricingContext.customerTags && quote.metadata.pricingContext.customerTags.length > 0 && (
                          <span>Tags: {quote.metadata.pricingContext.customerTags.join(', ')} • </span>
                        )}
                        <span>Area: {quote.metadata.pricingContext.totalArea} sq ft</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {quote.metadata.appliedRules.map((rule, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rule.ruleName}</p>
                      <p className="text-xs text-gray-600">Type: {rule.ruleType}</p>
                    </div>
                    <span className={`text-sm font-bold ${
                      rule.adjustment > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {rule.adjustment > 0 ? '+' : ''}${rule.adjustment.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {quote.metadata.originalPrices && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Original Prices (before rules):</p>
                  <div className="space-y-1">
                    {quote.metadata.originalPrices.map((price, index) => (
                      <div key={index} className="flex justify-between text-xs text-gray-600">
                        <span>{price.name}</span>
                        <span>${price.originalTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${quote.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax {quote.subtotal > 0 ? `(${((quote.tax / quote.subtotal) * 100).toFixed(1)}%)` : ''}:</span>
                <span className="font-medium">${quote.tax.toFixed(2)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-${quote.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-semibold text-primary">
                    ${quote.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <div>
                  <p className="text-gray-500">Valid Until</p>
                  <p className="font-medium">{new Date(quote.validUntil).toLocaleDateString()}</p>
                </div>
              </div>
              
              {quote.sentAt && (
                <div className="flex items-center">
                  <Send className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-medium">{new Date(quote.sentAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              
              {quote.viewedAt && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-gray-500">Viewed</p>
                    <p className="font-medium">{new Date(quote.viewedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              
              {quote.respondedAt && (
                <div className="flex items-center">
                  {quote.status === 'accepted' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  <div>
                    <p className="text-gray-500">
                      {quote.status === 'accepted' ? 'Accepted' : 'Rejected'}
                    </p>
                    <p className="font-medium">{new Date(quote.respondedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}