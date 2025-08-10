import mongoose, { Schema } from 'mongoose'

export interface ICartItem {
  serviceType: 'lawn' | 'driveway' | 'sidewalk' | 'building'
  name: string
  description?: string
  area: number
  pricePerUnit: number
  totalPrice: number
  pricingRuleId?: mongoose.Types.ObjectId
}

export interface ICart {
  _id: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId // Optional for guest carts
  sessionId: string // For guest users
  businessId: mongoose.Types.ObjectId
  customerId?: mongoose.Types.ObjectId
  measurementId?: mongoose.Types.ObjectId
  items: ICartItem[]
  subtotal: number
  tax: number
  discount: number
  discountCode?: string
  total: number
  propertyAddress?: string
  propertySize?: number
  status: 'active' | 'abandoned' | 'converted' | 'expired'
  abandonedAt?: Date
  recoveryEmailSent?: boolean
  recoveryEmailSentAt?: Date
  reminderCount: number
  lastActivityAt: Date
  expiresAt: Date
  metadata?: {
    source?: string
    referrer?: string
    device?: string
    userAgent?: string
    guestEmail?: string
    guestName?: string
    guestPhone?: string
  }
  createdAt: Date
  updatedAt: Date
}

const cartItemSchema = new Schema({
  serviceType: {
    type: String,
    enum: ['lawn', 'driveway', 'sidewalk', 'building'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  area: {
    type: Number,
    required: true
  },
  pricePerUnit: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  pricingRuleId: {
    type: Schema.Types.ObjectId,
    ref: 'PricingRule'
  }
}, { _id: false })

const cartSchema = new Schema<ICart>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Allow null for guest users
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  },
  measurementId: {
    type: Schema.Types.ObjectId,
    ref: 'Measurement'
  },
  items: [cartItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  discountCode: String,
  total: {
    type: Number,
    default: 0,
    required: true
  },
  propertyAddress: String,
  propertySize: Number,
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted', 'expired'],
    default: 'active',
    required: true
  },
  abandonedAt: Date,
  recoveryEmailSent: {
    type: Boolean,
    default: false
  },
  recoveryEmailSentAt: Date,
  reminderCount: {
    type: Number,
    default: 0
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  metadata: {
    source: String,
    referrer: String,
    device: String,
    userAgent: String,
    guestEmail: String,
    guestName: String,
    guestPhone: String
  }
}, {
  timestamps: true
})

// Indexes for efficient querying
cartSchema.index({ userId: 1, status: 1 })
cartSchema.index({ sessionId: 1, status: 1 })
cartSchema.index({ businessId: 1, status: 1 })
cartSchema.index({ status: 1, abandonedAt: 1 })
cartSchema.index({ expiresAt: 1 })
cartSchema.index({ lastActivityAt: 1 })

// Methods
cartSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum:number, item:any) => sum + item.totalPrice, 0)
  this.total = this.subtotal + this.tax - this.discount
  return this
}

cartSchema.methods.markAsAbandoned = function() {
  if (this.status === 'active') {
    this.status = 'abandoned'
    this.abandonedAt = new Date()
  }
  return this
}

cartSchema.methods.markAsConverted = function() {
  this.status = 'converted'
  return this
}

// Static methods
cartSchema.statics.findActiveCart = async function(userId?: string, sessionId?: string) {
  const query: any = { status: 'active' }
  
  if (userId) {
    query.userId = userId
  } else if (sessionId) {
    query.sessionId = sessionId
  }
  
  return this.findOne(query).sort({ updatedAt: -1 })
}

cartSchema.statics.findAbandonedCarts = async function(businessId: string, hoursAgo: number = 1) {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
  
  return this.find({
    businessId,
    status: 'abandoned',
    abandonedAt: { $gte: cutoffTime },
    recoveryEmailSent: false
  })
}

const Cart = mongoose.models.Cart || mongoose.model<ICart>('Cart', cartSchema)

export default Cart