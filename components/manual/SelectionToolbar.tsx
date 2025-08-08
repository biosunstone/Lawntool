'use client'

import { useManualSelection } from '@/contexts/ManualSelectionContext'
import { 
  Trees, 
  Car, 
  Square, 
  Building, 
  Undo2, 
  Redo2, 
  Trash2,
  Edit3,
  Shapes
} from 'lucide-react'
import { AreaType, DrawingTool, AREA_LABELS, AREA_COLORS } from '@/types/manualSelection'

export default function SelectionToolbar() {
  const {
    currentAreaType,
    currentTool,
    selections,
    historyIndex,
    history,
    isDrawing,
    setCurrentAreaType,
    setCurrentTool,
    undo,
    redo,
    clearSelections,
    startDrawing
  } = useManualSelection()

  const areaTypes: Array<{ type: AreaType; icon: any; label: string }> = [
    { type: 'lawn', icon: Trees, label: 'Lawn' },
    { type: 'driveway', icon: Car, label: 'Driveway' },
    { type: 'sidewalk', icon: Square, label: 'Sidewalk' },
    { type: 'building', icon: Building, label: 'Building' }
  ]

  const drawingTools: Array<{ tool: DrawingTool; icon: any; label: string }> = [
    { tool: 'polygon', icon: Edit3, label: 'Polygon' },
    { tool: 'rectangle', icon: Shapes, label: 'Rectangle' }
  ]

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  return (
    <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="space-y-4">
        {/* Area Type Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Select Area Type</h4>
          <div className="flex flex-wrap gap-2">
            {areaTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setCurrentAreaType(type)}
                disabled={isDrawing}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                  currentAreaType === type
                    ? 'ring-2 ring-offset-2'
                    : 'hover:bg-gray-50'
                } ${isDrawing ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: currentAreaType === type ? AREA_COLORS[type] + '20' : 'white',
                  borderColor: AREA_COLORS[type],
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  color: currentAreaType === type ? AREA_COLORS[type] : '#374151'
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Drawing Tools */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Drawing Tool</h4>
          <div className="flex gap-2">
            {drawingTools.map(({ tool, icon: Icon, label }) => (
              <button
                key={tool}
                onClick={() => setCurrentTool(tool)}
                disabled={isDrawing}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentTool === tool
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${isDrawing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={!canUndo || isDrawing}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                canUndo && !isDrawing
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
              <span>Undo</span>
            </button>
            
            <button
              onClick={redo}
              disabled={!canRedo || isDrawing}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                canRedo && !isDrawing
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
              <span>Redo</span>
            </button>
          </div>

          <button
            onClick={clearSelections}
            disabled={selections.length === 0 || isDrawing}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors ${
              selections.length > 0 && !isDrawing
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title="Clear all selections"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            {isDrawing ? (
              <p>
                <strong>Drawing Mode Active:</strong> Click on the map to add points. Double-click or press Enter to complete. Press Escape to cancel.
              </p>
            ) : (
              <p>
                Select an area type and drawing tool, then click "Start Drawing" or click on the map to begin selecting areas.
                {currentTool === 'rectangle' && ' Click and drag to create a rectangle.'}
                {currentTool === 'polygon' && ' Click to add points and create a custom shape.'}
              </p>
            )}
          </div>
          
          {selections.length > 0 && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <p>
                <strong>Tip:</strong> Your selections update measurements in real-time. Click "Apply & Save" below to permanently save your manual measurements.
              </p>
            </div>
          )}
        </div>

        {/* Start Drawing Button */}
        {!isDrawing && (
          <button
            onClick={startDrawing}
            className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Start Drawing {AREA_LABELS[currentAreaType]}
          </button>
        )}
      </div>
    </div>
  )
}