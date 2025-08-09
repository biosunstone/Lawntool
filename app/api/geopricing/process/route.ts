import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import { processGeopricingRequest } from '@/lib/geopricing/pricingProcessor';
import connectDB from '@/lib/saas/db';

/**
 * POST /api/geopricing/process
 * Main endpoint for processing geopricing requests from form submissions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get session for business context (optional for public forms)
    const session = await getServerSession(authOptions);
    
    // Extract business ID from session, header, or use default
    const businessId = (session?.user as any)?.businessId || 
                      request.headers.get('x-business-id') ||
                      '68979e9cdc69bf60a36742b4'; // Default for demo
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.customerAddress || !body.propertySize) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['customerAddress', 'propertySize']
        },
        { status: 400 }
      );
    }
    
    // Validate property size
    const propertySize = parseInt(body.propertySize);
    if (isNaN(propertySize) || propertySize <= 0) {
      return NextResponse.json(
        { error: 'Invalid property size' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Process the geopricing request
    const result = await processGeopricingRequest(
      businessId,
      {
        customerAddress: body.customerAddress,
        propertySize: propertySize,
        services: body.services,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        source: body.source || 'website',
        sessionId: request.headers.get('x-session-id') || undefined
      },
      {
        generateClaudeTable: body.generateTable !== false,
        saveToDatabase: body.saveToDatabase !== false,
        useCache: body.useCache !== false
      }
    );
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Processing failed',
          calculationId: result.calculationId
        },
        { status: 500 }
      );
    }
    
    // Return successful response
    return NextResponse.json({
      success: true,
      calculationId: result.calculationId,
      pricing: {
        driveTime: result.data?.driveTime,
        zone: result.data?.zone,
        basePrice: result.data?.basePrice,
        adjustedPrice: result.data?.adjustedPrice,
        finalPrice: result.data?.finalPrice
      },
      formattedOutput: {
        table: result.data?.formattedTable,
        explanation: result.data?.explanation
      },
      performance: {
        totalProcessingTime: Date.now() - startTime,
        breakdown: result.performanceMetrics
      }
    });
    
  } catch (error: any) {
    console.error('API processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geopricing/process
 * Retrieve a previous calculation by ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const calculationId = searchParams.get('id');
    
    if (!calculationId) {
      return NextResponse.json(
        { error: 'Calculation ID is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Import PricingCalculation model
    const PricingCalculation = (await import('@/models/PricingCalculation')).default;
    
    const calculation = await PricingCalculation.findOne({ 
      calculationId 
    }).select('-rawResponse'); // Exclude raw API response for security
    
    if (!calculation) {
      return NextResponse.json(
        { error: 'Calculation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      calculation: {
        id: calculation.calculationId,
        createdAt: calculation.createdAt,
        customer: {
          address: calculation.customer.address,
          propertySize: calculation.customer.propertySize
        },
        driveTime: calculation.driveTimeCalculation.result,
        zone: calculation.zoneAssignment,
        pricing: calculation.pricing,
        totalSummary: calculation.totalSummary,
        formattedOutput: calculation.claudeIntegration,
        status: calculation.status
      }
    });
    
  } catch (error: any) {
    console.error('API retrieval error:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve calculation' },
      { status: 500 }
    );
  }
}