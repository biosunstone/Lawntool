import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function migrateMemberships() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const businessesCollection = db.collection('businesses');
    const membershipsCollection = db.collection('businessmemberships');

    // Find all users with a businessId
    const usersWithBusiness = await usersCollection.find({ 
      businessId: { $exists: true, $ne: null } 
    }).toArray();

    console.log(`Found ${usersWithBusiness.length} users with businesses`);

    let created = 0;
    let skipped = 0;

    for (const user of usersWithBusiness) {
      // Check if membership already exists
      const existingMembership = await membershipsCollection.findOne({
        userId: user._id,
        businessId: user.businessId
      });

      if (existingMembership) {
        skipped++;
        continue;
      }

      // Check if user is the owner of the business
      const business = await businessesCollection.findOne({ _id: user.businessId });
      let role = user.role || 'staff';
      
      if (business && business.ownerId?.toString() === user._id.toString()) {
        role = 'business_owner';
      }

      // Create membership record
      await membershipsCollection.insertOne({
        userId: user._id,
        businessId: user.businessId,
        role: role,
        isPrimary: true,
        status: 'active',
        joinedAt: user.createdAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      created++;
      console.log(`Created membership for user: ${user.email} (${role})`);
    }

    console.log(`\n✅ Migration completed:`);
    console.log(`   - Created: ${created} new memberships`);
    console.log(`   - Skipped: ${skipped} existing memberships`);

    // Now check for users who are team members but don't have memberships
    const businesses = await businessesCollection.find({}).toArray();
    let additionalCreated = 0;

    for (const business of businesses) {
      if (!business.teamMembers || business.teamMembers.length === 0) continue;

      for (const memberId of business.teamMembers) {
        // Check if membership exists
        const existingMembership = await membershipsCollection.findOne({
          userId: memberId,
          businessId: business._id
        });

        if (existingMembership) continue;

        // Get user to determine role
        const user = await usersCollection.findOne({ _id: memberId });
        if (!user) continue;

        let role = 'staff';
        if (business.ownerId?.toString() === memberId.toString()) {
          role = 'business_owner';
        } else if (user.role === 'admin') {
          role = 'admin';
        }

        // Check if this should be primary (if user's businessId matches)
        const isPrimary = user.businessId?.toString() === business._id.toString();

        // Create membership
        await membershipsCollection.insertOne({
          userId: memberId,
          businessId: business._id,
          role: role,
          isPrimary: isPrimary,
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        additionalCreated++;
        console.log(`Created additional membership for user in ${business.name}`);
      }
    }

    if (additionalCreated > 0) {
      console.log(`   - Additional: ${additionalCreated} memberships from team members`);
    }

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Migration process finished');
  }
}

migrateMemberships();