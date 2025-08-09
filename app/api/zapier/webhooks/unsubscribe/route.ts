import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import { validateZapierAuth } from '@/lib/zapier/auth'
import { ZapierWebhook } from '@/models/zapier/ZapierWebhook'
import { ZapierLog } from '@/models/zapier/ZapierLog'

/**
 * POST /api/zapier/webhooks/unsubscribe
 * Unsubscribe from webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateZapierAuth(request)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }
    
    const { config } = authResult
    
    const body = await request.json()
    const { id, url, zapId } = body
    
    // Need either webhook ID or URL to unsubscribe
    if (!id && !url && !zapId) {
      return NextResponse.json(
        { error: 'Webhook ID, URL, or Zap ID required' },
        { status: 400 }
      )
    }
    
    await connectDB()
    
    // Build query
    const query: any = {
      businessId: config.businessId,
      configId: config._id
    }
    
    if (id) {
      query._id = id
    } else if (zapId) {
      query['metadata.zapId'] = zapId
    } else if (url) {
      query.url = url
    }
    
    // Find and deactivate webhook(s)
    const result = await ZapierWebhook.updateMany(
      query,
      { 
        $set: { 
          active: false,
          'statistics.lastDelivery': new Date()
        } 
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }
    
    // Log unsubscription
    await ZapierLog.create({
      businessId: config.businessId,
      type: 'webhook_delivery',
      action: 'Webhook unsubscribed',
      status: 'success',
      details: {
        query: JSON.stringify(query),
        count: result.modifiedCount
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Unsubscribed from ${result.modifiedCount} webhook(s)`,
      count: result.modifiedCount
    })
    
  } catch (error) {
    console.error('[Zapier] Webhook unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from webhook' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/zapier/webhooks/unsubscribe
 * Permanently delete webhook subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateZapierAuth(request)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }
    
    const { config } = authResult
    
    // Get webhook ID from query params
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const zapId = url.searchParams.get('zapId')
    
    if (!id && !zapId) {
      return NextResponse.json(
        { error: 'Webhook ID or Zap ID required' },
        { status: 400 }
      )
    }
    
    await connectDB()
    
    // Build query
    const query: any = {
      businessId: config.businessId,
      configId: config._id
    }
    
    if (id) {
      query._id = id
    } else if (zapId) {
      query['metadata.zapId'] = zapId
    }
    
    // Delete webhook
    const webhook = await ZapierWebhook.findOneAndDelete(query)
    
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }
    
    // Log deletion
    await ZapierLog.create({
      businessId: config.businessId,
      webhookId: webhook._id,
      type: 'webhook_delivery',
      action: 'Webhook deleted',
      status: 'success',
      details: {
        url: webhook.url,
        events: webhook.events.join(', ')
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
      webhook: {
        id: webhook._id.toString(),
        url: webhook.url,
        events: webhook.events
      }
    })
    
  } catch (error) {
    console.error('[Zapier] Webhook delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}