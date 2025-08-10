/**
 * Cron job initialization endpoint
 * This is called automatically when the server starts
 */

import { NextResponse } from 'next/server'
import { startCronJob } from '@/lib/cart/cronScheduler'

// Track if cron has been initialized
let cronInitialized = false

export async function GET() {
  if (!cronInitialized) {
    startCronJob()
    cronInitialized = true
    
    return NextResponse.json({
      success: true,
      message: 'Cart recovery cron job started successfully',
      schedule: 'Running every 10 minutes',
      initialized: new Date().toISOString()
    })
  }
  
  return NextResponse.json({
    success: true,
    message: 'Cart recovery cron job already running',
    schedule: 'Running every 10 minutes'
  })
}