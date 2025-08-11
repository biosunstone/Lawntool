// Test Woodbine property measurement
console.log('Testing 12072 Woodbine Avenue Measurement\n');
console.log('='.repeat(50));

// Import from GoogleEarthPropertyData
const { WOODBINE_PROPERTY } = require('./lib/measurement/GoogleEarthPropertyData.ts');

// Use the coordinates from the data file
const WOODBINE_COORDS = WOODBINE_PROPERTY.coordinates;

// Calculate area using shoelace formula
function calculateArea(coords) {
  const n = coords.length;
  let area = 0;
  
  // Calculate centroid
  let centroidLat = 0;
  for (const coord of coords) {
    centroidLat += coord.lat;
  }
  centroidLat /= n;
  
  // Correction factors
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(centroidLat * Math.PI / 180);
  
  // Shoelace formula
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = coords[i].lng * metersPerDegreeLng;
    const yi = coords[i].lat * metersPerDegreeLat;
    const xj = coords[j].lng * metersPerDegreeLng;
    const yj = coords[j].lat * metersPerDegreeLat;
    
    area += xi * yj - xj * yi;
  }
  
  area = Math.abs(area) / 2;
  
  // Convert to square feet
  const sqMeters = area;
  const sqFeet = area * 10.7639;
  const acres = sqFeet / 43560;
  
  return { sqMeters, sqFeet, acres };
}

// Calculate and display
const result = calculateArea(WOODBINE_COORDS);

console.log('\nProperty: 12072 Woodbine Avenue, Gormley, ON');
console.log('-'.repeat(40));
console.log(`Area (sq meters): ${result.sqMeters.toFixed(2)}`);
console.log(`Area (sq feet): ${result.sqFeet.toFixed(0)}`);
console.log(`Area (acres): ${result.acres.toFixed(3)}`);

// Check if it's 3/4 acre
const targetSqFt = 32670; // 3/4 acre
const difference = Math.abs(result.sqFeet - targetSqFt);
const percentError = (difference / targetSqFt) * 100;

console.log('\nTarget Verification:');
console.log(`Target: 32,670 sq ft (3/4 acre)`);
console.log(`Calculated: ${result.sqFeet.toFixed(0)} sq ft`);
console.log(`Difference: ${difference.toFixed(0)} sq ft (${percentError.toFixed(1)}% error)`);

// Display formatted result
function formatArea(sqFeet) {
  const acres = sqFeet / 43560;
  
  if (acres >= 0.73 && acres <= 0.77) {
    return `${sqFeet.toFixed(0)} sq ft (¾ acre)`;
  } else if (acres >= 0.48 && acres <= 0.52) {
    return `${sqFeet.toFixed(0)} sq ft (½ acre)`;
  } else if (acres >= 0.23 && acres <= 0.27) {
    return `${sqFeet.toFixed(0)} sq ft (¼ acre)`;
  } else {
    return `${sqFeet.toFixed(0)} sq ft (${acres.toFixed(3)} acres)`;
  }
}

console.log('\nFormatted Display:');
console.log(formatArea(result.sqFeet));

if (result.acres >= 0.73 && result.acres <= 0.77) {
  console.log('\n✅ SUCCESS: Property correctly shows as 3/4 acre!');
} else {
  console.log('\n⚠️  Property shows as ' + result.acres.toFixed(3) + ' acres, adjusting coordinates may be needed');
}