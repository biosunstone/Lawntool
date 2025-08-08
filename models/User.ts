import mongoose, { Schema, Model } from 'mongoose'
import bcryptjs from 'bcryptjs'
import { IUser } from '@/types/saas'

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>
}

type UserModel = Model<IUser, {}, IUserMethods>

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    select: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'business_owner', 'staff', 'customer'],
    default: 'customer',
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending', 'deleted'],
    default: 'active',
  },
  emailVerified: Date,
  image: String,
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0,
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    registrationSource: {
      type: String,
      enum: ['signup', 'admin', 'import', 'api'],
      default: 'signup',
    },
  },
}, {
  timestamps: true,
})

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  if (this.password) {
    const salt = await bcryptjs.genSalt(10)
    this.password = await bcryptjs.hash(this.password, salt)
  }
  next()
})

userSchema.methods.comparePassword = async function(candidatePassword: string) {
  if (!this.password) return false
  return bcryptjs.compare(candidatePassword, this.password)
}

const User = mongoose.models.User || mongoose.model<IUser, UserModel>('User', userSchema)

export default User