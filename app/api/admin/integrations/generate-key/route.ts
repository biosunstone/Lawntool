import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/saas/db';
import Integration from '@/models/Integration';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { businessId, name, permissions } = body;
    
    if (!businessId || !name) {
      return NextResponse.json(
        { success: false, error: 'Business ID and name are required' },
        { status: 400 }
      );
    }
    
    // Generate new API key
    const apiKey = Integration.generateApiKey();
    
    // Find or create integration
    let integration = await Integration.findOne({ businessId });
    
    if (!integration) {
      const mongoose = require('mongoose');
      integration = await Integration.create({
        businessId: new mongoose.Types.ObjectId(businessId),
        zapier: {
          enabled: true,
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
        createdBy: new mongoose.Types.ObjectId(businessId)
      });
    }
    
    // Add the new API key
    integration.zapier.apiKeys.push({
      name,
      key: apiKey,
      permissions: permissions || ['read:pricing', 'read:quotes', 'read:measurements'],
      isActive: true,
      createdAt: new Date()
    });
    
    integration.zapier.enabled = true;
    await integration.save();
    
    return NextResponse.json({
      success: true,
      apiKey,
      message: 'API key generated successfully'
    });
    
  } catch (error: any) {
    console.error('Error generating API key:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate API key' },
      { status: 500 }
    );
  }
}