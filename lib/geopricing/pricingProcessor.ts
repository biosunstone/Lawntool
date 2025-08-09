/**
 * Core Pricing Processing Engine
 * Handles the complete workflow from form submission to final price calculation
 */

import GeopricingConfig from '@/models/GeopricingConfig';
import PricingCalculation from '@/models/PricingCalculation';
import { geocodeAddress, calculateRealDriveTime } from './googleMapsService';
import connectDB from '@/lib/saas/db';

export interface FormSubmissionData {
  customerAddress: string;
  propertySize: number; // square feet
  services?: Array<{
    type: string;
    area: number;
  }>;
  customerEmail?: string;
  customerPhone?: string;
  source?: string;
  sessionId?: string;
}

export interface ProcessingResult {
  calculationId: string;
  success: boolean;
  data?: {
    driveTime: number;
    zone: string;
    basePrice: number;
    adjustedPrice: number;
    finalPrice: number;
    formattedTable?: string;
    explanation?: string;
  };
  error?: string;
  performanceMetrics?: any;
}

/**
 * Main processing function - handles complete workflow
 */
export async function processGeopricingRequest(
  businessId: string,
  formData: FormSubmissionData,
  options: {
    generateClaudeTable?: boolean;
    saveToDatabase?: boolean;
    useCache?: boolean;
  } = {}
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const performanceBreakdown: any = {};
  
  await connectDB();
  
  try {
    // Step 1: Retrieve configuration
    const configStart = Date.now();
    console.log('Looking for config with businessId:', businessId, typeof businessId);
    const config:any = await GeopricingConfig.getActiveConfig(businessId);
    
    if (!config) {
      console.error('Config not found for businessId:', businessId);
      throw new Error('No active pricing configuration found');
    }
    performanceBreakdown.configRetrieval = Date.now() - configStart;
    
    // Step 2: Geocode customer address
    const geocodeStart = Date.now();
    const customerLocation = await geocodeAddress(formData.customerAddress);
    performanceBreakdown.geocoding = Date.now() - geocodeStart;
    
    // Step 3: Calculate drive time
    const driveTimeStart = Date.now();
    const driveTimeResult = await calculateRealDriveTime(
      {
        lat: config.shopLocation.coordinates.lat,
        lng: config.shopLocation.coordinates.lng,
        address: config.shopLocation.address
      },
      {
        lat: customerLocation.lat,
        lng: customerLocation.lng,
        address: customerLocation.address
      },
      {
        trafficModel: config.apiSettings.trafficModel,
        avoidHighways: config.apiSettings.avoidHighways,
        avoidTolls: config.apiSettings.avoidTolls,
        useCache: options.useCache !== false
      }
    );
    performanceBreakdown.driveTimeApi = Date.now() - driveTimeStart;
    
    // Step 4: Match to zone
    const zoneStart = Date.now();
    const zone = config.getZoneForDriveTime(driveTimeResult.driveTimeMinutes);
    performanceBreakdown.zoneMatching = Date.now() - zoneStart;
    
    // Step 5: Calculate pricing
    const pricingStart = Date.now();
    const baseRate = config.pricing.baseRatePer1000SqFt;
    const basePrice = (formData.propertySize / 1000) * baseRate;
    
    // Apply adjustment
    let adjustmentAmount = 0;
    let adjustedPrice = basePrice;
    
    if (zone.adjustmentType === 'percentage') {
      adjustmentAmount = basePrice * (zone.adjustmentValue / 100);
      adjustedPrice = basePrice + adjustmentAmount;
    } else {
      adjustmentAmount = zone.adjustmentValue;
      adjustedPrice = basePrice + adjustmentAmount;
    }
    
    // Apply minimum charge
    const finalPrice = Math.max(adjustedPrice, config.pricing.minimumCharge);
    
    // Round to configured precision
    const roundedPrice = Math.round(finalPrice / config.businessRules.roundPriceTo) * config.businessRules.roundPriceTo;
    
    performanceBreakdown.priceCalculation = Date.now() - pricingStart;
    
    // Step 6: Generate Claude table if requested
    let claudeData: any = {};
    if (options.generateClaudeTable) {
      const claudeStart = Date.now();
      claudeData = await generateClaudeFormattedOutput({
        customerAddress: formData.customerAddress,
        shopAddress: config.shopLocation.address,
        driveTime: driveTimeResult.driveTimeMinutes,
        distance: driveTimeResult.distanceText,
        zone,
        baseRate,
        propertySize: formData.propertySize,
        basePrice,
        adjustedPrice: roundedPrice,
        adjustment: zone.adjustmentValue,
        currency: config.pricing.currency
      });
      performanceBreakdown.claudeFormatting = Date.now() - claudeStart;
    }
    
    // Step 7: Save to database if requested
    let calculation: any = null;
    const calculationId = `CALC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (options.saveToDatabase !== false) {
      calculation = await PricingCalculation.create({
        businessId,
        calculationId,
        configId: config._id,
        customer: {
          address: customerLocation.address,
          coordinates: {
            lat: customerLocation.lat,
            lng: customerLocation.lng
          },
          city: customerLocation.city,
          province: customerLocation.province,
          postalCode: customerLocation.postalCode,
          propertySize: formData.propertySize,
          services: formData.services || []
        },
        shop: {
          address: config.shopLocation.address,
          coordinates: config.shopLocation.coordinates,
          city: config.shopLocation.city
        },
        driveTimeCalculation: {
          provider: 'google',
          requestedAt: new Date(driveTimeStart),
          responseTime: performanceBreakdown.driveTimeApi,
          result: {
            driveTimeMinutes: driveTimeResult.driveTimeMinutes,
            distanceKm: driveTimeResult.distanceKm,
            distanceText: driveTimeResult.distanceText,
            durationText: driveTimeResult.durationText,
            trafficModel: config.apiSettings.trafficModel
          },
          fromCache: driveTimeResult.fromCache || false
        },
        zoneAssignment: {
          matchedZone: zone.type,
          zoneName: zone.name,
          zoneThresholds: {
            min: zone.driveTimeThreshold.min,
            max: zone.driveTimeThreshold.max
          },
          driveTimeMinutes: driveTimeResult.driveTimeMinutes,
          adjustmentType: zone.adjustmentType,
          adjustmentValue: zone.adjustmentValue,
          adjustmentReason: zone.description
        },
        pricing: {
          baseRatePer1000SqFt: baseRate,
          propertySize: formData.propertySize,
          basePrice,
          adjustment: {
            type: zone.adjustmentType,
            value: zone.adjustmentValue,
            amount: adjustmentAmount
          },
          adjustedPrice,
          minimumCharge: config.pricing.minimumCharge,
          finalPrice: roundedPrice,
          currency: config.pricing.currency,
          roundedTo: config.businessRules.roundPriceTo
        },
        totalSummary: {
          totalBasePrice: basePrice,
          totalAdjustment: adjustmentAmount,
          totalFinalPrice: roundedPrice,
          savingsOrSurcharge: adjustmentAmount,
          percentageChange: (adjustmentAmount / basePrice) * 100
        },
        claudeIntegration: claudeData.success ? {
          requestSentAt: new Date(Date.now() - (performanceBreakdown.claudeFormatting || 0)),
          responseReceivedAt: new Date(),
          formattedTable: claudeData.table,
          explanation: claudeData.explanation
        } : undefined,
        source: formData.source as any || 'website',
        sessionId: formData.sessionId,
        totalProcessingTime: Date.now() - startTime,
        breakdownTimes: performanceBreakdown
      });
    }
    
    return {
      calculationId: calculationId,
      success: true,
      data: {
        driveTime: driveTimeResult.driveTimeMinutes,
        zone: zone.name,
        basePrice,
        adjustedPrice,
        finalPrice: roundedPrice,
        formattedTable: claudeData.table,
        explanation: claudeData.explanation
      },
      performanceMetrics: {
        totalTime: Date.now() - startTime,
        breakdown: performanceBreakdown
      }
    };
    
  } catch (error: any) {
    console.error('Geopricing processing error:', error);
    
    return {
      calculationId: `ERROR-${Date.now()}`,
      success: false,
      error: error.message || 'Processing failed',
      performanceMetrics: {
        totalTime: Date.now() - startTime,
        breakdown: performanceBreakdown
      }
    };
  }
}

/**
 * Generate Claude-formatted output
 */
async function generateClaudeFormattedOutput(data: {
  customerAddress: string;
  shopAddress: string;
  driveTime: number;
  distance: string;
  zone: any;
  baseRate: number;
  propertySize: number;
  basePrice: number;
  adjustedPrice: number;
  adjustment: number;
  currency: string;
}): Promise<{ success: boolean; table?: string; explanation?: string; error?: string }> {
  try {
    // Generate the rate table
    const zones = [
      {
        name: 'Close Proximity',
        driveTime: '0-5 minutes',
        adjustment: -5,
        rate: data.baseRate * 0.95
      },
      {
        name: 'Standard Service',
        driveTime: '5-20 minutes',
        adjustment: 0,
        rate: data.baseRate
      },
      {
        name: 'Extended Service',
        driveTime: '20+ minutes',
        adjustment: 10,
        rate: data.baseRate * 1.10
      }
    ];
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: data.currency
      }).format(amount);
    };
    
    // Create HTML table
    const table = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Zone Name</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Distance/Drive Time</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Rate per 1,000 sq ft</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Price for ${data.propertySize.toLocaleString()} sq ft</th>
          </tr>
        </thead>
        <tbody>
          ${zones.map(z => {
            const isCurrentZone = z.name === data.zone.name;
            const price = (data.propertySize / 1000) * z.rate;
            const style = isCurrentZone ? 'background-color: #f0fdf4; font-weight: bold;' : '';
            const color = z.adjustment < 0 ? 'color: #16a34a;' : z.adjustment > 0 ? 'color: #dc2626;' : '';
            
            return `
              <tr style="${style}">
                <td style="padding: 12px; border: 1px solid #e5e7eb;">
                  ${z.name}
                  ${isCurrentZone ? ' ✓' : ''}
                </td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">
                  ${z.driveTime}
                </td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; ${color}">
                  ${formatCurrency(z.rate)}
                  ${z.adjustment !== 0 ? `(${z.adjustment > 0 ? '+' : ''}${z.adjustment}%)` : ''}
                </td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; ${color}">
                  ${formatCurrency(price)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    
    // Generate explanation
    let explanation = '';
    if (data.adjustment < 0) {
      explanation = `Great news! Your property at ${data.customerAddress} is only ${Math.round(data.driveTime)} minutes from our service center. You qualify for our Close Proximity discount of ${Math.abs(data.adjustment)}%, bringing your total to ${formatCurrency(data.adjustedPrice)}. This discount helps us optimize our service routes while passing the savings directly to you.`;
    } else if (data.adjustment > 0) {
      explanation = `Your property at ${data.customerAddress} is located ${Math.round(data.driveTime)} minutes from our service center. A ${data.adjustment}% travel surcharge applies to cover the additional time and fuel costs for servicing your area, bringing your total to ${formatCurrency(data.adjustedPrice)}. We appreciate your understanding and look forward to providing you with excellent service.`;
    } else {
      explanation = `Your property at ${data.customerAddress} is ${Math.round(data.driveTime)} minutes from our service center, falling within our standard service area. You'll receive our competitive base rate of ${formatCurrency(data.baseRate)} per 1,000 sq ft, with a total of ${formatCurrency(data.adjustedPrice)} for your ${data.propertySize.toLocaleString()} sq ft property.`;
    }
    
    return {
      success: true,
      table,
      explanation
    };
    
  } catch (error: any) {
    console.error('Claude formatting error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Batch process multiple addresses
 */
export async function batchProcessAddresses(
  businessId: string,
  addresses: Array<{ address: string; propertySize: number }>,
  options: {
    parallel?: boolean;
    batchSize?: number;
  } = {}
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  const batchSize = options.batchSize || 5;
  
  if (options.parallel) {
    // Process in parallel batches
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => 
          processGeopricingRequest(businessId, {
            customerAddress: item.address,
            propertySize: item.propertySize
          }, {
            generateClaudeTable: false,
            useCache: true
          })
        )
      );
      results.push(...batchResults);
    }
  } else {
    // Process sequentially
    for (const item of addresses) {
      const result = await processGeopricingRequest(businessId, {
        customerAddress: item.address,
        propertySize: item.propertySize
      }, {
        generateClaudeTable: false,
        useCache: true
      });
      results.push(result);
    }
  }
  
  return results;
}