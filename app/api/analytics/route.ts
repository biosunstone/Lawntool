import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import Measurement from '@/models/Measurement'
import Quote from '@/models/Quote'
import Customer from '@/models/Customer'
import PricingRule from '@/models/PricingRule'

export const dynamic = 'force-dynamic'

// GET /api/analytics - Get analytics data
export async function GET(req: NextRequest) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const searchParams = req.nextUrl.searchParams
    const period = searchParams.get('period') || '30' // days
    const type = searchParams.get('type') || 'overview'

    const businessId = session.user.businessId
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    let analyticsData: any = {}

    switch (type) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(businessId, startDate)
        break
      case 'revenue':
        analyticsData = await getRevenueAnalytics(businessId, startDate)
        break
      case 'customers':
        analyticsData = await getCustomerAnalytics(businessId, startDate)
        break
      case 'performance':
        analyticsData = await getPerformanceAnalytics(businessId, startDate)
        break
      default:
        analyticsData = await getOverviewAnalytics(businessId, startDate)
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

async function getOverviewAnalytics(businessId: string, startDate: Date) {
  const [
    totalMeasurements,
    totalQuotes,
    acceptedQuotes,
    totalCustomers,
    newCustomers,
    revenueData,
    topServices,
    conversionRate
  ] = await Promise.all([
    // Total measurements
    Measurement.countDocuments({ 
      businessId, 
      createdAt: { $gte: startDate } 
    }),
    
    // Total quotes
    Quote.countDocuments({ 
      businessId, 
      createdAt: { $gte: startDate } 
    }),
    
    // Accepted quotes
    Quote.countDocuments({ 
      businessId, 
      status: 'accepted',
      createdAt: { $gte: startDate } 
    }),
    
    // Total customers
    Customer.countDocuments({ businessId }),
    
    // New customers
    Customer.countDocuments({ 
      businessId, 
      createdAt: { $gte: startDate } 
    }),
    
    // Revenue data
    Quote.aggregate([
      { 
        $match: { 
          businessId,
          status: 'accepted',
          createdAt: { $gte: startDate }
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { $sum: '$total' },
          avgQuoteValue: { $avg: '$total' },
          count: { $sum: 1 }
        } 
      }
    ]),
    
    // Top services
    Quote.aggregate([
      { 
        $match: { 
          businessId,
          createdAt: { $gte: startDate }
        } 
      },
      { $unwind: '$services' },
      { 
        $group: { 
          _id: '$services.name',
          revenue: { $sum: '$services.totalPrice' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]),
    
    // Conversion rate
    Quote.aggregate([
      { 
        $match: { 
          businessId,
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          }
        }
      }
    ])
  ])

  const revenue = revenueData[0] || { totalRevenue: 0, avgQuoteValue: 0, count: 0 }
  const conversion = conversionRate[0] || { total: 0, accepted: 0 }
  const conversionPercentage = conversion.total > 0 
    ? ((conversion.accepted / conversion.total) * 100).toFixed(1)
    : '0'

  return {
    overview: {
      totalMeasurements,
      totalQuotes,
      acceptedQuotes,
      totalCustomers,
      newCustomers,
      totalRevenue: revenue.totalRevenue,
      avgQuoteValue: revenue.avgQuoteValue,
      conversionRate: parseFloat(conversionPercentage)
    },
    topServices,
    period: {
      startDate,
      endDate: new Date()
    }
  }
}

async function getRevenueAnalytics(businessId: string, startDate: Date) {
  // Daily revenue trend
  const dailyRevenue = await Quote.aggregate([
    {
      $match: {
        businessId,
        status: 'accepted',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$total' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ])

  // Revenue by service type
  const revenueByService = await Quote.aggregate([
    {
      $match: {
        businessId,
        status: 'accepted',
        createdAt: { $gte: startDate }
      }
    },
    { $unwind: '$services' },
    {
      $group: {
        _id: '$services.name',
        revenue: { $sum: '$services.totalPrice' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$services.totalPrice' }
      }
    },
    { $sort: { revenue: -1 } }
  ])

  // Revenue by customer segment
  const revenueByCustomer = await Quote.aggregate([
    {
      $match: {
        businessId,
        status: 'accepted',
        createdAt: { $gte: startDate }
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: '$customer' },
    { $unwind: { path: '$customer.tags', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$customer.tags',
        revenue: { $sum: '$total' },
        count: { $sum: 1 }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 }
  ])

  return {
    dailyRevenue,
    revenueByService,
    revenueByCustomer,
    summary: {
      totalRevenue: dailyRevenue.reduce((sum, day) => sum + day.revenue, 0),
      totalTransactions: dailyRevenue.reduce((sum, day) => sum + day.count, 0),
      avgDailyRevenue: dailyRevenue.length > 0 
        ? dailyRevenue.reduce((sum, day) => sum + day.revenue, 0) / dailyRevenue.length
        : 0
    }
  }
}

async function getCustomerAnalytics(businessId: string, startDate: Date) {
  // Customer acquisition trend
  const customerGrowth = await Customer.aggregate([
    {
      $match: {
        businessId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        newCustomers: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ])

  // Customer lifetime value
  const customerLTV = await Customer.aggregate([
    { $match: { businessId } },
    {
      $lookup: {
        from: 'quotes',
        let: { customerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$customerId', '$$customerId'] },
                  { $eq: ['$status', 'accepted'] }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              quoteCount: { $sum: 1 }
            }
          }
        ],
        as: 'revenue'
      }
    },
    { $unwind: { path: '$revenue', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        avgLTV: { $avg: '$revenue.totalRevenue' },
        totalCustomers: { $sum: 1 },
        payingCustomers: {
          $sum: { $cond: [{ $gt: ['$revenue.totalRevenue', 0] }, 1, 0] }
        }
      }
    }
  ])

  // Top customers
  const topCustomers = await Customer.aggregate([
    { $match: { businessId } },
    {
      $lookup: {
        from: 'quotes',
        let: { customerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$customerId', '$$customerId'] },
                  { $eq: ['$status', 'accepted'] }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              quoteCount: { $sum: 1 }
            }
          }
        ],
        as: 'revenue'
      }
    },
    { $unwind: { path: '$revenue', preserveNullAndEmptyArrays: true } },
    { $match: { 'revenue.totalRevenue': { $gt: 0 } } },
    {
      $project: {
        name: 1,
        email: 1,
        totalRevenue: '$revenue.totalRevenue',
        quoteCount: '$revenue.quoteCount'
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 }
  ])

  return {
    customerGrowth,
    customerLTV: customerLTV[0] || { avgLTV: 0, totalCustomers: 0, payingCustomers: 0 },
    topCustomers,
    retentionRate: customerLTV[0] 
      ? ((customerLTV[0].payingCustomers / customerLTV[0].totalCustomers) * 100).toFixed(1)
      : '0'
  }
}

async function getPerformanceAnalytics(businessId: string, startDate: Date) {
  // Quote response time
  const responseTime = await Quote.aggregate([
    {
      $match: {
        businessId,
        respondedAt: { $exists: true },
        createdAt: { $gte: startDate }
      }
    },
    {
      $project: {
        responseTime: {
          $divide: [
            { $subtract: ['$respondedAt', '$createdAt'] },
            1000 * 60 * 60 // Convert to hours
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' }
      }
    }
  ])

  // Service area coverage
  const serviceAreas = await Measurement.aggregate([
    {
      $match: {
        businessId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $substr: ['$address', 0, 5] // Group by first 5 chars (rough ZIP approximation)
        },
        count: { $sum: 1 },
        totalArea: { $sum: '$measurements.totalArea' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ])

  // Pricing rule effectiveness
  const pricingRuleStats = await PricingRule.aggregate([
    { $match: { businessId } },
    {
      $project: {
        name: 1,
        type: 1,
        appliedCount: 1,
        isActive: 1,
        effectiveness: {
          $cond: [
            { $gt: ['$appliedCount', 0] },
            '$appliedCount',
            0
          ]
        }
      }
    },
    { $sort: { effectiveness: -1 } }
  ])

  // Measurement to quote conversion
  const conversionFunnel = await Measurement.aggregate([
    {
      $match: {
        businessId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $lookup: {
        from: 'quotes',
        localField: '_id',
        foreignField: 'measurementId',
        as: 'quotes'
      }
    },
    {
      $project: {
        hasQuote: { $gt: [{ $size: '$quotes' }, 0] },
        acceptedQuote: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$quotes',
                  as: 'quote',
                  cond: { $eq: ['$$quote.status', 'accepted'] }
                }
              }
            },
            0
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        totalMeasurements: { $sum: 1 },
        measurementsWithQuotes: {
          $sum: { $cond: ['$hasQuote', 1, 0] }
        },
        measurementsWithAcceptedQuotes: {
          $sum: { $cond: ['$acceptedQuote', 1, 0] }
        }
      }
    }
  ])

  return {
    responseTime: responseTime[0] || { avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0 },
    serviceAreas,
    pricingRuleStats,
    conversionFunnel: conversionFunnel[0] || {
      totalMeasurements: 0,
      measurementsWithQuotes: 0,
      measurementsWithAcceptedQuotes: 0
    }
  }
}