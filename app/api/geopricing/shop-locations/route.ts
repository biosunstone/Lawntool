import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import mongoose from 'mongoose'

// Shop Location Schema
const ShopLocationSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Business',
    required: true 
  },
  city: { 
    type: String, 
    required: true,
    index: true 
  },
  province: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  lat: { 
    type: Number, 
    required: true 
  },
  lng: { 
    type: Number, 
    required: true 
  },
  baseRatePer1000SqFt: { 
    type: Number, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  serviceRadius: {
    type: Number, // in kilometers
    default: 50
  },
  businessHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
})

const ShopLocation = mongoose.models.ShopLocation || mongoose.model('ShopLocation', ShopLocationSchema)

// GET /api/geopricing/shop-locations - Get all shop locations or by city
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const businessId = searchParams.get('businessId')
    
    let query: any = { isActive: true }
    
    if (city) {
      query.city = { $regex: new RegExp(city, 'i') }
    }
    
    if (businessId) {
      query.businessId = businessId
    }
    
    const locations = await ShopLocation.find(query)
    
    return NextResponse.json({ 
      success: true,
      locations 
    })
    
  } catch (error) {
    console.error('Error fetching shop locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shop locations' },
      { status: 500 }
    )
  }
}

// POST /api/geopricing/shop-locations - Create a new shop location
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const {
      businessId,
      city,
      province,
      address,
      lat,
      lng,
      baseRatePer1000SqFt,
      serviceRadius,
      businessHours
    } = body
    
    // Validate required fields
    if (!businessId || !city || !province || !address || !lat || !lng || !baseRatePer1000SqFt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Check if location already exists for this city and business
    const existing = await ShopLocation.findOne({ 
      businessId,
      city: { $regex: new RegExp(city, 'i') }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Shop location already exists for this city' },
        { status: 409 }
      )
    }
    
    // Create new shop location
    const shopLocation = await ShopLocation.create({
      businessId,
      city,
      province,
      address,
      lat,
      lng,
      baseRatePer1000SqFt,
      serviceRadius: serviceRadius || 50,
      businessHours: businessHours || {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '16:00' },
        sunday: { open: 'closed', close: 'closed' }
      }
    })
    
    return NextResponse.json({
      success: true,
      shopLocation
    })
    
  } catch (error) {
    console.error('Error creating shop location:', error)
    return NextResponse.json(
      { error: 'Failed to create shop location' },
      { status: 500 }
    )
  }
}

// PUT /api/geopricing/shop-locations - Update shop location
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }
    
    updates.updatedAt = new Date()
    
    const shopLocation = await ShopLocation.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    )
    
    if (!shopLocation) {
      return NextResponse.json(
        { error: 'Shop location not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      shopLocation
    })
    
  } catch (error) {
    console.error('Error updating shop location:', error)
    return NextResponse.json(
      { error: 'Failed to update shop location' },
      { status: 500 }
    )
  }
}

// DELETE /api/geopricing/shop-locations - Deactivate shop location
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }
    
    // Soft delete by setting isActive to false
    const shopLocation = await ShopLocation.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    )
    
    if (!shopLocation) {
      return NextResponse.json(
        { error: 'Shop location not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Shop location deactivated',
      shopLocation
    })
    
  } catch (error) {
    console.error('Error deactivating shop location:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate shop location' },
      { status: 500 }
    )
  }
}