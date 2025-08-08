import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Quote from '@/models/Quote'
import Customer from '@/models/Customer'
import { sendQuoteEmail } from '@/lib/saas/email'

// GET - Fetch single quote
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }

    await connectDB()

    const quote = await Quote.findOne({ 
      _id: params.id, 
      businessId 
    })
      .populate('customerId')
      .populate('measurementId')
      .populate('createdBy', 'name email')

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Fetch quote error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}

// PATCH - Update quote
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }

    await connectDB()

    const body = await request.json()
    const { status, services, notes, discount, validUntil } = body

    const quote = await Quote.findOne({ 
      _id: params.id, 
      businessId 
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Update quote fields
    if (status) {
      const previousStatus = quote.status
      quote.status = status
      
      // Track status change timestamps
      if (status === 'sent') {
        quote.sentAt = new Date()
        
        // Send email when quote is sent
        await quote.populate('customerId', 'name email phone')
        await quote.populate('measurementId', 'address measurements')
        sendQuoteEmail(quote, 'created').catch(error => {
          console.error('Failed to send quote email:', error)
        })
        
      } else if (status === 'viewed') {
        quote.viewedAt = new Date()
      } else if (status === 'accepted' || status === 'rejected') {
        quote.respondedAt = new Date()
        
        // Update customer total spent if accepted
        if (status === 'accepted') {
          await Customer.updateOne(
            { _id: quote.customerId },
            { $inc: { totalSpent: quote.total } }
          )
          
          // Send acceptance email
          await quote.populate('customerId', 'name email phone')
          await quote.populate('measurementId', 'address measurements')
          sendQuoteEmail(quote, 'accepted').catch(error => {
            console.error('Failed to send acceptance email:', error)
          })
        } else if (status === 'rejected') {
          // Send rejection email
          await quote.populate('customerId', 'name email phone')
          await quote.populate('measurementId', 'address measurements')
          sendQuoteEmail(quote, 'rejected').catch(error => {
            console.error('Failed to send rejection email:', error)
          })
        }
      }
    }

    if (services) {
      quote.services = services
      // Recalculate totals
      quote.subtotal = services.reduce((sum: number, service: any) => sum + service.totalPrice, 0)
      quote.total = quote.subtotal + quote.tax - (discount || quote.discount)
    }

    if (notes !== undefined) quote.notes = notes
    if (discount !== undefined) {
      quote.discount = discount
      quote.total = quote.subtotal + quote.tax - discount
    }
    if (validUntil) quote.validUntil = validUntil

    await quote.save()

    // Populate references for response
    await quote.populate('customerId', 'name email phone')
    await quote.populate('measurementId', 'address measurements')

    return NextResponse.json({
      message: 'Quote updated successfully',
      quote
    })
  } catch (error: any) {
    console.error('Update quote error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update quote' },
      { status: 500 }
    )
  }
}

// DELETE - Delete quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }

    await connectDB()

    const quote = await Quote.findOneAndDelete({ 
      _id: params.id, 
      businessId,
      status: 'draft' // Only allow deleting draft quotes
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found or cannot be deleted' }, 
        { status: 404 }
      )
    }

    // Update customer quote count
    await Customer.updateOne(
      { _id: quote.customerId },
      { $inc: { quoteCount: -1 } }
    )

    return NextResponse.json({
      message: 'Quote deleted successfully'
    })
  } catch (error) {
    console.error('Delete quote error:', error)
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    )
  }
}