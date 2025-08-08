import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Business from '@/models/Business'
export const dynamic = 'force-dynamic'
// GET - Fetch current business tax rate
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    
    if (!businessId) {
      // Return default tax rate if no business associated
      return NextResponse.json({ taxRate: 0.08 })
    }

    await connectDB()

    const business = await Business.findById(businessId).select('taxRate')
    
    if (!business) {
      // Return default if business not found
      return NextResponse.json({ taxRate: 0.08 })
    }

    return NextResponse.json({ 
      taxRate: business.taxRate || 0.08 
    })
  } catch (error) {
    console.error('Fetch tax rate error:', error)
    // Return default on error
    return NextResponse.json({ taxRate: 0.08 })
  }
}