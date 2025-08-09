import mongoose, { Schema, Document } from 'mongoose'

export interface IZapierEventQueue extends Document {
  businessId: mongoose.Types.ObjectId
  configId?: mongoose.Types.ObjectId
  eventName: string
  data: any
  metadata: {
    userId?: mongoose.Types.ObjectId
    ipAddress?: string
    userAgent?: string
    referrer?: string
    timestamp: Date
    source?: string
  }
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  attempts: number
  maxAttempts: number
  lastAttempt?: Date
  nextAttempt: Date
  error?: {
    message: string
    code?: string
    timestamp: Date
  }
  webhookIds?: mongoose.Types.ObjectId[]
  deliveryResults?: Array<{
    webhookId: mongoose.Types.ObjectId
    url: string
    success: boolean
    statusCode?: number
    responseTime?: number
    error?: string
    timestamp: Date
  }>
  createdAt: Date
  updatedAt: Date
  
  // Methods
  canRetry(): boolean
  markProcessing(): Promise<void>
  markCompleted(results?: any): Promise<void>
  markFailed(error: string): Promise<void>
  scheduleRetry(): Promise<void>
}

const ZapierEventQueueSchema = new Schema<IZapierEventQueue>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  configId: {
    type: Schema.Types.ObjectId,
    ref: 'ZapierConfig',
    index: true
  },
  eventName: {
    type: String,
    required: true,
    index: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  metadata: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: String,
    userAgent: String,
    referrer: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  lastAttempt: Date,
  nextAttempt: {
    type: Date,
    default: Date.now,
    index: true
  },
  error: {
    message: String,
    code: String,
    timestamp: Date
  },
  webhookIds: [{
    type: Schema.Types.ObjectId,
    ref: 'ZapierWebhook'
  }],
  deliveryResults: [{
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: 'ZapierWebhook'
    },
    url: String,
    success: Boolean,
    statusCode: Number,
    responseTime: Number,
    error: String,
    timestamp: Date
  }]
}, {
  timestamps: true
})

// Check if event can be retried
ZapierEventQueueSchema.methods.canRetry = function(): boolean {
  return this.status === 'failed' && this.attempts < this.maxAttempts
}

// Mark as processing
ZapierEventQueueSchema.methods.markProcessing = async function(): Promise<void> {
  this.status = 'processing'
  this.lastAttempt = new Date()
  this.attempts += 1
  await this.save()
}

// Mark as completed
ZapierEventQueueSchema.methods.markCompleted = async function(results?: any): Promise<void> {
  this.status = 'completed'
  if (results) {
    this.deliveryResults = results
  }
  await this.save()
}

// Mark as failed
ZapierEventQueueSchema.methods.markFailed = async function(error: string): Promise<void> {
  this.status = 'failed'
  this.error = {
    message: error,
    timestamp: new Date()
  }
  
  // Schedule retry if possible
  if (this.canRetry()) {
    await this.scheduleRetry()
  }
  
  await this.save()
}

// Schedule retry with exponential backoff
ZapierEventQueueSchema.methods.scheduleRetry = async function(): Promise<void> {
  const baseDelay = 5000 // 5 seconds
  const maxDelay = 300000 // 5 minutes
  
  // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, max 300s
  const delay = Math.min(baseDelay * Math.pow(2, this.attempts), maxDelay)
  
  this.nextAttempt = new Date(Date.now() + delay)
  this.status = 'pending' // Reset to pending for retry
  await this.save()
}

// Indexes for queue processing
ZapierEventQueueSchema.index({ status: 1, nextAttempt: 1 }) // For finding pending events
ZapierEventQueueSchema.index({ businessId: 1, status: 1 }) // For business queries
ZapierEventQueueSchema.index({ createdAt: -1 }) // For sorting and cleanup
ZapierEventQueueSchema.index({ eventName: 1, status: 1 }) // For event type queries

// TTL index to auto-delete old completed/failed events after 30 days
ZapierEventQueueSchema.index(
  { updatedAt: 1 },
  { 
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { 
      status: { $in: ['completed', 'failed', 'skipped'] } 
    }
  }
)

const ZapierEventQueue = mongoose.models.ZapierEventQueue || mongoose.model<IZapierEventQueue>('ZapierEventQueue', ZapierEventQueueSchema)

export { ZapierEventQueue }