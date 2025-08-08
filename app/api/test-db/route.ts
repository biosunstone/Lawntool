import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import Subscription from '@/models/Subscription'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await connectDB()
    
    // Count documents in each collection
    const userCount = await User.countDocuments()
    const businessCount = await Business.countDocuments()
    const subscriptionCount = await Subscription.countDocuments()
    
    return NextResponse.json({
      status: 'Database connection successful',
      collections: {
        users: userCount,
        businesses: businessCount,
        subscriptions: subscriptionCount,
      },
      mongoStatus: 'Connected'
    })
  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        message: error.message,
        mongoStatus: 'Disconnected'
      },
      { status: 500 }
    )
  }
}