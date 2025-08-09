import mongoose, { Schema, Document } from 'mongoose'

export interface IGeopricingZone extends Document {
  businessId: mongoose.Types.ObjectId
  name: string
  description?: string
  type: 'radius' | 'polygon' | 'zipcode' | 'city' | 'drivetime'
  active: boolean
  
  // Zone definition based on type
  geometry?: {
    type: 'Point' | 'Polygon'
    coordinates: number[] | number[][]  // [lng, lat] or array of [lng, lat]
  }
  
  radius?: {
    center: {
      lat: number
      lng: number
      address?: string
    }
    distance: number  // in meters
    unit: 'km' | 'miles'
  }
  
  driveTime?: {
    origin: {
      lat: number
      lng: number
      address?: string
    }
    maxMinutes: number
    trafficModel?: 'bestguess' | 'pessimistic' | 'optimistic'
  }
  
  zipcodes?: string[]
  cities?: string[]
  neighborhoods?: string[]
  
  // Pricing adjustments
  pricing: {
    adjustmentType: 'percentage' | 'fixed' | 'multiplier'
    adjustmentValue: number  // e.g., 10 for 10% increase, 1.5 for 1.5x multiplier
    
    // Service-specific adjustments (optional)
    serviceAdjustments?: {
      lawn?: number
      driveway?: number
      sidewalk?: number
      [key: string]: number | undefined
    }
    
    // Minimum/maximum constraints
    minimumCharge?: number
    maximumDiscount?: number
    
    // Seasonal adjustments
    seasonalAdjustments?: Array<{
      startMonth: number
      endMonth: number
      adjustmentValue: number
    }>
  }
  
  // Route density settings
  routeDensity?: {
    enabled: boolean
    targetDensity: number  // target customers per zone
    currentDensity?: number
    densityBonus?: number  // discount for dense areas
    sparsePenalty?: number  // surcharge for sparse areas
    autoAdjust: boolean
  }
  
  // Priority and overlap handling
  priority: number  // Higher priority zones override lower ones
  
  // Statistics
  stats?: {
    customersInZone: number
    averageJobValue: number
    totalRevenue: number
    lastUpdated: Date
  }
  
  // Metadata
  metadata?: {
    color?: string  // For map visualization
    icon?: string
    tags?: string[]
    customFields?: Record<string, any>
  }
  
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const GeopricingZoneSchema = new Schema<IGeopricingZone>({
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
  description: String,
  type: {
    type: String,
    enum: ['radius', 'polygon', 'zipcode', 'city', 'drivetime'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  
  // GeoJSON geometry for spatial queries
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'Polygon']
    },
    coordinates: Schema.Types.Mixed
  },
  
  // Radius-based zone
  radius: {
    center: {
      lat: Number,
      lng: Number,
      address: String
    },
    distance: Number,
    unit: {
      type: String,
      enum: ['km', 'miles'],
      default: 'miles'
    }
  },
  
  // Drive time based zone
  driveTime: {
    origin: {
      lat: Number,
      lng: Number,
      address: String
    },
    maxMinutes: Number,
    trafficModel: {
      type: String,
      enum: ['bestguess', 'pessimistic', 'optimistic'],
      default: 'bestguess'
    }
  },
  
  // List-based zones
  zipcodes: [String],
  cities: [String],
  neighborhoods: [String],
  
  // Pricing configuration
  pricing: {
    adjustmentType: {
      type: String,
      enum: ['percentage', 'fixed', 'multiplier'],
      required: true
    },
    adjustmentValue: {
      type: Number,
      required: true
    },
    serviceAdjustments: {
      type: Map,
      of: Number
    },
    minimumCharge: Number,
    maximumDiscount: Number,
    seasonalAdjustments: [{
      startMonth: Number,
      endMonth: Number,
      adjustmentValue: Number
    }]
  },
  
  // Route density optimization
  routeDensity: {
    enabled: {
      type: Boolean,
      default: false
    },
    targetDensity: Number,
    currentDensity: Number,
    densityBonus: Number,
    sparsePenalty: Number,
    autoAdjust: {
      type: Boolean,
      default: false
    }
  },
  
  priority: {
    type: Number,
    default: 0
  },
  
  stats: {
    customersInZone: {
      type: Number,
      default: 0
    },
    averageJobValue: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  
  metadata: {
    color: String,
    icon: String,
    tags: [String],
    customFields: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Indexes for spatial queries
GeopricingZoneSchema.index({ geometry: '2dsphere' })
GeopricingZoneSchema.index({ businessId: 1, active: 1 })
GeopricingZoneSchema.index({ businessId: 1, type: 1 })
GeopricingZoneSchema.index({ businessId: 1, priority: -1 })
GeopricingZoneSchema.index({ 'radius.center': '2dsphere' })

// Method to check if a point is within this zone
GeopricingZoneSchema.methods.containsPoint = async function(lat: number, lng: number): Promise<boolean> {
  switch (this.type) {
    case 'radius':
      if (!this.radius) return false
      const distance = calculateDistance(
        this.radius.center.lat,
        this.radius.center.lng,
        lat,
        lng,
        this.radius.unit
      )
      return distance <= this.radius.distance
      
    case 'polygon':
      if (!this.geometry) return false
      // Use MongoDB's geoWithin query
      const point = {
        type: 'Point',
        coordinates: [lng, lat]
      }
      // This would need to be done via a query, not a method
      return false // Placeholder
      
    default:
      return false
  }
}

// Helper function to calculate distance between two points
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'km' | 'miles' = 'miles'
): number {
  const R = unit === 'km' ? 6371 : 3959 // Earth's radius in km or miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

const GeopricingZone = mongoose.models.GeopricingZone || mongoose.model<IGeopricingZone>('GeopricingZone', GeopricingZoneSchema)

export default GeopricingZone