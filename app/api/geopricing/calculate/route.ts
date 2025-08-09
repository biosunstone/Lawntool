import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import { 
  calculateGeopricing, 
  ServiceItem 
} from '@/lib/geopricing/pricingEngine';
import connectDB from '@/lib/saas/db';

export async function POST(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);
    
    // Allow both authenticated and public access for demo
    const businessId = (session?.user as any)?.businessId || 
                      request.headers.get('x-business-id') ||
                      '68979e9cdc69bf60a36742b4'; // Default Toronto business for demo
    
    const body = await request.json();
    const {
      customerAddress,
      services,
      trafficModel,
      preferredShopId,
      useCache = true
    } = body;
    
    if (!customerAddress) {
      return NextResponse.json(
        { error: 'Customer address is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Parse services if provided
    let serviceItems: ServiceItem[] | undefined;
    if (services && Array.isArray(services)) {
      serviceItems = services.map(s => ({
        type: s.type || s.name || 'lawn',
        area: s.area || 0,
        customRate: s.customRate
      }));
    }
    
    // Calculate geopricing
    const calculation = await calculateGeopricing(
      businessId,
      customerAddress,
      serviceItems,
      {
        useCache,
        trafficModel,
        preferredShopId
      }
    );
    
    // Format response
    return NextResponse.json({
      success: true,
      calculation,
      summary: {
        shopLocation: calculation.shopLocation.name,
        driveTime: `${calculation.driveTime.minutes} minutes`,
        distance: calculation.driveTime.distanceText,
        zone: calculation.zone.name,
        adjustment: `${calculation.zone.adjustment}%`,
        baseRate: calculation.pricing.baseRate,
        adjustedRate: calculation.pricing.adjustedRate,
        totalPrice: calculation.services ? 
          Object.values(calculation.services).reduce((sum, s) => sum + s.adjustedPrice, 0) : 
          null
      }
    });
    
  } catch (error: any) {
    console.error('Geopricing calculation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate pricing',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check service availability
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const businessId = searchParams.get('businessId') || '68979e9cdc69bf60a36742b4';
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Quick check if service is available
    try {
      const calculation = await calculateGeopricing(
        businessId,
        address,
        undefined,
        { useCache: true }
      );
      
      return NextResponse.json({
        available: true,
        shopLocation: calculation.shopLocation,
        estimatedDriveTime: calculation.driveTime.minutes,
        zone: calculation.zone.name
      });
      
    } catch (error: any) {
      if (error.message.includes('No service available')) {
        return NextResponse.json({
          available: false,
          message: 'Service not available in your area'
        });
      }
      throw error;
    }
    
  } catch (error: any) {
    console.error('Service availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check service availability' },
      { status: 500 }
    );
  }
}