import { NextRequest } from 'next/server'
import connectDB from '@/lib/saas/db'
import { ZapierConfig } from '@/models/zapier/ZapierConfig'
import Business from '@/models/Business'
import crypto from 'crypto'

export interface ZapierAuthResult {
  success: boolean
  error?: string
  config?: any
  business?: {
    id: string
    name: string
  }
}

/**
 * Validates Zapier API authentication
 * Checks API key and returns config if valid
 */
export async function validateZapierAuth(request: NextRequest): Promise<ZapierAuthResult> {
  try {
    // Check if Zapier is globally enabled
    if (process.env.ZAPIER_ENABLED !== 'true') {
      return {
        success: false,
        error: 'Zapier integration is not enabled'
      }
    }
    
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'API key required in Authorization header'
      }
    }
    
    const apiKey = authHeader.substring(7).trim()
    
    // Validate API key format
    if (!apiKey || !apiKey.startsWith('zap_')) {
      return {
        success: false,
        error: 'Invalid API key format'
      }
    }
    
    await connectDB()
    
    // Hash the API key for comparison
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // Find the configuration
    const config = await ZapierConfig.findOne({
      apiKeyHash,
      enabled: true
    })
    
    if (!config) {
      return {
        success: false,
        error: 'Invalid or disabled API key'
      }
    }
    
    // Check if tier allows access
    if (config.tier === 'none') {
      return {
        success: false,
        error: 'Zapier integration not enabled for this account tier'
      }
    }
    
    // Get business details
    const business = await Business.findById(config.businessId).select('name')
    
    if (!business) {
      return {
        success: false,
        error: 'Business not found'
      }
    }
    
    // Update last used timestamp
    config.metadata.lastUsed = new Date()
    await config.save()
    
    return {
      success: true,
      config,
      business: {
        id: business._id.toString(),
        name: business.name
      }
    }
    
  } catch (error) {
    console.error('[Zapier] Auth validation error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Rate limiting check for Zapier API calls
 */
export async function checkZapierRateLimit(
  config: any,
  identifier: string = 'global'
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Simple in-memory rate limiting (for production, use Redis)
  const rateLimitKey = `zapier_rate_${config._id}_${identifier}`
  const now = Date.now()
  
  // Get or initialize rate limit data
  if (!global.zapierRateLimits) {
    global.zapierRateLimits = new Map()
  }
  
  const limitData = global.zapierRateLimits.get(rateLimitKey) || {
    requests: [],
    window: 60000 // 1 minute window
  }
  
  // Remove old requests outside the window
  limitData.requests = limitData.requests.filter(
    (timestamp: number) => now - timestamp < limitData.window
  )
  
  // Check if limit exceeded
  const limit = config.rateLimitPerMinute || 10
  if (limitData.requests.length >= limit) {
    const oldestRequest = limitData.requests[0]
    const retryAfter = Math.ceil((oldestRequest + limitData.window - now) / 1000)
    
    return {
      allowed: false,
      retryAfter
    }
  }
  
  // Add current request
  limitData.requests.push(now)
  global.zapierRateLimits.set(rateLimitKey, limitData)
  
  return { allowed: true }
}

/**
 * Middleware to validate Zapier auth for all Zapier API routes
 */
export async function withZapierAuth(
  handler: (req: NextRequest, auth: ZapierAuthResult) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const authResult = await validateZapierAuth(request)
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Check rate limiting
    const rateLimit = await checkZapierRateLimit(authResult.config)
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter || 60)
          }
        }
      )
    }
    
    return handler(request, authResult)
  }
}

// Declare global type for rate limiting
declare global {
  var zapierRateLimits: Map<string, { requests: number[]; window: number }> | undefined
}