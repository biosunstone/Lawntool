/**
 * Complete Geopricing Engine with Database Integration
 */

import ShopLocation, { IShopLocation } from '@/models/ShopLocation';
import GeopricingZone from '@/models/GeopricingZone';
import { 
  calculateRealDriveTime, 
  geocodeAddress,
  DriveTimeResult 
} from './googleMapsService';
import connectDB from '@/lib/saas/db';

export interface GeopricingCalculation {
  shopLocation: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
  customerLocation: {
    address: string;
    lat: number;
    lng: number;
    city?: string;
  };
  driveTime: {
    minutes: number;
    distance: number;
    distanceText: string;
    durationText: string;
  };
  zone: {
    type: 'close' | 'standard' | 'extended';
    name: string;
    description: string;
    adjustment: number;
  };
  pricing: {
    baseRate: number;
    adjustedRate: number;
    adjustmentPercentage: number;
    currency: string;
    minimumCharge: number;
  };
  services?: {
    [key: string]: {
      basePrice: number;
      adjustedPrice: number;
      area?: number;
      unit?: string;
    };
  };
  calculatedAt: Date;
  expiresAt: Date;
  quoteId?: string;
}

export interface ServiceItem {
  type: 'lawn' | 'driveway' | 'sidewalk' | 'snowRemoval' | string;
  area: number; // in square feet
  customRate?: number; // Optional custom rate override
}

/**
 * Main function to calculate Geopricing with full backend integration
 */
export async function calculateGeopricing(
  businessId: string,
  customerAddress: string,
  services?: ServiceItem[],
  options: {
    useCache?: boolean;
    trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
    departureTime?: Date;
    preferredShopId?: string;
  } = {}
): Promise<GeopricingCalculation> {
  
  await connectDB();
  
  try {
    // Step 1: Geocode customer address
    const customerLocation = await geocodeAddress(customerAddress);
    
    // Step 2: Find the appropriate shop location
    let shopLocation: IShopLocation | null;
    
    if (options.preferredShopId) {
      // Use specific shop if provided
      shopLocation = await ShopLocation.findOne({
        _id: options.preferredShopId,
        businessId,
        isActive: true
      });
    } else {
      // Find nearest active shop location
      shopLocation = await ShopLocation.findNearest(
        businessId,
        [customerLocation.lng, customerLocation.lat],
        100 // Max 100km radius
      );
      
      // If no nearby shop, find by city
      if (!shopLocation && customerLocation.city) {
        shopLocation = await ShopLocation.findOne({
          businessId,
          city: { $regex: new RegExp(customerLocation.city, 'i') },
          isActive: true
        });
      }
      
      // Fall back to primary location
      if (!shopLocation) {
        shopLocation = await ShopLocation.findOne({
          businessId,
          isPrimary: true,
          isActive: true
        });
      }
    }
    
    if (!shopLocation) {
      throw new Error('No service available in your area');
    }
    
    // Step 3: Calculate real drive time
    const driveTimeResult = await calculateRealDriveTime(
      {
        lat: shopLocation.location.coordinates[1],
        lng: shopLocation.location.coordinates[0],
        address: shopLocation.address
      },
      {
        lat: customerLocation.lat,
        lng: customerLocation.lng,
        address: customerLocation.address
      },
      {
        useCache: options.useCache,
        trafficModel: options.trafficModel,
        departureTime: options.departureTime
      }
    );
    
    // Step 4: Determine pricing zone
    const zone = shopLocation.getZoneForDriveTime(driveTimeResult.driveTimeMinutes);
    
    // Step 5: Calculate pricing
    const baseRate = shopLocation.pricing.baseRatePer1000SqFt;
    const adjustedRate = shopLocation.calculateAdjustedPrice(
      baseRate,
      driveTimeResult.driveTimeMinutes
    );
    
    // Step 6: Calculate service-specific pricing if services provided
    let servicesPricing: GeopricingCalculation['services'] = {};
    
    if (services && services.length > 0) {
      for (const service of services) {
        const baseServiceRate = service.customRate || 
          shopLocation.pricing.services[service.type] || 
          baseRate / 1000; // Default to base rate per sq ft
          
        const adjustedServiceRate = baseServiceRate * (1 + zone.adjustment / 100);
        const basePrice = service.area * baseServiceRate;
        const adjustedPrice = service.area * adjustedServiceRate;
        
        servicesPricing[service.type] = {
          basePrice,
          adjustedPrice: Math.max(adjustedPrice, shopLocation.pricing.minimumCharge),
          area: service.area,
          unit: 'sqft'
        };
      }
    }
    
    // Step 7: Update shop statistics
    await ShopLocation.findByIdAndUpdate(shopLocation._id, {
      $inc: { 'stats.totalQuotes': 1 },
      $set: { 
        'stats.lastQuoteDate': new Date(),
        lastModified: new Date()
      }
    });
    
    // Step 8: Create calculation result
    const calculation: GeopricingCalculation = {
      shopLocation: {
        id: shopLocation._id.toString(),
        name: shopLocation.name,
        address: shopLocation.fullAddress,
        city: shopLocation.city
      },
      customerLocation: {
        address: customerLocation.address,
        lat: customerLocation.lat,
        lng: customerLocation.lng,
        city: customerLocation.city
      },
      driveTime: {
        minutes: driveTimeResult.driveTimeMinutes,
        distance: driveTimeResult.distanceKm,
        distanceText: driveTimeResult.distanceText,
        durationText: driveTimeResult.durationText
      },
      zone: {
        type: zone.type as 'close' | 'standard' | 'extended',
        name: zone.name,
        description: zone.description,
        adjustment: zone.adjustment
      },
      pricing: {
        baseRate,
        adjustedRate,
        adjustmentPercentage: zone.adjustment,
        currency: shopLocation.pricing.currency,
        minimumCharge: shopLocation.pricing.minimumCharge
      },
      services: servicesPricing,
      calculatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // Expires in 30 minutes
    };
    
    return calculation;
    
  } catch (error: any) {
    console.error('Geopricing calculation error:', error);
    throw new Error(`Failed to calculate pricing: ${error.message}`);
  }
}

