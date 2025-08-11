import { Coordinate } from '@/types/manualSelection'

export type AreaUnit = 'sqft' | 'sqm' | 'acres' | 'hectares'
export type LinearUnit = 'ft' | 'm' | 'yards' | 'km' | 'miles'

export interface PrecisionSettings {
  areaUnit: AreaUnit
  linearUnit: LinearUnit
  decimalPlaces: number
  use3D: boolean
  showConversions: boolean
}

export interface FormattedMeasurement {
  value: number
  display: string
  unit: AreaUnit | LinearUnit
  precision: number
  raw: number // Original value in base units (sq ft or ft)
  conversions?: {
    unit: string
    value: number
    display: string
  }[]
}

export interface DetailedArea {
  surfaceArea: number // 3D surface area
  projectedArea: number // 2D projected area
  slopeCorrection: string // Percentage difference
  averageSlope: number // Degrees
  maxSlope: number // Degrees
  terrainType: 'flat' | 'gentle' | 'moderate' | 'steep'
}

export interface MeasurementAccuracy {
  confidence: number // 0-1
  method: 'manual' | 'hybrid' | 'ai_assisted'
  adjustments: {
    boundary_snap: boolean
    terrain_correction: boolean
    imagery_quality: 'low' | 'medium' | 'high'
  }
  errorMargin: number // ± percentage
}

export class PrecisionService {
  private settings: PrecisionSettings
  
  // Conversion factors
  private readonly AREA_CONVERSIONS = {
    sqft: {
      sqft: 1,
      sqm: 0.092903,
      acres: 0.0000229568,
      hectares: 0.0000092903
    }
  }
  
  private readonly LINEAR_CONVERSIONS = {
    ft: {
      ft: 1,
      m: 0.3048,
      yards: 0.333333,
      km: 0.0003048,
      miles: 0.000189394
    }
  }
  
  constructor(settings?: Partial<PrecisionSettings>) {
    this.settings = {
      areaUnit: 'sqft',
      linearUnit: 'ft',
      decimalPlaces: 2,
      use3D: false,
      showConversions: true,
      ...settings
    }
  }
  
  /**
   * Update precision settings
   */
  updateSettings(settings: Partial<PrecisionSettings>): void {
    this.settings = { ...this.settings, ...settings }
  }
  
  /**
   * Format area with precision and unit conversion
   */
  formatArea(
    squareFeet: number,
    unit?: AreaUnit,
    precision?: number
  ): FormattedMeasurement {
    const targetUnit = unit || this.settings.areaUnit
    const decimalPlaces = precision ?? this.settings.decimalPlaces
    
    // Convert to target unit
    const converted = squareFeet * this.AREA_CONVERSIONS.sqft[targetUnit]
    
    // Format with precision
    const formatted = this.applyPrecision(converted, decimalPlaces)
    
    // Generate conversions if enabled
    const conversions = this.settings.showConversions
      ? this.generateAreaConversions(squareFeet, targetUnit)
      : undefined
    
    return {
      value: formatted,
      display: `${this.formatNumber(formatted)} ${this.getAreaUnitLabel(targetUnit)}`,
      unit: targetUnit,
      precision: decimalPlaces,
      raw: squareFeet,
      conversions
    }
  }
  
  /**
   * Format linear measurement (perimeter, distance)
   */
  formatLinear(
    feet: number,
    unit?: LinearUnit,
    precision?: number
  ): FormattedMeasurement {
    const targetUnit = unit || this.settings.linearUnit
    const decimalPlaces = precision ?? this.settings.decimalPlaces
    
    // Convert to target unit
    const converted = feet * this.LINEAR_CONVERSIONS.ft[targetUnit]
    
    // Format with precision
    const formatted = this.applyPrecision(converted, decimalPlaces)
    
    // Generate conversions if enabled
    const conversions = this.settings.showConversions
      ? this.generateLinearConversions(feet, targetUnit)
      : undefined
    
    return {
      value: formatted,
      display: `${this.formatNumber(formatted)} ${this.getLinearUnitLabel(targetUnit)}`,
      unit: targetUnit,
      precision: decimalPlaces,
      raw: feet,
      conversions
    }
  }
  
