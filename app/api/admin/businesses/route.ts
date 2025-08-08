import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Business from '@/models/Business'
export const dynamic = 'force-dynamic'

// GET /api/admin/businesses - List all businesses (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const businesses = await Business.find({})
      .select('name description createdAt')
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      businesses
    })
  } catch (error: any) {
    console.error('Error fetching businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    )
  }
}