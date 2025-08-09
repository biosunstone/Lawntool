import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import ZipCodePricing from '@/models/ZipCodePricing';
import connectDB from '@/lib/saas/db';

/**
 * GET /api/zipcode-pricing/config
 * Retrieve current ZIP code pricing configuration
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
    const config = await ZipCodePricing.getActiveConfig(businessId);
    
    if (!config) {
      return NextResponse.json({
        success: false,
        message: 'No active ZIP code pricing configuration found'
      });
    }
    
    return NextResponse.json({
      success: true,
      config: {
        id: config._id,
        version: config.version,
        effectiveDate: config.effectiveDate,
        baseRatePer1000SqFt: config.baseRatePer1000SqFt,
        currency: config.currency,
        minimumCharge: config.minimumCharge,
        serviceZipCodes: config.serviceZipCodes,
        noServiceMessage: config.noServiceMessage,
        contactSalesLink: config.contactSalesLink,
        displaySettings: config.displaySettings,
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
 * POST /api/zipcode-pricing/config
 * Create or update ZIP code pricing configuration
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
    if (!body.baseRatePer1000SqFt || !body.serviceZipCodes || body.serviceZipCodes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required configuration fields' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Deactivate previous configurations
    await ZipCodePricing.updateMany(
      { businessId, isActive: true },
      { isActive: false }
    );
    
    // Create new configuration
    const config = await ZipCodePricing.create({
      businessId,
      baseRatePer1000SqFt: body.baseRatePer1000SqFt,
      currency: body.currency || 'USD',
      minimumCharge: body.minimumCharge || 50,
      serviceZipCodes: body.serviceZipCodes,
      noServiceMessage: body.noServiceMessage || 'Sorry, we do not currently service this ZIP code.',
      contactSalesLink: body.contactSalesLink,
      displaySettings: body.displaySettings || {
        showAllZones: true,
        highlightCustomerZone: true,
        discountColor: '#16a34a',
        surchargeColor: '#dc2626',
        baseRateColor: '#000000'
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
 * PUT /api/zipcode-pricing/config
 * Update specific ZIP code rules
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
    const config = await ZipCodePricing.getActiveConfig(businessId);
    
    if (!config) {
      return NextResponse.json(
        { error: 'No active configuration found' },
        { status: 404 }
      );
    }
    
    // Update specific fields
    if (body.baseRatePer1000SqFt !== undefined) {
      config.baseRatePer1000SqFt = body.baseRatePer1000SqFt;
    }
    
    if (body.serviceZipCodes) {
      config.serviceZipCodes = body.serviceZipCodes;
    }
    
    if (body.displaySettings) {
      Object.assign(config.displaySettings, body.displaySettings);
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

/**
 * DELETE /api/zipcode-pricing/config/:zipCode
 * Remove a specific ZIP code from service area
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const businessId = (session.user as any).businessId;
    const searchParams = request.nextUrl.searchParams;
    const zipCode = searchParams.get('zipCode');
    
    if (!businessId || !zipCode) {
      return NextResponse.json(
        { error: 'Business ID and ZIP code required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const config = await ZipCodePricing.getActiveConfig(businessId);
    
    if (!config) {
      return NextResponse.json(
        { error: 'No active configuration found' },
        { status: 404 }
      );
    }
    
    // Remove the ZIP code
    config.serviceZipCodes = config.serviceZipCodes.filter(
      (rule: any) => rule.zipCode !== zipCode.toUpperCase()
    );
    
    await config.save();
    
    return NextResponse.json({
      success: true,
      message: `ZIP code ${zipCode} removed from service area`
    });
    
  } catch (error: any) {
    console.error('ZIP code deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to remove ZIP code' },
      { status: 500 }
    );
  }
}