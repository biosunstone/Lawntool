import { Coordinate } from '@/types/manualSelection'

/**
 * Google Earth Accurate Measurement Service
 * This service provides measurement calculations that match Google Earth exactly
 */
export class GoogleEarthAccurateMeasurement {
  // Earth radius in meters (WGS84 ellipsoid)
  private readonly EARTH_RADIUS_METERS = 6378137
  
  /**
   * Calculate distance between two points using Google's method
   * This matches Google Earth's measurement exactly
   */
  calculateDistance(point1: Coordinate, point2: Coordinate): number {
    // Convert to radians
    const lat1Rad = this.toRadians(point1.lat)
    const lat2Rad = this.toRadians(point2.lat)
    const deltaLat = this.toRadians(point2.lat - point1.lat)
    const deltaLng = this.toRadians(point2.lng - point1.lng)
    
    // Haversine formula (same as Google Earth)
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    // Distance in meters
    const distanceMeters = this.EARTH_RADIUS_METERS * c
    
    // Convert to feet (1 meter = 3.28084 feet)
    return distanceMeters * 3.28084
  }
  
  /**
   * Calculate perimeter of a polygon (closed path)
   * Matches Google Earth's perimeter calculation
   */
  calculatePerimeter(coordinates: Coordinate[]): { meters: number, feet: number } {
    if (coordinates.length < 2) {
      return { meters: 0, feet: 0 }
    }
    
    let totalDistanceMeters = 0
    
    // Calculate distance between consecutive points
    for (let i = 0; i < coordinates.length - 1; i++) {
      const distance = this.calculateDistanceMeters(coordinates[i], coordinates[i + 1])
      totalDistanceMeters += distance
    }
    
    // Close the polygon (connect last point to first)
    if (coordinates.length > 2) {
      const closingDistance = this.calculateDistanceMeters(
        coordinates[coordinates.length - 1], 
        coordinates[0]
      )
      totalDistanceMeters += closingDistance
    }
    
    return {
      meters: totalDistanceMeters,
      feet: totalDistanceMeters * 3.28084
    }
  }
  
  /**
   * Calculate area of a polygon using Google Earth's method
   * Uses spherical excess formula for accurate results
   */
  calculateArea(coordinates: Coordinate[]): { squareMeters: number, squareFeet: number, acres: number } {
    if (coordinates.length < 3) {
      return { squareMeters: 0, squareFeet: 0, acres: 0 }
    }
    
    // Ensure polygon is closed
    const polygon = [...coordinates]
    if (polygon[0].lat !== polygon[polygon.length - 1].lat || 
        polygon[0].lng !== polygon[polygon.length - 1].lng) {
      polygon.push(polygon[0])
    }
    
    // Calculate spherical area using Google's method
    const area = this.computeSphericalArea(polygon)
    
    // Convert to different units
    const squareMeters = Math.abs(area)
    const squareFeet = squareMeters * 10.7639 // 1 sq meter = 10.7639 sq feet
    const acres = squareFeet / 43560 // 1 acre = 43,560 sq feet
    
    return {
      squareMeters,
      squareFeet,
      acres
    }
  }
  
  /**
   * Compute spherical area of a polygon
   * This matches Google Earth's area calculation algorithm
   */
  private computeSphericalArea(path: Coordinate[]): number {
    if (path.length < 3) return 0
    
    const R = this.EARTH_RADIUS_METERS
    const n = path.length - 1 // Excluding repeated last vertex
    
    let S = 0 // Spherical excess in steradians
    
    for (let v = 0; v < n; v++) {
      const phi1 = this.toRadians(path[v].lat)
      const phi2 = this.toRadians(path[v + 1].lat)
      const deltaLambda = this.toRadians(path[v + 1].lng - path[v].lng)
      
      const E = 2 * Math.atan2(
        Math.tan(deltaLambda / 2) * (Math.tan(phi1 / 2) + Math.tan(phi2 / 2)),
        1 + Math.tan(phi1 / 2) * Math.tan(phi2 / 2)
      )
      
      S += E
    }
    
    // Area in square meters
    return Math.abs(S * R * R)
  }
  
  /**
   * Calculate linear distance for a path (not closed)
   */
  calculatePathDistance(coordinates: Coordinate[]): { meters: number, feet: number } {
    if (coordinates.length < 2) {
      return { meters: 0, feet: 0 }
    }
    
    let totalDistanceMeters = 0
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const distance = this.calculateDistanceMeters(coordinates[i], coordinates[i + 1])
      totalDistanceMeters += distance
    }
    
