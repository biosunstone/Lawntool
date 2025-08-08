import mongoose, { Schema } from 'mongoose'
import { IBusiness } from '@/types/saas'

const businessSchema = new Schema<IBusiness>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  logo: String,
  website: String,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: { type: String, default: 'US' },
  },
  taxRate: {
    type: Number,
    default: 0.08,
    min: 0,
    max: 1,
  },
  settings: {
    defaultPricing: {
      lawnPerSqFt: { type: Number, default: 0.02 },
      drivewayPerSqFt: { type: Number, default: 0.03 },
      sidewalkPerSqFt: { type: Number, default: 0.025 },
      minimumCharge: { type: Number, default: 50 },
    },
    serviceAreas: [{
      name: String,
      zipCodes: [String],
      priceMultiplier: { type: Number, default: 1 },
    }],
    branding: {
      primaryColor: { type: String, default: '#00A651' },
      logo: String,
    },
  },
  teamMembers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  permissions: {
    type: Map,
    of: [{
      type: String,
      enum: [
        'view_measurements',
        'create_measurements',
        'manage_customers',
        'create_quotes',
        'view_analytics',
        'manage_pricing',
        'manage_team',
        'access_billing',
      ],
    }],
    default: new Map(),
  },
  maxTeamMembers: {
    type: Number,
    default: 1,
  },
  widgetSettings: {
    // Visual Settings
    primaryColor: { type: String, default: '#00A651' },
    secondaryColor: { type: String, default: '#ffffff' },
    fontFamily: { type: String, default: 'Inter, sans-serif' },
    borderRadius: { type: String, default: '8px' },
    logo: String,
    
    // Display Options
    showCompanyName: { type: Boolean, default: true },
    showDescription: { type: Boolean, default: true },
    description: { type: String, default: 'Get an instant quote for your property services' },
    buttonText: { type: String, default: 'Get Instant Quote' },
    position: { 
      type: String, 
      enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
      default: 'bottom-right' 
    },
    
    // Form Configuration
    collectPhone: { type: Boolean, default: false },
    collectAddress: { type: Boolean, default: true },
    requiredFields: [{
      type: String,
      enum: ['name', 'email', 'phone', 'address']
    }],
    
    // Services Configuration
    allowedServices: [{
      type: String,
      default: ['lawn', 'driveway', 'sidewalk']
    }],
    serviceDescriptions: {
      type: Map,
      of: String
    },
    
    // Automation Settings
    autoGenerateQuote: { type: Boolean, default: true },
    sendQuoteEmail: { type: Boolean, default: true },
    autoOpen: { type: Boolean, default: false },
    delay: { type: Number, default: 0 },
    
    // Advanced Features
    enableManualSelection: { type: Boolean, default: true },
    enableAIDetection: { type: Boolean, default: true },
    showPriceBreakdown: { type: Boolean, default: false },
    allowServiceCustomization: { type: Boolean, default: true },
    
    // Widget Behavior
    triggerOn: {
      type: String,
      enum: ['pageLoad', 'exitIntent', 'scroll', 'timer', 'click'],
      default: 'click'
    },
    scrollPercentage: { type: Number, default: 50, min: 0, max: 100 },
    exitIntentSensitivity: { type: Number, default: 20, min: 0, max: 100 },
    
    // Widget Analytics
    enableAnalytics: { type: Boolean, default: true },
    trackingId: String,
    
    // Custom CSS
    customCss: String,
    
    // Widget Status
    isActive: { type: Boolean, default: true },
    domains: [String], // Allowed domains for embedding
  },
}, {
  timestamps: true,
})

businessSchema.index({ ownerId: 1 })
businessSchema.index({ 'settings.serviceAreas.zipCodes': 1 })

const Business = mongoose.models.Business || mongoose.model<IBusiness>('Business', businessSchema)

export default Business