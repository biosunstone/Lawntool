import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import Cart from '@/models/Cart'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { sessionId, quoteId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Find and update cart
    const cart = await Cart.findOne({
      sessionId,
      status: { $in: ['active', 'abandoned'] }
    })
    
    if (cart) {
      cart.status = 'converted'
      cart.metadata = {
        ...cart.metadata,
        quoteId,
        convertedAt: new Date().toISOString()
      }
      await cart.save()
      
      return NextResponse.json({
        success: true,
        message: 'Cart marked as converted'
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Cart not found'
    }, { status: 404 })
    
  } catch (error) {
    console.error('Cart conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to convert cart' },
      { status: 500 }
    )
  }
}