/**
 * Get all shop locations for a business
 */
export async function getShopLocations(
  businessId: string,
  options: {
    activeOnly?: boolean;
    city?: string;
  } = {}
): Promise<IShopLocation[]> {
  await connectDB();
  
  const query: any = { businessId };
  
  if (options.activeOnly !== false) {
    query.isActive = true;
  }
  
  if (options.city) {
    query.city = { $regex: new RegExp(options.city, 'i') };
  }
  
  return ShopLocation.find(query).sort({ isPrimary: -1, city: 1 });
}

/**
 * Create or update a shop location
 */
export async function upsertShopLocation(
  businessId: string,
  locationData: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    lat: number;
    lng: number;
    baseRatePer1000SqFt: number;
    phone: string;
    email: string;
    isPrimary?: boolean;
    serviceRadiusKm?: number;
    zones?: any;
  },
  userId: string
): Promise<IShopLocation> {
  await connectDB();
  
  // If setting as primary, unset other primary locations
  if (locationData.isPrimary) {
    await ShopLocation.updateMany(
      { businessId, isPrimary: true },
      { isPrimary: false }
    );
  }
  
  // Check if location exists
  const existing = await ShopLocation.findOne({
    businessId,
    city: locationData.city,
    address: locationData.address
  });
  
  if (existing) {
    // Update existing
    Object.assign(existing, {
      ...locationData,
      location: {
        type: 'Point',
        coordinates: [locationData.lng, locationData.lat]
      },
      pricing: {
        ...existing.pricing,
        baseRatePer1000SqFt: locationData.baseRatePer1000SqFt
      },
      contact: {
        ...existing.contact,
        phone: locationData.phone,
        email: locationData.email
      },
      lastModified: new Date(),
      modifiedBy: userId
    });
    
    if (locationData.zones) {
      existing.zones = locationData.zones;
    }
    
    return existing.save();
  } else {
    // Create new
    return ShopLocation.create({
      businessId,
      name: locationData.name,
      city: locationData.city,
      province: locationData.province,
      country: 'Canada',
      address: locationData.address,
      postalCode: locationData.postalCode,
      location: {
        type: 'Point',
        coordinates: [locationData.lng, locationData.lat]
      },
      pricing: {
        baseRatePer1000SqFt: locationData.baseRatePer1000SqFt,
        currency: 'CAD',
        minimumCharge: 50,
        services: {
          lawn: locationData.baseRatePer1000SqFt / 1000,
          driveway: (locationData.baseRatePer1000SqFt * 1.5) / 1000,
          sidewalk: (locationData.baseRatePer1000SqFt * 1.25) / 1000
        }
      },
      operating: {
        serviceRadiusKm: locationData.serviceRadiusKm || 50,
        maxDriveTimeMinutes: 60,
        businessHours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '16:00' },
          sunday: { closed: true }
        }
      },
      zones: locationData.zones || {
        close: {
          maxMinutes: 5,
          adjustment: -5,
          name: 'Close Proximity',
          description: 'Quick service with minimal travel'
        },
        standard: {
          minMinutes: 5,
          maxMinutes: 20,
          adjustment: 0,
          name: 'Standard Service',
          description: 'Regular service area'
        },
        extended: {
          minMinutes: 20,
          adjustment: 10,
          name: 'Extended Service',
          description: 'Distant locations requiring extra travel'
        }
      },
      contact: {
        phone: locationData.phone,
        email: locationData.email
      },
      isPrimary: locationData.isPrimary || false,
      isActive: true,
      createdBy: userId
    });
  }
}

/**
 * Batch calculate pricing for multiple addresses
 */
export async function batchCalculateGeopricing(
  businessId: string,
  addresses: string[],
  shopLocationId?: string
): Promise<GeopricingCalculation[]> {
  const results: GeopricingCalculation[] = [];
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const batchPromises = batch.map(address => 
      calculateGeopricing(businessId, address, undefined, {
        preferredShopId: shopLocationId,
        useCache: true
      }).catch(error => {
        console.error(`Failed to calculate for ${address}:`, error);
        return null;
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r !== null) as GeopricingCalculation[]);
  }
  
  return results;
}

/**
 * Get pricing analytics for a shop location
 */
export async function getShopAnalytics(
  shopLocationId: string,
  dateRange: { start: Date; end: Date }
): Promise<any> {
  await connectDB();
  
  const shop = await ShopLocation.findById(shopLocationId);
  if (!shop) {
    throw new Error('Shop location not found');
  }
  
  // This would typically query a quotes/orders collection
  // For now, return shop stats
  return {
    shopName: shop.name,
    city: shop.city,
    stats: shop.stats,
    zones: {
      close: {
        ...shop.zones.close,
        estimatedQuotes: Math.floor(shop.stats.totalQuotes * 0.3)
      },
      standard: {
        ...shop.zones.standard,
        estimatedQuotes: Math.floor(shop.stats.totalQuotes * 0.5)
      },
      extended: {
        ...shop.zones.extended,
        estimatedQuotes: Math.floor(shop.stats.totalQuotes * 0.2)
      }
    },
    dateRange
  };
}