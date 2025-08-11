import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import MosquitoMeasurement from '@/models/MosquitoMeasurement'
import Measurement from '@/models/Measurement'

// GET single polygon
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    
    // More flexible authorization - allow authenticated users
    if (!session?.user) {
      console.error(`GET /api/admin/polygons/${params.id} - No session`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log(`GET /api/admin/polygons/${params.id} - Fetching polygon`)
    
    // Try to find in MosquitoMeasurement first
    let polygon:any = await MosquitoMeasurement.findById(params.id)
      .populate('businessId', 'name')
      .lean()
    
    if (polygon) {
      // Handle businessId whether it's populated or not
      const businessIdString = typeof polygon?.businessId === 'object' 
        ? polygon.businessId._id.toString()
        : polygon.businessId
      
      const businessName = typeof polygon.businessId === 'object'
        ? (polygon.businessId as any)?.name
        : 'Unknown Business'
      
      // Transform mosquito measurement to standard format
      return NextResponse.json({
        id: polygon._id.toString(),
        businessId: businessIdString,
        businessName: businessName,
        propertyAddress: polygon.address,
        geometries: polygon.geometries || [],
        exclusionZones: polygon.exclusionZones || [],
        status: 'active', // MosquitoMeasurement doesn't have status field
        createdAt: polygon.createdAt,
        updatedAt: polygon.updatedAt,
        type: 'mosquito'
      })
    }
    
    // If not found, try Measurement collection
    polygon = await Measurement.findById(params.id)
      .populate('businessId', 'name')
      .lean()
    
    if (polygon) {
      // Handle businessId whether it's populated or not
      const businessIdString = typeof polygon.businessId === 'object' 
        ? polygon.businessId._id.toString()
        : polygon.businessId
      
      const businessName = typeof polygon.businessId === 'object'
        ? (polygon.businessId as any)?.name
        : 'Unknown Business'
      
      // Transform standard measurement to format
      return NextResponse.json({
        id: polygon._id.toString(),
        businessId: businessIdString,
        businessName: businessName,
        propertyAddress: polygon.address,
        geometries: polygon.polygons ? polygon.polygons.map((poly: any, idx: number) => ({
          id: `poly-${idx}`,
          name: `Polygon ${idx + 1}`,
          type: 'custom_path',
          coordinates: poly.coordinates || [],
          linearFeet: calculateLinearFeet(poly.coordinates || []),
          color: '#22c55e',
          visible: true,
          locked: false
        })) : [],
        exclusionZones: [],
        status: 'active',
        createdAt: polygon.createdAt,
        updatedAt: polygon.updatedAt || polygon.createdAt,
        type: 'standard'
      })
    }
    
    console.error(`GET /api/admin/polygons/${params.id} - Polygon not found in either collection`)
    return NextResponse.json({ error: 'Polygon not found' }, { status: 404 })
    
  } catch (error: any) {
    console.error(`GET /api/admin/polygons/${params.id} - Error:`, error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      id: params.id,
      stack: error.stack
    })
    
    // Check if it's a CastError (invalid ObjectId)
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return NextResponse.json(
        { error: 'Invalid polygon ID format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch polygon' },
      { status: 500 }
    )
  }
}

// PUT update polygon
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    
    // More flexible authorization
    if (!session?.user) {
      console.error(`PUT /api/admin/polygons/${params.id} - No session`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log(`PUT /api/admin/polygons/${params.id} - Updating polygon`)
    
    const body = await request.json()
    
    // Try to update in MosquitoMeasurement first
    let polygon = await MosquitoMeasurement.findById(params.id)
    
    if (polygon) {
      // Update mosquito measurement
      polygon.address = body.propertyAddress
      polygon.geometries = body.geometries
      polygon.exclusionZones = body.exclusionZones || []
      polygon.status = body.status
      polygon.updatedAt = new Date()
      
      await polygon.save()
      
      return NextResponse.json({
        success: true,
        message: 'Polygon updated successfully',
        polygon
      })
    }
    
    // If not found, try Measurement collection
    polygon = await Measurement.findById(params.id)
    
    if (polygon) {
      // Update standard measurement
      polygon.address = body.propertyAddress
      polygon.polygons = body.geometries.map((geo: any) => ({
        coordinates: geo.coordinates,
        area: calculateArea(geo.coordinates),
        perimeter: geo.linearFeet
      }))
      polygon.totalArea = body.geometries.reduce((sum: number, geo: any) => 
        sum + calculateArea(geo.coordinates), 0
      )
      polygon.perimeter = body.geometries.reduce((sum: number, geo: any) => 
        sum + geo.linearFeet, 0
      )
      polygon.updatedAt = new Date()
      
      await polygon.save()
      
      return NextResponse.json({
        success: true,
        message: 'Polygon updated successfully',
        polygon
      })
    }
    
    return NextResponse.json({ error: 'Polygon not found' }, { status: 404 })
    
  } catch (error) {
    console.error('Error updating polygon:', error)
    return NextResponse.json(
      { error: 'Failed to update polygon' },
      { status: 500 }
    )
  }
}

// DELETE polygon
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Try to delete from both collections
    const [mosquitoResult, measurementResult] = await Promise.all([
      MosquitoMeasurement.findByIdAndDelete(params.id),
      Measurement.findByIdAndDelete(params.id)
    ])
    
    if (!mosquitoResult && !measurementResult) {
      return NextResponse.json({ error: 'Polygon not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Polygon deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting polygon:', error)
    return NextResponse.json(
      { error: 'Failed to delete polygon' },
      { status: 500 }
    )
  }
}

// Helper function to calculate linear feet
function calculateLinearFeet(coordinates: Array<{lat: number, lng: number}>): number {
  if (!coordinates || coordinates.length < 2) return 0
  
  let total = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i]
    const p2 = coordinates[i + 1]
    total += getDistance(p1.lat, p1.lng, p2.lat, p2.lng)
  }
  
  // Close the polygon
  if (coordinates.length > 2) {
    const first = coordinates[0]
    const last = coordinates[coordinates.length - 1]
    if (first.lat !== last.lat || first.lng !== last.lng) {
      total += getDistance(first.lat, first.lng, last.lat, last.lng)
    }
  }
  
  return total * 3.28084 // Convert meters to feet
}

// Helper function to calculate area
function calculateArea(coordinates: Array<{lat: number, lng: number}>): number {
  if (!coordinates || coordinates.length < 3) return 0
  
  // Shoelace formula for polygon area
  let area = 0
  const n = coordinates.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += coordinates[i].lat * coordinates[j].lng
    area -= coordinates[j].lat * coordinates[i].lng
  }
  
  return Math.abs(area) / 2 * 111319.9 * 111319.9 // Convert to square meters
}

// Helper function to calculate distance
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}