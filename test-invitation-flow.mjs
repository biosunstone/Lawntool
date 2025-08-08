import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

// We'll use direct MongoDB operations since models are TypeScript
async function testInvitationFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const businessesCollection = db.collection('businesses');
    const invitationsCollection = db.collection('teaminvitations');

    // Find a business owner
    const businessOwner = await usersCollection.findOne({ role: 'business_owner' });
    
    if (!businessOwner) {
      console.log('No business owner found. Please create one first using the signup page.');
      console.log('Visit: http://localhost:3001/signup');
      process.exit(1);
    }

    const business = await businessesCollection.findOne({ _id: businessOwner.businessId });

    console.log('\n✅ Found business owner:', businessOwner.email);
    console.log('   Business:', business?.name || 'N/A');

    // Check for pending invitations
    const pendingInvitations = await invitationsCollection.find({
      businessId: businessOwner.businessId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).toArray();

    if (pendingInvitations.length > 0) {
      console.log('\n📧 Existing pending invitations:');
      for (const inv of pendingInvitations) {
        const inviteUrl = `http://localhost:3001/invite/accept?token=${inv.token}`;
        console.log(`   - ${inv.email} (${inv.role})`);
        console.log(`     URL: ${inviteUrl}`);
      }
    }

    // Create a test invitation
    const testEmail = `test_${Date.now()}@example.com`;
    console.log('\n📤 Creating new test invitation for:', testEmail);

    // Generate token
    const token = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);

    const invitation = {
      businessId: businessOwner.businessId,
      email: testEmail,
      role: 'staff',
      invitedBy: businessOwner._id,
      token: token,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await invitationsCollection.insertOne(invitation);

    console.log('✅ Invitation created successfully!');
    
    const inviteUrl = `http://localhost:3001/invite/accept?token=${token}`;
    console.log('\n🔗 Invitation URLs:');
    console.log('');
    console.log('   For NEW USER (signup):');
    console.log(`   http://localhost:3001/signup?invite=${token}&email=${testEmail}`);
    console.log('');
    console.log('   For EXISTING USER (login):');
    console.log(`   http://localhost:3001/login?invite=${token}&email=${testEmail}`);
    console.log('');
    console.log('   Direct accept page:');
    console.log(`   ${inviteUrl}`);

    console.log('\n📝 Instructions:');
    console.log('1. Click one of the URLs above based on whether you have an account');
    console.log('2. For new users: Fill in your details and create an account');
    console.log('3. For existing users: Login with your credentials');
    console.log('4. You will be redirected to accept the invitation');
    console.log('5. After accepting, you\'ll be part of the team!');

    // Check all users in the business
    const teamMembers = await usersCollection.find({ 
      businessId: businessOwner.businessId 
    }).toArray();

    console.log('\n👥 Current team members:');
    for (const member of teamMembers) {
      console.log(`   - ${member.name} (${member.email}) - Role: ${member.role}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Test completed. Check the URLs above to test the invitation flow.');
  }
}

testInvitationFlow();