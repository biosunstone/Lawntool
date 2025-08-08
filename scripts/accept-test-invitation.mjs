import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function acceptTestInvitation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const businessesCollection = db.collection('businesses');
    const invitationsCollection = db.collection('teaminvitations');
    const membershipsCollection = db.collection('businessmemberships');

    // Find a pending invitation for the test user
    const testEmail = 'multibusiness_test@example.com';
    const invitation = await invitationsCollection.findOne({
      email: testEmail,
      status: 'pending'
    });

    if (!invitation) {
      console.log('No pending invitations found for', testEmail);
      process.exit(0);
    }

    console.log('\n📧 Found invitation:');
    console.log('   From business:', invitation.businessId);
    console.log('   Role:', invitation.role);
    console.log('   Token:', invitation.token);

    // Find the user
    const user = await usersCollection.findOne({ email: testEmail });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    // Check if membership already exists
    const existingMembership = await membershipsCollection.findOne({
      userId: user._id,
      businessId: invitation.businessId
    });

    if (existingMembership) {
      console.log('✅ Membership already exists, updating invitation status');
    } else {
      // Create membership
      await membershipsCollection.insertOne({
        userId: user._id,
        businessId: invitation.businessId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        status: 'active',
        isPrimary: false,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Created membership');
    }

    // Add user to business team members
    await businessesCollection.updateOne(
      { _id: invitation.businessId },
      { $addToSet: { teamMembers: user._id } }
    );

    // Mark invitation as accepted
    await invitationsCollection.updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedBy: user._id
        }
      }
    );

    console.log('✅ Invitation accepted successfully!');

    // Show all memberships
    const allMemberships = await membershipsCollection.find({
      userId: user._id
    }).toArray();

    console.log('\n👥 User now has', allMemberships.length, 'business memberships:');
    for (const membership of allMemberships) {
      const business = await businessesCollection.findOne({ _id: membership.businessId });
      console.log(`   - ${business?.name || 'Unknown'} (${membership.role})`);
    }

    console.log('\n📝 Next steps:');
    console.log('1. Login as:', testEmail);
    console.log('2. Navigate to: http://localhost:3001/test-switch');
    console.log('3. You should see multiple businesses available');
    console.log('4. Try switching between businesses');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Process completed.');
  }
}

acceptTestInvitation();