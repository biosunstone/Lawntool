import { Libraries } from '@react-google-maps/api'
import { detectPropertyType, estimatePropertyDimensions, detectBoundariesFromImagery } from './geospatialAnalysis'

interface Coordinate {
  lat: number
  lng: number
}

interface PropertyBoundaries {
  property: Coordinate[]
  lawn: {
    frontYard: Coordinate[]
    backYard: Coordinate[]
    sideYard: Coordinate[]
  }
  driveway: Coordinate[]
  building: Coordinate[]
  sidewalk: Coordinate[]
}

interface MeasurementResult {
  totalArea: number
  lawn: {
    frontYard: number
    backYard: number
    sideYard: number
    total: number
  }
  driveway: number
  sidewalk: number
  building: number
  other: number
}

// Calculate area of a polygon using the Shoelace formula with latitude correction
export function calculatePolygonArea(coordinates: Coordinate[]): number {
  if (coordinates.length < 3) return 0
  
  let area = 0
  const n = coordinates.length
  
  // Calculate centroid for latitude correction
  let centroidLat = 0
  for (const coord of coordinates) {
    centroidLat += coord.lat
  }
  centroidLat /= n
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += coordinates[i].lat * coordinates[j].lng
    area -= coordinates[j].lat * coordinates[i].lng
  }
  
  area = Math.abs(area) / 2
  
  // Convert from degrees to square meters with latitude correction
  const metersPerDegreeLat = 111320 // Constant for latitude
  const metersPerDegreeLng = 111320 * Math.cos(centroidLat * Math.PI / 180) // Varies with latitude
  const squareMetersArea = area * metersPerDegreeLat * metersPerDegreeLng
  
  // Convert to square feet (1 square meter = 10.764 square feet)
  return squareMetersArea * 10.764
}

// Generate property boundaries based on geocoded location
// This uses a more sophisticated approach to estimate property lines
export async function detectPropertyBoundaries(
  center: Coordinate,
  map: google.maps.Map | null,
  address?: string
): Promise<PropertyBoundaries> {
  // Get viewport information
  const zoom = map?.getZoom() || 19
  const bounds = await getViewportBounds(center, map)
  
  // Get pixel bounds if available
  const container = map?.getDiv()
  const pixelBounds = {
    width: container?.offsetWidth || 800,
    height: container?.offsetHeight || 600
  }
  
  // Detect property type from address
  const propertyType = detectPropertyType(address || '')
  
  // Estimate property dimensions based on viewport and zoom
  const propertyDimensions = estimatePropertyDimensions({
    center,
    address: address || '',
    viewport: {
      zoom,
      bounds,
      pixelBounds
    }
  })
  
  // Use advanced boundary detection
  const boundaries = detectBoundariesFromImagery(center, propertyDimensions, propertyType)
  
  return boundaries
}

// Get viewport bounds from map
async function getViewportBounds(
  center: Coordinate,
  map: google.maps.Map | null
): Promise<google.maps.LatLngBoundsLiteral> {
  if (map) {
    const bounds = map.getBounds()
    if (bounds) {
      return {
        north: bounds.getNorthEast().lat(),
        south: bounds.getSouthWest().lat(),
        east: bounds.getNorthEast().lng(),
        west: bounds.getSouthWest().lng()
      }
    }
  }
  
  // Fallback: estimate bounds based on typical zoom level
  const defaultSpan = 0.001 // Approximately 100 meters
  return {
    north: center.lat + defaultSpan,
    south: center.lat - defaultSpan,
    east: center.lng + defaultSpan,
    west: center.lng - defaultSpan
  }
}

// Calculate measurements from detected boundaries
export function calculateMeasurements(boundaries: PropertyBoundaries): MeasurementResult {
  const totalArea = calculatePolygonArea(boundaries.property)
  
  const frontYardArea = calculatePolygonArea(boundaries.lawn.frontYard)
  const backYardArea = calculatePolygonArea(boundaries.lawn.backYard)
  const sideYardArea = boundaries.lawn.sideYard.length >= 3 
    ? calculatePolygonArea(boundaries.lawn.sideYard) 
    : 0
  
  const lawnTotal = frontYardArea + backYardArea + sideYardArea
  const drivewayArea = calculatePolygonArea(boundaries.driveway)
  const sidewalkArea = calculatePolygonArea(boundaries.sidewalk)
  const buildingArea = calculatePolygonArea(boundaries.building)
  
  const otherArea = Math.max(0, totalArea - lawnTotal - drivewayArea - sidewalkArea - buildingArea)
  
  return {
    totalArea: Math.round(totalArea),
    lawn: {
      frontYard: Math.round(frontYardArea),
      backYard: Math.round(backYardArea),
      sideYard: Math.round(sideYardArea),
      total: Math.round(lawnTotal)
    },
    driveway: Math.round(drivewayArea),
    sidewalk: Math.round(sidewalkArea),
    building: Math.round(buildingArea),
    other: Math.round(otherArea)
  }
}

// Format area to include acres for large properties
export function formatArea(squareFeet: number): string {
  const sqFtFormatted = squareFeet.toLocaleString() + ' sq ft'
  
  // Convert to acres (1 acre = 43,560 sq ft)
  const acres = squareFeet / 43560
  
  // Always show acres for properties over 2000 sq ft
  if (squareFeet < 2000) {
    return sqFtFormatted
  }
  
  // Format acres with fractions for common sizes
  let acreString = ''
  
  if (acres < 0.125) {
    // Less than 1/8 acre
    acreString = `${acres.toFixed(2)} acres`
  } else if (acres < 0.375) {
    // Around 1/4 acre
    if (Math.abs(acres - 0.25) < 0.03) {
      acreString = '¼ acre'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 0.625) {
    // Around 1/2 acre
    if (Math.abs(acres - 0.5) < 0.03) {
      acreString = '½ acre'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 0.875) {
    // Around 3/4 acre
    if (Math.abs(acres - 0.75) < 0.03) {
      acreString = '¾ acre'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 1.125) {
    // Around 1 acre
    if (Math.abs(acres - 1) < 0.03) {
      acreString = '1 acre'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 1.375) {
    // Around 1 1/4 acres
    if (Math.abs(acres - 1.25) < 0.03) {
      acreString = '1¼ acres'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 1.625) {
    // Around 1 1/2 acres
    if (Math.abs(acres - 1.5) < 0.03) {
      acreString = '1½ acres'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 1.875) {
    // Around 1 3/4 acres
    if (Math.abs(acres - 1.75) < 0.03) {
      acreString = '1¾ acres'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 2.25) {
    // Around 2 acres
    if (Math.abs(acres - 2) < 0.05) {
      acreString = '2 acres'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 2.75) {
    // Around 2 1/2 acres
    if (Math.abs(acres - 2.5) < 0.05) {
      acreString = '2½ acres'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else if (acres < 3.25) {
    // Around 3 acres
    if (Math.abs(acres - 3) < 0.05) {
      acreString = '3 acres'
    } else {
      acreString = `${acres.toFixed(2)} acres`
    }
  } else {
    // Larger properties, show one decimal place
    acreString = `${acres.toFixed(1)} acres`
  }
  
  return `${sqFtFormatted} (${acreString})`
}