import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/saas/db'
import Quote from '@/models/Quote'
import { sendQuoteEmail } from '@/lib/saas/email'

// POST /api/public/quote/[id]/respond - Customer response to quote
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { accepted } = await req.json()
    await connectDB()

    const quote = await Quote.findById(params.id)
      .populate('customerId')
      .populate('businessId')
      .lean()

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Update quote status
    const newStatus = accepted ? 'accepted' : 'rejected'
    await Quote.updateOne(
      { _id: params.id },
      { 
        status: newStatus,
        respondedAt: new Date()
      }
    )

    // Send notification email to business
    await sendQuoteEmail(quote, accepted ? 'accepted' : 'rejected')

    return NextResponse.json({
      success: true,
      message: accepted 
        ? 'Quote accepted successfully' 
        : 'Quote declined successfully'
    })
  } catch (error) {
    console.error('Error responding to quote:', error)
    return NextResponse.json(
      { error: 'Failed to respond to quote' },
      { status: 500 }
    )
  }
}