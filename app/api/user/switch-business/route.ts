import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import BusinessMembership from '@/models/BusinessMembership'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has a membership for this business
    const membership = await BusinessMembership.findOne({
      userId: user._id,
      businessId: businessId,
      status: 'active'
    })

    if (!membership) {
      // Check if user is a member through legacy system
      const business = await Business.findById(businessId)
      
      if (!business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }

      const isMember = business.teamMembers.some(
        (memberId: any) => memberId.toString() === user._id.toString()
      )

      if (!isMember) {
        return NextResponse.json(
          { error: 'You are not a member of this business' },
          { status: 403 }
        )
      }

      // Create membership for backward compatibility
      const role = business.ownerId?.toString() === user._id.toString() ? 'business_owner' : 'staff'
      await BusinessMembership.create({
        userId: user._id,
        businessId: businessId,
        role: role,
        isPrimary: false,
        status: 'active'
      })

      // Update user's current business and role
      user.businessId = businessId
      user.role = role
      await user.save()

      return NextResponse.json({
        success: true,
        message: 'Business switched successfully',
        businessId: businessId,
        role: role
      })
    }

    // Get the business details
    const business = await Business.findById(businessId)
    
    // Update user's current business and role from membership
    user.businessId = businessId
    user.role = membership.role
    await user.save()

    // Update primary flag if needed
    await BusinessMembership.updateMany(
      { userId: user._id },
      { isPrimary: false }
    )
    membership.isPrimary = true
    await membership.save()

    return NextResponse.json({
      success: true,
      message: 'Business switched successfully',
      businessId: businessId,
      businessName: business?.name,
      role: membership.role
    })
  } catch (error) {
    console.error('Error switching business:', error)
    return NextResponse.json(
      { error: 'Failed to switch business' },
      { status: 500 }
    )
  }
}