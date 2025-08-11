import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import MosquitoMeasurement from '@/models/MosquitoMeasurement'
import Measurement from '@/models/Measurement'
import Business from '@/models/Business'

interface PolygonStats {
  totalPolygons: number
  totalGeometries: number
  totalBusinesses: number
  totalLinearFeet: number
  recentActivity: number
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Build query
    const query: any = {}
    if (businessId) query.businessId = businessId
    if (status) query.status = status
    
    // Get polygon data from both Measurements and MosquitoMeasurements
    const [measurements, mosquitoMeasurements, businesses] = await Promise.all([
      Measurement.find(query)
        .populate('businessId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      
      MosquitoMeasurement.find(query)
        .populate('businessId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
        
      Business.find({}).select('_id name').lean()
    ])
    
    // Transform data to unified format
    const polygonData = [
      ...measurements.map((m:any) => ({
        id: m._id.toString(),
        businessId: typeof m.businessId === 'object' ? m.businessId._id.toString() : m.businessId,
        businessName: typeof m.businessId === 'object' ? (m.businessId as any).name : 'Unknown',
        propertyAddress: m.address,
        type: 'standard',
        geometries: m.polygons ? m.polygons.map((poly: any, idx: number) => ({
          id: `poly-${idx}`,
          name: `Polygon ${idx + 1}`,
          type: 'custom_path',
          coordinates: poly.coordinates || [],
          linearFeet: calculateLinearFeet(poly.coordinates || []),
          color: getDefaultColor(idx),
          visible: true,
          locked: false,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt
        })) : [],
        exclusionZones: [],
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        createdBy: m.customerId?.toString() || 'system',
        status: 'active' as const
      })),
      ...mosquitoMeasurements.map((m:any) => ({
        id: m._id.toString(),
        businessId: typeof m.businessId === 'object' ? m.businessId._id.toString() : m.businessId,
        businessName: typeof m.businessId === 'object' ? (m.businessId as any).name : 'Unknown',
        propertyAddress: m.address,
        type: 'mosquito',
        geometries: m.geometries ? m.geometries.map((geo: any) => ({
          id: geo.id || geo._id?.toString(),
          name: geo.name || `${geo.type} Measurement`,
          type: geo.type,
          coordinates: geo.coordinates || [],
          linearFeet: geo.linearFeet || 0,
          color: geo.color || getDefaultColor(0),
          visible: geo.visible !== false,
          locked: geo.locked || false,
          createdAt: geo.createdAt || m.createdAt,
          updatedAt: geo.updatedAt || m.updatedAt
        })) : [],
        exclusionZones: m.exclusionZones || [],
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        createdBy: m.createdBy || 'system',
        status: 'active'
      }))
    ]
    
    // Sort combined data by createdAt (newest first)
    polygonData.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Descending order (newest first)
    })
    
    // Calculate stats
    const stats: PolygonStats = {
      totalPolygons: polygonData.length,
      totalGeometries: polygonData.reduce((sum, p) => sum + p.geometries.length, 0),
      totalBusinesses: businesses.length,
      totalLinearFeet: Math.round(polygonData.reduce((sum:any, p:any) => 
        sum + p.geometries.reduce((gSum:any, g:any) => gSum + g.linearFeet, 0), 0
      )),
      recentActivity: polygonData.filter((p:any) => 
        new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    }
    
    return NextResponse.json({ 
      polygons: polygonData,
      stats,
      pagination: {
        page,
        limit,
        total: polygonData.length
      }
    })
    
  } catch (error) {
    console.error('Error fetching polygon data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch polygon data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    
    // More flexible authorization - allow both admin and authenticated users
    if (!session?.user) {
      console.error('POST /api/admin/polygons - No session found')
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 })
    }
    
    const body = await request.json()
    console.log('POST /api/admin/polygons - Request body:', JSON.stringify(body, null, 2))
    
    const { 
      businessId, 
      propertyAddress, 
      geometries, 
      exclusionZones, 
      type = 'mosquito' // Default to mosquito type since that's what we're using
    } = body
    
    // Validate required fields
    if (!propertyAddress || !geometries || geometries.length === 0) {
      console.error('POST /api/admin/polygons - Missing required fields:', {
        hasPropertyAddress: !!propertyAddress,
        hasGeometries: !!geometries,
        geometriesLength: geometries?.length
      })
      return NextResponse.json(
        { error: 'Missing required fields: propertyAddress and geometries are required' },
        { status: 400 }
      )
    }
    
    // Use provided businessId or fallback to demo
    const finalBusinessId = businessId || 'demo-business'
    console.log('POST /api/admin/polygons - Using businessId:', finalBusinessId)
    
    let savedPolygon
    
