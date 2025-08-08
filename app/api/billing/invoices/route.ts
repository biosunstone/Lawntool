import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Subscription from '@/models/Subscription'
import Business from '@/models/Business'
export const dynamic = 'force-dynamic'
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
      const business = await Business.findById(user.businessId)
      const permissions = business?.permissions?.get(user._id.toString()) || []
      if (!permissions.includes('access_billing')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    // In production, we would fetch from Stripe
    // const invoices = await stripe.invoices.list({
    //   customer: subscription.stripeCustomerId,
    //   limit: limit,
    // })

    // For demo, return mock invoices
    const subscription = await Subscription.findOne({ businessId: user.businessId })
    
    let mockInvoices = []
    if (subscription && subscription.plan !== 'free') {
      const planPrices: { [key: string]: number } = {
        starter: 4900,
        professional: 14900,
        enterprise: 49900,
      }
      
      const price = planPrices[subscription.plan] || 0
      
      // Generate mock invoices for the last few months
      const now = new Date()
      for (let i = 0; i < Math.min(limit, 6); i++) {
        const invoiceDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        mockInvoices.push({
          _id: `inv_demo_${i}`,
          amount: price,
          status: 'paid',
          created: invoiceDate.toISOString(),
          invoicePdf: '#', // In production, this would be a real PDF URL
          description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - ${invoiceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      invoices: mockInvoices,
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}