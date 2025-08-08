import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import TeamInvitation from '@/models/TeamInvitation'
import { sendMail as sendEmail } from '@/lib/saas/email-service'

export async function POST(
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

    // Check if user has permission to resend invitations
    if (!['admin', 'business_owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the invitation
    const invitation = await TeamInvitation.findById(params.id)
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Verify the invitation belongs to the user's business
    if (invitation.businessId.toString() !== user.businessId?.toString()) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only resend pending invitations' },
        { status: 400 }
      )
    }

    // Update expiration date
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await invitation.save()

    // Get business details
    const business = await Business.findById(user.businessId)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Resend invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/api/team/invites/accept/${invitation.token}`
    
    try {
      await sendEmail({
        to: invitation.email,
        subject: `Reminder: You're invited to join ${business.name} on Sunstone Digital Tech`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Team Invitation Reminder</h2>
            <p>Hi there,</p>
            <p>This is a reminder that ${user.name} has invited you to join <strong>${business.name}</strong> on Sunstone Digital Tech as a ${invitation.role.replace('_', ' ')}.</p>
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
      console.error('Failed to resend invitation email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
    })
  } catch (error) {
    console.error('Error resending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}