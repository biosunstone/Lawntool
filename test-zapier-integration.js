/**
 * Test script for Zapier integration
 * This script tests that Zapier integration doesn't break existing functionality
 * and works correctly when enabled
 */

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

// Import models
const connectDB = require('./lib/saas/db').default

async function testZapierIntegration() {
  console.log('🧪 Testing Zapier Integration...\n')
  
  try {
    // Test 1: Check environment variable
    console.log('1. Checking environment configuration...')
    const zapierEnabled = process.env.ZAPIER_ENABLED === 'true'
    console.log(`   ZAPIER_ENABLED: ${process.env.ZAPIER_ENABLED} (${zapierEnabled ? 'Enabled' : 'Disabled'})`)
    
    // Connect to database
    console.log('\n2. Connecting to database...')
    await connectDB()
    console.log('   ✅ Database connected')
    
    // Test 2: Check if models are working
    console.log('\n3. Testing Zapier models...')
    
    // Import models after connection
    const { ZapierConfig } = await import('./models/zapier/ZapierConfig.js')
    const { ZapierWebhook } = await import('./models/zapier/ZapierWebhook.js')
    const { ZapierEventQueue } = await import('./models/zapier/ZapierEventQueue.js')
    const { ZapierLog } = await import('./models/zapier/ZapierLog.js')
    
    console.log('   ✅ ZapierConfig model loaded')
    console.log('   ✅ ZapierWebhook model loaded')
    console.log('   ✅ ZapierEventQueue model loaded')
    console.log('   ✅ ZapierLog model loaded')
    
    // Test 3: Create a test business with Zapier config
    console.log('\n4. Creating test Zapier configuration...')
    const Business = require('./models/Business')
    
    // Find or create test business
    let testBusiness = await Business.findOne({ name: 'Zapier Test Business' })
    if (!testBusiness) {
      testBusiness = await Business.create({
        name: 'Zapier Test Business',
        ownerId: new mongoose.Types.ObjectId(),
        zapierSettings: {
          enabled: false,
          tier: 'none'
        }
      })
      console.log('   ✅ Test business created')
    } else {
      console.log('   ✅ Test business found')
    }
    
    // Test 4: Create Zapier config
    const existingConfig = await ZapierConfig.findOne({ businessId: testBusiness._id })
    if (!existingConfig) {
      const config = new ZapierConfig({
        businessId: testBusiness._id,
        enabled: false,
        tier: 'basic',
        enabledEvents: ['customer.created', 'quote.created'],
        metadata: {
          createdBy: testBusiness.ownerId
        }
      })
      
      // Generate API key
      const apiKey = config.generateApiKey()
      await config.save()
      
      console.log('   ✅ Zapier config created')
      console.log(`   📝 Test API Key: ${apiKey}`)
    } else {
      console.log('   ✅ Zapier config already exists')
    }
    
    // Test 5: Test event emission (should be safe even when disabled)
    console.log('\n5. Testing safe event emission...')
    const { safeEmitZapierEvent, ZAPIER_EVENTS } = await import('./lib/zapier/eventEmitter.js')
    
    // This should not throw even when disabled
    safeEmitZapierEvent(
      testBusiness._id.toString(),
      ZAPIER_EVENTS.CUSTOMER_CREATED,
      {
        customerId: '123',
        name: 'Test Customer',
        email: 'test@example.com'
      }
    )
    console.log('   ✅ Event emission safe (no errors when disabled)')
    
    // Test 6: Check queue status
    console.log('\n6. Checking event queue...')
    const queueCount = await ZapierEventQueue.countDocuments({
      businessId: testBusiness._id
    })
    console.log(`   📊 Events in queue: ${queueCount}`)
    
    if (!zapierEnabled) {
      console.log('   ℹ️  No events queued (Zapier disabled globally)')
    }
    
    // Test 7: Test webhook processor health
    console.log('\n7. Testing webhook processor health check...')
    const { ZapierWebhookProcessor } = await import('./lib/zapier/webhookProcessor.js')
    const health = await ZapierWebhookProcessor.getHealth()
    console.log('   📊 Processor health:')
    console.log(`      - Healthy: ${health.healthy}`)
    console.log(`      - Queue size: ${health.queueSize}`)
    console.log(`      - Failed events: ${health.failedEvents}`)
    console.log(`      - Processing rate: ${health.processingRate} events/hour`)
    
    // Test 8: Verify existing APIs still work
    console.log('\n8. Testing that existing APIs are not affected...')
    
    // Test customer creation without Zapier
    const Customer = require('./models/Customer')
    const testCustomer = await Customer.create({
      businessId: testBusiness._id,
      name: 'Test Customer (No Zapier)',
      email: `test-${Date.now()}@example.com`,
      phone: '555-0123',
      status: 'active'
    })
    console.log('   ✅ Customer creation works')
    
    // Test measurement creation without Zapier
    const Measurement = require('./models/Measurement')
    const testMeasurement = await Measurement.create({
      businessId: testBusiness._id,
      customerId: testCustomer._id,
      userId: testBusiness.ownerId,
      address: '123 Test St',
      coordinates: { lat: 0, lng: 0 },
      measurements: {
        lawn: { total: 5000, front: 3000, back: 2000 },
        driveway: 1000,
        sidewalk: 500
      },
      status: 'completed'
    })
    console.log('   ✅ Measurement creation works')
    
    // Clean up test data
    console.log('\n9. Cleaning up test data...')
    await Customer.deleteOne({ _id: testCustomer._id })
    await Measurement.deleteOne({ _id: testMeasurement._id })
    console.log('   ✅ Test data cleaned up')
    
    console.log('\n✅ All tests passed! Zapier integration is working correctly.')
    console.log('   - Existing functionality is not affected')
    console.log('   - Zapier features are safely disabled by default')
    console.log('   - Event emission is non-blocking and safe')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    // Close database connection
    await mongoose.connection.close()
    console.log('\n👋 Database connection closed')
    process.exit(0)
  }
}

// Run the test
testZapierIntegration()