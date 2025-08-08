import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/saas/db'
import Quote from '@/models/Quote'
import Business from '@/models/Business'

// GET /api/public/quote/[id] - Get public quote details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let quote:any;
  try {
    await connectDB()

    quote = await Quote.findById(params.id)
      .populate('customerId', 'name email phone')
      .populate('measurementId', 'address measurements')
      .populate('businessId', 'name email phone address')
      .lean()

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Mark as viewed if first time
    if (!('viewedAt' in quote) || !quote.viewedAt) {
      await Quote.updateOne(
        { _id: params.id },
        { viewedAt: new Date() }
      )
    }

    

    // Format response
    const response = {
      _id: quote._id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      services: quote.services,
      subtotal: quote.subtotal,
      tax: quote.tax,
      discount: quote.discount,
      total: quote.total,
      validUntil: quote.validUntil,
      notes: quote.notes,
      customer: {
        name: quote.customerId.name,
        email: quote.customerId.email,
        phone: quote.customerId.phone
      },
      business: {
        name: quote.businessId.name,
        email: quote.businessId.email,
        phone: quote.businessId.phone,
        address: quote.businessId.address
      },
      measurement: {
        address: quote.measurementId.address,
        totalArea: quote.measurementId.measurements?.totalArea || 0,
        lawn: quote.measurementId.measurements?.lawn || 0,
        driveway: quote.measurementId.measurements?.driveway || 0,
        sidewalk: quote.measurementId.measurements?.sidewalk || 0
      },
      createdAt: quote.createdAt
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching public quote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}