    try {
      if (type === 'mosquito') {
        // Create mosquito measurement
        console.log('Creating mosquito measurement with geometries:', geometries.length)
        
        // Calculate total linear feet
        let totalLinearFeet = 0
        
        // Ensure all geometries have required fields including linearMeters
        const processedGeometries = geometries.map((geo: any, index: number) => {
          const linearFeet = geo.linearFeet || calculateLinearFeet(geo.coordinates || [])
          const linearMeters = linearFeet / 3.28084 // Convert feet to meters
          totalLinearFeet += linearFeet
          
          return {
            id: geo.id || `geo-${Date.now()}-${index}`,
            name: geo.name || `Geometry ${index + 1}`,
            type: geo.type || 'custom_path',
            coordinates: geo.coordinates || [],
            linearFeet: linearFeet,
            linearMeters: linearMeters, // Required field
            locked: geo.locked || false,
            visible: geo.visible !== false,
            color: geo.color || getDefaultColor(index),
            simplified: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        
        // Generate a unique property ID if not provided
        const propertyId = `prop-${finalBusinessId}-${Date.now()}`
        
        // Get user info for createdByName
        const userEmail = (session.user as any).email || 'admin@lawntool.com'
        const userName = (session.user as any).name || userEmail.split('@')[0]
        const userId = (session.user as any).id || userEmail
        
        const mosquitoMeasurement = new MosquitoMeasurement({
          // Required fields
          propertyId: propertyId,
          businessId: finalBusinessId,
          address: propertyAddress,
          
          // Geometries with all required fields
          geometries: processedGeometries,
          exclusionZones: exclusionZones || [],
          
          // Required measurements object
          measurements: {
            totalLinearFeet: totalLinearFeet,
            lotPerimeter: processedGeometries.find((g:any) => g.type === 'lot_perimeter') ? {
              linearFeet: processedGeometries.find((g:any) => g.type === 'lot_perimeter')?.linearFeet || 0,
              linearMeters: processedGeometries.find((g:any) => g.type === 'lot_perimeter')?.linearMeters || 0,
              confidence: 0.95
            } : undefined,
            structurePerimeter: processedGeometries.find((g:any) => g.type === 'structure_perimeter') ? {
              linearFeet: processedGeometries.find((g:any) => g.type === 'structure_perimeter')?.linearFeet || 0,
              linearMeters: processedGeometries.find((g:any) => g.type === 'structure_perimeter')?.linearMeters || 0,
              buildingType: 'residential'
            } : undefined,
            customPaths: processedGeometries
              .filter((g:any) => g.type === 'custom_path')
              .map((g:any) => ({
                name: g.name,
                linearFeet: g.linearFeet,
                pathType: 'mixed' as const
              }))
          },
          
          // Required imagery source
          imagerySource: {
            provider: 'google_earth',
            date: new Date(), // Current date for imagery
            resolution: 0.3, // Default resolution in meters
            historical: false
          },
          
          // Default obstacles
          obstacles: {
            gates: 0,
            narrowAccess: false,
            steepSlopes: false,
            denseVegetation: false
          },
          
          // Required creator info
          createdBy: userId,
          createdByName: userName,
          
          // Version info
          version: 1,
          versions: [],
          
          // Timestamps
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        console.log('Saving mosquito measurement...')
        savedPolygon = await mosquitoMeasurement.save()
        console.log('Mosquito measurement saved successfully:', savedPolygon._id)
        
      } else {
        // Create standard measurement
        console.log('Creating standard measurement with geometries:', geometries.length)
        
        if (!geometries[0]?.coordinates || geometries[0].coordinates.length === 0) {
          throw new Error('First geometry must have coordinates for standard measurement')
        }
        
        const measurement = new Measurement({
          businessId: finalBusinessId,
          address: propertyAddress,
          coordinates: geometries[0].coordinates,
          polygons: geometries.map((geo: any) => ({
            coordinates: geo.coordinates || [],
            area: calculateArea(geo.coordinates || []),
            perimeter: geo.linearFeet || calculateLinearFeet(geo.coordinates || [])
          })),
          totalArea: geometries.reduce((sum: number, geo: any) => 
            sum + calculateArea(geo.coordinates || []), 0
          ),
          perimeter: geometries.reduce((sum: number, geo: any) => 
            sum + (geo.linearFeet || calculateLinearFeet(geo.coordinates || [])), 0
          ),
          customerId: (session.user as any).id || (session.user as any).email || 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        console.log('Saving standard measurement...')
        savedPolygon = await measurement.save()
        console.log('Standard measurement saved successfully:', savedPolygon._id)
      }
      
    } catch (saveError: any) {
      console.error('Error during save operation:', saveError)
      console.error('Save error details:', {
        name: saveError.name,
        message: saveError.message,
        stack: saveError.stack
      })
      
      // Check for validation errors
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.keys(saveError.errors || {}).map(key => ({
          field: key,
          message: saveError.errors[key].message
        }))
        console.error('Validation errors:', validationErrors)
        
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: validationErrors
          },
          { status: 400 }
        )
      }
      
      throw saveError // Re-throw to be caught by outer catch
    }
    
    // Return success response
    const response = {
      success: true,
      polygon: {
        id: savedPolygon._id.toString(),
        businessId: savedPolygon.businessId,
        address: savedPolygon.address,
        geometries: savedPolygon.geometries || [],
        status: savedPolygon.status,
        createdAt: savedPolygon.createdAt,
        updatedAt: savedPolygon.updatedAt
      },
      message: 'Polygon created successfully'
    }
    
    console.log('POST /api/admin/polygons - Success response:', response)
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('POST /api/admin/polygons - Unhandled error:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to create polygon',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// Helper functions
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
    total += getDistance(first.lat, first.lng, last.lat, last.lng)
  }
  
  return total * 3.28084 // Convert meters to feet
}

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

function getDefaultColor(index: number): string {
  const colors = [
    '#22c55e', // green
    '#ef4444', // red
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#10b981'  // emerald
  ]
  return colors[index % colors.length]
}