import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Subscription from '@/models/Subscription'
import Business from '@/models/Business'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to view billing
    if (!['admin', 'business_owner'].includes(user.role)) {
      // Check if staff has billing permission
      const business = await Business.findById(user.businessId)
      const permissions = business?.permissions?.get(user._id.toString()) || []
      if (!permissions.includes('access_billing')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get subscription for the business
    let subscription = await Subscription.findOne({ businessId: user.businessId })

    // If no subscription exists, create a free one
    if (!subscription && user.businessId) {
      subscription = await Subscription.create({
        businessId: user.businessId,
        stripeCustomerId: '', // Will be set when upgrading
        plan: 'free',
        status: 'active',
        measurementQuota: 10,
        measurementsUsed: 0,
        features: {
          teamMembers: 1,
          apiAccess: false,
          whiteLabel: false,
          customBranding: false,
          advancedReporting: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        measurementQuota: subscription.measurementQuota,
        measurementsUsed: subscription.measurementsUsed,
        features: subscription.features,
      } : null,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admin and business owners can update subscription
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updates = await request.json()

    // Get and update subscription
    const subscription = await Subscription.findOneAndUpdate(
      { businessId: user.businessId },
      updates,
      { new: true }
    )

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Update business max team members based on plan
    const business = await Business.findById(user.businessId)
    if (business) {
      business.maxTeamMembers = subscription.features.teamMembers
      await business.save()
    }

    return NextResponse.json({
      success: true,
      subscription,
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}