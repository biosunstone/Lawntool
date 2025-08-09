import { ZapierEventQueue } from '@/models/zapier/ZapierEventQueue'
import { ZapierWebhook } from '@/models/zapier/ZapierWebhook'
import { ZapierConfig } from '@/models/zapier/ZapierConfig'
import { ZapierLog } from '@/models/zapier/ZapierLog'
import connectDB from '@/lib/saas/db'
import crypto from 'crypto'

export interface WebhookDeliveryResult {
  webhookId: string
  url: string
  success: boolean
  statusCode?: number
  responseTime?: number
  error?: string
  timestamp: Date
}

/**
 * Background processor for Zapier webhook events
 * Should be called periodically (e.g., every 10 seconds via cron job)
 */
export class ZapierWebhookProcessor {
  private static isProcessing = false
  private static lastProcessTime = 0
  private static minInterval = 5000 // Minimum 5 seconds between runs
  
  /**
   * Main processing function - call this from a cron job or interval
   */
  static async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('[Zapier] Processor already running, skipping...')
      return
    }
    
    // Rate limit processing
    const now = Date.now()
    if (now - this.lastProcessTime < this.minInterval) {
      return
    }
    
    this.isProcessing = true
    this.lastProcessTime = now
    
    try {
      // Only process if Zapier is enabled
      if (process.env.ZAPIER_ENABLED !== 'true') {
        return
      }
      
      await connectDB()
      
      // Find pending events that are due for processing
      const events = await ZapierEventQueue.find({
        status: 'pending',
        nextAttempt: { $lte: new Date() }
      })
        .limit(10) // Process 10 events at a time
        .sort({ createdAt: 1 }) // FIFO order
      
      console.log(`[Zapier] Processing ${events.length} pending events`)
      
      // Process each event
      for (const event of events) {
        try {
          await this.processEvent(event)
        } catch (error) {
          console.error(`[Zapier] Error processing event ${event._id}:`, error)
          await event.markFailed(error instanceof Error ? error.message : 'Unknown error')
        }
      }
      
      // Clean up old completed events (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      await ZapierEventQueue.deleteMany({
        status: { $in: ['completed', 'skipped'] },
        updatedAt: { $lt: thirtyDaysAgo }
      })
      
    } catch (error) {
      console.error('[Zapier] Queue processor error:', error)
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Process a single event from the queue
   */
  private static async processEvent(event: any): Promise<void> {
    // Mark as processing
    await event.markProcessing()
    
    try {
      // Get the business config
      const config = await ZapierConfig.findOne({
        businessId: event.businessId,
        enabled: true
      })
      
      if (!config) {
        // Config disabled or deleted - skip event
        event.status = 'skipped'
        await event.save()
        return
      }
      
      // Check if business can emit events (quota check)
      if (!config.canEmitEvent()) {
        event.status = 'skipped'
        event.error = {
          message: 'Webhook quota exceeded',
          timestamp: new Date()
        }
        await event.save()
        return
      }
      
      // Find active webhooks for this event
      const webhooks = await ZapierWebhook.find({
        businessId: event.businessId,
        configId: config._id,
        events: event.eventName,
        active: true
      })
      
      if (webhooks.length === 0) {
        // No webhooks for this event - mark as completed
        event.status = 'completed'
        await event.save()
        return
      }
      
      // Deliver to each webhook
      const deliveryResults: WebhookDeliveryResult[] = []
      
      for (const webhook of webhooks) {
        const result = await this.deliverWebhook(webhook, event)
        deliveryResults.push(result)
        
        // Update webhook statistics
        await webhook.updateStatistics(result.success, result.responseTime)
      }
      
      // Update event with delivery results
      event.deliveryResults = deliveryResults
      event.webhookIds = webhooks.map(w => w._id)
      
      // Mark as completed if at least one delivery succeeded
      const hasSuccess = deliveryResults.some(r => r.success)
      if (hasSuccess) {
        await event.markCompleted(deliveryResults)
        await config.incrementUsage()
      } else {
        await event.markFailed('All webhook deliveries failed')
      }
      
    } catch (error) {
      console.error(`[Zapier] Event processing error for ${event._id}:`, error)
      await event.markFailed(error instanceof Error ? error.message : 'Processing error')
    }
  }
  
  /**
   * Deliver event to a specific webhook
   */
  private static async deliverWebhook(
    webhook: any,
    event: any
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now()
    
    try {
      // Prepare payload
      const payload = {
        event: event.eventName,
        businessId: event.businessId.toString(),
        timestamp: event.metadata.timestamp || event.createdAt,
        data: event.data,
        metadata: event.metadata
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Zapier-Event': event.eventName,
        'X-Zapier-Timestamp': new Date().toISOString(),
        'X-Zapier-Delivery-Attempt': String(event.attempts),
        'User-Agent': 'Sunstone-Zapier/1.0'
      }
      
      // Add custom headers if configured
      if (webhook.headers) {
        Object.entries(webhook.headers).forEach(([key, value]) => {
          headers[key] = value as string
        })
      }
      
      // Generate signature if secret is configured
      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex')
        headers['X-Zapier-Signature'] = signature
      }
      
      // Send webhook with timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeout)
      
      const responseTime = Date.now() - startTime
      
      // Log delivery
      // TODO: Implement webhook logging
      // await ZapierLog.create({
      //   businessId: event.businessId,
      //   webhookId: webhook._id,
      //   eventId: event._id,
      //   url: webhook.url,
      //   status: response.status,
      //   responseTime,
      //   success: response.ok,
      //   error: response.ok ? undefined : `HTTP ${response.status}`
      // })
      
      // Check if response is successful (2xx status)
      if (response.ok) {
        return {
          webhookId: webhook._id.toString(),
          url: webhook.url,
          success: true,
          statusCode: response.status,
          responseTime,
          timestamp: new Date()
        }
      } else {
        // Non-2xx response
        const errorBody = await response.text().catch(() => 'No response body')
        return {
          webhookId: webhook._id.toString(),
          url: webhook.url,
          success: false,
          statusCode: response.status,
          responseTime,
          error: `HTTP ${response.status}: ${errorBody.substring(0, 200)}`,
          timestamp: new Date()
        }
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Log failed delivery
      // TODO: Implement webhook logging
      // await ZapierLog.create({
      //   businessId: event.businessId,
      //   webhookId: webhook._id,
      //   eventId: event._id,
      //   url: webhook.url,
      //   status: 0,
      //   responseTime,
      //   success: false,
      //   error: errorMessage
      // })
      
      return {
        webhookId: webhook._id.toString(),
        url: webhook.url,
        success: false,
        responseTime,
        error: errorMessage,
        timestamp: new Date()
      }
    }
  }
  
  /**
   * Health check for the processor
   */
  static async getHealth(): Promise<{
    healthy: boolean
    queueSize: number
    failedEvents: number
    processingRate: number
  }> {
    try {
      await connectDB()
      
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      // Get queue metrics
      const [queueSize, failedEvents, processedLastHour] = await Promise.all([
        ZapierEventQueue.countDocuments({ status: 'pending' }),
        ZapierEventQueue.countDocuments({ status: 'failed' }),
        ZapierEventQueue.countDocuments({
          status: 'completed',
          updatedAt: { $gte: oneHourAgo }
        })
      ])
      
      const processingRate = processedLastHour // events per hour
      
      // Health checks
      const healthy = queueSize < 1000 && failedEvents < 100
      
      return {
        healthy,
        queueSize,
        failedEvents,
        processingRate
      }
      
    } catch (error) {
      console.error('[Zapier] Health check error:', error)
      return {
        healthy: false,
        queueSize: -1,
        failedEvents: -1,
        processingRate: 0
      }
    }
  }
}

/**
 * Start the background processor
 * Call this from your app initialization
 */
export function startZapierProcessor(): void {
  if (process.env.ZAPIER_ENABLED !== 'true') {
    console.log('[Zapier] Processor disabled (ZAPIER_ENABLED !== true)')
    return
  }
  
  console.log('[Zapier] Starting webhook processor...')
  
  // Process queue every 10 seconds
  setInterval(() => {
    ZapierWebhookProcessor.processQueue().catch(error => {
      console.error('[Zapier] Processor interval error:', error)
    })
  }, 10000)
  
  // Run immediately
  ZapierWebhookProcessor.processQueue().catch(error => {
    console.error('[Zapier] Initial processor error:', error)
  })
}