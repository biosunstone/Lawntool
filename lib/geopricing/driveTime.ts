/**
 * Calculate drive time between two locations using Google Maps Distance Matrix API
 */

interface Location {
  lat: number
  lng: number
  address?: string
}

/**
 * Calculate drive time in minutes between origin and destination
 */
export async function calculateDriveTime(
  origin: Location,
  destination: Location,
  trafficModel: 'bestguess' | 'pessimistic' | 'optimistic' = 'bestguess'
): Promise<number> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return 0
    }
    
    // Prepare coordinates
    const originStr = `${origin.lat},${origin.lng}`
    const destStr = `${destination.lat},${destination.lng}`
    
    // Build API URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json'
    const params = new URLSearchParams({
      origins: originStr,
      destinations: destStr,
      mode: 'driving',
      departure_time: 'now', // Use current traffic
      traffic_model: trafficModel,
      key: apiKey
    })
    
    const response = await fetch(`${baseUrl}?${params}`)
    
    if (!response.ok) {
      console.error('Distance Matrix API error:', response.statusText)
      return 0
    }
    
    const data = await response.json()
    
    if (data.status !== 'OK') {
      console.error('Distance Matrix API status:', data.status)
      return 0
    }
    
    // Extract duration from response
    const element = data.rows?.[0]?.elements?.[0]
    
    if (element?.status === 'OK') {
      // Use duration_in_traffic if available, otherwise duration
      const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0
      return Math.ceil(durationSeconds / 60) // Convert to minutes
    }
    
    console.error('No route found between locations')
    return 0
    
  } catch (error) {
    console.error('Drive time calculation error:', error)
    return 0
  }
}

/**
 * Calculate drive times for multiple destinations from a single origin
 */
export async function calculateBatchDriveTimes(
  origin: Location,
  destinations: Location[],
  trafficModel: 'bestguess' | 'pessimistic' | 'optimistic' = 'bestguess'
): Promise<number[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return destinations.map(() => 0)
    }
    
    // API allows max 25 destinations per request
    const batchSize = 25
    const results: number[] = []
    
    for (let i = 0; i < destinations.length; i += batchSize) {
      const batch = destinations.slice(i, i + batchSize)
      
      const originStr = `${origin.lat},${origin.lng}`
      const destStr = batch.map(d => `${d.lat},${d.lng}`).join('|')
      
      const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json'
      const params = new URLSearchParams({
        origins: originStr,
        destinations: destStr,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: trafficModel,
        key: apiKey
      })
      
      const response = await fetch(`${baseUrl}?${params}`)
      
      if (!response.ok) {
        console.error('Distance Matrix API error:', response.statusText)
        results.push(...batch.map(() => 0))
        continue
      }
      
      const data = await response.json()
      
      if (data.status !== 'OK') {
        console.error('Distance Matrix API status:', data.status)
        results.push(...batch.map(() => 0))
        continue
      }
      
      // Extract durations
      const elements = data.rows?.[0]?.elements || []
      
      for (const element of elements) {
        if (element?.status === 'OK') {
          const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0
          results.push(Math.ceil(durationSeconds / 60))
        } else {
          results.push(0)
        }
      }
    }
    
    return results
    
  } catch (error) {
    console.error('Batch drive time calculation error:', error)
    return destinations.map(() => 0)
  }
}

/**
 * Get drive time zone polygon using Google Maps Roads API
 * This creates a polygon representing all points reachable within X minutes
 */
export async function getDriveTimePolygon(
  origin: Location,
  maxMinutes: number,
  numPoints: number = 16 // Number of polygon points
): Promise<Array<{ lat: number; lng: number }>> {
  try {
    // This is a simplified approach - for production, you'd want to use
    // isochrone APIs like Mapbox Isochrone or TravelTime API
    
    const points: Array<{ lat: number; lng: number }> = []
    const angleStep = (2 * Math.PI) / numPoints
    
    // Estimate distance based on average speed
    // Rough estimate: 30 mph average city driving
    const avgSpeedMph = 30
    const maxDistanceMiles = (avgSpeedMph * maxMinutes) / 60
    
    // Create points in a circle around origin
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep
      const lat = origin.lat + (maxDistanceMiles / 69) * Math.sin(angle) // 69 miles per degree latitude
      const lng = origin.lng + (maxDistanceMiles / (69 * Math.cos(origin.lat * Math.PI / 180))) * Math.cos(angle)
      
      points.push({ lat, lng })
    }
    
    // For accurate implementation, you would:
    // 1. Calculate actual drive times to these points
    // 2. Adjust points based on actual reachability
    // 3. Use road network data to create accurate isochrones
    
    return points
    
  } catch (error) {
    console.error('Drive time polygon calculation error:', error)
    return []
  }
}

/**
 * Calculate straight-line distance between two points (for fallback)
 */
export function calculateStraightDistance(
  origin: Location,
  destination: Location,
  unit: 'km' | 'miles' = 'miles'
): number {
  const R = unit === 'km' ? 6371 : 3959 // Earth's radius
  const dLat = toRad(destination.lat - origin.lat)
  const dLng = toRad(destination.lng - origin.lng)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Estimate drive time based on straight-line distance (fallback)
 */
export function estimateDriveTime(
  origin: Location,
  destination: Location,
  avgSpeedMph: number = 30
): number {
  const distanceMiles = calculateStraightDistance(origin, destination, 'miles')
  // Add 30% for road routing (roads aren't straight lines)
  const adjustedDistance = distanceMiles * 1.3
  return Math.ceil((adjustedDistance / avgSpeedMph) * 60)
}