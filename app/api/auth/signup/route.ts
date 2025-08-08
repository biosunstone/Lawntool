import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import Subscription, { PLAN_FEATURES } from '@/models/Subscription'
import TeamInvitation from '@/models/TeamInvitation'
import BusinessMembership from '@/models/BusinessMembership'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, businessName, inviteToken } = await request.json()

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // If no invitation token, business name is required
    if (!inviteToken && !businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    let userRole = 'business_owner'
    let businessId = null

    // If there's an invitation token, validate it and get the business
    let invitation:any;
    if (inviteToken) {
      invitation = await TeamInvitation.findOne({
        token: inviteToken,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }).populate('businessId')

      if (!invitation) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation' },
          { status: 400 }
        )
      }

      if (invitation.email !== email) {
        return NextResponse.json(
          { error: 'Email does not match invitation' },
          { status: 400 }
        )
      }

      userRole = invitation.role
      businessId = invitation.businessId._id

      // Mark invitation as accepted
      invitation.status = 'accepted'
      invitation.acceptedAt = new Date()
      await invitation.save()

      // Add user to business team members after user creation
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      businessId: businessId
    })

    // If joining an existing business, add to team members
    if (businessId) {
      await Business.findByIdAndUpdate(
        businessId,
        { $addToSet: { teamMembers: user._id } }
      )
      
      // Create membership record for invited user
      await BusinessMembership.create({
        userId: user._id,
        businessId: businessId,
        role: userRole,
        invitedBy: invitation?.invitedBy,
        isPrimary: true,
        status: 'active'
      })
    } else {
      // Create new business
      const business = await Business.create({
        name: businessName,
        ownerId: user._id,
        teamMembers: [user._id],
      })

      // Update user with business ID
      user.businessId = business._id
      await user.save()
      
      // Create membership record for business owner
      await BusinessMembership.create({
        userId: user._id,
        businessId: business._id,
        role: 'business_owner',
        isPrimary: true,
        status: 'active'
      })

      // Create free subscription
      await Subscription.create({
        businessId: business._id,
        stripeCustomerId: `cus_free_${user._id}`, // Temporary ID for free plan
        plan: 'free',
        status: 'active',
        measurementQuota: PLAN_FEATURES.free.measurementQuota,
        features: {
          teamMembers: PLAN_FEATURES.free.teamMembers,
          apiAccess: PLAN_FEATURES.free.apiAccess,
          whiteLabel: PLAN_FEATURES.free.whiteLabel,
          customBranding: PLAN_FEATURES.free.customBranding,
          advancedReporting: PLAN_FEATURES.free.advancedReporting,
        },
      })
    }

    return NextResponse.json({
      message: 'Account created successfully',
      userId: user._id,
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}