const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import models - using require for CommonJS
const Business = require('../models/Business');
const User = require('../models/User');

async function createTestBusiness() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunstone', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
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
    
    // Create test business with full widget configuration
    const business = await Business.create({
      name: 'Test Widget Business',
      ownerId: user._id,
      widgetSettings: {
        // Visual Settings
        primaryColor: '#00A651',
        secondaryColor: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        borderRadius: '8px',
        logo: '',
        
        // Display Options
        showCompanyName: true,
        showDescription: true,
        description: 'Get instant property measurement quotes for your lawn and landscaping needs',
        buttonText: 'Get Instant Quote',
        position: 'bottom-right',
        
        // Form Configuration
        collectPhone: true,
        collectAddress: true,
        requiredFields: ['name', 'email'],
        
        // Services Configuration
        allowedServices: ['lawn', 'driveway', 'sidewalk', 'gutter'],
        serviceDescriptions: new Map([
          ['lawn', 'Professional lawn mowing and maintenance'],
          ['driveway', 'Driveway cleaning and power washing'],
          ['sidewalk', 'Sidewalk cleaning and maintenance'],
          ['gutter', 'Gutter cleaning and inspection']
        ]),
        
        // Automation Settings
        autoGenerateQuote: true,
        sendQuoteEmail: false, // Disable for testing to avoid sending emails
        autoOpen: false,
        delay: 0,
        
        // Advanced Features
        enableManualSelection: true,
        enableAIDetection: true,
        showPriceBreakdown: true,
        allowServiceCustomization: true,
        
        // Widget Behavior
        triggerOn: 'click',
        scrollPercentage: 50,
        exitIntentSensitivity: 20,
        
        // Analytics
        enableAnalytics: true,
        trackingId: 'test-widget-001',
        
        // Custom CSS (optional)
        customCss: '',
        
        // Widget Status
        isActive: true,
        domains: ['localhost:3000', 'localhost:3001', '127.0.0.1:3000']
      },
      
      // Webhook settings for testing
      webhookSettings: {
        enabled: false, // Set to true and add URL to test webhooks
        url: '',
        secret: 'test-webhook-secret',
        events: ['widget.submission', 'widget.quote_generated'],
        retryOnFailure: true,
        maxRetries: 3
      },
      
      // Business settings
      settings: {
        defaultPricing: {
          lawnPerSqFt: 0.02,
          drivewayPerSqFt: 0.03,
          sidewalkPerSqFt: 0.025,
          minimumCharge: 50
        },
        serviceAreas: [
          {
            name: 'Downtown',
            zipCodes: ['62701', '62702', '62703'],
            priceMultiplier: 1.1
          },
          {
            name: 'Suburbs',
            zipCodes: ['62704', '62705', '62706'],
            priceMultiplier: 1.0
          }
        ],
        branding: {
          primaryColor: '#00A651',
          logo: ''
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
    console.log('Login Credentials:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Email: widget.test@example.com');
    console.log('Password: testpassword123');
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Widget URLs:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Direct Widget: http://localhost:3000/widget/${business._id}`);
    console.log(`Dashboard: http://localhost:3000/widget`);
    console.log(`Analytics: http://localhost:3000/widget/analytics`);
    console.log(`Leads: http://localhost:3000/widget/leads`);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Test Widget Embed Code:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`<script src="http://localhost:3000/widget/embed.js"></script>`);
    console.log(`<script>`);
    console.log(`  ssWidget('init', {`);
    console.log(`    businessId: '${business._id}'`);
    console.log(`  });`);
    console.log(`</script>`);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Widget Features Enabled:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Manual Selection Mode');
    console.log('✅ AI Detection');
    console.log('✅ Price Breakdown');
    console.log('✅ Service Customization');
    console.log('✅ Analytics Tracking');
    console.log('✅ Multi-domain Support');
    console.log('❌ Email Sending (disabled for testing)');
    console.log('❌ Webhooks (disabled, configure URL to enable)');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test business:', error);
    process.exit(1);
  }
}

// Run the script
createTestBusiness();