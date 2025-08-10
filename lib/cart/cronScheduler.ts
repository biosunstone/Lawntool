/**
 * Automatic cron job scheduler for cart abandonment recovery
 * This runs automatically when the Next.js server starts
 */

import { processAbandonedCarts } from './abandonmentCronJob'

let cronInterval: NodeJS.Timeout | null = null

export function startCronJob() {
  // Stop any existing interval
  if (cronInterval) {
    clearInterval(cronInterval)
  }

  // Run immediately on startup
  console.log('🔄 Cart Recovery Cron: Starting automatic scheduler...')
  runAbandonmentCheck()

  // Schedule to run every 10 minutes (600000 ms)
  cronInterval = setInterval(() => {
    runAbandonmentCheck()
  }, 10 * 60 * 1000) // 10 minutes

  console.log('✅ Cart Recovery Cron: Scheduled to run every 10 minutes')
}

export function stopCronJob() {
  if (cronInterval) {
    clearInterval(cronInterval)
    cronInterval = null
    console.log('⏹️ Cart Recovery Cron: Stopped')
  }
}

async function runAbandonmentCheck() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`🔍 [${timestamp}] Cart Recovery Cron: Checking for abandoned carts...`)
    
    // Use configurable threshold (will use default if not set)
    const result = await processAbandonedCarts()
    
    if (result.processed > 0) {
      console.log(`📧 [${timestamp}] Cart Recovery Cron: Processed ${result.processed} abandoned carts`)
      console.log(`   - Emails sent: ${result.emailsSent}`)
      console.log(`   - SMS sent: ${result.smsSent}`)
      
      if (result.errors.length > 0) {
        console.log(`   - Errors: ${result.errors.length}`)
        result.errors.forEach(err => console.log(`     • ${err}`))
      }
    } else {
      console.log(`✓ [${timestamp}] Cart Recovery Cron: No abandoned carts to process`)
    }
  } catch (error) {
    console.error('❌ Cart Recovery Cron: Error during processing:', error)
  }
}

// Export for manual testing
export { runAbandonmentCheck }