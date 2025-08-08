import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Subscription from '@/models/Subscription'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user || !user.businessId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admin and business owners can cancel subscription
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get subscription
    const subscription = await Subscription.findOne({ businessId: user.businessId })
    
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    if (subscription.plan === 'free') {
      return NextResponse.json({ error: 'Cannot cancel free plan' }, { status: 400 })
    }

    if (subscription.status === 'canceled') {
      return NextResponse.json({ error: 'Subscription already cancelled' }, { status: 400 })
    }

    // In production, we would cancel the Stripe subscription here
    // const stripeSubscription = await stripe.subscriptions.update(
    //   subscription.stripeSubscriptionId,
    //   { cancel_at_period_end: true }
    // )

    // For demo, just update the status
    subscription.status = 'canceled'
    // Keep access until the end of the current period
    if (!subscription.currentPeriodEnd) {
      subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
    
    await subscription.save()

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled. You will have access until the end of your billing period.',
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}