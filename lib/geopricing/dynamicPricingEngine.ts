/**
 * Dynamic Geopricing™ Engine for Multi-City Lawn Care Services
 * Calculates location-based pricing with automatic zone detection
 */

import { calculateDriveTime } from './driveTime'

export interface ShopLocation {
  city: string
  province: string
  address: string
  lat: number
  lng: number
  baseRatePer1000SqFt: number
  businessId?: string
}

export interface PricingZone {
  name: string
  description: string
  driveTimeRange: string
  adjustment: number
  color: string
  textColor: string
}

export interface GeopricingResult {
  customerAddress: string
  city: string
  driveTimeMinutes: number
  appliedZone: PricingZone
  baseRate: number
  adjustedRate: number
  adjustment: number
  rateTable: RateTableEntry[]
  explanation: string
  propertySize?: number
  totalPrice?: number
}

export interface RateTableEntry {
  zoneName: string
  distanceDriveTime: string
  ratePer1000SqFt: number
  priceForProperty?: number
  isCurrent: boolean
  styling: {
    backgroundColor?: string
    textColor?: string
    borderColor?: string
  }
}

// Define standard zones used across all cities
const PRICING_ZONES: PricingZone[] = [
  {
    name: 'Close Proximity',
    description: 'Quick service with minimal travel',
    driveTimeRange: '0-5 minutes',
    adjustment: -5, // 5% discount
    color: 'green',
    textColor: 'text-green-600'
  },
  {
    name: 'Standard Service',
    description: 'Regular service area',
    driveTimeRange: '5-20 minutes',
    adjustment: 0, // Base rate
    color: 'blue',
    textColor: 'text-blue-600'
  },
  {
    name: 'Extended Service',
    description: 'Distant locations requiring extra travel',
    driveTimeRange: '20+ minutes',
    adjustment: 10, // 10% surcharge
    color: 'red',
    textColor: 'text-red-600'
  }
]

/**
 * Main function to calculate Geopricing for any address
 */
export async function calculateDynamicGeopricing(
  customerAddress: string,
  shopLocation: ShopLocation,
  propertySize?: number // in square feet
): Promise<GeopricingResult> {
  
  // Calculate drive time from shop to customer
  const driveTimeMinutes = await calculateDriveTime(
    shopLocation,
    { address: customerAddress } as any, // TODO: Fix type - should geocode address first
    'bestguess'
  )
  
  // Determine which zone applies
  let appliedZone: PricingZone
  
  if (driveTimeMinutes <= 5) {
    appliedZone = PRICING_ZONES[0] // Close Proximity
  } else if (driveTimeMinutes <= 20) {
    appliedZone = PRICING_ZONES[1] // Standard Service
  } else {
    appliedZone = PRICING_ZONES[2] // Extended Service
  }
  
  // Calculate adjusted rate
  const baseRate = shopLocation.baseRatePer1000SqFt
  const adjustedRate = baseRate * (1 + appliedZone.adjustment / 100)
  
  // Generate rate table for all zones
  const rateTable = generateRateTable(
    shopLocation.baseRatePer1000SqFt,
    propertySize,
    appliedZone.name
  )
  
  // Generate explanation text
  const explanation = generateExplanation(
    appliedZone,
    driveTimeMinutes,
    shopLocation.city
  )
  
  // Calculate total price if property size is provided
  let totalPrice: number | undefined
  if (propertySize) {
    totalPrice = (propertySize / 1000) * adjustedRate
  }
  
  return {
    customerAddress,
    city: shopLocation.city,
    driveTimeMinutes,
    appliedZone,
    baseRate,
    adjustedRate,
    adjustment: appliedZone.adjustment,
    rateTable,
    explanation,
    propertySize,
    totalPrice
  }
}

/**
 * Generate a complete rate table showing all zones
 */
function generateRateTable(
  baseRate: number,
  propertySize: number | undefined,
  currentZoneName: string
): RateTableEntry[] {
  return PRICING_ZONES.map(zone => {
    const rate = baseRate * (1 + zone.adjustment / 100)
    const priceForProperty = propertySize ? (propertySize / 1000) * rate : undefined
    const isCurrent = zone.name === currentZoneName
    
    return {
      zoneName: zone.name,
      distanceDriveTime: zone.driveTimeRange,
      ratePer1000SqFt: rate,
      priceForProperty,
      isCurrent,
      styling: {
        backgroundColor: isCurrent ? `${zone.color}-50` : undefined,
        textColor: zone.adjustment < 0 ? 'text-green-600' : 
                   zone.adjustment > 0 ? 'text-red-600' : 
                   'text-gray-900',
        borderColor: isCurrent ? `border-${zone.color}-500` : 'border-gray-200'
      }
    }
  })
}

/**
 * Generate human-friendly explanation text
 */
