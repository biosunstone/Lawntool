import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import Cart from '@/models/Cart'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { sessionId, cart: cartData } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Find existing cart or create new one
    let cart = await Cart.findOne({
      sessionId,
      status: 'active'
    })
    
    if (cart) {
      // Mark existing cart as abandoned
      cart.status = 'abandoned'
      cart.abandonedAt = new Date()
      cart.lastActivityAt = new Date()
    } else if (cartData) {
      // Create new abandoned cart record
      cart = new Cart({
        ...cartData,
        status: 'abandoned',
        abandonedAt: new Date(),
        lastActivityAt: new Date()
      })
    }
    
    if (cart) {
      await cart.save()
      
      // Schedule recovery email (to be sent after 1 hour)
      // This would typically trigger a background job
      scheduleRecoveryEmail(cart._id.toString())
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cart marked as abandoned'
    })
  } catch (error) {
    console.error('Cart abandonment error:', error)
    return NextResponse.json(
      { error: 'Failed to mark cart as abandoned' },
      { status: 500 }
    )
  }
}

// Helper function to schedule recovery email
async function scheduleRecoveryEmail(cartId: string) {
  // In production, this would queue a job to send email after 1 hour
  // For now, we'll just log it
  console.log(`Recovery email scheduled for cart ${cartId}`)
  
  // You could use a job queue like Bull or a service like SendGrid
  // to handle delayed email sending
}