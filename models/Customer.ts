import mongoose, { Schema } from 'mongoose'
import { ICustomer } from '@/types/saas'

const customerSchema = new Schema<ICustomer>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
  },
  properties: [{
    address: { type: String, required: true },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    polygon: [{
      lat: Number,
      lng: Number,
    }],
    measurements: {
      lot: {
        area: Number,
        perimeter: Number,
        polygon: [{
          lat: Number,
          lng: Number
        }]
      },
      lawn: {
        area: Number,
        perimeter: Number,
        polygon: [{
          lat: Number,
          lng: Number
        }]
      },
      house: {
        area: Number,
        perimeter: Number,
        polygon: [{
          lat: Number,
          lng: Number
        }]
      },
      driveway: {
        area: Number,
        perimeter: Number,
        polygon: [{
          lat: Number,
          lng: Number
        }]
      }
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    notes: String,
  }],
  source: {
    type: String,
    default: 'manual'
  },
  tags: [String],
  notes: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  metadata: {
    source: String,
    referral: String,
    customFields: Schema.Types.Mixed
  },
  archivedAt: Date,
  measurementCount: {
    type: Number,
    default: 0,
  },
  quoteCount: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

// Compound index for unique email per business
customerSchema.index({ businessId: 1, email: 1 }, { unique: true })
customerSchema.index({ businessId: 1, createdAt: -1 })
customerSchema.index({ email: 1 })
customerSchema.index({ name: 'text', email: 'text' })

const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema)

export default Customer