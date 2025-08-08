import crypto from 'crypto'

export interface WebhookPayload {
  event: 'widget.submission' | 'widget.quote_generated' | 'widget.lead_created'
  businessId: string
  timestamp: string
  data: any
  metadata?: any
}

// Helper function to send webhook
export async function sendWebhook(
  settings: any,
  payload: WebhookPayload,
  retryCount = 0
): Promise<{ success: boolean; response?: any; error?: string }> {
  if (!settings.enabled || !settings.url) {
    return { success: false, error: 'Webhook not configured' }
  }

  // Filter events
  if (settings.events && !settings.events.includes(payload.event)) {
    return { success: false, error: 'Event not configured' }
  }

  try {
    // Generate signature if secret is configured
    let headers: any = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp
    }

    if (settings.secret) {
      const signature = crypto
        .createHmac('sha256', settings.secret)
        .update(JSON.stringify(payload))
        .digest('hex')
      headers['X-Webhook-Signature'] = signature
    }

    const response = await fetch(settings.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    const responseData = await response.text()

    if (response.ok) {
      return { success: true, response: responseData }
    } else {
      // Retry logic
      if (settings.retryOnFailure && retryCount < (settings.maxRetries || 3)) {
        console.log(`Webhook failed, retrying... (attempt ${retryCount + 1})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount))) // Exponential backoff
        return sendWebhook(settings, payload, retryCount + 1)
      }
      
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${responseData}` 
      }
    }
  } catch (error: any) {
    // Retry on network errors
    if (settings.retryOnFailure && retryCount < (settings.maxRetries || 3)) {
      console.log(`Webhook error, retrying... (attempt ${retryCount + 1})`)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
      return sendWebhook(settings, payload, retryCount + 1)
    }
    
    return { 
      success: false, 
      error: error.message 
    }
  }
}