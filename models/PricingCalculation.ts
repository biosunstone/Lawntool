import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Pricing Calculation Model
 * Stores every pricing calculation for audit and analytics
 */
export interface IPricingCalculation extends Document {
  businessId: mongoose.Types.ObjectId;
  configId: mongoose.Types.ObjectId; // Reference to config used
  customerId?: mongoose.Types.ObjectId;
  quoteId?: mongoose.Types.ObjectId;
  
  // Customer input data
  customer: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    city?: string;
    province?: string;
    postalCode?: string;
    propertySize: number; // in square feet
    services: Array<{
      type: string;
      area: number;
      unit: string;
    }>;
  };
  
  // Shop data (snapshot at calculation time)
  shop: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    city: string;
  };
  
  // Drive time calculation details
  driveTimeCalculation: {
    provider: 'google' | 'mapbox' | 'manual';
    requestedAt: Date;
    responseTime: number; // milliseconds
    rawResponse?: any; // Store raw API response for debugging
    
    result: {
      driveTimeMinutes: number;
      distanceKm: number;
      distanceText: string;
      durationText: string;
      trafficModel?: string;
      avoidedHighways?: boolean;
      avoidedTolls?: boolean;
    };
    
    fromCache: boolean;
    cacheKey?: string;
  };
  
  // Zone determination
  zoneAssignment: {
    matchedZone: 'close' | 'standard' | 'extended';
    zoneName: string;
    zoneThresholds: {
      min: number;
      max: number;
    };
    driveTimeMinutes: number; // actual drive time that matched
    adjustmentType: 'percentage' | 'fixed';
    adjustmentValue: number;
    adjustmentReason: string;
  };
  
  // Pricing calculation
  pricing: {
    baseRatePer1000SqFt: number;
    propertySize: number;
    basePrice: number; // (propertySize / 1000) * baseRate
    
    adjustment: {
      type: 'percentage' | 'fixed';
      value: number;
      amount: number; // actual dollar amount
    };
    
    adjustedPrice: number;
    minimumCharge: number;
    finalPrice: number; // max(adjustedPrice, minimumCharge)
    
    currency: string;
    roundedTo: number;
  };
  
  // Service breakdown (if multiple services)
  serviceBreakdown?: Array<{
    serviceType: string;
    area: number;
    baseRate: number;
    basePrice: number;
    adjustedRate: number;
    adjustedPrice: number;
    finalPrice: number;
  }>;
  
  // Total summary
  totalSummary: {
    totalBasePrice: number;
    totalAdjustment: number;
    totalFinalPrice: number;
    savingsOrSurcharge: number; // negative for savings, positive for surcharge
    percentageChange: number;
  };
  
  // Claude integration data
  claudeIntegration?: {
    requestSentAt?: Date;
    responseReceivedAt?: Date;
    formattedTable?: string; // HTML or markdown table
    explanation?: string;
    error?: string;
  };
  
  // Metadata
  calculationId: string; // Unique ID for this calculation
  source: 'website' | 'widget' | 'api' | 'admin' | 'mobile';
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  referrer?: string;
  
  // Status tracking
  status: 'calculated' | 'quoted' | 'converted' | 'expired' | 'cancelled';
  quoteSentAt?: Date;
  convertedAt?: Date;
  conversionValue?: number;
  
  // Performance metrics
  totalProcessingTime: number; // milliseconds
  breakdownTimes?: {
    geocoding?: number;
    driveTimeApi?: number;
    zoneMatching?: number;
    priceCalculation?: number;
    claudeFormatting?: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const PricingCalculationSchema = new Schema<IPricingCalculation>({
  businessId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true,
    index: true 
  },
  configId: { 
    type: Schema.Types.ObjectId, 
    ref: 'GeopricingConfig', 
    required: true 
  },
  customerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Customer',
    index: true 
  },
  quoteId: { 
    type: Schema.Types.ObjectId, 
    ref: 'GeopricingQuote' 
  },
  
  // Customer input data
  customer: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    city: String,
    province: String,
    postalCode: String,
    propertySize: { type: Number, required: true },
    services: [{
      type: String,
      area: Number,
      unit: String
    }]
  },
  
  // Shop data
  shop: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    city: { type: String, required: true }
  },
  
  // Drive time calculation details
  driveTimeCalculation: {
    provider: { 
      type: String, 
      enum: ['google', 'mapbox', 'manual'],
      default: 'google' 
    },
    requestedAt: { type: Date, required: true },
    responseTime: { type: Number, required: true },
    rawResponse: Schema.Types.Mixed,
    
    result: {
      driveTimeMinutes: { type: Number, required: true },
      distanceKm: { type: Number, required: true },
      distanceText: { type: String, required: true },
      durationText: { type: String, required: true },
      trafficModel: String,
      avoidedHighways: Boolean,
      avoidedTolls: Boolean
    },
    
    fromCache: { type: Boolean, default: false },
    cacheKey: String
  },
  
  // Zone determination
  zoneAssignment: {
    matchedZone: { 
      type: String, 
      enum: ['close', 'standard', 'extended'],
      required: true 
    },
    zoneName: { type: String, required: true },
    zoneThresholds: {
      min: { type: Number, required: true },
      max: { type: Number, required: true }
    },
    driveTimeMinutes: { type: Number, required: true },
    adjustmentType: { 
      type: String, 
      enum: ['percentage', 'fixed'],
      required: true 
    },
    adjustmentValue: { type: Number, required: true },
    adjustmentReason: { type: String, required: true }
  },
  
  // Pricing calculation
  pricing: {
    baseRatePer1000SqFt: { type: Number, required: true },
    propertySize: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    
    adjustment: {
      type: { 
        type: String, 
        enum: ['percentage', 'fixed'],
        required: true 
      },
      value: { type: Number, required: true },
      amount: { type: Number, required: true }
    },
    
    adjustedPrice: { type: Number, required: true },
    minimumCharge: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    
    currency: { type: String, default: 'CAD' },
    roundedTo: { type: Number, default: 0.01 }
  },
  
  // Service breakdown
  serviceBreakdown: [{
    serviceType: String,
    area: Number,
    baseRate: Number,
    basePrice: Number,
    adjustedRate: Number,
    adjustedPrice: Number,
    finalPrice: Number
  }],
  
  // Total summary
  totalSummary: {
    totalBasePrice: { type: Number, required: true },
    totalAdjustment: { type: Number, required: true },
    totalFinalPrice: { type: Number, required: true },
    savingsOrSurcharge: { type: Number, required: true },
    percentageChange: { type: Number, required: true }
  },
  
  // Claude integration
  claudeIntegration: {
    requestSentAt: Date,
    responseReceivedAt: Date,
    formattedTable: String,
    explanation: String,
    error: String
  },
  
  // Metadata
  calculationId: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  source: { 
    type: String, 
    enum: ['website', 'widget', 'api', 'admin', 'mobile'],
    default: 'website' 
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  referrer: String,
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['calculated', 'quoted', 'converted', 'expired', 'cancelled'],
    default: 'calculated',
    index: true 
  },
  quoteSentAt: Date,
  convertedAt: Date,
  conversionValue: Number,
  
  // Performance metrics
  totalProcessingTime: { type: Number, required: true },
  breakdownTimes: {
    geocoding: Number,
    driveTimeApi: Number,
    zoneMatching: Number,
    priceCalculation: Number,
    claudeFormatting: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
PricingCalculationSchema.index({ businessId: 1, createdAt: -1 });
PricingCalculationSchema.index({ businessId: 1, status: 1 });
PricingCalculationSchema.index({ 'customer.address': 1, businessId: 1 });
PricingCalculationSchema.index({ 'zoneAssignment.matchedZone': 1, businessId: 1 });
PricingCalculationSchema.index({ createdAt: -1 });

// Generate unique calculation ID
PricingCalculationSchema.pre('save', function(next) {
  if (!this.calculationId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    this.calculationId = `CALC-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Virtual for calculation age
PricingCalculationSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Method to check if calculation is still valid
PricingCalculationSchema.methods.isValid = function(validityDays: number = 30): boolean {
  return this.ageInDays <= validityDays && this.status !== 'expired';
};

// Static method for analytics
PricingCalculationSchema.statics.getZoneDistribution = async function(
  businessId: string,
  dateRange?: { start: Date; end: Date }
) {
  const query: any = { businessId };
  if (dateRange) {
    query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
  }
  
  return this.aggregate([
    { $match: query },
    { 
      $group: {
        _id: '$zoneAssignment.matchedZone',
        count: { $sum: 1 },
        avgDriveTime: { $avg: '$driveTimeCalculation.result.driveTimeMinutes' },
        avgAdjustment: { $avg: '$pricing.adjustment.value' },
        totalRevenue: { $sum: '$pricing.finalPrice' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to get average processing times
PricingCalculationSchema.statics.getPerformanceMetrics = async function(
  businessId: string,
  limit: number = 100
) {
  return this.aggregate([
    { $match: { businessId } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $group: {
        _id: null,
        avgTotalTime: { $avg: '$totalProcessingTime' },
        avgGeocoding: { $avg: '$breakdownTimes.geocoding' },
        avgDriveTimeApi: { $avg: '$breakdownTimes.driveTimeApi' },
        avgZoneMatching: { $avg: '$breakdownTimes.zoneMatching' },
        avgPriceCalculation: { $avg: '$breakdownTimes.priceCalculation' },
        avgClaudeFormatting: { $avg: '$breakdownTimes.claudeFormatting' }
      }
    }
  ]);
};

const PricingCalculation: Model<IPricingCalculation> = 
  mongoose.models.PricingCalculation || 
  mongoose.model<IPricingCalculation>('PricingCalculation', PricingCalculationSchema);

export default PricingCalculation;