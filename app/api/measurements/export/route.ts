import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Measurement from '@/models/Measurement'

export const dynamic = 'force-dynamic'

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
      .select('-__v')

    // Create CSV content
    const csvHeaders = [
      'Date',
      'Address',
      'Total Area (sq ft)',
      'Lawn Total (sq ft)',
      'Front Yard (sq ft)',
      'Back Yard (sq ft)',
      'Side Yard (sq ft)',
      'Driveway (sq ft)',
      'Sidewalk (sq ft)',
      'Building (sq ft)',
      'Latitude',
      'Longitude'
    ].join(',')

    const csvRows = measurements.map(m => {
      return [
        new Date(m.createdAt).toLocaleDateString(),
        `"${m.address}"`,
        m.measurements.totalArea,
        m.measurements.lawn.total,
        m.measurements.lawn.frontYard,
        m.measurements.lawn.backYard,
        m.measurements.lawn.sideYard,
        m.measurements.driveway,
        m.measurements.sidewalk,
        m.measurements.building,
        m.coordinates.lat,
        m.coordinates.lng
      ].join(',')
    })

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="measurements-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Export measurements error:', error)
    return NextResponse.json(
      { error: 'Failed to export measurements' },
      { status: 500 }
    )
  }
}