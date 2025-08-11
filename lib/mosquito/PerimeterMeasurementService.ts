import { Coordinate } from '@/types/manualSelection'
import { EarthEngineService } from '../googleEarth/EarthEngineService'
import { GoogleEarthAccurateMeasurement } from '../measurement/GoogleEarthAccurateMeasurement'

export type MeasurementMode = 'lot_perimeter' | 'structure_perimeter' | 'custom_path' | 'area_band'
export type YardSection = 'full' | 'backyard' | 'frontyard'
export type ExclusionType = 'pool' | 'pond' | 'garden' | 'beehive' | 'playset' | 'water_feature' | 'neighbor_buffer'

export interface LinearMeasurement {
  coordinates: Coordinate[]
  linearFeet: number
  linearMeters: number
  slopeAdjustedLength?: number
  segments: LineSegment[]
  confidence: number
  pathType?: 'fence' | 'hedge' | 'tree_line' | 'mixed'
}

export interface LineSegment {
  start: Coordinate
  end: Coordinate
  length: number // feet
  bearing: number // degrees
  excluded?: boolean
  exclusionReason?: string
}

export interface ExclusionZone {
  id: string
  name: string
  type: ExclusionType
  geometry: Coordinate[]
  bufferDistance: {
    value: number
    unit: 'feet' | 'meters'
    regulatory: boolean
    regulation?: string
  }
  bufferedGeometry?: Coordinate[]
  affectedLinearFeet?: number
}

export interface BandMeasurement {
  bandWidth: number // feet
  totalArea: number // sq ft
  netArea: number // After exclusions
  excludedArea: number
  segments: BandSegment[]
  chemicalVolume: ChemicalCalculation
}

export interface BandSegment {
  geometryId: string
  linearFeet: number
  area: number
  excluded: boolean
  exclusionZones?: string[]
}

export interface ChemicalCalculation {
  concentrate: number // oz
  diluted: number // gallons
  applicationRate: string
  mixRatio: string
  coverage: string
}

export interface ComplianceResult {
  passed: boolean
  violations: ComplianceViolation[]
  autoAdjustments: AutoAdjustment[]
  complianceScore: number
  recommendations: string[]
}

export interface ComplianceViolation {
  type: 'insufficient_buffer' | 'property_line_violation' | 'wind_speed_exceeded' | 'temperature_exceeded'
  zone?: string
  geometry?: string
  required: number
  actual: number
  regulation: string
  severity: 'warning' | 'error'
}

export interface AutoAdjustment {
  type: 'increase_buffer' | 'offset_from_property_line' | 'exclude_area'
  targetId: string
  targetType: 'zone' | 'geometry'
  newValue?: number
  newCoordinates?: Coordinate[]
  reason: string
}

export interface ParcelData {
  boundaries: Coordinate[]
  frontStreet: Coordinate[]
  backProperty: Coordinate[]
  sideProperties: Coordinate[][]
  area: number
  zoning: string
}

export interface RegulationSet {
  waterFeatureBuffer: {
    pond: number
    stream: number
    lake: number
    wetland: number
  }
  propertyLineSetback: number
  pollinatorProtection: number
  organicGardenBuffer: number
  playAreaBuffer: number
  maxWindSpeed: number
  minTemperature: number
  maxTemperature: number
  waterFeatureRegulation: string
  propertyLineRegulation: string
}

export class PerimeterMeasurementService {
  private earthEngine: EarthEngineService
  private googleEarthMeasurement: GoogleEarthAccurateMeasurement
  private readonly EARTH_RADIUS_FEET = 20925646.325 // Earth radius in feet
  
  // Standard application rates for mosquito control
  private readonly CONCENTRATE_RATE = 1.0 // oz per 1000 sq ft
  private readonly DILUTION_RATIO = 1 / 64 // 1:64 concentrate to water
  private readonly BAND_COVERAGE = 1000 // sq ft per gallon of diluted solution
  
