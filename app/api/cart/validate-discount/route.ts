import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import Business from '@/models/Business'

// Sample discount codes - in production, these would be in a database
const DISCOUNT_CODES: Record<string, { discount: number; type: 'percentage' | 'fixed' }> = {
  'SAVE5': { discount: 5, type: 'percentage' },
  'WELCOME10': { discount: 10, type: 'percentage' },
  'FIRST15': { discount: 15, type: 'fixed' },
  'LAWN20': { discount: 20, type: 'fixed' },
  'RECOVERY5': { discount: 5, type: 'percentage' }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { code, businessId } = await request.json()
    
    if (!code) {
      return NextResponse.json(
        { valid: false, message: 'Discount code is required' },
        { status: 400 }
      )
    }
    
    // For now, we'll skip business validation if businessId is not provided
    // or use a default business for testing
    if (businessId) {
      try {
        const business = await Business.findById(businessId)
        if (!business) {
          console.log('Business not found, continuing without business validation')
        }
      } catch (err) {
        console.log('Invalid businessId format, continuing without business validation')
      }
    }
    
    // Validate discount code
    const discountCode = DISCOUNT_CODES[code.toUpperCase()]
    
    if (!discountCode) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid discount code'
      })
    }
    
    // Calculate discount amount (for percentage, this will be calculated on frontend)
    let discountAmount = discountCode.discount
    
    return NextResponse.json({
      valid: true,
      discount: discountAmount,
      type: discountCode.type,
      message: `Discount code "${code}" applied successfully!`
    })
  } catch (error) {
    console.error('Discount validation error:', error)
    return NextResponse.json(
      { valid: false, message: 'Failed to validate discount code' },
      { status: 500 }
    )
  }
}