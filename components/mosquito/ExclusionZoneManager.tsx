'use client'

import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Shield, AlertTriangle } from 'lucide-react'
import { ExclusionZone, ExclusionType } from '@/lib/mosquito/PerimeterMeasurementService'
import { Coordinate } from '@/types/manualSelection'

interface ExclusionZoneManagerProps {
  zones: ExclusionZone[]
  onAdd: (zone: ExclusionZone) => void
  onEdit: (zoneId: string, updates: Partial<ExclusionZone>) => void
  onDelete: (zoneId: string) => void
}

const ZONE_TYPES = [
  { id: 'pool' as ExclusionType, name: 'Pool', icon: '🏊', color: 'bg-blue-100 text-blue-800' },
  { id: 'pond' as ExclusionType, name: 'Pond', icon: '🌊', color: 'bg-blue-100 text-blue-800' },
  { id: 'garden' as ExclusionType, name: 'Garden', icon: '🌱', color: 'bg-green-100 text-green-800' },
  { id: 'beehive' as ExclusionType, name: 'Beehive', icon: '🐝', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'playset' as ExclusionType, name: 'Playset', icon: '🛝', color: 'bg-purple-100 text-purple-800' },
  { id: 'water_feature' as ExclusionType, name: 'Water Feature', icon: '⛲', color: 'bg-cyan-100 text-cyan-800' },
  { id: 'neighbor_buffer' as ExclusionType, name: 'Neighbor Buffer', icon: '🏠', color: 'bg-gray-100 text-gray-800' }
]

export default function ExclusionZoneManager({
  zones,
  onAdd,
  onEdit,
  onDelete
}: ExclusionZoneManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [newZone, setNewZone] = useState<{
    name: string
    type: ExclusionType
    reason: string
    bufferValue: number
  }>({
    name: '',
    type: 'pool',
    reason: '',
    bufferValue: 10
  })

  const handleAdd = () => {
    if (!newZone.name?.trim()) return

    const zone: ExclusionZone = {
      id: Math.random().toString(36).substr(2, 9),
      name: newZone.name,
      type: newZone.type,
      geometry: [], // Will be drawn on map
      bufferDistance: {
        value: newZone.bufferValue,
        unit: 'feet',
        regulatory: true,
        regulation: newZone.reason || 'User defined exclusion'
      }
    }

    onAdd(zone)
    setNewZone({ name: '', type: 'pool', reason: '', bufferValue: 10 })
    setShowAddForm(false)
  }

  const handleEdit = (zoneId: string, field: string, value: any) => {
    onEdit(zoneId, { [field]: value })
  }

  const getZoneTypeInfo = (type: string) => {
    return ZONE_TYPES.find(t => t.id === type) || ZONE_TYPES[4]
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Exclusion Zones
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Name</label>
              <input
                type="text"
                value={newZone.name || ''}
                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                placeholder="e.g., Main Building"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Type</label>
              <select
                value={newZone.type}
                onChange={(e) => setNewZone({ ...newZone, type: e.target.value as ExclusionType })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              >
                {ZONE_TYPES.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Buffer Distance (feet)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={newZone.bufferValue}
                onChange={(e) => setNewZone({ ...newZone, bufferValue: Number(e.target.value) })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Regulation/Reason</label>
              <input
                type="text"
                value={newZone.reason}
                onChange={(e) => setNewZone({ ...newZone, reason: e.target.value })}
                placeholder="e.g., EPA water protection, pollinator safety"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newZone.name?.trim()}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Add Zone
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewZone({ name: '', type: 'pool', reason: '', bufferValue: 10 })
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone List */}
      <div className="space-y-2">
        {zones.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No exclusion zones defined</p>
            <p className="text-xs mt-1">Click + to add areas to exclude from treatment</p>
          </div>
        ) : (
          zones.map(zone => {
            const typeInfo = getZoneTypeInfo(zone.type)
            
            return (
              <div
                key={zone.id}
                className="p-3 rounded-lg border bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{typeInfo.icon}</span>
                      {editingZone === zone.id ? (
                        <input
                          type="text"
                          value={zone.name}
                          onChange={(e) => handleEdit(zone.id, 'name', e.target.value)}
                          onBlur={() => setEditingZone(null)}
                          onKeyPress={(e) => e.key === 'Enter' && setEditingZone(null)}
                          className="font-medium text-sm px-1 py-0.5 border rounded"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-sm">{zone.name}</span>
                      )}
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${typeInfo.color}`}>
                        {typeInfo.name}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Buffer: {zone.bufferDistance.value} {zone.bufferDistance.unit}</div>
                      {zone.bufferDistance.regulation && <div>Regulation: {zone.bufferDistance.regulation}</div>}
                      {zone.affectedLinearFeet && (
                        <div>Affected perimeter: {zone.affectedLinearFeet.toFixed(0)} ft</div>
                      )}
                      <div>Vertices: {zone.geometry.length}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => setEditingZone(zone.id)}
                      className="p-1 text-gray-600 hover:text-blue-600"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(zone.id)}
                      className="p-1 text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {zones.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Total zones: {zones.length}</div>
            <div>Total buffer distance: {zones.reduce((sum, z) => sum + z.bufferDistance.value, 0)} ft</div>
            {zones.some(z => z.affectedLinearFeet) && (
              <div>Affected perimeter: {zones.reduce((sum, z) => sum + (z.affectedLinearFeet || 0), 0).toFixed(0)} ft</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}