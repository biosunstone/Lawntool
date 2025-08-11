import { Coordinate } from '@/types/manualSelection'
import { EarthEngineService, ImageryData } from '../googleEarth/EarthEngineService'

export interface EdgePoint {
  location: Coordinate
  strength: number // 0-1, edge detection confidence
  direction: number // Edge direction in degrees
  type: 'property_line' | 'fence' | 'driveway' | 'building' | 'vegetation'
}

export interface EdgeMap {
  edges: EdgePoint[]
  resolution: number // meters per pixel
  timestamp: Date
  quality: 'low' | 'medium' | 'high'
}

export interface SnappedPolygon {
  vertices: Coordinate[]
  confidence: number // 0-1
  adjustments: AdjustmentReport[]
  method: 'manual' | 'auto_snap' | 'ai_guided'
}

export interface AdjustmentReport {
  originalVertex: Coordinate
  snappedVertex: Coordinate
  distance: number // meters
  confidence: number // 0-1
  edgeType?: EdgePoint['type']
}

export interface BoundaryDetectionOptions {
  snapRadius: number // meters
  confidenceThreshold: number // 0-1
  preferredEdgeTypes: EdgePoint['type'][]
  smoothingLevel: 'none' | 'light' | 'moderate' | 'heavy'
  preserveAngles: boolean
}

export class BoundarySnapping {
  private earthEngine: EarthEngineService
  private readonly DEFAULT_SNAP_RADIUS = 5 // meters
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.75
  
  constructor() {
    this.earthEngine = new EarthEngineService()
  }
  
  /**
   * Initialize with Google Maps instance
   */
  async initialize(map: google.maps.Map): Promise<void> {
    await this.earthEngine.initialize(map)
  }
  
  /**
   * Snap manual polygon to detected property boundaries
   */
  async snapToBoundaries(
    manualPolygon: Coordinate[],
    imagery: ImageryData,
    options?: Partial<BoundaryDetectionOptions>
  ): Promise<SnappedPolygon> {
    const opts: BoundaryDetectionOptions = {
      snapRadius: this.DEFAULT_SNAP_RADIUS,
      confidenceThreshold: this.DEFAULT_CONFIDENCE_THRESHOLD,
      preferredEdgeTypes: ['property_line', 'fence'],
      smoothingLevel: 'moderate',
      preserveAngles: true,
      ...options
    }
    
    // Step 1: Detect edges in the imagery
    const edgeMap = await this.detectEdges(imagery)
    
    // Step 2: Find closest edges for each vertex
    const adjustments: AdjustmentReport[] = []
    const snappedVertices: Coordinate[] = []
    
    for (const vertex of manualPolygon) {
      const nearbyEdges = this.findNearbyEdges(vertex, edgeMap.edges, opts.snapRadius)
      
      if (nearbyEdges.length > 0) {
        // Snap to the best edge
        const bestEdge = this.selectBestEdge(nearbyEdges, opts.preferredEdgeTypes)
        
        if (bestEdge.strength >= opts.confidenceThreshold) {
          const snappedVertex = this.snapToEdge(vertex, bestEdge, opts.preserveAngles)
          snappedVertices.push(snappedVertex)
          
          adjustments.push({
            originalVertex: vertex,
            snappedVertex,
            distance: this.calculateDistance(vertex, snappedVertex),
            confidence: bestEdge.strength,
            edgeType: bestEdge.type
          })
        } else {
          // Keep original if confidence too low
          snappedVertices.push(vertex)
          adjustments.push({
            originalVertex: vertex,
            snappedVertex: vertex,
            distance: 0,
            confidence: 0,
            edgeType: undefined
          })
        }
      } else {
        // No edges nearby, keep original
        snappedVertices.push(vertex)
        adjustments.push({
          originalVertex: vertex,
          snappedVertex: vertex,
          distance: 0,
          confidence: 0,
          edgeType: undefined
        })
      }
    }
    
    // Step 3: Smooth the polygon along detected boundaries
    const smoothedVertices = this.smoothAlongBoundaries(
      snappedVertices,
      edgeMap.edges,
      opts.smoothingLevel
    )
    
    // Step 4: Validate and adjust for common property shapes
    const validatedVertices = this.validatePropertyShape(smoothedVertices)
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(adjustments, edgeMap)
    
    return {
      vertices: validatedVertices,
      confidence,
      adjustments,
      method: confidence > 0.8 ? 'ai_guided' : 'auto_snap'
    }
  }
  
