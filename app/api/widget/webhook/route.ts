import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import { connectDB } from '@/lib/saas/db'
import Business from '@/models/Business'
import { sendWebhook } from '@/lib/saas/webhook'

export const dynamic = 'force-dynamic'

// GET /api/widget/webhook - Get webhook settings
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

    const business: any = await Business.findById(businessId).select('webhookSettings').lean()
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json({
      settings: business.webhookSettings || {
        enabled: false,
        url: '',
        secret: '',
        events: ['widget.submission', 'widget.quote_generated'],
        retryOnFailure: true,
        maxRetries: 3
      }
    })
  } catch (error) {
    console.error('Error fetching webhook settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook settings' },
      { status: 500 }
    )
  }
}

// PUT /api/widget/webhook - Update webhook settings
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

    const { settings } = await req.json()
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 })
    }

    // Validate webhook URL
    if (settings.enabled && settings.url) {
      try {
        new URL(settings.url)
      } catch (e) {
        return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 })
      }
    }

    await connectDB()

    const business = await Business.findByIdAndUpdate(
      businessId,
      { 
        $set: { 
          webhookSettings: settings,
          'updatedAt': new Date()
        }
      },
      { new: true }
    ).select('webhookSettings')

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook settings updated successfully',
      settings: business.webhookSettings
    })
  } catch (error) {
    console.error('Error updating webhook settings:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook settings' },
      { status: 500 }
    )
  }
}

// POST /api/widget/webhook/test - Test webhook configuration
export async function POST(req: NextRequest) {
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

    const business: any = await Business.findById(businessId).select('webhookSettings').lean()
    
    if (!business || !business.webhookSettings) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
    }

    // Send test webhook
    const testPayload = {
      event: 'widget.submission' as const,
      businessId: businessId.toString(),
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook from Sunstone Digital Tech'
      }
    }

    const result = await sendWebhook(business.webhookSettings, testPayload)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook test successful',
        response: result.response
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Webhook test failed',
        details: result.error
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error testing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    )
  }
}