'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Map, 
  Settings, 
  Database, 
  Users, 
  BarChart3, 
  Download,
  Upload,
  Trash2,
  Plus,
  Filter,
  Search,
  RefreshCw,
  Calendar,
  MapPin,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit2,
  Copy
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PolygonData {
  id: string
  businessId: string
  businessName: string
  propertyAddress: string
  geometries: {
    id: string
    name: string
    type: string
    coordinates: Array<{lat: number, lng: number}>
    linearFeet: number
    color: string
    visible: boolean
    locked: boolean
    createdAt: string
    updatedAt: string
  }[]
  exclusionZones: any[]
  createdAt: string
  updatedAt: string
  createdBy: string
  status: 'active' | 'archived' | 'deleted'
}

interface FilterOptions {
  businessId?: string
  status?: string
  dateRange?: { start: string, end: string }
  geometryType?: string
  search?: string
}

export default function PolygonManagerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [polygonData, setPolygonData] = useState<PolygonData[]>([])
  const [filteredData, setFilteredData] = useState<PolygonData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({})
  
  // Stats
  const [stats, setStats] = useState({
    totalPolygons: 0,
    totalGeometries: 0,
    totalBusinesses: 0,
    totalLinearFeet: 0,
    recentActivity: 0
  })

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Fetch polygon data
  const fetchPolygonData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/polygons')
      if (!response.ok) throw new Error('Failed to fetch polygon data')
      
      const data = await response.json()
      setPolygonData(data.polygons)
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching polygon data:', error)
      toast.error('Failed to load polygon data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = [...polygonData]
    
    if (filters.businessId) {
      filtered = filtered.filter(p => p.businessId === filters.businessId)
    }
    
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status)
    }
    
    if (filters.geometryType) {
      filtered = filtered.filter(p => 
        p.geometries.some(g => g.type === filters.geometryType)
      )
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.propertyAddress.toLowerCase().includes(searchLower) ||
        p.businessName.toLowerCase().includes(searchLower) ||
        p.geometries.some(g => g.name.toLowerCase().includes(searchLower))
      )
    }
    
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      filtered = filtered.filter(p => {
        const created = new Date(p.createdAt)
        return created >= start && created <= end
      })
    }
    
    setFilteredData(filtered)
  }, [polygonData, filters])

  useEffect(() => {
    fetchPolygonData()
  }, [fetchPolygonData])

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    
    const confirmed = confirm(`Delete ${selectedItems.size} polygon sets? This action cannot be undone.`)
    if (!confirmed) return
    
    try {
      const response = await fetch('/api/admin/polygons/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedItems) })
      })
      
      if (!response.ok) throw new Error('Failed to delete polygons')
      
      toast.success(`Deleted ${selectedItems.size} polygon sets`)
      setSelectedItems(new Set())
      fetchPolygonData()
    } catch (error) {
      toast.error('Failed to delete polygon sets')
    }
  }

  const handleBulkArchive = async () => {
    if (selectedItems.size === 0) return
    
    try {
      const response = await fetch('/api/admin/polygons/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedItems) })
      })
      
      if (!response.ok) throw new Error('Failed to archive polygons')
      
      toast.success(`Archived ${selectedItems.size} polygon sets`)
      setSelectedItems(new Set())
      fetchPolygonData()
    } catch (error) {
      toast.error('Failed to archive polygon sets')
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/polygons/export')
      if (!response.ok) throw new Error('Failed to export data')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `polygon-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Polygon data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading polygon manager...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Map className="w-8 h-8 text-blue-600" />
                Polygon Manager
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage property polygons and geometries across all businesses
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                } hover:bg-blue-200`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={fetchPolygonData}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Polygons</p>
                <p className="text-2xl font-bold">{stats.totalPolygons.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Geometries</p>
                <p className="text-2xl font-bold">{stats.totalGeometries.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Businesses</p>
                <p className="text-2xl font-bold">{stats.totalBusinesses.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Linear Feet</p>
                <p className="text-2xl font-bold">{stats.totalLinearFeet.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg border mb-6">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Search addresses, businesses..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Geometry Type</label>
                <select
                  value={filters.geometryType || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, geometryType: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Types</option>
                  <option value="lot_perimeter">Lot Perimeter</option>
                  <option value="structure_perimeter">Structure Perimeter</option>
                  <option value="custom_path">Custom Path</option>
                  <option value="area_band">Area Band</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({})}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkArchive}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Archive Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set(filteredData.map(p => p.id)))
                        } else {
                          setSelectedItems(new Set())
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Geometries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linear Feet
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
                {filteredData.map((polygon) => (
                  <tr key={polygon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(polygon.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedItems)
                          if (e.target.checked) {
                            newSelected.add(polygon.id)
                          } else {
                            newSelected.delete(polygon.id)
                          }
                          setSelectedItems(newSelected)
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {polygon.propertyAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{polygon.businessName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{polygon.geometries.length}</span>
                        <div className="flex gap-1">
                          {polygon.geometries.slice(0, 3).map((geo, idx) => (
                            <div
                              key={idx}
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: geo.color }}
                              title={geo.name}
                            />
                          ))}
                          {polygon.geometries.length > 3 && (
                            <span className="text-xs text-gray-500">+{polygon.geometries.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">
                        {polygon.geometries.reduce((sum, g) => sum + g.linearFeet, 0).toFixed(1)} ft
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        polygon.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : polygon.status === 'archived'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {polygon.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(polygon.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/polygon-manager/${polygon.id}`)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/polygon-manager/${polygon.id}/edit`)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-800"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <Map className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No polygon data found</p>
              <p className="text-sm text-gray-400 mt-1">
                {polygonData.length === 0 ? 'No polygons have been created yet' : 'Try adjusting your filters'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}