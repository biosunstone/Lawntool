import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/saas/db'
import Measurement from '@/models/Measurement'
import Business from '@/models/Business'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(req: NextRequest) {
  try {
    const { measurementId, quoteId, email } = await req.json()

    if (!measurementId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await connectDB()

    // Get measurement and business details
    const measurement: any = await Measurement.findById(measurementId)
      .populate('businessId')
      .lean()

    if (!measurement) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    const business = measurement.businessId

    // Calculate price based on selected services
    let totalPrice = 0
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    // Get the services from measurement metadata
    const services = measurement.metadata?.services || ['full_property']
    
    // Define pricing for measurement reports
    const servicePricing: Record<string, { name: string; price: number }> = {
      full_property: { name: 'Full Property Measurement Report', price: 4900 }, // $49.00
      lawn_area: { name: 'Lawn Area Measurement Report', price: 2900 },
      roof: { name: 'Roof Measurement Report', price: 3900 },
      hardscape: { name: 'Hardscape Measurement Report', price: 2900 },
      fence_line: { name: 'Fence Line Measurement Report', price: 2500 },
      custom: { name: 'Custom Measurement Report', price: 3500 }
    }

    // Create line items for each service
    services.forEach((serviceId: string) => {
      const service = servicePricing[serviceId] || servicePricing.full_property
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: service.name,
            description: `Detailed measurement report for ${measurement.address}`,
            metadata: {
              measurementId: measurementId.toString(),
              serviceType: serviceId
            }
          },
          unit_amount: service.price,
        },
        quantity: 1,
      })
      totalPrice += service.price
    })

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/measurement/success?session_id={CHECKOUT_SESSION_ID}&measurement_id=${measurementId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/measurement/cancelled?measurement_id=${measurementId}`,
      customer_email: email,
      metadata: {
        measurementId: measurementId.toString(),
        quoteId: quoteId || '',
        businessId: business._id.toString(),
        customerEmail: email
      },
      payment_intent_data: {
        metadata: {
          measurementId: measurementId.toString(),
          businessId: business._id.toString()
        }
      }
    })

    // Store payment session in measurement
    await Measurement.findByIdAndUpdate(measurementId, {
      $set: {
        'paymentStatus': 'pending',
        'paymentSessionId': session.id,
        'paymentAmount': totalPrice / 100 // Store in dollars
      }
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}