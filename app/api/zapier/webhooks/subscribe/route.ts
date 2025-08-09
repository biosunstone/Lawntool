import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import { validateZapierAuth } from '@/lib/zapier/auth'
import { ZapierWebhook } from '@/models/zapier/ZapierWebhook'
import { ZapierLog } from '@/models/zapier/ZapierLog'
import { ZAPIER_EVENTS } from '@/lib/zapier/eventEmitter'
import crypto from 'crypto'

/**
 * POST /api/zapier/webhooks/subscribe
 * Subscribe to webhook events
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
    
    const { config, business } = authResult
    
    // Check if webhooks are allowed for this tier
    if (!config.settings.allowWebhooks) {
      return NextResponse.json(
        { error: 'Webhooks not available for your subscription tier' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { url, events, zapId, name } = body
    
    // Validate required fields
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'URL and events array are required' },
        { status: 400 }
      )
    }
    
    // Validate URL format
    try {
      const webhookUrl = new URL(url)
      if (!['http:', 'https:'].includes(webhookUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      )
    }
    
    // Validate events are supported
    const supportedEvents = Object.values(ZAPIER_EVENTS)
    const invalidEvents = events.filter(event => !supportedEvents.includes(event))
    
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid events',
          invalidEvents,
          supportedEvents 
        },
        { status: 400 }
      )
    }
    
    await connectDB()
    
    // Check if webhook already exists for this URL and events
    const existingWebhook = await ZapierWebhook.findOne({
      businessId: config.businessId,
      configId: config._id,
      url,
      events: { $all: events }
    })
    
    if (existingWebhook) {
      // Update existing webhook
      existingWebhook.active = true
      existingWebhook.metadata.zapId = zapId || existingWebhook.metadata.zapId
      existingWebhook.metadata.name = name || existingWebhook.metadata.name
      await existingWebhook.save()
      
      return NextResponse.json({
        success: true,
        id: existingWebhook._id.toString(),
        message: 'Webhook subscription updated',
        webhook: {
          id: existingWebhook._id.toString(),
          url: existingWebhook.url,
          events: existingWebhook.events,
          active: existingWebhook.active
        }
      })
    }
    
    // Generate webhook secret for signature verification
    const secret = crypto.randomBytes(32).toString('hex')
    
    // Create new webhook subscription
    const webhook = await ZapierWebhook.create({
      businessId: config.businessId,
      configId: config._id,
      url,
      events,
      active: true,
      secret,
      headers: body.headers || {},
      retryConfig: {
        maxAttempts: body.maxRetries || 3,
        backoffMultiplier: 2,
        maxBackoffSeconds: 300
      },
      metadata: {
        zapId,
        name: name || 'Zapier Webhook',
        description: body.description,
        createdBy: config.metadata.createdBy
      }
    })
    
    // Log webhook creation
    await ZapierLog.create({
      businessId: config.businessId,
      webhookId: webhook._id,
      type: 'webhook_delivery',
      action: 'Webhook subscription created',
      status: 'success',
      details: {
        url,
        events: events.join(', ')
      },
      metadata: {
        zapId
      }
    })
    
    return NextResponse.json({
      success: true,
      id: webhook._id.toString(),
      message: 'Webhook subscription created',
      webhook: {
        id: webhook._id.toString(),
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        secret // Return secret only on creation
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('[Zapier] Webhook subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/zapier/webhooks/subscribe
 * List all webhook subscriptions
 */
export async function GET(request: NextRequest) {
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
    
    await connectDB()
    
    // Get all webhooks for this business
    const webhooks = await ZapierWebhook.find({
      businessId: config.businessId,
      configId: config._id
    }).select('-secret') // Don't return secrets
    
    return NextResponse.json({
      success: true,
      webhooks: webhooks.map(webhook => ({
        id: webhook._id.toString(),
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        statistics: webhook.statistics,
        createdAt: webhook.createdAt,
        metadata: {
          name: webhook.metadata.name,
          description: webhook.metadata.description
        }
      }))
    })
    
  } catch (error) {
    console.error('[Zapier] Webhook list error:', error)
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    )
  }
}