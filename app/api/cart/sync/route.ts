import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Cart from '@/models/Cart'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    const cartData = await request.json()
    
    if (!cartData.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Find or create cart
    let cart = await Cart.findOne({
      $or: [
        { sessionId: cartData.sessionId, status: 'active' },
        ...((session?.user as any)?.id ? [{ userId: (session?.user as any)?.id, status: 'active' }] : [])
      ]
    }).sort({ updatedAt: -1 })
    
    if (cart) {
      // Update existing cart
      cart.items = cartData.items
      cart.propertyAddress = cartData.propertyAddress
      cart.propertySize = cartData.propertySize
      cart.measurementId = cartData.measurementId
      cart.subtotal = cartData.subtotal
      cart.tax = cartData.tax
      cart.discount = cartData.discount
      cart.discountCode = cartData.discountCode
      cart.total = cartData.total
      cart.lastActivityAt = new Date()
      cart.metadata = cartData.metadata
      
      if ((session?.user as any)?.id) {
        cart.userId = (session?.user as any)?.id
      }
    } else {
      // Create new cart
      cart = new Cart({
        ...cartData,
        userId: (session?.user as any)?.id || null,
        lastActivityAt: new Date(),
        status: 'active'
      })
    }
    
    await cart.save()
    
    return NextResponse.json({
      success: true,
      cartId: cart._id
    })
  } catch (error) {
    console.error('Cart sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync cart' },
      { status: 500 }
    )
  }
}