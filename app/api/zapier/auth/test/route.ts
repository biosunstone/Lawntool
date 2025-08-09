import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import { validateZapierAuth } from '@/lib/zapier/auth'

/**
 * GET /api/zapier/auth/test
 * Test endpoint for Zapier authentication
 * Returns user/business info to confirm connection
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
    
    // Return test data to confirm connection
    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      business: {
        id: authResult.business.id,
        name: authResult.business.name
      },
      tier: authResult.config.tier,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Zapier] Auth test error:', error)
    return NextResponse.json(
      { error: 'Connection test failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/zapier/auth/test
 * Alternative test endpoint accepting API key in body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Create a mock request with the API key in header
    const mockHeaders = new Headers(request.headers)
    if (body.api_key) {
      mockHeaders.set('Authorization', `Bearer ${body.api_key}`)
    }
    
    const mockRequest = new NextRequest(request.url, {
      headers: mockHeaders
    })
    
    // Validate authentication
    const authResult = await validateZapierAuth(mockRequest)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }
    
    // Return test data
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      business: {
        id: authResult.business.id,
        name: authResult.business.name
      },
      tier: authResult.config.tier,
      features: {
        webhooks: authResult.config.settings.allowWebhooks,
        polling: authResult.config.settings.allowPolling,
        actions: authResult.config.settings.allowActions
      }
    })
    
  } catch (error) {
    console.error('[Zapier] Auth test error:', error)
    return NextResponse.json(
      { error: 'Authentication test failed' },
      { status: 500 }
    )
  }
}