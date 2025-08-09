import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import { processZipCodePricing, extractZipCode } from '@/lib/zipcode/pricingProcessor';
import connectDB from '@/lib/saas/db';

/**
 * POST /api/zipcode-pricing/process
 * Process ZIP code-based pricing request
 */
export async function POST(request: NextRequest) {
  try {
    // Get session for business context (optional for public forms)
    const session = await getServerSession(authOptions);
    
    // Extract business ID from session or use default
    const businessId = (session?.user as any)?.businessId || 
                      request.headers.get('x-business-id') ||
                      '68979e9cdc69bf60a36742b4'; // Default for demo
    
    // Parse request body
    const body = await request.json();
    
    // Extract ZIP code from address if not provided directly
    let zipCode = body.zipCode || body.customerZipCode;
    
    if (!zipCode && body.customerAddress) {
      // Try to extract ZIP code from full address
      zipCode = extractZipCode(body.customerAddress, body.country || 'US');
      
      if (!zipCode) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Could not extract ZIP code from address. Please provide ZIP code directly.'
          },
          { status: 400 }
        );
      }
    }
    
    // Validate required fields
    if (!zipCode || !body.propertySize) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          required: ['zipCode', 'propertySize']
        },
        { status: 400 }
      );
    }
    
    // Validate property size
    const propertySize = parseInt(body.propertySize);
    if (isNaN(propertySize) || propertySize <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid property size. Must be a positive number.'
        },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Process the pricing request
    const result = await processZipCodePricing({
      businessId,
      customerZipCode: zipCode,
      propertySize,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerAddress: body.customerAddress
    });
    
    // Save to database if requested and in service area
    if (body.saveToDatabase && result.success && result.inServiceArea) {
      // TODO: Save calculation to database
      // This would create a record in a PricingCalculation collection
    }
    
    // Return the result
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('ZIP code pricing API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process pricing request',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/zipcode-pricing/process
 * Get pricing for a specific ZIP code
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const businessId = (session?.user as any)?.businessId || 
                      request.headers.get('x-business-id') ||
                      '68979e9cdc69bf60a36742b4';
    
    const searchParams = request.nextUrl.searchParams;
    const zipCode = searchParams.get('zipCode');
    const propertySize = searchParams.get('propertySize');
    
    if (!zipCode || !propertySize) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameters: zipCode and propertySize'
        },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const result = await processZipCodePricing({
      businessId,
      customerZipCode: zipCode,
      propertySize: parseInt(propertySize)
    });
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('ZIP code pricing GET error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve pricing'
      },
      { status: 500 }
    );
  }
}