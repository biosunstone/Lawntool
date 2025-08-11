'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeft, Save, Trash2, Plus, Minus, Edit2, Eye, EyeOff, Lock, Unlock,
  MapPin, Ruler, Palette, RefreshCw, X, Check
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Coordinate {
  lat: number
  lng: number
}

interface Geometry {
  id: string
  name: string
  type: string
  coordinates: Coordinate[]
  linearFeet: number
  color: string
  visible: boolean
  locked: boolean
}

interface PolygonData {
  id: string
  businessId: string
  businessName?: string
  propertyAddress: string
  geometries: Geometry[]
  exclusionZones: any[]
  status: string
  createdAt: string
  updatedAt: string
}

export default function EditPolygonPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  
  const [polygonData, setPolygonData] = useState<PolygonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingGeometry, setEditingGeometry] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  
  const colors = [
    '#22c55e', '#ef4444', '#3b82f6', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#ec4899', '#10b981',
    '#f97316', '#84cc16', '#14b8a6', '#a855f7'
  ]

  // Load polygon data
  useEffect(() => {
    loadPolygonData()
  }, [params.id])

  const loadPolygonData = async () => {
    try {
      const response = await fetch(`/api/admin/polygons/${params.id}`)
      if (!response.ok) throw new Error('Failed to load polygon')
      
      const data = await response.json()
      setPolygonData(data)
    } catch (error) {
      console.error('Error loading polygon:', error)
      toast.error('Failed to load polygon data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate linear feet for coordinates
  const calculateLinearFeet = (coordinates: Coordinate[]): number => {
    if (!coordinates || coordinates.length < 2) return 0
    
    let total = 0
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1 = coordinates[i]
      const p2 = coordinates[i + 1]
      const distance = getDistance(p1.lat, p1.lng, p2.lat, p2.lng)
      total += distance
    }
    
    // Close the polygon if needed
    if (coordinates.length > 2) {
      const first = coordinates[0]
      const last = coordinates[coordinates.length - 1]
      if (first.lat !== last.lat || first.lng !== last.lng) {
        total += getDistance(first.lat, first.lng, last.lat, last.lng)
      }
    }
    
    return total * 3.28084 // Convert meters to feet
  }

  // Calculate distance between two points
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Update geometry
  const updateGeometry = useCallback((geometryId: string, updates: Partial<Geometry>) => {
    if (!polygonData) return
    
    setPolygonData({
      ...polygonData,
      geometries: polygonData.geometries.map(g => 
        g.id === geometryId 
          ? { 
              ...g, 
              ...updates,
              linearFeet: updates.coordinates 
                ? calculateLinearFeet(updates.coordinates) 
                : g.linearFeet
            } 
          : g
      )
    })
  }, [polygonData])

  // Add new coordinate to geometry
  const addCoordinate = (geometryId: string) => {
    const geometry = polygonData?.geometries.find(g => g.id === geometryId)
    if (!geometry) return
    
    const lastCoord = geometry.coordinates[geometry.coordinates.length - 1]
    const newCoord = {
      lat: lastCoord.lat + 0.0001,
      lng: lastCoord.lng + 0.0001
    }
    
    updateGeometry(geometryId, {
      coordinates: [...geometry.coordinates, newCoord]
    })
    
    toast.success('Added new coordinate')
  }

  // Remove coordinate from geometry
  const removeCoordinate = (geometryId: string, index: number) => {
    const geometry = polygonData?.geometries.find(g => g.id === geometryId)
    if (!geometry || geometry.coordinates.length <= 3) {
      toast.error('Polygon must have at least 3 points')
      return
    }
    
    const newCoords = geometry.coordinates.filter((_, i) => i !== index)
    updateGeometry(geometryId, { coordinates: newCoords })
    
    toast.success('Removed coordinate')
  }

  // Update coordinate
  const updateCoordinate = (geometryId: string, index: number, coord: Coordinate) => {
    const geometry = polygonData?.geometries.find(g => g.id === geometryId)
    if (!geometry) return
    
    const newCoords = [...geometry.coordinates]
    newCoords[index] = coord
    updateGeometry(geometryId, { coordinates: newCoords })
  }

  // Add new geometry
  const addGeometry = () => {
    if (!polygonData) return
    
    const center = polygonData.geometries[0]?.coordinates[0] || { lat: 43.65, lng: -79.38 }
    const newGeometry: Geometry = {
      id: 'geo-' + Date.now(),
      name: `New Polygon ${polygonData.geometries.length + 1}`,
      type: 'custom_path',
      coordinates: [
        { lat: center.lat - 0.0002, lng: center.lng - 0.0002 },
        { lat: center.lat + 0.0002, lng: center.lng - 0.0002 },
        { lat: center.lat + 0.0002, lng: center.lng + 0.0002 },
        { lat: center.lat - 0.0002, lng: center.lng + 0.0002 },
        { lat: center.lat - 0.0002, lng: center.lng - 0.0002 }
      ],
      linearFeet: 0,
      color: colors[polygonData.geometries.length % colors.length],
      visible: true,
      locked: false
    }
    
    newGeometry.linearFeet = calculateLinearFeet(newGeometry.coordinates)
    
    setPolygonData({
      ...polygonData,
      geometries: [...polygonData.geometries, newGeometry]
    })
    
    toast.success('Added new geometry')
  }

  // Delete geometry
  const deleteGeometry = (geometryId: string) => {
    if (!polygonData) return
    
    if (polygonData.geometries.length === 1) {
      toast.error('Cannot delete the last geometry')
      return
    }
    
    setPolygonData({
      ...polygonData,
      geometries: polygonData.geometries.filter(g => g.id !== geometryId)
    })
    
    toast.success('Deleted geometry')
  }

  // Save changes
  const saveChanges = async () => {
    if (!polygonData) return
    
    setSaving(true)
    
    try {
      // Recalculate all linear feet before saving
      const updatedGeometries = polygonData.geometries.map(g => ({
        ...g,
        linearFeet: calculateLinearFeet(g.coordinates)
      }))
      
      const response = await fetch(`/api/admin/polygons/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...polygonData,
          geometries: updatedGeometries,
          updatedAt: new Date().toISOString()
        })
      })
      
      if (!response.ok) throw new Error('Failed to save changes')
      
      toast.success('Changes saved successfully')
      router.push('/admin/polygon-manager')
    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Delete entire polygon set
  const deletePolygonSet = async () => {
    if (!confirm('Are you sure you want to delete this entire polygon set? This cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/polygons/${params.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete polygon')
      
      toast.success('Polygon set deleted')
      router.push('/admin/polygon-manager')
    } catch (error) {
      console.error('Error deleting polygon:', error)
      toast.error('Failed to delete polygon')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading polygon data...</p>
        </div>
      </div>
    )
  }

  if (!polygonData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold mb-2">Polygon not found</p>
          <button
            onClick={() => router.push('/admin/polygon-manager')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Manager
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/admin/polygon-manager')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Edit Polygon</h1>
                  <p className="text-sm text-gray-600 mt-1">{polygonData.propertyAddress}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={deletePolygonSet}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Property Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Property Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={polygonData.propertyAddress}
                onChange={(e) => setPolygonData({ ...polygonData, propertyAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business ID</label>
              <input
                type="text"
                value={polygonData.businessId}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={polygonData.status}
                onChange={(e) => setPolygonData({ ...polygonData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Geometries */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Geometries ({polygonData.geometries.length})</h2>
            <button
              onClick={addGeometry}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Geometry
            </button>
          </div>
          
          <div className="space-y-4">
            {polygonData.geometries.map((geometry, geoIndex) => (
              <div key={geometry.id} className="border rounded-lg p-4">
                {/* Geometry Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow cursor-pointer"
                      style={{ backgroundColor: geometry.color }}
                      onClick={() => setShowColorPicker(showColorPicker === geometry.id ? null : geometry.id)}
                    />
                    <input
                      type="text"
                      value={geometry.name}
                      onChange={(e) => updateGeometry(geometry.id, { name: e.target.value })}
                      className="font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1"
                    />
                    <span className="text-sm text-gray-500">
                      {geometry.coordinates.length} points • {geometry.linearFeet.toFixed(1)} ft
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateGeometry(geometry.id, { visible: !geometry.visible })}
                      className={`p-1 rounded ${geometry.visible ? 'text-gray-600' : 'text-gray-400'}`}
                      title={geometry.visible ? 'Hide' : 'Show'}
                    >
                      {geometry.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => updateGeometry(geometry.id, { locked: !geometry.locked })}
                      className={`p-1 rounded ${geometry.locked ? 'text-yellow-600' : 'text-gray-400'}`}
                      title={geometry.locked ? 'Unlock' : 'Lock'}
                    >
                      {geometry.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteGeometry(geometry.id)}
                      className="p-1 rounded text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Color Picker */}
                {showColorPicker === geometry.id && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {colors.map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            updateGeometry(geometry.id, { color })
                            setShowColorPicker(null)
                          }}
                          className={`w-8 h-8 rounded-full border-2 ${
                            geometry.color === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Coordinates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Coordinates</span>
                    <button
                      onClick={() => addCoordinate(geometry.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Point
                    </button>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {geometry.coordinates.map((coord, index) => (
                      <div key={index} className="flex items-center gap-2 group">
                        <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                        <input
                          type="number"
                          value={coord.lat}
                          onChange={(e) => updateCoordinate(geometry.id, index, { ...coord, lat: parseFloat(e.target.value) })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          step="0.000001"
                          placeholder="Latitude"
                        />
                        <input
                          type="number"
                          value={coord.lng}
                          onChange={(e) => updateCoordinate(geometry.id, index, { ...coord, lng: parseFloat(e.target.value) })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          step="0.000001"
                          placeholder="Longitude"
                        />
                        <button
                          onClick={() => removeCoordinate(geometry.id, index)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recalculate Button */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => {
                      const newLinearFeet = calculateLinearFeet(geometry.coordinates)
                      updateGeometry(geometry.id, { linearFeet: newLinearFeet })
                      toast.success(`Recalculated: ${newLinearFeet.toFixed(1)} ft`)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Ruler className="w-3 h-3" />
                    Recalculate Linear Feet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                Total Linear Feet: <strong>{polygonData.geometries.reduce((sum, g) => sum + g.linearFeet, 0).toFixed(1)} ft</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Last updated: {new Date(polygonData.updatedAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => loadPolygonData()}
              className="text-blue-600 hover:text-blue-700"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}