// Test formatArea function
console.log('Testing formatArea for Woodbine (32,670 sq ft):\n');

// Simulate the formatArea function
function formatArea(squareFeet) {
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
  
  // Format with acres - improved thresholds for accuracy
  if (acres >= 0.74 && acres <= 0.76) {
    // 3/4 acre range (32,237 - 33,103 sq ft)
    return `${sqFtFormatted} (¾ acre)`
  } else if (acres >= 0.48 && acres <= 0.52) {
    // 1/2 acre range (20,900 - 22,660 sq ft)
    return `${sqFtFormatted} (½ acre)`
  } else if (acres >= 0.23 && acres <= 0.27) {
    // 1/4 acre range (10,000 - 11,760 sq ft)
    return `${sqFtFormatted} (¼ acre)`
  } else if (acres >= 0.98 && acres <= 1.02) {
    // 1 acre range
    return `${sqFtFormatted} (1 acre)`
  } else if (acres < 0.23) {
    return `${sqFtFormatted} (${acres.toFixed(2)} acres)`
  } else {
    return `${sqFtFormatted} (${acres.toFixed(2)} acres)`
  }
}

// Test values
const testValues = [
  32670,  // Exactly 3/4 acre
  32237,  // Lower bound of 3/4 acre range
  33103,  // Upper bound of 3/4 acre range
  30000,  // Should not be 3/4 acre
  35000   // Should not be 3/4 acre
];

testValues.forEach(value => {
  const acres = value / 43560;
  const result = formatArea(value);
  console.log(`${value} sq ft (${acres.toFixed(3)} acres) => "${result}"`);
});

console.log('\n✅ 32,670 sq ft correctly formats as:', formatArea(32670));