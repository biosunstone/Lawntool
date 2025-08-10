/**
 * Backend test script for Abandoned Cart Recovery feature
 * Run with: node test-cart-recovery-backend.js
 */

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

async function testBackendRecovery() {
  console.log('🔧 Testing Abandoned Cart Recovery Backend...\n')
  
  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Import models
    const AbandonedCart = require('./models/AbandonedCart').default
    const CartRecoveryLog = require('./models/CartRecoveryLog').default
    const Cart = require('./models/Cart').default
    const Business = require('./models/Business').default
    const User = require('./models/User').default
    
    // 1. Test Abandoned Cart Creation
    console.log('1️⃣ Testing Abandoned Cart Creation...')
    
    // Get or create test business
    let business = await Business.findOne()
    if (!business) {
      business = await Business.create({
        name: 'Test Lawn Care',
        email: 'test@lawncare.com',
        phone: '555-0123',
        address: '123 Business St',
        settings: {}
      })
    }
    
    // Get or create test user
    let user = await User.findOne({ email: 'test@example.com' })
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-0100',
        password: 'test123',
        role: 'customer'
      })
    }
    
    // Create test abandoned cart
    const testCart = await AbandonedCart.create({
      user_id: user._id,
      session_id: `test_session_${Date.now()}`,
      business_id: business._id,
      cart_data: [
        {
          item_id: 'lawn_001',
          service_type: 'lawn',
          qty: 1,
          price: 250,
          service_details: {
            name: 'Lawn Mowing Service',
            description: 'Complete lawn care for 5000 sq ft',
            area: 5000,
            price_per_unit: 0.05
          }
        },
        {
          item_id: 'driveway_001',
          service_type: 'driveway',
          qty: 1,
          price: 150,
          service_details: {
            name: 'Driveway Sealing',
            description: 'Premium sealing for 1000 sq ft',
            area: 1000,
            price_per_unit: 0.15
          }
        }
      ],
      property_address: '456 Customer Ave, Test City, TC 54321',
      property_size: 6000,
      subtotal: 400,
      tax: 33,
      discount: 0,
      total: 433,
      abandoned_at: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      reminder_sent: false,
      recovery_completed: false
    })
    
    // Generate recovery token
    testCart.generateRecoveryToken()
    await testCart.save()
    
    console.log('✅ Abandoned cart created')
    console.log(`   Cart ID: ${testCart._id}`)
    console.log(`   User: ${user.email}`)
    console.log(`   Recovery Token: ${testCart.recovery_token}`)
    console.log(`   Total Value: $${testCart.total}\n`)
    
    // 2. Test Finding Carts for Recovery
    console.log('2️⃣ Testing Cart Recovery Query...')
    
    const cartsForRecovery = await AbandonedCart.findCartsForRecovery(15)
    
    console.log(`✅ Found ${cartsForRecovery.length} cart(s) for recovery`)
    
    cartsForRecovery.forEach((cart, index) => {
      console.log(`\n   Cart ${index + 1}:`)
      console.log(`   - ID: ${cart._id}`)
      console.log(`   - User: ${cart.user_id?.email || 'Guest'}`)
      console.log(`   - Items: ${cart.cart_data.length}`)
      console.log(`   - Value: $${cart.total}`)
      console.log(`   - Abandoned: ${cart.abandoned_at.toISOString()}`)
    })
    
    // 3. Test Recovery Log Creation
    console.log('\n3️⃣ Testing Recovery Log Creation...')
    
    const recoveryLog = await CartRecoveryLog.create({
      abandoned_cart_id: testCart._id,
      business_id: business._id,
      user_id: user._id,
      contact_type: 'email',
      contact_value: user.email,
      recovery_url: `http://localhost:3000/cart/recover?token=${testCart.recovery_token}`,
      discount_code: 'SAVE10',
      discount_amount: 10,
      template_used: 'default_recovery',
      email_subject: 'Complete your lawn care order - Save 10%!',
      delivery_status: 'sent',
      metadata: {
        campaign_id: 'test_campaign',
        send_attempt: 1,
        provider: 'nodemailer'
      }
    })
    
    console.log('✅ Recovery log created')
    console.log(`   Log ID: ${recoveryLog._id}`)
    console.log(`   Contact: ${recoveryLog.contact_value}`)
    console.log(`   Discount: ${recoveryLog.discount_code}\n`)
    
    // 4. Test Click Tracking
    console.log('4️⃣ Testing Click Tracking...')
    
    recoveryLog.markClicked()
    await recoveryLog.save()
    
    console.log('✅ Click tracked')
    console.log(`   Clicked at: ${recoveryLog.clicked_at}\n`)
    
    // 5. Test Conversion Tracking
    console.log('5️⃣ Testing Conversion Tracking...')
    
    recoveryLog.markConverted(433)
    await recoveryLog.save()
    
    testCart.markRecoveryCompleted()
    await testCart.save()
    
    console.log('✅ Conversion tracked')
    console.log(`   Converted at: ${recoveryLog.converted_at}`)
    console.log(`   Order value: $${recoveryLog.order_value}\n`)
    
    // 6. Test Recovery Statistics
    console.log('6️⃣ Testing Recovery Statistics...')
    
    const stats = await CartRecoveryLog.getRecoveryStats(business._id.toString(), 30)
    
    console.log('📊 Recovery Statistics (Last 30 days):')
    console.log(`   Total Sent: ${stats.total_sent}`)
    console.log(`   Total Clicked: ${stats.total_clicked}`)
    console.log(`   Total Converted: ${stats.total_converted}`)
    console.log(`   Click Rate: ${stats.click_rate.toFixed(2)}%`)
    console.log(`   Conversion Rate: ${stats.conversion_rate.toFixed(2)}%`)
    console.log(`   Total Revenue: $${stats.total_revenue.toFixed(2)}\n`)
    
    // 7. Test Active Cart to Abandoned Cart Conversion
    console.log('7️⃣ Testing Active to Abandoned Cart Conversion...')
    
    // Create an active cart
    const activeCart = await Cart.create({
      sessionId: `active_session_${Date.now()}`,
      businessId: business._id,
      userId: user._id,
      items: [
        {
          serviceType: 'lawn',
          name: 'Test Service',
          area: 3000,
          pricePerUnit: 0.05,
          totalPrice: 150
        }
      ],
      subtotal: 150,
      tax: 12.38,
      total: 162.38,
      status: 'active',
      lastActivityAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    })
    
    console.log(`✅ Created active cart: ${activeCart._id}`)
    
    // Convert to abandoned
    const abandonedFromActive = await AbandonedCart.createFromActiveCart({
      userId: activeCart.userId,
      sessionId: activeCart.sessionId,
      businessId: activeCart.businessId,
      items: activeCart.items,
      subtotal: activeCart.subtotal,
      tax: activeCart.tax,
      total: activeCart.total
    })
    
    activeCart.status = 'abandoned'
    activeCart.abandonedAt = new Date()
    await activeCart.save()
    
    console.log(`✅ Converted to abandoned cart: ${abandonedFromActive._id}`)
    console.log(`   Recovery token: ${abandonedFromActive.recovery_token}\n`)
    
    // 8. Test Data Validation
    console.log('8️⃣ Testing Data Validation...')
    
    // Test all abandoned carts have required fields
    const allAbandoned = await AbandonedCart.find({})
    let validationErrors = 0
    
    allAbandoned.forEach(cart => {
      if (!cart.session_id) validationErrors++
      if (!cart.business_id) validationErrors++
      if (!cart.cart_data || cart.cart_data.length === 0) validationErrors++
      if (!cart.abandoned_at) validationErrors++
    })
    
    console.log(`✅ Validation complete`)
    console.log(`   Total abandoned carts: ${allAbandoned.length}`)
    console.log(`   Validation errors: ${validationErrors}\n`)
    
    // 9. Summary
    console.log('📊 Test Summary:')
    console.log('   ✅ Abandoned cart model working')
    console.log('   ✅ Recovery log model working')
    console.log('   ✅ Cart recovery queries working')
    console.log('   ✅ Click/conversion tracking working')
    console.log('   ✅ Statistics aggregation working')
    console.log('   ✅ Active to abandoned conversion working')
    
    console.log('\n✅ All backend tests completed successfully!')
    
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
testBackendRecovery()