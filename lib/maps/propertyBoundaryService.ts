/**
 * Property Boundary Detection and Management Service
 * Handles polygon creation, editing, and area calculations
 */

export interface LatLng {
  lat: number
  lng: number
}

export interface PropertyBoundary {
  polygon: LatLng[]
  area: number // in square feet
  perimeter: number // in feet
  center: LatLng
  zoomLevel: number
}

export interface MeasurementData {
  lawn?: {
    area: number
    polygon: LatLng[]
  }
  driveway?: {
    area: number
    polygon: LatLng[]
  }
  house?: {
    area: number
    perimeter: number
    polygon: LatLng[]
  }
  lot?: {
    area: number
    polygon: LatLng[]
  }
}

export class PropertyBoundaryService {
  private static readonly EARTH_RADIUS = 6371000 // meters
  
  /**
   * Calculate area of polygon using Shoelace formula
   */
  static calculateArea(polygon: LatLng[]): number {
    if (polygon.length < 3) return 0
    
    let area = 0
    const numPoints = polygon.length
    
    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints
      area += polygon[i].lng * polygon[j].lat
      area -= polygon[j].lng * polygon[i].lat
    }
    
    area = Math.abs(area) / 2
    
    // Convert to square meters then to square feet
    const avgLat = polygon.reduce((sum, p) => sum + p.lat, 0) / numPoints
    const metersPerDegree = this.EARTH_RADIUS * Math.PI / 180 * Math.cos(avgLat * Math.PI / 180)
    const areaInMeters = area * metersPerDegree * metersPerDegree
    const areaInFeet = areaInMeters * 10.764 // Convert to square feet
    
