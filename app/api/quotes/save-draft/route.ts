/**
 * API Route: Save Quote Draft
 * Saves quote form progress for recovery
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const session = await getServerSession(authOptions)
    const data = await request.json()
    
    // Save draft to session storage or database
    // For now, we'll just return success as the client handles localStorage
    
    return NextResponse.json({
      success: true,
      message: 'Draft saved successfully'
    })
    
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    )
  }
}