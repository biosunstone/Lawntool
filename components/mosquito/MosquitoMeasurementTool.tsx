'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  Home, 
  Building, 
  Trees, 
  Layers, 
  Calendar,
  Ruler,
  AlertTriangle,
  Check,
  Edit2,
  Trash2,
  Save,
  Send,
  Plus,
  Undo,
  Redo,
  MapPin,
  Shield,
  Droplets
} from 'lucide-react'
import { Coordinate } from '@/types/manualSelection'
import { 
  MeasurementMode, 
  YardSection,
  ExclusionZone,
  LinearMeasurement,
  BandMeasurement,
  ComplianceResult
} from '@/lib/mosquito/PerimeterMeasurementService'
import toast from 'react-hot-toast'

// Dynamic imports for map components
const MosquitoMap = dynamic(() => import('./MosquitoMap'), { ssr: false })
const ExclusionZoneManager = dynamic(() => import('./ExclusionZoneManager'), { ssr: false })
const CompliancePanel = dynamic(() => import('./CompliancePanel'), { ssr: false })

interface MosquitoMeasurementToolProps {
  propertyId: string
  businessId: string
  address: string
  center: { lat: number; lng: number }
  onQuoteGenerated?: (quoteId: string) => void
}

interface Geometry {
  id: string
  name: string
  type: MeasurementMode
  coordinates: Coordinate[]
  linearFeet: number
  locked: boolean
  visible: boolean
}

