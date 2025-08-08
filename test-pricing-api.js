async function testPricingRulesAPI() {
  const baseURL = 'http://localhost:3000';
  
  // Test data for different rule types
  const testRules = [
    {
      name: 'Zone Test Rule',
      type: 'zone',
      description: 'Testing zone-based pricing',
      priority: 10,
      isActive: true,
      conditions: {
        zipCodes: '90210, 10001'
      },
      pricing: {
        priceMultiplier: 1.2,
        fixedPrices: {
          lawnPerSqFt: '',
          drivewayPerSqFt: '',
          sidewalkPerSqFt: ''
        },
        minimumCharge: '',
        surcharge: ''
      }
    },
    {
      name: 'Customer Test Rule',
      type: 'customer',
      description: 'Testing customer segment pricing',
      priority: 8,
      isActive: true,
      conditions: {
        customerTags: 'vip, premium',
        zipCodes: '',
        serviceTypes: ''
      },
      pricing: {
        priceMultiplier: 0.9,
        fixedPrices: {
          lawnPerSqFt: '',
          drivewayPerSqFt: '',
          sidewalkPerSqFt: ''
        },
        minimumCharge: '',
        surcharge: ''
      }
    },
    {
      name: 'Service Test Rule',
      type: 'service',
      description: 'Testing service-specific pricing',
      priority: 6,
      isActive: true,
      conditions: {
        serviceTypes: 'lawn, driveway',
        zipCodes: '',
        customerTags: ''
      },
      pricing: {
        priceMultiplier: 1,
        fixedPrices: {
          lawnPerSqFt: 0.025,
          drivewayPerSqFt: 0.035,
          sidewalkPerSqFt: ''
        },
        minimumCharge: '',
        surcharge: ''
      }
    },
    {
      name: 'Volume Test Rule',
      type: 'volume',
      description: 'Testing volume-based pricing',
      priority: 4,
      isActive: true,
      conditions: {
        minArea: 5000,
        maxArea: 10000,
        zipCodes: '',
        customerTags: '',
        serviceTypes: ''
      },
      pricing: {
        priceMultiplier: 0.95,
        fixedPrices: {
          lawnPerSqFt: '',
          drivewayPerSqFt: '',
          sidewalkPerSqFt: ''
        },
        minimumCharge: '',
        surcharge: ''
      }
    }
  ];

  console.log('Testing Pricing Rules API\n');
  console.log('Note: This test requires you to be logged into the application at http://localhost:3000\n');

  // Test each rule type
  for (const rule of testRules) {
    console.log(`Testing ${rule.type} rule: ${rule.name}`);
    
    try {
      // Try to create the rule
      const response = await fetch(`${baseURL}/api/pricing-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In a real test, you'd need to include authentication cookies
        },
        body: JSON.stringify(rule),
        credentials: 'include'
      });

      if (response.ok) {
        const created = await response.json();
        console.log(`✓ ${rule.type} rule created successfully`);
      } else {
        const error = await response.json();
        console.log(`✗ Failed to create ${rule.type} rule: ${error.error}`);
      }
    } catch (error) {
      console.log(`✗ Error testing ${rule.type} rule: ${error.message}`);
    }
  }

  // Test invalid seasonal rule (should fail)
  console.log('\nTesting that seasonal rules are rejected:');
  try {
    const seasonalRule = {
      name: 'Invalid Seasonal Rule',
      type: 'seasonal',
      description: 'This should fail',
      priority: 1,
      isActive: true,
      conditions: {
        dateRange: {
          start: '2025-08-01',
          end: '2025-08-31'
        }
      },
      pricing: {
        priceMultiplier: 1.5
      }
    };

    const response = await fetch(`${baseURL}/api/pricing-rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(seasonalRule),
      credentials: 'include'
    });

    if (!response.ok) {
      console.log('✓ Seasonal rule correctly rejected');
    } else {
      console.log('✗ Seasonal rule was unexpectedly accepted');
    }
  } catch (error) {
    console.log(`✓ Seasonal rule rejected with error: ${error.message}`);
  }

  console.log('\nTest complete. Please check the Pricing Rules page in the UI to verify.');
  console.log('If you received 401 errors, please log into the application first.');
}

testPricingRulesAPI();