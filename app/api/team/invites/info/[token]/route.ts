import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import TeamInvitation from '@/models/TeamInvitation'

// GET invitation details by token
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
    })
      .populate('businessId', 'name')
      .populate('invitedBy', 'name')

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
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

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        businessName: invitation.businessId?.name || 'Unknown Business',
        invitedBy: invitation.invitedBy?.name || 'Unknown',
        expiresAt: invitation.expiresAt,
        permissions: invitation.permissions
      }
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}