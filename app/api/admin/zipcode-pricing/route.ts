import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import mongoose from 'mongoose'

// Define the ZipCode Pricing schema
const ZipCodePricingSchema = new mongoose.Schema({
  zipCode: { type: String, index: true },
  postalCode: { type: String, index: true },
  country: { type: String, enum: ['US', 'CA'], required: true },
  region: String,
  city: String,
  state: String,
  basePrice: { type: Number, default: 50 },
  pricePerSqFt: { type: Number, default: 0.05 },
  surchargePercentage: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  minimumPrice: { type: Number, default: 30 },
  maximumPrice: { type: Number, default: 500 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
})

// Create compound index for efficient queries
ZipCodePricingSchema.index({ country: 1, zipCode: 1 })
ZipCodePricingSchema.index({ country: 1, postalCode: 1 })

const ZipCodePricing = mongoose.models.ZipCodePricing || mongoose.model('ZipCodePricing', ZipCodePricingSchema)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const country = searchParams.get('country')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    
    // Build query
    const query: any = {}
    if (country && country !== 'ALL') {
      query.country = country
    }
    if (isActive !== null) {
      query.isActive = isActive === 'true'
    }
    if (search) {
      query.$or = [
        { zipCode: { $regex: search, $options: 'i' } },
        { postalCode: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } }
      ]
    }
    
    const rules = await ZipCodePricing.find(query).sort({ createdAt: -1 }).limit(1000)
    
    return NextResponse.json({
      success: true,
      rules
    })
    
  } catch (error: any) {
    console.error('Error fetching ZIP code pricing rules:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch rules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const body = await request.json()
    
    // Validate required fields based on country
    if (body.country === 'US' && !body.zipCode) {
      return NextResponse.json(
        { success: false, error: 'ZIP code is required for US' },
        { status: 400 }
      )
    }
    if (body.country === 'CA' && !body.postalCode) {
      return NextResponse.json(
        { success: false, error: 'Postal code is required for Canada' },
        { status: 400 }
      )
    }
    
    // Check for duplicate
    const existingQuery: any = { country: body.country }
    if (body.country === 'US') {
      existingQuery.zipCode = body.zipCode
    } else {
      existingQuery.postalCode = body.postalCode
    }
    
    const existing = await ZipCodePricing.findOne(existingQuery)
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A rule already exists for this code' },
        { status: 400 }
      )
    }
    
    // Create new rule
    const rule = await ZipCodePricing.create({
      ...body,
      createdBy: new mongoose.Types.ObjectId((session.user as any).id || session.user.email)
    })
    
    return NextResponse.json({
      success: true,
      rule
    })
    
  } catch (error: any) {
    console.error('Error creating ZIP code pricing rule:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create rule' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const body = await request.json()
    const { _id, ...updateData } = body
    
    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }
    
    // Update rule
    const rule = await ZipCodePricing.findByIdAndUpdate(
      _id,
      {
        ...updateData,
        updatedBy: new mongoose.Types.ObjectId((session.user as any).id || session.user.email)
      },
      { new: true }
    )
    
    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      rule
    })
    
  } catch (error: any) {
    console.error('Error updating ZIP code pricing rule:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update rule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }
    
    const result = await ZipCodePricing.findByIdAndDelete(id)
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    })
    
  } catch (error: any) {
    console.error('Error deleting ZIP code pricing rule:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete rule' },
      { status: 500 }
    )
  }
}