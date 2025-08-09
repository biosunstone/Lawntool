import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/saas/db';
import Integration from '@/models/Integration';

/**
 * Zapier Webhook Trigger Handler
 * This endpoint handles webhook triggers for Zapier integrations
 */

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get API key from headers
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 401 }
      );
    }
    
    // Verify API key
    const integration = await Integration.findOne({
      'zapier.apiKeys.key': apiKey,
      'zapier.apiKeys.isActive': true
    });
    
    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { event, data } = body;
    
    // Handle different event types
    const eventHandlers: Record<string, () => any> = {
      'quote.created': async () => {
        // Return recent quotes for Zapier polling
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        const quotes = await db.collection('quotes')
          .find({ businessId: integration.businessId })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();
        
        return quotes.map((quote: any) => ({
          id: quote._id,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          propertyAddress: quote.propertyAddress,
          totalPrice: quote.totalPrice,
          status: quote.status,
          createdAt: quote.createdAt
        }));
      },
      
      'measurement.completed': async () => {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        const measurements = await db.collection('measurements')
          .find({ businessId: integration.businessId })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();
        
        return measurements.map((measurement: any) => ({
          id: measurement._id,
          address: measurement.address,
          propertySize: measurement.propertySize,
          measurements: measurement.measurements,
          createdAt: measurement.createdAt
        }));
      },
      
      'pricing.calculated': async () => {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        const pricingResults = await db.collection('geofencingresults')
          .find({ businessId: integration.businessId })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();
        
        return pricingResults.map((result: any) => ({
          id: result._id,
          customerAddress: result.customerAddress,
          propertySize: result.propertySize,
          zone: result.assignedZone,
          services: result.services,
          createdAt: result.createdAt
        }));
      },
      
      'customer.created': async () => {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        const customers = await db.collection('customers')
          .find({ businessId: integration.businessId })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();
        
        return customers.map((customer: any) => ({
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          createdAt: customer.createdAt
        }));
      }
    };
    
    // Execute the appropriate handler
    const handler = eventHandlers[event];
    if (!handler) {
      return NextResponse.json(
        { success: false, error: `Unknown event type: ${event}` },
        { status: 400 }
      );
    }
    
    const result = await handler();
    
    // Update stats
    await Integration.updateOne(
      { _id: integration._id },
      {
        $inc: { 'stats.totalApiCalls': 1 },
        $set: { 'stats.lastApiCall': new Date() }
      }
    );
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('Zapier trigger error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle Zapier authentication test
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get API key from headers
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 401 }
      );
    }
    
    // Verify API key
    const integration = await Integration.findOne({
      'zapier.apiKeys.key': apiKey,
      'zapier.apiKeys.isActive': true
    });
    
    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Return success for authentication test
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      businessId: integration.businessId
    });
    
  } catch (error: any) {
    console.error('Zapier auth test error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}