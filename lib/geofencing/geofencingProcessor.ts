/**
 * Geofencing Processor
 * Handles zone determination, service availability, and pricing calculations
 */

import GeofencingConfig, { IZone, IServiceRule } from '@/models/GeofencingConfig';
import { calculateDriveTimeWithCache, geocodeAddress } from './driveTimeCalculator';
import connectDB from '@/lib/saas/db';

export interface GeofencingRequest {
  businessId: string;
  customerAddress: string;
  propertySize: number; // in square feet
  customerEmail?: string;
  customerPhone?: string;
}

export interface ServicePricing {
  serviceName: string;
  serviceType: string;
  isAvailable: boolean;
  unavailableReason?: string;
  baseRate: number;
  zoneAdjustedRate: number;
  serviceSpecificAdjustment: number;
  finalRate: number;
  totalPrice: number;
  description: string;
  labelColor: string;
}

export interface GeofencingResult {
  success: boolean;
  customerAddress?: string;
  customerCoordinates?: {
    latitude: number;
    longitude: number;
  };
  driveTimeMinutes?: number;
  formattedDriveTime?: string;
  distanceMiles?: number;
  assignedZone?: IZone;
  inServiceArea?: boolean;
  propertySize?: number;
  services?: ServicePricing[];
  allZonesTable?: ZoneTableRow[];
  formattedTable?: string;
  summary?: string;
  noServiceMessage?: string;
  contactSalesLink?: string;
  error?: string;
}

export interface ZoneTableRow {
  zoneName: string;
  driveTimeRange: string;
  baseRate: number;
  zoneAdjustedRate: number;
  servicesAvailable: string[];
  isCustomerZone: boolean;
  color: string;
}

/**
 * Process geofencing request
 */
export async function processGeofencing(
  request: GeofencingRequest
): Promise<GeofencingResult> {
  await connectDB();
  
  try {
    // Get active configuration
    const config = await GeofencingConfig.getActiveConfig(request.businessId);
    
    if (!config) {
      return {
        success: false,
        error: 'No active geofencing configuration found for this business'
      };
    }
    
    // Geocode customer address
    const geocodeResult = await geocodeAddress(request.customerAddress);
    if (!geocodeResult.success || !geocodeResult.latitude || !geocodeResult.longitude) {
      return {
        success: false,
        error: `Unable to locate address: ${geocodeResult.error || 'Invalid address'}`
      };
    }
    
    // Calculate drive time from shop to customer
    const driveTimeResult = await calculateDriveTimeWithCache({
      origin: {
        latitude: config.shopLocation.latitude,
        longitude: config.shopLocation.longitude
      },
      destination: {
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude
      }
    });
    
    if (!driveTimeResult.success || !driveTimeResult.driveTimeMinutes) {
      return {
        success: false,
        error: `Unable to calculate route: ${driveTimeResult.error || 'No route found'}`
      };
    }
    
    // Determine zone based on drive time
    const assignedZone = determineZone(driveTimeResult.driveTimeMinutes, config.zones);
    
    // Check if in service area
    const inServiceArea = driveTimeResult.driveTimeMinutes <= config.maxServiceDistanceMinutes;
    
    if (!inServiceArea) {
      return {
        success: true,
        customerAddress: geocodeResult.formattedAddress || request.customerAddress,
        customerCoordinates: {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude
        },
        driveTimeMinutes: driveTimeResult.driveTimeMinutes,
        formattedDriveTime: driveTimeResult.formattedDuration,
        distanceMiles: driveTimeResult.distanceMiles,
        inServiceArea: false,
        noServiceMessage: config.outOfServiceMessage,
        contactSalesLink: config.contactSalesLink,
        allZonesTable: generateZonesTable(config, null)
      };
    }
    
    // Calculate service pricing
    const services = calculateServicePricing(
      config,
      assignedZone!,
      request.propertySize
    );
    
    // Generate zones table
    const allZonesTable = generateZonesTable(config, assignedZone);
    
    // Generate formatted HTML table
    const formattedTable = generateHTMLTable(
      services,
      allZonesTable,
      request.propertySize,
      config.displaySettings
    );
    
    // Generate summary
    const summary = generateSummary(
      assignedZone!,
      services,
      driveTimeResult.driveTimeMinutes,
      request.propertySize
    );
    
    return {
      success: true,
      customerAddress: geocodeResult.formattedAddress || request.customerAddress,
      customerCoordinates: {
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude
      },
      driveTimeMinutes: driveTimeResult.driveTimeMinutes,
      formattedDriveTime: driveTimeResult.formattedDuration,
      distanceMiles: driveTimeResult.distanceMiles,
      assignedZone: assignedZone || undefined,
      inServiceArea: true,
      propertySize: request.propertySize,
      services,
      allZonesTable,
      formattedTable,
      summary
    };
    
  } catch (error: any) {
    console.error('Geofencing processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process geofencing request'
    };
  }
}

