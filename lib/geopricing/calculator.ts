import GeopricingZone from '@/models/GeopricingZone'
import { calculateDriveTime } from './driveTime'

export interface GeopricingResult {
  applicableZones: Array<{
    zoneId: string
    zoneName: string
    adjustmentType: string
    adjustmentValue: number
    reason: string
  }>
  
  finalAdjustment: {
    type: 'percentage' | 'fixed' | 'multiplier'
    value: number
    description: string
  }
  
  priceModifications: {
    lawn?: number
    driveway?: number
    sidewalk?: number
    [key: string]: number | undefined
  }
  
  metadata: {
    distanceFromBase?: number
    driveTimeMinutes?: number
    zoneDensity?: number
    isHighDensityArea?: boolean
  }
}

/**
 * Calculate geopricing adjustments for a given location
 */
export async function calculateGeopricing(
  businessId: string,
  customerLocation: {
    address?: string
    lat?: number
    lng?: number
    zipcode?: string
    city?: string
  },
  serviceDate?: Date
): Promise<GeopricingResult> {
  try {
    // Get all active zones for the business
    const zones = await GeopricingZone.find({
      businessId,
      active: true
    }).sort({ priority: -1 }) // Higher priority first
    
    if (zones.length === 0) {
      return {
        applicableZones: [],
        finalAdjustment: {
          type: 'percentage',
          value: 0,
          description: 'No geopricing zones configured'
        },
        priceModifications: {},
        metadata: {}
      }
    }
    
    const applicableZones: GeopricingResult['applicableZones'] = []
    const metadata: GeopricingResult['metadata'] = {}
    
    // Check each zone for applicability
    for (const zone of zones) {
      const applies = await checkZoneApplicability(zone, customerLocation, metadata)
      
      if (applies) {
        // Calculate seasonal adjustment if applicable
        let adjustmentValue = zone.pricing.adjustmentValue
        
        if (serviceDate && zone.pricing.seasonalAdjustments) {
          const month = serviceDate.getMonth() + 1
          const seasonalAdj = zone.pricing.seasonalAdjustments.find(
            adj => month >= adj.startMonth && month <= adj.endMonth
          )
          if (seasonalAdj) {
            adjustmentValue += seasonalAdj.adjustmentValue
          }
        }
        
        // Apply route density adjustments
        if (zone.routeDensity?.enabled) {
          const densityAdjustment = calculateDensityAdjustment(zone)
          adjustmentValue += densityAdjustment
          metadata.zoneDensity = zone.routeDensity.currentDensity
          metadata.isHighDensityArea = (zone.routeDensity.currentDensity || 0) >= zone.routeDensity.targetDensity
        }
        
        applicableZones.push({
          zoneId: zone._id.toString(),
          zoneName: zone.name,
          adjustmentType: zone.pricing.adjustmentType,
          adjustmentValue,
          reason: applies.reason
        })
        
        // Use first matching zone (highest priority)
        if (applicableZones.length === 1) {
          break // Stop after first match unless you want cumulative pricing
        }
      }
    }
    
    // Calculate final adjustment
    const finalAdjustment = combinePricingAdjustments(applicableZones)
    
    // Calculate service-specific modifications
    const priceModifications: GeopricingResult['priceModifications'] = {}
    
    if (applicableZones.length > 0) {
      const primaryZone = await GeopricingZone.findById(applicableZones[0].zoneId)
      if (primaryZone?.pricing.serviceAdjustments) {
        Object.entries(primaryZone.pricing.serviceAdjustments).forEach(([service, adjustment]) => {
          if (adjustment !== undefined) {
            priceModifications[service] = adjustment as number
          }
        })
      }
    }
    
    return {
      applicableZones,
      finalAdjustment,
      priceModifications,
      metadata
    }
    
  } catch (error) {
    console.error('Geopricing calculation error:', error)
    return {
      applicableZones: [],
      finalAdjustment: {
        type: 'percentage',
        value: 0,
        description: 'Error calculating geopricing'
      },
      priceModifications: {},
      metadata: {}
    }
  }
}

/**
 * Check if a location falls within a zone
 */
