// Simple test for Woodbine property
console.log('Testing 12072 Woodbine Avenue - Simple\n');
console.log('='.repeat(50));

// Current coordinates from GoogleEarthPropertyData.ts
const coords = [
  { lat: 43.861210, lng: -79.324580 }, // NW corner
  { lat: 43.861210, lng: -79.324180 }, // NE corner  
  { lat: 43.860970, lng: -79.324180 }, // SE corner
  { lat: 43.860970, lng: -79.324580 }, // SW corner
];

// Calculate using proper formula
function calculateAreaProperly(coordinates) {
  const n = coordinates.length;
  
  // Calculate centroid
  let centroidLat = 0;
  for (const coord of coordinates) {
    centroidLat += coord.lat;
  }
  centroidLat /= n;
  
  // Meters per degree at this latitude
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(centroidLat * Math.PI / 180);
  
  // Convert coordinates to meters
  const metersCoords = coordinates.map(c => ({
    x: c.lng * metersPerDegreeLng,
    y: c.lat * metersPerDegreeLat
  }));
  
  // Shoelace formula
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += metersCoords[i].x * metersCoords[j].y;
    area -= metersCoords[j].x * metersCoords[i].y;
  }
  
  area = Math.abs(area) / 2;
  
  // Convert to square feet
  const sqFeet = area * 10.7639;
  const acres = sqFeet / 43560;
  
  return { area, sqFeet, acres };
}

// Calculate dimensions
const latDiff = coords[0].lat - coords[2].lat;
const lngDiff = coords[1].lng - coords[0].lng;

console.log('\nProperty Dimensions (degrees):');
console.log(`Latitude span: ${latDiff.toFixed(6)}`);
console.log(`Longitude span: ${lngDiff.toFixed(6)}`);

// Calculate area
const result = calculateAreaProperly(coords);

console.log('\nCalculated Area:');
console.log(`Square meters: ${result.area.toFixed(2)}`);
console.log(`Square feet: ${result.sqFeet.toFixed(0)}`);
console.log(`Acres: ${result.acres.toFixed(3)}`);

// Target
const target = 32670; // 3/4 acre
const diff = Math.abs(result.sqFeet - target);
const pct = (diff / target) * 100;

console.log('\nTarget Comparison:');
console.log(`Target: 32,670 sq ft (3/4 acre)`);
console.log(`Difference: ${diff.toFixed(0)} sq ft (${pct.toFixed(1)}%)`);

// What coordinates would give us exactly 3/4 acre?
console.log('\n' + '='.repeat(50));
console.log('Calculating required adjustment...');

// We need to scale down by a factor
const scaleFactor = Math.sqrt(target / result.sqFeet);
console.log(`Scale factor needed: ${scaleFactor.toFixed(4)}`);

// Suggest new coordinates
const newLatDiff = latDiff * scaleFactor;
const newLngDiff = lngDiff * scaleFactor;

const center = {
  lat: (coords[0].lat + coords[2].lat) / 2,
  lng: (coords[0].lng + coords[1].lng) / 2
};

console.log('\nSuggested coordinates for exactly 3/4 acre:');
const newCoords = [
  { lat: center.lat + newLatDiff/2, lng: center.lng - newLngDiff/2 },
  { lat: center.lat + newLatDiff/2, lng: center.lng + newLngDiff/2 },
  { lat: center.lat - newLatDiff/2, lng: center.lng + newLngDiff/2 },
  { lat: center.lat - newLatDiff/2, lng: center.lng - newLngDiff/2 },
];

newCoords.forEach((c, i) => {
  console.log(`  { lat: ${c.lat.toFixed(6)}, lng: ${c.lng.toFixed(6)} }, // ${['NW', 'NE', 'SE', 'SW'][i]}`);
});

// Verify the new coordinates
const newResult = calculateAreaProperly(newCoords);
console.log(`\nNew area: ${newResult.sqFeet.toFixed(0)} sq ft (${newResult.acres.toFixed(3)} acres)`);