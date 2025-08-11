import { Coordinate } from '@/types/manualSelection'
import { analyzePropertyWithAI, formatAcreage } from './ai-geospatial/propertyIntelligence'

interface PropertyEstimate {
  polygon: Coordinate[]
  propertyType: 'small' | 'medium' | 'large' | 'commercial'
  estimatedSize: number // in square feet
}

// Generate estimated property boundaries based on address type and location
export function generatePropertyBoundaries(
  center: { lat: number; lng: number },
  address: string
): PropertyEstimate {
  // Use AI-powered geospatial analysis for accurate property detection
  const aiAnalysis = analyzePropertyWithAI(address, center)
  
  // Map AI property types to our existing types
  let propertyType: PropertyEstimate['propertyType'] = 'medium'
  if (aiAnalysis.propertyType === 'estate' || aiAnalysis.propertyType === 'farm') {
    propertyType = 'large'
  } else if (aiAnalysis.propertyType === 'commercial') {
    propertyType = 'commercial'
  } else if (aiAnalysis.squareFeet < 5000) {
    propertyType = 'small'
  }
  
  console.log(`AI Property Analysis: ${address}`)
  console.log(`- Type: ${aiAnalysis.propertyType}`)
  console.log(`- Size: ${formatAcreage(aiAnalysis.acreage)}`)
  console.log(`- Confidence: ${(aiAnalysis.confidence * 100).toFixed(0)}%`)
  
  return {
    polygon: aiAnalysis.boundaries,
    propertyType,
    estimatedSize: Math.round(aiAnalysis.squareFeet)
  }
}

// Generate detailed area breakdown for the property
export function generateAreaBreakdown(
  polygon: Coordinate[],
  propertyType: 'small' | 'medium' | 'large' | 'commercial'
): {
  lawn: { front: number; back: number; side: number }
  driveway: number
  sidewalk: number
  building: number
  other: number
} {
  // Calculate total area first
  const totalArea = calculatePolygonArea(polygon)
  
  // Allocate percentages based on property type
  let percentages = {
    lawn: { front: 0, back: 0, side: 0 },
    driveway: 0,
    sidewalk: 0,
    building: 0,
    other: 0
  }
  
  switch (propertyType) {
    case 'small':
      percentages = {
        lawn: { front: 0.15, back: 0.25, side: 0.05 },
        driveway: 0.15,
        sidewalk: 0.05,
        building: 0.30,
        other: 0.05
      }
      break
    
    case 'medium':
      percentages = {
        lawn: { front: 0.20, back: 0.30, side: 0.10 },
        driveway: 0.12,
        sidewalk: 0.03,
        building: 0.20,
        other: 0.05
      }
      break
    
    case 'large':
      percentages = {
        lawn: { front: 0.25, back: 0.35, side: 0.15 },
        driveway: 0.08,
        sidewalk: 0.02,
        building: 0.12,
        other: 0.03
      }
      break
    
    case 'commercial':
      percentages = {
        lawn: { front: 0.10, back: 0.05, side: 0.05 },
        driveway: 0.30,
        sidewalk: 0.10,
        building: 0.35,
        other: 0.05
      }
      break
  }
  
  // Calculate actual areas
  return {
    lawn: {
      front: Math.round(totalArea * percentages.lawn.front),
      back: Math.round(totalArea * percentages.lawn.back),
      side: Math.round(totalArea * percentages.lawn.side)
    },
    driveway: Math.round(totalArea * percentages.driveway),
    sidewalk: Math.round(totalArea * percentages.sidewalk),
    building: Math.round(totalArea * percentages.building),
    other: Math.round(totalArea * percentages.other)
  }
}

// Simple polygon area calculation
function calculatePolygonArea(coordinates: Coordinate[]): number {
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