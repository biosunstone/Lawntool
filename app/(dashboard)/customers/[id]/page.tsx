'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  User, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Ruler,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Save,
  X,
  Plus,
  Tag
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CustomerDetail {
  _id: string
  name: string
  email: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    zip: string
  }
  status: 'active' | 'inactive' | 'archived'
  tags: string[]
  notes?: string
  metadata?: {
    source?: string
    referral?: string
    customFields?: Record<string, any>
  }
  quotes: any[]
  measurements: any[]
  stats: {
    totalQuotes: number
    acceptedQuotes: number
    totalMeasurements: number
    totalSpent: number
    averageQuoteValue: number
  }
  createdAt: string
  updatedAt: string
}

export default function CustomerDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (params.id) {
      fetchCustomer()
    }
  }, [params.id])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch customer')
      
      const data = await response.json()
      setCustomer(data)
      setEditForm({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        address: data.address || { street: '', city: '', state: '', zip: '' },
        tags: data.tags.join(', '),
        notes: data.notes || '',
        status: data.status
      })
    } catch (error) {
      console.error('Error fetching customer:', error)
      toast.error('Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          tags: editForm.tags ? editForm.tags.split(',').map((t: string) => t.trim()) : []
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update customer')
      }

      toast.success('Customer updated successfully')
      setEditing(false)
      fetchCustomer()
    } catch (error: any) {
      console.error('Error updating customer:', error)
      toast.error(error.message || 'Failed to update customer')
    }
  }

  const getStatusBadge = (status: string) => {
    if (!status) {
      status = 'active' // Default to active if status is undefined
    }
    
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      archived: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles] || styles.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getQuoteStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Customer not found</p>
        <Link href="/customers" className="text-primary hover:underline mt-4 inline-block">
          Back to Customers
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <Link 
            href="/customers" 
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Customers
          </Link>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditForm({
                      name: customer.name,
                      email: customer.email,
                      phone: customer.phone || '',
                      address: customer.address || { street: '', city: '', state: '', zip: '' },
                      tags: customer.tags.join(', '),
                      notes: customer.notes || '',
                      status: customer.status
                    })
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary flex items-center"
              >
                <Edit className="h-5 w-5 mr-2" />
                Edit Customer
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 rounded-full p-3">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              {editing ? (
                <input
                  type="text"
                  className="text-2xl font-bold mb-2 px-3 py-1 border rounded-lg"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {editing ? (
                    <input
                      type="email"
                      className="px-2 py-1 border rounded"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    />
                  ) : (
                    customer.email
                  )}
                </div>
                {(customer.phone || editing) && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {editing ? (
                      <input
                        type="tel"
                        className="px-2 py-1 border rounded"
                        placeholder="Phone number"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      />
                    ) : (
                      customer.phone
                    )}
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {new Date(customer.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          <div>
            {editing ? (
              <select
                className="px-3 py-1 border rounded-lg"
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              getStatusBadge(customer.status)
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4">
          {editing ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="residential, premium, etc"
                value={editForm.tags}
                onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
              />
            </div>
          ) : (
            customer.tags.length > 0 && (
              <div className="flex gap-2">
                {customer.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full flex items-center">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Quotes</p>
              <p className="text-2xl font-bold">{customer.stats.totalQuotes}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold">{customer.stats.acceptedQuotes}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Measurements</p>
              <p className="text-2xl font-bold">{customer.stats.totalMeasurements}</p>
            </div>
            <Ruler className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold">${customer.stats.totalSpent.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Quote</p>
              <p className="text-2xl font-bold">${Math.round(customer.stats.averageQuoteValue).toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['overview', 'quotes', 'measurements', 'notes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{customer.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {customer.address && (customer.address.street || customer.address.city) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Street address"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={editForm.address.street}
                          onChange={(e) => setEditForm({...editForm, address: {...editForm.address, street: e.target.value}})}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="City"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={editForm.address.city}
                          onChange={(e) => setEditForm({...editForm, address: {...editForm.address, city: e.target.value}})}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="State"
                          className="w-20 px-3 py-2 border rounded-lg"
                          value={editForm.address.state}
                          onChange={(e) => setEditForm({...editForm, address: {...editForm.address, state: e.target.value}})}
                        />
                        <input
                          type="text"
                          placeholder="ZIP"
                          className="flex-1 px-3 py-2 border rounded-lg"
                          value={editForm.address.zip}
                          onChange={(e) => setEditForm({...editForm, address: {...editForm.address, zip: e.target.value}})}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p>{customer.address.street}</p>
                        <p>{customer.address.city}{customer.address.state && `, ${customer.address.state}`} {customer.address.zip}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {customer.metadata && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {customer.metadata.source && (
                      <div>
                        <p className="text-sm text-gray-600">Source</p>
                        <p className="font-medium">{customer.metadata.source}</p>
                      </div>
                    )}
                    {customer.metadata.referral && (
                      <div>
                        <p className="text-sm text-gray-600">Referral</p>
                        <p className="font-medium">{customer.metadata.referral}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Recent Quotes</h3>
                <Link href={`/quotes/new?customerId=${customer._id}`} className="btn-primary text-sm flex items-center">
                  <Plus className="h-4 w-4 mr-1" />
                  New Quote
                </Link>
              </div>
              {customer.quotes.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No quotes yet</p>
              ) : (
                <div className="space-y-3">
                  {customer.quotes.map((quote) => (
                    <Link 
                      key={quote._id} 
                      href={`/quotes/${quote._id}`}
                      className="block border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Quote #{quote.quoteNumber}</p>
                            {getQuoteStatusIcon(quote.status)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {quote.measurementId?.address || 'No address'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">${quote.total.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'measurements' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Property Measurements</h3>
              {customer.measurements.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No measurements yet</p>
              ) : (
                <div className="space-y-3">
                  {customer.measurements.map((measurement) => (
                    <div key={measurement._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{measurement.address}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Total Area: {measurement.measurements?.totalArea?.toLocaleString() || 0} sq ft
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(measurement.createdAt).toLocaleDateString()}
                          </p>
                          <Link 
                            href={`/quotes/new?measurementId=${measurement._id}`}
                            className="text-primary hover:underline text-sm"
                          >
                            Create Quote
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              {editing ? (
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Add notes about this customer..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                />
              ) : (
                <div className="prose max-w-none">
                  {customer.notes ? (
                    <p className="whitespace-pre-wrap">{customer.notes}</p>
                  ) : (
                    <p className="text-gray-600 italic">No notes added yet</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}