import mongoose, { Schema, Document } from 'mongoose'

export interface IAbandonedQuote extends Document {
  businessId: mongoose.Types.ObjectId
  customerEmail: string
  customerName?: string
  customerPhone?: string
  propertyAddress: string
  propertyCoordinates: {
    lat: number
    lng: number
  }
  propertyPolygon: Array<{
    lat: number
    lng: number
  }>
  measurements?: {
    lot?: {
      area: number
      perimeter: number
      polygon: Array<{ lat: number; lng: number }>
    }
    lawn?: {
      area: number
      perimeter: number
      polygon?: Array<{ lat: number; lng: number }>
    }
    house?: {
      area: number
      perimeter: number
      polygon: Array<{ lat: number; lng: number }>
    }
    driveway?: {
      area: number
      perimeter: number
      polygon: Array<{ lat: number; lng: number }>
    }
  }
  notes?: string
  formStartedAt: Date
  formAbandonedAt: Date
  formDuration?: number
  mapUrl?: string
  emailSent: boolean
  emailSentAt?: Date
  recovered: boolean
  recoveredAt?: Date
  recoveredQuoteId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const abandonedQuoteSchema = new Schema<IAbandonedQuote>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  customerName: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  propertyAddress: {
    type: String,
    required: true
  },
  propertyCoordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  propertyPolygon: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
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
  notes: String,
  formStartedAt: {
    type: Date,
    required: true
  },
  formAbandonedAt: {
    type: Date,
    required: true
  },
  formDuration: Number,
  mapUrl: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  recovered: {
    type: Boolean,
    default: false
  },
  recoveredAt: Date,
  recoveredQuoteId: {
    type: Schema.Types.ObjectId,
    ref: 'Quote'
  }
}, {
  timestamps: true
})

// Indexes for efficient querying
abandonedQuoteSchema.index({ businessId: 1, createdAt: -1 })
abandonedQuoteSchema.index({ customerEmail: 1 })
abandonedQuoteSchema.index({ emailSent: 1, recovered: 1 })
abandonedQuoteSchema.index({ propertyAddress: 1 })

const AbandonedQuote = mongoose.models.AbandonedQuote || mongoose.model<IAbandonedQuote>('AbandonedQuote', abandonedQuoteSchema)

export default AbandonedQuote