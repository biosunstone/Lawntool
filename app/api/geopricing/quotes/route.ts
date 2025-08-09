import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import connectDB from '@/lib/saas/db';
import GeopricingQuote from '@/models/GeopricingQuote';
import ShopLocation from '@/models/ShopLocation';
import { calculateGeopricing } from '@/lib/geopricing/pricingEngine';
import { sendEmail } from '@/lib/saas/email';

// POST /api/geopricing/quotes - Create a new quote
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const businessId = (session?.user as any)?.businessId || 
                      request.headers.get('x-business-id') ||
                      '68979e9cdc69bf60a36742b4';
    
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      services,
      packageType,
      notes,
      sendQuote = false
    } = body;
    
    if (!customerAddress || !services || services.length === 0) {
      return NextResponse.json(
        { error: 'Customer address and services are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Calculate geopricing
    const calculation = await calculateGeopricing(
      businessId,
      customerAddress,
      services
    );
    
    // Get shop location details
    const shop = await ShopLocation.findById(calculation.shopLocation.id);
    if (!shop) {
      throw new Error('Shop location not found');
    }
    
    // Prepare services data
    const quoteServices = services.map((service: any) => {
      const calcService = calculation.services?.[service.type];
      return {
        type: service.type,
        name: service.name || service.type,
        area: service.area,
        unit: 'sqft',
        baseRate: shop.pricing.services[service.type] || shop.pricing.baseRatePer1000SqFt / 1000,
        adjustedRate: calcService ? calcService.adjustedPrice / service.area : 0,
        basePrice: calcService?.basePrice || 0,
        adjustedPrice: calcService?.adjustedPrice || 0
      };
    });
    
    // Calculate totals
    const subtotal = quoteServices.reduce((sum: number, s: any) => sum + s.basePrice, 0);
    const adjustmentAmount = quoteServices.reduce((sum: number, s: any) => sum + (s.adjustedPrice - s.basePrice), 0);
    const total = quoteServices.reduce((sum: number, s: any) => sum + s.adjustedPrice, 0);
    
    // Create quote
    const quote = await GeopricingQuote.create({
      businessId,
      shopLocationId: shop._id,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
        coordinates: {
          lat: calculation.customerLocation.lat,
          lng: calculation.customerLocation.lng
        },
        city: calculation.customerLocation.city
      },
      shop: {
        name: shop.name,
        address: shop.address,
        city: shop.city,
        coordinates: {
          lat: shop.location.coordinates[1],
          lng: shop.location.coordinates[0]
        }
      },
      driveTime: {
        minutes: calculation.driveTime.minutes,
        distanceKm: calculation.driveTime.distance,
        distanceText: calculation.driveTime.distanceText,
        durationText: calculation.driveTime.durationText,
        trafficModel: 'best_guess',
        calculatedAt: new Date()
      },
      zone: calculation.zone,
      services: quoteServices,
      pricing: {
        subtotal,
        adjustment: calculation.zone.adjustment,
        adjustmentAmount,
        total,
        currency: calculation.pricing.currency,
        minimumCharge: calculation.pricing.minimumCharge
      },
      package: packageType ? {
        name: packageType,
        multiplier: packageType === 'Premium' ? 1.6 : packageType === 'Standard' ? 1.3 : 1,
        features: getPackageFeatures(packageType),
        price: total * (packageType === 'Premium' ? 1.6 : packageType === 'Standard' ? 1.3 : 1)
      } : undefined,
      customerNotes: notes,
      status: 'draft',
      source: session ? 'admin' : 'website',
      createdBy: session ? (session.user as any).id : undefined
    });
    
    // Send quote email if requested
    if (sendQuote && customerEmail) {
      await sendQuoteEmail(quote);
      quote.status = 'sent';
      quote.sentAt = new Date();
      await quote.save();
    }
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote._id,
        quoteNumber: quote.quoteNumber,
        total: quote.pricing.total,
        adjustment: quote.zone.adjustment,
        zone: quote.zone.name,
        driveTime: quote.driveTime.minutes,
        validUntil: quote.validUntil,
        status: quote.status
      }
    });
    
  } catch (error: any) {
    console.error('Quote creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create quote', message: error.message },
      { status: 500 }
    );
  }
}

