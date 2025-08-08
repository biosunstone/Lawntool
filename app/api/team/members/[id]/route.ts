import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to view team members
    if (!['admin', 'business_owner', 'staff'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the team member
    const member = await User.findById(params.id).select('-password')
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify they belong to the same business (unless admin)
    if (user.role !== 'admin' && member.businessId?.toString() !== user.businessId?.toString()) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Get business for permissions
    const business = await Business.findById(member.businessId)
    const permissions = business?.permissions?.get(member._id.toString()) || []

    return NextResponse.json({
      success: true,
      member: {
        ...member.toObject(),
        permissions,
        joinedAt: member.createdAt,
      },
    })
  } catch (error) {
    console.error('Error fetching team member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team member' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to edit team members
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { role: newRole, permissions, status } = await request.json()

    // Get the team member
    const member = await User.findById(params.id)
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify they belong to the same business (unless admin)
    if (user.role !== 'admin' && member.businessId?.toString() !== user.businessId?.toString()) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removing the last business owner
    if (member.role === 'business_owner' && newRole !== 'business_owner') {
      const ownerCount = await User.countDocuments({
        businessId: member.businessId,
        role: 'business_owner',
        status: 'active',
      })
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last business owner' },
          { status: 400 }
        )
      }
    }

    // Update member role
    if (newRole) {
      member.role = newRole
    }
    if (status) {
      member.status = status
    }
    await member.save()

    // Update permissions in business
    if (permissions !== undefined) {
      const business = await Business.findById(member.businessId)
      if (business) {
        if (permissions.length > 0) {
          business.permissions.set(member._id.toString(), permissions)
        } else {
          business.permissions.delete(member._id.toString())
        }
        await business.save()
      }
    }

    return NextResponse.json({
      success: true,
      member: {
        _id: member._id,
        email: member.email,
        name: member.name,
        role: member.role,
        status: member.status,
        permissions,
      },
    })
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to remove team members
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the team member
    const member = await User.findById(params.id)
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify they belong to the same business (unless admin)
    if (user.role !== 'admin' && member.businessId?.toString() !== user.businessId?.toString()) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent self-deletion
    if (member._id.toString() === user._id.toString()) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the team' },
        { status: 400 }
      )
    }

    // Prevent removing the last business owner
    if (member.role === 'business_owner') {
      const ownerCount = await User.countDocuments({
        businessId: member.businessId,
        role: 'business_owner',
        status: 'active',
        _id: { $ne: member._id },
      })
      if (ownerCount === 0) {
        return NextResponse.json(
          { error: 'Cannot remove the last business owner' },
          { status: 400 }
        )
      }
    }

    // Soft delete the member
    member.status = 'deleted'
    await member.save()

    // Remove from business team members and permissions
    const business = await Business.findById(member.businessId)
    if (business) {
      business.teamMembers = business.teamMembers.filter(
        (id: any) => id.toString() !== member._id.toString()
      )
      business.permissions.delete(member._id.toString())
      await business.save()
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    )
  }
}