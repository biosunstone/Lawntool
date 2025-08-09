import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/saas/db';
import GeofencingConfig from '@/models/GeofencingConfig';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get all geofencing configurations with business info
    const configs = await GeofencingConfig.find({ isActive: true })
      .populate('businessId', 'name')
      .sort({ createdAt: -1 });
    
    // Format the configurations
    const formattedConfigs = configs.map(config => ({
      _id: config._id,
      businessId: config.businessId._id,
      businessName: (config.businessId as any).name,
      shopLocation: config.shopLocation,
      baseRatePer1000SqFt: config.baseRatePer1000SqFt,
      currency: config.currency,
      minimumCharge: config.minimumCharge,
      zones: config.zones,
      serviceRules: config.serviceRules,
      maxServiceDistanceMinutes: config.maxServiceDistanceMinutes,
      isActive: config.isActive
    }));
    
    return NextResponse.json({
      success: true,
      configs: formattedConfigs
    });
    
  } catch (error: any) {
    console.error('Error fetching geofencing configs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}