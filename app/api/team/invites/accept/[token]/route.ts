import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import TeamInvitation from '@/models/TeamInvitation'
import User from '@/models/User'
import Business from '@/models/Business'
import BusinessMembership from '@/models/BusinessMembership'
import bcryptjs from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'

// GET - Check invitation validity and show acceptance page
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB()

    // Find invitation by token
    const invitation = await TeamInvitation.findOne({ 
      token: params.token,
      status: 'pending'
    }).populate('businessId', 'name').populate('invitedBy', 'name')

    if (!invitation) {
      // Redirect to error page
      return NextResponse.redirect(new URL('/invite/invalid', request.url))
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired'
      await invitation.save()
      return NextResponse.redirect(new URL('/invite/expired', request.url))
    }

    // Check if user is already logged in
    const session = await getServerSession(authOptions)
    
    if (session?.user?.email) {
      // User is logged in
      if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        // Wrong account - redirect to switch account page
        return NextResponse.redirect(
          new URL(`/invite/wrong-account?token=${params.token}&expected=${invitation.email}`, request.url)
        )
      }
      
      // Correct account - redirect to acceptance page
      return NextResponse.redirect(new URL(`/invite/accept?token=${params.token}`, request.url))
    }

    // User not logged in - check if user exists
    const existingUser = await User.findOne({ email: invitation.email })
    
    if (existingUser) {
      // User exists - redirect to login with invitation token
      return NextResponse.redirect(
        new URL(`/login?invite=${params.token}&email=${invitation.email}`, request.url)
      )
    }

    // New user - redirect to signup with invitation
    return NextResponse.redirect(
      new URL(`/signup?invite=${params.token}&email=${invitation.email}`, request.url)
    )
  } catch (error) {
    console.error('Error checking invitation:', error)
    return NextResponse.redirect(new URL('/invite/error', request.url))
  }
}

// POST - Accept the invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB()

    const body = await request.json()
    const { email, password, name } = body

    // Find invitation
    const invitation = await TeamInvitation.findOne({
      token: params.token,
      status: 'pending'
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired'
      await invitation.save()
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Verify email matches
    if (email && email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 400 }
      )
    }

    // Get the business
    const business = await Business.findById(invitation.businessId)
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if user already exists
    let user = await User.findOne({ email: invitation.email })

    if (user) {
      // Existing user
      
      // Check if user already has a membership with this business
      const existingMembership = await BusinessMembership.findOne({
        userId: user._id,
        businessId: invitation.businessId
      })

      if (existingMembership) {
        // Already a member, just update role if needed
        if (existingMembership.role !== invitation.role) {
          existingMembership.role = invitation.role
          await existingMembership.save()
        }
      } else {
        // Create new membership for this business
        const membership = await BusinessMembership.create({
          userId: user._id,
          businessId: invitation.businessId,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          status: 'active',
          // Don't make it primary if user already has a business
          isPrimary: !user.businessId
        })

        // If user doesn't have a primary business, set this as primary
        if (!user.businessId) {
          user.businessId = invitation.businessId
          user.role = invitation.role
          await user.save()
        }
      }
    } else {
      // New user - create account
      if (!password || !name) {
        return NextResponse.json(
          { error: 'Name and password are required for new users' },
          { status: 400 }
        )
      }

      // Create new user
      user = await User.create({
        email: invitation.email,
        password,
        name,
        role: invitation.role,
        businessId: invitation.businessId,
        status: 'active',
        emailVerified: new Date(),
        metadata: {
          registrationSource: 'invitation'
        }
      })

      // Create membership for new user
      await BusinessMembership.create({
        userId: user._id,
        businessId: invitation.businessId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        status: 'active',
        isPrimary: true
      })
    }

    // Add user to business team members
    if (!business.teamMembers.includes(user._id)) {
      business.teamMembers.push(user._id)
    }

    // Set permissions
    if (invitation.permissions && invitation.permissions.length > 0) {
      business.permissions = business.permissions || new Map()
      business.permissions.set(user._id.toString(), invitation.permissions)
    }

    await business.save()

    // Mark invitation as accepted
    invitation.status = 'accepted'
    invitation.acceptedBy = user._id
    invitation.acceptedAt = new Date()
    await invitation.save()

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}