import { NextRequest, NextResponse } from 'next/server';
import { processGeofencing } from '@/lib/geofencing/geofencingProcessor';
import connectDB from '@/lib/saas/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { customerAddress, propertySize, businessId, customerEmail, customerPhone } = body;
    
    // Validate required fields
    if (!customerAddress || !propertySize) {
      return NextResponse.json(
        { success: false, error: 'Customer address and property size are required' },
        { status: 400 }
      );
    }
    
    // Use first business if not specified (for testing)
    let finalBusinessId = businessId;
    if (!finalBusinessId) {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const businesses = await db.collection('businesses').find({}).limit(1).toArray();
      if (businesses.length > 0) {
        finalBusinessId = businesses[0]._id.toString();
      } else {
        return NextResponse.json(
          { success: false, error: 'No businesses found' },
          { status: 404 }
        );
      }
    }
    
    // Process geofencing request
    const result = await processGeofencing({
      businessId: finalBusinessId,
      customerAddress,
      propertySize,
      customerEmail,
      customerPhone
    });
    
    // Save to database if successful and in service area
    if (result.success && result.inServiceArea && result.services) {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const geofencingResult = {
        businessId: new mongoose.Types.ObjectId(finalBusinessId),
        customerAddress: result.customerAddress,
        customerCoordinates: result.customerCoordinates,
        driveTimeMinutes: result.driveTimeMinutes,
        distanceMiles: result.distanceMiles,
        assignedZone: result.assignedZone,
        propertySize: result.propertySize,
        services: result.services,
        customerEmail,
        customerPhone,
        createdAt: new Date()
      };
      
      await db.collection('geofencingresults').insertOne(geofencingResult);
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Geofencing API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customerAddress = searchParams.get('address');
  const propertySize = searchParams.get('size');
  const businessId = searchParams.get('businessId');
  
  if (!customerAddress || !propertySize) {
    return NextResponse.json(
      { success: false, error: 'Address and size parameters are required' },
      { status: 400 }
    );
  }
  
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      customerAddress,
      propertySize: parseInt(propertySize),
      businessId
    })
  }));
}