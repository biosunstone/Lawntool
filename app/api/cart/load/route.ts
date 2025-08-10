import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Cart from '@/models/Cart'
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    
    if (!(session?.user as any)?.id) {
      return NextResponse.json(null)
    }
    
    // Find active cart for logged-in user
    const cart = await Cart.findOne({
      userId: (session?.user as any)?.id,
      status: 'active'
    })
      .populate('businessId', 'name')
      .populate('customerId', 'name email')
      .sort({ updatedAt: -1 })
    
    if (!cart) {
      return NextResponse.json(null)
    }
    
    // Update last activity
    cart.lastActivityAt = new Date()
    await cart.save()
    
    return NextResponse.json({
      sessionId: cart.sessionId,
      businessId: cart.businessId?._id || cart.businessId,
      items: cart.items,
      propertyAddress: cart.propertyAddress,
      propertySize: cart.propertySize,
      measurementId: cart.measurementId,
      customerId: cart.customerId?._id || cart.customerId,
      subtotal: cart.subtotal,
      tax: cart.tax,
      discount: cart.discount,
      discountCode: cart.discountCode,
      total: cart.total,
      lastActivityAt: cart.lastActivityAt.toISOString(),
      metadata: cart.metadata
    })
  } catch (error) {
    console.error('Cart load error:', error)
    return NextResponse.json(
      { error: 'Failed to load cart' },
      { status: 500 }
    )
  }
}