  /**
   * Auto-detect property boundaries without manual input
   */
  async autoDetectBoundaries(
    center: Coordinate,
    searchRadius: number = 50 // meters
  ): Promise<SnappedPolygon> {
    // Create search bounds
    const bounds = this.createBounds(center, searchRadius)
    
    // Get high-res imagery
    const imagery = await this.earthEngine.getHighResImagery(bounds)
    
    // Detect all edges
    const edgeMap = await this.detectEdges(imagery)
    
    // Find closed loops that likely represent property boundaries
    const boundaryLoops = this.findBoundaryLoops(edgeMap.edges, center)
    
    if (boundaryLoops.length === 0) {
      // Fallback to rectangular approximation
      return this.createDefaultBoundary(center, searchRadius)
    }
    
    // Select the most likely property boundary
    const bestBoundary = this.selectBestBoundary(boundaryLoops, center)
    
    // Simplify and validate
    const simplified = this.simplifyPolygon(bestBoundary.vertices, 2) // 2 meter tolerance
    const validated = this.validatePropertyShape(simplified)
    
    return {
      vertices: validated,
      confidence: bestBoundary.confidence,
      adjustments: [],
      method: 'ai_guided'
    }
  }
  
  /**
   * Detect edges in imagery using computer vision
   */
  private async detectEdges(imagery: ImageryData): Promise<EdgeMap> {
    // In production, this would send imagery to a CV service
    // For now, simulate edge detection with realistic patterns
    
    const edges: EdgePoint[] = []
    const bounds = imagery.bounds
    const center = bounds.getCenter()
    
    // Simulate property boundary edges
    const propertySize = 0.0003 // ~30 meters
    const numEdges = 20
    
    for (let i = 0; i < numEdges; i++) {
      const angle = (i / numEdges) * Math.PI * 2
      const radius = propertySize * (0.8 + Math.random() * 0.4)
      
      edges.push({
        location: {
          lat: center.lat() + Math.sin(angle) * radius,
          lng: center.lng() + Math.cos(angle) * radius * Math.cos(center.lat() * Math.PI / 180)
        },
        strength: 0.7 + Math.random() * 0.3,
        direction: (angle * 180 / Math.PI + 90) % 360,
        type: Math.random() > 0.7 ? 'fence' : 'property_line'
      })
    }
    
    // Add some noise edges
    for (let i = 0; i < 10; i++) {
      edges.push({
        location: {
          lat: center.lat() + (Math.random() - 0.5) * propertySize * 2,
          lng: center.lng() + (Math.random() - 0.5) * propertySize * 2
        },
        strength: 0.3 + Math.random() * 0.4,
        direction: Math.random() * 360,
        type: 'vegetation'
      })
    }
    
    return {
      edges,
      resolution: imagery.resolution,
      timestamp: new Date(),
      quality: imagery.resolution < 0.3 ? 'high' : imagery.resolution < 0.6 ? 'medium' : 'low'
    }
  }
  
  /**
   * Find edges near a vertex
   */
  private findNearbyEdges(
    vertex: Coordinate,
    edges: EdgePoint[],
    radius: number
  ): EdgePoint[] {
    const nearbyEdges: EdgePoint[] = []
    
    for (const edge of edges) {
      const distance = this.calculateDistance(vertex, edge.location)
      if (distance <= radius) {
        nearbyEdges.push(edge)
      }
    }
    
    // Sort by distance
    nearbyEdges.sort((a, b) => {
      const distA = this.calculateDistance(vertex, a.location)
      const distB = this.calculateDistance(vertex, b.location)
      return distA - distB
    })
    
    return nearbyEdges
  }
  
