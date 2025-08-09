import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import mongoose from 'mongoose'
export const dynamic = 'force-dynamic'


// Business ZIP Code Settings Schema
const BusinessZipCodeSettingsSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Business',
    required: true,
    index: true 
  },
  enabled: { type: Boolean, default: true },
  defaultBasePrice: { type: Number, default: 50 },
  defaultPricePerSqFt: { type: Number, default: 0.05 },
  allowCustomRules: { type: Boolean, default: false },
  customRules: [{
    zipCode: String,
    postalCode: String,
    country: { type: String, enum: ['US', 'CA'] },
    surchargePercentage: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
})

const BusinessZipCodeSettings = mongoose.models.BusinessZipCodeSettings || 
  mongoose.model('BusinessZipCodeSettings', BusinessZipCodeSettingsSchema)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Get the user's business ID from session
    const businessId = (session.user as any).businessId || (session.user as any).selectedBusinessId
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'No business associated with user' },
        { status: 400 }
      )
    }
    
    // Get or create settings for this business
    let settings = await BusinessZipCodeSettings.findOne({ businessId })
    
    if (!settings) {
      // Create default settings
      settings = await BusinessZipCodeSettings.create({
        businessId: new mongoose.Types.ObjectId(businessId),
        enabled: true,
        defaultBasePrice: 50,
        defaultPricePerSqFt: 0.05,
        allowCustomRules: false,
        customRules: [],
        createdBy: new mongoose.Types.ObjectId((session.user as any).id || session.user.email)
      })
    }
    
    return NextResponse.json({
      success: true,
      settings
    })
    
  } catch (error: any) {
    console.error('Error fetching ZIP code settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const businessId = (session.user as any).businessId || (session.user as any).selectedBusinessId
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'No business associated with user' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    // Validate custom rules
    if (body.customRules && Array.isArray(body.customRules)) {
      for (const rule of body.customRules) {
        if (rule.country === 'US' && !rule.zipCode) {
          return NextResponse.json(
            { success: false, error: 'ZIP code is required for US rules' },
            { status: 400 }
          )
        }
        if (rule.country === 'CA' && !rule.postalCode) {
          return NextResponse.json(
            { success: false, error: 'Postal code is required for Canadian rules' },
            { status: 400 }
          )
        }
      }
    }
    
    // Update settings
    const settings = await BusinessZipCodeSettings.findOneAndUpdate(
      { businessId },
      {
        ...body,
        businessId: new mongoose.Types.ObjectId(businessId),
        updatedBy: new mongoose.Types.ObjectId((session.user as any).id || session.user.email)
      },
      { new: true, upsert: true }
    )
    
    return NextResponse.json({
      success: true,
      settings,
      message: 'Settings updated successfully'
    })
    
  } catch (error: any) {
    console.error('Error updating ZIP code settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}