  /**
   * Calculate 3D-adjusted area with terrain correction
   */
  async calculate3DAdjustedArea(
    polygon: Coordinate[],
    elevations: number[]
  ): Promise<DetailedArea> {
    // Validate inputs
    if (polygon.length !== elevations.length) {
      throw new Error('Polygon vertices and elevations must have same length')
    }
    
    // Triangulate polygon
    const triangles = this.triangulate(polygon)
    
    let totalSurfaceArea = 0
    let total2DArea = 0
    const slopes: number[] = []
    
    // Calculate area for each triangle
    triangles.forEach(triangle => {
      // Get elevations for triangle vertices
      const triangleElevations = triangle.map(vertex => {
        const index = polygon.findIndex(p => 
          Math.abs(p.lat - vertex.lat) < 0.00001 &&
          Math.abs(p.lng - vertex.lng) < 0.00001
        )
        return elevations[index] || 0
      })
      
      // Calculate 2D area
      const area2D = this.triangleArea2D(triangle)
      total2DArea += area2D
      
      // Calculate 3D surface area
      const area3D = this.triangleArea3D(triangle, triangleElevations)
      totalSurfaceArea += area3D
      
      // Calculate slope for this triangle
      const slope = this.calculateTriangleSlope(triangle, triangleElevations)
      slopes.push(slope)
    })
    
    // Calculate statistics
    const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length
    const maxSlope = Math.max(...slopes)
    const slopeCorrection = ((totalSurfaceArea - total2DArea) / total2DArea) * 100
    
    // Determine terrain type
    let terrainType: DetailedArea['terrainType'] = 'flat'
    if (avgSlope > 2) terrainType = 'gentle'
    if (avgSlope > 8) terrainType = 'moderate'
    if (avgSlope > 15) terrainType = 'steep'
    
    return {
      surfaceArea: totalSurfaceArea,
      projectedArea: total2DArea,
      slopeCorrection: `${slopeCorrection.toFixed(1)}%`,
      averageSlope: avgSlope,
      maxSlope,
      terrainType
    }
  }
  
  /**
   * Calculate measurement accuracy and confidence
   */
  calculateAccuracy(
    method: MeasurementAccuracy['method'],
    adjustments: MeasurementAccuracy['adjustments']
  ): MeasurementAccuracy {
    let confidence = 0
    let errorMargin = 10 // Default 10% error margin
    
    // Base confidence by method
    switch (method) {
      case 'manual':
        confidence = 0.7
        errorMargin = 10
        break
      case 'hybrid':
        confidence = 0.85
        errorMargin = 5
        break
      case 'ai_assisted':
        confidence = 0.95
        errorMargin = 2
        break
    }
    
    // Adjust for boundary snapping
    if (adjustments.boundary_snap) {
      confidence += 0.05
      errorMargin -= 1
    }
    
    // Adjust for terrain correction
    if (adjustments.terrain_correction) {
      confidence += 0.03
      errorMargin -= 0.5
    }
    
    // Adjust for imagery quality
    switch (adjustments.imagery_quality) {
      case 'high':
        confidence += 0.02
        errorMargin -= 0.5
        break
      case 'medium':
        break
      case 'low':
        confidence -= 0.05
        errorMargin += 2
        break
    }
    
    // Clamp values
    confidence = Math.min(1, Math.max(0, confidence))
    errorMargin = Math.max(1, errorMargin)
    
    return {
      confidence,
      method,
      adjustments,
      errorMargin
    }
  }
  