  constructor() {
    this.earthEngine = new EarthEngineService()
    this.googleEarthMeasurement = new GoogleEarthAccurateMeasurement()
  }
  
  /**
   * Initialize service with map instance
   */
  async initialize(map: google.maps.Map): Promise<void> {
    await this.earthEngine.initialize(map)
  }
  
  /**
   * Measure lot perimeter with advanced options
   */
  async measureLotPerimeter(
    address: string,
    coordinates: Coordinate[],
    options: {
      yardSection?: YardSection
      excludeNeighbors?: boolean
      snapToParcel?: boolean
      smoothing?: 'none' | 'light' | 'moderate' | 'heavy'
    } = {}
  ): Promise<LinearMeasurement> {
    // Get parcel boundaries if available
    const parcelData = await this.getParcelBoundaries(address)
    
    let processedCoordinates = [...coordinates]
    
    // Apply parcel snapping if requested
    if (options.snapToParcel && parcelData) {
      processedCoordinates = await this.snapToParcelBoundaries(
        processedCoordinates,
        parcelData.boundaries
      )
    }
    
    // Filter by yard section
    if (options.yardSection && options.yardSection !== 'full' && parcelData) {
      processedCoordinates = this.filterByYardSection(
        processedCoordinates,
        parcelData,
        options.yardSection
      )
    }
    
    // Exclude neighbor boundaries if requested
    if (options.excludeNeighbors && parcelData) {
      processedCoordinates = this.excludeNeighborBoundaries(
        processedCoordinates,
        parcelData
      )
    }
    
    // Apply smoothing
    if (options.smoothing && options.smoothing !== 'none') {
      processedCoordinates = this.smoothPath(processedCoordinates, options.smoothing)
    }
    
    // Calculate measurements using Google Earth accurate method
    const measurement = this.googleEarthMeasurement.calculatePerimeter(processedCoordinates)
    const linearFeet = measurement.feet
    const segments = this.segmentizePath(processedCoordinates, true)
    
    // Get elevation data for slope adjustment
    let slopeAdjustedLength = linearFeet
    // Note: Elevation data access currently unavailable due to private method restriction
    // In production, this would use actual elevation data for slope adjustment
    slopeAdjustedLength = linearFeet * 1.02 // Apply 2% adjustment as approximation
    
    return {
      coordinates: processedCoordinates,
      linearFeet,
      linearMeters: linearFeet * 0.3048,
      slopeAdjustedLength,
      segments,
      confidence: this.calculateConfidence(processedCoordinates, parcelData),
      pathType: 'fence' // Default for lot perimeter
    }
  }
  
  /**
   * Auto-detect and measure structure perimeter
   */
  async measureStructurePerimeter(
    center: Coordinate,
    map?: google.maps.Map
  ): Promise<LinearMeasurement> {
    // Create bounds around center
    const searchRadius = 0.0005 // ~50 meters
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(center.lat - searchRadius, center.lng - searchRadius),
      new google.maps.LatLng(center.lat + searchRadius, center.lng + searchRadius)
    )
    
    // Get imagery and detect building
    const imagery = await this.earthEngine.getHighResImagery(bounds)
    const detection = await this.earthEngine.detectPropertyBoundaries(center)
    
    if (!detection || detection.confidence < 0.5) {
      throw new Error('Unable to detect structure. Please draw manually.')
    }
    
    // Regularize building outline (make corners square)
    const regularized = this.regularizeBuildingOutline(detection.vertices)
    
    // Calculate perimeter using Google Earth accurate method
    const measurement = this.googleEarthMeasurement.calculatePerimeter(regularized)
    const linearFeet = measurement.feet
    const segments = this.segmentizePath(regularized, true)
    
