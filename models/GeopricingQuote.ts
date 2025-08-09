import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IGeopricingQuote extends Document {
  businessId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  shopLocationId: mongoose.Types.ObjectId;
  
  // Customer information
  customer: {
    name?: string;
    email?: string;
    phone?: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    city?: string;
    province?: string;
    postalCode?: string;
  };
  
  // Shop information (denormalized for historical accuracy)
  shop: {
    name: string;
    address: string;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  
  // Drive time calculation
  driveTime: {
    minutes: number;
    distanceKm: number;
    distanceText: string;
    durationText: string;
    trafficModel: string;
    calculatedAt: Date;
  };
  
  // Zone and pricing
  zone: {
    type: 'close' | 'standard' | 'extended';
    name: string;
    description: string;
    adjustment: number;
  };
  
  // Services quoted
  services: Array<{
    type: string;
    name: string;
    area: number;
    unit: string;
    baseRate: number;
    adjustedRate: number;
    basePrice: number;
    adjustedPrice: number;
  }>;
  
  // Pricing summary
  pricing: {
    subtotal: number;
    adjustment: number;
    adjustmentAmount: number;
    total: number;
    currency: string;
    minimumCharge: number;
  };
  
  // Package selection
  package?: {
    name: 'Basic' | 'Standard' | 'Premium';
    multiplier: number;
    features: string[];
    price: number;
  };
  
  // Quote metadata
  quoteNumber: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  validUntil: Date;
  
  // Communication
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  response?: {
    accepted: boolean;
    message?: string;
    preferredDate?: Date;
  };
  
  // Notes
  internalNotes?: string;
  customerNotes?: string;
  
  // Conversion tracking
  convertedToCustomer?: boolean;
  conversionDate?: Date;
  firstServiceDate?: Date;
  
  // Analytics
  source?: 'website' | 'widget' | 'admin' | 'api';
  referrer?: string;
  device?: string;
  
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GeopricingQuoteSchema = new Schema<IGeopricingQuote>({
  businessId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true,
    index: true 
  },
  customerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Customer',
    index: true 
  },
  shopLocationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ShopLocation', 
    required: true 
  },
  
  // Customer information
  customer: {
    name: String,
    email: { 
      type: String,
      index: true 
    },
    phone: String,
    address: { 
      type: String, 
      required: true 
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    city: String,
    province: String,
    postalCode: String
  },
  
  // Shop information
  shop: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  
  // Drive time calculation
  driveTime: {
    minutes: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    distanceText: { type: String, required: true },
    durationText: { type: String, required: true },
    trafficModel: { type: String, default: 'best_guess' },
    calculatedAt: { type: Date, required: true }
  },
  
  // Zone and pricing
  zone: {
    type: { 
      type: String, 
      enum: ['close', 'standard', 'extended'],
      required: true 
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    adjustment: { type: Number, required: true }
  },
  
  // Services quoted
  services: [{
    type: { type: String, required: true },
    name: { type: String, required: true },
    area: { type: Number, required: true },
    unit: { type: String, default: 'sqft' },
    baseRate: { type: Number, required: true },
    adjustedRate: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    adjustedPrice: { type: Number, required: true }
  }],
  
  // Pricing summary
  pricing: {
    subtotal: { type: Number, required: true },
    adjustment: { type: Number, required: true },
    adjustmentAmount: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: { type: String, default: 'CAD' },
    minimumCharge: { type: Number, default: 50 }
  },
  
  // Package selection
  package: {
    name: { 
      type: String, 
      enum: ['Basic', 'Standard', 'Premium'] 
    },
    multiplier: Number,
    features: [String],
    price: Number
  },
  
  // Quote metadata
  quoteNumber: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'],
    default: 'draft',
    index: true 
  },
  validUntil: { 
    type: Date, 
    required: true,
    index: true 
  },
  
  // Communication
  sentAt: Date,
  viewedAt: Date,
  respondedAt: Date,
  response: {
    accepted: Boolean,
    message: String,
    preferredDate: Date
  },
  
  // Notes
  internalNotes: String,
  customerNotes: String,
  
  // Conversion tracking
  convertedToCustomer: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  conversionDate: Date,
  firstServiceDate: Date,
  
  // Analytics
  source: { 
    type: String, 
    enum: ['website', 'widget', 'admin', 'api'],
    default: 'website' 
  },
  referrer: String,
  device: String,
  
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
GeopricingQuoteSchema.index({ businessId: 1, status: 1, createdAt: -1 });
GeopricingQuoteSchema.index({ businessId: 1, 'customer.email': 1 });
GeopricingQuoteSchema.index({ businessId: 1, convertedToCustomer: 1 });
GeopricingQuoteSchema.index({ shopLocationId: 1, createdAt: -1 });
GeopricingQuoteSchema.index({ validUntil: 1, status: 1 });

// Generate unique quote number
GeopricingQuoteSchema.pre('save', async function(next) {
  if (!this.quoteNumber) {
    const count = await mongoose.model('GeopricingQuote').countDocuments({
      businessId: this.businessId
    });
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.quoteNumber = `GQ-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Auto-expire quotes
GeopricingQuoteSchema.pre('save', function(next) {
  if (this.isNew && !this.validUntil) {
    this.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  next();
});

// Method to calculate total price
GeopricingQuoteSchema.methods.calculateTotal = function() {
  const subtotal = this.services.reduce((sum, service) => sum + service.basePrice, 0);
  const adjustmentAmount = subtotal * (this.zone.adjustment / 100);
  const total = Math.max(subtotal + adjustmentAmount, this.pricing.minimumCharge);
  
  this.pricing = {
    subtotal,
    adjustment: this.zone.adjustment,
    adjustmentAmount,
    total,
    currency: this.pricing?.currency || 'CAD',
    minimumCharge: this.pricing?.minimumCharge || 50
  };
  
  return total;
};

// Method to check if quote is expired
GeopricingQuoteSchema.methods.isExpired = function(): boolean {
  return this.validUntil < new Date() || this.status === 'expired';
};

// Static method to expire old quotes
GeopricingQuoteSchema.statics.expireOldQuotes = async function() {
  return this.updateMany(
    {
      validUntil: { $lt: new Date() },
      status: { $in: ['draft', 'sent', 'viewed'] }
    },
    { status: 'expired' }
  );
};

// Static method to get conversion rate
GeopricingQuoteSchema.statics.getConversionRate = async function(
  businessId: string,
  dateRange?: { start: Date; end: Date }
) {
  const query: any = { businessId };
  if (dateRange) {
    query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
  }
  
  const [total, converted] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, convertedToCustomer: true })
  ]);
  
  return {
    total,
    converted,
    rate: total > 0 ? (converted / total) * 100 : 0
  };
};

const GeopricingQuote: Model<IGeopricingQuote> = 
  mongoose.models.GeopricingQuote || 
  mongoose.model<IGeopricingQuote>('GeopricingQuote', GeopricingQuoteSchema);

export default GeopricingQuote;