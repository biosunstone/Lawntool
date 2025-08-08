import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/saas/db'
import Measurement from '@/models/Measurement'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const measurementId = searchParams.get('measurementId')
    const quoteId = searchParams.get('quoteId')
    const email = searchParams.get('email')

    if (!measurementId || !email) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    await connectDB()

    // Get measurement details
    const measurement: any = await Measurement.findById(measurementId)
      .populate('businessId')
      .lean()

    if (!measurement) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    // Create Stripe checkout session for measurement report
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Full Property Measurement Report',
              description: `Detailed measurement report for ${measurement.address}`,
              images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500'],
            },
            unit_amount: 4900, // $49.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/measurement/success?session_id={CHECKOUT_SESSION_ID}&measurement_id=${measurementId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/measurement/cancelled?measurement_id=${measurementId}`,
      customer_email: email,
      metadata: {
        measurementId: measurementId.toString(),
        quoteId: quoteId || '',
        businessId: measurement.businessId._id.toString(),
      },
    })

    // Store payment session in measurement
    await Measurement.findByIdAndUpdate(measurementId, {
      $set: {
        paymentStatus: 'pending',
        paymentSessionId: session.id,
        paymentAmount: 49,
      },
    })

    // Redirect to Stripe checkout
    return NextResponse.redirect(session.url!)
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}