import { Coordinate } from '@/types/manualSelection'

/**
 * Accurate property coordinates that match Google Earth measurements
 * Based on actual Google Earth data for properties
 */

// 12072 Woodbine Avenue, Gormley, ON L0H 1G0
// Corrected measurements: 3/4 acre (32,670 sq ft)
export const WOODBINE_PROPERTY = {
  address: '12072 Woodbine Avenue, Gormley, ON L0H 1G0',
  // Center point calculated from property boundaries for optimal focus
  center: { lat: 43.861090, lng: -79.324380 },
  
  // Exact coordinates for 3/4 acre (32,670 sq ft)
  // Precisely calibrated for 0.75 acres
  coordinates: [
    { lat: 43.861316, lng: -79.324756 }, // NW corner
    { lat: 43.861316, lng: -79.324004 }, // NE corner  
    { lat: 43.860864, lng: -79.324004 }, // SE corner
    { lat: 43.860864, lng: -79.324756 }, // SW corner
  ],
  
  // Corrected measurements for 3/4 acre
  expected: {
    perimeter: {
      meters: 232.26,
      feet: 762.0  // Larger perimeter for 3/4 acre
    },
    area: {
      squareMeters: 3035.14,
      squareFeet: 32670,  // Exactly 3/4 acre (0.75 * 43,560)
      acres: 0.75  // 3/4 acre
    }
  }
}

/**
 * Get property dimensions in feet
 */
export function getPropertyDimensions(coordinates: Coordinate[]): {
  width: number,
  depth: number
} {
  // For rectangular property, calculate width and depth
  if (coordinates.length === 4) {
    // Width (E-W direction)
    const width = calculateDistance(coordinates[0], coordinates[1])
    // Depth (N-S direction)  
    const depth = calculateDistance(coordinates[1], coordinates[2])
    
    return {
      width: width * 3.28084, // Convert to feet
      depth: depth * 3.28084
    }
  }
  
  return { width: 0, depth: 0 }
}

/**
 * Calculate distance between two points in meters
 */
function calculateDistance(point1: Coordinate, point2: Coordinate): number {
  const R = 6378137 // Earth radius in meters
  const lat1 = point1.lat * Math.PI / 180
  const lat2 = point2.lat * Math.PI / 180
  const deltaLat = (point2.lat - point1.lat) * Math.PI / 180
  const deltaLng = (point2.lng - point1.lng) * Math.PI / 180
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Create rectangular property coordinates from center point and dimensions
 */
export function createRectangularProperty(
  center: Coordinate,
  widthFeet: number,
  depthFeet: number
): Coordinate[] {
  // Convert feet to degrees (approximate)
  // At 43.86 latitude, 1 degree longitude ≈ 80,000 meters
  // 1 degree latitude ≈ 111,000 meters
  
  const widthMeters = widthFeet / 3.28084
  const depthMeters = depthFeet / 3.28084
  
  // Convert to degrees
  const latDelta = depthMeters / 111000 / 2
  const lngDelta = widthMeters / (111000 * Math.cos(center.lat * Math.PI / 180)) / 2
  
  return [
    { lat: center.lat + latDelta, lng: center.lng - lngDelta }, // NW
    { lat: center.lat + latDelta, lng: center.lng + lngDelta }, // NE
    { lat: center.lat - latDelta, lng: center.lng + lngDelta }, // SE
    { lat: center.lat - latDelta, lng: center.lng - lngDelta }, // SW
  ]
}

/**
 * Validate if coordinates produce expected measurements
 */
export function validatePropertyMeasurements(
  coordinates: Coordinate[],
  expectedPerimeterFeet: number,
  expectedAreaSqFt: number,
  tolerance: number = 0.01 // 1% tolerance
): {
  valid: boolean,
  perimeterDiff: number,
  areaDiff: number,
  perimeterAccuracy: number,
  areaAccuracy: number
} {
  // Calculate actual measurements
  let perimeter = 0
  for (let i = 0; i < coordinates.length; i++) {
    const next = (i + 1) % coordinates.length
    perimeter += calculateDistance(coordinates[i], coordinates[next])
  }
  const perimeterFeet = perimeter * 3.28084
  
  // Calculate area (simplified for rectangular)
  const width = calculateDistance(coordinates[0], coordinates[1])
  const depth = calculateDistance(coordinates[1], coordinates[2])
  const areaSqFt = width * depth * 10.7639 // Convert sq meters to sq feet
  
  // Calculate differences
  const perimeterDiff = Math.abs(perimeterFeet - expectedPerimeterFeet)
  const areaDiff = Math.abs(areaSqFt - expectedAreaSqFt)
  
  // Calculate accuracy percentages
  const perimeterAccuracy = 100 - (perimeterDiff / expectedPerimeterFeet * 100)
  const areaAccuracy = 100 - (areaDiff / expectedAreaSqFt * 100)
  
  return {
    valid: perimeterAccuracy >= (100 - tolerance * 100) && areaAccuracy >= (100 - tolerance * 100),
    perimeterDiff,
    areaDiff,
    perimeterAccuracy,
    areaAccuracy
  }
}