  /**
   * Select the best edge based on preferences
   */
  private selectBestEdge(
    edges: EdgePoint[],
    preferredTypes: EdgePoint['type'][]
  ): EdgePoint {
    // First, try to find preferred edge types
    for (const type of preferredTypes) {
      const preferredEdges = edges.filter(e => e.type === type)
      if (preferredEdges.length > 0) {
        // Return the strongest edge of preferred type
        return preferredEdges.reduce((best, edge) => 
          edge.strength > best.strength ? edge : best
        )
      }
    }
    
    // Fallback to strongest edge overall
    return edges.reduce((best, edge) => 
      edge.strength > best.strength ? edge : best
    )
  }
  
  /**
   * Snap vertex to edge
   */
  private snapToEdge(
    vertex: Coordinate,
    edge: EdgePoint,
    preserveAngles: boolean
  ): Coordinate {
    if (!preserveAngles) {
      // Direct snap to edge point
      return edge.location
    }
    
    // Snap while trying to preserve right angles
    const snapAngle = Math.round(edge.direction / 90) * 90
    const angleRad = snapAngle * Math.PI / 180
    
    // Project vertex onto edge direction
    const dx = vertex.lng - edge.location.lng
    const dy = vertex.lat - edge.location.lat
    
    const projectionLength = dx * Math.cos(angleRad) + dy * Math.sin(angleRad)
    
    return {
      lat: edge.location.lat + projectionLength * Math.sin(angleRad),
      lng: edge.location.lng + projectionLength * Math.cos(angleRad)
    }
  }
  
  /**
   * Smooth polygon along detected boundaries
   */
  private smoothAlongBoundaries(
    vertices: Coordinate[],
    edges: EdgePoint[],
    smoothingLevel: BoundaryDetectionOptions['smoothingLevel']
  ): Coordinate[] {
    if (smoothingLevel === 'none') return vertices
    
    const smoothed: Coordinate[] = []
    const iterations = smoothingLevel === 'light' ? 1 : 
                      smoothingLevel === 'moderate' ? 2 : 3
    
    let currentVertices = [...vertices]
    
    for (let iter = 0; iter < iterations; iter++) {
      smoothed.length = 0
      
      for (let i = 0; i < currentVertices.length; i++) {
        const prev = currentVertices[(i - 1 + currentVertices.length) % currentVertices.length]
        const curr = currentVertices[i]
        const next = currentVertices[(i + 1) % currentVertices.length]
        
        // Find edges between vertices
        const edgesBetween = this.findEdgesBetween(prev, next, edges)
        
        if (edgesBetween.length > 0) {
          // Adjust current vertex based on edge alignment
          const aligned = this.alignToEdges(curr, edgesBetween)
          smoothed.push(aligned)
        } else {
          // Simple smoothing
          smoothed.push({
            lat: (prev.lat + curr.lat * 2 + next.lat) / 4,
            lng: (prev.lng + curr.lng * 2 + next.lng) / 4
          })
        }
      }
      
      currentVertices = [...smoothed]
    }
    
    return smoothed
  }
  
  /**
   * Find edges between two vertices
   */
  private findEdgesBetween(
    v1: Coordinate,
    v2: Coordinate,
    edges: EdgePoint[]
  ): EdgePoint[] {
    const between: EdgePoint[] = []
    
    for (const edge of edges) {
      // Check if edge is roughly between vertices
      const d1 = this.calculateDistance(v1, edge.location)
      const d2 = this.calculateDistance(v2, edge.location)
      const d12 = this.calculateDistance(v1, v2)
      
      if (d1 + d2 < d12 * 1.2) { // Within 20% of direct path
        between.push(edge)
      }
    }
    
    return between
  }
  
  /**
   * Align vertex to edges
   */
  private alignToEdges(vertex: Coordinate, edges: EdgePoint[]): Coordinate {
    if (edges.length === 0) return vertex
    
    // Calculate weighted average position
    let totalWeight = 0
    let weightedLat = 0
    let weightedLng = 0
    
    for (const edge of edges) {
      const weight = edge.strength
      totalWeight += weight
      weightedLat += edge.location.lat * weight
      weightedLng += edge.location.lng * weight
    }
    
    if (totalWeight > 0) {
      return {
        lat: weightedLat / totalWeight,
        lng: weightedLng / totalWeight
      }
    }
    
    return vertex
  }
  