function generateExplanation(
  zone: PricingZone,
  actualDriveTime: number,
  city: string
): string {
  const roundedTime = Math.round(actualDriveTime)
  
  if (zone.adjustment < 0) {
    return `Great news! Your property is only ${roundedTime} minutes from our ${city} location. ` +
           `You qualify for our Close Proximity discount of ${Math.abs(zone.adjustment)}% off the base rate. ` +
           `This helps us optimize our routes and pass the savings on to you!`
  } else if (zone.adjustment > 0) {
    return `Your property is ${roundedTime} minutes from our ${city} service center. ` +
           `A ${zone.adjustment}% travel surcharge applies to cover the additional time and fuel costs ` +
           `for servicing your area. We appreciate your understanding and look forward to serving you!`
  } else {
    return `Your property is ${roundedTime} minutes from our ${city} location, ` +
           `falling within our standard service area. You'll receive our regular competitive rates ` +
           `with no additional charges or discounts applied.`
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format the rate table as HTML for email or display
 */
export function formatRateTableHTML(result: GeopricingResult): string {
  const rows = result.rateTable.map(entry => {
    const highlight = entry.isCurrent ? 'style="background-color: #f0fdf4; font-weight: bold;"' : ''
    const priceColor = entry.ratePer1000SqFt < result.baseRate ? 'color: #16a34a;' :
                      entry.ratePer1000SqFt > result.baseRate ? 'color: #dc2626;' : ''
    
    return `
      <tr ${highlight}>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">
          ${entry.zoneName}
          ${entry.isCurrent ? ' ✓' : ''}
        </td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">
          ${entry.distanceDriveTime}
        </td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; ${priceColor}">
          ${formatCurrency(entry.ratePer1000SqFt)}
        </td>
        ${entry.priceForProperty ? `
          <td style="padding: 8px; border: 1px solid #e5e7eb; ${priceColor}">
            ${formatCurrency(entry.priceForProperty)}
          </td>
        ` : ''}
      </tr>
    `
  }).join('')
  
  return `
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Zone Name</th>
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Distance/Drive Time</th>
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Rate per 1,000 sq ft</th>
          ${result.propertySize ? `
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">
              Your Price (${result.propertySize.toLocaleString()} sq ft)
            </th>
          ` : ''}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div style="margin-top: 16px; padding: 12px; background-color: #f0f9ff; border-radius: 8px;">
      <p style="margin: 0; color: #1e40af;">
        <strong>Your Zone:</strong> ${result.explanation}
      </p>
    </div>
  `
}

/**
 * Get shop locations for all cities (this would come from database)
 */
export async function getShopLocation(city: string): Promise<ShopLocation | null> {
  // This would be replaced with actual database query
  const shopLocations: Record<string, ShopLocation> = {
    'Toronto': {
      city: 'Toronto',
      province: 'ON',
      address: '100 Queen St W, Toronto, ON M5H 2N1',
      lat: 43.6532,
      lng: -79.3832,
      baseRatePer1000SqFt: 20 // $20 per 1,000 sq ft
    },
    'Mississauga': {
      city: 'Mississauga',
      province: 'ON',
      address: '201 City Centre Dr, Mississauga, ON L5B 2T4',
      lat: 43.5890,
      lng: -79.6441,
      baseRatePer1000SqFt: 18
    },
    'Ottawa': {
      city: 'Ottawa',
      province: 'ON',
      address: '110 Laurier Ave W, Ottawa, ON K1P 1J1',
      lat: 45.4215,
      lng: -75.6972,
      baseRatePer1000SqFt: 22
    },
    'Calgary': {
      city: 'Calgary',
      province: 'AB',
      address: '200 Barclay Parade SW, Calgary, AB T2P 4R5',
      lat: 51.0447,
      lng: -114.0719,
      baseRatePer1000SqFt: 25
    },
    'Vancouver': {
      city: 'Vancouver',
      province: 'BC',
      address: '777 Hornby St, Vancouver, BC V6Z 1S4',
      lat: 49.2827,
      lng: -123.1207,
      baseRatePer1000SqFt: 28
    }
  }
  
  // Find shop by city name (case-insensitive)
  const cityKey = Object.keys(shopLocations).find(
    key => key.toLowerCase() === city.toLowerCase()
  )
  
  return cityKey ? shopLocations[cityKey] : null
}

/**
 * Package options with multipliers
 */
export interface ServicePackage {
  name: string
  description: string
  multiplier: number
  features: string[]
}

export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    name: 'Basic',
    description: 'Essential lawn mowing and edging',
    multiplier: 1.0,
    features: ['Mowing', 'Basic edging', 'Grass clipping removal']
  },
  {
    name: 'Standard',
    description: 'Complete lawn care with trimming',
    multiplier: 1.3,
    features: ['Everything in Basic', 'Precision trimming', 'Weed control', 'Leaf blowing']
  },
  {
    name: 'Premium',
    description: 'Full-service lawn care and maintenance',
    multiplier: 1.6,
    features: ['Everything in Standard', 'Fertilization', 'Aeration', 'Seasonal treatments', 'Priority scheduling']
  }
]

/**
 * Calculate package pricing based on base rate and selected package
 */
export function calculatePackagePricing(
  baseRate: number,
  packageType: 'Basic' | 'Standard' | 'Premium',
  propertySize: number
): number {
  const pkg = SERVICE_PACKAGES.find(p => p.name === packageType)
  if (!pkg) return 0
  
  const ratePerThousand = baseRate * pkg.multiplier
  return (propertySize / 1000) * ratePerThousand
}