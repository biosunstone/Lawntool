import { NextRequest } from 'next/server'

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  limit: number // Maximum requests allowed in the interval
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (consider using Redis for production)
const store: RateLimitStore = {}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000) // Clean every minute

export class RateLimiter {
  private config: RateLimitConfig
  private prefix: string

  constructor(config: RateLimitConfig, prefix = 'rl') {
    this.config = config
    this.prefix = prefix
  }

  private getKey(identifier: string): string {
    return `${this.prefix}:${identifier}`
  }

  private getIdentifier(req: NextRequest): string {
    // Try to get IP address
    const forwarded = req.headers.get('x-forwarded-for')
    const real = req.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || real || 'unknown'
    
    // For widget requests, also consider business ID if available
    const url = new URL(req.url)
    const businessId = url.searchParams.get('businessId') || 
                      req.headers.get('x-business-id') || 
                      ''
    
    return businessId ? `${ip}:${businessId}` : ip
  }

  async check(req: NextRequest): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const identifier = this.getIdentifier(req)
    const key = this.getKey(identifier)
    const now = Date.now()
    
    // Get or create rate limit entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + this.config.interval
      }
    }
    
    const entry = store[key]
    const allowed = entry.count < this.config.limit
    
    if (allowed) {
      entry.count++
    }
    
    return {
      allowed,
      limit: this.config.limit,
      remaining: Math.max(0, this.config.limit - entry.count),
      reset: entry.resetTime
    }
  }

  reset(req: NextRequest): void {
    const identifier = this.getIdentifier(req)
    const key = this.getKey(identifier)
    delete store[key]
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Widget submission: 10 requests per minute per IP/business
  widgetSubmission: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    limit: 10
  }, 'widget-submit'),
  
  // Widget config: 60 requests per minute
  widgetConfig: new RateLimiter({
    interval: 60 * 1000,
    limit: 60
  }, 'widget-config'),
  
  // Widget analytics: 30 requests per minute
  widgetAnalytics: new RateLimiter({
    interval: 60 * 1000,
    limit: 30
  }, 'widget-analytics'),
  
  // API general: 100 requests per minute
  api: new RateLimiter({
    interval: 60 * 1000,
    limit: 100
  }, 'api')
}

// Middleware helper
export async function checkRateLimit(
  req: NextRequest,
  limiter: RateLimiter
): Promise<Response | null> {
  const result = await limiter.check(req)
  
  // Set rate limit headers
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString())
  
  if (!result.allowed) {
    headers.set('Retry-After', Math.ceil((result.reset - Date.now()) / 1000).toString())
    
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.reset
      }),
      {
        status: 429,
        headers
      }
    )
  }
  
  return null // Request is allowed
}