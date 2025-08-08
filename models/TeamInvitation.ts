import mongoose, { Schema } from 'mongoose'
import { ITeamInvitation } from '@/types/saas'
import * as crypto from 'crypto'

const teamInvitationSchema = new Schema<ITeamInvitation>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['staff', 'business_owner'],
    default: 'staff',
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    unique: true,
    sparse: true, // Allow null values for uniqueness
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending',
  },
  permissions: [{
    type: String,
    enum: [
      'view_measurements',
      'create_measurements',
      'manage_customers',
      'create_quotes',
      'view_analytics',
      'manage_pricing',
      'manage_team',
      'access_billing',
    ],
  }],
  acceptedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  acceptedAt: Date,
}, {
  timestamps: true,
})

// Generate unique token before saving
teamInvitationSchema.pre('save', function(next) {
  if (!this.token) {
    // Generate a unique token
    try {
      if (typeof crypto !== 'undefined' && crypto.randomBytes) {
        this.token = crypto.randomBytes(32).toString('hex')
      } else {
        // Fallback for environments where crypto is not available
        this.token = Date.now().toString(36) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }
    } catch (error) {
      // Ultimate fallback
      this.token = Date.now().toString(36) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
  }
  next()
})

// Check if invitation is expired
teamInvitationSchema.methods.isExpired = function() {
  return this.expiresAt < new Date() || this.status === 'expired'
}

// Mark invitation as expired
teamInvitationSchema.methods.markExpired = async function() {
  this.status = 'expired'
  return this.save()
}

// Accept invitation
teamInvitationSchema.methods.accept = async function(userId: string) {
  this.status = 'accepted'
  this.acceptedBy = userId as any
  this.acceptedAt = new Date()
  return this.save()
}

// Indexes
teamInvitationSchema.index({ businessId: 1, email: 1 })
teamInvitationSchema.index({ token: 1 })
teamInvitationSchema.index({ status: 1, expiresAt: 1 })

const TeamInvitation = mongoose.models.TeamInvitation || mongoose.model<ITeamInvitation>('TeamInvitation', teamInvitationSchema)

export default TeamInvitation