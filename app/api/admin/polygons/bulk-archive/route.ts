import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import MosquitoMeasurement from '@/models/MosquitoMeasurement'

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
    
    // Update status to archived
    const result = await MosquitoMeasurement.updateMany(
      { _id: { $in: ids } },
      { 
        status: 'archived',
        updatedAt: new Date(),
        archivedBy: (session.user as any).id,
        archivedAt: new Date()
      }
    )
    
    return NextResponse.json({
      success: true,
      archivedCount: result.modifiedCount,
      message: `Successfully archived ${result.modifiedCount} polygon sets`
    })
    
  } catch (error) {
    console.error('Error bulk archiving polygons:', error)
    return NextResponse.json(
      { error: 'Failed to archive polygons' },
      { status: 500 }
    )
  }
}