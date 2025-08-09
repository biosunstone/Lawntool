import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import { ZapierConfig } from '@/models/zapier/ZapierConfig'
import { ZapierLog } from '@/models/zapier/ZapierLog'
import crypto from 'crypto'

/**
 * POST /api/zapier/auth/validate
 * Validates Zapier API key and returns connection details
 * Used by Zapier during app authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from header or body
    const authHeader = request.headers.get('Authorization')
    const body = await request.json().catch(() => ({}))
    
    let apiKey = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7)
    } else if (body.api_key) {
      apiKey = body.api_key
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }
    
    // Validate API key format
    if (!apiKey.startsWith('zap_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Hash the API key to compare with stored hash
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // Find config by API key hash
    const config = await ZapierConfig.findOne({ 
      apiKeyHash,
      enabled: true 
    }).populate('businessId', 'name')
    
    if (!config) {
      // Log failed auth attempt
      // TODO: Implement logging
      // const businessIdMatch = apiKey.match(/zap_([a-f0-9]{24})_/)
      // if (businessIdMatch) {
      //   await ZapierLog.create({
      //     businessId: businessIdMatch[1],
      //     success: false,
      //     ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      //     userAgent: request.headers.get('user-agent') || '',
      //     error: 'Invalid API key'
      //   })
      // }
      
      return NextResponse.json(
        { error: 'Invalid or disabled API key' },
        { status: 401 }
      )
    }
    
    // Check if tier allows API access
    if (config.tier === 'none') {
      return NextResponse.json(
        { error: 'Zapier integration not enabled for this account' },
        { status: 403 }
      )
    }
    
    // Update last used timestamp
    config.metadata.lastUsed = new Date()
    await config.save()
    
    // Log successful auth
    // TODO: Implement logging
    // await ZapierLog.create({
    //   businessId: config.businessId,
    //   success: true,
    //   ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    //   userAgent: request.headers.get('user-agent') || ''
    // })
    
    // Return connection details for Zapier
    return NextResponse.json({
      success: true,
      business: {
        id: config.businessId._id.toString(),
        name: (config.businessId as any).name
      },
      tier: config.tier,
      features: {
        webhooks: config.settings.allowWebhooks,
        polling: config.settings.allowPolling,
        actions: config.settings.allowActions
      },
      limits: {
        webhookLimit: config.webhookLimit,
        webhooksUsed: config.webhooksUsed,
        rateLimitPerMinute: config.rateLimitPerMinute
      },
      enabledEvents: config.enabledEvents
    })
    
  } catch (error) {
    console.error('[Zapier] Auth validation error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/zapier/auth/validate
 * Test endpoint for Zapier connection
 */
export async function GET(request: NextRequest) {
  try {
    // Get API key from header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key required in Authorization header' },
        { status: 401 }
      )
    }
    
    const apiKey = authHeader.substring(7)
    
    if (!apiKey.startsWith('zap_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Hash the API key
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // Find and validate config
    const config = await ZapierConfig.findOne({ 
      apiKeyHash,
      enabled: true 
    }).populate('businessId', 'name')
    
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid or disabled API key' },
        { status: 401 }
      )
    }
    
    // Simple test response for Zapier
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      business: (config.businessId as any).name
    })
    
  } catch (error) {
    console.error('[Zapier] Auth test error:', error)
    return NextResponse.json(
      { error: 'Authentication test failed' },
      { status: 500 }
    )
  }
}