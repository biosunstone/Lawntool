/**
 * ZIP Code/Postal Code-based Pricing Processor
 * Implements Deep Lawn's Geopricing™ logic using ZIP codes (US) and Postal codes (Canada)
 */

import ZipCodePricing, { IZipCodeRule } from '@/models/ZipCodePricing';
import connectDB from '@/lib/saas/db';

export interface ZipCodePricingRequest {
  businessId: string;
  customerZipCode: string; // ZIP code (US) or Postal code (Canada)
  propertySize: number; // in square feet
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  country?: 'US' | 'CA'; // Optional country specification
}

export interface ZipCodePricingResult {
  success: boolean;
  zipCode?: string;
  inServiceArea?: boolean;
  pricing?: {
    baseRate: number;
    adjustedRate: number;
    adjustment: {
      type: 'fixed' | 'percentage';
      value: number;
      description: string;
    };
    propertySize: number;
    totalPrice: number;
    currency: string;
  };
  allZonesTable?: PricingTableRow[];
  formattedTable?: string;
  explanation?: string;
  noServiceMessage?: string;
  contactSalesLink?: string;
  error?: string;
}

export interface PricingTableRow {
  zipCode: string;
  adjustment: string;
  adjustedRate: number;
  totalPrice: number;
  isCustomerZone: boolean;
  color: string;
}

/**
 * Process ZIP code-based pricing request
 */
export async function processZipCodePricing(
  request: ZipCodePricingRequest
): Promise<ZipCodePricingResult> {
  await connectDB();
  
  try {
    // Get active configuration
    const config = await ZipCodePricing.getActiveConfig(request.businessId);
    
    if (!config) {
      return {
        success: false,
        error: 'No active pricing configuration found for this business'
      };
    }
    
    // Normalize ZIP/Postal code - remove spaces for Canadian postal codes
    const normalizedZip = request.customerZipCode.trim().toUpperCase().replace(/\s+/g, '');
    
    // First check for specific ZIP/postal code override
    let customerRule = config.serviceZipCodes?.find(
      (rule: IZipCodeRule) => rule.zipCode === normalizedZip && rule.isActive
    );
    
    // If no specific rule, check region-based rules
    if (!customerRule && config.regionRules) {
      // Sort by priority (higher priority first)
      const sortedRegionRules = [...config.regionRules]
        .filter((rule: any) => rule.isActive)
        .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
      
      for (const regionRule of sortedRegionRules) {
        const regex = new RegExp(regionRule.pattern, 'i');
        if (regex.test(normalizedZip)) {
          customerRule = {
            zipCode: normalizedZip,
            adjustmentType: regionRule.adjustmentType || 'fixed',
            adjustmentValue: regionRule.adjustmentValue,
            description: regionRule.description,
            isActive: true
          };
          break;
        }
      }
    }
    
    // If still no rule and serviceAllCodes is true, use default rule
    if (!customerRule && config.serviceAllCodes && config.defaultRule) {
      customerRule = {
        zipCode: normalizedZip,
        adjustmentType: config.defaultRule.adjustmentType || 'fixed',
        adjustmentValue: config.defaultRule.adjustmentValue || 0,
        description: config.defaultRule.description || 'Standard service area',
        isActive: true
      };
    }
    
    // Check if ZIP is in service area
    if (!customerRule) {
      return {
        success: true,
        zipCode: normalizedZip,
        inServiceArea: false,
        noServiceMessage: config.noServiceMessage,
        contactSalesLink: config.contactSalesLink,
        allZonesTable: generateAllZonesTable(config, normalizedZip, request.propertySize)
      };
    }
    
    // Calculate pricing for customer's ZIP
    const pricing = calculatePricing(
      config.baseRatePer1000SqFt,
      customerRule,
      request.propertySize,
      config.minimumCharge
    );
    
    // Generate all zones table
    const allZonesTable = generateAllZonesTable(config, normalizedZip, request.propertySize);
    
    // Generate formatted table HTML
    const formattedTable = generateHTMLTable(
      allZonesTable,
      request.propertySize,
      config.displaySettings
    );
    
    // Generate explanation
    const explanation = generateExplanation(
      normalizedZip,
      pricing.totalPrice,
      customerRule,
      request.propertySize,
      config.currency
    );
    
    return {
      success: true,
      zipCode: normalizedZip,
      inServiceArea: true,
      pricing: {
        baseRate: config.baseRatePer1000SqFt,
        adjustedRate: pricing.adjustedRate,
        adjustment: {
          type: customerRule.adjustmentType,
          value: customerRule.adjustmentValue,
          description: customerRule.description
        },
        propertySize: request.propertySize,
        totalPrice: pricing.totalPrice,
        currency: config.currency
      },
      allZonesTable,
      formattedTable,
      explanation
    };
    
  } catch (error: any) {
    console.error('ZIP code pricing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process pricing request'
    };
  }
}

/**
 * Calculate pricing based on ZIP code rule
 */
function calculatePricing(
  baseRate: number,
  rule: IZipCodeRule,
  propertySize: number,
  minimumCharge: number
) {
  let adjustedRate = baseRate;
  
  if (rule.adjustmentType === 'fixed') {
    adjustedRate += rule.adjustmentValue;
  } else if (rule.adjustmentType === 'percentage') {
    adjustedRate *= (1 + rule.adjustmentValue / 100);
  }
  
  // Round to 2 decimal places
  adjustedRate = Math.round(adjustedRate * 100) / 100;
  
  // Calculate total price
  const totalPrice = Math.max(
    (propertySize / 1000) * adjustedRate,
    minimumCharge
  );
  
  return {
    adjustedRate,
    totalPrice: Math.round(totalPrice * 100) / 100
  };
}

