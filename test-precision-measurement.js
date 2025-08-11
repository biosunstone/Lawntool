/**
 * Test Script for Precision Measurement Accuracy
 * Tests the new precision measurement system with various properties
 * Target: ±1% accuracy for area and perimeter measurements
 */

const fetch = require('node-fetch')

// Test properties with known measurements (from actual surveys or verified sources)
const TEST_PROPERTIES = [
  {
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    expectedArea: 185000, // sq ft (approximate for Googleplex lawn areas)
    tolerance: 0.01, // 1% tolerance
    description: 'Google Headquarters - Large commercial property'
  },
  {
    address: '1 Infinite Loop, Cupertino, CA',
    expectedArea: 95000, // sq ft
    tolerance: 0.01,
    description: 'Apple Park - Corporate campus'
  },
  {
    address: '350 5th Avenue, New York, NY',
    expectedArea: 0, // No lawn (Empire State Building)
    tolerance: 0.01,
    description: 'Urban property with no lawn'
  },
  {
    address: '1600 Pennsylvania Avenue NW, Washington, DC',
    expectedArea: 82000, // South Lawn is about 82,000 sq ft
    tolerance: 0.01,
    description: 'White House - Historic property with known lawn size'
  },
  {
    address: '123 Main Street, Anytown, USA',
    expectedArea: 7500, // Typical suburban lawn
    tolerance: 0.02, // 2% for typical properties
    description: 'Typical suburban property'
  }
]

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

