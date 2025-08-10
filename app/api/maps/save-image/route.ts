/**
 * API Route: Save Static Map Image
 * Saves static map images for email and backend use
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/saas/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'

// In-memory cache for map URLs (in production, use Redis or similar)
const mapCache = new Map<string, { url: string; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const data = await request.json()
    const { mapUrl, filename, metadata } = data
    
    if (!mapUrl || !filename) {
      return NextResponse.json(
        { error: 'Map URL and filename are required' },
        { status: 400 }
      )
    }
    
    // Check cache first
    const cacheKey = `${filename}-${metadata?.address || ''}`
    const cached = mapCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        url: cached.url,
        cached: true
      })
    }
    
    // In production, you would:
    // 1. Download the image from Google Static Maps
    // 2. Save it to cloud storage (S3, Cloudinary, etc.)
    // 3. Store the URL in the database
    // 4. Return the permanent URL
    
    // For now, we'll just cache and return the Google Maps URL
    // Note: Google Static Maps URLs are valid for a limited time
    
    const savedUrl = mapUrl // In production, this would be the cloud storage URL
    
    // Cache the URL
    mapCache.set(cacheKey, {
      url: savedUrl,
      timestamp: Date.now()
    })
    
    // Clean old cache entries
    if (mapCache.size > 1000) {
      const now = Date.now()
      const entries = Array.from(mapCache.entries())
      for (const [key, value] of entries) {
        if (now - value.timestamp > CACHE_DURATION) {
          mapCache.delete(key)
        }
      }
    }
    
    // If metadata is provided, save to database
    if (metadata?.quoteId) {
      // Update the quote with the map URL
      const Quote = (await import('@/models/Quote')).default
      await Quote.findByIdAndUpdate(
        metadata.quoteId,
        {
          $set: {
            'metadata.mapUrl': savedUrl,
            'metadata.mapSavedAt': new Date()
          }
        }
      )
    }
    
    return NextResponse.json({
      success: true,
      url: savedUrl,
      path: `/maps/${filename}`, // Virtual path for reference
      cached: false
    })
    
  } catch (error) {
    console.error('Error saving map image:', error)
    return NextResponse.json(
      { error: 'Failed to save map image' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to retrieve saved map images
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }
    
    // Check cache
    const cached = Array.from(mapCache.entries()).find(
      ([key]) => key.includes(filename)
    )
    
    if (cached) {
      return NextResponse.json({
        success: true,
        url: cached[1].url,
        cached: true
      })
    }
    
    return NextResponse.json(
      { error: 'Map image not found' },
      { status: 404 }
    )
    
  } catch (error) {
    console.error('Error retrieving map image:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve map image' },
      { status: 500 }
    )
  }
}