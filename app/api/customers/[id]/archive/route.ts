import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import Customer from '@/models/Customer'

// POST /api/customers/[id]/archive - Archive a customer
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const customer = await Customer.findOneAndUpdate(
      {
        _id: params.id,
        businessId: session.user.businessId
      },
      {
        status: 'archived',
        archivedAt: new Date()
      },
      { new: true }
    )

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error archiving customer:', error)
    return NextResponse.json(
      { error: 'Failed to archive customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id]/archive - Unarchive a customer
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

    const customer = await Customer.findOneAndUpdate(
      {
        _id: params.id,
        businessId: session.user.businessId
      },
      {
        status: 'active',
        $unset: { archivedAt: 1 }
      },
      { new: true }
    )

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error unarchiving customer:', error)
    return NextResponse.json(
      { error: 'Failed to unarchive customer' },
      { status: 500 }
    )
  }
}