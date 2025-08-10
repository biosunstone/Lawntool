import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import AbandonedCart from '@/models/AbandonedCart'
import CartRecoveryLog from '@/models/CartRecoveryLog'
export const dynamic = 'force-dynamic';

/**
 * Track recovery link clicks
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const action = searchParams.get('action') // 'click', 'open', 'convert'
    
    if (!token) {
      return NextResponse.json(
        { error: 'Recovery token is required' },
        { status: 400 }
      )
    }
    
    // Find abandoned cart by token
    const abandonedCart = await AbandonedCart.findOne({ recovery_token: token })
    
    if (!abandonedCart) {
      return NextResponse.json(
        { error: 'Invalid or expired recovery token' },
        { status: 404 }
      )
    }
    
    // Find recovery log
    const recoveryLog = await CartRecoveryLog.findOne({
      abandoned_cart_id: abandonedCart._id
    }).sort({ created_at: -1 })
    
    if (recoveryLog) {
      switch (action) {
        case 'click':
          if (!recoveryLog.click_through) {
            recoveryLog.markClicked()
            await recoveryLog.save()
          }
          break
          
        case 'open':
          if (!recoveryLog.opened) {
            recoveryLog.markOpened()
            await recoveryLog.save()
          }
          break
          
        case 'convert':
          if (!recoveryLog.converted) {
            recoveryLog.markConverted(abandonedCart.total)
            await recoveryLog.save()
            
            // Mark abandoned cart as recovered
            abandonedCart.markRecoveryCompleted()
            await abandonedCart.save()
          }
          break
      }
    }
    
    return NextResponse.json({
      success: true,
      action,
      cart_id: abandonedCart._id
    })
    
  } catch (error) {
    console.error('Recovery tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track recovery action' },
      { status: 500 }
    )
  }
}