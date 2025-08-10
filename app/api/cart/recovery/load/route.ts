import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import AbandonedCart from '@/models/AbandonedCart'
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Recovery token is required' },
        { status: 400 }
      )
    }
    
    // Find abandoned cart by token
    const abandonedCart = await AbandonedCart.findOne({ 
      recovery_token: token,
      recovery_completed: false
    }).populate('business_id', 'name')
    
    if (!abandonedCart) {
      return NextResponse.json(
        { error: 'Invalid or expired recovery token' },
        { status: 404 }
      )
    }
    
    // Check if discount is still valid
    let discountValid = false
    if (abandonedCart.recovery_discount_expires) {
      discountValid = new Date() < abandonedCart.recovery_discount_expires
    }
    
    return NextResponse.json({
      success: true,
      cart: {
        _id: abandonedCart._id,
        business_id: abandonedCart.business_id._id,
        business_name: abandonedCart.business_id.name,
        cart_data: abandonedCart.cart_data,
        property_address: abandonedCart.property_address,
        property_size: abandonedCart.property_size,
        measurement_id: abandonedCart.measurement_id,
        subtotal: abandonedCart.subtotal,
        tax: abandonedCart.tax,
        discount: abandonedCart.discount,
        total: abandonedCart.total,
        recovery_discount_code: discountValid ? abandonedCart.recovery_discount_code : null,
        recovery_discount_expires: abandonedCart.recovery_discount_expires,
        abandoned_at: abandonedCart.abandoned_at
      }
    })
    
  } catch (error) {
    console.error('Cart recovery load error:', error)
    return NextResponse.json(
      { error: 'Failed to load recovery cart' },
      { status: 500 }
    )
  }
}