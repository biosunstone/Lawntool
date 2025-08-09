import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import connectDB from '@/lib/saas/db';
import Integration from '@/models/Integration';

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
    
    // Get the integration for this business
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
        createdBy: new mongoose.Types.ObjectId(session.user.id)
      });
    }
    
    // Mask full API keys for security
    const maskedIntegration = {
      ...integration.toObject(),
      zapier: {
        ...integration.zapier,
        apiKeys: integration.zapier.apiKeys.map((key: any) => ({
          ...key,
          key: key.key.substring(0, 10) + '...' + key.key.substring(key.key.length - 4)
        }))
      }
    };
    
    return NextResponse.json({
      success: true,
      integration: maskedIntegration
    });
    
  } catch (error: any) {
    console.error('Error fetching business integration:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}