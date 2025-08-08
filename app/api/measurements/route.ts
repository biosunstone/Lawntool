import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Measurement from '@/models/Measurement'
import Subscription from '@/models/Subscription'

// GET - Fetch measurement history
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

    const measurements = await Measurement.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-__v')

    return NextResponse.json(measurements)
  } catch (error) {
    console.error('Fetch measurements error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    )
  }
}

// POST - Create new measurement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const businessId = (session.user as any).businessId
    
    console.log('User ID:', userId, 'Business ID:', businessId)
    
    if (!businessId) {
      console.error('No business ID in session')
      return NextResponse.json({ error: 'No business associated with your account' }, { status: 400 })
    }

    await connectDB()

    // Check subscription quota
    const subscription = await Subscription.findOne({ businessId })
    if (!subscription) {
      console.error('No subscription found for business:', businessId)
      return NextResponse.json({ error: 'No subscription found for your business' }, { status: 403 })
    }

    if (subscription.measurementQuota !== -1 && 
        subscription.measurementsUsed >= subscription.measurementQuota) {
      return NextResponse.json(
        { error: 'Measurement quota exceeded. Please upgrade your plan.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('Received measurement data:', JSON.stringify(body, null, 2))

    // Restructure the data to match our schema
    const measurementData = {
      businessId,
      userId,
      address: body.address,
      coordinates: body.coordinates || { lat: 0, lng: 0 },
      measurements: body.measurements || {
        totalArea: body.totalArea || 0,
        perimeter: body.perimeter || 0,
        lawn: {
          frontYard: body.lawn?.frontYard || 0,
          backYard: body.lawn?.backYard || 0,
          sideYard: body.lawn?.sideYard || 0,
          total: body.lawn?.total || 0,
          perimeter: body.lawn?.perimeter || 0,
        },
        driveway: body.driveway || 0,
        sidewalk: body.sidewalk || 0,
        building: body.building || 0,
        other: body.other || 0,
      },
      status: 'completed',
      selectionMethod: body.selectionMethod || 'ai',
      manualSelections: body.manualSelections || undefined,
      metadata: {
        source: 'web',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        userAgent: request.headers.get('user-agent') || '',
      }
    }

    console.log('Creating measurement with data:', JSON.stringify(measurementData, null, 2))

    // Create measurement
    const measurement = await Measurement.create(measurementData)
    console.log('Measurement created:', measurement._id)

    // Update subscription usage
    subscription.measurementsUsed += 1
    await subscription.save()

    return NextResponse.json({
      message: 'Measurement saved successfully',
      measurement,
      quotaRemaining: subscription.measurementQuota === -1 
        ? 'unlimited' 
        : subscription.measurementQuota - subscription.measurementsUsed
    })
  } catch (error: any) {
    console.error('Create measurement error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to save measurement' },
      { status: 500 }
    )
  }
}