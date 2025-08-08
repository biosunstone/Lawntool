import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/saas/db'
import Business from '@/models/Business'

export const dynamic = 'force-dynamic'

// GET /api/widget/config - Get widget configuration for a business
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
    }

    await connectDB()

    const business:any = await Business.findById(businessId)
      .select('name widgetSettings settings.branding settings.defaultPricing taxRate')
      .lean()
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if widget is active
    if (business.widgetSettings?.isActive === false) {
      return NextResponse.json({ error: 'Widget is not active for this business' }, { status: 403 })
    }

    // Check domain restrictions if provided
    const origin = req.headers.get('origin') || req.headers.get('referer')
    if (origin && business.widgetSettings?.domains?.length > 0) {
      const allowedDomains = business.widgetSettings.domains
      const requestDomain = new URL(origin).hostname
      
      const isAllowed = allowedDomains.some((domain: any) => {
        // Support wildcards like *.example.com
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2)
          return requestDomain.endsWith(baseDomain)
        }
        return requestDomain === domain
      })
      
      if (!isAllowed) {
        return NextResponse.json({ error: 'Domain not authorized for this widget' }, { status: 403 })
      }
    }

    const defaultSettings = {
      primaryColor: business.settings?.branding?.primaryColor || '#00A651',
      secondaryColor: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px',
      showCompanyName: true,
      showDescription: true,
      description: `Get an instant quote for your property services from ${business.name}`,
      buttonText: 'Get Instant Quote',
      position: 'bottom-right',
      allowedServices: ['lawn', 'driveway', 'sidewalk'],
      collectPhone: false,
      collectAddress: true,
      requiredFields: ['name', 'email'],
      autoGenerateQuote: true,
      sendQuoteEmail: true,
      autoOpen: false,
      delay: 0,
      enableManualSelection: true,
      enableAIDetection: true,
      showPriceBreakdown: false,
      allowServiceCustomization: true,
      triggerOn: 'click',
      scrollPercentage: 50,
      exitIntentSensitivity: 20,
      enableAnalytics: true,
      isActive: true
    }

    // Merge settings with defaults
    const widgetSettings = {
      ...defaultSettings,
      ...(business.widgetSettings || {})
    }

    // Always include pricing information for proper service calculation
    const pricingInfo = {
      lawnPerSqFt: business.settings?.defaultPricing?.lawnPerSqFt || 0.02,
      drivewayPerSqFt: business.settings?.defaultPricing?.drivewayPerSqFt || 0.03,
      sidewalkPerSqFt: business.settings?.defaultPricing?.sidewalkPerSqFt || 0.025,
      buildingPerSqFt: business.settings?.defaultPricing?.buildingPerSqFt || 0.015,
      minimumCharge: business.settings?.defaultPricing?.minimumCharge || 50
    }

    return NextResponse.json({
      businessId,
      businessName: business.name,
      settings: widgetSettings,
      pricing: pricingInfo,
      taxRate: business.taxRate || 0.08
    })
  } catch (error) {
    console.error('Error fetching widget config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch widget configuration' },
      { status: 500 }
    )
  }
}