import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/saas/db'
import Measurement from '@/models/Measurement'
import Quote from '@/models/Quote'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(req: NextRequest) {
  try {
    const { sessionId, measurementId } = await req.json()

    if (!sessionId || !measurementId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await connectDB()

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Update measurement with payment status
    const measurement: any = await Measurement.findByIdAndUpdate(
      measurementId,
      {
        $set: {
          paymentStatus: 'paid',
          paymentCompletedAt: new Date(),
          stripeSessionId: sessionId,
          customerEmail: session.customer_email,
          fullDataAccess: true
        }
      },
      { new: true }
    ).populate('businessId').lean()

    if (!measurement) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    // Update quote if exists
    if (measurement.quoteId) {
      await Quote.findByIdAndUpdate(measurement.quoteId, {
        $set: {
          paymentStatus: 'paid',
          paymentDate: new Date()
        }
      })
    }

    // Return full measurement data since payment is verified
    return NextResponse.json({
      success: true,
      measurement: {
        _id: measurement._id,
        address: measurement.address,
        coordinates: measurement.coordinates,
        measurements: measurement.measurements,
        selectionMethod: measurement.selectionMethod,
        createdAt: measurement.createdAt,
        businessId: measurement.businessId,
        paymentStatus: 'paid',
        fullDataAccess: true
      }
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}