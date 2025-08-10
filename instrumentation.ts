/**
 * Next.js Instrumentation
 * This file runs automatically when the Next.js server starts
 * Used to initialize background tasks like cron jobs
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 Server starting - Initializing background tasks...')
    
    // Dynamic import to avoid issues with edge runtime
    const { startCronJob } = await import('@/lib/cart/cronScheduler')
    
    // Start the cart recovery cron job
    startCronJob()
    
    console.log('✅ Background tasks initialized successfully')
  }
}