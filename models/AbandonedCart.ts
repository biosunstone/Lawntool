import mongoose, { Schema } from 'mongoose'

export interface ICartData {
  item_id: string
  service_type: 'lawn' | 'driveway' | 'sidewalk' | 'building'
  qty: number
  price: number
  service_details: {
    name: string
    description?: string
    area: number
    price_per_unit: number
  }
}

export interface IAbandonedCart {
  _id: mongoose.Types.ObjectId
  user_id?: mongoose.Types.ObjectId
  session_id: string
  business_id: mongoose.Types.ObjectId
  cart_data: ICartData[]
  property_address?: string
  property_size?: number
  measurement_id?: mongoose.Types.ObjectId
  subtotal: number
  tax: number
  discount: number
  discount_code?: string
  total: number
  abandoned_at: Date
  reminder_sent: boolean
  reminder_sent_at?: Date
  recovery_completed: boolean
  recovery_completed_at?: Date
  recovery_token?: string
  recovery_discount_code?: string
  recovery_discount_expires?: Date
  metadata?: {
    source?: string
    referrer?: string
    device?: string
    user_agent?: string
    ip_address?: string
  }
  created_at: Date
  updated_at: Date
}

const cartDataSchema = new Schema({
  item_id: {
    type: String,
    required: true
  },
  service_type: {
    type: String,
    enum: ['lawn', 'driveway', 'sidewalk', 'building'],
    required: true
  },
  qty: {
    type: Number,
    default: 1,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  service_details: {
    name: { type: String, required: true },
    description: String,
    area: { type: Number, required: true },
    price_per_unit: { type: Number, required: true }
  }
}, { _id: false })

const abandonedCartSchema = new Schema<IAbandonedCart>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  session_id: {
    type: String,
    required: true,
    index: true
  },
  business_id: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  cart_data: {
    type: [cartDataSchema],
    required: true
  },
  property_address: String,
  property_size: Number,
  measurement_id: {
    type: Schema.Types.ObjectId,
    ref: 'Measurement'
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  discount_code: String,
  total: {
    type: Number,
    required: true,
    default: 0
  },
  abandoned_at: {
    type: Date,
    required: true,
    index: true
  },
  reminder_sent: {
    type: Boolean,
    default: false,
    index: true
  },
  reminder_sent_at: Date,
  recovery_completed: {
    type: Boolean,
    default: false,
    index: true
  },
  recovery_completed_at: Date,
  recovery_token: {
    type: String,
    unique: true,
    sparse: true
  },
  recovery_discount_code: String,
  recovery_discount_expires: Date,
  metadata: {
    source: String,
    referrer: String,
    device: String,
    user_agent: String,
    ip_address: String,
    guest_email: String,
    guest_name: String,
    guest_phone: String
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})

// Indexes for efficient querying
abandonedCartSchema.index({ abandoned_at: 1, reminder_sent: 1 })
abandonedCartSchema.index({ user_id: 1, recovery_completed: 1 })
abandonedCartSchema.index({ business_id: 1, abandoned_at: -1 })
abandonedCartSchema.index({ recovery_token: 1 })

// Methods
abandonedCartSchema.methods.generateRecoveryToken = function() {
  this.recovery_token = `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  return this.recovery_token
}

abandonedCartSchema.methods.markReminderSent = function() {
  this.reminder_sent = true
  this.reminder_sent_at = new Date()
  return this
}

abandonedCartSchema.methods.markRecoveryCompleted = function() {
  this.recovery_completed = true
  this.recovery_completed_at = new Date()
  return this
}

// Static methods
abandonedCartSchema.statics.findCartsForRecovery = async function(minutesAgo: number = 15) {
  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000)
  
  return this.find({
    abandoned_at: { $lte: cutoffTime },
    reminder_sent: false,
    recovery_completed: false
  })
}

abandonedCartSchema.statics.createFromActiveCart = async function(cartData: any) {
  const abandonedCart:any = new this({
    user_id: cartData.userId || null,
    session_id: cartData.sessionId,
    business_id: cartData.businessId,
    cart_data: cartData.items.map((item: any) => ({
      item_id: item._id || `${item.serviceType}_${Date.now()}`,
      service_type: item.serviceType,
      qty: 1,
      price: item.totalPrice,
      service_details: {
        name: item.name,
        description: item.description,
        area: item.area,
        price_per_unit: item.pricePerUnit
      }
    })),
    property_address: cartData.propertyAddress,
    property_size: cartData.propertySize,
    measurement_id: cartData.measurementId,
    subtotal: cartData.subtotal,
    tax: cartData.tax,
    discount: cartData.discount,
    discount_code: cartData.discountCode,
    total: cartData.total,
    abandoned_at: new Date(),
    metadata: cartData.metadata
  })
  
  // Generate recovery token
  abandonedCart.generateRecoveryToken()
  
  return abandonedCart.save()
}

const AbandonedCart = mongoose.models.AbandonedCart || mongoose.model<IAbandonedCart>('AbandonedCart', abandonedCartSchema)

export default AbandonedCart