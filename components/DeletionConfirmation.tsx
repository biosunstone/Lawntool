'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Coordinate } from '@/types/manualSelection'
import { AlertTriangle, Trash2, X, MapPin } from 'lucide-react'
import { formatArea } from '@/lib/propertyMeasurement'

interface PolygonSelection {
  id: string
  name?: string
  areaType: 'lawn' | 'driveway' | 'sidewalk' | 'building' | 'other'
  vertices: Coordinate[]
  area: number
  perimeter: number
  createdAt: Date
  polygon?: google.maps.Polygon
}

interface DeletionConfirmationProps {
  selection: PolygonSelection
  onConfirm: () => void
  onCancel: () => void
  isOpen: boolean
}

export const DeletionConfirmation: React.FC<DeletionConfirmationProps> = ({
  selection,
  onConfirm,
  onCancel,
  isOpen
}) => {
  const [isHighlighting, setIsHighlighting] = useState(false)
  const originalOptionsRef = useRef<google.maps.PolygonOptions | null>(null)
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const miniMapRef = useRef<HTMLDivElement>(null)
  const miniMapInstanceRef = useRef<google.maps.Map | null>(null)
  const miniPolygonRef = useRef<google.maps.Polygon | null>(null)
  
  // Get area type display name
  const getAreaTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      lawn: 'Lawn Area',
      driveway: 'Driveway',
      sidewalk: 'Sidewalk',
      building: 'Building',
      other: 'Other Area'
    }
    return types[type] || type
  }
  
  // Get area type color
  const getAreaTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lawn: '#10B981',
      driveway: '#6B7280',
      sidewalk: '#3B82F6',
      building: '#8B5CF6',
      other: '#F59E0B'
    }
    return colors[type] || '#4B5563'
  }
  
  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  // Highlight polygon with pulsing effect
  useEffect(() => {
    if (!isOpen || !selection.polygon) return
    
    const polygon = selection.polygon
    setIsHighlighting(true)
    
    // Store original options
    originalOptionsRef.current = {
      fillColor: polygon.get('fillColor') || '#4285F4',
      fillOpacity: polygon.get('fillOpacity') || 0.35,
      strokeColor: polygon.get('strokeColor') || '#4285F4',
      strokeWeight: polygon.get('strokeWeight') || 2,
      strokeOpacity: polygon.get('strokeOpacity') || 0.8,
      zIndex: polygon.get('zIndex') || 1
    }
    
    // Apply highlight styling
    let pulseState = false
    const pulse = () => {
      pulseState = !pulseState
      polygon.setOptions({
        fillColor: '#EF4444',
        fillOpacity: pulseState ? 0.6 : 0.3,
        strokeColor: '#DC2626',
        strokeWeight: 4,
        strokeOpacity: 1,
        zIndex: 1000
      })
    }
    
    // Start pulsing
    pulse()
    pulseIntervalRef.current = setInterval(pulse, 500)
    
    // Cleanup
    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current)
        pulseIntervalRef.current = null
      }
      
      // Restore original styling
      if (originalOptionsRef.current && polygon) {
        polygon.setOptions(originalOptionsRef.current)
      }
      setIsHighlighting(false)
    }
  }, [isOpen, selection])
  
  // Initialize mini map
  useEffect(() => {
    if (!isOpen || !miniMapRef.current || !window.google?.maps) return
    
    // Calculate bounds for the polygon
    const bounds = new google.maps.LatLngBounds()
    selection.vertices.forEach(vertex => {
      bounds.extend(new google.maps.LatLng(vertex.lat, vertex.lng))
    })
    
    // Create mini map
    miniMapInstanceRef.current = new google.maps.Map(miniMapRef.current, {
      center: bounds.getCenter(),
      zoom: 18,
      mapTypeId: 'satellite',
      disableDefaultUI: true,
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
      clickableIcons: false,
      styles: [
        {
          featureType: 'all',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    })
    
    // Add polygon to mini map
    miniPolygonRef.current = new google.maps.Polygon({
      paths: selection.vertices.map(v => new google.maps.LatLng(v.lat, v.lng)),
      fillColor: '#EF4444',
      fillOpacity: 0.5,
      strokeColor: '#DC2626',
      strokeWeight: 3,
      strokeOpacity: 1,
      map: miniMapInstanceRef.current
    })
    
    // Fit bounds with padding
    miniMapInstanceRef.current.fitBounds(bounds)
    
    // Cleanup
    return () => {
      if (miniPolygonRef.current) {
        miniPolygonRef.current.setMap(null)
        miniPolygonRef.current = null
      }
      miniMapInstanceRef.current = null
    }
  }, [isOpen, selection])
  
  if (!isOpen) return null
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 border-b border-red-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Deletion
                </h3>
              </div>
              <button
                onClick={onCancel}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              You are about to delete the following polygon:
            </p>
            
            {/* Polygon Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {selection.name || `${getAreaTypeDisplay(selection.areaType)} #${selection.id.slice(-4)}`}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: getAreaTypeColor(selection.areaType) }}
                    />
                    <span className="text-sm text-gray-600">
                      {getAreaTypeDisplay(selection.areaType)}
                    </span>
                  </div>
                </div>
                {isHighlighting && (
                  <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full animate-pulse">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    Highlighting
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Area:</span>
                  <p className="font-medium text-gray-900">
                    {formatArea(selection.area)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Perimeter:</span>
                  <p className="font-medium text-gray-900">
                    {selection.perimeter.toLocaleString()} ft
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Vertices:</span>
                  <p className="font-medium text-gray-900">
                    {selection.vertices.length} points
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <p className="font-medium text-gray-900 text-xs">
                    {formatDate(selection.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Mini Map Preview */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Location Preview</span>
              </div>
              <div 
                ref={miniMapRef}
                className="w-full h-40 rounded-lg border border-gray-200 bg-gray-100"
              />
            </div>
            
            {/* Warning Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> This action cannot be undone. The polygon and all associated data will be permanently deleted.
              </p>
            </div>
            
            {/* Additional Info */}
            <div className="text-xs text-gray-500">
              <p>• The highlighted area on the main map will be deleted</p>
              <p>• Any measurements associated with this polygon will be removed</p>
              <p>• This will update the total area calculations</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Polygon
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Export a hook for programmatic deletion with confirmation
export const usePolygonDeletion = () => {
  const [selectionToDelete, setSelectionToDelete] = useState<PolygonSelection | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  
  const requestDeletion = (selection: PolygonSelection) => {
    setSelectionToDelete(selection)
    setIsConfirmationOpen(true)
  }
  
  const confirmDeletion = () => {
    if (selectionToDelete) {
      // Perform deletion logic here
      console.log('Deleting polygon:', selectionToDelete.id)
    }
    setIsConfirmationOpen(false)
    setSelectionToDelete(null)
  }
  
  const cancelDeletion = () => {
    setIsConfirmationOpen(false)
    setSelectionToDelete(null)
  }
  
  return {
    requestDeletion,
    confirmDeletion,
    cancelDeletion,
    selectionToDelete,
    isConfirmationOpen
  }
}