  /**
   * Validate and adjust property shape
   */
  private validatePropertyShape(vertices: Coordinate[]): Coordinate[] {
    // Check for common property patterns
    const isRectangular = this.checkRectangular(vertices)
    const angles = this.calculateAngles(vertices)
    
    // Adjust to make more regular if appropriate
    if (isRectangular) {
      return this.enforceRightAngles(vertices)
    }
    
    // Ensure minimum vertices
    if (vertices.length < 3) {
      return this.createDefaultPolygon(vertices[0])
    }
    
    // Remove redundant vertices (collinear points)
    return this.removeCollinearPoints(vertices)
  }
  
  /**
   * Check if polygon is roughly rectangular
   */
  private checkRectangular(vertices: Coordinate[]): boolean {
    if (vertices.length !== 4 && vertices.length !== 5) return false
    
    const angles = this.calculateAngles(vertices)
    const rightAngles = angles.filter(a => Math.abs(a - 90) < 15).length
    
    return rightAngles >= 3
  }
  
  /**
   * Calculate angles at each vertex
   */
  private calculateAngles(vertices: Coordinate[]): number[] {
    const angles: number[] = []
    
    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length]
      const curr = vertices[i]
      const next = vertices[(i + 1) % vertices.length]
      
      const angle1 = Math.atan2(prev.lat - curr.lat, prev.lng - curr.lng)
      const angle2 = Math.atan2(next.lat - curr.lat, next.lng - curr.lng)
      
      let angle = (angle2 - angle1) * 180 / Math.PI
      if (angle < 0) angle += 360
      if (angle > 180) angle = 360 - angle
      
