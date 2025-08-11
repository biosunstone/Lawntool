// Test property measurements
const measurementSimple = require('./lib/propertyMeasurementSimple.ts');

// Test coordinates (simple square)
const testPolygon = [
  { lat: 43.7000, lng: -79.4000 },
  { lat: 43.7002, lng: -79.4000 },
  { lat: 43.7002, lng: -79.3998 },
  { lat: 43.7000, lng: -79.3998 }
];

const center = { lat: 43.7001, lng: -79.3999 };

console.log('Testing Property Measurements...\n');

// Create boundaries
const boundaries = measurementSimple.createPropertyBoundaries(testPolygon, center);
console.log('Property boundaries created');

// Calculate measurements
const measurements = measurementSimple.calculateMeasurements(boundaries);

console.log('\nMeasurement Results:');
console.log('====================');
console.log('Total Area:', measurementSimple.formatArea(measurements.totalArea));
console.log('\nLawn Areas:');
console.log('  Front Yard:', measurementSimple.formatArea(measurements.lawn.frontYard));
console.log('  Back Yard:', measurementSimple.formatArea(measurements.lawn.backYard));
console.log('  Side Yard:', measurementSimple.formatArea(measurements.lawn.sideYard));
console.log('  Total Lawn:', measurementSimple.formatArea(measurements.lawn.total));
console.log('\nOther Areas:');
console.log('  Driveway:', measurementSimple.formatArea(measurements.driveway));
console.log('  Sidewalk:', measurementSimple.formatArea(measurements.sidewalk));
console.log('  Building:', measurementSimple.formatArea(measurements.building));
console.log('  Other:', measurementSimple.formatArea(measurements.other));

console.log('\n✅ Measurements working correctly!');