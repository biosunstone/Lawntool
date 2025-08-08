import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBusinessMembership extends Document {
  userId: mongoose.Types.ObjectId
  businessId: mongoose.Types.ObjectId
  role: 'business_owner' | 'admin' | 'staff'
  isPrimary: boolean // The user's primary/default business
  permissions?: string[]
  joinedAt: Date
  invitedBy?: mongoose.Types.ObjectId
  status: 'active' | 'inactive' | 'suspended'
}

const businessMembershipSchema = new Schema<IBusinessMembership>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  role: {
    type: String,
    enum: ['business_owner', 'admin', 'staff'],
    required: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  permissions: [{
    type: String,
  }],
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
}, {
  timestamps: true,
})

// Compound index to ensure a user can only have one membership per business
businessMembershipSchema.index({ userId: 1, businessId: 1 }, { unique: true })

// Ensure only one primary business per user
businessMembershipSchema.pre('save', async function(next) {
  if (this.isPrimary) {
    // Cast this.constructor to the proper Mongoose model type
    const BusinessMembershipModel = this.constructor as Model<IBusinessMembership>
    
    // Remove primary flag from other memberships for this user
    await BusinessMembershipModel.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isPrimary: false }
    )
  }
  next()
})

const BusinessMembership = mongoose.models.BusinessMembership || mongoose.model<IBusinessMembership>('BusinessMembership', businessMembershipSchema)

export default BusinessMembership