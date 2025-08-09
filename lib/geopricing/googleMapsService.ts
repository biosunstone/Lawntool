/**
 * Google Maps Service for real distance and drive time calculations
 */

import { Client, Status } from '@googlemaps/google-maps-services-js';
import Redis from 'ioredis';

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Initialize Redis for caching (optional)
let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
}

export interface Location {
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface DriveTimeResult {
  driveTimeMinutes: number;
  distanceKm: number;
  distanceText: string;
  durationText: string;
  origin: {
    address: string;
    lat: number;
    lng: number;
  };
  destination: {
    address: string;
    lat: number;
    lng: number;
  };
  calculatedAt: Date;
  fromCache?: boolean;
}

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

/**
 * Calculate real drive time between two locations using Google Maps
 */
export async function calculateRealDriveTime(
  origin: Location,
  destination: Location,
  options: {
    departureTime?: Date;
    trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
    avoidHighways?: boolean;
    avoidTolls?: boolean;
    useCache?: boolean;
  } = {}
): Promise<DriveTimeResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  // Generate cache key if caching is enabled
  const cacheKey = options.useCache !== false ? generateCacheKey(origin, destination) : null;
  
  // Check cache first
  if (cacheKey && redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        result.fromCache = true;
        
        // Check if cache is still fresh (15 minutes)
        const cacheAge = Date.now() - new Date(result.calculatedAt).getTime();
        if (cacheAge < 15 * 60 * 1000) {
          return result;
        }
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
  }

