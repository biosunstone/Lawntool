# Mosquito Control Perimeter Measurement - Implementation Plan

## Executive Summary
This plan addresses the critical need for accurate perimeter-based measurements in mosquito control operations, focusing on barrier spray applications along property boundaries, structures, and vegetation lines. The solution prioritizes linear feet measurements over area, implements exclusion zones with regulatory buffers, and ensures compliance with local pesticide application regulations.

## Current Issues Analysis
Based on the screenshot (12072 Woodbine Avenue, Gormley, ON):
- Current measurement: 695.87 ft perimeter, 0.67 acres
- Required accuracy: Should show ¾ acres (32,670 sq ft)
- Perimeter measurement is critical for chemical volume calculations
- Need clear distinction between treatment zones and exclusion areas

## Architecture Overview

### System Components
```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Map Canvas  │  │ Mode Selector │  │ Details Panel    │  │
│  │ - Google    │  │ - Lot         │  │ - Geometry List  │  │
│  │   Earth     │  │ - Structure   │  │ - Exclusions     │  │
│  │ - Drawing   │  │ - Custom Path │  │ - Buffers        │  │
│  │ - Editing   │  │ - Area Band   │  │ - Quote Builder  │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Services Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PerimeterMeasurementService                          │  │
│  │ - Linear calculation with terrain                    │  │
│  │ - Band area computation                              │  │
│  │ - Exclusion zone management                          │  │
│  │ - Compliance validation                              │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     Backend (API)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ POST /api/mosquito/measurements                      │  │
│  │ POST /api/mosquito/measurements/{id}/version        │  │
│  │ POST /api/mosquito/measurements/validate-compliance │  │
│  │ POST /api/mosquito/measurements/quote               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Core Perimeter Measurement System (Week 1-2)

### 1.1 Enhanced Data Model
```typescript
// models/MosquitoMeasurement.ts
interface MosquitoMeasurement {
  id: string
  propertyId: string
  businessId: string
  
  // Geometry data
  geometries: MeasurementGeometry[]
  exclusionZones: ExclusionZone[]
  
  // Measurement results
  measurements: {
    lotPerimeter: LinearMeasurement
    structurePerimeter: LinearMeasurement
    customPaths: LinearMeasurement[]
    treatmentBand: BandMeasurement
    totalLinearFeet: number
    totalTreatmentArea: number
  }
  
  // Metadata
  imagerySource: {
    provider: 'google_earth'
    date: Date
    resolution: number
    historical: boolean
  }
  
  // Compliance
  compliance: {
    passed: boolean
    violations: ComplianceViolation[]
    autoAdjustments: Adjustment[]
  }
  
