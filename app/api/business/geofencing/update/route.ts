import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import connectDB from '@/lib/saas/db';
import GeofencingConfig from '@/models/GeofencingConfig';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    const body = await request.json();
    const businessId = (session.user as any).businessId || (session.user as any).selectedBusinessId;
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'No business associated with user' },
        { status: 400 }
      );
    }
    
    // Ensure user can only update their own business config
    if (body.businessId && body.businessId.toString() !== businessId.toString()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this configuration' },
        { status: 403 }
      );
    }
    
    // Only allow updating certain fields for business owners
    const allowedUpdates = {
      baseRatePer1000SqFt: body.baseRatePer1000SqFt,
      minimumCharge: body.minimumCharge,
      maxServiceDistanceMinutes: body.maxServiceDistanceMinutes,
      shopLocation: body.shopLocation,
      currency: body.currency
    };
    
    // Update the configuration
    const updatedConfig = await GeofencingConfig.findOneAndUpdate(
      { businessId, isActive: true },
      {
        ...allowedUpdates,
        lastModifiedBy: session.user.id,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedConfig) {
      return NextResponse.json(
        { success: false, error: 'Configuration not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      config: updatedConfig
    });
    
  } catch (error: any) {
    console.error('Error updating business config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update configuration' },
      { status: 500 }
    );
  }
}