import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import MosquitoMeasurement from '@/models/MosquitoMeasurement'
import Measurement from '@/models/Measurement'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { ids } = await request.json()
    
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'Invalid request: ids array required' },
        { status: 400 }
      )
    }
    
    // Delete from both collections
    const [measurementResults, mosquitoResults] = await Promise.all([
      Measurement.deleteMany({ _id: { $in: ids } }),
      MosquitoMeasurement.deleteMany({ _id: { $in: ids } })
    ])
    
    const totalDeleted = measurementResults.deletedCount + mosquitoResults.deletedCount
    
    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Successfully deleted ${totalDeleted} polygon sets`
    })
    
  } catch (error) {
    console.error('Error bulk deleting polygons:', error)
    return NextResponse.json(
      { error: 'Failed to delete polygons' },
      { status: 500 }
    )
  }
}