import mongoose, { Schema, Document } from 'mongoose'

export interface IZapierWebhook extends Document {
  businessId: mongoose.Types.ObjectId
  configId: mongoose.Types.ObjectId
  url: string
  events: string[]
  active: boolean
  secret?: string
  headers?: Record<string, string>
  retryConfig: {
    maxAttempts: number
    backoffMultiplier: number
    maxBackoffSeconds: number
  }
  statistics: {
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    lastDelivery?: Date
    lastSuccess?: Date
    lastFailure?: Date
    averageResponseTime?: number
  }
  metadata: {
    zapId?: string // Zapier's internal ID
    name?: string
    description?: string
    createdBy: mongoose.Types.ObjectId
  }
  createdAt: Date
  updatedAt: Date
  
  // Methods
  shouldRetry(attempt: number): boolean
  getBackoffDelay(attempt: number): number
  updateStatistics(success: boolean, responseTime?: number): Promise<void>
}

const ZapierWebhookSchema = new Schema<IZapierWebhook>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  configId: {
    type: Schema.Types.ObjectId,
    ref: 'ZapierConfig',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v)
      },
      message: 'Invalid webhook URL'
    }
  },
  events: [{
    type: String,
    required: true
  }],
  active: {
    type: Boolean,
    default: true
  },
  secret: {
    type: String,
    select: false // Don't return by default
  },
  headers: {
    type: Map,
    of: String
  },
  retryConfig: {
    maxAttempts: {
      type: Number,
      default: 3
    },
    backoffMultiplier: {
      type: Number,
      default: 2
    },
    maxBackoffSeconds: {
      type: Number,
      default: 300 // 5 minutes
    }
  },
  statistics: {
    totalDeliveries: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    failedDeliveries: {
      type: Number,
      default: 0
    },
    lastDelivery: Date,
    lastSuccess: Date,
    lastFailure: Date,
    averageResponseTime: Number
  },
  metadata: {
    zapId: String,
    name: String,
    description: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }
}, {
  timestamps: true
})

// Check if should retry based on attempt number
ZapierWebhookSchema.methods.shouldRetry = function(attempt: number): boolean {
  return attempt < this.retryConfig.maxAttempts
}

// Calculate backoff delay for retry
ZapierWebhookSchema.methods.getBackoffDelay = function(attempt: number): number {
  const baseDelay = 1000 // 1 second
  const delay = baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1)
  return Math.min(delay, this.retryConfig.maxBackoffSeconds * 1000)
}

// Update delivery statistics
ZapierWebhookSchema.methods.updateStatistics = async function(
  success: boolean, 
  responseTime?: number
): Promise<void> {
  this.statistics.totalDeliveries += 1
  this.statistics.lastDelivery = new Date()
  
  if (success) {
    this.statistics.successfulDeliveries += 1
    this.statistics.lastSuccess = new Date()
    
    // Update average response time
    if (responseTime) {
      const currentAvg = this.statistics.averageResponseTime || 0
      const totalSuccessful = this.statistics.successfulDeliveries
      this.statistics.averageResponseTime = 
        (currentAvg * (totalSuccessful - 1) + responseTime) / totalSuccessful
    }
  } else {
    this.statistics.failedDeliveries += 1
    this.statistics.lastFailure = new Date()
    
    // Auto-disable webhook after too many failures
    const failureRate = this.statistics.failedDeliveries / this.statistics.totalDeliveries
    if (this.statistics.totalDeliveries > 10 && failureRate > 0.5) {
      this.active = false
      console.warn(`[Zapier] Auto-disabled webhook due to high failure rate: ${this.url}`)
    }
  }
  
  await this.save()
}

// Indexes for performance
ZapierWebhookSchema.index({ businessId: 1, active: 1 })
ZapierWebhookSchema.index({ configId: 1, active: 1 })
ZapierWebhookSchema.index({ events: 1 })
ZapierWebhookSchema.index({ 'statistics.lastDelivery': -1 })

// Compound index for event queries
ZapierWebhookSchema.index({ businessId: 1, events: 1, active: 1 })

const ZapierWebhook = mongoose.models.ZapierWebhook || mongoose.model<IZapierWebhook>('ZapierWebhook', ZapierWebhookSchema)

export { ZapierWebhook }