    return {
      coordinates: regularized,
      linearFeet,
      linearMeters: linearFeet * 0.3048,
      segments,
      confidence: detection.confidence,
      pathType: 'mixed'
    }
  }
  
  /**
   * Measure custom vegetation or fence line path
   */
  async measureCustomPath(
    pathPoints: Coordinate[],
    options: {
      snapToEdges?: boolean
      smoothing?: 'none' | 'light' | 'moderate' | 'heavy'
      minSegmentLength?: number
      pathType?: 'fence' | 'hedge' | 'tree_line'
    } = {}
  ): Promise<LinearMeasurement> {
    let processedPath = [...pathPoints]
    
    // Apply edge snapping if requested
    if (options.snapToEdges) {
      // Simplified edge detection - in production, use CV
      processedPath = this.snapToNearestEdges(processedPath)
    }
    
    // Apply smoothing
    if (options.smoothing && options.smoothing !== 'none') {
      processedPath = this.smoothPath(processedPath, options.smoothing)
    }
    
    // Enforce minimum segment length
    if (options.minSegmentLength) {
      processedPath = this.enforceMinimumSegmentLength(
        processedPath,
        options.minSegmentLength
      )
    }
    
    // Calculate measurements using Google Earth accurate method
    const pathMeasurement = this.googleEarthMeasurement.calculatePathDistance(processedPath)
    const linearFeet = pathMeasurement.feet
    const segments = this.segmentizePath(processedPath, false)
    
    return {
      coordinates: processedPath,
      linearFeet,
      linearMeters: linearFeet * 0.3048,
      segments,
      confidence: 0.95, // High confidence for manual paths
      pathType: options.pathType || this.classifyPathType(processedPath)
    }
  }
  
  /**
   * Calculate treatment band area from perimeter measurements
   */
  calculateTreatmentBand(
    perimeters: LinearMeasurement[],
    bandWidth: number,
    exclusionZones: ExclusionZone[]
  ): BandMeasurement {
    // Combine all perimeters
    const allSegments: BandSegment[] = []
    let totalLinearFeet = 0
    
    for (const perimeter of perimeters) {
      totalLinearFeet += perimeter.linearFeet
      
      // Create band segments
      for (const segment of perimeter.segments) {
        allSegments.push({
          geometryId: Math.random().toString(36).substr(2, 9),
          linearFeet: segment.length,
          area: segment.length * bandWidth,
          excluded: false
        })
      }
    }
    
    // Calculate base area
    const baseArea = totalLinearFeet * bandWidth
    let excludedArea = 0
    
    // Process exclusion zones
    for (const zone of exclusionZones) {
      // Create buffered exclusion polygon
      const buffered = this.bufferPolygon(
        zone.geometry,
        zone.bufferDistance.value
      )
      
      // Find affected segments
      for (const segment of allSegments) {
        if (this.segmentIntersectsPolygon(segment, buffered)) {
          segment.excluded = true
          segment.exclusionZones = segment.exclusionZones || []
          segment.exclusionZones.push(zone.id)
          excludedArea += segment.area
        }
      }
      
      // Update zone with affected linear feet
      zone.affectedLinearFeet = allSegments
        .filter(s => s.exclusionZones?.includes(zone.id))
        .reduce((sum, s) => sum + s.linearFeet, 0)
    }
    
    // Calculate chemical requirements
    const netArea = baseArea - excludedArea
    const chemicalVolume = this.calculateChemicalVolume(netArea)
    
    return {
      bandWidth,
      totalArea: baseArea,
      netArea,
      excludedArea,
      segments: allSegments,
      chemicalVolume
    }
  }
  
  /**
   * Calculate chemical volume for treatment area
   */
  private calculateChemicalVolume(areaSqFt: number): ChemicalCalculation {
    const concentrate = (areaSqFt / 1000) * this.CONCENTRATE_RATE
    const totalSolution = areaSqFt / this.BAND_COVERAGE
    const waterVolume = totalSolution * (1 - this.DILUTION_RATIO)
    
    return {
      concentrate: Math.ceil(concentrate * 10) / 10, // Round up to 0.1 oz
      diluted: Math.ceil(totalSolution * 10) / 10, // Round up to 0.1 gallons
      applicationRate: `${this.CONCENTRATE_RATE} oz per 1000 sq ft`,
      mixRatio: '1:64 (concentrate:water)',
      coverage: `${areaSqFt.toLocaleString()} sq ft`
    }
  }
  
  /**
   * Validate compliance with local regulations
   */
  async validateCompliance(
    geometries: LinearMeasurement[],
    exclusionZones: ExclusionZone[],
    regulations: RegulationSet
  ): Promise<ComplianceResult> {
    const violations: ComplianceViolation[] = []
    const autoAdjustments: AutoAdjustment[] = []
    const recommendations: string[] = []
    
    // Check water feature buffers
    for (const zone of exclusionZones) {
      if (['pond', 'water_feature'].includes(zone.type)) {
        const requiredBuffer = regulations.waterFeatureBuffer.pond
        
        if (zone.bufferDistance.value < requiredBuffer) {
          violations.push({
            type: 'insufficient_buffer',
            zone: zone.name,
            required: requiredBuffer,
            actual: zone.bufferDistance.value,
            regulation: regulations.waterFeatureRegulation,
            severity: 'error'
          })
          
          autoAdjustments.push({
            type: 'increase_buffer',
            targetId: zone.id,
            targetType: 'zone',
            newValue: requiredBuffer,
            reason: `Comply with ${regulations.waterFeatureRegulation}`
          })
        }
      }
      
      // Check pollinator protection
      if (zone.type === 'beehive') {
        const requiredBuffer = regulations.pollinatorProtection
        
        if (zone.bufferDistance.value < requiredBuffer) {
          violations.push({
            type: 'insufficient_buffer',
            zone: zone.name,
            required: requiredBuffer,
            actual: zone.bufferDistance.value,
            regulation: 'Pollinator Protection Act',
            severity: 'error'
          })
          
          autoAdjustments.push({
            type: 'increase_buffer',
            targetId: zone.id,
            targetType: 'zone',
            newValue: requiredBuffer,
            reason: 'Protect pollinators'
          })
        }
      }
    }
    
    // Check property line setbacks
    for (const geometry of geometries) {
      // Check if any segments are too close to property lines
      const tooClose = this.checkPropertyLineDistance(
        geometry.coordinates,
        regulations.propertyLineSetback
      )
      
      if (tooClose) {
        violations.push({
          type: 'property_line_violation',
          geometry: 'Perimeter',
          required: regulations.propertyLineSetback,
          actual: 0,
          regulation: regulations.propertyLineRegulation,
          severity: 'warning'
        })
        
        recommendations.push(
          `Consider maintaining ${regulations.propertyLineSetback}ft buffer from property lines`
        )
      }
    }
    
    // Calculate compliance score
    const errorCount = violations.filter(v => v.severity === 'error').length
    const warningCount = violations.filter(v => v.severity === 'warning').length
    const score = Math.max(0, 1 - (errorCount * 0.2 + warningCount * 0.1))
    
    return {
      passed: errorCount === 0,
      violations,
      autoAdjustments,
      complianceScore: score,
      recommendations
    }
  }
  
  /**
   * Apply auto-adjustments to fix compliance issues
   */
  applyAutoAdjustments(
    geometries: LinearMeasurement[],
    exclusionZones: ExclusionZone[],
    adjustments: AutoAdjustment[]
  ): { geometries: LinearMeasurement[], exclusionZones: ExclusionZone[] } {
    const adjustedZones = [...exclusionZones]
    const adjustedGeometries = [...geometries]
    
    for (const adjustment of adjustments) {
      if (adjustment.targetType === 'zone') {
        const zone = adjustedZones.find(z => z.id === adjustment.targetId)
        if (zone && adjustment.newValue) {
          zone.bufferDistance.value = adjustment.newValue
          zone.bufferedGeometry = this.bufferPolygon(
            zone.geometry,
            adjustment.newValue
          )
        }
      } else if (adjustment.targetType === 'geometry') {
        const geometry = adjustedGeometries.find(g => 
          g.coordinates === geometries.find(gg => gg === g)?.coordinates
        )
        if (geometry && adjustment.newCoordinates) {
          geometry.coordinates = adjustment.newCoordinates
          geometry.linearFeet = this.calculateLinearDistance(adjustment.newCoordinates, true)
          geometry.segments = this.segmentizePath(adjustment.newCoordinates, true)
        }
      }
    }
    
    return { geometries: adjustedGeometries, exclusionZones: adjustedZones }
  }
  
  // Helper Methods
  
  private async getParcelBoundaries(address: string): Promise<ParcelData | null> {
    // In production, fetch from parcel data service
    // For now, return mock data
    return null
  }
  
  private async snapToParcelBoundaries(
    coordinates: Coordinate[],
    parcelBoundaries: Coordinate[]
  ): Promise<Coordinate[]> {
    // Snap vertices to nearest parcel boundary points
    return coordinates.map(coord => {
      const nearest = this.findNearestPoint(coord, parcelBoundaries)
      const distance = this.calculateDistance(coord, nearest)
      
      // Snap if within 10 feet
      if (distance < 10) {
        return nearest
      }
      return coord
    })
  }
  
  private filterByYardSection(
    coordinates: Coordinate[],
    parcelData: ParcelData,
    section: YardSection
  ): Coordinate[] {
    // Simplified filtering - in production, use geometric analysis
    if (section === 'backyard') {
      // Return points in back half of property
      const centerLat = parcelData.boundaries.reduce((sum, c) => sum + c.lat, 0) / parcelData.boundaries.length
      return coordinates.filter(c => c.lat > centerLat)
    } else if (section === 'frontyard') {
      // Return points in front half of property
      const centerLat = parcelData.boundaries.reduce((sum, c) => sum + c.lat, 0) / parcelData.boundaries.length
      return coordinates.filter(c => c.lat <= centerLat)
    }
    return coordinates
  }
  
  private excludeNeighborBoundaries(
    coordinates: Coordinate[],
    parcelData: ParcelData
  ): Coordinate[] {
    // Remove segments that coincide with side property lines
    // Simplified implementation
    return coordinates
  }
  
  private smoothPath(
    path: Coordinate[],
    level: 'light' | 'moderate' | 'heavy'
  ): Coordinate[] {
    const iterations = level === 'light' ? 1 : level === 'moderate' ? 2 : 3
    let smoothed = [...path]
    
    for (let iter = 0; iter < iterations; iter++) {
      const newPath: Coordinate[] = []
      
      for (let i = 0; i < smoothed.length; i++) {
        if (i === 0 || i === smoothed.length - 1) {
          newPath.push(smoothed[i])
        } else {
          const prev = smoothed[i - 1]
          const curr = smoothed[i]
          const next = smoothed[i + 1]
          
          newPath.push({
            lat: (prev.lat + curr.lat * 2 + next.lat) / 4,
            lng: (prev.lng + curr.lng * 2 + next.lng) / 4
          })
        }
      }
      
      smoothed = newPath
    }
    
    return smoothed
  }
  
  private calculateLinearDistance(coordinates: Coordinate[], closed: boolean): number {
    let totalDistance = 0
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += this.calculateDistance(coordinates[i], coordinates[i + 1])
    }
    
    // Add closing segment if polygon
    if (closed && coordinates.length > 2) {
      totalDistance += this.calculateDistance(
        coordinates[coordinates.length - 1],
        coordinates[0]
      )
    }
    
    return totalDistance
  }
  
  private calculateDistance(c1: Coordinate, c2: Coordinate): number {
    // Use Google Earth accurate measurement
    return this.googleEarthMeasurement.calculateDistance(c1, c2)
  }
  
  private segmentizePath(coordinates: Coordinate[], closed: boolean): LineSegment[] {
    const segments: LineSegment[] = []
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      segments.push(this.createSegment(coordinates[i], coordinates[i + 1]))
    }
    
    if (closed && coordinates.length > 2) {
      segments.push(this.createSegment(
        coordinates[coordinates.length - 1],
        coordinates[0]
      ))
    }
    
    return segments
  }
  
  private createSegment(start: Coordinate, end: Coordinate): LineSegment {
    const length = this.calculateDistance(start, end)
    const bearing = this.calculateBearing(start, end)
    
    return {
      start,
      end,
      length,
      bearing
    }
  }
  
  private calculateBearing(start: Coordinate, end: Coordinate): number {
    const lat1 = start.lat * Math.PI / 180
    const lat2 = end.lat * Math.PI / 180
    const deltaLng = (end.lng - start.lng) * Math.PI / 180
    
    const x = Math.sin(deltaLng) * Math.cos(lat2)
    const y = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)
    
    const bearing = Math.atan2(x, y) * 180 / Math.PI
    
    return (bearing + 360) % 360
  }
  
  private calculateSlopeAdjustedLength(
    coordinates: Coordinate[],
    elevations: any[]
  ): number {
    // Simplified slope adjustment
    // In production, use actual elevation data
    return this.calculateLinearDistance(coordinates, true) * 1.02 // 2% adjustment
  }
  
  private regularizeBuildingOutline(vertices: Coordinate[]): Coordinate[] {
    // Snap angles to 90 degrees for rectangular buildings
    // Simplified implementation
    return vertices
  }
  
  private snapToNearestEdges(path: Coordinate[]): Coordinate[] {
    // Simplified edge snapping
    return path
  }
  
  private classifyPathType(path: Coordinate[]): 'fence' | 'hedge' | 'tree_line' | 'mixed' {
    // Analyze path characteristics to determine type
    // Simplified implementation
    return 'mixed'
  }
  
  private enforceMinimumSegmentLength(
    path: Coordinate[],
    minLength: number
  ): Coordinate[] {
    const filtered: Coordinate[] = [path[0]]
    
    for (let i = 1; i < path.length; i++) {
      const distance = this.calculateDistance(
        filtered[filtered.length - 1],
        path[i]
      )
      
      if (distance >= minLength || i === path.length - 1) {
        filtered.push(path[i])
      }
    }
    
    return filtered
  }
  
  private bufferPolygon(polygon: Coordinate[], distance: number): Coordinate[] {
    // Create offset polygon
    // Simplified implementation - in production use Turf.js or similar
    return polygon.map(coord => ({
      lat: coord.lat + (distance / 364320), // Rough conversion
      lng: coord.lng + (distance / 364320)
    }))
  }
  
  private segmentIntersectsPolygon(segment: BandSegment, polygon: Coordinate[]): boolean {
    // Check if segment intersects with polygon
    // Simplified implementation
    return false
  }
  
  private checkPropertyLineDistance(
    coordinates: Coordinate[],
    minDistance: number
  ): boolean {
    // Check if any coordinate is too close to property line
    // Simplified implementation
    return false
  }
  
  private findNearestPoint(point: Coordinate, points: Coordinate[]): Coordinate {
    let nearest = points[0]
    let minDistance = this.calculateDistance(point, points[0])
    
    for (const p of points) {
      const distance = this.calculateDistance(point, p)
      if (distance < minDistance) {
        minDistance = distance
        nearest = p
      }
    }
    
    return nearest
  }
  
  private calculateConfidence(
    coordinates: Coordinate[],
    parcelData: ParcelData | null
  ): number {
    // Calculate measurement confidence based on various factors
    let confidence = 0.8 // Base confidence
    
    if (parcelData) {
      confidence += 0.1 // Parcel data available
    }
    
    if (coordinates.length > 10) {
      confidence += 0.05 // Detailed measurement
    }
    
    return Math.min(1, confidence)
  }
}