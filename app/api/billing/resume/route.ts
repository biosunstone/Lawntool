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

    // Only admin and business owners can resume subscription
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get subscription
    const subscription = await Subscription.findOne({ businessId: user.businessId })
    
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    if (subscription.status !== 'canceled') {
      return NextResponse.json({ error: 'Subscription is not cancelled' }, { status: 400 })
    }

    // Check if subscription period has ended
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
      return NextResponse.json({ 
        error: 'Subscription period has ended. Please upgrade to a new plan.' 
      }, { status: 400 })
    }

    // In production, we would resume the Stripe subscription here
    // const stripeSubscription = await stripe.subscriptions.update(
    //   subscription.stripeSubscriptionId,
    //   { cancel_at_period_end: false }
    // )

    // For demo, just update the status
    subscription.status = 'active'
    await subscription.save()

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    })
  } catch (error) {
    console.error('Error resuming subscription:', error)
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    )
  }
}