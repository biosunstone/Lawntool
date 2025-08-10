/**
 * Check the status of the cart recovery cron job
 */

import { NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import AbandonedCart from '@/models/AbandonedCart'
import CartRecoveryLog from '@/models/CartRecoveryLog'

export async function GET() {
  try {
    await connectDB()
    
    // Get statistics
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Count abandoned carts
    const totalAbandoned = await AbandonedCart.countDocuments()
    const abandonedToday = await AbandonedCart.countDocuments({
      abandoned_at: { $gte: oneDayAgo }
    })
    const pendingRecovery = await AbandonedCart.countDocuments({
      reminder_sent: false,
      abandoned_at: { $lte: new Date(now.getTime() - 15 * 60 * 1000) }
    })
    
    // Count recovery emails
    const totalEmailsSent = await CartRecoveryLog.countDocuments({
      contact_type: 'email'
    })
    const emailsSentToday = await CartRecoveryLog.countDocuments({
      contact_type: 'email',
      sent_at: { $gte: oneDayAgo }
    })
    const emailsSentLastHour = await CartRecoveryLog.countDocuments({
      contact_type: 'email',
      sent_at: { $gte: oneHourAgo }
    })
    
    // Get last processed time
    const lastProcessed = await CartRecoveryLog.findOne()
      .sort({ sent_at: -1 })
      .select('sent_at')
    
    return NextResponse.json({
      status: 'active',
      schedule: 'Every 10 minutes',
      statistics: {
        abandoned: {
          total: totalAbandoned,
          today: abandonedToday,
          pendingRecovery
        },
        recovery: {
          totalEmailsSent,
          emailsSentToday,
          emailsSentLastHour
        },
        lastProcessed: lastProcessed?.sent_at || null,
        nextRun: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
      },
      message: 'Cron job is running automatically every 10 minutes'
    })
  } catch (error) {
    console.error('Error checking cron status:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check cron status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}