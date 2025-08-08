// Script to create test users with different roles
// Run with: node scripts/create-test-users.js

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunstone-saas'

// Define schemas inline to avoid import issues
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'business_owner', 'staff', 'customer'], default: 'customer' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Date, default: null }
}, { timestamps: true })

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: String,
  phone: String,
  website: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  settings: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)
const Business = mongoose.models.Business || mongoose.model('Business', businessSchema)

async function createTestUsers() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Create a test business first
    const hashedPassword = await bcrypt.hash('Test123!', 12)
    
    // 1. Create Business Owner
    const businessOwner = await User.create({
      email: 'owner@test.com',
      password: hashedPassword,
      name: 'Business Owner',
      role: 'business_owner',
      isActive: true,
      emailVerified: new Date()
    })
    console.log('✅ Created Business Owner: owner@test.com / Test123!')

    // Create the business
    const business = await Business.create({
      name: 'Test Lawn Care Company',
      ownerId: businessOwner._id,
      email: 'business@test.com',
      phone: '555-0100',
      website: 'https://testlawncare.com',
      address: {
        street: '123 Main St',
        city: 'Test City',
        state: 'TC',
        zip: '12345'
      },
      settings: {
        pricingSettings: {
          lawnPerSqFt: 0.02,
          drivewayPerSqFt: 0.03,
          sidewalkPerSqFt: 0.025
        },
        widgetSettings: {
          primaryColor: '#00A651',
          autoGenerateQuote: true,
          sendQuoteEmail: true
        }
      },
      isActive: true
    })
    console.log('✅ Created Test Business:', business.name)

    // Update business owner with businessId
    await User.findByIdAndUpdate(businessOwner._id, { businessId: business._id })

    // 2. Create Admin User
    const admin = await User.create({
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      businessId: business._id,
      isActive: true,
      emailVerified: new Date()
    })
    console.log('✅ Created Admin: admin@test.com / Test123!')

    // 3. Create Staff User
    const staff = await User.create({
      email: 'staff@test.com',
      password: hashedPassword,
      name: 'Staff Member',
      role: 'staff',
      businessId: business._id,
      isActive: true,
      emailVerified: new Date()
    })
    console.log('✅ Created Staff: staff@test.com / Test123!')

    // 4. Create Customer User
    const customer = await User.create({
      email: 'customer@test.com',
      password: hashedPassword,
      name: 'Customer User',
      role: 'customer',
      businessId: business._id,
      isActive: true,
      emailVerified: new Date()
    })
    console.log('✅ Created Customer: customer@test.com / Test123!')

    // 5. Create Inactive User (for testing access control)
    const inactive = await User.create({
      email: 'inactive@test.com',
      password: hashedPassword,
      name: 'Inactive User',
      role: 'staff',
      businessId: business._id,
      isActive: false,
      emailVerified: new Date()
    })
    console.log('✅ Created Inactive User: inactive@test.com / Test123!')

    console.log('\n===========================================')
    console.log('TEST USERS CREATED SUCCESSFULLY!')
    console.log('===========================================')
    console.log('\nYou can now log in with these credentials:')
    console.log('\n1. Business Owner (Full Access):')
    console.log('   Email: owner@test.com')
    console.log('   Password: Test123!')
    console.log('\n2. Admin (Admin Access):')
    console.log('   Email: admin@test.com')
    console.log('   Password: Test123!')
    console.log('\n3. Staff (Limited Access):')
    console.log('   Email: staff@test.com')
    console.log('   Password: Test123!')
    console.log('\n4. Customer (Minimal Access):')
    console.log('   Email: customer@test.com')
    console.log('   Password: Test123!')
    console.log('\n5. Inactive User (Should be denied):')
    console.log('   Email: inactive@test.com')
    console.log('   Password: Test123!')
    console.log('\nBusiness ID:', business._id.toString())
    console.log('===========================================\n')

  } catch (error) {
    console.error('Error creating test users:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// Run the script
createTestUsers()