// GET /api/geopricing/quotes - Get quotes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const businessId = (session.user as any).businessId;
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const shopId = searchParams.get('shopId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    await connectDB();
    
    const query: any = { businessId };
    
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (shopId) query.shopLocationId = shopId;
    
    const [quotes, total] = await Promise.all([
      GeopricingQuote.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('customerId', 'name email phone')
        .populate('shopLocationId', 'name city'),
      GeopricingQuote.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      quotes: quotes.map(quote => ({
        id: quote._id,
        quoteNumber: quote.quoteNumber,
        customer: quote.customer,
        shop: quote.shop,
        driveTime: quote.driveTime.minutes,
        zone: quote.zone,
        total: quote.pricing.total,
        status: quote.status,
        validUntil: quote.validUntil,
        createdAt: quote.createdAt
      })),
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

// PUT /api/geopricing/quotes - Update quote status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId, status, response } = body;
    
    if (!quoteId || !status) {
      return NextResponse.json(
        { error: 'Quote ID and status are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const quote = await GeopricingQuote.findById(quoteId);
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    // Update status
    quote.status = status;
    
    // Handle specific status updates
    if (status === 'viewed' && !quote.viewedAt) {
      quote.viewedAt = new Date();
    } else if (status === 'accepted' || status === 'rejected') {
      quote.respondedAt = new Date();
      if (response) {
        quote.response = response;
      }
      if (status === 'accepted') {
        quote.convertedToCustomer = true;
        quote.conversionDate = new Date();
      }
    }
    
    await quote.save();
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote._id,
        status: quote.status,
        respondedAt: quote.respondedAt
      }
    });
    
  } catch (error: any) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}

// Helper function to send quote email
async function sendQuoteEmail(quote: any) {
  const emailHtml = `
    <h2>Your Lawn Care Quote #${quote.quoteNumber}</h2>
    <p>Thank you for your interest in our services!</p>
    
    <h3>Service Location</h3>
    <p>${quote.customer.address}</p>
    
    <h3>Zone: ${quote.zone.name}</h3>
    <p>${quote.zone.description}</p>
    <p>Drive time from our ${quote.shop.city} location: ${quote.driveTime.minutes} minutes</p>
    
    <h3>Services Quoted</h3>
    <table border="1" cellpadding="8">
      <tr>
        <th>Service</th>
        <th>Area</th>
        <th>Price</th>
      </tr>
      ${quote.services.map((s: any) => `
        <tr>
          <td>${s.name}</td>
          <td>${s.area} ${s.unit}</td>
          <td>$${s.adjustedPrice.toFixed(2)}</td>
        </tr>
      `).join('')}
    </table>
    
    <h3>Pricing Summary</h3>
    <p>Subtotal: $${quote.pricing.subtotal.toFixed(2)}</p>
    ${quote.pricing.adjustment !== 0 ? `
      <p>Zone Adjustment (${quote.pricing.adjustment}%): $${quote.pricing.adjustmentAmount.toFixed(2)}</p>
    ` : ''}
    <p><strong>Total: $${quote.pricing.total.toFixed(2)}</strong></p>
    
    <p>This quote is valid until ${new Date(quote.validUntil).toLocaleDateString()}</p>
    
    <p>To accept this quote, please reply to this email or call us at ${quote.shop.phone}</p>
  `;
  
  await sendEmail(
    quote.customer.email,
    `Lawn Care Quote #${quote.quoteNumber}`,
    emailHtml
  );
}

// Helper function to get package features
function getPackageFeatures(packageType: string): string[] {
  switch (packageType) {
    case 'Basic':
      return ['Mowing', 'Basic edging', 'Grass clipping removal'];
    case 'Standard':
      return ['Everything in Basic', 'Precision trimming', 'Weed control', 'Leaf blowing'];
    case 'Premium':
      return ['Everything in Standard', 'Fertilization', 'Aeration', 'Seasonal treatments', 'Priority scheduling'];
    default:
      return [];
  }
}