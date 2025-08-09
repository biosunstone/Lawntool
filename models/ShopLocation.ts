import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IShopLocation extends Document {
  businessId: mongoose.Types.ObjectId;
  name: string;
  city: string;
  province: string;
  country: string;
  address: string;
  postalCode: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat] for MongoDB GeoJSON
  };
  
  // Pricing configuration
  pricing: {
    baseRatePer1000SqFt: number;
    currency: string;
    minimumCharge: number;
    
    // Service-specific base rates
    services: {
      lawn: number;
      driveway: number;
      sidewalk: number;
      snowRemoval?: number;
      [key: string]: number | undefined;
    };
  };
  
  // Operating configuration
  operating: {
    serviceRadiusKm: number;
    maxDriveTimeMinutes: number;
    businessHours: {
      [key: string]: {
        open: string;
        close: string;
        closed?: boolean;
      };
    };
    holidays: Date[];
    seasonalDates?: {
      summerStart: string; // MM-DD format
      summerEnd: string;
      winterStart?: string;
      winterEnd?: string;
    };
  };
  
  // Zone configuration
  zones: {
    close: {
      maxMinutes: number;
      adjustment: number; // percentage
      name: string;
      description: string;
    };
    standard: {
      minMinutes: number;
      maxMinutes: number;
      adjustment: number;
      name: string;
      description: string;
    };
    extended: {
      minMinutes: number;
      adjustment: number;
      name: string;
      description: string;
    };
  };
  
  // Contact information
  contact: {
    phone: string;
    email: string;
    managerName?: string;
    emergencyPhone?: string;
  };
  
  // Statistics
  stats: {
    totalQuotes: number;
    totalCustomers: number;
    averageDriveTime: number;
    monthlyRevenue: number;
    lastQuoteDate?: Date;
  };
  
  // Metadata
  isActive: boolean;
  isPrimary: boolean; // Primary location for the business
  establishedDate: Date;
  lastModified: Date;
  createdBy: mongoose.Types.ObjectId;
  modifiedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const ShopLocationSchema = new Schema<IShopLocation>({
  businessId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  city: { 
    type: String, 
    required: true,
    index: true 
  },
  province: { 
    type: String, 
    required: true 
  },
  country: { 
    type: String, 
    default: 'Canada' 
  },
  address: { 
    type: String, 
    required: true 
  },
  postalCode: { 
    type: String, 
    required: true 
  },
  
  // GeoJSON location for geospatial queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  
  // Pricing configuration
  pricing: {
    baseRatePer1000SqFt: { 
      type: Number, 
      required: true,
      default: 20 
    },
    currency: { 
      type: String, 
      default: 'CAD' 
    },
    minimumCharge: { 
      type: Number, 
      default: 50 
    },
    services: {
      lawn: { type: Number, default: 0.02 },
      driveway: { type: Number, default: 0.03 },
      sidewalk: { type: Number, default: 0.025 },
      snowRemoval: { type: Number, default: 0.035 }
    }
  },
  
  // Operating configuration
  operating: {
    serviceRadiusKm: { 
      type: Number, 
      default: 50 
    },
    maxDriveTimeMinutes: { 
      type: Number, 
      default: 60 
    },
    businessHours: {
      type: Map,
      of: {
        open: String,
        close: String,
        closed: Boolean
      },
      default: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '16:00' },
        sunday: { closed: true }
      }
    },
    holidays: [Date],
    seasonalDates: {
      summerStart: String,
      summerEnd: String,
      winterStart: String,
      winterEnd: String
    }
  },
  
  // Zone configuration
  zones: {
    close: {
      maxMinutes: { type: Number, default: 5 },
      adjustment: { type: Number, default: -5 },
      name: { type: String, default: 'Close Proximity' },
      description: { type: String, default: 'Quick service with minimal travel' }
    },
    standard: {
      minMinutes: { type: Number, default: 5 },
      maxMinutes: { type: Number, default: 20 },
      adjustment: { type: Number, default: 0 },
      name: { type: String, default: 'Standard Service' },
      description: { type: String, default: 'Regular service area' }
    },
    extended: {
      minMinutes: { type: Number, default: 20 },
      adjustment: { type: Number, default: 10 },
      name: { type: String, default: 'Extended Service' },
      description: { type: String, default: 'Distant locations requiring extra travel' }
    }
  },
  
  // Contact information
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    managerName: String,
    emergencyPhone: String
  },
  
  // Statistics
  stats: {
    totalQuotes: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    averageDriveTime: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    lastQuoteDate: Date
  },
  
  // Metadata
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  isPrimary: { 
    type: Boolean, 
    default: false 
  },
  establishedDate: { 
    type: Date, 
    default: Date.now 
  },
  lastModified: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  modifiedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
ShopLocationSchema.index({ location: '2dsphere' }); // For geospatial queries
ShopLocationSchema.index({ businessId: 1, city: 1 });
ShopLocationSchema.index({ businessId: 1, isActive: 1 });
ShopLocationSchema.index({ businessId: 1, isPrimary: 1 });

// Virtual for full address
ShopLocationSchema.virtual('fullAddress').get(function() {
  return `${this.address}, ${this.city}, ${this.province} ${this.postalCode}, ${this.country}`;
});

// Method to check if shop is open at a given time
ShopLocationSchema.methods.isOpenAt = function(date: Date): boolean {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  const hours = this.operating.businessHours.get(dayOfWeek);
  
  if (!hours || hours.closed) return false;
  
  const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= hours.open && currentTime <= hours.close;
};

// Method to get zone for a given drive time
ShopLocationSchema.methods.getZoneForDriveTime = function(driveTimeMinutes: number) {
  if (driveTimeMinutes <= this.zones.close.maxMinutes) {
    return {
      type: 'close',
      ...this.zones.close
    };
  } else if (driveTimeMinutes <= this.zones.standard.maxMinutes) {
    return {
      type: 'standard',
      ...this.zones.standard
    };
  } else {
    return {
      type: 'extended',
      ...this.zones.extended
    };
  }
};

// Method to calculate adjusted price
ShopLocationSchema.methods.calculateAdjustedPrice = function(
  basePrice: number,
  driveTimeMinutes: number
): number {
  const zone = this.getZoneForDriveTime(driveTimeMinutes);
  return basePrice * (1 + zone.adjustment / 100);
};

// Static method to find nearest shop location
ShopLocationSchema.statics.findNearest = async function(
  businessId: string,
  coordinates: [number, number],
  maxDistanceKm: number = 100
) {
  return this.findOne({
    businessId,
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistanceKm * 1000 // Convert to meters
      }
    }
  });
};

const ShopLocation: Model<IShopLocation> = 
  mongoose.models.ShopLocation || 
  mongoose.model<IShopLocation>('ShopLocation', ShopLocationSchema);

export default ShopLocation;