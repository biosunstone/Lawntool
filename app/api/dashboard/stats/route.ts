import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import Measurement from '@/models/Measurement'
import Quote from '@/models/Quote'
import Customer from '@/models/Customer'

export const dynamic = 'force-dynamic'; // disables static generation

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }

    await connectDB()

    // Get today's measurements
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const measurementsToday = await Measurement.countDocuments({
      businessId,
      createdAt: { $gte: today }
    })

    // Get this month's quotes
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const quotesThisMonth = await Quote.countDocuments({
      businessId,
      createdAt: { $gte: firstDayOfMonth }
    })

    // Get total customers
    const totalCustomers = await Customer.countDocuments({ businessId })

    // Calculate revenue (accepted quotes this month)
    const acceptedQuotes = await Quote.find({
      businessId,
      status: 'accepted',
      createdAt: { $gte: firstDayOfMonth }
    })
    const revenue = acceptedQuotes.reduce((sum, quote) => sum + quote.total, 0)

    // Get recent activity
    const recentMeasurements = await Measurement.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('address createdAt')

    const recentQuotes = await Quote.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('customerId', 'name')
      .select('quoteNumber customerId createdAt')

    const recentActivity = [
      ...recentMeasurements.map(m => ({
        id: m._id.toString(),
        type: 'measurement',
        description: `Measured property at ${m.address}`,
        time: formatTimeAgo(m.createdAt)
      })),
      ...recentQuotes.map(q => ({
        id: q._id.toString(),
        type: 'quote',
        description: `Created quote ${q.quoteNumber} for ${(q.customerId as any)?.name || 'Unknown'}`,
        time: formatTimeAgo(q.createdAt)
      }))
    ]
      .sort((a, b) => {
        const aTime = recentMeasurements.find(m => m._id.toString() === a.id)?.createdAt ||
                      recentQuotes.find(q => q._id.toString() === a.id)?.createdAt || new Date()
        const bTime = recentMeasurements.find(m => m._id.toString() === b.id)?.createdAt ||
                      recentQuotes.find(q => q._id.toString() === b.id)?.createdAt || new Date()
        return bTime.getTime() - aTime.getTime()
      })
      .slice(0, 5)

    return NextResponse.json({
      measurementsToday,
      quotesThisMonth,
      totalCustomers,
      revenue,
      recentActivity
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString()
}