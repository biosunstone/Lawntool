import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * ZIP Code/Postal Code Pricing Configuration Model
 * Stores ZIP code (US) and Postal code (Canada) based pricing rules for the Geopricing™ system
 */

export interface IZipCodeRule {
  zipCode: string; // ZIP code (US) or Postal code (Canada) - stored without spaces
  adjustmentType: 'fixed' | 'percentage';
  adjustmentValue: number; // Positive for surcharge, negative for discount
  description: string;
  routeDensity?: 'high' | 'medium' | 'low';
  isActive: boolean;
  country?: 'US' | 'CA'; // Optional country identifier
}

export interface IRegionRule {
  pattern: string; // Regex pattern for matching
  name: string;
  adjustmentType: 'fixed' | 'percentage';
  adjustmentValue: number;
  description: string;
  priority: number; // Higher priority rules override lower ones
  isActive: boolean;
}

export interface IDefaultRule {
  adjustmentType: 'fixed' | 'percentage';
  adjustmentValue: number;
  description: string;
}

export interface IZipCodePricingConfig extends Document {
  businessId: mongoose.Types.ObjectId;
  
  // Base configuration
  baseRatePer1000SqFt: number;
  currency: string;
  minimumCharge: number;
  
  // Service all codes by default
  serviceAllCodes?: boolean;
  
  // Default rule for codes not matching any pattern
  defaultRule?: IDefaultRule;
  
  // Region-based rules for broader coverage
  regionRules?: IRegionRule[];
  
  // Service area ZIP codes with pricing rules (specific overrides)
  serviceZipCodes: IZipCodeRule[];
  
  // Default message for out-of-service areas
  noServiceMessage: string;
  contactSalesLink?: string;
  
  // Display settings
  displaySettings: {
    showAllZones: boolean;
    highlightCustomerZone: boolean;
    discountColor: string;
    surchargeColor: string;
    baseRateColor: string;
  };
  
  // Metadata
  isActive: boolean;
  version: number;
  effectiveDate: Date;
  expiryDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
export interface IZipCodePricingModel extends Model<IZipCodePricingConfig> {
  getActiveConfig(businessId: string): Promise<IZipCodePricingConfig | null>;
  getZipCodeRule(businessId: string, zipCode: string): Promise<IZipCodeRule | null>;
}

const ZipCodeRuleSchema = new Schema({
  zipCode: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true
  },
  adjustmentType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed'
  },
  adjustmentValue: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String,
    required: true
  },
  routeDensity: {
    type: String,
    enum: ['high', 'medium', 'low']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const RegionRuleSchema = new Schema({
  pattern: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  adjustmentType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed'
  },
  adjustmentValue: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const DefaultRuleSchema = new Schema({
  adjustmentType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed'
  },
  adjustmentValue: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: 'Standard service area'
  }
});

const ZipCodePricingSchema = new Schema<IZipCodePricingConfig>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  
  baseRatePer1000SqFt: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'CAD']
  },
  minimumCharge: {
    type: Number,
    default: 50,
    min: 0
  },
  
  serviceAllCodes: {
    type: Boolean,
    default: false
  },
  
  defaultRule: DefaultRuleSchema,
  
  regionRules: [RegionRuleSchema],
  
  serviceZipCodes: [ZipCodeRuleSchema],
  
  noServiceMessage: {
    type: String,
    default: 'Sorry, we do not currently service this ZIP code. Please contact our sales team for more information.'
  },
  contactSalesLink: String,
  
  displaySettings: {
    showAllZones: {
      type: Boolean,
      default: true
    },
    highlightCustomerZone: {
      type: Boolean,
      default: true
    },
    discountColor: {
      type: String,
      default: '#16a34a' // green-600
    },
    surchargeColor: {
      type: String,
      default: '#dc2626' // red-600
    },
    baseRateColor: {
      type: String,
      default: '#000000' // black
    }
  },
  
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
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
ZipCodePricingSchema.index({ businessId: 1, isActive: 1, effectiveDate: -1 });
ZipCodePricingSchema.index({ businessId: 1, 'serviceZipCodes.zipCode': 1 });

// Instance methods
ZipCodePricingSchema.methods.calculatePrice = function(zipCode: string, propertySize: number) {
  const rule = this.serviceZipCodes.find((r: IZipCodeRule) => 
    r.zipCode === zipCode.toUpperCase() && r.isActive
  );
  
  if (!rule) {
    return null; // ZIP code not in service area
  }
  
  let adjustedRate = this.baseRatePer1000SqFt;
  
  if (rule.adjustmentType === 'fixed') {
    adjustedRate += rule.adjustmentValue;
  } else if (rule.adjustmentType === 'percentage') {
    adjustedRate *= (1 + rule.adjustmentValue / 100);
  }
  
  const totalPrice = Math.max(
    (propertySize / 1000) * adjustedRate,
    this.minimumCharge
  );
  
  return {
    zipCode: rule.zipCode,
    baseRate: this.baseRatePer1000SqFt,
    adjustment: rule.adjustmentValue,
    adjustmentType: rule.adjustmentType,
    adjustedRate: Math.round(adjustedRate * 100) / 100,
    propertySize,
    totalPrice: Math.round(totalPrice * 100) / 100,
    description: rule.description,
    routeDensity: rule.routeDensity
  };
};

// Static methods
ZipCodePricingSchema.statics.getActiveConfig = async function(businessId: string) {
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

ZipCodePricingSchema.statics.getZipCodeRule = async function(businessId: string, zipCode: string) {
  const config = await (this as any).getActiveConfig(businessId);
  if (!config) return null;
  
  return config.serviceZipCodes.find((rule: IZipCodeRule) => 
    rule.zipCode === zipCode.toUpperCase() && rule.isActive
  ) || null;
};

// Pre-save hook to increment version
ZipCodePricingSchema.pre('save', async function(next) {
  if (this.isNew) {
    const latestConfig = await mongoose.model('ZipCodePricing').findOne({
      businessId: this.businessId
    }).sort({ version: -1 });
    
    this.version = latestConfig ? latestConfig.version + 1 : 1;
  }
  next();
});

const ZipCodePricing = (mongoose.models.ZipCodePricing || 
  mongoose.model<IZipCodePricingConfig, IZipCodePricingModel>('ZipCodePricing', ZipCodePricingSchema)) as IZipCodePricingModel;

export default ZipCodePricing;