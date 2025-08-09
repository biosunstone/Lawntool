import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/saas/db';
import GeofencingConfig from '@/models/GeofencingConfig';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { _id, ...updateData } = body;
    
    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Configuration ID is required' },
        { status: 400 }
      );
    }
    
    // Update the configuration
    const updatedConfig = await GeofencingConfig.findByIdAndUpdate(
      _id,
      {
        ...updateData,
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
    console.error('Error updating geofencing config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update configuration' },
      { status: 500 }
    );
  }
}