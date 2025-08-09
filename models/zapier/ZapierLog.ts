import mongoose, { Schema, Document } from 'mongoose'

export interface IZapierLog extends Document {
  businessId: mongoose.Types.ObjectId
  eventId?: mongoose.Types.ObjectId
  webhookId?: mongoose.Types.ObjectId
  type: 'event' | 'webhook_delivery' | 'api_call' | 'error' | 'auth'
  action: string
  status: 'success' | 'failure' | 'warning'
  details: {
    eventName?: string
    url?: string
    method?: string
    statusCode?: number
    responseTime?: number
    requestHeaders?: Record<string, string>
    requestBody?: any
    responseHeaders?: Record<string, string>
    responseBody?: any
    error?: {
      message: string
      code?: string
      stack?: string
    }
  }
  metadata: {
    userId?: mongoose.Types.ObjectId
    apiKey?: string
    ipAddress?: string
    userAgent?: string
    zapId?: string
  }
  createdAt: Date
}

const ZapierLogSchema = new Schema<IZapierLog>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'ZapierEventQueue',
    index: true
  },
  webhookId: {
    type: Schema.Types.ObjectId,
    ref: 'ZapierWebhook',
    index: true
  },
  type: {
    type: String,
    enum: ['event', 'webhook_delivery', 'api_call', 'error', 'auth'],
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    required: true,
    index: true
  },
  details: {
    eventName: String,
    url: String,
    method: String,
    statusCode: Number,
    responseTime: Number,
    requestHeaders: {
      type: Map,
      of: String
    },
    requestBody: Schema.Types.Mixed,
    responseHeaders: {
      type: Map,
      of: String
    },
    responseBody: Schema.Types.Mixed,
    error: {
      message: String,
      code: String,
      stack: String
    }
  },
  metadata: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    apiKey: String,
    ipAddress: String,
    userAgent: String,
    zapId: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only need createdAt for logs
})

// Static methods for common logging operations
ZapierLogSchema.statics.logEvent = async function(
  businessId: mongoose.Types.ObjectId,
  eventId: mongoose.Types.ObjectId,
  eventName: string,
  status: 'success' | 'failure',
  error?: string
) {
  return this.create({
    businessId,
    eventId,
    type: 'event',
    action: `Event ${eventName} ${status === 'success' ? 'queued' : 'failed'}`,
    status,
    details: {
      eventName,
      error: error ? { message: error } : undefined
    }
  })
}

ZapierLogSchema.statics.logWebhookDelivery = async function(
  businessId: mongoose.Types.ObjectId,
  webhookId: mongoose.Types.ObjectId,
  eventId: mongoose.Types.ObjectId,
  url: string,
  statusCode: number,
  responseTime: number,
  success: boolean,
  error?: string
) {
  return this.create({
    businessId,
    eventId,
    webhookId,
    type: 'webhook_delivery',
    action: `Webhook delivery to ${url}`,
    status: success ? 'success' : 'failure',
    details: {
      url,
      statusCode,
      responseTime,
      error: error ? { message: error } : undefined
    }
  })
}

ZapierLogSchema.statics.logApiCall = async function(
  businessId: mongoose.Types.ObjectId,
  action: string,
  method: string,
  url: string,
  success: boolean,
  metadata?: any
) {
  return this.create({
    businessId,
    type: 'api_call',
    action,
    status: success ? 'success' : 'failure',
    details: {
      method,
      url
    },
    metadata
  })
}

ZapierLogSchema.statics.logAuth = async function(
  businessId: mongoose.Types.ObjectId,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  error?: string
) {
  return this.create({
    businessId,
    type: 'auth',
    action: 'API authentication attempt',
    status: success ? 'success' : 'failure',
    details: {
      error: error ? { message: error } : undefined
    },
    metadata: {
      ipAddress,
      userAgent
    }
  })
}

// Indexes for log queries
ZapierLogSchema.index({ businessId: 1, createdAt: -1 }) // Recent logs by business
ZapierLogSchema.index({ type: 1, status: 1, createdAt: -1 }) // Filter by type and status
ZapierLogSchema.index({ eventId: 1 }) // Logs for specific event
ZapierLogSchema.index({ webhookId: 1 }) // Logs for specific webhook

// TTL index to auto-delete logs after 90 days
ZapierLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
)

const ZapierLog = mongoose.models.ZapierLog || mongoose.model<IZapierLog>('ZapierLog', ZapierLogSchema)

export { ZapierLog }