import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import TeamInvitation from '@/models/TeamInvitation'
import Subscription from '@/models/Subscription'
import { sendMail as sendEmail } from '@/lib/saas/email-service'

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

    // Check if user has permission to view invitations
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all invitations for the business
    const invitations = await TeamInvitation.find({
      businessId: user.businessId,
    })
      .populate('invitedBy', 'name email')
      .sort('-createdAt')

    // Check and update expired invitations
    const now = new Date()
    for (const invitation of invitations) {
      if (invitation.status === 'pending' && invitation.expiresAt < now) {
        invitation.status = 'expired'
        await invitation.save()
      }
    }

    return NextResponse.json({
      success: true,
      invitations,
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Team invite endpoint called')
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Connecting to database...')
    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user || !user.businessId) {
      console.log('User not found or no businessId:', { email: session.user.email, hasUser: !!user, hasBusinessId: !!user?.businessId })
      return NextResponse.json({ error: 'User not found or not associated with a business' }, { status: 404 })
    }
    
    console.log('User found:', { userId: user._id, businessId: user.businessId })

    // Check if user has permission to send invitations
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
      console.log('Request body:', body)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    const { email, role, permissions, sendEmail: shouldSendEmail } = body

    // Validate input
    if (!email || !role) {
      console.log('Missing required fields:', { email, role })
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      // If user exists and belongs to the same business, they're already a member
      if (existingUser.businessId?.toString() === user.businessId.toString()) {
        return NextResponse.json(
          { error: 'User is already a team member' },
          { status: 400 }
        )
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await TeamInvitation.findOne({
      businessId: user.businessId,
      email,
      status: 'pending',
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Check team member limit
    const business = await Business.findById(user.businessId)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const subscription = await Subscription.findOne({ businessId: user.businessId })
    const teamLimit = subscription?.features?.teamMembers || 1
    const currentTeamSize = await User.countDocuments({
      businessId: user.businessId,
      status: { $ne: 'deleted' },
    })
    const pendingInvitations = await TeamInvitation.countDocuments({
      businessId: user.businessId,
      status: 'pending',
    })

    if (teamLimit !== -1 && currentTeamSize + pendingInvitations >= teamLimit) {
      return NextResponse.json(
        { error: 'Team member limit reached. Please upgrade your plan.' },
        { status: 403 }
      )
    }

    // Create invitation
    let invitation
    try {
      invitation = await TeamInvitation.create({
        businessId: user.businessId,
        email,
        role,
        permissions: permissions || [],
        invitedBy: user._id,
        status: 'pending',
      })
    } catch (createError: any) {
      console.error('Error creating TeamInvitation:', createError)
      return NextResponse.json(
        { error: 'Failed to create invitation. Database error.', details: createError?.message },
        { status: 500 }
      )
    }

    // Send invitation email if requested
    if (shouldSendEmail !== false) {
      const inviteUrl = `${process.env.NEXTAUTH_URL}/api/team/invites/accept/${invitation.token}`
      
      try {
        await sendEmail({
          to: email,
          subject: `You're invited to join ${business.name} on Sunstone Digital Tech`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Team Invitation</h2>
              <p>Hi there,</p>
              <p>${user.name} has invited you to join <strong>${business.name}</strong> on Sunstone Digital Tech as a ${role.replace('_', ' ')}.</p>
              <p>Click the link below to accept the invitation:</p>
              <p style="margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #00A651; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Accept Invitation
                </a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
              <p>This invitation will expire in 7 days.</p>
              <p>Best regards,<br>The Sunstone Digital Tech Team</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Don't fail the whole request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      invitation: {
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error: any) {
    console.error('Error in invitation creation endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create invitation',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}