/**
 * Determine which zone the customer falls into based on drive time
 */
function determineZone(driveTimeMinutes: number, zones: IZone[]): IZone | null {
  // Sort zones by priority and min drive time
  const sortedZones = [...zones]
    .filter(zone => zone.isActive)
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.minDriveTimeMinutes - b.minDriveTimeMinutes;
    });
  
  for (const zone of sortedZones) {
    if (driveTimeMinutes >= zone.minDriveTimeMinutes) {
      if (!zone.maxDriveTimeMinutes || driveTimeMinutes <= zone.maxDriveTimeMinutes) {
        return zone;
      }
    }
  }
  
  return null;
}

/**
 * Calculate pricing for all services based on zone and rules
 */
function calculateServicePricing(
  config: any,
  zone: IZone,
  propertySize: number
): ServicePricing[] {
  const services: ServicePricing[] = [];
  const baseRate = config.baseRatePer1000SqFt;
  
  // Calculate zone-adjusted rate
  const zoneAdjustedRate = baseRate * (1 + zone.surchargePercentage / 100);
  
  for (const serviceRule of config.serviceRules) {
    if (!serviceRule.isActive) continue;
    
    // Check if service is available in this zone
    const isAvailable = serviceRule.availableInZones.includes(zone.zoneId);
    
    // Calculate service-specific adjustment
    let serviceSpecificAdjustment = 0;
    let finalRate = zoneAdjustedRate;
    
    if (isAvailable && serviceRule.additionalFeePercentage) {
      serviceSpecificAdjustment = serviceRule.additionalFeePercentage;
      finalRate = zoneAdjustedRate * (1 + serviceSpecificAdjustment / 100);
    }
    
    // Calculate total price
    const totalPrice = isAvailable 
      ? Math.max((propertySize / 1000) * finalRate, config.minimumCharge)
      : 0;
    
    // Determine label color
    let labelColor = config.displaySettings.unavailableServiceColor;
    if (isAvailable) {
      labelColor = serviceSpecificAdjustment > 0 || zone.surchargePercentage > 0
        ? config.displaySettings.surchargeServiceColor
        : config.displaySettings.availableServiceColor;
    }
    
    services.push({
      serviceName: serviceRule.serviceName,
      serviceType: serviceRule.serviceType,
      isAvailable,
      unavailableReason: !isAvailable ? `Not available in ${zone.zoneName}` : undefined,
      baseRate,
      zoneAdjustedRate,
      serviceSpecificAdjustment,
      finalRate,
      totalPrice,
      description: serviceRule.description,
      labelColor
    });
  }
  
  return services;
}

/**
 * Generate zones table for display
 */
function generateZonesTable(config: any, customerZone: IZone | null): ZoneTableRow[] {
  const table: ZoneTableRow[] = [];
  
  // Sort zones by drive time
  const sortedZones = [...config.zones]
    .filter((zone: IZone) => zone.isActive)
    .sort((a: IZone, b: IZone) => a.minDriveTimeMinutes - b.minDriveTimeMinutes);
  
  for (const zone of sortedZones) {
    const driveTimeRange = zone.maxDriveTimeMinutes
      ? `${zone.minDriveTimeMinutes}-${zone.maxDriveTimeMinutes} min`
      : `${zone.minDriveTimeMinutes}+ min`;
    
    const zoneAdjustedRate = config.baseRatePer1000SqFt * (1 + zone.surchargePercentage / 100);
    
    // Get available services for this zone
    const servicesAvailable = config.serviceRules
      .filter((rule: IServiceRule) => 
        rule.isActive && rule.availableInZones.includes(zone.zoneId)
      )
      .map((rule: IServiceRule) => rule.serviceName);
    
    table.push({
      zoneName: zone.zoneName,
      driveTimeRange,
      baseRate: config.baseRatePer1000SqFt,
      zoneAdjustedRate,
      servicesAvailable,
      isCustomerZone: customerZone?.zoneId === zone.zoneId,
      color: zone.color
    });
  }
  
  return table;
}

/**
 * Generate HTML formatted table
 */