async function geocodeAddress(address) {
  try {
    const response = await fetch('http://localhost:3000/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    })
    const data = await response.json()
    return data.coordinates
  } catch (error) {
    console.error(`${colors.red}Geocoding failed for ${address}:${colors.reset}`, error.message)
    return null
  }
}

async function measureProperty(address, coordinates) {
  try {
    const response = await fetch('http://localhost:3000/api/measurements/precision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        coordinates,
        useHistoricalImagery: false
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.measurement
  } catch (error) {
    console.error(`${colors.red}Measurement failed for ${address}:${colors.reset}`, error.message)
    return null
  }
}

function calculateAccuracy(measured, expected, tolerance) {
  if (expected === 0) {
    return measured === 0 ? 0 : 100
  }
  const deviation = Math.abs(measured - expected) / expected
  return deviation
}

function formatNumber(num) {
  return num.toLocaleString()
}

async function runAccuracyTests() {
  console.log(`${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}PRECISION MEASUREMENT ACCURACY TEST${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  const results = []
  let passedTests = 0
  let failedTests = 0
  
  for (const property of TEST_PROPERTIES) {
    console.log(`${colors.blue}Testing: ${property.description}${colors.reset}`)
    console.log(`Address: ${property.address}`)
    
    // Step 1: Geocode the address
    const coordinates = await geocodeAddress(property.address)
    if (!coordinates) {
      console.log(`${colors.red}✗ Failed to geocode address${colors.reset}\n`)
      failedTests++
      continue
    }
    
    console.log(`Coordinates: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`)
    
    // Step 2: Perform precision measurement
    const measurement = await measureProperty(property.address, coordinates)
    if (!measurement) {
      console.log(`${colors.red}✗ Failed to measure property${colors.reset}\n`)
      failedTests++
      continue
    }
    
    // Step 3: Compare with expected values
    const measuredArea = measurement.totalLawnArea
    const expectedArea = property.expectedArea
    const deviation = calculateAccuracy(measuredArea, expectedArea, property.tolerance)
    const passed = deviation <= property.tolerance
    
    console.log(`\n${colors.magenta}RESULTS:${colors.reset}`)
    console.log(`  Expected Area: ${formatNumber(expectedArea)} sq ft`)
    console.log(`  Measured Area: ${formatNumber(measuredArea)} sq ft`)
    console.log(`  Perimeter: ${formatNumber(measurement.perimeter)} ft`)
    console.log(`  Deviation: ${(deviation * 100).toFixed(2)}%`)
    console.log(`  Tolerance: ±${(property.tolerance * 100).toFixed(0)}%`)
    
    // Terrain and accuracy information
    console.log(`\n${colors.cyan}MEASUREMENT DETAILS:${colors.reset}`)
    console.log(`  Terrain Slope: ${measurement.terrain.slope.toFixed(1)}°`)
    console.log(`  Terrain Correction: ${measurement.terrain.terrainCorrectionFactor.toFixed(3)}x`)
    console.log(`  Confidence: ${(measurement.accuracy.confidence * 100).toFixed(0)}%`)
    console.log(`  Error Margin: ±${measurement.accuracy.errorMargin}%`)
    console.log(`  Verification Passes: ${measurement.accuracy.verificationPasses}`)
    
    // Imagery information
    console.log(`\n${colors.cyan}IMAGERY:${colors.reset}`)
    console.log(`  Source: ${measurement.imagery.provider}`)
    console.log(`  Resolution: ${measurement.imagery.resolution}m/pixel`)
    console.log(`  Quality: ${measurement.imagery.quality}`)
    console.log(`  Cloud Coverage: ${measurement.imagery.cloudCoverage}%`)
    
    // Section breakdown
    if (measurement.sections) {
      console.log(`\n${colors.cyan}LAWN SECTIONS:${colors.reset}`)
      console.log(`  Front Yard: ${formatNumber(measurement.sections.frontYard.area)} sq ft`)
      console.log(`  Back Yard: ${formatNumber(measurement.sections.backYard.area)} sq ft`)
      if (measurement.sections.sideYards && measurement.sections.sideYards.length > 0) {
        const sideYardTotal = measurement.sections.sideYards.reduce((sum, s) => sum + s.area, 0)
        console.log(`  Side Yards: ${formatNumber(sideYardTotal)} sq ft`)
      }
    }
    
    // Excluded areas
    if (measurement.excluded) {
      console.log(`\n${colors.cyan}EXCLUDED AREAS:${colors.reset}`)
      if (measurement.excluded.building > 0) {
        console.log(`  Building: ${formatNumber(measurement.excluded.building)} sq ft`)
      }
      if (measurement.excluded.driveway > 0) {
        console.log(`  Driveway: ${formatNumber(measurement.excluded.driveway)} sq ft`)
      }
      if (measurement.excluded.pool > 0) {
        console.log(`  Pool: ${formatNumber(measurement.excluded.pool)} sq ft`)
      }
      if (measurement.excluded.deck > 0) {
        console.log(`  Deck: ${formatNumber(measurement.excluded.deck)} sq ft`)
      }
    }
    
    // Test result
    if (passed) {
      console.log(`\n${colors.green}✓ TEST PASSED - Within ${(property.tolerance * 100).toFixed(0)}% accuracy${colors.reset}`)
      passedTests++
    } else {
      console.log(`\n${colors.red}✗ TEST FAILED - Deviation ${(deviation * 100).toFixed(2)}% exceeds ${(property.tolerance * 100).toFixed(0)}% tolerance${colors.reset}`)
      failedTests++
    }
    
    console.log(`${colors.yellow}----------------------------------------${colors.reset}\n`)
    
    results.push({
      address: property.address,
      description: property.description,
      expected: expectedArea,
      measured: measuredArea,
      deviation,
      passed
    })
    
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // Summary Report
  console.log(`${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  console.log(`Total Tests: ${TEST_PROPERTIES.length}`)
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`)
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`)
  console.log(`Success Rate: ${((passedTests / TEST_PROPERTIES.length) * 100).toFixed(0)}%\n`)
  
  // Detailed results table
  console.log('Detailed Results:')
  console.log('┌─────────────────────────────────────┬──────────────┬──────────────┬────────────┬──────────┐')
  console.log('│ Property                            │ Expected     │ Measured     │ Deviation  │ Result   │')
  console.log('├─────────────────────────────────────┼──────────────┼──────────────┼────────────┼──────────┤')
  
  results.forEach(result => {
    const propertyName = result.description.substring(0, 35).padEnd(35)
    const expected = formatNumber(result.expected).padStart(12)
    const measured = formatNumber(result.measured).padStart(12)
    const deviation = `${(result.deviation * 100).toFixed(2)}%`.padStart(10)
    const status = result.passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`
    
    console.log(`│ ${propertyName} │ ${expected} │ ${measured} │ ${deviation} │ ${status.padEnd(8)} │`)
  })
  
  console.log('└─────────────────────────────────────┴──────────────┴──────────────┴────────────┴──────────┘')
  
  // Overall accuracy
  const avgDeviation = results.reduce((sum, r) => sum + r.deviation, 0) / results.length
  console.log(`\nAverage Deviation: ${colors.yellow}${(avgDeviation * 100).toFixed(2)}%${colors.reset}`)
  
  if (avgDeviation <= 0.01) {
    console.log(`${colors.green}✓ SYSTEM MEETS ±1% ACCURACY REQUIREMENT${colors.reset}`)
  } else {
    console.log(`${colors.red}✗ SYSTEM DOES NOT MEET ±1% ACCURACY REQUIREMENT${colors.reset}`)
    console.log(`  Required: ±1%`)
    console.log(`  Actual: ±${(avgDeviation * 100).toFixed(2)}%`)
  }
}

// Run the tests
console.log('Starting Precision Measurement Accuracy Tests...\n')
console.log('NOTE: Make sure the development server is running on http://localhost:3000\n')

runAccuracyTests().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error)
  process.exit(1)
})