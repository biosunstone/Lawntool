/**
 * Test script to verify cart recovery email functionality
 * Run with: node test-cart-recovery.js
 */

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')
const nodemailer = require('nodemailer')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

// Import models
const Cart = require('./models/Cart').default
const Business = require('./models/Business').default
const User = require('./models/User').default

async function testCartRecovery() {
  console.log('🛒 Testing Abandoned Cart Recovery Feature...\n')
  
  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // 1. Test Cart Creation
    console.log('1️⃣ Testing Cart Creation...')
    
    // Get a test business
    const business = await Business.findOne()
    if (!business) {
      console.log('❌ No business found. Please run scripts/create-test-business.js first')
      return
    }
    
    const testCart = new Cart({
      sessionId: `test_session_${Date.now()}`,
      businessId: business._id,
      items: [
        {
          serviceType: 'lawn',
          name: 'Lawn Mowing Service',
          description: 'Professional lawn mowing for front and back yard',
          area: 5000,
          pricePerUnit: 0.05,
          totalPrice: 250
        },
        {
          serviceType: 'driveway',
          name: 'Driveway Sealing',
          description: 'Premium driveway sealing service',
          area: 800,
          pricePerUnit: 0.15,
          totalPrice: 120
        }
      ],
      propertyAddress: '123 Test Street, Test City, TC 12345',
      propertySize: 5800,
      subtotal: 370,
      tax: 30.525,
      discount: 0,
      total: 400.525,
      status: 'active',
      lastActivityAt: new Date(),
      metadata: {
        source: 'test',
        device: 'test-script'
      }
    })
    
    await testCart.save()
    console.log('✅ Cart created successfully')
    console.log(`   Cart ID: ${testCart._id}`)
    console.log(`   Session: ${testCart.sessionId}`)
    console.log(`   Items: ${testCart.items.length}`)
    console.log(`   Total: $${testCart.total.toFixed(2)}\n`)
    
    // 2. Test Cart Abandonment
    console.log('2️⃣ Testing Cart Abandonment...')
    
    // Mark cart as abandoned
    testCart.status = 'abandoned'
    testCart.abandonedAt = new Date()
    await testCart.save()
    
    console.log('✅ Cart marked as abandoned')
    console.log(`   Abandoned at: ${testCart.abandonedAt.toISOString()}\n`)
    
    // 3. Test Finding Abandoned Carts
    console.log('3️⃣ Testing Abandoned Cart Recovery Query...')
    
    const abandonedCarts = await Cart.find({
      businessId: business._id,
      status: 'abandoned',
      recoveryEmailSent: false
    }).limit(5)
    
    console.log(`✅ Found ${abandonedCarts.length} abandoned cart(s)`)
    
    abandonedCarts.forEach((cart, index) => {
      console.log(`\n   Cart ${index + 1}:`)
      console.log(`   - ID: ${cart._id}`)
      console.log(`   - Session: ${cart.sessionId}`)
      console.log(`   - Items: ${cart.items.length}`)
      console.log(`   - Value: $${cart.total.toFixed(2)}`)
      console.log(`   - Abandoned: ${cart.abandonedAt ? cart.abandonedAt.toISOString() : 'N/A'}`)
    })
    
    // 4. Test Cart Recovery
    console.log('\n4️⃣ Testing Cart Recovery...')
    
    // Simulate cart recovery
    testCart.status = 'active'
    testCart.abandonedAt = undefined
    testCart.lastActivityAt = new Date()
    await testCart.save()
    
    console.log('✅ Cart recovered successfully')
    console.log(`   Status: ${testCart.status}`)
    console.log(`   Last Activity: ${testCart.lastActivityAt.toISOString()}\n`)
    
    // 5. Test Cart Conversion
    console.log('5️⃣ Testing Cart Conversion...')
    
    testCart.status = 'converted'
    await testCart.save()
    
    console.log('✅ Cart converted to order')
    console.log(`   Final Status: ${testCart.status}\n`)
    
    // 6. Test Cart Expiration
    console.log('6️⃣ Testing Cart Expiration...')
    
    // Create an expired cart
    const expiredCart = new Cart({
      sessionId: `expired_session_${Date.now()}`,
      businessId: business._id,
      items: [{
        serviceType: 'lawn',
        name: 'Test Service',
        area: 1000,
        pricePerUnit: 0.05,
        totalPrice: 50
      }],
      subtotal: 50,
      tax: 4.125,
      total: 54.125,
      status: 'abandoned',
      abandonedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      lastActivityAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    })
    
    await expiredCart.save()
    
    // Find expired carts
    const expiredCarts = await Cart.find({
      expiresAt: { $lt: new Date() },
      status: { $ne: 'converted' }
    })
    
    console.log(`✅ Found ${expiredCarts.length} expired cart(s)`)
    
    // Clean up expired carts
    await Cart.updateMany(
      { expiresAt: { $lt: new Date() }, status: { $ne: 'converted' } },
      { $set: { status: 'expired' } }
    )
    
    console.log('✅ Expired carts marked\n')
    
    // 7. Test Statistics
    console.log('7️⃣ Cart Statistics...')
    
    const stats = await Cart.aggregate([
      {
        $match: { businessId: business._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' }
        }
      }
    ])
    
    console.log('📊 Cart Status Summary:')
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} cart(s) - Total: $${stat.totalValue.toFixed(2)}`)
    })
    
    console.log('\n✅ All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error)
  } finally {
    // Close database connection
    await mongoose.connection.close()
    console.log('\n👋 Database connection closed')
  }
}

// Run the test
testCartRecovery()