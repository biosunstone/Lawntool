import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/saas/auth';
import { 
  getShopLocations, 
  upsertShopLocation 
} from '@/lib/geopricing/pricingEngine';
import { geocodeAddress } from '@/lib/geopricing/googleMapsService';
import connectDB from '@/lib/saas/db';
import ShopLocation from '@/models/ShopLocation';

// GET /api/geopricing/shops - Get shop locations
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
    const city = searchParams.get('city') || undefined;
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    
    const shops = await getShopLocations(businessId, {
      city,
      activeOnly
    });
    
    return NextResponse.json({
      success: true,
      shops: shops.map(shop => ({
        id: shop._id,
        name: shop.name,
        city: shop.city,
        address: shop.fullAddress,
        coordinates: {
          lat: shop.location.coordinates[1],
          lng: shop.location.coordinates[0]
        },
        baseRate: shop.pricing.baseRatePer1000SqFt,
        isActive: shop.isActive,
        isPrimary: shop.isPrimary,
        stats: shop.stats,
        zones: shop.zones
      }))
    });
    
  } catch (error: any) {
    console.error('Error fetching shop locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop locations' },
      { status: 500 }
    );
  }
}

// POST /api/geopricing/shops - Create or update shop location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const businessId = (session.user as any).businessId;
    const userId = (session.user as any).id;
    
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const required = ['name', 'address', 'city', 'province', 'postalCode', 'baseRatePer1000SqFt', 'phone', 'email'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    // Geocode address if coordinates not provided
    let lat = body.lat;
    let lng = body.lng;
    
    if (!lat || !lng) {
      const fullAddress = `${body.address}, ${body.city}, ${body.province} ${body.postalCode}`;
      const geocoded = await geocodeAddress(fullAddress);
      lat = geocoded.lat;
      lng = geocoded.lng;
    }
    
    // Create or update shop location
    const shop = await upsertShopLocation(
      businessId,
      {
        name: body.name,
        address: body.address,
        city: body.city,
        province: body.province,
        postalCode: body.postalCode,
        lat,
        lng,
        baseRatePer1000SqFt: body.baseRatePer1000SqFt,
        phone: body.phone,
        email: body.email,
        isPrimary: body.isPrimary,
        serviceRadiusKm: body.serviceRadiusKm,
        zones: body.zones
      },
      userId
    );
    
    return NextResponse.json({
      success: true,
      shop: {
        id: shop._id,
        name: shop.name,
        city: shop.city,
        address: shop.fullAddress,
        coordinates: {
          lat: shop.location.coordinates[1],
          lng: shop.location.coordinates[0]
        },
        baseRate: shop.pricing.baseRatePer1000SqFt,
        isActive: shop.isActive,
        isPrimary: shop.isPrimary
      }
    });
    
  } catch (error: any) {
    console.error('Error creating shop location:', error);
    return NextResponse.json(
      { error: 'Failed to create shop location', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/geopricing/shops - Update shop location
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const businessId = (session.user as any).businessId;
    const userId = (session.user as any).id;
    
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 });
    }
    
    const body = await request.json();
    const { shopId, ...updates } = body;
    
    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find and update shop
    const shop = await ShopLocation.findOne({
      _id: shopId,
      businessId
    });
    
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop location not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (updates.name) shop.name = updates.name;
    if (updates.baseRatePer1000SqFt) {
      shop.pricing.baseRatePer1000SqFt = updates.baseRatePer1000SqFt;
    }
    if (updates.phone) shop.contact.phone = updates.phone;
    if (updates.email) shop.contact.email = updates.email;
    if (updates.isActive !== undefined) shop.isActive = updates.isActive;
    if (updates.isPrimary !== undefined) {
      if (updates.isPrimary) {
        // Unset other primary locations
        await ShopLocation.updateMany(
          { businessId, isPrimary: true, _id: { $ne: shopId } },
          { isPrimary: false }
        );
      }
      shop.isPrimary = updates.isPrimary;
    }
    if (updates.zones) shop.zones = updates.zones;
    
    shop.modifiedBy = userId;
    shop.lastModified = new Date();
    
    await shop.save();
    
    return NextResponse.json({
      success: true,
      shop: {
        id: shop._id,
        name: shop.name,
        city: shop.city,
        address: shop.fullAddress,
        baseRate: shop.pricing.baseRatePer1000SqFt,
        isActive: shop.isActive,
        isPrimary: shop.isPrimary
      }
    });
    
  } catch (error: any) {
    console.error('Error updating shop location:', error);
    return NextResponse.json(
      { error: 'Failed to update shop location' },
      { status: 500 }
    );
  }
}

// DELETE /api/geopricing/shops - Deactivate shop location
export async function DELETE(request: NextRequest) {
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
    const shopId = searchParams.get('id');
    
    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Soft delete by deactivating
    const shop = await ShopLocation.findOneAndUpdate(
      { _id: shopId, businessId },
      { isActive: false, lastModified: new Date() },
      { new: true }
    );
    
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop location not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Shop location deactivated'
    });
    
  } catch (error: any) {
    console.error('Error deactivating shop location:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate shop location' },
      { status: 500 }
    );
  }
}