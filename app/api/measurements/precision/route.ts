import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import Measurement from '@/models/Measurement'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import PrecisionMeasurementService from '@/lib/measurement/precisionMeasurementService'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    const {
      address,
      coordinates,
      useHistoricalImagery = false,
      historicalDate,
      manualPolygons,
      businessId
    } = body
    
    if (!address || !coordinates) {
      return NextResponse.json(
        { error: 'Address and coordinates are required' },
        { status: 400 }
      )
    }
    
    // Initialize precision measurement service
    const measurementService = PrecisionMeasurementService.getInstance()
    
    let measurement
    
    if (manualPolygons) {
      // Manual measurement mode
      measurement = await measurementService.measureManual(
        manualPolygons.lawn,
        manualPolygons.excluded || [],
        coordinates
      )
    } else {
      // Automatic measurement mode
      measurement = await measurementService.measureProperty(
        address,
        coordinates
      )
      
      // If historical imagery requested, load and re-measure
      if (useHistoricalImagery) {
        const historicalImagery = await measurementService.loadHistoricalImagery(
          coordinates,
          historicalDate ? new Date(historicalDate) : undefined
        )
        
        // Re-measure with historical imagery
        // In production, this would use the historical imagery for detection
        measurement.imagery = historicalImagery
      }
    }
    
    // Save measurement to database if user is authenticated
    if (session?.user) {
      const savedMeasurement = await Measurement.create({
        businessId: businessId || (session.user as any).businessId,
        customerId: (session.user as any).id,
        address,
        coordinates,
        totalArea: measurement.totalLawnArea,
        perimeter: measurement.perimeter,
        lawn: {
          total: measurement.totalLawnArea,
          frontYard: measurement.sections.frontYard.area,
          backYard: measurement.sections.backYard.area,
          sideYard: measurement.sections.sideYards.reduce((sum, s) => sum + s.area, 0)
        },
        excluded: measurement.excluded,
        terrain: measurement.terrain,
        accuracy: measurement.accuracy,
        imagery: measurement.imagery,
        polygons: measurement.polygons,
        method: measurement.method,
        mapImageUrl: measurement.mapImageUrl,
        createdAt: new Date()
      })
      
      // Add the saved ID to the measurement response
      ;(measurement as any).id = savedMeasurement._id.toString()
    }
    
    return NextResponse.json({
      success: true,
      measurement,
      message: 'Precision measurement completed successfully'
    })
  } catch (error) {
    console.error('Precision measurement error:', error)
    return NextResponse.json(
      { error: 'Failed to complete precision measurement' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const measurementId = searchParams.get('id')
    
    if (measurementId) {
      // Get specific measurement
      const measurement = await Measurement.findById(measurementId)
      
      if (!measurement) {
        return NextResponse.json(
          { error: 'Measurement not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ measurement })
    }
    
    // Get all measurements for user's business
    const measurements = await Measurement.find({
      businessId: (session.user as any).businessId
    })
      .sort({ createdAt: -1 })
      .limit(50)
    
    return NextResponse.json({ measurements })
  } catch (error) {
    console.error('Get measurements error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve measurements' },
      { status: 500 }
    )
  }
}