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

    // Only admin and business owners can access billing portal
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get subscription
    const subscription = await Subscription.findOne({ businessId: user.businessId })
    
    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No billing account found. Please upgrade to a paid plan first.' 
      }, { status: 404 })
    }

    // In production, we would create a Stripe billing portal session
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: subscription.stripeCustomerId,
    //   return_url: `${process.env.NEXTAUTH_URL}/billing`,
    // })
    // return NextResponse.json({ url: session.url })

    // For demo, return a mock URL
    return NextResponse.json({
      success: true,
      url: '/billing', // In production, this would be a Stripe portal URL
      message: 'Demo mode: Billing portal would open in production',
    })
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    return NextResponse.json(
      { error: 'Failed to open billing portal' },
      { status: 500 }
    )
  }
}