    return Math.round(areaInFeet)
  }
  
  /**
   * Calculate perimeter of polygon
   */
  static calculatePerimeter(polygon: LatLng[]): number {
    if (polygon.length < 2) return 0
    
    let perimeter = 0
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      perimeter += this.calculateDistance(polygon[i], polygon[j])
    }
    
    return Math.round(perimeter * 3.281) // Convert meters to feet
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(point1: LatLng, point2: LatLng): number {
    const lat1Rad = point1.lat * Math.PI / 180
    const lat2Rad = point2.lat * Math.PI / 180
    const deltaLat = (point2.lat - point1.lat) * Math.PI / 180
    const deltaLng = (point2.lng - point1.lng) * Math.PI / 180
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return this.EARTH_RADIUS * c
  }
  
  /**
   * Get center point of polygon
   */
  static getPolygonCenter(polygon: LatLng[]): LatLng {
    if (polygon.length === 0) return { lat: 0, lng: 0 }
    
    const sum = polygon.reduce((acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng
    }), { lat: 0, lng: 0 })
    
    return {
      lat: sum.lat / polygon.length,
      lng: sum.lng / polygon.length
    }
  }
  
  /**
   * Get appropriate zoom level based on polygon bounds
   */
  static getZoomLevel(polygon: LatLng[]): number {
    if (polygon.length === 0) return 18
    
    const bounds = this.getPolygonBounds(polygon)
    const latDiff = bounds.north - bounds.south
    const lngDiff = bounds.east - bounds.west
    const maxDiff = Math.max(latDiff, lngDiff)
    
    // Approximate zoom levels based on bounds
    if (maxDiff > 0.01) return 16
    if (maxDiff > 0.005) return 17
    if (maxDiff > 0.002) return 18
    if (maxDiff > 0.001) return 19
    return 20
  }
  
  /**
   * Get bounding box of polygon
   */
  static getPolygonBounds(polygon: LatLng[]) {
    if (polygon.length === 0) {
      return { north: 0, south: 0, east: 0, west: 0 }
    }
    
    const lats = polygon.map(p => p.lat)
    const lngs = polygon.map(p => p.lng)
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
  }
  
  /**
   * Generate default property boundary from address center
   * Creates a rectangular polygon around the center point
   */
  static generateDefaultBoundary(center: LatLng, sizeInFeet: number = 5000): LatLng[] {
    // Calculate offset in degrees for the given size
    const metersPerDegree = this.EARTH_RADIUS * Math.PI / 180 * Math.cos(center.lat * Math.PI / 180)
    const sizeInMeters = Math.sqrt(sizeInFeet / 10.764) // Convert sq ft to meters per side
    const offset = sizeInMeters / metersPerDegree / 2
    
    // Create a rectangle
    return [
      { lat: center.lat + offset, lng: center.lng - offset }, // Top-left
      { lat: center.lat + offset, lng: center.lng + offset }, // Top-right
      { lat: center.lat - offset, lng: center.lng + offset }, // Bottom-right
      { lat: center.lat - offset, lng: center.lng - offset }, // Bottom-left
    ]
  }
  
  /**
   * Simplify polygon by removing points that are too close
   */
  static simplifyPolygon(polygon: LatLng[], tolerance: number = 0.00001): LatLng[] {
    if (polygon.length <= 3) return polygon
    
    const simplified: LatLng[] = [polygon[0]]
    
    for (let i = 1; i < polygon.length; i++) {
      const distance = this.calculateDistance(
        simplified[simplified.length - 1],
        polygon[i]
      )
      
      if (distance > tolerance * this.EARTH_RADIUS) {
        simplified.push(polygon[i])
      }
    }
    
    // Ensure the polygon is closed
    if (simplified.length > 2) {
      const firstLast = this.calculateDistance(simplified[0], simplified[simplified.length - 1])
      if (firstLast < tolerance * this.EARTH_RADIUS) {
        simplified.pop()
      }
    }
    
    return simplified
  }
  
  /**
   * Validate polygon (minimum 3 points, no self-intersection)
   */
  static validatePolygon(polygon: LatLng[]): boolean {
    if (polygon.length < 3) return false
    
    // Check for self-intersection (simplified check)
    for (let i = 0; i < polygon.length - 1; i++) {
      for (let j = i + 2; j < polygon.length - 1; j++) {
        if (this.doSegmentsIntersect(
          polygon[i], polygon[i + 1],
          polygon[j], polygon[j + 1]
        )) {
          return false
        }
      }
    }
    
    return true
  }
  
  /**
   * Check if two line segments intersect
   */
  private static doSegmentsIntersect(
    p1: LatLng, p2: LatLng,
    p3: LatLng, p4: LatLng
  ): boolean {
    const ccw = (A: LatLng, B: LatLng, C: LatLng) => {
      return (C.lng - A.lng) * (B.lat - A.lat) > (B.lng - A.lng) * (C.lat - A.lat)
    }
    
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  }
  
  /**
   * Create measurement data from multiple polygons
   */
  static createMeasurementData(
    lotPolygon: LatLng[],
    housePolygon?: LatLng[],
    drivewayPolygon?: LatLng[]
  ): MeasurementData {
    const data: MeasurementData = {}
    
    // Calculate lot measurements
    if (lotPolygon.length >= 3) {
      data.lot = {
        area: this.calculateArea(lotPolygon),
        polygon: lotPolygon
      }
      
      // Calculate lawn area (lot minus house and driveway)
      let lawnArea = data.lot.area
      
      if (housePolygon && housePolygon.length >= 3) {
        const houseArea = this.calculateArea(housePolygon)
        data.house = {
          area: houseArea,
          perimeter: this.calculatePerimeter(housePolygon),
          polygon: housePolygon
        }
        lawnArea -= houseArea
      }
      
      if (drivewayPolygon && drivewayPolygon.length >= 3) {
        const drivewayArea = this.calculateArea(drivewayPolygon)
        data.driveway = {
          area: drivewayArea,
          polygon: drivewayPolygon
        }
        lawnArea -= drivewayArea
      }
      
      data.lawn = {
        area: Math.max(0, lawnArea),
        polygon: lotPolygon
      }
    }
    
    return data
  }
  
  /**
   * Format area for display
   */
  static formatArea(squareFeet: number): string {
    if (squareFeet >= 43560) {
      const acres = (squareFeet / 43560).toFixed(2)
      return `${acres} acres`
    }
    return `${squareFeet.toLocaleString()} sq ft`
  }
  
  /**
   * Format perimeter for display
   */
  static formatPerimeter(feet: number): string {
    return `${feet.toLocaleString()} ft`
  }
}