import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import { calculateGeopricing } from '@/lib/geopricing/calculator'

// POST /api/geopricing/public-test - Public test endpoint for geopricing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { location, services, date } = body
    
    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      )
    }
    
    await connectDB()
    
    // Use the Toronto Lawn Care Services business ID that was just created
    const businessId = '68979e9cdc69bf60a36742b4'
    
    // Calculate geopricing for the location
    const geopricingResult = await calculateGeopricing(
      businessId,
      location,
      date ? new Date(date) : new Date()
    )
    
    // Apply geopricing to services if provided
    let pricingResult = null
    if (services && Array.isArray(services)) {
      // Apply geopricing adjustments to each service
      const adjustedServices = services.map(service => {
        const basePrice = service.totalPrice || (service.area * service.pricePerUnit)
        let adjustedPrice = basePrice
        
        if (geopricingResult.finalAdjustment) {
          const { type, value } = geopricingResult.finalAdjustment
          
          if (type === 'percentage') {
            adjustedPrice = basePrice * (1 + value / 100)
          } else if (type === 'fixed') {
            adjustedPrice = basePrice + value
          } else if (type === 'multiplier') {
            adjustedPrice = basePrice * value
          }
        }
        
        return {
          ...service,
          originalPrice: basePrice,
          adjustedPrice,
          geopricingApplied: geopricingResult.finalAdjustment.value !== 0,
          totalPrice: adjustedPrice
        }
      })
      
      pricingResult = {
        services: adjustedServices,
        appliedRules: geopricingResult.applicableZones.map(zone => ({
          ruleId: `geo_${zone.zoneId}`,
          ruleName: `Geopricing: ${zone.zoneName}`,
          ruleType: 'geopricing',
          adjustment: zone.adjustmentValue,
          description: zone.reason
        }))
      }
    }
    
    return NextResponse.json({
      location,
      businessId,
      geopricing: geopricingResult,
      pricing: pricingResult,
      summary: {
        zonesApplied: geopricingResult.applicableZones.length,
        totalAdjustment: geopricingResult.finalAdjustment,
        metadata: geopricingResult.metadata
      }
    })
    
  } catch (error) {
    console.error('Geopricing test error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate geopricing', details: error.message },
      { status: 500 }
    )
  }
}