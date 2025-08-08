import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Measurement from '@/models/Measurement'
import Quote from '@/models/Quote'
import Customer from '@/models/Customer'

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(params.id)
      .select('-password')
      .populate('businessId', 'name')
      .lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user activity stats
    const businessId = (user as any).businessId?._id || (user as any).businessId
    const [measurementCount, quoteCount, customerCount] = await Promise.all([
      Measurement.countDocuments({ userId: params.id }),
      Quote.countDocuments({ createdBy: params.id }),
      Customer.countDocuments({ businessId: businessId })
    ])

    return NextResponse.json({
      user,
      stats: {
        measurements: measurementCount,
        quotes: quoteCount,
        customers: customerCount
      }
    })
  } catch (error: any) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, role, status, businessId } = body

    await connectDB()

    const user = await User.findById(params.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent admin from demoting themselves
    if (params.id === (session.user as any).id && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot change your own admin role' },
        { status: 400 }
      )
    }

    // Update user fields
    if (name !== undefined) user.name = name
    if (email !== undefined) user.email = email
    if (role !== undefined) user.role = role
    if (status !== undefined) user.status = status
    if (businessId !== undefined) user.businessId = businessId

    await user.save()

    const updatedUser = user.toObject()
    delete updatedUser.password

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Delete or soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent admin from deleting themselves
    if (params.id === (session.user as any).id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      // Hard delete - permanently remove user and related data
      await User.findByIdAndDelete(params.id)
      
      // Optionally delete related data
      // await Measurement.deleteMany({ userId: params.id })
      // await Quote.deleteMany({ createdBy: params.id })
    } else {
      // Soft delete - just mark as deleted
      await User.findByIdAndUpdate(params.id, {
        status: 'deleted',
        email: `deleted_${Date.now()}_${params.id}@deleted.com` // Prevent email conflicts
      })
    }

    return NextResponse.json({
      message: hardDelete ? 'User permanently deleted' : 'User marked as deleted'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}