export default function MosquitoMeasurementTool({
  propertyId,
  businessId,
  address,
  center,
  onQuoteGenerated
}: MosquitoMeasurementToolProps) {
  // State Management
  const [mode, setMode] = useState<MeasurementMode>('lot_perimeter')
  const [yardSection, setYardSection] = useState<YardSection>('full')
  const [bandWidth, setBandWidth] = useState(5) // Default 5 ft band
  const [useHybrid, setUseHybrid] = useState(true)
  const [showHistorical, setShowHistorical] = useState(false)
  const [imageryDate, setImageryDate] = useState(new Date())
  
  // Geometries and Measurements
  const [geometries, setGeometries] = useState<Geometry[]>([])
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>([])
  const [selectedGeometry, setSelectedGeometry] = useState<string | null>(null)
  const [totalLinearFeet, setTotalLinearFeet] = useState(0)
  const [bandMeasurement, setBandMeasurement] = useState<BandMeasurement | null>(null)
  
  // Compliance
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null)
  const [showCompliance, setShowCompliance] = useState(false)
  
  // History
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)
  
  // Obstacles
  const [obstacles, setObstacles] = useState({
    gates: 0,
    narrowAccess: false,
    steepSlopes: false,
    denseVegetation: false,
    notes: ''
  })
  
  // Loading states
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  
  // Calculate total linear feet whenever geometries change
  useEffect(() => {
    const total = geometries
      .filter(g => g.type !== 'area_band')
      .reduce((sum, g) => sum + g.linearFeet, 0)
    setTotalLinearFeet(total)
  }, [geometries])
  
  // Handle measurement completion
  const handleMeasurementComplete = useCallback((measurement: LinearMeasurement, name?: string) => {
    const newGeometry: Geometry = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || getDefaultName(mode),
      type: mode,
      coordinates: measurement.coordinates,
      linearFeet: measurement.linearFeet,
      locked: false,
      visible: true
    }
    
    setGeometries(prev => [...prev, newGeometry])
    
    // Save to history
    saveToHistory('Add geometry', newGeometry)
    
    // Show success message
    toast.success(`Added ${newGeometry.name}: ${measurement.linearFeet.toFixed(1)} ft`)
  }, [mode])
  
  // Get default name for geometry
  const getDefaultName = (type: MeasurementMode): string => {
    const names: Record<MeasurementMode, string> = {
      lot_perimeter: `Lot Perimeter ${yardSection === 'backyard' ? '(Backyard)' : yardSection === 'frontyard' ? '(Frontyard)' : ''}`,
      structure_perimeter: 'Structure Perimeter',
      custom_path: 'Custom Path',
      area_band: 'Treatment Band'
    }
    return names[type]
  }
  
  // Handle geometry editing
  const handleEditGeometry = useCallback((geometryId: string) => {
    setSelectedGeometry(geometryId)
    // Enable editing mode on map
  }, [])
  
  // Handle geometry deletion
  const handleDeleteGeometry = useCallback((geometryId: string) => {
    const geometry = geometries.find(g => g.id === geometryId)
    if (!geometry) return
    
    // Show confirmation with highlighting
    if (confirm(`Delete "${geometry.name}"? This will remove ${geometry.linearFeet.toFixed(1)} ft from the total.`)) {
      setGeometries(prev => prev.filter(g => g.id !== geometryId))
      saveToHistory('Delete geometry', geometry)
      toast.success(`Deleted ${geometry.name}`)
    }
  }, [geometries])
  
  // Handle geometry rename
  const handleRenameGeometry = useCallback((geometryId: string, newName: string) => {
    setGeometries(prev => prev.map(g => 
      g.id === geometryId ? { ...g, name: newName } : g
    ))
    saveToHistory('Rename geometry', { id: geometryId, newName })
  }, [])
  
  // Handle exclusion zone management
  const handleAddExclusion = useCallback((zone: ExclusionZone) => {
    setExclusionZones(prev => [...prev, zone])
    saveToHistory('Add exclusion zone', zone)
    toast.success(`Added ${zone.name} exclusion zone`)
    
    // Recalculate band if exists
    if (bandWidth > 0) {
      calculateTreatmentBand()
    }
  }, [bandWidth])
  
  const handleEditExclusion = useCallback((zoneId: string, updates: Partial<ExclusionZone>) => {
    setExclusionZones(prev => prev.map(z => 
      z.id === zoneId ? { ...z, ...updates } : z
    ))
    saveToHistory('Edit exclusion zone', { id: zoneId, updates })
    
    // Recalculate band
    if (bandWidth > 0) {
      calculateTreatmentBand()
    }
  }, [bandWidth])
  
  const handleDeleteExclusion = useCallback((zoneId: string) => {
    const zone = exclusionZones.find(z => z.id === zoneId)
    if (!zone) return
    
    if (confirm(`Delete "${zone.name}" exclusion zone?`)) {
      setExclusionZones(prev => prev.filter(z => z.id !== zoneId))
      saveToHistory('Delete exclusion zone', zone)
      toast.success(`Deleted ${zone.name}`)
      
      // Recalculate band
      if (bandWidth > 0) {
        calculateTreatmentBand()
      }
    }
  }, [exclusionZones, bandWidth])
  
  // Calculate treatment band
  const calculateTreatmentBand = useCallback(async () => {
    if (geometries.length === 0) {
      toast.error('No perimeter measurements to calculate band from')
      return
    }
    
    setIsMeasuring(true)
    
    try {
      const response = await fetch('/api/mosquito/measurements/calculate-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometries,
          exclusionZones,
          bandWidth
        })
      })
      
      const data = await response.json()
      setBandMeasurement(data.band)
      
      toast.success(`Treatment band: ${data.band.netArea.toLocaleString()} sq ft`)
    } catch (error) {
      console.error('Failed to calculate band:', error)
      toast.error('Failed to calculate treatment band')
    } finally {
      setIsMeasuring(false)
    }
  }, [geometries, exclusionZones, bandWidth])
  
  // Check compliance
  const checkCompliance = useCallback(async () => {
    setIsMeasuring(true)
    
    try {
      const response = await fetch('/api/mosquito/measurements/check-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          geometries,
          exclusionZones
        })
      })
      
      const data = await response.json()
      setComplianceResult(data.compliance)
      setShowCompliance(true)
      
      if (!data.compliance.passed) {
        toast.error(`${data.compliance.violations.length} compliance issues found`)
      } else {
        toast.success('All compliance checks passed!')
      }
    } catch (error) {
      console.error('Failed to check compliance:', error)
      toast.error('Failed to check compliance')
    } finally {
      setIsMeasuring(false)
    }
  }, [propertyId, geometries, exclusionZones])
  
  // Apply auto-fixes for compliance
  const handleAutoFix = useCallback(async (adjustments?: any[]) => {
    if (!complianceResult) return
    
    const adjustmentsToApply = adjustments || complianceResult.autoAdjustments
    
    try {
      const response = await fetch('/api/mosquito/measurements/apply-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometries,
          exclusionZones,
          adjustments: adjustmentsToApply
        })
      })
      
      const data = await response.json()
      setGeometries(data.geometries)
      setExclusionZones(data.exclusionZones)
      
      toast.success('Applied compliance adjustments')
      
      // Re-check compliance
      checkCompliance()
    } catch (error) {
      console.error('Failed to apply adjustments:', error)
      toast.error('Failed to apply adjustments')
    }
  }, [complianceResult, geometries, exclusionZones, checkCompliance])
  
  // Save measurement
  const saveMeasurement = useCallback(async () => {
    if (geometries.length === 0) {
      toast.error('No measurements to save')
      return
    }
    
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/mosquito/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          businessId,
          address,
          geometries,
          exclusionZones,
          bandWidth: bandMeasurement ? bandWidth : undefined,
          obstacles,
          imagerySource: {
            date: imageryDate,
            historical: showHistorical,
            resolution: 0.3 // meters
          }
        })
      })
      
      const data = await response.json()
      toast.success('Measurement saved successfully')
      
      return data.id
    } catch (error) {
      console.error('Failed to save measurement:', error)
      toast.error('Failed to save measurement')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [propertyId, businessId, address, geometries, exclusionZones, bandMeasurement, bandWidth, obstacles, imageryDate, showHistorical])
  
  // Generate quote
  const handleSendToQuote = useCallback(async () => {
    // First save the measurement
    const measurementId = await saveMeasurement()
    if (!measurementId) {
      toast.error('Failed to save measurement before generating quote')
      return
    }
    
    setIsGeneratingQuote(true)
    
    try {
      const response = await fetch('/api/mosquito/measurements/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurementId,
          propertyId,
          businessId,
          totalLinearFeet,
          bandMeasurement,
          exclusionZones,
          obstacles
        })
      })
      
      const data = await response.json()
      toast.success('Quote generated successfully')
      
      if (onQuoteGenerated) {
        onQuoteGenerated(data.quoteId)
      }
    } catch (error) {
      console.error('Failed to generate quote:', error)
      toast.error('Failed to generate quote')
    } finally {
      setIsGeneratingQuote(false)
    }
  }, [saveMeasurement, propertyId, businessId, totalLinearFeet, bandMeasurement, exclusionZones, obstacles, onQuoteGenerated])
  
  // History management
  const saveToHistory = useCallback((action: string, data: any) => {
    const newEntry = {
      action,
      data,
      timestamp: new Date(),
      index: history.length
    }
    
    // Remove future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newEntry)
    
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      // Apply the previous state
      // Implementation depends on the action type
    }
  }, [historyIndex])
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      // Apply the next state
      // Implementation depends on the action type
    }
  }, [historyIndex, history])
  
  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Panel - Map */}
      <div className="flex-1 relative">
        <MosquitoMap
          center={center}
          mode={mode}
          yardSection={yardSection}
          useHybrid={useHybrid}
          showHistorical={showHistorical}
          geometries={geometries}
          exclusionZones={exclusionZones}
          selectedGeometry={selectedGeometry}
          onMeasurementComplete={handleMeasurementComplete}
          onGeometryUpdate={(id, coords) => {
            setGeometries(prev => prev.map(g => 
              g.id === id ? { ...g, coordinates: coords } : g
            ))
          }}
        />
        
        {/* Mode Selector */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Measurement Mode</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('lot_perimeter')}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                mode === 'lot_perimeter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Lot Perimeter</span>
            </button>
            <button
              onClick={() => setMode('structure_perimeter')}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                mode === 'structure_perimeter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Building className="w-4 h-4" />
              <span className="text-sm">Structure</span>
            </button>
            <button
              onClick={() => setMode('custom_path')}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                mode === 'custom_path'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Trees className="w-4 h-4" />
              <span className="text-sm">Custom Path</span>
            </button>
            <button
              onClick={() => setMode('area_band')}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                mode === 'area_band'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm">Area Band</span>
            </button>
          </div>
          
          {/* Yard Section Toggle for Lot Perimeter */}
          {mode === 'lot_perimeter' && (
            <div className="mt-3 pt-3 border-t">
              <label className="text-xs font-medium text-gray-600">Yard Section</label>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => setYardSection('full')}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    yardSection === 'full'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Full
                </button>
                <button
                  onClick={() => setYardSection('backyard')}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    yardSection === 'backyard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Backyard
                </button>
                <button
                  onClick={() => setYardSection('frontyard')}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    yardSection === 'frontyard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Frontyard
                </button>
              </div>
            </div>
          )}
          
          {/* Band Width Control */}
          {mode === 'area_band' && (
            <div className="mt-3 pt-3 border-t">
              <label className="text-xs font-medium text-gray-600">
                Band Width: {bandWidth} ft
              </label>
              <input
                type="range"
                min="3"
                max="15"
                value={bandWidth}
                onChange={(e) => setBandWidth(Number(e.target.value))}
                className="w-full mt-1"
              />
              <button
                onClick={calculateTreatmentBand}
                className="w-full mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Calculate Band Area
              </button>
            </div>
          )}
          
          {/* Hybrid Toggle */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Hybrid Mode</span>
            <button
              onClick={() => setUseHybrid(!useHybrid)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                useHybrid ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  useHybrid ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* Measurement Display */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Linear Feet</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalLinearFeet.toLocaleString()} ft
              </p>
            </div>
            {bandMeasurement && (
              <>
                <div className="border-l pl-4">
                  <p className="text-xs text-gray-500">Treatment Area</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {bandMeasurement.netArea.toLocaleString()} sq ft
                  </p>
                </div>
                <div className="border-l pl-4">
                  <p className="text-xs text-gray-500">Chemical Volume</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {bandMeasurement.chemicalVolume.diluted} gal
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Imagery Controls */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">
              {imageryDate.toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={() => setShowHistorical(!showHistorical)}
            className={`mt-2 text-xs ${
              showHistorical ? 'text-blue-600' : 'text-gray-600'
            } hover:underline`}
          >
            {showHistorical ? 'Using Historical' : 'Use Historical'}
          </button>
        </div>
      </div>
      
      {/* Right Panel - Details */}
      <div className="w-96 bg-white border-l overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Property Measurements</h2>
          <p className="text-sm text-gray-600">{address}</p>
        </div>
        
        {/* Geometry List */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Geometries</h3>
            <div className="flex gap-1">
              <button
                onClick={undo}
                disabled={historyIndex === 0}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex === history.length - 1}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {geometries.map(geometry => (
              <div
                key={geometry.id}
                className={`p-3 rounded-lg border ${
                  selectedGeometry === geometry.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{geometry.name}</p>
                    <p className="text-xs text-gray-600">
                      {geometry.linearFeet.toFixed(1)} ft
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditGeometry(geometry.id)}
                      className="p-1 text-gray-600 hover:text-blue-600"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteGeometry(geometry.id)}
                      className="p-1 text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Exclusion Zones */}
        <div className="p-4 border-b">
          <ExclusionZoneManager
            zones={exclusionZones}
            onAdd={handleAddExclusion}
            onEdit={handleEditExclusion}
            onDelete={handleDeleteExclusion}
          />
        </div>
        
        {/* Obstacles */}
        <div className="p-4 border-b">
          <h3 className="font-medium mb-3">Obstacles & Notes</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Gates</span>
              <input
                type="number"
                min="0"
                value={obstacles.gates}
                onChange={(e) => setObstacles(prev => ({ ...prev, gates: Number(e.target.value) }))}
                className="w-16 px-2 py-1 border rounded text-sm"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={obstacles.narrowAccess}
                onChange={(e) => setObstacles(prev => ({ ...prev, narrowAccess: e.target.checked }))}
              />
              <span className="text-sm">Narrow Access</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={obstacles.steepSlopes}
                onChange={(e) => setObstacles(prev => ({ ...prev, steepSlopes: e.target.checked }))}
              />
              <span className="text-sm">Steep Slopes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={obstacles.denseVegetation}
                onChange={(e) => setObstacles(prev => ({ ...prev, denseVegetation: e.target.checked }))}
              />
              <span className="text-sm">Dense Vegetation</span>
            </label>
            <textarea
              placeholder="Additional notes..."
              value={obstacles.notes}
              onChange={(e) => setObstacles(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full mt-2 px-3 py-2 border rounded text-sm"
              rows={3}
            />
          </div>
        </div>
        
        {/* Compliance */}
        {showCompliance && complianceResult && (
          <div className="p-4 border-b">
            <CompliancePanel
              result={complianceResult}
              onAutoFix={handleAutoFix}
              onClose={() => setShowCompliance(false)}
            />
          </div>
        )}
        
        {/* Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={checkCompliance}
            disabled={geometries.length === 0}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Check Compliance
          </button>
          
          <button
            onClick={saveMeasurement}
            disabled={geometries.length === 0 || isSaving}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Measurement'}
          </button>
          
          <button
            onClick={handleSendToQuote}
            disabled={geometries.length === 0 || isGeneratingQuote}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isGeneratingQuote ? 'Generating...' : 'Send to Quote'}
          </button>
        </div>
      </div>
    </div>
  )
}