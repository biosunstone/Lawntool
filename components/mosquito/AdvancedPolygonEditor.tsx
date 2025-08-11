'use client'

import React, { useState, useCallback } from 'react'
import { 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Move, 
  RotateCcw,
  Copy,
  Lock,
  Unlock,
  Palette,
  Info,
  MapPin,
  Grid3X3,
  Zap
} from 'lucide-react'
import { Coordinate } from '@/types/manualSelection'

interface Geometry {
  id: string
  name: string
  type: 'lot_perimeter' | 'structure_perimeter' | 'custom_path' | 'area_band'
  coordinates: Coordinate[]
  linearFeet: number
  locked: boolean
  visible: boolean
  color?: string
  opacity?: number
}

interface AdvancedPolygonEditorProps {
  geometries: Geometry[]
  selectedGeometry: string | null
  onSelect: (geometryId: string | null) => void
  onEdit: (geometryId: string) => void
  onDelete: (geometryId: string) => void
  onToggleVisibility: (geometryId: string) => void
  onToggleLock: (geometryId: string) => void
  onRename: (geometryId: string, newName: string) => void
  onChangeColor: (geometryId: string, color: string) => void
  onDuplicate: (geometryId: string) => void
  onMove: (geometryId: string, direction: 'up' | 'down') => void
}

const GEOMETRY_TYPES = {
  lot_perimeter: { icon: '🏠', name: 'Lot Perimeter', color: '#22c55e' },
  structure_perimeter: { icon: '🏢', name: 'Structure', color: '#ef4444' },
  custom_path: { icon: '🛤️', name: 'Custom Path', color: '#3b82f6' },
  area_band: { icon: '🎯', name: 'Treatment Band', color: '#f59e0b' }
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange  
  '#f59e0b', // amber
  '#eab308', // yellow
  '#22c55e', // green
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899'  // pink
]

export default function AdvancedPolygonEditor({
  geometries,
  selectedGeometry,
  onSelect,
  onEdit,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onChangeColor,
  onDuplicate,
  onMove
}: AdvancedPolygonEditorProps) {
  const [editingName, setEditingName] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  const [hoveredGeometry, setHoveredGeometry] = useState<string | null>(null)

  const handleNameEdit = useCallback((geometryId: string, newName: string) => {
    onRename(geometryId, newName)
    setEditingName(null)
  }, [onRename])

  const handleDeleteWithConfirmation = useCallback((geometry: Geometry) => {
    // Enhanced deletion with better visual feedback
    const confirmed = window.confirm(
      `Delete "${geometry.name}"?\n\n` +
      `Type: ${GEOMETRY_TYPES[geometry.type].name}\n` +
      `Length: ${geometry.linearFeet.toFixed(1)} ft\n` +
      `Vertices: ${geometry.coordinates.length}\n\n` +
      `This action cannot be undone.`
    )
    
    if (confirmed) {
      onDelete(geometry.id)
    }
  }, [onDelete])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Polygon Editor</h3>
        <div className="flex gap-1 text-xs">
          <span className="px-2 py-1 bg-gray-100 rounded">
            {geometries.length} geometries
          </span>
          <span className="px-2 py-1 bg-blue-100 rounded">
            {geometries.filter(g => g.visible).length} visible
          </span>
        </div>
      </div>

      {/* Geometry List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {geometries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No polygons created yet</p>
            <p className="text-xs mt-1">Use the measurement tools to draw polygons</p>
          </div>
        ) : (
          geometries.map((geometry, index) => {
            const typeInfo = GEOMETRY_TYPES[geometry.type]
            const isSelected = selectedGeometry === geometry.id
            const isHovered = hoveredGeometry === geometry.id
            
            return (
              <div
                key={geometry.id}
                className={`group p-3 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isHovered
                    ? 'border-gray-300 bg-gray-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                } ${
                  !geometry.visible ? 'opacity-60' : ''
                }`}
                onMouseEnter={() => setHoveredGeometry(geometry.id)}
                onMouseLeave={() => setHoveredGeometry(null)}
                onClick={() => onSelect(isSelected ? null : geometry.id)}
              >
                {/* Main Row */}
                <div className="flex items-center gap-3">
                  {/* Type Icon & Color */}
                  <div 
                    className="relative w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm cursor-pointer"
                    style={{ backgroundColor: geometry.color || typeInfo.color }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowColorPicker(showColorPicker === geometry.id ? null : geometry.id)
                    }}
                  >
                    <span className="text-xs">{typeInfo.icon}</span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white">
                        <div className="w-full h-full bg-blue-600 rounded-full animate-ping"></div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editingName === geometry.id ? (
                      <input
                        type="text"
                        defaultValue={geometry.name}
                        className="w-full px-2 py-1 text-sm font-medium bg-white border rounded"
                        autoFocus
                        onBlur={(e) => handleNameEdit(geometry.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleNameEdit(geometry.id, e.currentTarget.value)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div>
                        <p className="font-medium text-sm truncate flex items-center gap-2">
                          {geometry.name}
                          {geometry.locked && <Lock className="w-3 h-3 text-gray-400" />}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>{typeInfo.name}</span>
                          <span>•</span>
                          <span>{geometry.linearFeet.toFixed(1)} ft</span>
                          <span>•</span>
                          <span>{geometry.coordinates.length} points</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Visibility Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleVisibility(geometry.id)
                      }}
                      className={`p-1 rounded hover:bg-white/80 ${
                        geometry.visible ? 'text-gray-600' : 'text-gray-400'
                      }`}
                      title={geometry.visible ? 'Hide' : 'Show'}
                    >
                      {geometry.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    {/* Lock Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleLock(geometry.id)
                      }}
                      className={`p-1 rounded hover:bg-white/80 ${
                        geometry.locked ? 'text-orange-600' : 'text-gray-600'
                      }`}
                      title={geometry.locked ? 'Unlock' : 'Lock'}
                    >
                      {geometry.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {/* Move Up/Down */}
                    {index > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onMove(geometry.id, 'up')
                        }}
                        className="p-1 rounded hover:bg-white/80 text-gray-600"
                        title="Move up"
                      >
                        ▲
                      </button>
                    )}
                    
                    {index < geometries.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onMove(geometry.id, 'down')
                        }}
                        className="p-1 rounded hover:bg-white/80 text-gray-600"
                        title="Move down"
                      >
                        ▼
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Actions (when selected) */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(geometry.id)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      disabled={geometry.locked}
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Points
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingName(geometry.id)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      <Edit2 className="w-3 h-3" />
                      Rename
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDuplicate(geometry.id)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWithConfirmation(geometry)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}

                {/* Color Picker */}
                {showColorPicker === geometry.id && (
                  <div className="absolute z-10 mt-2 p-2 bg-white border rounded-lg shadow-lg">
                    <div className="grid grid-cols-6 gap-1">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400"
                          style={{ backgroundColor: color }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onChangeColor(geometry.id, color)
                            setShowColorPicker(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Bulk Actions */}
      {geometries.length > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => geometries.forEach(g => onToggleVisibility(g.id))}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Toggle All Visibility
            </button>
            <button
              onClick={() => geometries.forEach(g => onToggleLock(g.id))}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Toggle All Locks
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete all ${geometries.length} geometries? This cannot be undone.`)) {
                  geometries.forEach(g => onDelete(g.id))
                }
              }}
              className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Delete All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}