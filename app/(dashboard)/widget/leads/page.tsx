'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Users, Mail, Phone, MapPin, Calendar, 
  DollarSign, Tag, Clock, CheckCircle, 
  XCircle, AlertCircle, Download, Filter,
  Send, Eye, Star, MessageSquare, Search,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface WidgetLead {
  _id: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  address: string
  services: string[]
  totalAmount: number
  status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  lastActivity: string
  notes?: string
  quoteId?: string
  measurementId?: string
  source: string
  score: number
}

export default function WidgetLeadsPage() {
  const { data: session }: any = useSession()
  const router = useRouter()
  const [leads, setLeads] = useState<WidgetLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [filter])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      // In production, fetch from API
      // const response = await fetch(`/api/widget/leads?filter=${filter}`)
      // const data = await response.json()
      
      // Mock data for demonstration
      const mockLeads: WidgetLead[] = [
        {
          _id: '1',
          customerName: 'John Smith',
          customerEmail: 'john.smith@email.com',
          customerPhone: '(555) 123-4567',
          address: '123 Main St, Springfield, IL 62701',
          services: ['Lawn Care', 'Driveway Cleaning'],
          totalAmount: 485.00,
          status: 'new',
          priority: 'high',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          source: 'Widget',
          score: 85,
          notes: 'Interested in bi-weekly service'
        },
        {
          _id: '2',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah.j@email.com',
          customerPhone: '(555) 234-5678',
          address: '456 Oak Ave, Springfield, IL 62702',
          services: ['Lawn Care'],
          totalAmount: 250.00,
          status: 'contacted',
          priority: 'medium',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          lastActivity: new Date().toISOString(),
          source: 'Widget',
          score: 72,
          quoteId: 'Q-2024-001'
        },
        {
          _id: '3',
          customerName: 'Michael Davis',
          customerEmail: 'mdavis@email.com',
          address: '789 Elm St, Springfield, IL 62703',
          services: ['Gutter Cleaning', 'Lawn Care'],
          totalAmount: 380.00,
          status: 'quoted',
          priority: 'high',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          lastActivity: new Date(Date.now() - 3600000).toISOString(),
          source: 'Widget',
          score: 90,
          quoteId: 'Q-2024-002'
        },
        {
          _id: '4',
          customerName: 'Emily Wilson',
          customerEmail: 'emily.wilson@email.com',
          customerPhone: '(555) 345-6789',
          address: '321 Pine St, Springfield, IL 62704',
          services: ['Sidewalk Maintenance'],
          totalAmount: 125.00,
          status: 'won',
          priority: 'low',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          lastActivity: new Date(Date.now() - 86400000).toISOString(),
          source: 'Widget',
          score: 65
        },
        {
          _id: '5',
          customerName: 'Robert Brown',
          customerEmail: 'rbrown@email.com',
          address: '654 Maple Dr, Springfield, IL 62705',
          services: ['Lawn Care', 'Driveway Cleaning', 'Gutter Cleaning'],
          totalAmount: 750.00,
          status: 'new',
          priority: 'high',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          lastActivity: new Date(Date.now() - 1800000).toISOString(),
          source: 'Widget',
          score: 95,
          notes: 'Large property, potential for recurring service'
        }
      ]
      
      // Apply filter
      let filteredLeads = mockLeads
      if (filter !== 'all') {
        filteredLeads = mockLeads.filter(lead => lead.status === filter)
      }
      
      setLeads(filteredLeads)
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      // In production, update via API
      toast.success('Lead status updated')
      
      // Update local state
      setLeads(leads.map(lead => 
        lead._id === leadId ? { ...lead, status: newStatus as any } : lead
      ))
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedLeads.length === 0) {
      toast.error('No leads selected')
      return
    }
    
    try {
      switch (action) {
        case 'email':
          // Open email compose with selected leads
          toast.success(`Preparing email for ${selectedLeads.length} leads`)
          break
        case 'export':
          exportLeads(leads.filter(l => selectedLeads.includes(l._id)))
          break
        case 'delete':
          if (confirm(`Delete ${selectedLeads.length} leads?`)) {
            setLeads(leads.filter(l => !selectedLeads.includes(l._id)))
            toast.success('Leads deleted')
          }
          break
      }
      setSelectedLeads([])
      setShowBulkActions(false)
    } catch (error) {
      toast.error('Action failed')
    }
  }

  const exportLeads = (leadsToExport: WidgetLead[]) => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Address', 'Services', 'Amount', 'Status', 'Priority', 'Score', 'Date'],
      ...leadsToExport.map(lead => [
        lead.customerName,
        lead.customerEmail,
        lead.customerPhone || '',
        lead.address,
        lead.services.join('; '),
        lead.totalAmount,
        lead.status,
        lead.priority,
        lead.score,
        format(new Date(lead.createdAt), 'yyyy-MM-dd')
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `widget-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    
    toast.success('Leads exported successfully')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'quoted': return 'bg-purple-100 text-purple-800'
      case 'won': return 'bg-green-100 text-green-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'low': return <AlertCircle className="h-4 w-4 text-gray-400" />
      default: return null
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredLeads = leads.filter(lead => 
    lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Widget Leads</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and convert leads from your widget
            </p>
          </div>
          <button
            onClick={() => exportLeads(filteredLeads)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{leads.filter(l => l.status === 'new').length}</p>
              <p className="text-sm text-gray-600">New Leads</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{leads.filter(l => l.status === 'contacted').length}</p>
              <p className="text-sm text-gray-600">Contacted</p>
            </div>
            <MessageSquare className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{leads.filter(l => l.status === 'quoted').length}</p>
              <p className="text-sm text-gray-600">Quoted</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{leads.filter(l => l.status === 'won').length}</p>
              <p className="text-sm text-gray-600">Won</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                ${leads.reduce((sum, l) => sum + l.totalAmount, 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Pipeline Value</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="quoted">Quoted</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            
            {selectedLeads.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('email')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleBulkAction('export')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeads(filteredLeads.map(l => l._id))
                    } else {
                      setSelectedLeads([])
                    }
                  }}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Services
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLeads.map((lead) => (
              <tr key={lead._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedLeads.includes(lead._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeads([...selectedLeads, lead._id])
                      } else {
                        setSelectedLeads(selectedLeads.filter(id => id !== lead._id))
                      }
                    }}
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{lead.customerName}</p>
                      {getPriorityIcon(lead.priority)}
                    </div>
                    <p className="text-sm text-gray-500">{lead.customerEmail}</p>
                    {lead.customerPhone && (
                      <p className="text-sm text-gray-500">{lead.customerPhone}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {lead.address}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {lead.services.map((service, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    ${lead.totalAmount.toFixed(2)}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className={`text-2xl font-bold ${getScoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                    <Star className={`h-4 w-4 ml-1 ${getScoreColor(lead.score)}`} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="quoted">Quoted</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">
                    {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(lead.createdAt), 'h:mm a')}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/customers/${lead._id}`)}
                      className="text-gray-600 hover:text-gray-900"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => window.location.href = `mailto:${lead.customerEmail}`}
                      className="text-gray-600 hover:text-gray-900"
                      title="Send Email"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    {lead.quoteId && (
                      <button
                        onClick={() => router.push(`/quotes/${lead.quoteId}`)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View Quote"
                      >
                        <DollarSign className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No leads found</p>
          </div>
        )}
      </div>
    </div>
  )
}