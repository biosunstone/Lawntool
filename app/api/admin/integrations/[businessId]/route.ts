import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/saas/db';
import Integration from '@/models/Integration';

export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    await connectDB();
    
    const { businessId } = params;
    
    // Find or create integration for this business
    let integration = await Integration.findOne({ businessId });
    
    if (!integration) {
      // Create default integration
      const mongoose = require('mongoose');
      integration = await Integration.create({
        businessId: new mongoose.Types.ObjectId(businessId),
        zapier: {
          enabled: false,
          apiKeys: [],
          webhooks: []
        },
        stats: {
          totalApiCalls: 0,
          totalWebhooksSent: 0
        },
        settings: {
          allowExternalAccess: true,
          rateLimitPerHour: 1000
        },
        createdBy: new mongoose.Types.ObjectId(businessId) // Use businessId as placeholder
      });
    }
    
    return NextResponse.json({
      success: true,
      integration
    });
    
  } catch (error: any) {
    console.error('Error fetching integration:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}