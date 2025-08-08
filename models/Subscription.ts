import mongoose, { Schema } from 'mongoose'
import { ISubscription } from '@/types/saas'

const subscriptionSchema = new Schema<ISubscription>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true,
  },
  stripeCustomerId: {
    type: String,
    required: true,
  },
  stripeSubscriptionId: String,
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free',
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing'],
    default: 'active',
  },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  measurementQuota: {
    type: Number,
    default: 10, // Free plan default
  },
  measurementsUsed: {
    type: Number,
    default: 0,
  },
  features: {
    teamMembers: { type: Number, default: 1 },
    apiAccess: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    advancedReporting: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
})

// Plan configurations
export const PLAN_FEATURES = {
  free: {
    measurementQuota: 10,
    teamMembers: 1,
    apiAccess: false,
    whiteLabel: false,
    customBranding: false,
    advancedReporting: false,
    price: 0,
  },
  starter: {
    measurementQuota: 100,
    teamMembers: 3,
    apiAccess: false,
    whiteLabel: false,
    customBranding: true,
    advancedReporting: false,
    price: 49,
  },
  professional: {
    measurementQuota: 500,
    teamMembers: 10,
    apiAccess: true,
    whiteLabel: false,
    customBranding: true,
    advancedReporting: true,
    price: 149,
  },
  enterprise: {
    measurementQuota: -1, // Unlimited
    teamMembers: -1, // Unlimited
    apiAccess: true,
    whiteLabel: true,
    customBranding: true,
    advancedReporting: true,
    price: 499,
  },
}

subscriptionSchema.index({ stripeCustomerId: 1 })
subscriptionSchema.index({ status: 1 })

const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', subscriptionSchema)

export default Subscription