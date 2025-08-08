import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import PricingRule from '@/models/PricingRule'
import { calculatePricing } from '@/lib/saas/pricing-calculator'

// POST /api/pricing-rules/test - Test pricing rules with sample data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }

    await connectDB()

    const body = await request.json()
    const { 
      testScenario = 'default',
      customScenario 
    } = body

    // Define test scenarios
    let scenario
    if (testScenario === 'custom' && customScenario) {
      scenario = customScenario
    } else {
      // Predefined test scenarios
      const scenarios: any = {
        default: {
          zipCode: '90210',
          customerTags: [],
          totalArea: 5000,
          services: [
            { name: 'Lawn Treatment', area: 3000, pricePerUnit: 0.02, totalPrice: 60 },
            { name: 'Driveway Cleaning', area: 1500, pricePerUnit: 0.03, totalPrice: 45 },
            { name: 'Sidewalk Maintenance', area: 500, pricePerUnit: 0.025, totalPrice: 12.5 }
          ],
          date: new Date()
        },
        vip: {
          zipCode: '10001',
          customerTags: ['vip', 'premium'],
          totalArea: 8000,
          services: [
            { name: 'Lawn Treatment', area: 5000, pricePerUnit: 0.02, totalPrice: 100 },
            { name: 'Driveway Cleaning', area: 2000, pricePerUnit: 0.03, totalPrice: 60 },
            { name: 'Sidewalk Maintenance', area: 1000, pricePerUnit: 0.025, totalPrice: 25 }
          ],
          date: new Date()
        },
        large: {
          zipCode: '94105',
          customerTags: [],
          totalArea: 15000,
          services: [
            { name: 'Lawn Treatment', area: 10000, pricePerUnit: 0.02, totalPrice: 200 },
            { name: 'Driveway Cleaning', area: 3000, pricePerUnit: 0.03, totalPrice: 90 },
            { name: 'Sidewalk Maintenance', area: 2000, pricePerUnit: 0.025, totalPrice: 50 }
          ],
          date: new Date()
        },
      }
      scenario = scenarios[testScenario] || scenarios.default
    }

    // Get all active rules for debugging
    const allRules = await PricingRule.find({
      businessId,
      isActive: true
    }).sort({ priority: -1 }).lean()

    // Test which rules would apply
    const { services: adjustedServices, appliedRules } = await calculatePricing(
      businessId,
      scenario.services,
      scenario.customerTags,
      scenario.zipCode,
      scenario.totalArea,
      scenario.date
    )

    // Calculate totals
    const originalTotal = scenario.services.reduce((sum: number, s: any) => sum + s.totalPrice, 0)
    const adjustedTotal = adjustedServices.reduce((sum: number, s: any) => sum + s.totalPrice, 0)
    const totalAdjustment = adjustedTotal - originalTotal

    // Analyze which rules could have applied but didn't
    const unappliedRules = allRules.filter((rule: any) => 
      !appliedRules.some((ar: any) => ar.ruleId === rule._id.toString())
    ).map(rule => ({
      id: rule._id,
      name: rule.name,
      type: rule.type,
      reason: analyzeWhyRuleDidntApply(rule, scenario)
    }))

    return NextResponse.json({
      scenario: {
        name: testScenario,
        ...scenario
      },
      results: {
        originalTotal,
        adjustedTotal,
        totalAdjustment,
        percentageChange: originalTotal > 0 
          ? ((adjustedTotal - originalTotal) / originalTotal * 100).toFixed(2)
          : 0
      },
      appliedRules: appliedRules.map(r => ({
        ...r,
        impact: `$${r.adjustment.toFixed(2)}`
      })),
      unappliedRules,
      adjustedServices: adjustedServices.map((s, i) => ({
        name: s.name,
        originalPrice: scenario.services[i].pricePerUnit,
        adjustedPrice: s.pricePerUnit,
        originalTotal: scenario.services[i].totalPrice,
        adjustedTotal: s.totalPrice,
        difference: s.totalPrice - scenario.services[i].totalPrice
      })),
      totalRulesInSystem: allRules.length
    })
  } catch (error: any) {
    console.error('Test pricing rules error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to test pricing rules' },
      { status: 500 }
    )
  }
}

function analyzeWhyRuleDidntApply(rule: any, scenario: any): string {
  switch (rule.type) {
    case 'zone':
      if (!rule.conditions.zipCodes?.length) {
        return 'No ZIP codes configured'
      }
      if (!rule.conditions.zipCodes.includes(scenario.zipCode)) {
        return `ZIP ${scenario.zipCode} not in rule's ZIP codes: ${rule.conditions.zipCodes.join(', ')}`
      }
      break
    
    case 'service':
      if (!rule.conditions.serviceTypes?.length) {
        return 'No service types configured'
      }
      const hasMatchingService = scenario.services.some((s: any) =>
        rule.conditions.serviceTypes.some((st: string) =>
          s.name.toLowerCase().includes(st.toLowerCase())
        )
      )
      if (!hasMatchingService) {
        return `No matching services for: ${rule.conditions.serviceTypes.join(', ')}`
      }
      break
    
    case 'customer':
      if (!rule.conditions.customerTags?.length) {
        return 'No customer tags configured'
      }
      const hasMatchingTag = rule.conditions.customerTags.some((tag: string) =>
        scenario.customerTags.includes(tag)
      )
      if (!hasMatchingTag) {
        return `Customer tags ${scenario.customerTags.join(', ') || 'none'} don't match rule tags: ${rule.conditions.customerTags.join(', ')}`
      }
      break
    
    case 'volume':
      if (rule.conditions.minArea && scenario.totalArea < rule.conditions.minArea) {
        return `Total area ${scenario.totalArea} is less than minimum ${rule.conditions.minArea}`
      }
      if (rule.conditions.maxArea && scenario.totalArea > rule.conditions.maxArea) {
        return `Total area ${scenario.totalArea} is greater than maximum ${rule.conditions.maxArea}`
      }
      break
    
  }
  
  return 'Unknown reason'
}