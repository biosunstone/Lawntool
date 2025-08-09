/**
 * Drive Time Calculator using Google Maps Distance Matrix API
 * Calculates drive time from shop to customer address
 */

interface DriveTimeRequest {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface DriveTimeResult {
  success: boolean;
  driveTimeMinutes?: number;
  distanceKm?: number;
  distanceMiles?: number;
  formattedDuration?: string;
  formattedDistance?: string;
  error?: string;
}

/**
 * Calculate drive time using Google Maps Distance Matrix API
 */
export async function calculateDriveTime(
  request: DriveTimeRequest
): Promise<DriveTimeResult> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // Format origin
    const originStr = `${request.origin.latitude},${request.origin.longitude}`;
    
    // Format destination (prefer coordinates over address)
    let destinationStr: string;
    if (request.destination.latitude && request.destination.longitude) {
      destinationStr = `${request.destination.latitude},${request.destination.longitude}`;
    } else if (request.destination.address) {
      destinationStr = encodeURIComponent(request.destination.address);
    } else {
      throw new Error('Destination must include either address or coordinates');
    }

    // Call Google Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      `origins=${originStr}` +
      `&destinations=${destinationStr}` +
      `&mode=driving` +
      `&units=metric` +
      `&departure_time=now` +
      `&traffic_model=best_guess` +
      `&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      if (element?.status === 'ZERO_RESULTS') {
        return {
          success: false,
          error: 'No route found to this location'
        };
      }
      throw new Error(`Route calculation failed: ${element?.status || 'Unknown error'}`);
    }

    // Extract duration and distance
    const durationInTraffic = element.duration_in_traffic || element.duration;
    const driveTimeMinutes = Math.ceil(durationInTraffic.value / 60);
    const distanceMeters = element.distance.value;
    const distanceKm = Math.round(distanceMeters / 1000 * 10) / 10;
    const distanceMiles = Math.round(distanceMeters / 1609.34 * 10) / 10;

    return {
      success: true,
      driveTimeMinutes,
      distanceKm,
      distanceMiles,
      formattedDuration: durationInTraffic.text,
      formattedDistance: element.distance.text
    };

  } catch (error: any) {
    console.error('Drive time calculation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to calculate drive time'
    };
  }
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address: string): Promise<{
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodeURIComponent(address)}` +
      `&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return {
        success: false,
        error: 'Address not found'
      };
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      success: true,
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address
    };

  } catch (error: any) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error.message || 'Failed to geocode address'
    };
  }
}

/**
 * Cache drive time results to avoid repeated API calls
 */
const driveTimeCache = new Map<string, { result: DriveTimeResult; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function calculateDriveTimeWithCache(
  request: DriveTimeRequest
): Promise<DriveTimeResult> {
  // Generate cache key
  const cacheKey = `${request.origin.latitude},${request.origin.longitude}-` +
    `${request.destination.address || `${request.destination.latitude},${request.destination.longitude}`}`;

  // Check cache
  const cached = driveTimeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  // Calculate fresh result
  const result = await calculateDriveTime(request);

  // Cache successful results
  if (result.success) {
    driveTimeCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (driveTimeCache.size > 100) {
      const now = Date.now();
      const entries = Array.from(driveTimeCache.entries());
      for (const [key, value] of entries) {
        if (now - value.timestamp > CACHE_TTL) {
          driveTimeCache.delete(key);
        }
      }
    }
  }

  return result;
}