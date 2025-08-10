import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import PricingRule from '@/models/PricingRule'

// GET /api/pricing-rules - Get all pricing rules
export async function GET(req: NextRequest) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    const query: any = { businessId: (session.user as any).businessId }
    
    if (type) {
      query.type = type
    }
    
    if (active !== null) {
      query.isActive = active === 'true'
    }

    const rules = await PricingRule.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean()

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching pricing rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing rules' },
      { status: 500 }
    )
  }
}

// POST /api/pricing-rules - Create a new pricing rule
export async function POST(req: NextRequest) {
  try {
    const session:any = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    await connectDB()

    // Validate rule type specific conditions
    if (body.type === 'zone' && (!body.conditions.zipCodes || body.conditions.zipCodes.length === 0)) {
      return NextResponse.json(
        { error: 'Zone pricing rules require at least one ZIP code' },
        { status: 400 }
      )
    }

    if (body.type === 'customer' && (!body.conditions.customerTags || body.conditions.customerTags.length === 0)) {
      return NextResponse.json(
        { error: 'Customer pricing rules require at least one customer tag' },
        { status: 400 }
      )
    }

    const rule = await PricingRule.create({
      ...body,
      businessId: (session.user as any).businessId,
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating pricing rule:', error)
    return NextResponse.json(
      { error: 'Failed to create pricing rule' },
      { status: 500 }
    )
  }
}

// Calculate pricing with rules
// Moved to lib/saas/pricing-calculator.ts
// This function is now internal to the route file
async function calculatePricing(
  businessId: string,
  services: any[],
  customerTags?: string[],
  zipCode?: string,
  totalArea?: number
) {
  try {
    await connectDB()

    // Get all active pricing rules for the business
    const rules = await PricingRule.find({
      businessId,
      isActive: true
    }).sort({ priority: -1 })

    let appliedRules: any[] = []
    let finalPricing = [...services]

    for (const rule of rules) {
      let shouldApply = false

      // Check conditions based on rule type
      switch (rule.type) {
        case 'zone':
          if (zipCode && rule.conditions.zipCodes?.includes(zipCode)) {
            shouldApply = true
          }
          break

        case 'customer':
          if (customerTags && rule.conditions.customerTags?.some((tag:any) => customerTags.includes(tag))) {
            shouldApply = true
          }
          break

        case 'volume':
          if (totalArea) {
            if (rule.conditions.minArea && totalArea >= rule.conditions.minArea) {
              if (!rule.conditions.maxArea || totalArea <= rule.conditions.maxArea) {
                shouldApply = true
              }
            }
          }
          break

        case 'service':
          if (rule.conditions.serviceTypes?.some((type:any) => 
            finalPricing.some(service => service.name.toLowerCase().includes(type.toLowerCase()))
          )) {
            shouldApply = true
          }
          break
      }

      if (shouldApply) {
        appliedRules.push({
          id: rule._id,
          name: rule.name,
          type: rule.type,
          pricing: rule.pricing
        })

        // Apply pricing modifications
        finalPricing = finalPricing.map(service => {
          let modifiedService = { ...service }

          // Apply fixed prices if available
          if (rule.pricing.fixedPrices) {
            const serviceType = service.name.toLowerCase()
            if (serviceType.includes('lawn') && rule.pricing.fixedPrices.lawnPerSqFt) {
              modifiedService.pricePerUnit = rule.pricing.fixedPrices.lawnPerSqFt
            } else if (serviceType.includes('driveway') && rule.pricing.fixedPrices.drivewayPerSqFt) {
              modifiedService.pricePerUnit = rule.pricing.fixedPrices.drivewayPerSqFt
            } else if (serviceType.includes('sidewalk') && rule.pricing.fixedPrices.sidewalkPerSqFt) {
              modifiedService.pricePerUnit = rule.pricing.fixedPrices.sidewalkPerSqFt
            }
          }

          // Apply multiplier
          if (rule.pricing.priceMultiplier && rule.pricing.priceMultiplier !== 1) {
            modifiedService.pricePerUnit *= rule.pricing.priceMultiplier
          }

          // Recalculate total
          modifiedService.totalPrice = modifiedService.area * modifiedService.pricePerUnit

          return modifiedService
        })

        // Update rule usage count
        await PricingRule.updateOne(
          { _id: rule._id },
          { $inc: { appliedCount: 1 } }
        ).catch(err => console.error('Failed to update rule count:', err))
      }
    }

    return {
      services: finalPricing,
      appliedRules
    }
  } catch (error) {
    console.error('Error calculating pricing:', error)
    return {
      services,
      appliedRules: []
    }
  }
}