  /**
   * Format number with locale-specific formatting
   */
  private formatNumber(value: number): string {
    // Use locale formatting with specified decimal places
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: this.settings.decimalPlaces
    })
  }
  
  /**
   * Apply precision to a number
   */
  private applyPrecision(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision)
    return Math.round(value * multiplier) / multiplier
  }
  
  /**
   * Get area unit label
   */
  private getAreaUnitLabel(unit: AreaUnit): string {
    const labels: Record<AreaUnit, string> = {
      sqft: 'sq ft',
      sqm: 'sq m',
      acres: 'acres',
      hectares: 'hectares'
    }
    return labels[unit]
  }
  
  /**
   * Get linear unit label
   */
  private getLinearUnitLabel(unit: LinearUnit): string {
    const labels: Record<LinearUnit, string> = {
      ft: 'ft',
      m: 'm',
      yards: 'yards',
      km: 'km',
      miles: 'miles'
    }
    return labels[unit]
  }
  
  /**
   * Generate area conversions for display
   */
  private generateAreaConversions(
    squareFeet: number,
    excludeUnit: AreaUnit
  ): FormattedMeasurement['conversions'] {
    const conversions: FormattedMeasurement['conversions'] = []
    
    for (const unit of Object.keys(this.AREA_CONVERSIONS.sqft) as AreaUnit[]) {
      if (unit === excludeUnit) continue
      
      const value = squareFeet * this.AREA_CONVERSIONS.sqft[unit]
      const formatted = this.applyPrecision(value, this.settings.decimalPlaces)
      
      conversions.push({
        unit: this.getAreaUnitLabel(unit),
        value: formatted,
        display: `${this.formatNumber(formatted)} ${this.getAreaUnitLabel(unit)}`
      })
    }
    
    return conversions
  }
  
  /**
   * Generate linear conversions for display
   */
  private generateLinearConversions(
    feet: number,
    excludeUnit: LinearUnit
  ): FormattedMeasurement['conversions'] {
    const conversions: FormattedMeasurement['conversions'] = []
    
    for (const unit of Object.keys(this.LINEAR_CONVERSIONS.ft) as LinearUnit[]) {
      if (unit === excludeUnit) continue
      
      const value = feet * this.LINEAR_CONVERSIONS.ft[unit]
      const formatted = this.applyPrecision(value, this.settings.decimalPlaces)
      
      conversions.push({
        unit: this.getLinearUnitLabel(unit),
        value: formatted,
        display: `${this.formatNumber(formatted)} ${this.getLinearUnitLabel(unit)}`
      })
    }
    
    return conversions
  }
  
  /**
   * Triangulate polygon using ear clipping
   */
  private triangulate(polygon: Coordinate[]): Coordinate[][] {
    const triangles: Coordinate[][] = []
    const vertices = [...polygon]
    
    // Simple ear clipping algorithm
    while (vertices.length > 3) {
      let earFound = false
      
      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length]
        const curr = vertices[i]
        const next = vertices[(i + 1) % vertices.length]
        
        if (this.isEar(prev, curr, next, vertices)) {
          triangles.push([prev, curr, next])
          vertices.splice(i, 1)
          earFound = true
          break
        }
      }
      
      // Fallback if no ear found (shouldn't happen with valid polygons)
      if (!earFound && vertices.length > 3) {
        triangles.push([vertices[0], vertices[1], vertices[2]])
        vertices.splice(1, 1)
      }
    }
    
    // Add final triangle
    if (vertices.length === 3) {
      triangles.push(vertices)
    }
    
    return triangles
  }
  
  /**
   * Check if vertices form an ear
   */
  private isEar(
    prev: Coordinate,
    curr: Coordinate,
    next: Coordinate,
    polygon: Coordinate[]
  ): boolean {
    // Check if triangle is counter-clockwise
    const area = (next.lat - prev.lat) * (curr.lng - prev.lng) -
                 (curr.lat - prev.lat) * (next.lng - prev.lng)
    
    if (area <= 0) return false
    
    // Check if any vertex is inside triangle
    for (const vertex of polygon) {
      if (vertex === prev || vertex === curr || vertex === next) continue
      
      if (this.isPointInTriangle(vertex, prev, curr, next)) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * Check if point is in triangle
   */
  private isPointInTriangle(
    p: Coordinate,
    a: Coordinate,
    b: Coordinate,
    c: Coordinate
  ): boolean {
    const sign = (p1: Coordinate, p2: Coordinate, p3: Coordinate) => {
      return (p1.lat - p3.lat) * (p2.lng - p3.lng) -
             (p2.lat - p3.lat) * (p1.lng - p3.lng)
    }
    
    const d1 = sign(p, a, b)
    const d2 = sign(p, b, c)
    const d3 = sign(p, c, a)
    
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)
    
    return !(hasNeg && hasPos)
  }
  
  /**
   * Calculate 2D triangle area
   */
  private triangleArea2D(triangle: Coordinate[]): number {
    const [a, b, c] = triangle
    
    // Haversine distance calculation
    const R = 6371000 // Earth radius in meters
    
    // Convert to radians
    const lat1 = a.lat * Math.PI / 180
    const lat2 = b.lat * Math.PI / 180
    const lat3 = c.lat * Math.PI / 180
    const lng1 = a.lng * Math.PI / 180
    const lng2 = b.lng * Math.PI / 180
    const lng3 = c.lng * Math.PI / 180
    
    // Project to plane
    const x1 = R * Math.cos(lat1) * lng1
    const y1 = R * lat1
    const x2 = R * Math.cos(lat2) * lng2
    const y2 = R * lat2
    const x3 = R * Math.cos(lat3) * lng3
    const y3 = R * lat3
    
    // Calculate area
    const area = Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2
    
    // Convert to square feet
    return area * 10.764
  }
  
  /**
   * Calculate 3D triangle area with elevations
   */
  private triangleArea3D(triangle: Coordinate[], elevations: number[]): number {
    const [a, b, c] = triangle
    const [e1, e2, e3] = elevations
    
    // Convert to 3D Cartesian coordinates
    const p1 = this.toCartesian(a, e1)
    const p2 = this.toCartesian(b, e2)
    const p3 = this.toCartesian(c, e3)
    
    // Calculate vectors
    const v1 = {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
      z: p2.z - p1.z
    }
    
    const v2 = {
      x: p3.x - p1.x,
      y: p3.y - p1.y,
      z: p3.z - p1.z
    }
    
    // Cross product
    const cross = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    }
    
    // Magnitude gives area
    const area = Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2) / 2
    
    // Convert to square feet
    return area * 10.764
  }
  
  /**
   * Calculate triangle slope in degrees
   */
  private calculateTriangleSlope(triangle: Coordinate[], elevations: number[]): number {
    const [e1, e2, e3] = elevations
    
    // Calculate elevation difference
    const maxElev = Math.max(e1, e2, e3)
    const minElev = Math.min(e1, e2, e3)
    const elevDiff = maxElev - minElev
    
    // Calculate horizontal distance (approximate)
    const area2D = this.triangleArea2D(triangle)
    const sideLength = Math.sqrt(area2D * 2) // Approximate for equilateral
    
    // Calculate slope angle
    const slope = Math.atan(elevDiff / sideLength) * 180 / Math.PI
    
    return slope
  }
  
  /**
   * Convert lat/lng/elevation to Cartesian
   */
  private toCartesian(
    coord: Coordinate,
    elevation: number
  ): { x: number, y: number, z: number } {
    const R = 6371000 + elevation // Earth radius + elevation
    const lat = coord.lat * Math.PI / 180
    const lng = coord.lng * Math.PI / 180
    
    return {
      x: R * Math.cos(lat) * Math.cos(lng),
      y: R * Math.cos(lat) * Math.sin(lng),
      z: R * Math.sin(lat)
    }
  }
  
  /**
   * Export measurement data in various formats
   */
  exportMeasurements(
    measurements: any,
    format: 'json' | 'csv' | 'kml'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(measurements, null, 2)
        
      case 'csv':
        // Convert to CSV format
        const headers = ['ID', 'Type', 'Area (sq ft)', 'Perimeter (ft)', 'Vertices']
        const rows = measurements.map((m: any) => [
          m.id,
          m.type,
          m.area,
          m.perimeter,
          m.vertices.length
        ])
        return [headers, ...rows].map(row => row.join(',')).join('\n')
        
      case 'kml':
        // Generate KML format for Google Earth
        return this.generateKML(measurements)
        
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }
  
  /**
   * Generate KML format
   */
  private generateKML(measurements: any[]): string {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Property Measurements</name>
    ${measurements.map(m => `
    <Placemark>
      <name>${m.name || m.type}</name>
      <description>Area: ${m.area} sq ft, Perimeter: ${m.perimeter} ft</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${m.vertices.map((v: Coordinate) => `${v.lng},${v.lat},0`).join(' ')}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`).join('')}
  </Document>
</kml>`
    
    return kml
  }
}