import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import GeopricingConfig from '@/models/GeopricingConfig';
import connectDB from '@/lib/saas/db';

/**
 * GET /api/geopricing/config
 * Retrieve current configuration
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
    
    await connectDB();
    
    // Get active configuration
    const config = await GeopricingConfig.getActiveConfig(businessId);
    
    if (!config) {
      return NextResponse.json({
        success: false,
        message: 'No active configuration found'
      });
    }
    
    return NextResponse.json({
      success: true,
      config: {
        id: config._id,
        version: config.version,
        effectiveDate: config.effectiveDate,
        expiryDate: config.expiryDate,
        pricing: config.pricing,
        shopLocation: config.shopLocation,
        zones: config.zones,
        apiSettings: config.apiSettings,
        businessRules: config.businessRules,
        isActive: config.isActive
      }
    });
    
  } catch (error: any) {
    console.error('Config retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/geopricing/config
 * Create or update configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const businessId = (session.user as any).businessId;
    const userId = (session.user as any).id;
    
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.pricing?.baseRatePer1000SqFt || !body.shopLocation?.address) {
      return NextResponse.json(
        { error: 'Missing required configuration fields' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Deactivate previous configurations
    await GeopricingConfig.updateMany(
      { businessId, isActive: true },
      { isActive: false }
    );
    
    // Create new configuration
    const config = await GeopricingConfig.create({
      businessId,
      pricing: {
        baseRatePer1000SqFt: body.pricing.baseRatePer1000SqFt,
        currency: body.pricing.currency || 'CAD',
        minimumCharge: body.pricing.minimumCharge || 50,
        serviceRates: body.pricing.serviceRates
      },
      shopLocation: {
        address: body.shopLocation.address,
        coordinates: {
          lat: body.shopLocation.lat,
          lng: body.shopLocation.lng
        },
        city: body.shopLocation.city,
        province: body.shopLocation.province || 'ON',
        country: body.shopLocation.country || 'Canada',
        postalCode: body.shopLocation.postalCode
      },
      zones: body.zones || {
        close: {
          name: 'Close Proximity',
          driveTimeThreshold: { min: 0, max: 5 },
          adjustmentType: 'percentage',
          adjustmentValue: -5,
          description: 'Quick service with minimal travel time',
          color: 'green'
        },
        standard: {
          name: 'Standard Service',
          driveTimeThreshold: { min: 5, max: 20 },
          adjustmentType: 'percentage',
          adjustmentValue: 0,
          description: 'Regular service area with standard pricing',
          color: 'blue'
        },
        extended: {
          name: 'Extended Service',
          driveTimeThreshold: { min: 20, max: 999999 },
          adjustmentType: 'percentage',
          adjustmentValue: 10,
          description: 'Distant locations requiring additional travel time',
          color: 'red'
        }
      },
      apiSettings: {
        trafficModel: body.apiSettings?.trafficModel || 'best_guess',
        avoidHighways: body.apiSettings?.avoidHighways || false,
        avoidTolls: body.apiSettings?.avoidTolls || false,
        cacheDuration: body.apiSettings?.cacheDuration || 15
      },
      businessRules: {
        allowManualOverride: body.businessRules?.allowManualOverride !== false,
        requireApprovalAboveThreshold: body.businessRules?.requireApprovalAboveThreshold,
        autoExpireQuotesAfterDays: body.businessRules?.autoExpireQuotesAfterDays || 30,
        roundPriceTo: body.businessRules?.roundPriceTo || 0.01,
        includeTrafficInCalculation: body.businessRules?.includeTrafficInCalculation !== false
      },
      isActive: true,
      effectiveDate: body.effectiveDate || new Date(),
      expiryDate: body.expiryDate,
      createdBy: userId
    });
    
    return NextResponse.json({
      success: true,
      config: {
        id: config._id,
        version: config.version,
        effectiveDate: config.effectiveDate
      }
    });
    
  } catch (error: any) {
    console.error('Config creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/geopricing/config
 * Update zone thresholds and adjustments
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const businessId = (session.user as any).businessId;
    const userId = (session.user as any).id;
    
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 });
    }
    
    const body = await request.json();
    
    await connectDB();
    
    // Get current active config
    const config = await GeopricingConfig.getActiveConfig(businessId);
    
    if (!config) {
      return NextResponse.json(
        { error: 'No active configuration found' },
        { status: 404 }
      );
    }
    
    // Update specific fields
    if (body.pricing) {
      Object.assign(config.pricing, body.pricing);
    }
    
    if (body.zones) {
      if (body.zones.close) Object.assign(config.zones.close, body.zones.close);
      if (body.zones.standard) Object.assign(config.zones.standard, body.zones.standard);
      if (body.zones.extended) Object.assign(config.zones.extended, body.zones.extended);
    }
    
    if (body.businessRules) {
      Object.assign(config.businessRules, body.businessRules);
    }
    
    config.lastModifiedBy = userId;
    await config.save();
    
    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        id: config._id,
        version: config.version,
        updatedAt: config.updatedAt
      }
    });
    
  } catch (error: any) {
    console.error('Config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}