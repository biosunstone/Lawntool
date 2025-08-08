import mongoose, { Schema } from 'mongoose'
import { IPricingRule } from '@/types/saas'

const pricingRuleSchema = new Schema<IPricingRule>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['zone', 'service', 'customer', 'volume'],
    required: true,
  },
  conditions: {
    zipCodes: [String],
    serviceTypes: [String],
    dateRange: {
      start: Date,
      end: Date,
    },
    customerTags: [String],
    minArea: Number,
    maxArea: Number,
    dayOfWeek: [Number], // 0-6, Sunday to Saturday
    timeOfDay: {
      start: String, // "09:00"
      end: String,   // "17:00"
    }
  },
  pricing: {
    priceMultiplier: {
      type: Number,
      default: 1,
    },
    fixedPrices: {
      lawnPerSqFt: Number,
      drivewayPerSqFt: Number,
      sidewalkPerSqFt: Number,
      buildingPerSqFt: Number,
    },
    minimumCharge: Number,
    surcharge: Number,
    discount: {
      type: Number,
      percentage: Boolean,
    }
  },
  priority: {
    type: Number,
    default: 0,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  description: String,
  appliedCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

// Indexes for efficient querying
pricingRuleSchema.index({ businessId: 1, isActive: 1, priority: -1 })
pricingRuleSchema.index({ businessId: 1, type: 1 })
pricingRuleSchema.index({ 'conditions.zipCodes': 1 })
pricingRuleSchema.index({ 'conditions.customerTags': 1 })

const PricingRule = mongoose.models.PricingRule || mongoose.model<IPricingRule>('PricingRule', pricingRuleSchema)

export default PricingRule