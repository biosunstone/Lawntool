'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Coordinate } from '@/types/manualSelection'
import { 
  Edit2, 
  Plus, 
  Trash2, 
  Undo, 
  Redo, 
  Save, 
  Move,
  Check,
  X 
} from 'lucide-react'

interface PolygonState {
  vertices: Coordinate[]
  timestamp: Date
  action: string
}

interface PolygonEditorProps {
  polygon: google.maps.Polygon
  onUpdate: (vertices: Coordinate[]) => void
  onSave?: (versionName?: string) => void
  color?: string
  name?: string
}

export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  polygon,
  onUpdate,
  onSave,
  color = '#4285F4',
  name = 'Polygon'
}) => {
  const [editMode, setEditMode] = useState(false)
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null)
  const [history, setHistory] = useState<PolygonState[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [vertexMarkers, setVertexMarkers] = useState<google.maps.Marker[]>([])
  const [midpointMarkers, setMidpointMarkers] = useState<google.maps.Marker[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const originalOptionsRef = useRef<google.maps.PolygonOptions | null>(null)
  
  // Convert google.maps.MVCArray to Coordinate array
  const pathToCoordinates = useCallback((path: google.maps.MVCArray<google.maps.LatLng>): Coordinate[] => {
    const coords: Coordinate[] = []
    path.forEach((latLng) => {
      coords.push({
        lat: latLng.lat(),
        lng: latLng.lng()
      })
    })
    return coords
  }, [])
  
  // Convert Coordinate array to google.maps.LatLng array
  const coordinatesToPath = useCallback((coords: Coordinate[]): google.maps.LatLng[] => {
    return coords.map(coord => new google.maps.LatLng(coord.lat, coord.lng))
  }, [])
  
  // Save current state to history
  const saveToHistory = useCallback((action: string) => {
    const currentVertices = pathToCoordinates(polygon.getPath())
    const newState: PolygonState = {
      vertices: currentVertices,
      timestamp: new Date(),
      action
    }
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    onUpdate(currentVertices)
  }, [history, historyIndex, polygon, pathToCoordinates, onUpdate])
  
  // Restore state from history
  const restoreState = useCallback((state: PolygonState) => {
    const path = coordinatesToPath(state.vertices)
    polygon.setPath(path)
    onUpdate(state.vertices)
    
    // Recreate markers if in edit mode
    if (editMode) {
      clearMarkers()
      createVertexMarkers()
      createMidpointMarkers()
    }
  }, [polygon, coordinatesToPath, onUpdate, editMode])
  
  // Clear all markers
  const clearMarkers = useCallback(() => {
    vertexMarkers.forEach(marker => marker.setMap(null))
    midpointMarkers.forEach(marker => marker.setMap(null))
    setVertexMarkers([])
    setMidpointMarkers([])
  }, [vertexMarkers, midpointMarkers])
  
  // Create vertex markers
  const createVertexMarkers = useCallback(() => {
    const path = polygon.getPath()
    const map = polygon.getMap()
    const markers: google.maps.Marker[] = []
    
    path.forEach((vertex, index) => {
      const marker = new google.maps.Marker({
        position: vertex,
        map,
        draggable: true,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
          strokeColor: color,
          strokeWeight: 2,
          anchor: new google.maps.Point(0, 0)
        },
        zIndex: 1000,
        cursor: 'move'
      })
      
      // Handle vertex drag
      marker.addListener('dragstart', () => {
        setIsDragging(true)
        setSelectedVertex(index)
      })
      
      marker.addListener('drag', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const newPath = polygon.getPath()
          newPath.setAt(index, e.latLng)
          polygon.setPath(newPath)
          
          // Update midpoint markers positions
          updateMidpointMarkers()
        }
      })
      
      marker.addListener('dragend', () => {
        setIsDragging(false)
        saveToHistory(`Move vertex ${index + 1}`)
        createMidpointMarkers() // Recreate midpoint markers
      })
      
      // Handle vertex deletion (right-click)
      marker.addListener('rightclick', () => {
        if (path.getLength() > 3) { // Keep at least 3 vertices
          deleteVertex(index)
        }
      })
      
      // Handle vertex selection (click)
      marker.addListener('click', () => {
        setSelectedVertex(index)
        highlightVertex(marker)
      })
      
      markers.push(marker)
    })
    
    setVertexMarkers(markers)
  }, [polygon, color, saveToHistory])
  
  // Create midpoint markers (for adding new vertices)
  const createMidpointMarkers = useCallback(() => {
    if (isDragging) return // Don't create while dragging
    
    const path = polygon.getPath()
    const map = polygon.getMap()
    const markers: google.maps.Marker[] = []
    
    // Clear existing midpoint markers
    midpointMarkers.forEach(marker => marker.setMap(null))
    
    path.forEach((vertex, index) => {
      const nextIndex = (index + 1) % path.getLength()
      const nextVertex = path.getAt(nextIndex)
      
      // Calculate midpoint
      const midLat = (vertex.lat() + nextVertex.lat()) / 2
      const midLng = (vertex.lng() + nextVertex.lng()) / 2
      const midpoint = new google.maps.LatLng(midLat, midLng)
      
      const marker = new google.maps.Marker({
        position: midpoint,
        map,
        draggable: false,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: '#FFFFFF',
          fillOpacity: 0.5,
          strokeColor: color,
          strokeWeight: 1,
          anchor: new google.maps.Point(0, 0)
        },
        zIndex: 999,
        cursor: 'pointer',
        opacity: 0.6
      })
      
      // Handle click to add new vertex
      marker.addListener('click', () => {
        addVertex(index, midpoint)
      })
      
      // Hover effects
      marker.addListener('mouseover', () => {
        marker.setOptions({ opacity: 1, icon: { ...marker.getIcon() as any, scale: 7 } })
      })
      
      marker.addListener('mouseout', () => {
        marker.setOptions({ opacity: 0.6, icon: { ...marker.getIcon() as any, scale: 5 } })
      })
      
      markers.push(marker)
    })
    
    setMidpointMarkers(markers)
  }, [polygon, color, isDragging, midpointMarkers])
  
  // Update midpoint marker positions during vertex drag
  const updateMidpointMarkers = useCallback(() => {
    const path = polygon.getPath()
    
    midpointMarkers.forEach((marker, index) => {
      const vertex = path.getAt(index)
      const nextIndex = (index + 1) % path.getLength()
      const nextVertex = path.getAt(nextIndex)
      
      const midLat = (vertex.lat() + nextVertex.lat()) / 2
      const midLng = (vertex.lng() + nextVertex.lng()) / 2
      
      marker.setPosition(new google.maps.LatLng(midLat, midLng))
    })
  }, [polygon, midpointMarkers])
  
  // Add new vertex
  const addVertex = useCallback((afterIndex: number, position: google.maps.LatLng) => {
    const path = polygon.getPath()
    path.insertAt(afterIndex + 1, position)
    polygon.setPath(path)
    
    saveToHistory(`Add vertex after ${afterIndex + 1}`)
    
    // Recreate markers
    clearMarkers()
    createVertexMarkers()
    createMidpointMarkers()
  }, [polygon, saveToHistory, clearMarkers, createVertexMarkers, createMidpointMarkers])
  
  // Delete vertex
  const deleteVertex = useCallback((index: number) => {
    const path = polygon.getPath()
    
    if (path.getLength() <= 3) {
      alert('A polygon must have at least 3 vertices')
      return
    }
    
    path.removeAt(index)
    polygon.setPath(path)
    
    saveToHistory(`Delete vertex ${index + 1}`)
    
    // Recreate markers
    clearMarkers()
    createVertexMarkers()
    createMidpointMarkers()
  }, [polygon, saveToHistory, clearMarkers, createVertexMarkers, createMidpointMarkers])
  
  // Highlight selected vertex
  const highlightVertex = useCallback((marker: google.maps.Marker) => {
    // Reset all vertex markers
    vertexMarkers.forEach(m => {
      m.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#FFFFFF',
        fillOpacity: 1,
        strokeColor: color,
        strokeWeight: 2,
        anchor: new google.maps.Point(0, 0)
      })
    })
    
    // Highlight selected
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 3,
      anchor: new google.maps.Point(0, 0)
    })
  }, [vertexMarkers, color])
  
  // Enable edit mode
  const enableEditMode = useCallback(() => {
    setEditMode(true)
    
    // Store original options
    originalOptionsRef.current = {
      fillColor: polygon.get('fillColor'),
      fillOpacity: polygon.get('fillOpacity'),
      strokeColor: polygon.get('strokeColor'),
      strokeWeight: polygon.get('strokeWeight'),
      strokeOpacity: polygon.get('strokeOpacity')
    }
    
    // Update polygon appearance for edit mode
    polygon.setOptions({
      fillOpacity: 0.3,
      strokeWeight: 3,
      strokeOpacity: 1,
      strokeColor: color
    })
    
    // Create markers
    createVertexMarkers()
    createMidpointMarkers()
    
    // Save initial state
    if (history.length === 0) {
      saveToHistory('Initial state')
    }
  }, [polygon, color, history, createVertexMarkers, createMidpointMarkers, saveToHistory])
  
  // Disable edit mode
  const disableEditMode = useCallback(() => {
    setEditMode(false)
    setSelectedVertex(null)
    
    // Restore original polygon appearance
    if (originalOptionsRef.current) {
      polygon.setOptions(originalOptionsRef.current)
    }
    
    // Clear markers
    clearMarkers()
  }, [polygon, clearMarkers])
  
  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      restoreState(history[newIndex])
    }
  }, [historyIndex, history, restoreState])
  
  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      restoreState(history[newIndex])
    }
  }, [historyIndex, history, restoreState])
  
  // Save version
  const handleSave = useCallback(() => {
    const versionName = prompt('Enter a name for this version (optional):')
    if (onSave) {
      onSave(versionName || undefined)
    }
  }, [onSave])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers()
      if (originalOptionsRef.current && polygon) {
        polygon.setOptions(originalOptionsRef.current)
      }
    }
  }, [])
  
  return (
    <div className="polygon-editor-controls bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Editing: {name}
        </h3>
        <div className="flex items-center gap-2">
          {editMode ? (
            <button
              onClick={disableEditMode}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Finish editing"
            >
              <Check className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={enableEditMode}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit polygon"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {editMode && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => setSelectedVertex(null)}
              className="flex items-center justify-center gap-1 p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              title="Move vertices by dragging"
            >
              <Move className="w-3 h-3" />
              Move
            </button>
            <button
              className="flex items-center justify-center gap-1 p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-help"
              title="Click between vertices to add"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
            <button
              className="flex items-center justify-center gap-1 p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-help"
              title="Right-click vertex to delete"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className={`flex-1 flex items-center justify-center gap-1 p-2 text-xs rounded-lg transition-colors ${
                historyIndex === 0
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title="Undo last action"
            >
              <Undo className="w-3 h-3" />
              Undo
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className={`flex-1 flex items-center justify-center gap-1 p-2 text-xs rounded-lg transition-colors ${
                historyIndex === history.length - 1
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title="Redo last action"
            >
              <Redo className="w-3 h-3" />
              Redo
            </button>
          </div>
          
          {onSave && (
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-1 p-2 text-xs bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Save current version"
            >
              <Save className="w-3 h-3" />
              Save Version
            </button>
          )}
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <p>• Drag vertices to move them</p>
              <p>• Click circles between vertices to add</p>
              <p>• Right-click vertices to delete</p>
              <p>• {history.length} action{history.length !== 1 ? 's' : ''} in history</p>
            </div>
          </div>
          
          {selectedVertex !== null && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              Vertex {selectedVertex + 1} selected
            </div>
          )}
        </>
      )}
    </div>
  )
}