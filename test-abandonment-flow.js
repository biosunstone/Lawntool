/**
 * Test the complete cart abandonment and recovery flow
 * Run: node test-abandonment-flow.js
 */

const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

async function testAbandonmentFlow() {
  console.log('🛒 Testing Cart Abandonment & Recovery Flow...\n')
  
  try {
    // Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected\n')
    
    // Import models
    const Cart = require('./models/Cart').default
    const Business = require('./models/Business').default
    
    // Create or find test business
    console.log('2️⃣ Setting up test business...')
    let business = await Business.findOne()
    if (!business) {
      business = await Business.create({
        name: 'Test Lawn Care',
        email: 'test@lawncare.com',
        phone: '555-0123',
        address: '123 Business St'
      })
    }
    console.log(`✅ Business: ${business.name}\n`)
    
    // Create a test cart that should be abandoned
    console.log('3️⃣ Creating test cart (to be abandoned)...')
    const testCart = await Cart.create({
      sessionId: `test_session_${Date.now()}`,
      businessId: business._id,
      items: [
        {
          serviceType: 'lawn',
          name: 'Lawn Mowing Service',
          description: 'Weekly lawn mowing',
          area: 5000,
          pricePerUnit: 0.05,
          totalPrice: 250
        }
      ],
      propertyAddress: '789 Test Lane, Sample City, SC 12345',
      subtotal: 250,
      tax: 20.63,
      total: 270.63,
      status: 'active',
      // Set last activity to 20 minutes ago to trigger abandonment
      lastActivityAt: new Date(Date.now() - 20 * 60 * 1000)
    })
    
    console.log(`✅ Cart created: ${testCart._id}`)
    console.log(`   Session: ${testCart.sessionId}`)
    console.log(`   Total: $${testCart.total}`)
    console.log(`   Last Activity: ${testCart.lastActivityAt}\n`)
    
    // Now trigger the abandonment process
    console.log('4️⃣ Triggering abandonment detection...')
    console.log('   (This would normally run via cron job every 10 minutes)\n')
    
    // Make API call to process abandoned carts
    const response = await fetch('http://localhost:3000/api/cart/recovery/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutesAgo: 15 })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Abandonment processing complete:')
      console.log(`   Carts Processed: ${result.result?.processed || 0}`)
      console.log(`   Emails Sent: ${result.result?.emailsSent || 0}`)
      console.log(`   SMS Sent: ${result.result?.smsSent || 0}`)
      
      if (result.result?.errors?.length > 0) {
        console.log('\n⚠️ Errors encountered:')
        result.result.errors.forEach(err => console.log(`   - ${err}`))
      }
    } else {
      console.log('❌ Failed to trigger abandonment process')
      console.log('   Make sure you are logged in as admin or remove auth check for testing')
    }
    
    console.log('\n5️⃣ Check Results:')
    console.log('   📧 Check your email for recovery message')
    console.log('   🔗 Click the recovery link in the email')
    console.log('   💾 Check MongoDB collections:')
    console.log('      - abandonedcarts: Should have new record')
    console.log('      - cartrecoverylogs: Should have email log')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('\n✅ Test complete!')
  }
}

// Run test
testAbandonmentFlow().catch(console.error)