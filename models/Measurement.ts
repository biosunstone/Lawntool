import mongoose, { Schema } from 'mongoose'
import { IMeasurement } from '@/types/saas'

const measurementSchema = new Schema<IMeasurement>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
  },
  address: {
    type: String,
    required: true,
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  measurements: {
    totalArea: { type: Number, required: true },
    perimeter: { type: Number, required: true },
    lawn: {
      frontYard: { type: Number, default: 0 },
      backYard: { type: Number, default: 0 },
      sideYard: { type: Number, default: 0 },
      total: { type: Number, required: true },
      perimeter: { type: Number, default: 0 },
    },
    driveway: { type: Number, default: 0 },
    sidewalk: { type: Number, default: 0 },
    building: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'api', 'widget'],
      default: 'web',
    },
    ipAddress: String,
    userAgent: String,
  },
  selectionMethod: {
    type: String,
    enum: ['ai', 'manual', 'hybrid'],
    default: 'ai',
  },
  manualSelections: {
    lawn: {
      polygon: [[Number]],
      area: Number,
      selections: [Schema.Types.Mixed],
    },
    driveway: {
      polygon: [[Number]],
      area: Number,
      selections: [Schema.Types.Mixed],
    },
    sidewalk: {
      polygon: [[Number]],
      area: Number,
      selections: [Schema.Types.Mixed],
    },
    building: {
      polygon: [[Number]],
      area: Number,
      selections: [Schema.Types.Mixed],
    },
  },
  // Payment fields for measurement report access
  paymentStatus: {
    type: String,
    enum: ['none', 'pending', 'paid', 'failed'],
    default: 'none',
  },
  paymentSessionId: String,
  stripeSessionId: String,
  paymentAmount: Number,
  paymentCompletedAt: Date,
  fullDataAccess: {
    type: Boolean,
    default: false,
  },
  customerEmail: String,
  quoteId: {
    type: Schema.Types.ObjectId,
    ref: 'Quote',
  },
}, {
  timestamps: true,
})

measurementSchema.index({ businessId: 1, createdAt: -1 })
measurementSchema.index({ userId: 1, createdAt: -1 })
measurementSchema.index({ customerId: 1, createdAt: -1 })
measurementSchema.index({ address: 'text' })
measurementSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 })

const Measurement = mongoose.models.Measurement || mongoose.model<IMeasurement>('Measurement', measurementSchema)

export default Measurement