import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import MosquitoMeasurement from '@/models/MosquitoMeasurement'
import Measurement from '@/models/Measurement'
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get all polygon data
    const [measurements, mosquitoMeasurements] = await Promise.all([
      Measurement.find({})
        .populate('businessId', 'name')
        .populate('customerId', 'name email')
        .lean(),
      
      MosquitoMeasurement.find({})
        .populate('businessId', 'name')
        .lean()
    ])
    
    // Transform to exportable format
    const exportData = {
      exportDate: new Date().toISOString(),
      exportedBy: (session.user as any).email,
      totalRecords: measurements.length + mosquitoMeasurements.length,
      data: {
        standardMeasurements: measurements.map((m:any) => ({
          id: m?._id?.toString(),
          businessName: (m.businessId as any)?.name,
          customerName: (m.customerId as any)?.name,
          customerEmail: (m.customerId as any)?.email,
          address: m.address,
          coordinates: m.coordinates,
          totalArea: m.totalArea,
          perimeter: m.perimeter,
          polygons: m.polygons,
          method: m.method,
          accuracy: m.accuracy,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt
        })),
        
        mosquitoMeasurements: mosquitoMeasurements.map((m:any) => ({
          id: m._id.toString(),
          businessName: (m.businessId as any)?.name,
          address: m.address,
          geometries: m.geometries,
          exclusionZones: m.exclusionZones,
          measurements: m.measurements,
          compliance: m.compliance,
          status: m.status,
          createdBy: m.createdBy,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          version: m.version,
          versionHistory: m.versionHistory
        }))
      }
    }
    
    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="polygon-export-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
    
  } catch (error) {
    console.error('Error exporting polygon data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}