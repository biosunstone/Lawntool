import mongoose, { Schema } from 'mongoose'

export interface ICartRecoveryLog {
  _id: mongoose.Types.ObjectId
  abandoned_cart_id: mongoose.Types.ObjectId
  business_id: mongoose.Types.ObjectId
  user_id?: mongoose.Types.ObjectId
  contact_type: 'email' | 'sms' | 'push'
  contact_value: string // email address or phone number
  sent_at: Date
  click_through: boolean
  clicked_at?: Date
  recovery_url: string
  discount_code?: string
  discount_amount?: number
  template_used?: string
  email_subject?: string
  email_content?: string
  sms_content?: string
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  delivery_error?: string
  opened: boolean
  opened_at?: Date
  converted: boolean
  converted_at?: Date
  order_value?: number
  metadata?: {
    campaign_id?: string
    ab_test_variant?: string
    send_attempt?: number
    provider?: string // sendgrid, twilio, etc.
    message_id?: string
  }
  created_at: Date
  updated_at: Date
}

const cartRecoveryLogSchema = new Schema<ICartRecoveryLog>({
  abandoned_cart_id: {
    type: Schema.Types.ObjectId,
    ref: 'AbandonedCart',
    required: true,
    index: true
  },
  business_id: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  contact_type: {
    type: String,
    enum: ['email', 'sms', 'push'],
    required: true,
    index: true
  },
  contact_value: {
    type: String,
    required: true
  },
  sent_at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  click_through: {
    type: Boolean,
    default: false,
    index: true
  },
  clicked_at: Date,
  recovery_url: {
    type: String,
    required: true
  },
  discount_code: String,
  discount_amount: Number,
  template_used: String,
  email_subject: String,
  email_content: String,
  sms_content: String,
  delivery_status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'pending',
    index: true
  },
  delivery_error: String,
  opened: {
    type: Boolean,
    default: false
  },
  opened_at: Date,
  converted: {
    type: Boolean,
    default: false,
    index: true
  },
  converted_at: Date,
  order_value: Number,
  metadata: {
    campaign_id: String,
    ab_test_variant: String,
    send_attempt: Number,
    provider: String,
    message_id: String
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})

// Compound indexes for reporting
cartRecoveryLogSchema.index({ business_id: 1, sent_at: -1 })
cartRecoveryLogSchema.index({ business_id: 1, converted: 1 })
cartRecoveryLogSchema.index({ contact_type: 1, delivery_status: 1 })

// Methods
cartRecoveryLogSchema.methods.markClicked = function() {
  this.click_through = true
  this.clicked_at = new Date()
  return this
}

cartRecoveryLogSchema.methods.markOpened = function() {
  this.opened = true
  this.opened_at = new Date()
  return this
}

cartRecoveryLogSchema.methods.markConverted = function(orderValue?: number) {
  this.converted = true
  this.converted_at = new Date()
  if (orderValue) {
    this.order_value = orderValue
  }
  return this
}

cartRecoveryLogSchema.methods.updateDeliveryStatus = function(status: string, error?: string) {
  this.delivery_status = status
  if (error) {
    this.delivery_error = error
  }
  return this
}

// Static methods
cartRecoveryLogSchema.statics.getRecoveryStats = async function(businessId: string, days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  const stats = await this.aggregate([
    {
      $match: {
        business_id: new mongoose.Types.ObjectId(businessId),
        sent_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total_sent: { $sum: 1 },
        total_clicked: {
          $sum: { $cond: [{ $eq: ['$click_through', true] }, 1, 0] }
        },
        total_opened: {
          $sum: { $cond: [{ $eq: ['$opened', true] }, 1, 0] }
        },
        total_converted: {
          $sum: { $cond: [{ $eq: ['$converted', true] }, 1, 0] }
        },
        total_revenue: {
          $sum: { $cond: [{ $eq: ['$converted', true] }, '$order_value', 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total_sent: 1,
        total_clicked: 1,
        total_opened: 1,
        total_converted: 1,
        total_revenue: 1,
        click_rate: {
          $cond: [
            { $eq: ['$total_sent', 0] },
            0,
            { $multiply: [{ $divide: ['$total_clicked', '$total_sent'] }, 100] }
          ]
        },
        open_rate: {
          $cond: [
            { $eq: ['$total_sent', 0] },
            0,
            { $multiply: [{ $divide: ['$total_opened', '$total_sent'] }, 100] }
          ]
        },
        conversion_rate: {
          $cond: [
            { $eq: ['$total_sent', 0] },
            0,
            { $multiply: [{ $divide: ['$total_converted', '$total_sent'] }, 100] }
          ]
        }
      }
    }
  ])
  
  return stats[0] || {
    total_sent: 0,
    total_clicked: 0,
    total_opened: 0,
    total_converted: 0,
    total_revenue: 0,
    click_rate: 0,
    open_rate: 0,
    conversion_rate: 0
  }
}

const CartRecoveryLog = mongoose.models.CartRecoveryLog || mongoose.model<ICartRecoveryLog>('CartRecoveryLog', cartRecoveryLogSchema)

export default CartRecoveryLog