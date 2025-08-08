import connectDB from '@/lib/saas/db'
import PricingRule from '@/models/PricingRule'

interface Service {
  name: string
  area: number
  pricePerUnit: number
  totalPrice: number
}

interface PricingContext {
  zipCode?: string
  customerTags?: string[]
  totalArea?: number
  services?: Service[]
  date?: Date
}

interface AppliedRule {
  ruleId: string
  ruleName: string
  ruleType: string
  adjustment: number
  description?: string
}

/**
 * Check if a rule should be applied based on its conditions
 */
function checkRuleApplicability(rule: any, context: PricingContext): boolean {
  const { zipCode, customerTags = [], totalArea, services = [], date = new Date() } = context
  
  switch (rule.type) {
    case 'zone':
      // Zone rules apply based on ZIP codes
      if (!rule.conditions.zipCodes?.length) return false
      return zipCode ? rule.conditions.zipCodes.includes(zipCode) : false
    
    case 'service':
      // Service rules apply to specific service types
      if (!rule.conditions.serviceTypes?.length) return false
      return services.some(s => 
        rule.conditions.serviceTypes.some((st: string) => 
          s.name.toLowerCase().includes(st.toLowerCase())
        )
      )
    
    case 'customer':
      // Customer rules apply based on customer tags
      if (!rule.conditions.customerTags?.length) return false
      return rule.conditions.customerTags.some((tag: string) => 
        customerTags.includes(tag)
      )
    
    case 'volume':
      // Volume rules apply based on total area
      if (!totalArea) return false
      let volumeApplies = true
      
      if (rule.conditions.minArea !== undefined && rule.conditions.minArea !== null) {
        volumeApplies = totalArea >= rule.conditions.minArea
      }
      
      if (volumeApplies && rule.conditions.maxArea !== undefined && rule.conditions.maxArea !== null) {
        volumeApplies = totalArea <= rule.conditions.maxArea
      }
      
      return volumeApplies
    
    default:
      return false
  }
}

/**
 * Apply a pricing rule to a service
 */
function applyPricingRule(service: Service, rule: any): { service: Service, adjustment: number } {
  let adjustedService = { ...service }
  const originalTotal = service.totalPrice || (service.area * service.pricePerUnit)
  
  // Ensure rule.pricing exists
  if (!rule.pricing) {
    console.warn(`Rule "${rule.name}" has no pricing configuration`)
    return { service: adjustedService, adjustment: 0 }
  }
  
  // 1. Apply price multiplier (percentage change)
  if (rule.pricing.priceMultiplier !== undefined && rule.pricing.priceMultiplier !== null && rule.pricing.priceMultiplier !== 1) {
    adjustedService.pricePerUnit *= rule.pricing.priceMultiplier
    console.log(`Applied multiplier ${rule.pricing.priceMultiplier} to ${service.name}`)
  }
  
  // 2. Or apply fixed prices (overrides multiplier)
  if (rule.pricing.fixedPrices) {
    const serviceType = service.name.toLowerCase()
    
    if (serviceType.includes('lawn') && rule.pricing.fixedPrices.lawnPerSqFt) {
      adjustedService.pricePerUnit = rule.pricing.fixedPrices.lawnPerSqFt
    } else if (serviceType.includes('driveway') && rule.pricing.fixedPrices.drivewayPerSqFt) {
      adjustedService.pricePerUnit = rule.pricing.fixedPrices.drivewayPerSqFt
    } else if (serviceType.includes('sidewalk') && rule.pricing.fixedPrices.sidewalkPerSqFt) {
      adjustedService.pricePerUnit = rule.pricing.fixedPrices.sidewalkPerSqFt
    } else if (serviceType.includes('building') && rule.pricing.fixedPrices.buildingPerSqFt) {
      adjustedService.pricePerUnit = rule.pricing.fixedPrices.buildingPerSqFt
    }
  }
  
  // 3. Recalculate total
  adjustedService.totalPrice = adjustedService.area * adjustedService.pricePerUnit
  
  // 4. Add surcharge
  if (rule.pricing.surcharge) {
    adjustedService.totalPrice += rule.pricing.surcharge
  }
  
  // 5. Apply discount
  if (rule.pricing.discount) {
    if (rule.pricing.discount.percentage) {
      // Percentage discount
      adjustedService.totalPrice *= (1 - rule.pricing.discount.type / 100)
    } else {
      // Fixed amount discount
      adjustedService.totalPrice -= rule.pricing.discount.type
    }
  }
  
  // 6. Enforce minimum charge
  if (rule.pricing.minimumCharge && adjustedService.totalPrice < rule.pricing.minimumCharge) {
    adjustedService.totalPrice = rule.pricing.minimumCharge
  }
  
  // Ensure price doesn't go negative
  adjustedService.totalPrice = Math.max(0, adjustedService.totalPrice)
  
  // Calculate the adjustment amount (use the original totalPrice, not recalculated)
  const adjustment = adjustedService.totalPrice - originalTotal
  
  console.log(`Final adjustment for "${service.name}": ${adjustment} (${originalTotal} -> ${adjustedService.totalPrice})`)
  
  return { service: adjustedService, adjustment }
}

