// Test script for team invitation API
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

// Load env vars manually
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=')
    if (key && value.length) {
      process.env[key.trim()] = value.join('=').trim()
    }
  })
}

async function testTeamInvite() {
  try {
    console.log('Testing Team Invitation Creation...\n')
    
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      console.log('Please ensure MONGODB_URI is set in .env.local')
      process.exit(1)
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Import models
    const User = require('./models/User').default
    const Business = require('./models/Business').default
    const TeamInvitation = require('./models/TeamInvitation').default

    // Find a business owner user for testing
    const businessOwner = await User.findOne({ role: 'business_owner' }).select('_id email name businessId')
    
    if (!businessOwner) {
      console.error('❌ No business owner found in database')
      process.exit(1)
    }

    console.log('\n✅ Found business owner:', {
      id: businessOwner._id,
      email: businessOwner.email,
      name: businessOwner.name,
      businessId: businessOwner.businessId
    })

    // Check if business exists
    if (businessOwner.businessId) {
      const business = await Business.findById(businessOwner.businessId)
      if (business) {
        console.log('✅ Business found:', business.name)
      } else {
        console.log('⚠️  Business ID exists but business not found')
      }
    } else {
      console.log('⚠️  User has no businessId')
    }

    // Try to create a test invitation
    console.log('\nAttempting to create team invitation...')
    
    const testInvitation = new TeamInvitation({
      businessId: businessOwner.businessId || new mongoose.Types.ObjectId(),
      email: 'test.team.member@example.com',
      role: 'staff',
      permissions: ['view_measurements', 'create_measurements'],
      invitedBy: businessOwner._id,
      status: 'pending'
    })

    await testInvitation.save()
    
    console.log('✅ Invitation created successfully:', {
      id: testInvitation._id,
      token: testInvitation.token,
      email: testInvitation.email,
      expiresAt: testInvitation.expiresAt
    })

    // Clean up test invitation
    await TeamInvitation.deleteOne({ _id: testInvitation._id })
    console.log('✅ Test invitation cleaned up')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  }
}

testTeamInvite()