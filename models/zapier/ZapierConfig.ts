import mongoose, { Schema, Document } from 'mongoose'
import crypto from 'crypto'

export interface IZapierConfig extends Document {
  businessId: mongoose.Types.ObjectId
  apiKey: string
  apiKeyHash: string
  enabled: boolean
  tier: 'none' | 'basic' | 'pro' | 'enterprise'
  enabledEvents: string[]
  webhookLimit: number
  webhooksUsed: number
  rateLimitPerMinute: number
  settings: {
    allowPolling: boolean
    allowWebhooks: boolean
    allowActions: boolean
    customHeaders?: Record<string, string>
  }
  metadata: {
    createdBy: mongoose.Types.ObjectId
    lastUsed?: Date
    totalEvents?: number
    failedEvents?: number
  }
  createdAt: Date
  updatedAt: Date
  
  // Methods
  generateApiKey(): string
  validateApiKey(key: string): boolean
  canEmitEvent(): boolean
  incrementUsage(): Promise<void>
}

const ZapierConfigSchema = new Schema<IZapierConfig>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true,
    index: true
  },
  apiKey: {
    type: String,
    select: false // Never return in queries by default
  },
  apiKeyHash: {
    type: String,
    required: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  tier: {
    type: String,
    enum: ['none', 'basic', 'pro', 'enterprise'],
    default: 'none'
  },
  enabledEvents: [{
    type: String
  }],
  webhookLimit: {
    type: Number,
    default: 100 // Per month
  },
  webhooksUsed: {
    type: Number,
    default: 0
  },
  rateLimitPerMinute: {
    type: Number,
    default: 10
  },
  settings: {
    allowPolling: {
      type: Boolean,
      default: true
    },
    allowWebhooks: {
      type: Boolean,
      default: false
    },
    allowActions: {
      type: Boolean,
      default: false
    },
    customHeaders: {
      type: Map,
      of: String
    }
  },
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastUsed: Date,
    totalEvents: {
      type: Number,
      default: 0
    },
    failedEvents: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
})

// Generate a secure API key
ZapierConfigSchema.methods.generateApiKey = function(): string {
  const key = `zap_${this.businessId}_${crypto.randomBytes(32).toString('hex')}`
  this.apiKey = key
  this.apiKeyHash = crypto.createHash('sha256').update(key).digest('hex')
  return key
}

// Validate an API key
ZapierConfigSchema.methods.validateApiKey = function(key: string): boolean {
  if (!key) return false
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return hash === this.apiKeyHash
}

// Check if can emit event (quota/limits)
ZapierConfigSchema.methods.canEmitEvent = function(): boolean {
  if (!this.enabled) return false
  if (this.tier === 'none') return false
  
  // Check monthly webhook limit
  const limits: { [key: string]: number } = {
    basic: 1000,
    pro: 10000,
    enterprise: -1 // Unlimited
  }
  
  const limit = limits[this.tier] || 100
  if (limit !== -1 && this.webhooksUsed >= limit) {
    return false
  }
  
  return true
}

// Increment usage counters
ZapierConfigSchema.methods.incrementUsage = async function(): Promise<void> {
  this.webhooksUsed += 1
  this.metadata.totalEvents = (this.metadata.totalEvents || 0) + 1
  this.metadata.lastUsed = new Date()
  await this.save()
}

// Reset monthly usage (call this via cron job)
ZapierConfigSchema.statics.resetMonthlyUsage = async function() {
  await this.updateMany(
    { enabled: true },
    { $set: { webhooksUsed: 0 } }
  )
}

// Indexes for performance
ZapierConfigSchema.index({ businessId: 1, enabled: 1 })
ZapierConfigSchema.index({ apiKeyHash: 1 })
ZapierConfigSchema.index({ 'metadata.lastUsed': -1 })

// Ensure model name matches exactly
const ZapierConfig = mongoose.models.ZapierConfig || mongoose.model<IZapierConfig>('ZapierConfig', ZapierConfigSchema)

export { ZapierConfig }