/**
 * Calculate pricing with all applicable rules
 */
export async function calculatePricing(
  businessId: string,
  services: Service[],
  customerTags: string[] = [],
  zipCode?: string,
  totalArea?: number,
  date?: Date
): Promise<{ services: Service[], appliedRules: AppliedRule[] }> {
  try {
    await connectDB()

    // Get all active rules for the business, sorted by priority (highest first)
    const rules = await PricingRule.find({
      businessId,
      isActive: true
    }).sort({ priority: -1, createdAt: 1 }) // Secondary sort by creation date for stability

    const appliedRules: AppliedRule[] = []
    let finalServices = [...services]
    const context: PricingContext = { zipCode, customerTags, totalArea, services, date }

    // Track which services have been modified by which rule types
    // to prevent multiple rules of the same type from stacking
    const serviceRuleApplications = new Map<string, Set<string>>()

    for (const rule of rules) {
      // Check if this rule applies
      const ruleApplies = checkRuleApplicability(rule, context)
      
      if (!ruleApplies) {
        continue
      }
      
      console.log(`Rule "${rule.name}" (${rule.type}) applies! Pricing config:`, rule.pricing)

      // Apply the rule to each applicable service
      let ruleApplied = false
      let totalAdjustment = 0

      finalServices = finalServices.map(service => {
        // Check if this rule type applies to this specific service
        // Only 'service' type rules need to match specific services
        if (rule.type === 'service' && rule.conditions.serviceTypes?.length) {
          const serviceMatches = rule.conditions.serviceTypes.some((st: string) => 
            service.name.toLowerCase().includes(st.toLowerCase())
          )
          if (!serviceMatches) {
            return service
          }
        }

        // Check if a rule of this type has already been applied to this service
        const serviceKey = service.name
        const appliedTypes = serviceRuleApplications.get(serviceKey) || new Set()
        
        // Allow multiple customer rules (e.g., VIP + loyalty discounts)
        // but prevent multiple zone/service/volume rules from stacking
        if (rule.type !== 'customer' && appliedTypes.has(rule.type)) {
          console.log(`Skipping rule "${rule.name}" for service "${service.name}" - ${rule.type} rule already applied`)
          return service
        }

        // Apply the rule
        const { service: adjustedService, adjustment } = applyPricingRule(service, rule)
        
        console.log(`Applied rule to service "${service.name}":`, {
          originalPrice: service.totalPrice,
          adjustedPrice: adjustedService.totalPrice,
          adjustment: adjustment
        })
        
        // Track any adjustment, even if it's very small
        if (Math.abs(adjustment) > 0.001) {
          ruleApplied = true
          totalAdjustment += adjustment
          
          // Track that this rule type has been applied to this service
          appliedTypes.add(rule.type)
          serviceRuleApplications.set(serviceKey, appliedTypes)
          
          // Return the adjusted service
          return adjustedService
        } else if (rule.pricing && (rule.pricing.priceMultiplier || rule.pricing.fixedPrices || rule.pricing.surcharge || rule.pricing.discount)) {
          // Rule has pricing config but resulted in no change - still track it was checked
          console.log(`Rule "${rule.name}" resulted in no price change for "${service.name}"`)
        }

        return service
      })

      // If the rule was applied, track it
      if (ruleApplied) {
        appliedRules.push({
          ruleId: rule._id.toString(),
          ruleName: rule.name,
          ruleType: rule.type,
          adjustment: totalAdjustment,
          description: rule.description
        })

        // Update rule usage count (fire and forget)
        PricingRule.updateOne(
          { _id: rule._id },
          { $inc: { appliedCount: 1 } }
        ).catch(err => console.error('Failed to update rule count:', err))
      }
    }

    return {
      services: finalServices,
      appliedRules
    }
  } catch (error) {
    console.error('Error calculating pricing:', error)
    // Return original services on error
    return {
      services,
      appliedRules: []
    }
  }
}

/**
 * Preview pricing rules without applying them
 */
export async function previewPricingRules(
  businessId: string,
  services: Service[],
  customerTags: string[] = [],
  zipCode?: string,
  totalArea?: number,
  date?: Date
): Promise<{
  originalTotal: number,
  adjustedTotal: number,
  totalAdjustment: number,
  services: Service[],
  appliedRules: AppliedRule[]
}> {
  const originalTotal = services.reduce((sum, s) => sum + (s.area * s.pricePerUnit), 0)
  
  const { services: adjustedServices, appliedRules } = await calculatePricing(
    businessId,
    services,
    customerTags,
    zipCode,
    totalArea,
    date
  )
  
  const adjustedTotal = adjustedServices.reduce((sum, s) => sum + s.totalPrice, 0)
  
  return {
    originalTotal,
    adjustedTotal,
    totalAdjustment: adjustedTotal - originalTotal,
    services: adjustedServices,
    appliedRules
  }
}