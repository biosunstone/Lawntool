import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import GeopricingZone from '@/models/GeopricingZone'
import { getDriveTimePolygon } from '@/lib/geopricing/driveTime'

// GET /api/geopricing/zones - Get all zones for a business
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }
    
    await connectDB()
    
    const zones = await GeopricingZone.find({ businessId })
      .sort({ priority: -1, createdAt: -1 })
      .populate('createdBy', 'name email')
    
    return NextResponse.json({ zones })
    
  } catch (error) {
    console.error('Error fetching geopricing zones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch zones' },
      { status: 500 }
    )
  }
}

// POST /api/geopricing/zones - Create a new zone
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = (session.user as any).id
    const businessId = (session.user as any).businessId
    const userRole = (session.user as any).role
    
    // Only business owners and admins can create zones
    if (!['admin', 'business_owner'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.type || !body.pricing) {
      return NextResponse.json(
        { error: 'Name, type, and pricing configuration are required' },
        { status: 400 }
      )
    }
    
    await connectDB()
    
    // Prepare zone data
    const zoneData: any = {
      businessId,
      name: body.name,
      description: body.description,
      type: body.type,
      active: body.active !== false,
      pricing: body.pricing,
      priority: body.priority || 0,
      createdBy: userId,
      metadata: body.metadata || {}
    }
    
    // Add type-specific fields
    switch (body.type) {
      case 'radius':
        if (!body.radius?.center || !body.radius?.distance) {
          return NextResponse.json(
            { error: 'Radius zones require center and distance' },
            { status: 400 }
          )
        }
        zoneData.radius = body.radius
        
        // Create point geometry for spatial queries
        zoneData.geometry = {
          type: 'Point',
          coordinates: [body.radius.center.lng, body.radius.center.lat]
        }
        break
        
      case 'polygon':
        if (!body.geometry?.coordinates || !Array.isArray(body.geometry.coordinates)) {
          return NextResponse.json(
            { error: 'Polygon zones require geometry coordinates' },
            { status: 400 }
          )
        }
        zoneData.geometry = body.geometry
        break
        
      case 'zipcode':
        if (!body.zipcodes || !Array.isArray(body.zipcodes) || body.zipcodes.length === 0) {
          return NextResponse.json(
            { error: 'Zipcode zones require at least one zipcode' },
            { status: 400 }
          )
        }
        zoneData.zipcodes = body.zipcodes
        break
        
      case 'city':
        if (!body.cities || !Array.isArray(body.cities) || body.cities.length === 0) {
          return NextResponse.json(
            { error: 'City zones require at least one city' },
            { status: 400 }
          )
        }
        zoneData.cities = body.cities
        break
        
      case 'drivetime':
        if (!body.driveTime?.origin || !body.driveTime?.maxMinutes) {
          return NextResponse.json(
            { error: 'Drive time zones require origin and maxMinutes' },
            { status: 400 }
          )
        }
        zoneData.driveTime = body.driveTime
        
        // Generate approximate polygon for visualization
        if (body.generatePolygon) {
          const polygonPoints = await getDriveTimePolygon(
            body.driveTime.origin,
            body.driveTime.maxMinutes
          )
          
          if (polygonPoints.length > 0) {
            zoneData.geometry = {
              type: 'Polygon',
              coordinates: [polygonPoints.map(p => [p.lng, p.lat])]
            }
          }
        }
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid zone type' },
          { status: 400 }
        )
    }
    
    // Add route density settings if provided
    if (body.routeDensity) {
      zoneData.routeDensity = body.routeDensity
    }
    
    // Create the zone
    const zone = await GeopricingZone.create(zoneData)
    
    // Populate creator info
    await zone.populate('createdBy', 'name email')
    
    return NextResponse.json({
      message: 'Geopricing zone created successfully',
      zone
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating geopricing zone:', error)
    return NextResponse.json(
      { error: 'Failed to create zone' },
      { status: 500 }
    )
  }
}

// PUT /api/geopricing/zones - Update a zone
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const businessId = (session.user as any).businessId
    const userRole = (session.user as any).role
    
    // Only business owners and admins can update zones
    if (!['admin', 'business_owner'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { zoneId, ...updates } = body
    
    if (!zoneId) {
      return NextResponse.json({ error: 'Zone ID required' }, { status: 400 })
    }
    
    await connectDB()
    
    // Find and update the zone
    const zone = await GeopricingZone.findOneAndUpdate(
      { _id: zoneId, businessId },
      { $set: updates },
      { new: true }
    ).populate('createdBy', 'name email')
    
    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      message: 'Zone updated successfully',
      zone
    })
    
  } catch (error) {
    console.error('Error updating geopricing zone:', error)
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    )
  }
}

// DELETE /api/geopricing/zones - Delete a zone
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const businessId = (session.user as any).businessId
    const userRole = (session.user as any).role
    
    // Only business owners and admins can delete zones
    if (!['admin', 'business_owner'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const url = new URL(request.url)
    const zoneId = url.searchParams.get('id')
    
    if (!zoneId) {
      return NextResponse.json({ error: 'Zone ID required' }, { status: 400 })
    }
    
    await connectDB()
    
    const result = await GeopricingZone.deleteOne({
      _id: zoneId,
      businessId
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      message: 'Zone deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting geopricing zone:', error)
    return NextResponse.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    )
  }
}