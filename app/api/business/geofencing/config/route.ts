import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import connectDB from '@/lib/saas/db';
import GeofencingConfig from '@/models/GeofencingConfig';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    // Get the user's business ID from session
    const businessId = (session.user as any).businessId || (session.user as any).selectedBusinessId;
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'No business associated with user' },
        { status: 400 }
      );
    }
    
    // Get the configuration for this business
    const config = await GeofencingConfig.findOne({
      businessId,
      isActive: true
    });
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'No configuration found for this business' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      config
    });
    
  } catch (error: any) {
    console.error('Error fetching business config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}