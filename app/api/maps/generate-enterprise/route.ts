/**
 * API Route: Generate Enterprise Map Image
 * Creates exact reference-style map images for emails
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, loadImage } from 'canvas'
import sharp from 'sharp'
import { PropertyBoundaryService } from '@/lib/maps/propertyBoundaryService'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      center,
      polygon,
      housePolygon = [],
      drivewayPolygon = [],
      measurements,
      address,
      serviceType = 'outdoor'
    } = data
    
    if (!polygon || polygon.length < 3) {
      return NextResponse.json(
        { error: 'Invalid polygon data' },
        { status: 400 }
      )
    }
    
    // Configuration for different service types
    const serviceConfigs = {
      outdoor: {
        color: '#00A651',
        fillColor: 'rgba(0, 166, 81, 0.15)',
        strokeWidth: 4,
        label: 'Outdoor Pest Control',
        measurement: measurements?.lawn 
          ? `Lawn Size - ${PropertyBoundaryService.formatArea(measurements.lawn.area)}`
          : 'No lawn area'
      },
      perimeter: {
        color: '#0066CC',
        fillColor: 'rgba(0, 102, 204, 0.15)',
        strokeWidth: 4,
        label: 'Perimeter Pest Control',
        measurement: measurements?.house
          ? `House Area - ${PropertyBoundaryService.formatArea(measurements.house.area)}, Perimeter - ${PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}`
          : 'No house area'
      },
      mosquito: {
        color: '#CC0000',
        fillColor: 'rgba(204, 0, 0, 0.15)',
        strokeWidth: 4,
        label: 'Mosquito Control',
        measurement: measurements?.lot
          ? `Lot Size - ${PropertyBoundaryService.formatArea(measurements.lot.area)}`
          : 'No lot area'
      }
    }
    
    const config = serviceConfigs[serviceType as keyof typeof serviceConfigs] || serviceConfigs.outdoor
    
    // Create high-resolution canvas
    const width = 1200
    const height = 800
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Generate Google Static Maps URL
    const bounds = calculateBounds(polygon)
    const zoom = calculateOptimalZoom(bounds, width, height)
    const mapCenter = calculateCentroid(polygon)
    
    const mapUrl = generateStaticMapUrl(mapCenter, zoom, width, height)
    
    try {
      // Load the satellite map
      const mapImage = await loadImage(mapUrl)
      ctx.drawImage(mapImage, 0, 0, width, height)
    } catch (error) {
      // If map fails to load, create a placeholder
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(0, 0, width, height)
    }
    
    // Convert coordinates to canvas pixels
    const canvasPolygon = convertToCanvas(polygon, bounds, width, height)
    const canvasHouse = housePolygon.length > 0 ? convertToCanvas(housePolygon, bounds, width, height) : []
    const canvasDriveway = drivewayPolygon.length > 0 ? convertToCanvas(drivewayPolygon, bounds, width, height) : []
    
    // Draw driveway (bottom layer)
    if (canvasDriveway.length > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(canvasDriveway[0].x, canvasDriveway[0].y)
      canvasDriveway.forEach(point => ctx.lineTo(point.x, point.y))
      ctx.closePath()
      ctx.fillStyle = 'rgba(107, 114, 128, 0.5)'
      ctx.fill()
      ctx.strokeStyle = '#4B5563'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
    
    // Draw house (middle layer)
    if (canvasHouse.length > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(canvasHouse[0].x, canvasHouse[0].y)
      canvasHouse.forEach(point => ctx.lineTo(point.x, point.y))
      ctx.closePath()
      ctx.fillStyle = 'rgba(139, 69, 19, 0.6)'
      ctx.fill()
      ctx.strokeStyle = '#8B4513'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
    
    // Draw property boundary (top layer)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(canvasPolygon[0].x, canvasPolygon[0].y)
    canvasPolygon.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.closePath()
    
    // Fill with semi-transparent color
    ctx.fillStyle = config.fillColor
    ctx.fill()
    
    // Draw solid border
    ctx.strokeStyle = config.color
    ctx.lineWidth = config.strokeWidth
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
    
    // Calculate label positions (outside property bounds)
    const labelPositions = calculateLabelPositions(canvasPolygon, width, height, serviceType)
    
    // Draw professional labels
    ctx.save()
    labelPositions.forEach(label => {
      drawProfessionalLabel(ctx, label, config)
    })
    ctx.restore()
    
    // Convert to buffer
    const buffer = canvas.toBuffer('image/png')
    
    // Optimize with sharp
    const optimizedBuffer = await sharp(buffer)
      .png({ quality: 95, compressionLevel: 6 })
      .toBuffer()
    
    // Convert to base64 for immediate use
    const base64 = optimizedBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`
    
    // Store in cache
    const imageId = `enterprise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    global.enterpriseMapCache = global.enterpriseMapCache || new Map()
    global.enterpriseMapCache.set(imageId, {
      buffer: optimizedBuffer,
      dataUrl,
      timestamp: Date.now()
    })
    
    // Clean old cache entries
    cleanCache()
    
    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      imageId,
      downloadUrl: `/api/maps/enterprise-image/${imageId}`,
      metadata: {
        width,
        height,
        serviceType,
        address,
        measurements: {
          lot: measurements?.lot ? PropertyBoundaryService.formatArea(measurements.lot.area) : null,
          lawn: measurements?.lawn ? PropertyBoundaryService.formatArea(measurements.lawn.area) : null,
          house: measurements?.house ? {
            area: PropertyBoundaryService.formatArea(measurements.house.area),
            perimeter: PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)
          } : null,
          driveway: measurements?.driveway ? PropertyBoundaryService.formatArea(measurements.driveway.area) : null
        }
      }
    })
    
  } catch (error) {
    console.error('Error generating enterprise map:', error)
    return NextResponse.json(
      { error: 'Failed to generate enterprise map image' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateBounds(polygon: any[]) {
  const lats = polygon.map(p => p.lat)
  const lngs = polygon.map(p => p.lng)
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  }
}

function calculateCentroid(polygon: any[]) {
  const sumLat = polygon.reduce((sum, p) => sum + p.lat, 0)
  const sumLng = polygon.reduce((sum, p) => sum + p.lng, 0)
  return {
    lat: sumLat / polygon.length,
    lng: sumLng / polygon.length
  }
}

function calculateOptimalZoom(bounds: any, width: number, height: number) {
  const latDiff = bounds.north - bounds.south
  const lngDiff = bounds.east - bounds.west
  const maxDiff = Math.max(latDiff, lngDiff)
  
  if (maxDiff < 0.0005) return 20
  if (maxDiff < 0.001) return 19
  if (maxDiff < 0.002) return 18
  if (maxDiff < 0.004) return 17
  return 16
}

function generateStaticMapUrl(center: any, zoom: number, width: number, height: number) {
  const params = new URLSearchParams({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    center: `${center.lat},${center.lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    scale: '2',
    maptype: 'satellite',
    format: 'png'
  })
  
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
}

function convertToCanvas(polygon: any[], bounds: any, width: number, height: number) {
  const padding = 0.15 // 15% padding
  const effectiveWidth = width * (1 - 2 * padding)
  const effectiveHeight = height * (1 - 2 * padding)
  const offsetX = width * padding
  const offsetY = height * padding
  
  return polygon.map(point => ({
    x: offsetX + ((point.lng - bounds.west) / (bounds.east - bounds.west)) * effectiveWidth,
    y: offsetY + ((bounds.north - point.lat) / (bounds.north - bounds.south)) * effectiveHeight
  }))
}

function calculateLabelPositions(canvasPolygon: any[], width: number, height: number, serviceType: string) {
  // Get canvas bounds
  const xs = canvasPolygon.map(p => p.x)
  const ys = canvasPolygon.map(p => p.y)
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  }
  
  const positions = []
  
  // Position labels outside property bounds with dotted lines
  if (serviceType === 'outdoor') {
    positions.push({
      x: bounds.minX - 150,
      y: bounds.minY - 50,
      connectX: bounds.minX,
      connectY: bounds.minY,
      anchor: 'top-left'
    })
  } else if (serviceType === 'perimeter') {
    positions.push({
      x: bounds.maxX + 150,
      y: bounds.minY - 50,
      connectX: bounds.maxX,
      connectY: bounds.minY,
      anchor: 'top-right'
    })
  } else if (serviceType === 'mosquito') {
    positions.push({
      x: bounds.maxX + 150,
      y: bounds.maxY + 50,
      connectX: bounds.maxX,
      connectY: bounds.maxY,
      anchor: 'bottom-right'
    })
  }
  
  return positions
}

function drawProfessionalLabel(ctx: any, position: any, config: any) {
  // Draw label box
  const boxWidth = 280
  const boxHeight = 70
  const padding = 15
  
  // Adjust position based on anchor
  let boxX = position.x - boxWidth / 2
  let boxY = position.y - boxHeight / 2
  
  if (position.anchor === 'top-left') {
    boxX = position.x
    boxY = position.y
  } else if (position.anchor === 'top-right') {
    boxX = position.x - boxWidth
    boxY = position.y
  } else if (position.anchor === 'bottom-right') {
    boxX = position.x - boxWidth
    boxY = position.y - boxHeight
  }
  
  // Draw white background with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  
  ctx.fillStyle = 'white'
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
  
  // Draw colored border
  ctx.shadowBlur = 0
  ctx.strokeStyle = config.color
  ctx.lineWidth = 2
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
  
  // Draw dotted line to property
  ctx.save()
  ctx.strokeStyle = config.color
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(position.x, position.y + boxHeight / 2)
  ctx.lineTo(position.connectX, position.connectY)
  ctx.stroke()
  ctx.restore()
  
  // Draw circle at connection point
  ctx.beginPath()
  ctx.arc(position.connectX, position.connectY, 8, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
  ctx.strokeStyle = config.color
  ctx.lineWidth = 2
  ctx.stroke()
  
  // Draw text
  ctx.fillStyle = '#2D3748'
  ctx.font = 'bold 16px Arial'
  ctx.fillText(config.label, boxX + padding, boxY + 25)
  
  ctx.fillStyle = '#4A5568'
  ctx.font = '14px Arial'
  ctx.fillText(config.measurement, boxX + padding, boxY + 45)
}

function cleanCache() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  if (global.enterpriseMapCache) {
    const entries = Array.from(global.enterpriseMapCache.entries())
    for (const [key, value] of entries) {
      if (value.timestamp < oneHourAgo) {
        global.enterpriseMapCache.delete(key)
      }
    }
  }
}

// GET endpoint for downloading images
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const imageId = pathParts[pathParts.length - 1]
  
  if (!imageId || !global.enterpriseMapCache?.has(imageId)) {
    return NextResponse.json(
      { error: 'Image not found' },
      { status: 404 }
    )
  }
  
  const cached = global.enterpriseMapCache.get(imageId)
  
  if (!cached) {
    return NextResponse.json(
      { error: 'Image data not found' },
      { status: 404 }
    )
  }
  
  return new NextResponse(cached.buffer as any, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `attachment; filename="property-map-${imageId}.png"`
    }
  })
}

declare global {
  var enterpriseMapCache: Map<string, {
    buffer: Buffer
    dataUrl: string
    timestamp: number
  }> | undefined
}