import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { previewPricingRules } from '@/lib/saas/pricing-calculator'

// POST /api/pricing-rules/preview - Preview pricing rules
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

    const body = await request.json()
    const { 
      zipCode, 
      customerTags = [], 
      totalArea, 
      services = [],
      date
    } = body

    // Validate services have required fields
    const validatedServices = services.map((s: any) => ({
      name: s.name || 'Service',
      area: s.area || 0,
      pricePerUnit: s.pricePerUnit || 0,
      totalPrice: s.totalPrice || (s.area * s.pricePerUnit)
    }))

    // Preview pricing with rules
    const preview = await previewPricingRules(
      businessId,
      validatedServices,
      customerTags,
      zipCode,
      totalArea,
      date ? new Date(date) : new Date()
    )

    return NextResponse.json({
      ...preview,
      summary: {
        rulesApplied: preview.appliedRules.length,
        percentageChange: preview.originalTotal > 0 
          ? ((preview.adjustedTotal - preview.originalTotal) / preview.originalTotal * 100).toFixed(2)
          : 0,
        savingsAmount: preview.totalAdjustment < 0 ? Math.abs(preview.totalAdjustment) : 0,
        increaseAmount: preview.totalAdjustment > 0 ? preview.totalAdjustment : 0
      }
    })
  } catch (error: any) {
    console.error('Preview pricing rules error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to preview pricing rules' },
      { status: 500 }
    )
  }
}