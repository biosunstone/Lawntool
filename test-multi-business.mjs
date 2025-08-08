import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testMultiBusinessFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const businessesCollection = db.collection('businesses');
    const invitationsCollection = db.collection('teaminvitations');

    // Create or find a test user that can be invited to multiple businesses
    const testEmail = 'multibusiness_test@example.com';
    let testUser = await usersCollection.findOne({ email: testEmail });

    if (!testUser) {
      console.log('\n📝 Creating test user:', testEmail);
      const hashedPassword = await bcryptjs.hash('TestPassword123!', 10);
      
      // Create a new business for this user
      const businessResult = await businessesCollection.insertOne({
        name: 'Test User Original Business',
        description: 'Original business for testing multi-business',
        ownerId: new mongoose.Types.ObjectId(),
        teamMembers: [],
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const userResult = await usersCollection.insertOne({
        email: testEmail,
        password: hashedPassword,
        name: 'Test Multi User',
        role: 'business_owner',
        businessId: businessResult.insertedId,
        status: 'active',
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add user to business team members
      await businessesCollection.updateOne(
        { _id: businessResult.insertedId },
        { 
          $set: { ownerId: userResult.insertedId },
          $push: { teamMembers: userResult.insertedId }
        }
      );

      testUser = await usersCollection.findOne({ _id: userResult.insertedId });
      console.log('✅ Test user created successfully');
    } else {
      console.log('\n✅ Found existing test user:', testEmail);
    }

    // Find other business owners who can send invitations
    const otherBusinessOwners = await usersCollection.find({ 
      role: 'business_owner',
      email: { $ne: testEmail }
    }).limit(2).toArray();

    if (otherBusinessOwners.length === 0) {
      console.log('⚠️  No other business owners found. Please create at least one business account first.');
      process.exit(1);
    }

    console.log('\n📧 Creating invitations from different businesses:');
    
    for (const owner of otherBusinessOwners) {
      const business = await businessesCollection.findOne({ _id: owner.businessId });
      if (!business) continue;

      // Check if invitation already exists
      const existingInvite = await invitationsCollection.findOne({
        businessId: business._id,
        email: testEmail,
        status: 'pending'
      });

      if (existingInvite) {
        console.log(`\n   ✅ Existing invitation from ${business.name}:`);
        console.log(`      http://localhost:3001/invite/accept?token=${existingInvite.token}`);
      } else {
        // Create new invitation
        const token = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
        
        await invitationsCollection.insertOne({
          businessId: business._id,
          email: testEmail,
          role: 'staff',
          invitedBy: owner._id,
          token: token,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`\n   ✅ New invitation from ${business.name}:`);
        console.log(`      http://localhost:3001/invite/accept?token=${token}`);
      }
    }

    // Show current business memberships
    const userBusinesses = await businessesCollection.find({
      teamMembers: testUser._id
    }).toArray();

    console.log('\n👥 Current business memberships for', testEmail + ':');
    for (const biz of userBusinesses) {
      const isCurrent = testUser.businessId?.toString() === biz._id.toString();
      console.log(`   - ${biz.name} ${isCurrent ? '(CURRENT)' : ''}`);
    }

    console.log('\n📝 Test Instructions:');
    console.log('1. Login with test user credentials:');
    console.log('   Email:', testEmail);
    console.log('   Password: TestPassword123!');
    console.log('2. Accept the invitations using the URLs above');
    console.log('3. After accepting, you should see a team switcher in the dashboard');
    console.log('4. Use the team switcher to switch between different businesses');
    console.log('5. Each business context should show appropriate data and permissions');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Test setup completed.');
  }
}

testMultiBusinessFlow();