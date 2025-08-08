import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import PricingRule from '@/models/PricingRule'

// GET /api/pricing-rules/[id]
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

    const rule = await PricingRule.findOne({
      _id: params.id,
      businessId: session.user.businessId
    }).lean()

    if (!rule) {
      return NextResponse.json({ error: 'Pricing rule not found' }, { status: 404 })
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error fetching pricing rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing rule' },
      { status: 500 }
    )
  }
}

// PATCH /api/pricing-rules/[id]
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

    const rule = await PricingRule.findOneAndUpdate(
      {
        _id: params.id,
        businessId: session.user.businessId
      },
      body,
      { new: true }
    )

    if (!rule) {
      return NextResponse.json({ error: 'Pricing rule not found' }, { status: 404 })
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error updating pricing rule:', error)
    return NextResponse.json(
      { error: 'Failed to update pricing rule' },
      { status: 500 }
    )
  }
}

// DELETE /api/pricing-rules/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session:any= await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const result = await PricingRule.deleteOne({
      _id: params.id,
      businessId: session.user.businessId
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Pricing rule not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Pricing rule deleted successfully' })
  } catch (error) {
    console.error('Error deleting pricing rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete pricing rule' },
      { status: 500 }
    )
  }
}