import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';

export interface IWebhook {
  name: string;
  url: string;
  events: string[]; // e.g., ['quote.created', 'measurement.completed', 'pricing.calculated']
  isActive: boolean;
  secret?: string; // For webhook signature verification
  headers?: Record<string, string>;
  lastTriggered?: Date;
  failureCount?: number;
}

export interface IApiKey {
  name: string;
  key: string;
  permissions: string[]; // e.g., ['read:pricing', 'write:quotes', 'read:measurements']
  lastUsed?: Date;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface IIntegration extends Document {
  businessId: mongoose.Types.ObjectId;
  
  // Zapier Configuration
  zapier: {
    enabled: boolean;
    apiKeys: IApiKey[];
    webhooks: IWebhook[];
    subscriberId?: string; // Zapier subscription ID
  };
  
  // Other integrations (future expansion)
  googleSheets?: {
    enabled: boolean;
    spreadsheetId?: string;
    credentials?: any;
  };
  
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
  };
  
  // Integration stats
  stats: {
    totalApiCalls: number;
    totalWebhooksSent: number;
    lastApiCall?: Date;
    lastWebhookSent?: Date;
  };
  
  // Settings
  settings: {
    allowExternalAccess: boolean;
    ipWhitelist?: string[];
    rateLimitPerHour?: number;
  };
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIntegrationModel extends Model<IIntegration> {
  generateApiKey(): string;
  verifyApiKey(businessId: string, apiKey: string): Promise<IApiKey | null>;
}

const WebhookSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  events: [{ type: String }],
  isActive: { type: Boolean, default: true },
  secret: String,
  headers: { type: Map, of: String },
  lastTriggered: Date,
  failureCount: { type: Number, default: 0 }
});

const ApiKeySchema = new Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  permissions: [{ type: String }],
  lastUsed: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

const IntegrationSchema = new Schema<IIntegration>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true
  },
  
  zapier: {
    enabled: { type: Boolean, default: false },
    apiKeys: [ApiKeySchema],
    webhooks: [WebhookSchema],
    subscriberId: String
  },
  
  googleSheets: {
    enabled: { type: Boolean, default: false },
    spreadsheetId: String,
    credentials: { type: Schema.Types.Mixed }
  },
  
  slack: {
    enabled: { type: Boolean, default: false },
    webhookUrl: String,
    channel: String
  },
  
  stats: {
    totalApiCalls: { type: Number, default: 0 },
    totalWebhooksSent: { type: Number, default: 0 },
    lastApiCall: Date,
    lastWebhookSent: Date
  },
  
  settings: {
    allowExternalAccess: { type: Boolean, default: true },
    ipWhitelist: [String],
    rateLimitPerHour: { type: Number, default: 1000 }
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
IntegrationSchema.index({ businessId: 1 });
IntegrationSchema.index({ 'zapier.apiKeys.key': 1 });

// Static methods
IntegrationSchema.statics.generateApiKey = function(): string {
  // Generate a secure API key
  const prefix = 'zap';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
};

IntegrationSchema.statics.verifyApiKey = async function(
  businessId: string,
  apiKey: string
): Promise<IApiKey | null> {
  const integration = await this.findOne({
    businessId,
    'zapier.apiKeys.key': apiKey,
    'zapier.apiKeys.isActive': true
  });
  
  if (!integration) return null;
  
  const key = integration.zapier.apiKeys.find(
    (k: IApiKey) => k.key === apiKey && k.isActive
  );
  
  if (key) {
    // Update last used
    await this.updateOne(
      { 
        businessId,
        'zapier.apiKeys.key': apiKey 
      },
      { 
        $set: { 'zapier.apiKeys.$.lastUsed': new Date() },
        $inc: { 'stats.totalApiCalls': 1 }
      }
    );
  }
  
  return key || null;
};

const Integration = (mongoose.models.Integration || 
  mongoose.model<IIntegration, IIntegrationModel>('Integration', IntegrationSchema)) as IIntegrationModel;

export default Integration;