    return {
      meters: totalDistanceMeters,
      feet: totalDistanceMeters * 3.28084
    }
  }
  
  /**
   * Calculate distance in meters (internal use)
   */
  private calculateDistanceMeters(point1: Coordinate, point2: Coordinate): number {
    const lat1Rad = this.toRadians(point1.lat)
    const lat2Rad = this.toRadians(point2.lat)
    const deltaLat = this.toRadians(point2.lat - point1.lat)
    const deltaLng = this.toRadians(point2.lng - point1.lng)
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return this.EARTH_RADIUS_METERS * c
  }
  
  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
  
  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI)
  }
  
  /**
   * Format area with appropriate units (matching Google Earth display)
   */
  formatArea(squareMeters: number): string {
    const squareFeet = squareMeters * 10.7639
    const acres = squareFeet / 43560
    
    if (acres >= 0.5) {
      return `${acres.toFixed(2)} acres`
    } else if (squareFeet >= 5000) {
      return `${squareFeet.toLocaleString('en-US', { maximumFractionDigits: 0 })} sq ft`
    } else if (squareMeters >= 100) {
      return `${squareMeters.toLocaleString('en-US', { maximumFractionDigits: 0 })} sq m`
    } else {
      return `${squareMeters.toFixed(2)} sq m`
    }
  }
  
  /**
   * Format distance with appropriate units (matching Google Earth display)
   */
  formatDistance(meters: number): string {
    const feet = meters * 3.28084
    const miles = feet / 5280
    const kilometers = meters / 1000
    
    if (miles >= 0.5) {
      return `${miles.toFixed(2)} mi`
    } else if (feet >= 1000) {
      return `${feet.toLocaleString('en-US', { maximumFractionDigits: 0 })} ft`
    } else if (meters >= 100) {
      return `${meters.toLocaleString('en-US', { maximumFractionDigits: 0 })} m`
    } else {
      return `${meters.toFixed(2)} m`
    }
  }
  
  /**
   * Validate measurement against Google Earth expected values
   * Returns true if within acceptable tolerance (< 1%)
   */
  validateMeasurement(
    calculated: number, 
    expected: number, 
    tolerance: number = 0.01
  ): { valid: boolean, difference: number, percentDiff: number } {
    const difference = Math.abs(calculated - expected)
    const percentDiff = (difference / expected) * 100
    
    return {
      valid: percentDiff <= (tolerance * 100),
      difference,
      percentDiff
    }
  }
  
  /**
   * Adjust coordinates for better Google Earth alignment
   * This helps match Google Earth's polygon representation
   */
  alignToGoogleEarth(coordinates: Coordinate[]): Coordinate[] {
    // Ensure proper closure for polygons
    const aligned = [...coordinates]
    
    // Check if first and last points are the same
    const first = aligned[0]
    const last = aligned[aligned.length - 1]
    
    if (first.lat !== last.lat || first.lng !== last.lng) {
      // Close the polygon
      aligned.push({ ...first })
    }
    
    return aligned
  }
  
  /**
   * Calculate bearing between two points (for direction)
   */
  calculateBearing(point1: Coordinate, point2: Coordinate): number {
    const lat1 = this.toRadians(point1.lat)
    const lat2 = this.toRadians(point2.lat)
    const deltaLng = this.toRadians(point2.lng - point1.lng)
    
    const x = Math.sin(deltaLng) * Math.cos(lat2)
    const y = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)
    
    const bearing = this.toDegrees(Math.atan2(x, y))
    
    // Normalize to 0-360 degrees
    return (bearing + 360) % 360
  }
  
  /**
   * Get measurement summary matching Google Earth format
   */
  getMeasurementSummary(coordinates: Coordinate[]): {
    perimeter: { meters: number, feet: number, formatted: string }
    area: { squareMeters: number, squareFeet: number, acres: number, formatted: string }
    segments: { distance: number, bearing: number }[]
  } {
    const perimeter = this.calculatePerimeter(coordinates)
    const area = this.calculateArea(coordinates)
    
    // Calculate individual segments
    const segments = []
    for (let i = 0; i < coordinates.length - 1; i++) {
      segments.push({
        distance: this.calculateDistanceMeters(coordinates[i], coordinates[i + 1]),
        bearing: this.calculateBearing(coordinates[i], coordinates[i + 1])
      })
    }
    
    // Add closing segment
    if (coordinates.length > 2) {
      segments.push({
        distance: this.calculateDistanceMeters(
          coordinates[coordinates.length - 1], 
          coordinates[0]
        ),
        bearing: this.calculateBearing(
          coordinates[coordinates.length - 1], 
          coordinates[0]
        )
      })
    }
    
    return {
      perimeter: {
        meters: perimeter.meters,
        feet: perimeter.feet,
        formatted: this.formatDistance(perimeter.meters)
      },
      area: {
        squareMeters: area.squareMeters,
        squareFeet: area.squareFeet,
        acres: area.acres,
        formatted: this.formatArea(area.squareMeters)
      },
      segments
    }
  }
}