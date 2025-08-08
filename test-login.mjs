import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const businessesCollection = db.collection('businesses');

    // Find test users
    const testUsers = await usersCollection.find({
      email: { $in: ['test@yopmail.com', 'multibusiness_test@example.com'] }
    }).toArray();

    console.log('\n📝 Test Users for Login:');
    console.log('================================');
    
    for (const user of testUsers) {
      console.log(`\nEmail: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status || 'active'}`);
      console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
      
      if (user.businessId) {
        const business = await businessesCollection.findOne({ _id: user.businessId });
        console.log(`Current Business: ${business?.name || 'Unknown'} (${user.businessId})`);
      } else {
        console.log('Current Business: None');
      }
    }

    console.log('\n📝 Login Test URLs:');
    console.log('================================');
    console.log('1. Regular Login: http://localhost:3001/login');
    console.log('2. Test Dashboard: http://localhost:3001/dashboard');
    console.log('3. Business Switch Test: http://localhost:3001/test-switch');
    
    console.log('\n📝 Test Credentials:');
    console.log('================================');
    console.log('User 1:');
    console.log('  Email: test@yopmail.com');
    console.log('  Password: test123');
    console.log('');
    console.log('User 2:');
    console.log('  Email: multibusiness_test@example.com');
    console.log('  Password: TestPassword123!');

    // Verify user structure
    const sampleUser = await usersCollection.findOne({ email: 'test@yopmail.com' });
    if (sampleUser) {
      console.log('\n📝 User Document Structure:');
      console.log('================================');
      const keys = Object.keys(sampleUser);
      console.log('Fields:', keys.join(', '));
      
      // Check if role is a field
      console.log('\nRole field type:', typeof sampleUser.role);
      console.log('Role value:', sampleUser.role);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Test completed.');
  }
}

testLogin();