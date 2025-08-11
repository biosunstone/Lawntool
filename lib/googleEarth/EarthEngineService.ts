import { Coordinate } from '@/types/manualSelection'

export interface ImageryData {
  url: string
  resolution: number // meters per pixel
  timestamp: Date
  bounds: google.maps.LatLngBounds
}

export interface SurfaceArea {
  surfaceArea: number // sq ft
  projectedArea: number // sq ft
  slopeCorrection: number // percentage
  averageElevation: number // meters
  terrainComplexity: 'flat' | 'gentle' | 'moderate' | 'steep'
}

export interface PropertyBoundary {
  vertices: Coordinate[]
  confidence: number // 0-1
  detectionMethod: 'ml' | 'edge_detection' | 'manual'
  adjustments: {
    original: Coordinate[]
    snapped: Coordinate[]
    distance: number[] // distance moved per vertex
  }
}

export interface ElevationPoint {
  location: Coordinate
  elevation: number // meters
  resolution: number // meters
}

export class EarthEngineService {
  private elevationService: google.maps.ElevationService | null = null
  private readonly ELEVATION_SAMPLE_RATE = 10 // Sample every 10 meters
  private readonly BOUNDARY_DETECTION_CONFIDENCE_THRESHOLD = 0.75
  
  constructor() {
    if (typeof window !== 'undefined' && window.google?.maps) {
      this.elevationService = new google.maps.ElevationService()
    }
  }
  
  /**
   * Initialize the service with Google Maps instance
   */
  async initialize(map: google.maps.Map): Promise<void> {
    if (!this.elevationService && window.google?.maps) {
      this.elevationService = new google.maps.ElevationService()
    }
  }
  
  /**
   * Get high-resolution imagery data for a given bounds
   */
  async getHighResImagery(bounds: google.maps.LatLngBounds): Promise<ImageryData> {
    const center = bounds.getCenter()
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    
    // Calculate zoom level for optimal resolution
    const latDiff = Math.abs(ne.lat() - sw.lat())
    const lngDiff = Math.abs(ne.lng() - sw.lng())
    const maxDiff = Math.max(latDiff, lngDiff)
    
    // Determine resolution based on area size
    let resolution = 0.15 // 15cm default for urban areas
    if (maxDiff > 0.01) resolution = 0.30 // 30cm for larger areas
    if (maxDiff > 0.05) resolution = 0.60 // 60cm for very large areas
    
    // Generate static map URL with maximum quality
    const staticMapUrl = this.generateStaticMapUrl(center, bounds, resolution)
    
    return {
      url: staticMapUrl,
      resolution,
      timestamp: new Date(),
      bounds
    }
  }
  
  /**
   * Calculate 3D surface area accounting for terrain
   */
  async calculate3DArea(polygon: Coordinate[]): Promise<SurfaceArea> {
    if (!this.elevationService) {
      throw new Error('Elevation service not initialized')
    }
    
    // Get elevation data for polygon vertices and interior points
    const elevationPoints = await this.getElevationData(polygon)
    
    // Triangulate the polygon for 3D calculation
    const triangles = this.triangulatePolygon(polygon)
    
    let totalSurfaceArea = 0
    let total2DArea = 0
    
    // Calculate area for each triangle
    for (const triangle of triangles) {
      const area2D = this.calculateTriangleArea2D(triangle)
      total2DArea += area2D
      
      // Get elevations for triangle vertices
      const triangleElevations = triangle.map(vertex => {
        const point = elevationPoints.find(p => 
          Math.abs(p.location.lat - vertex.lat) < 0.00001 &&
          Math.abs(p.location.lng - vertex.lng) < 0.00001
        )
        return point?.elevation || 0
      })
      
      const area3D = this.calculateTriangleArea3D(triangle, triangleElevations)
      totalSurfaceArea += area3D
    }
    
    // Calculate terrain metrics
    const elevations = elevationPoints.map(p => p.elevation)
    const avgElevation = elevations.reduce((a, b) => a + b, 0) / elevations.length
    const elevationRange = Math.max(...elevations) - Math.min(...elevations)
    
    // Determine terrain complexity
    let terrainComplexity: SurfaceArea['terrainComplexity'] = 'flat'
    const slopeCorrection = ((totalSurfaceArea - total2DArea) / total2DArea) * 100
    
    if (slopeCorrection > 1) terrainComplexity = 'gentle'
    if (slopeCorrection > 5) terrainComplexity = 'moderate'
    if (slopeCorrection > 15) terrainComplexity = 'steep'
    
    return {
      surfaceArea: totalSurfaceArea,
      projectedArea: total2DArea,
      slopeCorrection,
      averageElevation: avgElevation,
      terrainComplexity
    }
  }
  
