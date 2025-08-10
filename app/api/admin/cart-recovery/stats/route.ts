import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import connectDB from '@/lib/saas/db'
import AbandonedCart from '@/models/AbandonedCart'
import CartRecoveryLog from '@/models/CartRecoveryLog'
import { authOptions } from '@/lib/saas/auth'
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get abandoned carts statistics
    const abandonedCarts = await AbandonedCart.find({
      abandoned_at: { $gte: startDate }
    })

    const totalAbandoned = abandonedCarts.length
    const totalRecovered = abandonedCarts.filter(cart => cart.recovery_completed).length
    const conversionRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0

    // Calculate revenue recovered
    const revenueRecovered = abandonedCarts
      .filter(cart => cart.recovery_completed)
      .reduce((sum, cart) => {
        const cartTotal = cart.cart_data.reduce((total: number, item: any) => total + item.price, 0)
        return sum + cartTotal
      }, 0)

    // Get email statistics
    const emailLogs = await CartRecoveryLog.find({
      sent_at: { $gte: startDate },
      contact_type: 'email'
    })

    const emailsSent = emailLogs.length
    const emailsOpened = emailLogs.filter(log => log.opened_at).length
    const emailsClicked = emailLogs.filter(log => log.clicked_at).length

    // Calculate average recovery time (in minutes)
    const recoveredCarts = abandonedCarts.filter(cart => cart.recovery_completed)
    const averageRecoveryTime = recoveredCarts.length > 0
      ? recoveredCarts.reduce((sum, cart) => {
          const recoveryTime = cart.recovery_completed_at
            ? (cart.recovery_completed_at.getTime() - cart.abandoned_at.getTime()) / (1000 * 60)
            : 0
          return sum + recoveryTime
        }, 0) / recoveredCarts.length
      : 0

    // Get top performing discount codes
    const discountStats = await CartRecoveryLog.aggregate([
      {
        $match: {
          discount_code: { $exists: true, $ne: null },
          sent_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$discount_code',
          uses: { $sum: { $cond: ['$recovery_completed', 1, 0] } },
          revenue: { $sum: '$order_value' }
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 10
      }
    ])

    const topDiscountCodes = discountStats.map(stat => ({
      code: stat._id,
      uses: stat.uses,
      revenue: stat.revenue || 0
    }))

    // Get recovery by day for chart
    const recoveryByDay = []
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayAbandoned = await AbandonedCart.countDocuments({
        abandoned_at: { $gte: date, $lt: nextDate }
      })

      const dayRecovered = await AbandonedCart.countDocuments({
        abandoned_at: { $gte: date, $lt: nextDate },
        recovery_completed: true
      })

      recoveryByDay.unshift({
        date: date.toISOString(),
        abandoned: dayAbandoned,
        recovered: dayRecovered
      })
    }

    return NextResponse.json({
      totalAbandoned,
      totalRecovered,
      conversionRate,
      revenueRecovered,
      emailsSent,
      emailsOpened,
      emailsClicked,
      averageRecoveryTime,
      topDiscountCodes,
      recoveryByDay
    })

  } catch (error) {
    console.error('Error fetching cart recovery stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}