  try {
    // Prepare origin and destination strings
    const originStr = locationToString(origin);
    const destinationStr = locationToString(destination);

    // Call Google Maps Distance Matrix API
    const response = await googleMapsClient.distancematrix({
      params: {
        origins: [originStr],
        destinations: [destinationStr],
        mode: 'driving' as any,
        units: 'metric' as any,
        departure_time: options.departureTime || 'now',
        traffic_model: options.trafficModel || 'best_guess' as any,
        avoid: [
          ...(options.avoidHighways ? ['highways'] : []),
          ...(options.avoidTolls ? ['tolls'] : [])
        ] as any,
        key: apiKey
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const element = response.data.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK') {
      throw new Error(`No route found: ${element?.status || 'UNKNOWN_ERROR'}`);
    }

    // Parse the response
    const result: DriveTimeResult = {
      driveTimeMinutes: Math.round(element.duration.value / 60),
      distanceKm: element.distance.value / 1000,
      distanceText: element.distance.text,
      durationText: element.duration.text,
      origin: {
        address: response.data.origin_addresses[0],
        lat: origin.lat || 0,
        lng: origin.lng || 0
      },
      destination: {
        address: response.data.destination_addresses[0],
        lat: destination.lat || 0,
        lng: destination.lng || 0
      },
      calculatedAt: new Date(),
      fromCache: false
    };

    // Cache the result
    if (cacheKey && redisClient) {
      try {
        await redisClient.setex(cacheKey, 900, JSON.stringify(result)); // Cache for 15 minutes
      } catch (error) {
        console.error('Cache storage error:', error);
      }
    }

    return result;

  } catch (error: any) {
    console.error('Google Maps API error:', error);
    
    // Fallback to straight-line distance estimation
    if (origin.lat && origin.lng && destination.lat && destination.lng) {
      const distance = calculateHaversineDistance(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
      );
      
      // Estimate drive time (assuming 40 km/h average speed in city)
      const estimatedMinutes = Math.round((distance / 40) * 60);
      
      return {
        driveTimeMinutes: estimatedMinutes,
        distanceKm: distance,
        distanceText: `${distance.toFixed(1)} km`,
        durationText: `${estimatedMinutes} mins (estimated)`,
        origin: {
          address: origin.address || 'Unknown',
          lat: origin.lat,
          lng: origin.lng
        },
        destination: {
          address: destination.address || 'Unknown',
          lat: destination.lat,
          lng: destination.lng
        },
        calculatedAt: new Date(),
        fromCache: false
      };
    }
    
    throw error;
  }
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  try {
    const response = await googleMapsClient.geocode({
      params: {
        address,
        key: apiKey,
        region: 'ca' // Bias towards Canada
      }
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];
    const components = result.address_components;
    
    // Extract address components
    const getComponent = (type: string) => {
      const component = components.find(c => c.types.includes(type));
      return component?.long_name;
    };

    return {
      address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      placeId: result.place_id,
      city: getComponent('locality') || getComponent('administrative_area_level_3'),
      province: getComponent('administrative_area_level_1'),
      country: getComponent('country'),
      postalCode: getComponent('postal_code')
    };

  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
}

/**
 * Batch calculate drive times for multiple destinations
 */
export async function batchCalculateDriveTimes(
  origin: Location,
  destinations: Location[],
  options: {
    departureTime?: Date;
    trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  } = {}
): Promise<DriveTimeResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  // Google Maps allows up to 25 destinations per request
  const batchSize = 25;
  const results: DriveTimeResult[] = [];

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    
    try {
      const response = await googleMapsClient.distancematrix({
        params: {
          origins: [locationToString(origin)],
          destinations: batch.map(locationToString),
          mode: 'driving' as any,
          units: 'metric' as any,
          departure_time: options.departureTime || 'now',
          traffic_model: options.trafficModel || 'best_guess' as any,
          key: apiKey
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      // Parse each destination result
      response.data.rows[0].elements.forEach((element, index) => {
        if (element.status === 'OK') {
          results.push({
            driveTimeMinutes: Math.round(element.duration.value / 60),
            distanceKm: element.distance.value / 1000,
            distanceText: element.distance.text,
            durationText: element.duration.text,
            origin: {
              address: response.data.origin_addresses[0],
              lat: origin.lat || 0,
              lng: origin.lng || 0
            },
            destination: {
              address: response.data.destination_addresses[index],
              lat: batch[index].lat || 0,
              lng: batch[index].lng || 0
            },
            calculatedAt: new Date(),
            fromCache: false
          });
        }
      });

    } catch (error) {
      console.error('Batch calculation error:', error);
    }
  }

  return results;
}

/**
 * Get autocomplete suggestions for addresses
 */
export async function getAddressSuggestions(
  input: string,
  options: {
    location?: { lat: number; lng: number };
    radius?: number;
    types?: string[];
  } = {}
): Promise<any[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  try {
    const response = await googleMapsClient.placeAutocomplete({
      params: {
        input,
        key: apiKey,
        types: options.types?.join('|'),
        location: options.location,
        radius: options.radius || 50000, // 50km default
        components: { country: 'ca' } // Restrict to Canada
      } as any
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Autocomplete failed: ${response.data.status}`);
    }

    return response.data.predictions.map(prediction => ({
      description: prediction.description,
      placeId: prediction.place_id,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text
    }));

  } catch (error) {
    console.error('Autocomplete error:', error);
    return [];
  }
}

// Helper functions

function locationToString(location: Location): string {
  if (location.lat && location.lng) {
    return `${location.lat},${location.lng}`;
  } else if (location.address) {
    return location.address;
  } else if (location.placeId) {
    return `place_id:${location.placeId}`;
  } else {
    throw new Error('Invalid location format');
  }
}

function generateCacheKey(origin: Location, destination: Location): string {
  const originKey = origin.lat && origin.lng 
    ? `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`
    : origin.address || origin.placeId || '';
    
  const destKey = destination.lat && destination.lng
    ? `${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`
    : destination.address || destination.placeId || '';
    
  return `drivetime:${originKey}:${destKey}`;
}

function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI/180);
}

/**
 * Validate if coordinates are within service area
 */
export async function isWithinServiceArea(
  shopLat: number,
  shopLng: number,
  customerLat: number,
  customerLng: number,
  maxRadiusKm: number
): Promise<boolean> {
  const distance = calculateHaversineDistance(shopLat, shopLng, customerLat, customerLng);
  return distance <= maxRadiusKm;
}