  /**
   * Detect property boundaries using edge detection and ML
   */
  async detectPropertyBoundaries(
    center: Coordinate,
    manualPolygon?: Coordinate[]
  ): Promise<PropertyBoundary> {
    // Create bounds around center point
    const searchRadius = 0.001 // ~100 meters
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(center.lat - searchRadius, center.lng - searchRadius),
      new google.maps.LatLng(center.lat + searchRadius, center.lng + searchRadius)
    )
    
    // Get high-res imagery
    const imagery = await this.getHighResImagery(bounds)
    
    // Detect edges in imagery (simulated - would use actual CV in production)
    const edges = await this.detectEdges(imagery)
    
    // If manual polygon provided, snap to detected boundaries
    if (manualPolygon && manualPolygon.length > 0) {
      return this.snapToBoundaries(manualPolygon, edges)
    }
    
    // Otherwise, detect boundaries automatically
    return this.autoDetectBoundaries(center, edges)
  }
  
  /**
   * Get elevation data for a polygon
   */
  private async getElevationData(polygon: Coordinate[]): Promise<ElevationPoint[]> {
    if (!this.elevationService) {
      throw new Error('Elevation service not initialized')
    }
    
    const locations: google.maps.LatLng[] = []
    
    // Add polygon vertices
    polygon.forEach(coord => {
      locations.push(new google.maps.LatLng(coord.lat, coord.lng))
    })
    
    // Add interior sampling points
    const interiorPoints = this.generateInteriorPoints(polygon, this.ELEVATION_SAMPLE_RATE)
    interiorPoints.forEach(coord => {
      locations.push(new google.maps.LatLng(coord.lat, coord.lng))
    })
    
    // Request elevation data (Google limits to 512 locations per request)
    const elevationPoints: ElevationPoint[] = []
    const batchSize = 512
    
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, Math.min(i + batchSize, locations.length))
      
      const response = await new Promise<google.maps.ElevationResult[]>((resolve, reject) => {
        this.elevationService!.getElevationForLocations(
          { locations: batch },
          (results, status) => {
            if (status === 'OK' && results) {
              resolve(results)
            } else {
              reject(new Error(`Elevation request failed: ${status}`))
            }
          }
        )
      })
      
      response.forEach((result, index) => {
        const location = batch[index]
        elevationPoints.push({
          location: {
            lat: location.lat(),
            lng: location.lng()
          },
          elevation: result.elevation,
          resolution: result.resolution || 10
        })
      })
    }
    
    return elevationPoints
  }
  
  /**
   * Triangulate a polygon using ear clipping algorithm
   */
  private triangulatePolygon(polygon: Coordinate[]): Coordinate[][] {
    const triangles: Coordinate[][] = []
    const vertices = [...polygon]
    
    // Simple ear clipping for convex polygons
    // For production, use a robust library like earcut
    while (vertices.length > 3) {
      // Find an ear (a triangle that can be cut off)
      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length]
        const curr = vertices[i]
        const next = vertices[(i + 1) % vertices.length]
        
        // Check if this forms a valid ear
        if (this.isEar(prev, curr, next, vertices)) {
          triangles.push([prev, curr, next])
          vertices.splice(i, 1)
          break
        }
      }
    }
    
    // Add the final triangle
    if (vertices.length === 3) {
      triangles.push(vertices)
    }
    
    return triangles
  }
  
  /**
   * Check if three vertices form an ear
   */
  private isEar(prev: Coordinate, curr: Coordinate, next: Coordinate, polygon: Coordinate[]): boolean {
    // Check if triangle is counter-clockwise
    const area = (next.lat - prev.lat) * (curr.lng - prev.lng) - 
                 (curr.lat - prev.lat) * (next.lng - prev.lng)
    
    if (area <= 0) return false // Not counter-clockwise
    
    // Check if any other vertex is inside this triangle
    for (const vertex of polygon) {
      if (vertex === prev || vertex === curr || vertex === next) continue
      if (this.isPointInTriangle(vertex, prev, curr, next)) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * Check if a point is inside a triangle
   */
  private isPointInTriangle(p: Coordinate, a: Coordinate, b: Coordinate, c: Coordinate): boolean {
    const sign = (p1: Coordinate, p2: Coordinate, p3: Coordinate) => {
      return (p1.lat - p3.lat) * (p2.lng - p3.lng) - (p2.lat - p3.lat) * (p1.lng - p3.lng)
    }
    
    const d1 = sign(p, a, b)
    const d2 = sign(p, b, c)
    const d3 = sign(p, c, a)
    
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)
    
    return !(hasNeg && hasPos)
  }
  
  /**
   * Calculate 2D area of a triangle
   */
  private calculateTriangleArea2D(triangle: Coordinate[]): number {
    const [a, b, c] = triangle
    
    // Convert to meters for calculation
    const R = 6371000 // Earth's radius in meters
    const lat1 = a.lat * Math.PI / 180
    const lat2 = b.lat * Math.PI / 180
    const lat3 = c.lat * Math.PI / 180
    const lng1 = a.lng * Math.PI / 180
    const lng2 = b.lng * Math.PI / 180
    const lng3 = c.lng * Math.PI / 180
    
    // Calculate distances
    const x1 = R * Math.cos(lat1) * lng1
    const y1 = R * lat1
    const x2 = R * Math.cos(lat2) * lng2
    const y2 = R * lat2
    const x3 = R * Math.cos(lat3) * lng3
    const y3 = R * lat3
    
    // Calculate area using cross product
    const area = Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2
    
    // Convert to square feet
    return area * 10.764
  }
  
  /**
   * Calculate 3D surface area of a triangle with elevations
   */
  private calculateTriangleArea3D(triangle: Coordinate[], elevations: number[]): number {
    const [a, b, c] = triangle
    const [e1, e2, e3] = elevations
    
    // Convert to 3D coordinates (meters)
    const R = 6371000
    const p1 = this.latLngToCartesian(a, e1)
    const p2 = this.latLngToCartesian(b, e2)
    const p3 = this.latLngToCartesian(c, e3)
    
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
    
    // Cross product to get area
    const cross = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    }
    
    const area = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) / 2
    
    // Convert to square feet
    return area * 10.764
  }
  
  /**
   * Convert lat/lng/elevation to Cartesian coordinates
   */
  private latLngToCartesian(coord: Coordinate, elevation: number): { x: number, y: number, z: number } {
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
   * Generate interior sampling points for elevation
   */
  private generateInteriorPoints(polygon: Coordinate[], spacing: number): Coordinate[] {
    const points: Coordinate[] = []
    
    // Get bounding box
    const lats = polygon.map(p => p.lat)
    const lngs = polygon.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    
    // Convert spacing from meters to degrees (approximate)
    const latSpacing = spacing / 111320
    const lngSpacing = spacing / (111320 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180))
    
    // Generate grid points
    for (let lat = minLat; lat <= maxLat; lat += latSpacing) {
      for (let lng = minLng; lng <= maxLng; lng += lngSpacing) {
        const point = { lat, lng }
        
        // Check if point is inside polygon
        if (this.isPointInPolygon(point, polygon)) {
          points.push(point)
        }
      }
    }
    
    return points
  }
  
  /**
   * Check if a point is inside a polygon
   */
  private isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng
      const yi = polygon[i].lat
      const xj = polygon[j].lng
      const yj = polygon[j].lat
      
      const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)
      
      if (intersect) inside = !inside
    }
    
    return inside
  }
  
  /**
   * Generate static map URL
   */
  private generateStaticMapUrl(
    center: google.maps.LatLng,
    bounds: google.maps.LatLngBounds,
    resolution: number
  ): string {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const zoom = this.calculateZoomLevel(bounds, resolution)
    
    return `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${center.lat()},${center.lng()}` +
      `&zoom=${zoom}` +
      `&size=640x640` +
      `&scale=2` + // High DPI
      `&maptype=satellite` +
      `&key=${apiKey}`
  }
  
  /**
   * Calculate appropriate zoom level
   */
  private calculateZoomLevel(bounds: google.maps.LatLngBounds, targetResolution: number): number {
    const latDiff = Math.abs(bounds.getNorthEast().lat() - bounds.getSouthWest().lat())
    const lngDiff = Math.abs(bounds.getNorthEast().lng() - bounds.getSouthWest().lng())
    const maxDiff = Math.max(latDiff, lngDiff)
    
    // Approximate zoom levels for different scales
    if (maxDiff < 0.0005) return 21 // Very high zoom
    if (maxDiff < 0.001) return 20
    if (maxDiff < 0.002) return 19
    if (maxDiff < 0.005) return 18
    if (maxDiff < 0.01) return 17
    if (maxDiff < 0.02) return 16
    return 15
  }
  
  /**
   * Detect edges in imagery (placeholder - would use actual CV)
   */
  private async detectEdges(imagery: ImageryData): Promise<any> {
    // In production, this would:
    // 1. Send imagery to CV service
    // 2. Apply Canny edge detection
    // 3. Use Hough transform for line detection
    // 4. Return edge map with confidence scores
    
    return {
      edges: [],
      confidence: 0.8
    }
  }
  
  /**
   * Snap manual polygon to detected boundaries
   */
  private async snapToBoundaries(
    manualPolygon: Coordinate[],
    edges: any
  ): Promise<PropertyBoundary> {
    // Simplified snapping logic
    // In production, would use sophisticated edge matching
    
    const snappedVertices = manualPolygon.map(vertex => {
      // Find nearest strong edge within threshold
      // Snap vertex to edge if confidence is high
      return vertex // Placeholder
    })
    
    return {
      vertices: snappedVertices,
      confidence: 0.85,
      detectionMethod: 'edge_detection',
      adjustments: {
        original: manualPolygon,
        snapped: snappedVertices,
        distance: manualPolygon.map(() => 0)
      }
    }
  }
  
  /**
   * Auto-detect boundaries from edges
   */
  private async autoDetectBoundaries(
    center: Coordinate,
    edges: any
  ): Promise<PropertyBoundary> {
    // Simplified auto-detection
    // In production, would use ML model for property detection
    
    // Generate a default rectangular boundary
    const size = 0.0003 // ~30 meters
    const vertices: Coordinate[] = [
      { lat: center.lat - size, lng: center.lng - size },
      { lat: center.lat - size, lng: center.lng + size },
      { lat: center.lat + size, lng: center.lng + size },
      { lat: center.lat + size, lng: center.lng - size }
    ]
    
    return {
      vertices,
      confidence: 0.7,
      detectionMethod: 'ml',
      adjustments: {
        original: vertices,
        snapped: vertices,
        distance: vertices.map(() => 0)
      }
    }
  }
}