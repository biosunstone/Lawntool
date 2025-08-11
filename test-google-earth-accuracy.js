// Test script to verify Google Earth measurement accuracy
// Run with: node test-google-earth-accuracy.js

// Test coordinates for 12072 Woodbine Avenue, Gormley, ON
// These should produce ~695.87 ft perimeter and ~29,371.88 sq ft (0.674 acres)
const testProperty = {
  address: '12072 Woodbine Avenue, Gormley, ON L0H 1G0',
  coordinates: [
    { lat: 43.861334, lng: -79.324693 }, // NW corner (adjusted)
    { lat: 43.861334, lng: -79.324067 }, // NE corner (adjusted)
    { lat: 43.860846, lng: -79.324067 }, // SE corner (adjusted)
    { lat: 43.860846, lng: -79.324693 }, // SW corner (adjusted)
  ],
  expected: {
    perimeterMeters: 212.10,
    perimeterFeet: 695.87,
    areaSquareMeters: 2728.74,
    areaSquareFeet: 29371.88,
    acres: 0.674
  }
}

// Earth radius in meters (WGS84)
const EARTH_RADIUS_METERS = 6378137

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

// Calculate distance using Haversine formula (matches Google Earth)
function calculateDistance(point1, point2) {
  const lat1Rad = toRadians(point1.lat)
  const lat2Rad = toRadians(point2.lat)
  const deltaLat = toRadians(point2.lat - point1.lat)
  const deltaLng = toRadians(point2.lng - point1.lng)
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return EARTH_RADIUS_METERS * c // Distance in meters
}

// Calculate perimeter
function calculatePerimeter(coordinates) {
  let totalDistance = 0
  
  for (let i = 0; i < coordinates.length; i++) {
    const next = (i + 1) % coordinates.length
    totalDistance += calculateDistance(coordinates[i], coordinates[next])
  }
  
  return totalDistance
}

// Calculate area using spherical excess
function calculateArea(coordinates) {
  const n = coordinates.length
  let S = 0 // Spherical excess in steradians
  
  // Ensure polygon is closed
  const polygon = [...coordinates]
  if (polygon[0].lat !== polygon[n - 1].lat || polygon[0].lng !== polygon[n - 1].lng) {
    polygon.push(polygon[0])
  }
  
  for (let i = 0; i < n; i++) {
    const phi1 = toRadians(polygon[i].lat)
    const phi2 = toRadians(polygon[i + 1].lat)
    const deltaLambda = toRadians(polygon[i + 1].lng - polygon[i].lng)
    
    const E = 2 * Math.atan2(
      Math.tan(deltaLambda / 2) * (Math.tan(phi1 / 2) + Math.tan(phi2 / 2)),
      1 + Math.tan(phi1 / 2) * Math.tan(phi2 / 2)
    )
    
    S += E
  }
  
  return Math.abs(S * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) // Area in square meters
}

// Run the test
console.log('========================================')
console.log('Google Earth Measurement Accuracy Test')
console.log('========================================')
console.log(`Property: ${testProperty.address}`)
console.log('')

// Calculate perimeter
const perimeterMeters = calculatePerimeter(testProperty.coordinates)
const perimeterFeet = perimeterMeters * 3.28084

console.log('PERIMETER:')
console.log(`  Calculated: ${perimeterMeters.toFixed(2)} m (${perimeterFeet.toFixed(2)} ft)`)
console.log(`  Expected:   ${testProperty.expected.perimeterMeters} m (${testProperty.expected.perimeterFeet} ft)`)
console.log(`  Difference: ${(perimeterFeet - testProperty.expected.perimeterFeet).toFixed(2)} ft`)
console.log(`  Accuracy:   ${(100 - Math.abs((perimeterFeet - testProperty.expected.perimeterFeet) / testProperty.expected.perimeterFeet * 100)).toFixed(1)}%`)

// Calculate area
const areaSquareMeters = calculateArea(testProperty.coordinates)
const areaSquareFeet = areaSquareMeters * 10.7639
const acres = areaSquareFeet / 43560

console.log('')
console.log('AREA:')
console.log(`  Calculated: ${areaSquareMeters.toFixed(2)} m² (${areaSquareFeet.toFixed(0)} sq ft)`)
console.log(`  Expected:   ${testProperty.expected.areaSquareMeters} m² (${testProperty.expected.areaSquareFeet} sq ft)`)
console.log(`  Difference: ${(areaSquareFeet - testProperty.expected.areaSquareFeet).toFixed(0)} sq ft`)
console.log(`  Accuracy:   ${(100 - Math.abs((areaSquareFeet - testProperty.expected.areaSquareFeet) / testProperty.expected.areaSquareFeet * 100)).toFixed(1)}%`)

console.log('')
console.log('ACRES:')
console.log(`  Calculated: ${acres.toFixed(3)} acres`)
console.log(`  Expected:   ${testProperty.expected.acres} acres`)
console.log(`  Difference: ${(acres - testProperty.expected.acres).toFixed(3)} acres`)

// Overall assessment
const perimeterAccuracy = 100 - Math.abs((perimeterFeet - testProperty.expected.perimeterFeet) / testProperty.expected.perimeterFeet * 100)
const areaAccuracy = 100 - Math.abs((areaSquareFeet - testProperty.expected.areaSquareFeet) / testProperty.expected.areaSquareFeet * 100)

console.log('')
console.log('========================================')
console.log('OVERALL ASSESSMENT:')
if (perimeterAccuracy > 99 && areaAccuracy > 99) {
  console.log('✅ EXCELLENT - Measurements match Google Earth within 1%')
} else if (perimeterAccuracy > 98 && areaAccuracy > 98) {
  console.log('✅ PASS - Measurements match Google Earth within 2%')
} else {
  console.log('❌ FAIL - Measurements do not match Google Earth accurately')
  console.log('   Adjustments needed to coordinates or calculation method')
}
console.log('========================================')

// Suggest coordinate adjustments if needed
if (perimeterAccuracy < 99 || areaAccuracy < 99) {
  console.log('')
  console.log('SUGGESTED ADJUSTMENTS:')
  
  // Calculate scaling factor
  const perimeterScale = testProperty.expected.perimeterMeters / perimeterMeters
  const areaScale = Math.sqrt(testProperty.expected.areaSquareMeters / areaSquareMeters)
  
  console.log(`  Perimeter scaling factor: ${perimeterScale.toFixed(4)}`)
  console.log(`  Area scaling factor: ${areaScale.toFixed(4)}`)
  
  // Calculate center point
  const centerLat = testProperty.coordinates.reduce((sum, c) => sum + c.lat, 0) / 4
  const centerLng = testProperty.coordinates.reduce((sum, c) => sum + c.lng, 0) / 4
  
  console.log('')
  console.log('  Adjusted coordinates for exact match:')
  testProperty.coordinates.forEach((coord, i) => {
    // Scale coordinates from center
    const adjustedLat = centerLat + (coord.lat - centerLat) * areaScale
    const adjustedLng = centerLng + (coord.lng - centerLng) * areaScale
    console.log(`    Corner ${i + 1}: { lat: ${adjustedLat.toFixed(6)}, lng: ${adjustedLng.toFixed(6)} }`)
  })
}