      angles.push(angle)
    }
    
    return angles
  }
  
  /**
   * Enforce right angles for rectangular properties
   */
  private enforceRightAngles(vertices: Coordinate[]): Coordinate[] {
    if (vertices.length !== 4) return vertices
    
    // Find the two most perpendicular edges
    const center = this.calculateCentroid(vertices)
    
    // Calculate average width and height
    const distances = vertices.map(v => ({
      lat: v.lat - center.lat,
      lng: v.lng - center.lng
    }))
    
    // Find primary axis
    const avgAngle = Math.atan2(
      distances[1].lat - distances[0].lat,
      distances[1].lng - distances[0].lng
    )
    
    // Create perfect rectangle aligned to primary axis
    const width = this.calculateDistance(vertices[0], vertices[1])
    const height = this.calculateDistance(vertices[1], vertices[2])
    
    const cos = Math.cos(avgAngle)
    const sin = Math.sin(avgAngle)
    
    return [
      {
        lat: center.lat - height/2 * sin - width/2 * cos,
        lng: center.lng - height/2 * cos + width/2 * sin
      },
      {
        lat: center.lat - height/2 * sin + width/2 * cos,
        lng: center.lng - height/2 * cos - width/2 * sin
      },
      {
        lat: center.lat + height/2 * sin + width/2 * cos,
        lng: center.lng + height/2 * cos - width/2 * sin
      },
      {
        lat: center.lat + height/2 * sin - width/2 * cos,
        lng: center.lng + height/2 * cos + width/2 * sin
      }
    ]
  }
  
  /**
   * Remove collinear points
   */
  private removeCollinearPoints(vertices: Coordinate[]): Coordinate[] {
    const filtered: Coordinate[] = []
    
    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length]
      const curr = vertices[i]
      const next = vertices[(i + 1) % vertices.length]
      
      // Check if current point is collinear with neighbors
      const cross = (next.lat - prev.lat) * (curr.lng - prev.lng) -
                   (curr.lat - prev.lat) * (next.lng - prev.lng)
      
      if (Math.abs(cross) > 0.00000001) { // Not collinear
        filtered.push(curr)
      }
    }
    
    return filtered.length >= 3 ? filtered : vertices
  }
  
  /**
   * Find closed boundary loops
   */
  private findBoundaryLoops(edges: EdgePoint[], center: Coordinate): any[] {
    // Simplified boundary detection
    // In production, use graph algorithms to find closed loops
    
    const loops: any[] = []
    
    // Group edges by proximity
    const groups = this.groupEdgesByProximity(edges, 10) // 10 meter threshold
    
    for (const group of groups) {
      if (group.length >= 4) { // Minimum for closed loop
        // Order edges to form polygon
        const ordered = this.orderEdgesIntoPolygon(group)
        
        if (ordered.length >= 4) {
          loops.push({
            vertices: ordered.map(e => e.location),
            confidence: ordered.reduce((sum, e) => sum + e.strength, 0) / ordered.length
          })
        }
      }
    }
    
    return loops
  }
  
  /**
   * Group edges by proximity
   */
  private groupEdgesByProximity(edges: EdgePoint[], threshold: number): EdgePoint[][] {
    const groups: EdgePoint[][] = []
    const used = new Set<EdgePoint>()
    
    for (const edge of edges) {
      if (used.has(edge)) continue
      
      const group: EdgePoint[] = [edge]
      used.add(edge)
      
      // Find all connected edges
      let added = true
      while (added) {
        added = false
        
        for (const other of edges) {
          if (used.has(other)) continue
          
          // Check if connected to any edge in group
          for (const groupEdge of group) {
            const distance = this.calculateDistance(groupEdge.location, other.location)
            
            if (distance <= threshold) {
              group.push(other)
              used.add(other)
              added = true
              break
            }
          }
        }
      }
      
      groups.push(group)
    }
    
    return groups
  }
  
  /**
   * Order edges into polygon
   */
  private orderEdgesIntoPolygon(edges: EdgePoint[]): EdgePoint[] {
    if (edges.length < 3) return edges
    
    const ordered: EdgePoint[] = []
    const remaining = [...edges]
    
    // Start with arbitrary edge
    ordered.push(remaining.shift()!)
    
    // Greedily add closest edges
    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1]
      let closestIndex = 0
      let closestDistance = Infinity
      
      for (let i = 0; i < remaining.length; i++) {
        const distance = this.calculateDistance(last.location, remaining[i].location)
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = i
        }
      }
      
      ordered.push(remaining.splice(closestIndex, 1)[0])
    }
    
    return ordered
  }
  
  /**
   * Select best boundary from candidates
   */
  private selectBestBoundary(boundaries: any[], center: Coordinate): any {
    // Score boundaries based on various factors
    let bestBoundary = boundaries[0]
    let bestScore = 0
    
    for (const boundary of boundaries) {
      let score = 0
      
      // Confidence score
      score += boundary.confidence * 10
      
      // Prefer boundaries close to center
      const boundaryCenter = this.calculateCentroid(boundary.vertices)
      const distance = this.calculateDistance(center, boundaryCenter)
      score += Math.max(0, 10 - distance / 10)
      
      // Prefer regular shapes
      const angles = this.calculateAngles(boundary.vertices)
      const rightAngles = angles.filter(a => Math.abs(a - 90) < 15).length
      score += rightAngles * 2
      
      // Prefer reasonable sizes (1000-10000 sq meters)
      const area = this.calculatePolygonArea(boundary.vertices)
      if (area > 1000 && area < 10000) {
        score += 5
      }
      
      if (score > bestScore) {
        bestScore = score
        bestBoundary = boundary
      }
    }
    
    return bestBoundary
  }
  
  /**
   * Simplify polygon using Douglas-Peucker algorithm
   */
  private simplifyPolygon(vertices: Coordinate[], tolerance: number): Coordinate[] {
    if (vertices.length <= 3) return vertices
    
    // Find point with maximum distance from line between first and last
    let maxDistance = 0
    let maxIndex = 0
    
    const first = vertices[0]
    const last = vertices[vertices.length - 1]
    
    for (let i = 1; i < vertices.length - 1; i++) {
      const distance = this.pointToLineDistance(vertices[i], first, last)
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = this.simplifyPolygon(vertices.slice(0, maxIndex + 1), tolerance)
      const right = this.simplifyPolygon(vertices.slice(maxIndex), tolerance)
      
      return [...left.slice(0, -1), ...right]
    }
    
    // Otherwise, return just the endpoints
    return [first, last]
  }
  
  /**
   * Calculate distance from point to line
   */
  private pointToLineDistance(point: Coordinate, lineStart: Coordinate, lineEnd: Coordinate): number {
    const A = point.lat - lineStart.lat
    const B = point.lng - lineStart.lng
    const C = lineEnd.lat - lineStart.lat
    const D = lineEnd.lng - lineStart.lng
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    
    if (lenSq !== 0) {
      param = dot / lenSq
    }
    
    let xx, yy
    
    if (param < 0) {
      xx = lineStart.lat
      yy = lineStart.lng
    } else if (param > 1) {
      xx = lineEnd.lat
      yy = lineEnd.lng
    } else {
      xx = lineStart.lat + param * C
      yy = lineStart.lng + param * D
    }
    
    const dx = point.lat - xx
    const dy = point.lng - yy
    
    return Math.sqrt(dx * dx + dy * dy) * 111320 // Convert to meters
  }
  
  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    adjustments: AdjustmentReport[],
    edgeMap: EdgeMap
  ): number {
    if (adjustments.length === 0) return 0
    
    // Base confidence on adjustments
    const avgAdjustmentConfidence = adjustments.reduce((sum, a) => sum + a.confidence, 0) / adjustments.length
    
    // Factor in edge map quality
    let qualityMultiplier = 1
    switch (edgeMap.quality) {
      case 'high': qualityMultiplier = 1; break
      case 'medium': qualityMultiplier = 0.9; break
      case 'low': qualityMultiplier = 0.7; break
    }
    
    // Factor in adjustment distances
    const avgDistance = adjustments.reduce((sum, a) => sum + a.distance, 0) / adjustments.length
    const distancePenalty = Math.max(0, 1 - avgDistance / 20) // Penalty for large adjustments
    
    return Math.min(1, avgAdjustmentConfidence * qualityMultiplier * distancePenalty)
  }
  
  /**
   * Create bounds from center and radius
   */
  private createBounds(center: Coordinate, radiusMeters: number): google.maps.LatLngBounds {
    const latOffset = radiusMeters / 111320
    const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180))
    
    return new google.maps.LatLngBounds(
      new google.maps.LatLng(center.lat - latOffset, center.lng - lngOffset),
      new google.maps.LatLng(center.lat + latOffset, center.lng + lngOffset)
    )
  }
  
  /**
   * Create default boundary
   */
  private createDefaultBoundary(center: Coordinate, radius: number): SnappedPolygon {
    const vertices = this.createDefaultPolygon(center, radius / 111320)
    
    return {
      vertices,
      confidence: 0.5,
      adjustments: [],
      method: 'manual'
    }
  }
  
  /**
   * Create default polygon
   */
  private createDefaultPolygon(center: Coordinate, size: number = 0.0003): Coordinate[] {
    return [
      { lat: center.lat - size, lng: center.lng - size },
      { lat: center.lat - size, lng: center.lng + size },
      { lat: center.lat + size, lng: center.lng + size },
      { lat: center.lat + size, lng: center.lng - size }
    ]
  }
  
  /**
   * Calculate distance between coordinates
   */
  private calculateDistance(c1: Coordinate, c2: Coordinate): number {
    const R = 6371000 // Earth radius in meters
    const lat1 = c1.lat * Math.PI / 180
    const lat2 = c2.lat * Math.PI / 180
    const deltaLat = (c2.lat - c1.lat) * Math.PI / 180
    const deltaLng = (c2.lng - c1.lng) * Math.PI / 180
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c
  }
  
  /**
   * Calculate polygon area
   */
  private calculatePolygonArea(vertices: Coordinate[]): number {
    let area = 0
    
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length
      area += vertices[i].lat * vertices[j].lng
      area -= vertices[j].lat * vertices[i].lng
    }
    
    area = Math.abs(area) / 2
    
    // Convert to square meters
    const R = 6371000
    return area * R * R * Math.cos(vertices[0].lat * Math.PI / 180)
  }
  
  /**
   * Calculate centroid of polygon
   */
  private calculateCentroid(vertices: Coordinate[]): Coordinate {
    let lat = 0
    let lng = 0
    
    for (const vertex of vertices) {
      lat += vertex.lat
      lng += vertex.lng
    }
    
    return {
      lat: lat / vertices.length,
      lng: lng / vertices.length
    }
  }
}