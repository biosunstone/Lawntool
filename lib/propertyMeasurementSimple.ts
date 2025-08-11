import { Coordinate } from '@/types/manualSelection'

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

// Calculate area of a polygon using the Shoelace formula
export function calculatePolygonArea(coordinates: Coordinate[]): number {
  if (!coordinates || coordinates.length < 3) return 0
  
  let area = 0
  const n = coordinates.length
  
  // Calculate centroid for latitude correction
  let centroidLat = 0
  for (const coord of coordinates) {
    centroidLat += coord.lat
  }
  centroidLat /= n
  
  // Latitude correction factor (meters per degree)
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = 111320 * Math.cos(centroidLat * Math.PI / 180)
  
  // Calculate area using Shoelace formula
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = coordinates[i].lng * metersPerDegreeLng
    const yi = coordinates[i].lat * metersPerDegreeLat
    const xj = coordinates[j].lng * metersPerDegreeLng
    const yj = coordinates[j].lat * metersPerDegreeLat
    
    area += xi * yj - xj * yi
  }
  
  area = Math.abs(area) / 2
  
  // Convert to square feet (1 meter = 3.28084 feet)
  return area * 10.7639
}

// Create simulated property boundaries from polygon
export function createPropertyBoundaries(
  propertyPolygon: Coordinate[],
  center: { lat: number; lng: number }
): PropertyBoundaries {
  if (!propertyPolygon || propertyPolygon.length < 3) {
    return {
      property: [],
      lawn: { frontYard: [], backYard: [], sideYard: [] },
      driveway: [],
      building: [],
      sidewalk: []
    }
  }
  
  // Find bounds of property
  let minLat = propertyPolygon[0].lat
  let maxLat = propertyPolygon[0].lat
  let minLng = propertyPolygon[0].lng
  let maxLng = propertyPolygon[0].lng
  
  propertyPolygon.forEach(coord => {
    minLat = Math.min(minLat, coord.lat)
    maxLat = Math.max(maxLat, coord.lat)
    minLng = Math.min(minLng, coord.lng)
    maxLng = Math.max(maxLng, coord.lng)
  })
  
  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng
  const propertyCenter = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2
  }
  
  // Simulate front yard (bottom 40% of property)
  const frontYard: Coordinate[] = [
    { lat: minLat, lng: minLng },
    { lat: minLat + latRange * 0.4, lng: minLng },
    { lat: minLat + latRange * 0.4, lng: maxLng },
    { lat: minLat, lng: maxLng }
  ]
  
  // Simulate back yard (top 40% of property)
  const backYard: Coordinate[] = [
    { lat: maxLat - latRange * 0.4, lng: minLng },
    { lat: maxLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
    { lat: maxLat - latRange * 0.4, lng: maxLng }
  ]
  
  // Simulate side yard (right side 20% of property)
  const sideYard: Coordinate[] = [
    { lat: minLat + latRange * 0.4, lng: maxLng - lngRange * 0.2 },
    { lat: maxLat - latRange * 0.4, lng: maxLng - lngRange * 0.2 },
    { lat: maxLat - latRange * 0.4, lng: maxLng },
    { lat: minLat + latRange * 0.4, lng: maxLng }
  ]
  
  // Simulate driveway (left side, front portion)
  const driveway: Coordinate[] = [
    { lat: minLat, lng: minLng },
    { lat: minLat + latRange * 0.3, lng: minLng },
    { lat: minLat + latRange * 0.3, lng: minLng + lngRange * 0.15 },
    { lat: minLat, lng: minLng + lngRange * 0.15 }
  ]
  
  // Simulate building (center of property)
  const building: Coordinate[] = [
    { lat: propertyCenter.lat - latRange * 0.15, lng: propertyCenter.lng - lngRange * 0.2 },
    { lat: propertyCenter.lat + latRange * 0.15, lng: propertyCenter.lng - lngRange * 0.2 },
    { lat: propertyCenter.lat + latRange * 0.15, lng: propertyCenter.lng + lngRange * 0.2 },
    { lat: propertyCenter.lat - latRange * 0.15, lng: propertyCenter.lng + lngRange * 0.2 }
  ]
  
  // Simulate sidewalk (front edge)
  const sidewalk: Coordinate[] = [
    { lat: minLat, lng: minLng + lngRange * 0.15 },
    { lat: minLat + latRange * 0.05, lng: minLng + lngRange * 0.15 },
    { lat: minLat + latRange * 0.05, lng: maxLng },
    { lat: minLat, lng: maxLng }
  ]
  
  return {
    property: propertyPolygon,
    lawn: {
      frontYard,
      backYard,
      sideYard
    },
    driveway,
    building,
    sidewalk
  }
}

