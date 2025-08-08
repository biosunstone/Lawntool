import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// MongoDB schemas
const BusinessSchema = new mongoose.Schema({
  name: String,
  ownerId: mongoose.Schema.Types.ObjectId,
  widgetSettings: {
    primaryColor: String,
    showCompanyName: Boolean,
    autoGenerateQuote: Boolean,
    enableManualSelection: Boolean,
    isActive: Boolean,
    domains: [String],
    sendQuoteEmail: Boolean
  },
  settings: Object,
  taxRate: Number,
  phone: String,
  website: String,
  address: Object
});

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  role: String,
  status: String,
  businessId: mongoose.Schema.Types.ObjectId
});

const Business = mongoose.models.Business || mongoose.model('Business', BusinessSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createTestBusiness() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunstone');
    
    console.log('Connected to MongoDB');
    
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'widget.test@example.com' });
    
    let user;
    if (existingUser) {
      console.log('Test user already exists, using existing user');
      user = existingUser;
    } else {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = await User.create({
        email: 'widget.test@example.com',
        password: hashedPassword,
        name: 'Widget Test User',
        role: 'business_owner',
        status: 'active'
      });
      console.log('Test user created');
    }
    
    // Create test business with payment flow enabled
    const business = await Business.create({
      name: 'Test Property Measurement Co',
      ownerId: user._id,
      widgetSettings: {
        primaryColor: '#00A651',
        showCompanyName: true,
        autoGenerateQuote: true,
        enableManualSelection: true,
        isActive: true,
        domains: ['localhost:3000', 'localhost:3001'],
        sendQuoteEmail: true, // Enable email with payment link
        showPriceBreakdown: true
      },
      settings: {
        defaultPricing: {
          lawnPerSqFt: 0.02,
          drivewayPerSqFt: 0.03,
          sidewalkPerSqFt: 0.025,
          buildingPerSqFt: 0.015,
          minimumCharge: 50
        }
      },
      taxRate: 0.08,
      phone: '555-0100',
      website: 'https://testwidget.example.com',
      address: {
        street: '123 Test Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US'
      }
    });
    
    // Update user with business ID
    await User.findByIdAndUpdate(user._id, { businessId: business._id });
    
    console.log('\n✅ Test Business Created Successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Business Details:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Business ID: ${business._id}`);
    console.log(`Business Name: ${business.name}`);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Widget URLs:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🔗 Public Widget: http://localhost:3000/widget/${business._id}`);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Payment Flow:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. User measures property in widget');
    console.log('2. Email sent with limited data + payment link');
    console.log('3. User pays $49 via Stripe');
    console.log('4. Full measurement data unlocked');
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Test the Complete Flow:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. Open the widget URL above');
    console.log('2. Select "Full Property Report" service');
    console.log('3. Enter an address');
    console.log('4. Complete the measurement');
    console.log('5. Enter your email');
    console.log('6. Check email for payment link');
    console.log('7. Complete payment to access full data');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test business:', error);
    process.exit(1);
  }
}

// Run the script
createTestBusiness();