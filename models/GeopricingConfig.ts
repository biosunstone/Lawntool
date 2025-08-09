import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Static methods for the GeopricingConfig model
 */
export interface IGeopricingConfigModel extends Model<IGeopricingConfig> {
  getActiveConfig(businessId: string): Promise<IGeopricingConfig | null>;
}

/**
 * Geopricing Configuration Model
 * Stores all configuration parameters for the pricing engine
 */
export interface IGeopricingConfig extends Document {
  businessId: mongoose.Types.ObjectId;
  
  // Base pricing configuration
  pricing: {
    baseRatePer1000SqFt: number;
    currency: string;
    minimumCharge: number;
    
    // Service-specific rates (optional overrides)
    serviceRates?: {
      lawn?: number;
      driveway?: number;
      sidewalk?: number;
      snowRemoval?: number;
      [key: string]: number | undefined;
    };
  };
  
  // Shop location configuration
  shopLocation: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    city: string;
    province: string;
    country: string;
    postalCode: string;
  };
  
  // Zone configuration with thresholds
  zones: {
    close: {
      name: string;
      driveTimeThreshold: {
        min: number; // minutes
        max: number; // minutes
      };
      adjustmentType: 'percentage' | 'fixed';
      adjustmentValue: number; // negative for discount, positive for surcharge
      description: string;
      color: string; // for UI display
    };
    standard: {
      name: string;
      driveTimeThreshold: {
        min: number;
        max: number;
      };
      adjustmentType: 'percentage' | 'fixed';
      adjustmentValue: number;
      description: string;
      color: string;
    };
    extended: {
      name: string;
      driveTimeThreshold: {
        min: number;
        max: number; // can be Infinity for no upper limit
      };
      adjustmentType: 'percentage' | 'fixed';
      adjustmentValue: number;
      description: string;
      color: string;
    };
  };
  
  // API configuration
  apiSettings: {
    googleMapsApiKey?: string; // can override global key
    trafficModel: 'best_guess' | 'pessimistic' | 'optimistic';
    avoidHighways: boolean;
    avoidTolls: boolean;
    cacheDuration: number; // minutes
  };
  
  // Business rules
  businessRules: {
    allowManualOverride: boolean;
    requireApprovalAboveThreshold?: number;
    autoExpireQuotesAfterDays: number;
    roundPriceTo: number; // e.g., 0.01 for cents, 1 for dollars
    includeTrafficInCalculation: boolean;
  };
  
  // Metadata
  isActive: boolean;
  version: number;
  effectiveDate: Date;
  expiryDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const GeopricingConfigSchema = new Schema<IGeopricingConfig>({
  businessId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true,
    index: true 
  },
  
  // Base pricing configuration
  pricing: {
    baseRatePer1000SqFt: { 
      type: Number, 
      required: true,
      min: 0 
    },
    currency: { 
      type: String, 
      default: 'CAD',
      enum: ['CAD', 'USD'] 
    },
    minimumCharge: { 
      type: Number, 
      default: 50,
      min: 0 
    },
    serviceRates: {
      type: Map,
      of: Number
    }
  },
  
  // Shop location configuration
  shopLocation: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 }
    },
    city: { type: String, required: true },
    province: { type: String, required: true },
    country: { type: String, default: 'Canada' },
    postalCode: { type: String, required: true }
  },
  
  // Zone configuration
  zones: {
    close: {
      name: { type: String, default: 'Close Proximity' },
      driveTimeThreshold: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 5 }
      },
      adjustmentType: { 
        type: String, 
        enum: ['percentage', 'fixed'],
        default: 'percentage' 
      },
      adjustmentValue: { type: Number, default: -5 }, // 5% discount
      description: { 
        type: String, 
        default: 'Quick service with minimal travel time' 
      },
      color: { type: String, default: 'green' }
    },
    standard: {
      name: { type: String, default: 'Standard Service' },
      driveTimeThreshold: {
        min: { type: Number, default: 5 },
        max: { type: Number, default: 20 }
      },
      adjustmentType: { 
        type: String, 
        enum: ['percentage', 'fixed'],
        default: 'percentage' 
      },
      adjustmentValue: { type: Number, default: 0 },
      description: { 
        type: String, 
        default: 'Regular service area with standard pricing' 
      },
      color: { type: String, default: 'blue' }
    },
    extended: {
      name: { type: String, default: 'Extended Service' },
      driveTimeThreshold: {
        min: { type: Number, default: 20 },
        max: { type: Number, default: 999999 } // effectively infinite
      },
      adjustmentType: { 
        type: String, 
        enum: ['percentage', 'fixed'],
        default: 'percentage' 
      },
      adjustmentValue: { type: Number, default: 10 }, // 10% surcharge
      description: { 
        type: String, 
        default: 'Distant locations requiring additional travel time' 
      },
      color: { type: String, default: 'red' }
    }
  },
  
  // API configuration
  apiSettings: {
    googleMapsApiKey: String,
    trafficModel: { 
      type: String, 
      enum: ['best_guess', 'pessimistic', 'optimistic'],
      default: 'best_guess' 
    },
    avoidHighways: { type: Boolean, default: false },
    avoidTolls: { type: Boolean, default: false },
    cacheDuration: { type: Number, default: 15 } // 15 minutes default
  },
  
  // Business rules
  businessRules: {
    allowManualOverride: { type: Boolean, default: true },
    requireApprovalAboveThreshold: Number,
    autoExpireQuotesAfterDays: { type: Number, default: 30 },
    roundPriceTo: { type: Number, default: 0.01 },
    includeTrafficInCalculation: { type: Boolean, default: true }
  },
  
  // Metadata
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  version: { 
    type: Number, 
    default: 1 
  },
  effectiveDate: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  expiryDate: { 
    type: Date,
    index: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  approvedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  lastModifiedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

// Indexes
GeopricingConfigSchema.index({ businessId: 1, isActive: 1, effectiveDate: -1 });
GeopricingConfigSchema.index({ businessId: 1, version: -1 });

// Virtual to check if config is currently effective
GeopricingConfigSchema.virtual('isEffective').get(function() {
  const now = new Date();
  return this.isActive && 
         this.effectiveDate <= now && 
         (!this.expiryDate || this.expiryDate > now);
});

// Method to get zone for drive time
GeopricingConfigSchema.methods.getZoneForDriveTime = function(driveTimeMinutes: number) {
  const zones = this.zones;
  
  if (driveTimeMinutes >= zones.close.driveTimeThreshold.min && 
      driveTimeMinutes <= zones.close.driveTimeThreshold.max) {
    return {
      type: 'close',
      ...zones.close
    };
  } else if (driveTimeMinutes > zones.standard.driveTimeThreshold.min && 
             driveTimeMinutes <= zones.standard.driveTimeThreshold.max) {
    return {
      type: 'standard',
      ...zones.standard
    };
  } else if (driveTimeMinutes > zones.extended.driveTimeThreshold.min) {
    return {
      type: 'extended',
      ...zones.extended
    };
  }
  
  // Default to standard if somehow doesn't match
  return {
    type: 'standard',
    ...zones.standard
  };
};

// Method to calculate adjusted price
GeopricingConfigSchema.methods.calculateAdjustedRate = function(driveTimeMinutes: number): number {
  const zone = this.getZoneForDriveTime(driveTimeMinutes);
  const baseRate = this.pricing.baseRatePer1000SqFt;
  
  if (zone.adjustmentType === 'percentage') {
    return baseRate * (1 + zone.adjustmentValue / 100);
  } else {
    // Fixed adjustment
    return baseRate + zone.adjustmentValue;
  }
};

// Static method to get active config for a business
GeopricingConfigSchema.statics.getActiveConfig = async function(businessId: string) {
  const now = new Date();
  return this.findOne({
    businessId,
    isActive: true,
    effectiveDate: { $lte: now },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: now } }
    ]
  }).sort({ version: -1 });
};

// Pre-save hook to increment version
GeopricingConfigSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Get the latest version for this business
    const latestConfig = await mongoose.model('GeopricingConfig').findOne({
      businessId: this.businessId
    }).sort({ version: -1 });
    
    this.version = latestConfig ? latestConfig.version + 1 : 1;
  }
  next();
});

const GeopricingConfig = (mongoose.models.GeopricingConfig || 
  mongoose.model<IGeopricingConfig, IGeopricingConfigModel>('GeopricingConfig', GeopricingConfigSchema)) as IGeopricingConfigModel;

export default GeopricingConfig;