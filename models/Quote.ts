import mongoose, { Schema } from 'mongoose'
import { IQuote } from '@/types/saas'

const quoteSchema = new Schema<IQuote>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  measurementId: {
    type: Schema.Types.ObjectId,
    ref: 'Measurement',
  },
  quoteNumber: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'],
    default: 'draft',
  },
  propertyAddress: String,
  propertyCoordinates: {
    lat: Number,
    lng: Number,
  },
  propertyPolygon: [{
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
  services: [{
    name: { type: String, required: true },
    description: String,
    area: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    frequency: String,
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  notes: String,
  validUntil: {
    type: Date,
    required: true,
  },
  sentAt: Date,
  viewedAt: Date,
  respondedAt: Date,
  metadata: {
    mapUrl: String,
    formDuration: Number,
    submittedAt: Date,
    formStatus: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
})

// Quote number generation removed - now handled by lib/saas/quoteNumberGenerator.ts
// to prevent duplicate key errors in concurrent requests

quoteSchema.index({ businessId: 1, createdAt: -1 })
quoteSchema.index({ customerId: 1, createdAt: -1 })
quoteSchema.index({ status: 1 })

const Quote = mongoose.models.Quote || mongoose.model<IQuote>('Quote', quoteSchema)

export default Quote