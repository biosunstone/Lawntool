export type AreaType = 'lawn' | 'driveway' | 'sidewalk' | 'building'
export type DrawingTool = 'polygon' | 'rectangle'
export type SelectionMode = 'ai' | 'manual' | 'hybrid'

export interface Coordinate {
  lat: number
  lng: number
}

export interface AreaSelection {
  id: string
  type: AreaType
  polygon: Coordinate[]
  area: number // in square feet
  timestamp: Date
  color: string
}

export interface SelectionHistory {
  action: 'add' | 'remove' | 'modify'
  selection: AreaSelection
  timestamp: Date
}

export interface ManualSelectionState {
  mode: SelectionMode
  selections: AreaSelection[]
  history: SelectionHistory[]
  historyIndex: number
  currentTool: DrawingTool
  currentAreaType: AreaType
  isDrawing: boolean
  currentPolygon: Coordinate[]
}

export interface ManualMeasurements {
  lawn?: {
    polygon: number[][]
    area: number
    selections: AreaSelection[]
  }
  driveway?: {
    polygon: number[][]
    area: number
    selections: AreaSelection[]
  }
  sidewalk?: {
    polygon: number[][]
    area: number
    selections: AreaSelection[]
  }
  building?: {
    polygon: number[][]
    area: number
    selections: AreaSelection[]
  }
}

export interface EnhancedMeasurements {
  selectionMethod: SelectionMode
  manualSelections?: ManualMeasurements
  hybridCalculations?: {
    useManualFor: AreaType[]
    useAiFor: AreaType[]
  }
}

export const AREA_COLORS: Record<AreaType, string> = {
  lawn: '#10b981', // green
  driveway: '#6b7280', // gray
  sidewalk: '#3b82f6', // blue
  building: '#ef4444', // red
}

export const AREA_LABELS: Record<AreaType, string> = {
  lawn: 'Lawn Area',
  driveway: 'Driveway',
  sidewalk: 'Sidewalk',
  building: 'Building'
}