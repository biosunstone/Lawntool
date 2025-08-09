import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/saas/db';
import Integration from '@/models/Integration';
import { processGeofencing } from '@/lib/geofencing/geofencingProcessor';
import { processZipCodePricing } from '@/lib/zipcode/pricingProcessor';

/**
 * Zapier Actions Handler
 * This endpoint handles actions that Zapier can perform
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
    
    // Verify API key and get permissions
    const keyData = await Integration.verifyApiKey('', apiKey);
    
    if (!keyData) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, data } = body;
    
    // Get the integration
    const integration = await Integration.findOne({
      'zapier.apiKeys.key': apiKey
    });
    
    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    // Handle different action types
    const actionHandlers: Record<string, () => Promise<any>> = {
      'calculate_pricing': async () => {
        // Check permissions
        if (!keyData.permissions.includes('read:pricing')) {
          throw new Error('Insufficient permissions for pricing calculation');
        }
        
        const { address, propertySize } = data;
        
        if (!address || !propertySize) {
          throw new Error('Address and property size are required');
        }
        
        // Calculate pricing using geofencing
        const result = await processGeofencing({
          businessId: integration.businessId.toString(),
          customerAddress: address,
          propertySize: propertySize
        });
        
        return {
          success: result.success,
          address: result.customerAddress,
          propertySize: result.propertySize,
          zone: result.assignedZone,
          inServiceArea: result.inServiceArea,
          services: result.services,
          pricing: result.services?.map((s: any) => ({
            service: s.serviceName,
            available: s.isAvailable,
            price: s.totalPrice
          }))
        };
      },
      
      'check_service_area': async () => {
        // Check permissions
        if (!keyData.permissions.includes('read:pricing')) {
          throw new Error('Insufficient permissions for service area check');
        }
        
        const { address } = data;
        
        if (!address) {
          throw new Error('Address is required');
        }
        
        // Check if address is in service area
        const result = await processGeofencing({
          businessId: integration.businessId.toString(),
          customerAddress: address,
          propertySize: 1000 // Default size for check
        });
        
        return {
          success: true,
          address: result.customerAddress,
          inServiceArea: result.inServiceArea,
          zone: result.assignedZone?.zoneName,
          driveTimeMinutes: result.driveTimeMinutes
        };
      },
      
      'create_quote': async () => {
        // Check permissions
        if (!keyData.permissions.includes('write:quotes')) {
          throw new Error('Insufficient permissions for quote creation');
        }
        
        const { customerName, customerEmail, address, propertySize, services } = data;
        
        if (!customerName || !customerEmail || !address || !propertySize) {
          throw new Error('Customer name, email, address, and property size are required');
        }
        
        // Calculate pricing first
        const pricingResult = await processGeofencing({
          businessId: integration.businessId.toString(),
          customerAddress: address,
          propertySize: propertySize,
          customerEmail: customerEmail
        });
        
        if (!pricingResult.success || !pricingResult.inServiceArea) {
          throw new Error('Address is not in service area');
        }
        
        // Create quote in database
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        
        const quote = {
          businessId: integration.businessId,
          customerName,
          customerEmail,
          propertyAddress: address,
          propertySize,
          services: pricingResult.services?.filter((s: any) => s.isAvailable),
          totalPrice: pricingResult.services
            ?.filter((s: any) => s.isAvailable)
            .reduce((sum: number, s: any) => sum + s.totalPrice, 0),
          status: 'pending',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };
        
        const result = await db.collection('quotes').insertOne(quote);
        
        return {
          success: true,
          quoteId: result.insertedId,
          ...quote
        };
      },
      
      'get_measurement': async () => {
        // Check permissions
        if (!keyData.permissions.includes('read:measurements')) {
          throw new Error('Insufficient permissions for measurements');
        }
        
        const { address } = data;
        
        if (!address) {
          throw new Error('Address is required');
        }
        
        // Get measurement from database
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        
        const measurement = await db.collection('measurements').findOne({
          businessId: integration.businessId,
          address: { $regex: address, $options: 'i' }
        });
        
        if (!measurement) {
          throw new Error('No measurement found for this address');
        }
        
        return {
          success: true,
          measurement: {
            id: measurement._id,
            address: measurement.address,
            propertySize: measurement.propertySize,
            measurements: measurement.measurements,
            createdAt: measurement.createdAt
          }
        };
      }
    };
    
    // Execute the appropriate handler
    const handler = actionHandlers[action];
    if (!handler) {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
    
    const result = await handler();
    
    // Send webhook if configured
    if (integration.zapier.webhooks && integration.zapier.webhooks.length > 0) {
      const relevantWebhooks = integration.zapier.webhooks.filter(
        (w: any) => w.isActive && w.events.includes(`action.${action}`)
      );
      
      for (const webhook of relevantWebhooks) {
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...webhook.headers
            },
            body: JSON.stringify({
              event: `action.${action}`,
              data: result,
              timestamp: new Date().toISOString()
            })
          });
          
          // Update last triggered
          await Integration.updateOne(
            { 
              _id: integration._id,
              'zapier.webhooks.name': webhook.name 
            },
            { 
              $set: { 'zapier.webhooks.$.lastTriggered': new Date() },
              $inc: { 'stats.totalWebhooksSent': 1 }
            }
          );
        } catch (error) {
          console.error(`Failed to send webhook to ${webhook.url}:`, error);
        }
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Zapier action error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}