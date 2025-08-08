import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import BusinessMembership from '@/models/BusinessMembership'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Find all business memberships for this user
    const memberships = await BusinessMembership.find({
      userId: user._id,
      status: 'active'
    }).populate('businessId', 'name description')

    // If no memberships exist but user has a businessId, create a membership record
    if (memberships.length === 0 && user.businessId) {
      const business = await Business.findById(user.businessId)
      if (business) {
        // Create membership for backward compatibility
        await BusinessMembership.create({
          userId: user._id,
          businessId: user.businessId,
          role: user.role,
          isPrimary: true,
          status: 'active'
        })
        
        // Fetch memberships again
        const updatedMemberships = await BusinessMembership.find({
          userId: user._id,
          status: 'active'
        }).populate('businessId', 'name description')
        
        const formattedBusinesses = updatedMemberships.map(membership => ({
          _id: membership.businessId._id,
          name: membership.businessId.name,
          description: membership.businessId.description,
          role: membership.role,
          isPrimary: membership.isPrimary,
          isCurrent: user.businessId?.toString() === membership.businessId._id.toString()
        }))

        return NextResponse.json({
          businesses: formattedBusinesses,
          currentBusinessId: user.businessId
        })
      }
    }

    // Format businesses with user's role in each
    const formattedBusinesses = memberships.map(membership => ({
      _id: membership.businessId._id,
      name: membership.businessId.name,
      description: membership.businessId.description,
      role: membership.role,
      isPrimary: membership.isPrimary,
      isCurrent: user.businessId?.toString() === membership.businessId._id.toString()
    }))

    return NextResponse.json({
      businesses: formattedBusinesses,
      currentBusinessId: user.businessId
    })
  } catch (error) {
    console.error('Error fetching user businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    )
  }
}