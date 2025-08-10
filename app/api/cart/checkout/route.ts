import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Cart from '@/models/Cart'
import Customer from '@/models/Customer'
import Quote from '@/models/Quote'
import Business from '@/models/Business'
import AbandonedCart from '@/models/AbandonedCart'

/**
 * Process checkout - works for both guest and authenticated users
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { cart, customerInfo, businessId } = await request.json()
    
    if (!cart || !customerInfo) {
      return NextResponse.json(
        { error: 'Cart and customer information are required' },
        { status: 400 }
      )
    }
    
    // Get session if user is logged in (optional)
    const session = await getServerSession(authOptions)
    
    // Get or create business (use default for testing)
    let business = null
    if (businessId) {
      try {
        business = await Business.findById(businessId)
      } catch (err) {
        console.log('Business lookup failed, using default')
      }
    }
    
    // If no business found, create or use a default one
    if (!business) {
      business = await Business.findOne() || await Business.create({
        name: 'Default Lawn Care Service',
        email: 'service@lawncare.com',
        phone: '555-0100',
        address: '123 Business St',
        settings: {
          taxRate: 0.0825
        }
      })
    }
    
    // Create or find customer
    let customer = null
    
    if (customerInfo.email) {
      customer = await Customer.findOne({ 
        email: customerInfo.email,
        businessId: business._id 
      })
      
      if (!customer) {
        customer = await Customer.create({
          businessId: business._id,
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address || cart.propertyAddress,
          source: 'website',
          createdBy: (session?.user as any)?.id || business._id
        })
      }
    }
    
    // Generate quote number
    const quoteCount = await Quote.countDocuments({ businessId: business._id })
    const quoteNumber = `Q-${Date.now()}-${quoteCount + 1}`
    
    // Prepare services from cart items
    const services = cart.items.map((item: any) => ({
      name: item.name,
      description: item.description,
      area: item.area,
      pricePerUnit: item.pricePerUnit,
      totalPrice: item.totalPrice
    }))
    
    // Create quote
    const quote = await Quote.create({
      businessId: business._id,
      customerId: customer?._id,
      quoteNumber,
      status: 'draft',
      services,
      subtotal: cart.subtotal,
      tax: cart.tax,
      discount: cart.discount,
      total: cart.total,
      notes: customerInfo.notes,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdBy: (session?.user as any)?.id || business._id,
      metadata: {
        customerInfo: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address
        },
        propertyAddress: cart.propertyAddress,
        sessionId: cart.sessionId,
        discountCode: cart.discountCode
      }
    })
    
    // Mark cart as converted
    if (cart.sessionId) {
      await Cart.updateOne(
        { sessionId: cart.sessionId },
        { 
          $set: { 
            status: 'converted',
            convertedAt: new Date(),
            quoteId: quote._id
          } 
        }
      )
      
      // Also mark abandoned cart as recovered if exists
      await AbandonedCart.updateOne(
        { session_id: cart.sessionId },
        {
          $set: {
            recovery_completed: true,
            recovery_completed_at: new Date()
          }
        }
      )
    }
    
    // Return success with quote details
    return NextResponse.json({
      success: true,
      quote: {
        _id: quote._id,
        quoteNumber: quote.quoteNumber,
        total: quote.total,
        status: quote.status
      },
      message: 'Order processed successfully!'
    })
    
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to process checkout', details: (error as any).message },
      { status: 500 }
    )
  }
}