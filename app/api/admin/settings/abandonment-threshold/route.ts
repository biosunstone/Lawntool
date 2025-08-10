import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import connectDB from '@/lib/saas/db'
import { authOptions } from '@/lib/saas/auth'
export const dynamic = 'force-dynamic';

// Store threshold in memory (in production, use database)
let ABANDONMENT_THRESHOLD_MINUTES = 15

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      threshold: ABANDONMENT_THRESHOLD_MINUTES,
      unit: 'minutes'
    })
  } catch (error) {
    console.error('Error fetching abandonment threshold:', error)
    return NextResponse.json(
      { error: 'Failed to fetch threshold' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threshold } = await request.json()

    // Validate threshold
    if (typeof threshold !== 'number' || threshold < 5 || threshold > 120) {
      return NextResponse.json(
        { error: 'Invalid threshold. Must be between 5 and 120 minutes.' },
        { status: 400 }
      )
    }

    // Update threshold
    ABANDONMENT_THRESHOLD_MINUTES = threshold

    // In production, save to database
    // await SystemSettings.updateOne(
    //   { key: 'abandonment_threshold' },
    //   { value: threshold },
    //   { upsert: true }
    // )

    // Update the cron job with new threshold
    updateCronJobThreshold(threshold)

    return NextResponse.json({
      success: true,
      threshold: ABANDONMENT_THRESHOLD_MINUTES,
      message: `Abandonment threshold updated to ${threshold} minutes`
    })
  } catch (error) {
    console.error('Error updating abandonment threshold:', error)
    return NextResponse.json(
      { error: 'Failed to update threshold' },
      { status: 500 }
    )
  }
}

// Helper function to update cron job threshold
function updateCronJobThreshold(minutes: number) {
  // Export the threshold for use in cron job
  process.env.ABANDONMENT_THRESHOLD_MINUTES = minutes.toString()
  
  console.log(`✅ Abandonment threshold updated to ${minutes} minutes`)
}

// Helper function for internal use (not exported as route handler)
function getAbandonmentThreshold(): number {
  return ABANDONMENT_THRESHOLD_MINUTES
}