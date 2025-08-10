/**
 * API Route: Generate Professional Map Image
 * Creates high-quality map images with overlays using Canvas API
 */

import { NextRequest, NextResponse } from 'next/server'
import { AdvancedMapComposer } from '@/lib/maps/advancedMapComposer'
import { ProfessionalMapGenerator } from '@/lib/maps/professionalMapGenerator'
import { PropertyBoundaryService } from '@/lib/maps/propertyBoundaryService'
import connectDB from '@/lib/saas/db'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const data = await request.json()
    const {
      center,
      polygon,
      measurements,
      address,
      serviceType = 'outdoor',
      width = 1200,
      height = 800,
      labelStyle = 'bubble',
      includeAnnotations = true
    } = data
    
    if (!polygon || polygon.length < 3) {
      return NextResponse.json(
        { error: 'Invalid polygon data' },
        { status: 400 }
      )
    }
    
    // Step 1: Generate base map URL using Google Static Maps
    const baseMapUrl = ProfessionalMapGenerator.generateProfessionalMap(
      center,
      polygon,
      measurements,
      {
        width,
        height,
        scale: 2,
        mapType: 'satellite',
        serviceType,
        quality: 'retina'
      }
    )
    
    // Step 2: Compose professional image with overlays
    const composer = new AdvancedMapComposer(width, height)
    const imageBuffer = await composer.composeMapImage(
      baseMapUrl,
      polygon,
      measurements,
      {
        showLabels: includeAnnotations,
        labelStyle,
        serviceType,
        quality: 95
      }
    )
    
    // Step 3: Save to temporary storage or cloud
    // In production, upload to S3/Cloudinary here
    const imageId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const imageUrl = await saveImageToStorage(imageBuffer, imageId)
    
    // Step 4: Generate annotations for email template
    const annotations = ProfessionalMapGenerator.generateAnnotations(measurements, serviceType)
    
    return NextResponse.json({
      success: true,
      imageUrl,
      imageId,
      annotations,
      measurements: {
        lot: measurements.lot ? PropertyBoundaryService.formatArea(measurements.lot.area) : null,
        lawn: measurements.lawn ? PropertyBoundaryService.formatArea(measurements.lawn.area) : null,
        house: measurements.house ? {
          area: PropertyBoundaryService.formatArea(measurements.house.area),
          perimeter: PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)
        } : null,
        driveway: measurements.driveway ? PropertyBoundaryService.formatArea(measurements.driveway.area) : null
      },
      metadata: {
        width,
        height,
        serviceType,
        address,
        generatedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Error generating professional map:', error)
    return NextResponse.json(
      { error: 'Failed to generate professional map image' },
      { status: 500 }
    )
  }
}

/**
 * Save image to storage (placeholder - implement S3/Cloudinary in production)
 */
async function saveImageToStorage(buffer: Buffer, imageId: string): Promise<string> {
  // In production, upload to S3, Cloudinary, or other cloud storage
  // For now, convert to base64 data URL
  const base64 = buffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64}`
  
  // Store in temporary cache (in production, use Redis or database)
  global.mapImageCache = global.mapImageCache || new Map()
  global.mapImageCache.set(imageId, {
    buffer,
    dataUrl,
    timestamp: Date.now()
  })
  
  // Clean old entries (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const entries = Array.from(global.mapImageCache.entries())
  for (const [key, value] of entries) {
    if (value.timestamp < oneHourAgo) {
      global.mapImageCache.delete(key)
    }
  }
  
  // Return a URL that can be used to retrieve the image
  return `/api/maps/image/${imageId}`
}

/**
 * GET endpoint to retrieve generated map images
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageId = searchParams.get('id')
  
  if (!imageId) {
    return NextResponse.json(
      { error: 'Image ID is required' },
      { status: 400 }
    )
  }
  
  const cache = global.mapImageCache?.get(imageId)
  
  if (!cache) {
    return NextResponse.json(
      { error: 'Image not found or expired' },
      { status: 404 }
    )
  }
  
  // Return image as response
  return new NextResponse(cache.buffer as any, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `inline; filename="property-map-${imageId}.png"`
    }
  })
}

// Declare global type for TypeScript
declare global {
  var mapImageCache: Map<string, {
    buffer: Buffer
    dataUrl: string
    timestamp: number
  }> | undefined
}