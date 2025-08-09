import { ZapierEventQueue } from '@/models/zapier/ZapierEventQueue'
import { ZapierConfig } from '@/models/zapier/ZapierConfig'
import connectDB from '@/lib/saas/db'

export interface ZapierEvent {
  businessId: string
  eventName: string
  data: any
  metadata?: {
    userId?: string
    ipAddress?: string
    userAgent?: string
    timestamp?: Date
  }
}

/**
 * Safe event emitter for Zapier integration
 * Never blocks main application flow
 * Silently fails if Zapier is disabled or encounters errors
 */
export class ZapierEventEmitter {
  /**
   * Emit an event to Zapier (non-blocking)
   * This method never throws errors and never slows down the main application
   */
  static async emit(businessId: string, eventName: string, data: any, metadata?: any): Promise<void> {
    try {
      // Check if Zapier is globally enabled
      if (process.env.ZAPIER_ENABLED !== 'true') {
        return // Silent return - Zapier disabled globally
      }

      // Don't await - run in background
      this.queueEvent(businessId, eventName, data, metadata).catch(error => {
        // Log error but never throw
        console.error('[Zapier] Error queuing event (non-critical):', {
          businessId,
          eventName,
          error: error.message
        })
      })
    } catch (error) {
      // Extra safety - should never reach here
      console.error('[Zapier] Unexpected error in emit (non-critical):', error)
    }
  }

  /**
   * Queue event for background processing
   */
  private static async queueEvent(
    businessId: string, 
    eventName: string, 
    data: any, 
    metadata?: any
  ): Promise<void> {
    await connectDB()

    // Check if business has Zapier enabled
    const config = await ZapierConfig.findOne({ 
      businessId, 
      enabled: true 
    })

    if (!config) {
      return // Business doesn't have Zapier enabled
    }

    // Check if this event type is enabled for the business
    if (config.enabledEvents && config.enabledEvents.length > 0) {
      if (!config.enabledEvents.includes(eventName)) {
        return // Event type not enabled for this business
      }
    }

    // Queue the event for background processing
    await ZapierEventQueue.create({
      businessId,
      eventName,
      data,
      metadata: {
        ...metadata,
        timestamp: new Date(),
        configId: config._id
      },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      nextAttempt: new Date() // Process immediately
    })
  }
}

/**
 * Helper function for safe event emission
 * Use this in API routes after successful operations
 */
export function safeEmitZapierEvent(
  businessId: string, 
  eventName: string, 
  data: any,
  metadata?: any
): void {
  // Never blocks, never throws
  if (!businessId || !eventName) return

  // Use process.nextTick to ensure response is sent first
  process.nextTick(() => {
    ZapierEventEmitter.emit(businessId, eventName, data, metadata).catch(() => {
      // Silently catch - already logged internally
    })
  })
}

/**
 * Batch emit multiple events
 */
export function safeEmitZapierEvents(
  businessId: string,
  events: Array<{ eventName: string; data: any; metadata?: any }>
): void {
  if (!businessId || !events || events.length === 0) return

  process.nextTick(() => {
    Promise.all(
      events.map(event =>
        ZapierEventEmitter.emit(
          businessId,
          event.eventName,
          event.data,
          event.metadata
        )
      )
    ).catch(() => {
      // Silently catch
    })
  })
}

// Event name constants to prevent typos
export const ZAPIER_EVENTS = {
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_ARCHIVED: 'customer.archived',
  
  // Measurement events
  MEASUREMENT_COMPLETED: 'measurement.completed',
  MEASUREMENT_MANUAL: 'measurement.manual_selection',
  MEASUREMENT_LARGE: 'measurement.large_property',
  
  // Quote events
  QUOTE_CREATED: 'quote.created',
  QUOTE_SENT: 'quote.sent',
  QUOTE_VIEWED: 'quote.viewed',
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_REJECTED: 'quote.rejected',
  QUOTE_EXPIRED: 'quote.expired',
  
  // Widget events
  WIDGET_SUBMISSION: 'widget.submission',
  WIDGET_QUOTE_GENERATED: 'widget.quote_generated',
  
  // Team events
  TEAM_MEMBER_INVITED: 'team.member_invited',
  TEAM_MEMBER_JOINED: 'team.member_joined',
  TEAM_MEMBER_REMOVED: 'team.member_removed',
  
  // Business events
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  QUOTA_EXCEEDED: 'quota.exceeded',
} as const

export type ZapierEventName = typeof ZAPIER_EVENTS[keyof typeof ZAPIER_EVENTS]