// Calculate measurements from boundaries
export function calculateMeasurements(boundaries: PropertyBoundaries): MeasurementResult {
  const totalArea = calculatePolygonArea(boundaries.property)
  
  const frontYardArea = calculatePolygonArea(boundaries.lawn.frontYard)
  const backYardArea = calculatePolygonArea(boundaries.lawn.backYard)
  const sideYardArea = calculatePolygonArea(boundaries.lawn.sideYard)
  
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

// Format area with proper units
export function formatArea(squareFeet: number | undefined | null): string {
  if (squareFeet === undefined || squareFeet === null || isNaN(squareFeet) || !isFinite(squareFeet)) {
    return '0 sq ft'
  }
  
  const safeSquareFeet = Math.max(0, squareFeet)
  const sqFtFormatted = safeSquareFeet.toLocaleString() + ' sq ft'
  
  // Convert to acres (1 acre = 43,560 sq ft)
  const acres = safeSquareFeet / 43560
  
  if (safeSquareFeet < 2000) {
    return sqFtFormatted
  }
  
  // Format with acres - handle both small and large properties
  if (acres >= 0.23 && acres <= 0.27) {
    return `${sqFtFormatted} (¼ acre)`
  } else if (acres >= 0.48 && acres <= 0.52) {
    return `${sqFtFormatted} (½ acre)`
  } else if (acres >= 0.73 && acres <= 0.77) {
    return `${sqFtFormatted} (¾ acre)`
  } else if (acres >= 0.98 && acres <= 1.02) {
    return `${sqFtFormatted} (1 acre)`
  } else if (acres >= 1.23 && acres <= 1.27) {
    return `${sqFtFormatted} (1¼ acres)`
  } else if (acres >= 1.48 && acres <= 1.52) {
    return `${sqFtFormatted} (1½ acres)`
  } else if (acres >= 1.73 && acres <= 1.77) {
    return `${sqFtFormatted} (1¾ acres)`
  } else if (acres >= 1.98 && acres <= 2.02) {
    return `${sqFtFormatted} (2 acres)`
  } else if (acres >= 2.48 && acres <= 2.52) {
    return `${sqFtFormatted} (2½ acres)`
  } else if (acres >= 2.98 && acres <= 3.02) {
    return `${sqFtFormatted} (3 acres)`
  } else if (acres >= 3.48 && acres <= 3.52) {
    return `${sqFtFormatted} (3½ acres)`
  } else if (acres >= 3.98 && acres <= 4.02) {
    return `${sqFtFormatted} (4 acres)`
  } else if (acres >= 4.48 && acres <= 4.52) {
    return `${sqFtFormatted} (4½ acres)`
  } else if (acres >= 4.98 && acres <= 5.02) {
    return `${sqFtFormatted} (5 acres)`
  } else if (acres >= 5.0 && acres <= 5.5) {
    return `${sqFtFormatted} (${acres.toFixed(1)} acres)`
  } else if (acres > 5.5) {
    // For larger properties, show whole numbers or one decimal
    const rounded = Math.round(acres * 2) / 2 // Round to nearest 0.5
    if (rounded === Math.floor(rounded)) {
      return `${sqFtFormatted} (${Math.floor(rounded)} acres)`
    } else {
      return `${sqFtFormatted} (${rounded.toFixed(1)} acres)`
    }
  } else {
    return `${sqFtFormatted} (${acres.toFixed(2)} acres)`
  }
}