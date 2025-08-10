import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import Business from '@/models/Business'
import { IWidgetSettings } from '@/types/saas'

export const dynamic = 'force-dynamic'

// GET /api/widget/settings - Get widget settings for authenticated business
export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated with user' }, { status: 400 })
    }

    await connectDB()

    const business: any = await Business.findById(businessId).select('widgetSettings name').lean()
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Return widget settings with defaults if not set
    const defaultSettings: IWidgetSettings = {
      primaryColor: '#00A651',
      secondaryColor: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px',
      showCompanyName: true,
      showDescription: true,
      description: `Get an instant quote for your property services from ${business.name}`,
      buttonText: 'Get Instant Quote',
      position: 'bottom-right',
      collectPhone: false,
      collectAddress: true,
      requiredFields: ['name', 'email'],
      allowedServices: ['lawn', 'driveway', 'sidewalk'],
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

    return NextResponse.json({
      success: true,
      settings: business.widgetSettings || defaultSettings,
      businessName: business.name
    })
  } catch (error) {
    console.error('Error fetching widget settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch widget settings' },
      { status: 500 }
    )
  }
}

// PUT /api/widget/settings - Update widget settings
export async function PUT(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated with user' }, { status: 400 })
    }

    // Check user role - only business owners and admins can update settings
    if ((session.user as any).role !== 'business_owner' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { settings } = body

    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 })
    }

    await connectDB()

    // Validate settings
    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
    const validTriggers = ['pageLoad', 'exitIntent', 'scroll', 'timer', 'click']
    
    if (settings.position && !validPositions.includes(settings.position)) {
      return NextResponse.json({ error: 'Invalid position value' }, { status: 400 })
    }
    
    if (settings.triggerOn && !validTriggers.includes(settings.triggerOn)) {
      return NextResponse.json({ error: 'Invalid trigger value' }, { status: 400 })
    }

    if (settings.scrollPercentage && (settings.scrollPercentage < 0 || settings.scrollPercentage > 100)) {
      return NextResponse.json({ error: 'Scroll percentage must be between 0 and 100' }, { status: 400 })
    }

    // Update widget settings
    const business = await Business.findByIdAndUpdate(
      businessId,
      { 
        $set: { 
          widgetSettings: settings,
          'updatedAt': new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('widgetSettings name')

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Widget settings updated successfully',
      settings: business.widgetSettings
    })
  } catch (error) {
    console.error('Error updating widget settings:', error)
    return NextResponse.json(
      { error: 'Failed to update widget settings' },
      { status: 500 }
    )
  }
}

// DELETE /api/widget/settings - Reset widget settings to defaults
export async function DELETE(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated with user' }, { status: 400 })
    }

    // Check user role
    if ((session.user as any).role !== 'business_owner' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await connectDB()

    // Reset to default settings
    const defaultSettings: IWidgetSettings = {
      primaryColor: '#00A651',
      secondaryColor: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px',
      showCompanyName: true,
      showDescription: true,
      description: 'Get an instant quote for your property services',
      buttonText: 'Get Instant Quote',
      position: 'bottom-right',
      collectPhone: false,
      collectAddress: true,
      requiredFields: ['name', 'email'],
      allowedServices: ['lawn', 'driveway', 'sidewalk'],
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

    const business = await Business.findByIdAndUpdate(
      businessId,
      { 
        $set: { 
          widgetSettings: defaultSettings,
          'updatedAt': new Date()
        }
      },
      { new: true }
    ).select('widgetSettings')

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Widget settings reset to defaults',
      settings: business.widgetSettings
    })
  } catch (error) {
    console.error('Error resetting widget settings:', error)
    return NextResponse.json(
      { error: 'Failed to reset widget settings' },
      { status: 500 }
    )
  }
}