'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  AreaSelection,
  AreaType,
  Coordinate,
  DrawingTool,
  ManualSelectionState,
  SelectionHistory,
  SelectionMode,
  AREA_COLORS
} from '@/types/manualSelection'
import { calculatePolygonArea } from '@/lib/manualSelection/polygonCalculator'

interface ManualSelectionContextType extends ManualSelectionState {
  setMode: (mode: SelectionMode) => void
  setCurrentTool: (tool: DrawingTool) => void
  setCurrentAreaType: (type: AreaType) => void
  addSelection: (polygon: Coordinate[], type?: AreaType) => void
  removeSelection: (id: string) => void
  clearSelections: () => void
  undo: () => void
  redo: () => void
  startDrawing: () => void
  stopDrawing: () => void
  addPointToPolygon: (point: Coordinate) => void
  completePolygon: () => void
  clearCurrentPolygon: () => void
  getSelectionsByType: (type: AreaType) => AreaSelection[]
  getTotalAreaByType: (type: AreaType) => number
}

const ManualSelectionContext = createContext<ManualSelectionContextType | undefined>(undefined)

export function ManualSelectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ManualSelectionState>({
    mode: 'ai',
    selections: [],
    history: [],
    historyIndex: -1,
    currentTool: 'polygon',
    currentAreaType: 'lawn',
    isDrawing: false,
    currentPolygon: []
  })

  const setMode = useCallback((mode: SelectionMode) => {
    setState(prev => ({ ...prev, mode }))
  }, [])

  const setCurrentTool = useCallback((tool: DrawingTool) => {
    setState(prev => ({ ...prev, currentTool: tool }))
  }, [])

  const setCurrentAreaType = useCallback((type: AreaType) => {
    setState(prev => ({ ...prev, currentAreaType: type }))
  }, [])

  const addToHistory = useCallback((action: SelectionHistory) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1)
      newHistory.push(action)
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1
      }
    })
  }, [])

  const addSelection = useCallback((polygon: Coordinate[], type?: AreaType) => {
    if (polygon.length < 3) return

    const selection: AreaSelection = {
      id: `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type || state.currentAreaType,
      polygon,
      area: calculatePolygonArea(polygon),
      timestamp: new Date(),
      color: AREA_COLORS[type || state.currentAreaType]
    }

    setState(prev => ({
      ...prev,
      selections: [...prev.selections, selection],
      currentPolygon: [],
      isDrawing: false
    }))

    addToHistory({
      action: 'add',
      selection,
      timestamp: new Date()
    })
  }, [state.currentAreaType, addToHistory])

  const removeSelection = useCallback((id: string) => {
    setState(prev => {
      const selection = prev.selections.find(s => s.id === id)
      if (!selection) return prev

      addToHistory({
        action: 'remove',
        selection,
        timestamp: new Date()
      })

      return {
        ...prev,
        selections: prev.selections.filter(s => s.id !== id)
      }
    })
  }, [addToHistory])

  const clearSelections = useCallback(() => {
    setState(prev => ({
      ...prev,
      selections: [],
      currentPolygon: [],
      isDrawing: false,
      history: [],
      historyIndex: -1
    }))
  }, [])

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex < 0) return prev

      const historyItem = prev.history[prev.historyIndex]
      let newSelections = [...prev.selections]

      if (historyItem.action === 'add') {
        newSelections = newSelections.filter(s => s.id !== historyItem.selection.id)
      } else if (historyItem.action === 'remove') {
        newSelections.push(historyItem.selection)
      }

      return {
        ...prev,
        selections: newSelections,
        historyIndex: prev.historyIndex - 1
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev

      const nextIndex = prev.historyIndex + 1
      const historyItem = prev.history[nextIndex]
      let newSelections = [...prev.selections]

      if (historyItem.action === 'add') {
        newSelections.push(historyItem.selection)
      } else if (historyItem.action === 'remove') {
        newSelections = newSelections.filter(s => s.id !== historyItem.selection.id)
      }

      return {
        ...prev,
        selections: newSelections,
        historyIndex: nextIndex
      }
    })
  }, [])

  const startDrawing = useCallback(() => {
    setState(prev => ({ ...prev, isDrawing: true, currentPolygon: [] }))
  }, [])

  const stopDrawing = useCallback(() => {
    setState(prev => ({ ...prev, isDrawing: false }))
  }, [])

  const addPointToPolygon = useCallback((point: Coordinate) => {
    setState(prev => {
      if (!prev.isDrawing) return prev
      return {
        ...prev,
        currentPolygon: [...prev.currentPolygon, point]
      }
    })
  }, [])

  const completePolygon = useCallback(() => {
    if (state.currentPolygon.length >= 3) {
      addSelection(state.currentPolygon)
    }
    setState(prev => ({ ...prev, currentPolygon: [], isDrawing: false }))
  }, [state.currentPolygon, addSelection])

  const clearCurrentPolygon = useCallback(() => {
    setState(prev => ({ ...prev, currentPolygon: [], isDrawing: false }))
  }, [])

  const getSelectionsByType = useCallback((type: AreaType): AreaSelection[] => {
    return state.selections.filter(s => s.type === type)
  }, [state.selections])

  const getTotalAreaByType = useCallback((type: AreaType): number => {
    return state.selections
      .filter(s => s.type === type)
      .reduce((total, s) => total + s.area, 0)
  }, [state.selections])

  const value: ManualSelectionContextType = {
    ...state,
    setMode,
    setCurrentTool,
    setCurrentAreaType,
    addSelection,
    removeSelection,
    clearSelections,
    undo,
    redo,
    startDrawing,
    stopDrawing,
    addPointToPolygon,
    completePolygon,
    clearCurrentPolygon,
    getSelectionsByType,
    getTotalAreaByType
  }

  return (
    <ManualSelectionContext.Provider value={value}>
      {children}
    </ManualSelectionContext.Provider>
  )
}

export function useManualSelection() {
  const context = useContext(ManualSelectionContext)
  if (!context) {
    throw new Error('useManualSelection must be used within ManualSelectionProvider')
  }
  return context
}