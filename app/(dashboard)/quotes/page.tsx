'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Send,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Quote {
  _id: string
  quoteNumber: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'
  customerId: {
    name: string
    email: string
    phone?: string
  }
  measurementId: {
    address: string
    measurements: {
      totalArea: number
    }
  }
  total: number
  createdAt: string
  validUntil: string
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-500'
}

const statusIcons = {
  draft: Edit,
  sent: Send,
  viewed: Eye,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: Clock
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
      } else {
        toast.error('Failed to load quotes')
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customerId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.measurementId.address.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast.success('Quote status updated')
        fetchQuotes()
      } else {
        toast.error('Failed to update quote')
      }
    } catch (error) {
      console.error('Failed to update quote:', error)
      toast.error('Failed to update quote')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and track your property service quotes
            </p>
          </div>
          <Link
            href="/quotes/new"
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Quote
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search quotes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={() => toast.loading('Export coming soon!')}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredQuotes.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredQuotes.map((quote) => {
              const StatusIcon = statusIcons[quote.status]
              const isExpired = new Date(quote.validUntil) < new Date()
              
              return (
                <div key={quote._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-900 mr-3">
                          {quote.quoteNumber}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[quote.status]}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                        {isExpired && quote.status !== 'accepted' && quote.status !== 'rejected' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Expired
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="font-medium text-gray-900">{quote.customerId.name}</p>
                            <p className="text-gray-500">{quote.customerId.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-900">{quote.measurementId.address}</p>
                            <p className="text-gray-500">
                              {quote.measurementId.measurements.totalArea.toLocaleString()} sq ft
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="font-medium text-gray-900">
                              ${quote.total.toFixed(2)}
                            </p>
                            <p className="text-gray-500">Total</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-gray-900">
                              {new Date(quote.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-gray-500">
                              Valid until {new Date(quote.validUntil).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex items-center space-x-2">
                      <Link
                        href={`/quotes/${quote._id}`}
                        className="p-2 text-gray-400 hover:text-primary"
                        title="View Quote"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      
                      {quote.status === 'draft' && (
                        <>
                          <Link
                            href={`/quotes/${quote._id}/edit`}
                            className="p-2 text-gray-400 hover:text-primary"
                            title="Edit Quote"
                          >
                            <Edit className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleStatusUpdate(quote._id, 'sent')}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="Send Quote"
                          >
                            <Send className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      
                      {quote.status === 'sent' && (
                        <button
                          onClick={() => handleStatusUpdate(quote._id, 'viewed')}
                          className="p-2 text-gray-400 hover:text-yellow-600"
                          title="Mark as Viewed"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                      
                      {(quote.status === 'sent' || quote.status === 'viewed') && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(quote._id, 'accepted')}
                            className="p-2 text-gray-400 hover:text-green-600"
                            title="Mark as Accepted"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(quote._id, 'rejected')}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Mark as Rejected"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No quotes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'No quotes found matching your criteria.' 
                : 'Get started by creating your first quote.'}
            </p>
            <div className="mt-6">
              <Link
                href="/quotes/new"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Quote
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}