function generateHTMLTable(
  services: ServicePricing[],
  zones: ZoneTableRow[],
  propertySize: number,
  displaySettings: any
): string {
  // Service pricing table
  const serviceRows = services.map(service => {
    const rowClass = service.isAvailable ? '' : 'opacity-50';
    const priceDisplay = service.isAvailable 
      ? `$${service.totalPrice.toFixed(2)}`
      : 'Unavailable';
    
    const adjustmentsDisplay = [];
    if (service.zoneAdjustedRate !== service.baseRate) {
      const zoneSurcharge = ((service.zoneAdjustedRate / service.baseRate - 1) * 100).toFixed(0);
      adjustmentsDisplay.push(`Zone: +${zoneSurcharge}%`);
    }
    if (service.serviceSpecificAdjustment > 0) {
      adjustmentsDisplay.push(`Service: +${service.serviceSpecificAdjustment}%`);
    }
    
    return `
      <tr class="${rowClass}">
        <td style="padding: 12px; border: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${service.labelColor};"></span>
            ${service.serviceName}
          </div>
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">
          ${service.isAvailable ? '✓' : '✗'}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">
          $${service.baseRate.toFixed(2)}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">
          $${service.finalRate.toFixed(2)}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">
          ${adjustmentsDisplay.join(', ') || 'None'}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
          ${priceDisplay}
        </td>
        ${service.isAvailable ? `
          <td style="padding: 12px; border: 1px solid #e5e7eb;">
            <button style="background-color: #16a34a; color: white; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;">
              Book Service
            </button>
          </td>
        ` : `
          <td style="padding: 12px; border: 1px solid #e5e7eb;">
            <span style="color: #9ca3af; font-size: 12px;">${service.unavailableReason}</span>
          </td>
        `}
      </tr>
    `;
  }).join('');
  
  // Zone information table
  const zoneRows = zones.map(zone => {
    const rowStyle = zone.isCustomerZone 
      ? 'background-color: #fef3c7; font-weight: bold;'
      : '';
    
    return `
      <tr style="${rowStyle}">
        <td style="padding: 12px; border: 1px solid #e5e7eb;">
          ${zone.zoneName}
          ${zone.isCustomerZone ? ' ⭐' : ''}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">
          ${zone.driveTimeRange}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">
          $${zone.baseRate.toFixed(2)}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">
          $${zone.zoneAdjustedRate.toFixed(2)}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">
          ${zone.servicesAvailable.join(', ') || 'None'}
        </td>
      </tr>
    `;
  }).join('');
  
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif;">
      <h3 style="margin-bottom: 16px; font-size: 18px; font-weight: 600;">Service Pricing for ${propertySize.toLocaleString()} sq ft</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Service</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Available</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Base Rate</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Final Rate</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Adjustments</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Total Price</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRows}
        </tbody>
      </table>
      
      <h3 style="margin-bottom: 16px; font-size: 18px; font-weight: 600;">Service Zone Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Zone Name</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Drive Time Range</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Base Rate (per 1,000 sq ft)</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Zone-Adjusted Rate</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Services Available</th>
          </tr>
        </thead>
        <tbody>
          ${zoneRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate plain-language summary
 */
function generateSummary(
  zone: IZone,
  services: ServicePricing[],
  driveTimeMinutes: number,
  propertySize: number
): string {
  const availableServices = services.filter(s => s.isAvailable);
  const unavailableServices = services.filter(s => !s.isAvailable);
  
  let summary = `Your property is located in **${zone.zoneName}** (${driveTimeMinutes} minutes drive from our shop).\n\n`;
  
  // Available services
  if (availableServices.length > 0) {
    summary += `**Available Services:**\n`;
    for (const service of availableServices) {
      summary += `• ${service.serviceName}: $${service.totalPrice.toFixed(2)}`;
      
      // Explain adjustments
      const adjustments = [];
      if (zone.surchargePercentage > 0) {
        adjustments.push(`${zone.surchargePercentage}% zone surcharge`);
      }
      if (service.serviceSpecificAdjustment > 0) {
        adjustments.push(`${service.serviceSpecificAdjustment}% service fee`);
      }
      if (adjustments.length > 0) {
        summary += ` (includes ${adjustments.join(' and ')})`;
      }
      summary += '\n';
    }
  }
  
  // Unavailable services
  if (unavailableServices.length > 0) {
    summary += `\n**Unavailable Services:**\n`;
    for (const service of unavailableServices) {
      summary += `• ${service.serviceName}: ${service.unavailableReason}\n`;
    }
  }
  
  // Zone explanation
  summary += `\n**Zone Details:**\n`;
  summary += `${zone.description}`;
  if (zone.surchargePercentage > 0) {
    summary += ` This zone has a ${zone.surchargePercentage}% surcharge applied to all services due to the additional travel distance.`;
  } else {
    summary += ` This zone receives our standard base rate pricing.`;
  }
  
  return summary;
}