  // Versioning
  version: number
  versions: MeasurementVersion[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface MeasurementGeometry {
  id: string
  name: string // "Backyard perimeter", "North hedge line"
  type: 'lot_perimeter' | 'structure_perimeter' | 'custom_path' | 'vegetation_line'
  coordinates: Coordinate[] // GeoJSON LineString or Polygon
  
  // Measurements
  linearFeet: number
  linearMeters: number
  slopeAdjustedLength: number
  elevationProfile: ElevationPoint[]
  
  // Properties
  isBackyardOnly: boolean
  isFrontyardOnly: boolean
  includesNeighborBoundary: boolean
  
  // Editing
  locked: boolean
  simplified: boolean
  snapConfidence: number
}

interface ExclusionZone {
  id: string
  name: string // "Pool", "Garden", "Pond"
  type: 'pool' | 'pond' | 'garden' | 'beehive' | 'playset' | 'water_feature' | 'neighbor_buffer'
  geometry: Coordinate[] // Polygon
  
  // Buffer configuration
  bufferDistance: {
    value: number
    unit: 'feet' | 'meters'
    regulatory: boolean // True if required by law
    regulation?: string // "EPA Water Feature Buffer"
  }
  
  // Computed buffer polygon
  bufferedGeometry: Coordinate[]
  affectedLinearFeet: number // How much perimeter is affected
}

interface BandMeasurement {
  bandWidth: number // feet
  totalArea: number // sq ft
  segments: {
    geometryId: string
    linearFeet: number
    area: number
    excluded: boolean
  }[]
  chemicalVolume: {
    concentrate: number // oz
    diluted: number // gallons
    applicationRate: string // "1 oz per 1000 sq ft"
  }
}
```

### 1.2 Perimeter Measurement Service
```typescript
// lib/mosquito/PerimeterMeasurementService.ts
export class PerimeterMeasurementService {
  private earthEngine: GoogleEarthService
  private complianceEngine: ComplianceEngine
  
  /**
   * Measure lot perimeter with parcel boundary snapping
   */
  async measureLotPerimeter(
    address: string,
    coordinates: Coordinate[],
    options: {
      backyardOnly?: boolean
      frontyardOnly?: boolean
      excludeNeighbors?: boolean
      snapToParcel?: boolean
    }
  ): Promise<LinearMeasurement> {
    // Get parcel boundaries if available
    const parcelData = await this.getParcelBoundaries(address)
    
    // Apply snapping if requested
    let finalCoordinates = coordinates
    if (options.snapToParcel && parcelData) {
      finalCoordinates = await this.snapToParcelBoundaries(
        coordinates,
        parcelData.boundaries
      )
    }
    
    // Filter by yard section
    if (options.backyardOnly) {
      finalCoordinates = this.filterBackyardOnly(finalCoordinates, parcelData)
    }
    if (options.frontyardOnly) {
      finalCoordinates = this.filterFrontyardOnly(finalCoordinates, parcelData)
    }
    
    // Calculate linear measurements
    const linearFeet = await this.calculateLinearDistance(finalCoordinates, true)
    const slopeAdjusted = await this.applySlopeCorrection(finalCoordinates)
    
    return {
      coordinates: finalCoordinates,
      linearFeet,
      linearMeters: linearFeet * 0.3048,
      slopeAdjustedLength: slopeAdjusted,
      segments: this.segmentizePerimeter(finalCoordinates),
      confidence: this.calculateMeasurementConfidence(finalCoordinates, parcelData)
    }
  }
  
  /**
   * Auto-detect and measure structure perimeter
   */
  async measureStructurePerimeter(
    center: Coordinate,
    imagery: ImageryData
  ): Promise<LinearMeasurement> {
    // Use computer vision to detect building footprint
    const footprint = await this.detectBuildingFootprint(imagery, center)
    
    if (!footprint.detected) {
      throw new Error('Unable to detect structure. Please draw manually.')
    }
    
    // Simplify and regularize building outline
    const simplified = this.simplifyBuildingOutline(footprint.vertices)
    const regularized = this.regularizeBuildingCorners(simplified)
    
    // Calculate perimeter
    const linearFeet = await this.calculateLinearDistance(regularized, true)
    
    return {
      coordinates: regularized,
      linearFeet,
      linearMeters: linearFeet * 0.3048,
      confidence: footprint.confidence,
      buildingType: footprint.buildingType, // 'residential', 'garage', 'shed'
      stories: footprint.estimatedStories
    }
  }
  
  /**
   * Measure custom vegetation/fence line path
   */
  async measureCustomPath(
    pathPoints: Coordinate[],
    options: {
      snapToEdges?: boolean
      smoothing?: 'none' | 'light' | 'moderate' | 'heavy'
      minSegmentLength?: number // feet
    }
  ): Promise<LinearMeasurement> {
    let processedPath = [...pathPoints]
    
    // Apply edge snapping if requested
    if (options.snapToEdges) {
      const edges = await this.detectVegetationAndFenceLines(pathPoints)
      processedPath = await this.snapToDetectedEdges(pathPoints, edges)
    }
    
    // Apply smoothing
    if (options.smoothing && options.smoothing !== 'none') {
      processedPath = this.smoothPath(processedPath, options.smoothing)
    }
    
    // Enforce minimum segment length
    if (options.minSegmentLength) {
      processedPath = this.enforceMinimumSegments(
        processedPath,
        options.minSegmentLength
      )
    }
    
    // Calculate distance
    const linearFeet = await this.calculateLinearDistance(processedPath, false)
    
    return {
      coordinates: processedPath,
      linearFeet,
      linearMeters: linearFeet * 0.3048,
      pathType: this.classifyPathType(processedPath), // 'fence', 'hedge', 'tree_line'
      segments: this.segmentizePath(processedPath)
    }
  }
  
  /**
   * Calculate treatment band area from perimeter
   */
  calculateTreatmentBand(
    perimeter: LinearMeasurement,
    bandWidth: number, // feet
    exclusionZones: ExclusionZone[]
  ): BandMeasurement {
    // Create band polygon by offsetting perimeter
    const bandPolygon = this.createBandPolygon(
      perimeter.coordinates,
      bandWidth
    )
    
    // Calculate base area
    const baseArea = this.calculatePolygonArea(bandPolygon)
    
    // Subtract exclusion zones
    let excludedArea = 0
    let affectedSegments: any[] = []
    
    for (const exclusion of exclusionZones) {
      const bufferedExclusion = this.bufferPolygon(
        exclusion.geometry,
        exclusion.bufferDistance.value
      )
      
      // Find intersection with band
      const intersection = this.polygonIntersection(bandPolygon, bufferedExclusion)
      if (intersection) {
        excludedArea += this.calculatePolygonArea(intersection)
        
        // Track which segments are affected
        const affected = this.findAffectedSegments(
          perimeter.segments,
          bufferedExclusion
        )
        affectedSegments.push(...affected)
      }
    }
    
    // Calculate chemical requirements
    const netArea = baseArea - excludedArea
    const chemical = this.calculateChemicalVolume(netArea)
    
    return {
      bandWidth,
      totalArea: netArea,
      segments: perimeter.segments.map(seg => ({
        ...seg,
        area: seg.linearFeet * bandWidth,
        excluded: affectedSegments.includes(seg.id)
      })),
      chemicalVolume: chemical
    }
  }
  
  /**
   * Calculate chemical volume based on treatment area
   */
  private calculateChemicalVolume(areaSqFt: number): any {
    // Standard application rates for mosquito control
    const CONCENTRATE_RATE = 1.0 // oz per 1000 sq ft
    const DILUTION_RATIO = 1 / 64 // 1:64 concentrate to water
    
    const concentrate = (areaSqFt / 1000) * CONCENTRATE_RATE
    const totalVolume = concentrate / DILUTION_RATIO
    const gallons = totalVolume / 128 // oz to gallons
    
    return {
      concentrate: Math.ceil(concentrate * 10) / 10, // Round up to 0.1 oz
      diluted: Math.ceil(gallons * 10) / 10, // Round up to 0.1 gallons
      applicationRate: `${CONCENTRATE_RATE} oz per 1000 sq ft`
    }
  }
  
  /**
   * Validate compliance with regulations
   */
  async validateCompliance(
    measurement: MosquitoMeasurement,
    regulations: RegulationSet
  ): Promise<ComplianceResult> {
    const violations: ComplianceViolation[] = []
    const autoAdjustments: Adjustment[] = []
    
    // Check water feature buffers
    for (const exclusion of measurement.exclusionZones) {
      if (exclusion.type === 'pond' || exclusion.type === 'water_feature') {
        const requiredBuffer = regulations.waterFeatureBuffer[exclusion.type]
        
        if (exclusion.bufferDistance.value < requiredBuffer) {
          violations.push({
            type: 'insufficient_buffer',
            zone: exclusion.name,
            required: requiredBuffer,
            actual: exclusion.bufferDistance.value,
            regulation: regulations.waterFeatureRegulation
          })
          
          // Create auto-adjustment
          autoAdjustments.push({
            type: 'increase_buffer',
            zoneId: exclusion.id,
            newValue: requiredBuffer,
            reason: `Comply with ${regulations.waterFeatureRegulation}`
          })
        }
      }
    }
    
    // Check property line setbacks
    const setback = regulations.propertyLineSetback
    for (const geometry of measurement.geometries) {
      if (geometry.includesNeighborBoundary) {
        const adjusted = this.offsetFromPropertyLine(
          geometry.coordinates,
          setback
        )
        
        if (adjusted.length !== geometry.coordinates.length) {
          violations.push({
            type: 'property_line_violation',
            geometry: geometry.name,
            required: setback,
            regulation: regulations.propertyLineRegulation
          })
          
          autoAdjustments.push({
            type: 'offset_from_property_line',
            geometryId: geometry.id,
            distance: setback,
            newCoordinates: adjusted
          })
        }
      }
    }
    
    // Check wind speed restrictions
    if (regulations.maxWindSpeed && measurement.weather?.windSpeed > regulations.maxWindSpeed) {
      violations.push({
        type: 'wind_speed_exceeded',
        maxAllowed: regulations.maxWindSpeed,
        actual: measurement.weather.windSpeed,
        regulation: 'EPA Wind Speed Restriction'
      })
    }
    
    return {
      passed: violations.length === 0,
      violations,
      autoAdjustments,
      complianceScore: this.calculateComplianceScore(violations)
    }
  }
}
```

## Phase 2: Advanced UI Components (Week 2-3)

### 2.1 Perimeter Measurement Interface
```typescript
// components/mosquito/PerimeterMeasurementTool.tsx
export const PerimeterMeasurementTool: React.FC = () => {
  const [mode, setMode] = useState<MeasurementMode>('lot_perimeter')
  const [bandWidth, setBandWidth] = useState(5) // Default 5 ft band
  const [yardSection, setYardSection] = useState<'full' | 'backyard' | 'frontyard'>('full')
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>([])
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([])
  
  return (
    <div className="flex h-full">
      {/* Left Panel - Map */}
      <div className="flex-1 relative">
        <MosquitoMap
          mode={mode}
          onMeasurementComplete={handleMeasurement}
          exclusionZones={exclusionZones}
        />
        
        {/* Mode Selector */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
          <MeasurementModeSelector
            mode={mode}
            onChange={setMode}
            options={[
              { value: 'lot_perimeter', label: 'Lot Boundary', icon: <HomeIcon /> },
              { value: 'structure_perimeter', label: 'Structure', icon: <BuildingIcon /> },
              { value: 'custom_path', label: 'Vegetation/Fence', icon: <TreeIcon /> },
              { value: 'area_band', label: 'Treatment Band', icon: <BandIcon /> }
            ]}
          />
          
          {/* Yard Section Toggle */}
          {mode === 'lot_perimeter' && (
            <YardSectionToggle
              value={yardSection}
              onChange={setYardSection}
            />
          )}
          
          {/* Band Width Slider */}
          {mode === 'area_band' && (
            <BandWidthControl
              value={bandWidth}
              onChange={setBandWidth}
              min={3}
              max={15}
              unit="ft"
            />
          )}
        </div>
        
        {/* Measurement Display */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
          <MeasurementDisplay
            linearFeet={currentMeasurement?.linearFeet}
            bandArea={currentMeasurement?.bandArea}
            chemicalVolume={currentMeasurement?.chemicalVolume}
          />
        </div>
        
        {/* Imagery Controls */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <ImageryControls
            currentDate={imageryDate}
            onHistoricalToggle={toggleHistorical}
            onDateChange={changeImageryDate}
          />
        </div>
      </div>
      
      {/* Right Panel - Details */}
      <div className="w-96 bg-gray-50 border-l overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Geometry List */}
          <GeometryList
            geometries={measurements}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRename={handleRename}
          />
          
          {/* Exclusion Zone Manager */}
          <ExclusionZoneManager
            zones={exclusionZones}
            onAdd={handleAddExclusion}
            onEdit={handleEditExclusion}
            onDelete={handleDeleteExclusion}
            regulations={currentRegulations}
          />
          
          {/* Compliance Status */}
          <CompliancePanel
            status={complianceStatus}
            violations={violations}
            onAutoFix={handleAutoFix}
          />
          
          {/* Quote Builder */}
          <QuoteBuilder
            measurements={measurements}
            exclusions={exclusionZones}
            bandWidth={bandWidth}
            onSendToQuote={handleSendToQuote}
          />
        </div>
      </div>
    </div>
  )
}
```

### 2.2 Exclusion Zone Component
```typescript
// components/mosquito/ExclusionZoneManager.tsx
export const ExclusionZoneManager: React.FC = ({ zones, onAdd, regulations }) => {
  const [showAddModal, setShowAddModal] = useState(false)
  
  const bufferPresets = {
    pool: { default: 10, regulatory: false },
    pond: { default: 25, regulatory: true, regulation: 'EPA Water Buffer' },
    garden: { default: 10, regulatory: false },
    beehive: { default: 25, regulatory: true, regulation: 'Pollinator Protection' },
    playset: { default: 15, regulatory: false },
    water_feature: { default: 100, regulatory: true, regulation: 'State Water Protection' },
    neighbor_buffer: { default: 5, regulatory: false }
  }
  
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Exclusion Zones</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
        >
          Add Zone
        </button>
      </div>
      
      {/* Zone List */}
      <div className="space-y-2">
        {zones.map(zone => (
          <ExclusionZoneItem
            key={zone.id}
            zone={zone}
            preset={bufferPresets[zone.type]}
            onEdit={() => onEdit(zone)}
            onDelete={() => onDelete(zone.id)}
          />
        ))}
      </div>
      
      {/* Regulatory Notice */}
      {zones.some(z => bufferPresets[z.type]?.regulatory) && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
          <p className="text-xs text-amber-800">
            <strong>Regulatory Buffers Applied:</strong> Some zones have mandatory 
            buffer distances per local/state regulations.
          </p>
        </div>
      )}
      
      {/* Add Zone Modal */}
      {showAddModal && (
        <AddExclusionZoneModal
          presets={bufferPresets}
          onAdd={(zone) => {
            onAdd(zone)
            setShowAddModal(false)
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
```

### 2.3 Compliance Dashboard
```typescript
// components/mosquito/CompliancePanel.tsx
export const CompliancePanel: React.FC = ({ status, violations, onAutoFix }) => {
  const getStatusColor = () => {
    if (status === 'passed') return 'green'
    if (status === 'warning') return 'amber'
    return 'red'
  }
  
  return (
    <div className={`bg-white rounded-lg p-4 border-2 border-${getStatusColor()}-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === 'passed' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <h3 className="text-lg font-semibold">
            Compliance {status === 'passed' ? 'Passed' : 'Issues'}
          </h3>
        </div>
        
        {violations.length > 0 && (
          <button
            onClick={onAutoFix}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
          >
            Auto-Fix All
          </button>
        )}
      </div>
      
      {/* Violations List */}
      {violations.length > 0 && (
        <div className="space-y-2">
          {violations.map((violation, index) => (
            <div key={index} className="p-2 bg-red-50 rounded text-sm">
              <p className="font-medium text-red-900">{violation.type}</p>
              <p className="text-red-700">{violation.description}</p>
              <p className="text-xs text-red-600 mt-1">
                Regulation: {violation.regulation}
              </p>
              <button
                onClick={() => onAutoFix(violation)}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Apply Auto-Fix (adjust to {violation.required} ft)
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Compliance Score */}
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Compliance Score</span>
          <span className={`font-bold text-${getStatusColor()}-600`}>
            {Math.round(complianceScore * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
```

## Phase 3: Backend API Implementation (Week 3-4)

### 3.1 API Routes
```typescript
// app/api/mosquito/measurements/route.ts
export async function POST(request: Request) {
  const data = await request.json()
  const { geometries, exclusionZones, bandWidth, propertyId } = data
  
  const service = new PerimeterMeasurementService()
  
  // Process each geometry
  const processedGeometries = []
  let totalLinearFeet = 0
  
  for (const geometry of geometries) {
    let result
    
    switch (geometry.type) {
      case 'lot_perimeter':
        result = await service.measureLotPerimeter(
          geometry.coordinates,
          geometry.options
        )
        break
        
      case 'structure_perimeter':
        result = await service.measureStructurePerimeter(
          geometry.center,
          geometry.imagery
        )
        break
        
      case 'custom_path':
        result = await service.measureCustomPath(
          geometry.coordinates,
          geometry.options
        )
        break
    }
    
    processedGeometries.push(result)
    totalLinearFeet += result.linearFeet
  }
  
  // Calculate treatment band if specified
  let bandMeasurement = null
  if (bandWidth) {
    bandMeasurement = service.calculateTreatmentBand(
      processedGeometries,
      bandWidth,
      exclusionZones
    )
  }
  
  // Validate compliance
  const compliance = await service.validateCompliance(
    { geometries: processedGeometries, exclusionZones },
    await getRegulations(propertyId)
  )
  
  // Save to database
  const measurement = await MosquitoMeasurement.create({
    propertyId,
    geometries: processedGeometries,
    exclusionZones,
    measurements: {
      totalLinearFeet,
      treatmentBand: bandMeasurement
    },
    compliance,
    version: 1
  })
  
  return NextResponse.json(measurement)
}

// app/api/mosquito/measurements/[id]/version/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const data = await request.json()
  
  // Get current measurement
  const current = await MosquitoMeasurement.findById(params.id)
  
  // Create version diff
  const diff = createDiff(current, data)
  
  // Save new version
  const newVersion = {
    version: current.version + 1,
    changes: diff,
    timestamp: new Date(),
    userId: getUserId(request)
  }
  
  current.versions.push(newVersion)
  current.version = newVersion.version
  
  // Update current data
  Object.assign(current, data)
  await current.save()
  
  return NextResponse.json({
    version: newVersion,
    measurement: current
  })
}

// app/api/mosquito/measurements/quote/route.ts
export async function POST(request: Request) {
  const { measurementId, customerId, notes } = await request.json()
  
  // Get measurement
  const measurement = await MosquitoMeasurement.findById(measurementId)
  
  // Generate quote data
  const quoteData = {
    customer: customerId,
    service: 'Mosquito Barrier Treatment',
    
    measurements: {
      lotPerimeter: measurement.measurements.lotPerimeter,
      structurePerimeter: measurement.measurements.structurePerimeter,
      customPaths: measurement.measurements.customPaths,
      totalLinearFeet: measurement.measurements.totalLinearFeet,
      treatmentArea: measurement.measurements.treatmentBand?.totalArea,
      bandWidth: measurement.measurements.treatmentBand?.bandWidth
    },
    
    chemical: measurement.measurements.treatmentBand?.chemicalVolume,
    
    exclusions: measurement.exclusionZones.map(zone => ({
      type: zone.type,
      name: zone.name,
      bufferDistance: zone.bufferDistance.value
    })),
    
    pricing: calculatePricing(measurement),
    
    compliance: {
      passed: measurement.compliance.passed,
      adjustmentsRequired: measurement.compliance.autoAdjustments.length > 0
    },
    
    notes,
    
    generatedFrom: {
      measurementId: measurement.id,
      version: measurement.version
    }
  }
  
  // Create quote
  const quote = await Quote.create(quoteData)
  
  return NextResponse.json({
    quoteId: quote.id,
    quoteUrl: `/quotes/${quote.id}`,
    measurement: measurement.id
  })
}
```

### 3.2 Geometry Operations Service
```typescript
// lib/mosquito/GeometryOperations.ts
export class GeometryOperations {
  /**
   * Create offset buffer around line or polygon
   */
  offsetBuffer(
    geometry: Coordinate[],
    distance: number,
    side: 'left' | 'right' | 'both' = 'both'
  ): Coordinate[] {
    // Use Turf.js or custom implementation
    const buffered = buffer(lineString(geometry), distance, {
      units: 'feet',
      side
    })
    
    return buffered.geometry.coordinates[0]
  }
  
  /**
   * Simplify line while preserving shape
   */
  simplifyLine(
    line: Coordinate[],
    tolerance: number = 2 // feet
  ): Coordinate[] {
    // Douglas-Peucker algorithm
    return simplify(lineString(line), {
      tolerance: tolerance / 3280.84, // Convert feet to km
      highQuality: true
    }).geometry.coordinates
  }
  
  /**
   * Calculate difference between polygons
   */
  polygonDifference(
    polygon: Coordinate[],
    subtractPolygon: Coordinate[]
  ): Coordinate[] | null {
    const diff = difference(
      polygon(polygon),
      polygon(subtractPolygon)
    )
    
    return diff ? diff.geometry.coordinates[0] : null
  }
  
  /**
   * Union multiple polygons
   */
  polygonUnion(polygons: Coordinate[][]): Coordinate[] {
    let result = polygon(polygons[0])
    
    for (let i = 1; i < polygons.length; i++) {
      result = union(result, polygon(polygons[i]))
    }
    
    return result.geometry.coordinates[0]
  }
  
  /**
   * Find line segments within polygon
   */
  segmentsWithinPolygon(
    line: Coordinate[],
    polygon: Coordinate[]
  ): LineSegment[] {
    const segments: LineSegment[] = []
    
    for (let i = 0; i < line.length - 1; i++) {
      const segment = [line[i], line[i + 1]]
      const midpoint = {
        lat: (segment[0].lat + segment[1].lat) / 2,
        lng: (segment[0].lng + segment[1].lng) / 2
      }
      
      if (this.isPointInPolygon(midpoint, polygon)) {
        segments.push({
          start: segment[0],
          end: segment[1],
          length: this.calculateDistance(segment[0], segment[1]),
          within: true
        })
      }
    }
    
    return segments
  }
}
```

## Phase 4: Mobile Optimization (Week 4)

### 4.1 Touch-Friendly Controls
```typescript
// components/mosquito/mobile/MobileMeasurementTool.tsx
export const MobileMeasurementTool: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'map' | 'details'>('map')
  
  return (
    <div className="h-full flex flex-col">
      {/* Swipeable Panels */}
      <SwipeableViews
        index={activePanel === 'map' ? 0 : 1}
        onChangeIndex={(index) => setActivePanel(index === 0 ? 'map' : 'details')}
      >
        {/* Map Panel */}
        <div className="h-full relative">
          <MobileMap
            onVertexTap={handleVertexEdit}
            touchHandleSize={44} // Minimum 44px for touch targets
          />
          
          {/* Floating Action Buttons */}
          <div className="absolute bottom-20 right-4 space-y-2">
            <FloatingButton
              icon={<RulerIcon />}
              label="Measure"
              onClick={() => setMode('measure')}
            />
            <FloatingButton
              icon={<ExclusionIcon />}
              label="Exclusion"
              onClick={() => setMode('exclusion')}
            />
          </div>
          
          {/* Bottom Sheet for Measurements */}
          <BottomSheet
            isOpen={showMeasurements}
            onClose={() => setShowMeasurements(false)}
            snapPoints={[100, 300, '50%']}
          >
            <MeasurementSummary
              linearFeet={totalLinearFeet}
              bandArea={bandArea}
              compact={true}
            />
          </BottomSheet>
        </div>
        
        {/* Details Panel */}
        <div className="h-full overflow-y-auto p-4">
          <MobileDetailsList
            measurements={measurements}
            exclusions={exclusions}
            onQuickAction={handleQuickAction}
          />
        </div>
      </SwipeableViews>
      
      {/* Tab Bar */}
      <div className="border-t bg-white">
        <div className="flex">
          <button
            className={`flex-1 py-3 ${activePanel === 'map' ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActivePanel('map')}
          >
            Map
          </button>
          <button
            className={`flex-1 py-3 ${activePanel === 'details' ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActivePanel('details')}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}
```

## Phase 5: Testing & QA (Week 5)

### 5.1 Test Scenarios
```typescript
// tests/mosquito/measurement.test.ts
describe('Mosquito Control Measurements', () => {
  describe('Suburban Lot with Fence', () => {
    it('should measure 220 ft backyard fence accurately', async () => {
      const coords = loadTestProperty('suburban-fence')
      const result = await service.measureLotPerimeter(coords, {
        backyardOnly: true
      })
      
      expect(result.linearFeet).toBeCloseTo(220, 0) // ±1%
    })
    
    it('should calculate 5ft band area correctly', async () => {
      const band = service.calculateTreatmentBand(perimeter, 5, [])
      
      expect(band.totalArea).toBeCloseTo(220 * 5, 1) // 1100 sq ft
    })
    
    it('should exclude pool with 10ft buffer', async () => {
      const poolExclusion = {
        type: 'pool',
        geometry: poolCoords,
        bufferDistance: { value: 10, unit: 'feet' }
      }
      
      const band = service.calculateTreatmentBand(perimeter, 5, [poolExclusion])
      
      expect(band.totalArea).toBeLessThan(1100)
      expect(band.segments.filter(s => s.excluded).length).toBeGreaterThan(0)
    })
  })
  
  describe('Corner Lot with Pond', () => {
    it('should apply 50ft regulatory buffer', async () => {
      const pondExclusion = {
        type: 'pond',
        bufferDistance: { value: 25, unit: 'feet', regulatory: true }
      }
      
      const compliance = await service.validateCompliance(
        measurement,
        { waterFeatureBuffer: { pond: 50 } }
      )
      
      expect(compliance.passed).toBe(false)
      expect(compliance.violations[0].type).toBe('insufficient_buffer')
      expect(compliance.autoAdjustments[0].newValue).toBe(50)
    })
    
    it('should auto-offset treatment path', async () => {
      const adjusted = await service.applyAutoAdjustments(
        measurement,
        compliance.autoAdjustments
      )
      
      expect(adjusted.compliance.passed).toBe(true)
      expect(adjusted.exclusionZones[0].bufferDistance.value).toBe(50)
    })
  })
  
  describe('Hybrid Mode', () => {
    it('should reduce vertices by 30%', async () => {
      const manual = await service.measureLotPerimeter(coords, {
        snapToParcel: false
      })
      
      const hybrid = await service.measureLotPerimeter(coords, {
        snapToParcel: true
      })
      
      const reduction = (manual.coordinates.length - hybrid.coordinates.length) / 
                       manual.coordinates.length
      
      expect(reduction).toBeGreaterThan(0.3)
    })
  })
})
```

### 5.2 Performance Tests
```typescript
describe('Performance', () => {
  it('should measure complex perimeter in <2 seconds', async () => {
    const start = Date.now()
    
    await service.measureLotPerimeter(complexProperty, {
      snapToParcel: true,
      backyardOnly: false
    })
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(2000)
  })
  
  it('should handle 20+ exclusion zones', async () => {
    const exclusions = generateExclusions(20)
    
    const band = await service.calculateTreatmentBand(
      perimeter,
      5,
      exclusions
    )
    
    expect(band).toBeDefined()
    expect(band.segments.length).toBeGreaterThan(0)
  })
})
```

## Phase 6: Rollout Strategy (Week 6)

### 6.1 Feature Flag Implementation
```typescript
// lib/features/mosquitoFeatures.ts
export const mosquitoFeatures = {
  perimeterMeasurement: {
    enabled: process.env.MOSQUITO_PERIMETER_ENABLED === 'true',
    rolloutPercentage: parseInt(process.env.MOSQUITO_ROLLOUT_PCT || '0'),
    betaUsers: process.env.MOSQUITO_BETA_USERS?.split(',') || []
  },
  
  shouldEnableForUser(userId: string): boolean {
    // Check if beta user
    if (this.perimeterMeasurement.betaUsers.includes(userId)) {
      return true
    }
    
    // Check rollout percentage
    const hash = hashCode(userId)
    const bucket = Math.abs(hash) % 100
    
    return bucket < this.perimeterMeasurement.rolloutPercentage
  }
}
```

### 6.2 Migration Plan
```
Week 1: Deploy to staging, internal testing
Week 2: 5% rollout to beta users
Week 3: 25% rollout, gather feedback
Week 4: 50% rollout, monitor metrics
Week 5: 100% rollout
Week 6: Deprecate old measurement tool
```

## Success Metrics

### KPIs to Track
1. **Linear Accuracy**: ±1% vs Google Earth (flat), ±2% (terrain)
2. **Band Area Accuracy**: ±3% derived from perimeter
3. **Hybrid Efficiency**: 30% reduction in manual adjustments
4. **Deletion Errors**: <0.1% wrong deletions
5. **Compliance Rate**: >95% auto-fixed violations
6. **Quote Integration**: 100% data transfer accuracy

### Expected Outcomes
- **Technician Efficiency**: +40% faster property measurement
- **Quote Accuracy**: +35% improvement in chemical estimates  
- **Compliance Issues**: -80% regulatory violations
- **Customer Satisfaction**: +25% due to accurate pricing

## Technical Stack Summary

### Frontend
- Next.js 14 with TypeScript
- Google Maps/Earth API integration
- React Hook Form for inputs
- Tailwind CSS for styling
- PWA for mobile field use

### Backend
- Node.js API routes
- MongoDB with GeoJSON support
- PostGIS for advanced geometry operations
- Redis for caching parcel data

### Third-Party Services
- Google Earth Engine API
- Parcel boundary data service
- Weather API for compliance
- Regulatory database API

## Conclusion

This implementation plan delivers a comprehensive mosquito control measurement system that:
- Prioritizes linear perimeter measurements
- Implements regulatory compliance checking
- Provides accurate chemical volume calculations
- Supports field technician workflows
- Integrates seamlessly with quoting systems

The solution addresses all identified problems while adding mosquito-control-specific features that match industry standards used by companies like Mosquito Joe and Mosquito Squad.