/**
 * Generate pricing table for all zones
 */
function generateAllZonesTable(
  config: any,
  customerZip: string,
  propertySize: number
): PricingTableRow[] {
  const table: PricingTableRow[] = [];
  
  // Add all active service ZIP codes
  config.serviceZipCodes
    .filter((rule: IZipCodeRule) => rule.isActive)
    .sort((a: IZipCodeRule, b: IZipCodeRule) => {
      // Sort by adjustment value (discounts first, then base, then surcharges)
      return a.adjustmentValue - b.adjustmentValue;
    })
    .forEach((rule: IZipCodeRule) => {
      const pricing = calculatePricing(
        config.baseRatePer1000SqFt,
        rule,
        propertySize,
        config.minimumCharge
      );
      
      let adjustmentText = '';
      let color = config.displaySettings.baseRateColor;
      
      if (rule.adjustmentValue < 0) {
        adjustmentText = rule.adjustmentType === 'fixed' 
          ? `-$${Math.abs(rule.adjustmentValue)} discount`
          : `${rule.adjustmentValue}% discount`;
        color = config.displaySettings.discountColor;
      } else if (rule.adjustmentValue > 0) {
        adjustmentText = rule.adjustmentType === 'fixed'
          ? `+$${rule.adjustmentValue} surcharge`
          : `+${rule.adjustmentValue}% surcharge`;
        color = config.displaySettings.surchargeColor;
      } else {
        adjustmentText = 'Base rate';
        color = config.displaySettings.baseRateColor;
      }
      
      table.push({
        zipCode: rule.zipCode,
        adjustment: adjustmentText,
        adjustedRate: pricing.adjustedRate,
        totalPrice: pricing.totalPrice,
        isCustomerZone: rule.zipCode === customerZip,
        color
      });
    });
  
  return table;
}

/**
 * Generate HTML formatted pricing table
 */
function generateHTMLTable(
  rows: PricingTableRow[],
  propertySize: number,
  displaySettings: any
): string {
  const tableRows = rows.map(row => {
    const rowStyle = row.isCustomerZone 
      ? 'background-color: #fef3c7; font-weight: bold;' // Highlight customer's zone
      : '';
    
    const adjustmentStyle = `color: ${row.color};`;
    
    return `
      <tr style="${rowStyle}">
        <td style="padding: 12px; border: 1px solid #e5e7eb;">
          ${row.zipCode}
          ${row.isCustomerZone ? ' ⭐' : ''}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; ${adjustmentStyle}">
          ${row.adjustment}
        </td>
        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">
          $${row.adjustedRate.toFixed(2)}
        </td>
        <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; ${adjustmentStyle}">
          $${row.totalPrice.toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');
  
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: system-ui, -apple-system, sans-serif;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">
            ZIP Code
          </th>
          <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">
            Adjustment
          </th>
          <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">
            Rate per 1,000 sq ft
          </th>
          <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">
            Total for ${propertySize.toLocaleString()} sq ft
          </th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * Generate explanation text
 */
function generateExplanation(
  zipCode: string,
  totalPrice: number,
  rule: IZipCodeRule,
  propertySize: number,
  currency: string
): string {
  const currencySymbol = currency === 'USD' ? '$' : 'C$';
  
  let adjustmentReason = '';
  if (rule.adjustmentValue < 0) {
    adjustmentReason = ` You're receiving a ${currencySymbol}${Math.abs(rule.adjustmentValue)} discount per 1,000 sq ft due to ${rule.description.toLowerCase()}.`;
  } else if (rule.adjustmentValue > 0) {
    adjustmentReason = ` A ${currencySymbol}${rule.adjustmentValue} surcharge per 1,000 sq ft applies due to ${rule.description.toLowerCase()}.`;
  } else {
    adjustmentReason = ` Standard base rate pricing applies to your area.`;
  }
  
  return `Your property in ZIP code ${zipCode} qualifies for a total price of ${currencySymbol}${totalPrice.toFixed(2)} for ${propertySize.toLocaleString()} sq ft.${adjustmentReason}`;
}

/**
 * Batch process multiple ZIP codes
 */
export async function batchProcessZipCodes(
  businessId: string,
  requests: Array<{ zipCode: string; propertySize: number }>
): Promise<ZipCodePricingResult[]> {
  const results: ZipCodePricingResult[] = [];
  
  for (const request of requests) {
    const result = await processZipCodePricing({
      businessId,
      customerZipCode: request.zipCode,
      propertySize: request.propertySize
    });
    results.push(result);
  }
  
  return results;
}

/**
 * Validate ZIP/Postal code format
 */
export function validateZipCode(zipCode: string, country?: string): boolean {
  const trimmed = zipCode.trim();
  
  // If country not specified, try to detect based on format
  if (!country) {
    // Check if it matches US format
    if (/^\d{5}(-\d{4})?$/.test(trimmed)) {
      return true;
    }
    // Check if it matches Canadian format
    if (/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(trimmed)) {
      return true;
    }
    return false;
  }
  
  if (country === 'US') {
    // US ZIP: 5 digits or 5+4 format
    return /^\d{5}(-\d{4})?$/.test(trimmed);
  } else if (country === 'CA') {
    // Canadian postal code: A1A 1A1 or A1A1A1 format
    return /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(trimmed);
  }
  
  return false;
}

/**
 * Extract ZIP code from full address
 */
export function extractZipCode(address: string, country: string = 'US'): string | null {
  if (country === 'US') {
    const match = address.match(/\b\d{5}(-\d{4})?\b/);
    return match ? match[0] : null;
  } else if (country === 'CA') {
    const match = address.match(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i);
    return match ? match[0].toUpperCase() : null;
  }
  
  return null;
}