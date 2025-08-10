import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import Customer from '@/models/Customer'
import Quote from '@/models/Quote'
import Measurement from '@/models/Measurement'

// GET /api/customers/[id] - Get a specific customer
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const customer:any = await Customer.findOne({
      _id: params.id,
      businessId: (session.user as any).businessId
    }).lean()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get related quotes and measurements
    const [quotes, measurements] = await Promise.all([
      Quote.find({ customerId: params.id })
        .populate('measurementId')
        .sort('-createdAt')
        .limit(10)
        .lean(),
      Measurement.find({ customerId: params.id })
        .sort('-createdAt')
        .limit(10)
        .lean()
    ])

    // Calculate statistics
    const stats = {
      totalQuotes: await Quote.countDocuments({ customerId: params.id }),
      acceptedQuotes: await Quote.countDocuments({ 
        customerId: params.id, 
        status: 'accepted' 
      }),
      totalMeasurements: await Measurement.countDocuments({ customerId: params.id }),
      totalSpent: await Quote.aggregate([
        { 
          $match: { 
            customerId: customer._id, 
            status: 'accepted' 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$total' } 
          } 
        }
      ]).then(result => result[0]?.total || 0),
      averageQuoteValue: await Quote.aggregate([
        { 
          $match: { 
            customerId: customer._id 
          } 
        },
        { 
          $group: { 
            _id: null, 
            avg: { $avg: '$total' } 
          } 
        }
      ]).then(result => result[0]?.avg || 0)
    }

    return NextResponse.json({
      ...customer,
      quotes,
      measurements,
      stats
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Update a customer
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    await connectDB()

    // Check if customer exists and belongs to business
    const customer = await Customer.findOne({
      _id: params.id,
      businessId: (session.user as any).businessId
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check for email uniqueness if email is being updated
    if (body.email && body.email !== customer.email) {
      const existingCustomer = await Customer.findOne({
        email: body.email,
        businessId: (session.user as any).businessId,
        _id: { $ne: params.id }
      })

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Update customer
    Object.assign(customer, body)
    await customer.save()

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Check if customer has any quotes
    const quoteCount = await Quote.countDocuments({ customerId: params.id })
    if (quoteCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing quotes. Archive instead.' },
        { status: 400 }
      )
    }

    const result = await Customer.deleteOne({
      _id: params.id,
      businessId: (session.user as any).businessId
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}