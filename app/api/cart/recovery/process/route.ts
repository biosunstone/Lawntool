import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { processAbandonedCarts } from '@/lib/cart/abandonmentCronJob'

/**
 * Manual endpoint to trigger abandoned cart processing
 * Restricted to admin users only
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }
    
    // Get parameters from request
    const body = await request.json()
    const minutesAgo = body.minutesAgo || 15
    
    console.log(`Manual trigger: Processing carts abandoned ${minutesAgo}+ minutes ago`)
    
    // Run the cron job
    const result = await processAbandonedCarts(minutesAgo)
    
    return NextResponse.json({
      success: true,
      message: 'Abandoned cart processing completed',
      result: {
        processed: result.processed,
        emailsSent: result.emailsSent,
        smsSent: result.smsSent,
        errorCount: result.errors.length,
        errors: result.errors
      }
    })
    
  } catch (error) {
    console.error('Manual cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process abandoned carts',
        details: (error as any).message 
      },
      { status: 500 }
    )
  }
}

/**
 * Get abandoned cart statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Import models
    const AbandonedCart = (await import('@/models/AbandonedCart')).default
    const CartRecoveryLog = (await import('@/models/CartRecoveryLog')).default
    const connectDB = (await import('@/lib/saas/db')).default
    
    await connectDB()
    
    // Get statistics based on user role
    let query: any = {}
    
    if ((session.user as any)?.role !== 'admin') {
      // For business owners, only show their business stats
      query.business_id = (session.user as any).businessId
    }
    
    // Get abandoned cart stats
    const totalAbandoned = await AbandonedCart.countDocuments(query)
    const totalRecovered = await AbandonedCart.countDocuments({
      ...query,
      recovery_completed: true
    })
    const pendingRecovery = await AbandonedCart.countDocuments({
      ...query,
      reminder_sent: false,
      recovery_completed: false
    })
    
    // Get recovery campaign stats
    // TODO: Fix TypeScript type for static method
    const recoveryStats = await (CartRecoveryLog as any).getRecoveryStats(
      (session.user as any)?.businessId || null,
      30 // Last 30 days
    )
    
    // Calculate recovery rate
    const recoveryRate = totalAbandoned > 0 
      ? ((totalRecovered / totalAbandoned) * 100).toFixed(2)
      : 0
    
    return NextResponse.json({
      success: true,
      stats: {
        totalAbandoned,
        totalRecovered,
        pendingRecovery,
        recoveryRate: `${recoveryRate}%`,
        campaigns: recoveryStats
      }
    })
    
  } catch (error) {
    console.error('Stats retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    )
  }
}