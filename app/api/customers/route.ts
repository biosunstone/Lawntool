import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import Customer from '@/models/Customer'
import Quote from '@/models/Quote'
import Measurement from '@/models/Measurement'

// GET /api/customers - Get all customers for a business
export async function GET(req: NextRequest) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const sort = searchParams.get('sort') || '-createdAt'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    const query: any = { businessId: session.user.businessId }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    if (status && status !== 'all') {
      query.status = status
    }

    // Get total count
    const total = await Customer.countDocuments(query)

    // Get customers with pagination
    const customers:any = await Customer.find(query)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .lean()

    // Get quote and measurement counts for each customer
    const customerIds = customers.map((c:any) => c._id)
    const quoteCounts = await Quote.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      { 
        $group: { 
          _id: '$customerId',
          total: { $sum: 1 },
          accepted: { 
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          totalValue: { $sum: '$total' }
        } 
      }
    ])

    const measurementCounts = await Measurement.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } }
    ])

    // Create lookup maps
    const quoteMap = new Map(quoteCounts.map(q => [q._id.toString(), q]))
    const measurementMap = new Map(measurementCounts.map(m => [m._id.toString(), m.count]))

    // Enhance customers with counts
    const enhancedCustomers = customers.map((customer:any) => {
      const quotes = quoteMap.get(customer._id.toString()) || { total: 0, accepted: 0, totalValue: 0 }
      const measurements = measurementMap.get(customer._id.toString()) || 0
      
      return {
        ...customer,
        quotes: {
          total: quotes.total,
          accepted: quotes.accepted,
          totalValue: quotes.totalValue
        },
        measurements
      }
    })

    return NextResponse.json({
      customers: enhancedCustomers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create a new customer
export async function POST(req: NextRequest) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    await connectDB()

    // Check if customer with email already exists for this business
    const existingCustomer = await Customer.findOne({
      email: body.email,
      businessId: session.user.businessId
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      )
    }

    // Create customer
    const customer = await Customer.create({
      ...body,
      businessId: session.user.businessId,
      status: body.status || 'active',
      tags: body.tags || [],
      notes: body.notes || '',
      metadata: {
        source: body.source || 'manual',
        referral: body.referral || '',
        customFields: body.customFields || {}
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}