async function checkZoneApplicability(
  zone: any,
  location: any,
  metadata: any
): Promise<{ applies: boolean; reason: string } | null> {
  
  switch (zone.type) {
    case 'radius':
      if (location.lat && location.lng && zone.radius) {
        const distance = calculateDistance(
          zone.radius.center.lat,
          zone.radius.center.lng,
          location.lat,
          location.lng,
          zone.radius.unit
        )
        
        metadata.distanceFromBase = distance
        
        if (distance <= zone.radius.distance) {
          return {
            applies: true,
            reason: `Within ${zone.radius.distance} ${zone.radius.unit} of ${zone.radius.center.address || 'base'}`
          }
        }
      }
      break
      
    case 'zipcode':
      if (location.zipcode && zone.zipcodes?.includes(location.zipcode)) {
        return {
          applies: true,
          reason: `Zipcode ${location.zipcode} in zone`
        }
      }
      break
      
    case 'city':
      if (location.city && zone.cities?.includes(location.city)) {
        return {
          applies: true,
          reason: `City ${location.city} in zone`
        }
      }
      break
      
    case 'drivetime':
      if (location.lat && location.lng && zone.driveTime) {
        const driveMinutes = await calculateDriveTime(
          zone.driveTime.origin,
          { lat: location.lat, lng: location.lng },
          zone.driveTime.trafficModel
        )
        
        metadata.driveTimeMinutes = driveMinutes
        
        if (driveMinutes <= zone.driveTime.maxMinutes) {
          return {
            applies: true,
            reason: `Within ${zone.driveTime.maxMinutes} minutes drive time`
          }
        }
      }
      break
      
    case 'polygon':
      if (location.lat && location.lng && zone.geometry) {
        // Use MongoDB geospatial query
        const isWithin = await checkPointInPolygon(
          zone._id,
          location.lat,
          location.lng
        )
        
        if (isWithin) {
          return {
            applies: true,
            reason: `Within ${zone.name} boundary`
          }
        }
      }
      break
  }
  
  return null
}

/**
 * Calculate route density adjustment
 */
function calculateDensityAdjustment(zone: any): number {
  if (!zone.routeDensity?.enabled) return 0
  
  const currentDensity = zone.routeDensity.currentDensity || 0
  const targetDensity = zone.routeDensity.targetDensity
  
  if (currentDensity >= targetDensity) {
    // Apply density bonus (discount) for well-served areas
    return -(zone.routeDensity.densityBonus || 0)
  } else {
    // Apply sparse penalty (surcharge) for underserved areas
    const sparsityRatio = 1 - (currentDensity / targetDensity)
    return (zone.routeDensity.sparsePenalty || 0) * sparsityRatio
  }
}

/**
 * Combine multiple pricing adjustments
 */
function combinePricingAdjustments(
  zones: GeopricingResult['applicableZones']
): GeopricingResult['finalAdjustment'] {
  
  if (zones.length === 0) {
    return {
      type: 'percentage',
      value: 0,
      description: 'No geopricing applied'
    }
  }
  
  // For now, use the first (highest priority) zone
  // You could implement cumulative pricing if needed
  const primaryZone = zones[0]
  
  return {
    type: primaryZone.adjustmentType as any,
    value: primaryZone.adjustmentValue,
    description: `${primaryZone.zoneName}: ${primaryZone.reason}`
  }
}

/**
 * Calculate distance between two points
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'km' | 'miles' = 'miles'
): number {
  const R = unit === 'km' ? 6371 : 3959 // Earth's radius
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Check if point is within polygon using database query
 */
async function checkPointInPolygon(
  zoneId: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const zone = await GeopricingZone.findOne({
    _id: zoneId,
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      }
    }
  })
  
  return !!zone
}

/**
 * Apply geopricing to service prices
 */
export function applyGeopricingToServices(
  services: Array<{
    name: string
    pricePerUnit: number
    area: number
    totalPrice: number
  }>,
  geopricingResult: GeopricingResult
): Array<any> {
  
  return services.map(service => {
    let adjustedPrice = service.totalPrice
    const serviceName = service.name.toLowerCase()
    
    // Apply service-specific adjustments first
    const serviceKey = serviceName.includes('lawn') ? 'lawn' :
                      serviceName.includes('driveway') ? 'driveway' :
                      serviceName.includes('sidewalk') ? 'sidewalk' : null
    
    if (serviceKey && geopricingResult.priceModifications[serviceKey]) {
      const serviceAdjustment = geopricingResult.priceModifications[serviceKey]!
      adjustedPrice = adjustedPrice * (1 + serviceAdjustment / 100)
    }
    
    // Apply general zone adjustment
    const { type, value } = geopricingResult.finalAdjustment
    
    switch (type) {
      case 'percentage':
        adjustedPrice = adjustedPrice * (1 + value / 100)
        break
      case 'fixed':
        adjustedPrice = adjustedPrice + value
        break
      case 'multiplier':
        adjustedPrice = adjustedPrice * value
        break
    }
    
    return {
      ...service,
      originalPrice: service.totalPrice,
      adjustedPrice,
      geopricingApplied: adjustedPrice !== service.totalPrice,
      totalPrice: adjustedPrice
    }
  })
}