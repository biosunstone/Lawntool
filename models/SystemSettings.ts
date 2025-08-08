import mongoose, { Schema, Document } from 'mongoose'

export interface ISystemSettings extends Document {
  defaultTaxRate: number
  maintenanceMode: boolean
  maintenanceMessage: string
  allowNewRegistrations: boolean
  maxUsersPerBusiness: number
  defaultUserQuota: {
    measurementsPerMonth: number
    quotesPerMonth: number
  }
  emailSettings: {
    systemEmailFrom: string
    supportEmail: string
  }
  features: {
    enableWidget: boolean
    enableAPI: boolean
    enableExport: boolean
  }
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const systemSettingsSchema = new Schema<ISystemSettings>({
  defaultTaxRate: {
    type: Number,
    default: 0.08,
    min: 0,
    max: 1,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  maintenanceMessage: {
    type: String,
    default: 'System is under maintenance. Please check back later.',
  },
  allowNewRegistrations: {
    type: Boolean,
    default: true,
  },
  maxUsersPerBusiness: {
    type: Number,
    default: 10,
  },
  defaultUserQuota: {
    measurementsPerMonth: {
      type: Number,
      default: 100,
    },
    quotesPerMonth: {
      type: Number,
      default: 50,
    },
  },
  emailSettings: {
    systemEmailFrom: {
      type: String,
      default: 'noreply@sunstone.com',
    },
    supportEmail: {
      type: String,
      default: 'support@sunstone.com',
    },
  },
  features: {
    enableWidget: {
      type: Boolean,
      default: true,
    },
    enableAPI: {
      type: Boolean,
      default: true,
    },
    enableExport: {
      type: Boolean,
      default: true,
    },
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
})

// Ensure only one settings document exists
systemSettingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({})
  }
  return settings
}

const SystemSettings = mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema)

export default SystemSettings