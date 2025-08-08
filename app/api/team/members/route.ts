import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import Subscription from '@/models/Subscription'

export async function GET(request: NextRequest) {
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
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get business ID
    let businessId = user.businessId
    if (user.role === 'admin' && !businessId) {
      // Admin might not have a business ID, get from query param
      const searchParams = request.nextUrl.searchParams
      const paramBusinessId = searchParams.get('businessId')
      if (paramBusinessId) {
        businessId = paramBusinessId
      }
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get all team members for the business
    const teamMembers = await User.find({ 
      businessId,
      status: { $ne: 'deleted' }
    }).select('-password')

    // Get business for permissions
    const business = await Business.findById(businessId)
    
    // Format team members with permissions
    const formattedMembers = teamMembers.map(member => {
      const memberObj = member.toObject()
      const permissions = business?.permissions?.get(member._id.toString()) || []
      
      return {
        ...memberObj,
        permissions,
        joinedAt: member.createdAt,
      }
    })

    return NextResponse.json({
      success: true,
      members: formattedMembers,
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Check if user has permission to add team members
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { email, name, role: newRole, permissions } = await request.json()

    // Validate input
    if (!email || !name || !newRole) {
      return NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Get business and check team member limit
    const business = await Business.findById(user.businessId)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const subscription = await Subscription.findOne({ businessId: user.businessId })
    const teamLimit = subscription?.features?.teamMembers || 1
    const currentTeamSize = await User.countDocuments({ 
      businessId: user.businessId,
      status: { $ne: 'deleted' }
    })

    if (teamLimit !== -1 && currentTeamSize >= teamLimit) {
      return NextResponse.json(
        { error: 'Team member limit reached. Please upgrade your plan.' },
        { status: 403 }
      )
    }

    // Create new team member
    const newMember = await User.create({
      email,
      name,
      role: newRole,
      businessId: user.businessId,
      status: 'active',
      metadata: {
        registrationSource: 'admin',
      }
    })

    // Add to business team members
    business.teamMembers.push(newMember._id)
    
    // Set permissions
    if (permissions && permissions.length > 0) {
      business.permissions.set(newMember._id.toString(), permissions)
    }
    
    await business.save()

    return NextResponse.json({
      success: true,
      member: {
        _id: newMember._id,
        email: newMember.email,
        name: newMember.name,
        role: newMember.role,
        permissions,
      },
    })
  } catch (error) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}