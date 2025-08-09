import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import PricingCalculation from '@/models/PricingCalculation';
import connectDB from '@/lib/saas/db';

/**
 * GET /api/geopricing/analytics
 * Retrieve analytics data for geopricing calculations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const businessId = (session.user as any).businessId;
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    await connectDB();
    
    // Build date range query
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    };
    
    let analytics: any = {};
    
    switch (type) {
      case 'summary':
        // Get overall summary statistics
        const [totalCalcs, zoneDistribution, performanceMetrics] = await Promise.all([
          PricingCalculation.countDocuments({
            businessId,
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }),
          PricingCalculation.getZoneDistribution(businessId, dateRange),
          PricingCalculation.getPerformanceMetrics(businessId, 100)
        ]);
        
        analytics = {
          totalCalculations: totalCalcs,
          zoneDistribution,
          performance: performanceMetrics[0] || {}
        };
        break;
        
      case 'zones':
        // Detailed zone analysis
        analytics = await PricingCalculation.aggregate([
          { 
            $match: { 
              businessId: new mongoose.Types.ObjectId(businessId),
              createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            }
          },
          {
            $group: {
              _id: '$zoneAssignment.matchedZone',
              count: { $sum: 1 },
              avgDriveTime: { $avg: '$driveTimeCalculation.result.driveTimeMinutes' },
              avgDistance: { $avg: '$driveTimeCalculation.result.distanceKm' },
              avgBasePrice: { $avg: '$pricing.basePrice' },
              avgFinalPrice: { $avg: '$pricing.finalPrice' },
              avgAdjustment: { $avg: '$pricing.adjustment.value' },
              totalRevenue: { $sum: '$pricing.finalPrice' },
              avgPropertySize: { $avg: '$customer.propertySize' }
            }
          },
          {
            $project: {
              zone: '$_id',
              _id: 0,
              count: 1,
              avgDriveTime: { $round: ['$avgDriveTime', 1] },
              avgDistance: { $round: ['$avgDistance', 1] },
              avgBasePrice: { $round: ['$avgBasePrice', 2] },
              avgFinalPrice: { $round: ['$avgFinalPrice', 2] },
              avgAdjustment: { $round: ['$avgAdjustment', 1] },
              totalRevenue: { $round: ['$totalRevenue', 2] },
              avgPropertySize: { $round: ['$avgPropertySize', 0] }
            }
          },
          { $sort: { zone: 1 } }
        ]);
        break;
        
      case 'performance':
        // Performance metrics over time
        analytics = await PricingCalculation.aggregate([
          { 
            $match: { 
              businessId: new mongoose.Types.ObjectId(businessId),
              createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
              },
              count: { $sum: 1 },
              avgTotalTime: { $avg: '$totalProcessingTime' },
              avgGeocoding: { $avg: '$breakdownTimes.geocoding' },
              avgDriveTimeApi: { $avg: '$breakdownTimes.driveTimeApi' },
              avgPriceCalc: { $avg: '$breakdownTimes.priceCalculation' },
              cacheHitRate: {
                $avg: { $cond: ['$driveTimeCalculation.fromCache', 1, 0] }
              }
            }
          },
          {
            $project: {
              date: '$_id.date',
              _id: 0,
              count: 1,
              avgTotalTime: { $round: ['$avgTotalTime', 0] },
              avgGeocoding: { $round: ['$avgGeocoding', 0] },
              avgDriveTimeApi: { $round: ['$avgDriveTimeApi', 0] },
              avgPriceCalc: { $round: ['$avgPriceCalc', 0] },
              cacheHitRate: { $round: [{ $multiply: ['$cacheHitRate', 100] }, 1] }
            }
          },
          { $sort: { date: 1 } }
        ]);
        break;
        
      case 'conversions':
        // Conversion analytics
        const [total, quoted, converted] = await Promise.all([
          PricingCalculation.countDocuments({
            businessId,
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }),
          PricingCalculation.countDocuments({
            businessId,
            status: 'quoted',
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }),
          PricingCalculation.countDocuments({
            businessId,
            status: 'converted',
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          })
        ]);
        
        analytics = {
          totalCalculations: total,
          quotesGenerated: quoted,
          conversions: converted,
          quoteRate: total > 0 ? (quoted / total * 100).toFixed(1) : 0,
          conversionRate: quoted > 0 ? (converted / quoted * 100).toFixed(1) : 0
        };
        break;
        
      case 'heatmap':
        // Geographic distribution for heatmap
        analytics = await PricingCalculation.aggregate([
          { 
            $match: { 
              businessId: new mongoose.Types.ObjectId(businessId),
              createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            }
          },
          {
            $group: {
              _id: {
                lat: { $round: ['$customer.coordinates.lat', 2] },
                lng: { $round: ['$customer.coordinates.lng', 2] }
              },
              count: { $sum: 1 },
              avgPrice: { $avg: '$pricing.finalPrice' },
              zone: { $first: '$zoneAssignment.matchedZone' }
            }
          },
          {
            $project: {
              _id: 0,
              lat: '$_id.lat',
              lng: '$_id.lng',
              count: 1,
              avgPrice: { $round: ['$avgPrice', 2] },
              zone: 1
            }
          }
        ]);
        break;
    }
    
    return NextResponse.json({
      success: true,
      type,
      dateRange,
      data: analytics
    });
    
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analytics' },
      { status: 500 }
    );
  }
}

// Import mongoose for aggregation
import mongoose from 'mongoose';