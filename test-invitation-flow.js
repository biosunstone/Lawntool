const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User');
const Business = require('./models/Business');
const TeamInvitation = require('./models/TeamInvitation');

async function testInvitationFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a business owner to send invitation from
    const businessOwner = await User.findOne({ role: 'business_owner' }).populate('businessId');
    
    if (!businessOwner || !businessOwner.businessId) {
      console.log('No business owner found. Please create one first using the signup page.');
      process.exit(1);
    }

    console.log('\n✅ Found business owner:', businessOwner.email);
    console.log('   Business:', businessOwner.businessId.name);

    // Check for pending invitations
    const pendingInvitations = await TeamInvitation.find({
      businessId: businessOwner.businessId._id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (pendingInvitations.length > 0) {
      console.log('\n📧 Pending invitations:');
      for (const inv of pendingInvitations) {
        const inviteUrl = `http://localhost:3001/invite/accept?token=${inv.token}`;
        console.log(`   - ${inv.email} (${inv.role})`);
        console.log(`     URL: ${inviteUrl}`);
      }
    }

    // Create a test invitation
    const testEmail = `test_${Date.now()}@example.com`;
    console.log('\n📤 Creating new test invitation for:', testEmail);

    const invitation = await TeamInvitation.create({
      businessId: businessOwner.businessId._id,
      email: testEmail,
      role: 'staff',
      invitedBy: businessOwner._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    console.log('✅ Invitation created successfully!');
    
    const inviteUrl = `http://localhost:3001/invite/accept?token=${invitation.token}`;
    console.log('\n🔗 Invitation URLs:');
    console.log('   For existing user login:', `http://localhost:3001/login?invite=${invitation.token}&email=${testEmail}`);
    console.log('   For new user signup:', `http://localhost:3001/signup?invite=${invitation.token}&email=${testEmail}`);
    console.log('   Direct accept page:', inviteUrl);

    console.log('\n📝 Instructions:');
    console.log('1. Open one of the URLs above in your browser');
    console.log('2. For new users: Create an account using the pre-filled email');
    console.log('3. For existing users: Login with your credentials');
    console.log('4. You will be redirected to accept the invitation');
    console.log('5. After accepting, you\'ll be part of the team!');

    // Check all users in the business
    const business = await Business.findById(businessOwner.businessId._id).populate('teamMembers');
    console.log('\n👥 Current team members:');
    for (const member of business.teamMembers) {
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