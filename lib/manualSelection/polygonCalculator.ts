import { Coordinate, AreaSelection, AreaType } from '@/types/manualSelection'

/**
 * Calculate the area of a polygon using the Shoelace formula
 * @param coordinates Array of lat/lng coordinates
 * @returns Area in square feet
 */
export function calculatePolygonArea(coordinates: Coordinate[]): number {
  if (coordinates.length < 3) return 0
  
  // Ensure polygon is closed
  const polygon = [...coordinates]
  if (polygon[0].lat !== polygon[polygon.length - 1].lat || 
      polygon[0].lng !== polygon[polygon.length - 1].lng) {
    polygon.push(polygon[0])
  }
  
  // Calculate area using Shoelace formula
  let area = 0
  for (let i = 0; i < polygon.length - 1; i++) {
    const p1 = polygon[i]
    const p2 = polygon[i + 1]
    
    // Convert to meters for calculation
    const lat1 = toRadians(p1.lat)
    const lat2 = toRadians(p2.lat)
    const deltaLng = toRadians(p2.lng - p1.lng)
    
    // Simplified area calculation for small areas
    area += deltaLng * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  
  // Convert to square meters
  area = Math.abs(area) * 6378137.0 * 6378137.0 / 2.0
  
  // Convert to square feet
  return area * 10.7639
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate the centroid of a polygon
 */
export function calculateCentroid(coordinates: Coordinate[]): Coordinate {
  let lat = 0
  let lng = 0
  
  for (const coord of coordinates) {
    lat += coord.lat
    lng += coord.lng
  }
  
  return {
    lat: lat / coordinates.length,
    lng: lng / coordinates.length
  }
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat
    
    const intersect = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * Calculate the bounding box of a polygon
 */
export function getBoundingBox(coordinates: Coordinate[]): {
  north: number
  south: number
  east: number
  west: number
} {
  let north = -90
  let south = 90
  let east = -180
  let west = 180
  
  for (const coord of coordinates) {
    north = Math.max(north, coord.lat)
    south = Math.min(south, coord.lat)
    east = Math.max(east, coord.lng)
    west = Math.min(west, coord.lng)
  }
  
  return { north, south, east, west }
}

/**
 * Simplify a polygon by removing points that are too close together
 */
export function simplifyPolygon(coordinates: Coordinate[], tolerance: number = 0.00001): Coordinate[] {
  if (coordinates.length <= 3) return coordinates
  
  const simplified: Coordinate[] = [coordinates[0]]
  
  for (let i = 1; i < coordinates.length; i++) {
    const prev = simplified[simplified.length - 1]
    const curr = coordinates[i]
    
    const distance = Math.sqrt(
      Math.pow(curr.lat - prev.lat, 2) + 
      Math.pow(curr.lng - prev.lng, 2)
    )
    
    if (distance > tolerance) {
      simplified.push(curr)
    }
  }
  
  // Ensure the polygon is closed
  if (simplified.length > 2) {
    const first = simplified[0]
    const last = simplified[simplified.length - 1]
    if (first.lat !== last.lat || first.lng !== last.lng) {
      simplified.push(first)
    }
  }
  
  return simplified
}

/**
 * Convert a rectangle (two corners) to a polygon
 */
export function rectangleToPolygon(corner1: Coordinate, corner2: Coordinate): Coordinate[] {
  return [
    corner1,
    { lat: corner1.lat, lng: corner2.lng },
    corner2,
    { lat: corner2.lat, lng: corner1.lng },
    corner1 // Close the polygon
  ]
}

/**
 * Merge overlapping selections of the same type
 */
export function mergeSelections(selections: AreaSelection[]): Map<AreaType, AreaSelection[]> {
  const grouped = new Map<AreaType, AreaSelection[]>()
  
  for (const selection of selections) {
    if (!grouped.has(selection.type)) {
      grouped.set(selection.type, [])
    }
    grouped.get(selection.type)!.push(selection)
  }
  
  return grouped
}

/**
 * Calculate total area for each area type
 */
export function calculateTotalAreas(selections: AreaSelection[]): Record<AreaType, number> {
  const totals: Record<AreaType, number> = {
    lawn: 0,
    driveway: 0,
    sidewalk: 0,
    building: 0
  }
  
  for (const selection of selections) {
    totals[selection.type] += selection.area
  }
  
  return totals
}

/**
 * Validate if a polygon is valid (minimum 3 points, no self-intersections)
 */
export function isValidPolygon(coordinates: Coordinate[]): boolean {
  if (coordinates.length < 3) return false
  
  // Check for self-intersections (simplified check)
  for (let i = 0; i < coordinates.length - 2; i++) {
    for (let j = i + 2; j < coordinates.length - 1; j++) {
      if (i === 0 && j === coordinates.length - 2) continue // Skip first and last segment
      
      if (doSegmentsIntersect(
        coordinates[i], coordinates[i + 1],
        coordinates[j], coordinates[j + 1]
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
function doSegmentsIntersect(p1: Coordinate, p2: Coordinate, p3: Coordinate, p4: Coordinate): boolean {
  const ccw = (A: Coordinate, B: Coordinate, C: Coordinate) => {
    return (C.lng - A.lng) * (B.lat - A.lat) > (B.lng - A.lng) * (C.lat - A.lat)
  }
  
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
}

/**
 * Convert polygon coordinates to array format for storage
 */
export function polygonToArray(coordinates: Coordinate[]): number[][] {
  return coordinates.map(coord => [coord.lat, coord.lng])
}

/**
 * Convert array format back to polygon coordinates
 */
export function arrayToPolygon(array: number[][]): Coordinate[] {
  return array.map(([lat, lng]) => ({ lat, lng }))
}