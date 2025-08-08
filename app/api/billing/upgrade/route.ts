import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Subscription, { PLAN_FEATURES } from '@/models/Subscription'
import Business from '@/models/Business'

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

    // Only admin and business owners can upgrade
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { plan } = await request.json()

    // Validate plan
    if (!['free', 'starter', 'professional', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get current subscription
    let subscription = await Subscription.findOne({ businessId: user.businessId })

    if (!subscription) {
      // Create new subscription
      subscription = new Subscription({
        businessId: user.businessId,
        stripeCustomerId: `cus_demo_${user.businessId}`, // Demo customer ID
        plan,
        status: 'active',
      })
    }

    // Get plan features
    const planFeatures = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]

    // Update subscription with new plan details
    subscription.plan = plan
    subscription.status = 'active'
    subscription.measurementQuota = planFeatures.measurementQuota
    subscription.features = {
      teamMembers: planFeatures.teamMembers,
      apiAccess: planFeatures.apiAccess,
      whiteLabel: planFeatures.whiteLabel,
      customBranding: planFeatures.customBranding,
      advancedReporting: planFeatures.advancedReporting,
    }
    subscription.currentPeriodStart = new Date()
    subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    await subscription.save()

    // Update business max team members
    const business = await Business.findById(user.businessId)
    if (business) {
      business.maxTeamMembers = planFeatures.teamMembers
      await business.save()
    }

    // For paid plans, we would normally redirect to Stripe checkout
    // For demo purposes, we'll just return success
    if (plan !== 'free') {
      // In production, create Stripe checkout session here
      // const checkoutSession = await stripe.checkout.sessions.create({...})
      // return NextResponse.json({ checkoutUrl: checkoutSession.url })
      
      // Demo response - simulate successful upgrade
      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${plan} plan (Demo Mode)`,
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          features: subscription.features,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully downgraded to free plan',
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        features: subscription.features,
      },
    })
  } catch (error) {
    console.error('Error upgrading subscription:', error)
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    )
  }
}