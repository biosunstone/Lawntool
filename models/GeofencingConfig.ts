import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Geofencing Configuration Model
 * Stores zone-based pricing and service availability rules based on drive time
 */

export interface IServiceRule {
  serviceName: string;
  serviceType: 'mowing' | 'fertilization' | 'pest_control' | 'custom';
  availableInZones: string[]; // Zone IDs where service is available
  additionalFeePercentage?: number; // Additional fee after zone surcharge
  description: string;
  isActive: boolean;
}

export interface IZone {
  zoneId: string;
  zoneName: string;
  minDriveTimeMinutes: number;
  maxDriveTimeMinutes: number | null; // null for last zone (no upper limit)
  surchargePercentage: number; // 0 for base rate, positive for surcharge
  color: string; // For UI display
  description: string;
  priority: number; // For sorting
  isActive: boolean;
}

export interface IGeofencingConfig extends Document {
  businessId: mongoose.Types.ObjectId;
  
  // Shop configuration
  shopLocation: {
    latitude: number;
    longitude: number;
    address: string;
    name: string;
  };
  
  // Base pricing
  baseRatePer1000SqFt: number;
  currency: string;
  minimumCharge: number;
  
  // Zone definitions
  zones: IZone[];
  
  // Service rules
  serviceRules: IServiceRule[];
  
  // Out of service area configuration
  maxServiceDistanceMinutes: number;
  outOfServiceMessage: string;
  contactSalesLink?: string;
  
  // Display settings
  displaySettings: {
    showAllZones: boolean;
    highlightCustomerZone: boolean;
    availableServiceColor: string;
    surchargeServiceColor: string;
    unavailableServiceColor: string;
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
export interface IGeofencingConfigModel extends Model<IGeofencingConfig> {
  getActiveConfig(businessId: string): Promise<IGeofencingConfig | null>;
}

const ServiceRuleSchema = new Schema({
  serviceName: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    enum: ['mowing', 'fertilization', 'pest_control', 'custom'],
    required: true
  },
  availableInZones: [{
    type: String,
    required: true
  }],
  additionalFeePercentage: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const ZoneSchema = new Schema({
  zoneId: {
    type: String,
    required: true
  },
  zoneName: {
    type: String,
    required: true
  },
  minDriveTimeMinutes: {
    type: Number,
    required: true,
    min: 0
  },
  maxDriveTimeMinutes: {
    type: Number,
    min: 0,
    default: null
  },
  surchargePercentage: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: '#000000'
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

const GeofencingConfigSchema = new Schema<IGeofencingConfig>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  
  shopLocation: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    address: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: 'Main Shop'
    }
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
  
  zones: [ZoneSchema],
  
  serviceRules: [ServiceRuleSchema],
  
  maxServiceDistanceMinutes: {
    type: Number,
    default: 30,
    min: 0
  },
  outOfServiceMessage: {
    type: String,
    default: 'Sorry, your location is outside our service area. Please contact our sales team for more information.'
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
    availableServiceColor: {
      type: String,
      default: '#16a34a' // green-600
    },
    surchargeServiceColor: {
      type: String,
      default: '#eab308' // yellow-600
    },
    unavailableServiceColor: {
      type: String,
      default: '#9ca3af' // gray-400
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
GeofencingConfigSchema.index({ businessId: 1, isActive: 1, effectiveDate: -1 });

// Static methods
GeofencingConfigSchema.statics.getActiveConfig = async function(businessId: string) {
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
GeofencingConfigSchema.pre('save', async function(next) {
  if (this.isNew) {
    const latestConfig = await mongoose.model('GeofencingConfig').findOne({
      businessId: this.businessId
    }).sort({ version: -1 });
    
    this.version = latestConfig ? latestConfig.version + 1 : 1;
  }
  next();
});

const GeofencingConfig = (mongoose.models.GeofencingConfig || 
  mongoose.model<IGeofencingConfig, IGeofencingConfigModel>('GeofencingConfig', GeofencingConfigSchema)) as IGeofencingConfigModel;

export default GeofencingConfig;