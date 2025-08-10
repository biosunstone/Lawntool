/**
 * Advanced Map Composer
 * Creates high-quality map images with professional overlays using Canvas API
 */

import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas'
import sharp from 'sharp'
import { LatLng, MeasurementData, PropertyBoundaryService } from './propertyBoundaryService'

// Service configurations with colors and labels
const SERVICE_CONFIGS = {
  outdoor: {
    color: '#00A651',
    fillColor: 'rgba(0, 166, 81, 0.25)',
    strokeWidth: 4,
    label: 'Outdoor Pest Control',
    labelBg: '#00A651',
    icon: '🌿'
  },
  perimeter: {
    color: '#0066CC',
    fillColor: 'rgba(0, 102, 204, 0.25)',
    strokeWidth: 4,
    label: 'Perimeter Pest Control',
    labelBg: '#0066CC',
    icon: '🛡️'
  },
  mosquito: {
    color: '#CC0000',
    fillColor: 'rgba(204, 0, 0, 0.25)',
    strokeWidth: 4,
    label: 'Mosquito Control',
    labelBg: '#CC0000',
    icon: '🦟'
  }
}

export interface MapComposerOptions {
  width?: number
  height?: number
  quality?: number
  showLabels?: boolean
  labelStyle?: 'bubble' | 'banner' | 'corner'
  serviceType?: 'outdoor' | 'perimeter' | 'mosquito' | 'all'
}

export class AdvancedMapComposer {
  private canvas: Canvas
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  
  constructor(width: number = 1200, height: number = 800) {
    this.width = width
    this.height = height
    this.canvas = createCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')
  }
  
  /**
   * Compose a professional map image with overlays
   */
  async composeMapImage(
    baseMapUrl: string,
    polygon: LatLng[],
    measurements: MeasurementData,
    options: MapComposerOptions = {}
  ): Promise<Buffer> {
    const {
      showLabels = true,
      labelStyle = 'bubble',
      serviceType = 'outdoor',
      quality = 95
    } = options
    
    try {
      // Load the base satellite map image
      const baseImage = await loadImage(baseMapUrl)
      
      // Draw base map
      this.ctx.drawImage(baseImage, 0, 0, this.width, this.height)
      
      // Apply slight contrast enhancement for satellite imagery
      this.enhanceImageContrast()
      
      // Convert lat/lng to canvas coordinates
      const canvasPolygon = this.convertToCanvasCoordinates(polygon, baseMapUrl)
      
      // Draw property boundary with professional styling
      this.drawPropertyBoundary(canvasPolygon, serviceType)
      
      // Draw house and driveway if present
      if (measurements.house?.polygon) {
        const houseCanvas = this.convertToCanvasCoordinates(measurements.house.polygon, baseMapUrl)
        this.drawHouseFootprint(houseCanvas)
      }
      
      if (measurements.driveway?.polygon) {
        const drivewayCanvas = this.convertToCanvasCoordinates(measurements.driveway.polygon, baseMapUrl)
        this.drawDriveway(drivewayCanvas)
      }
      
      // Add professional labels and annotations
      if (showLabels) {
        await this.addProfessionalLabels(measurements, serviceType, labelStyle)
      }
      
      // Add subtle vignette effect for professional look
      this.addVignetteEffect()
      
      // Convert to buffer with high quality
      const buffer = this.canvas.toBuffer('image/jpeg', { quality: quality / 100 })
      
      // Further optimize with sharp
      const optimizedBuffer = await sharp(buffer)
        .png({ quality, compressionLevel: 6 })
        .toBuffer()
      
      return optimizedBuffer
      
    } catch (error) {
      console.error('Error composing map image:', error)
      throw error
    }
  }
  
  /**
   * Draw property boundary with professional styling
   */
  private drawPropertyBoundary(polygon: { x: number; y: number }[], serviceType: string) {
    const config = SERVICE_CONFIGS[serviceType as keyof typeof SERVICE_CONFIGS] || SERVICE_CONFIGS.outdoor
    
    this.ctx.save()
    
    // Create path
    this.ctx.beginPath()
    this.ctx.moveTo(polygon[0].x, polygon[0].y)
    polygon.forEach(point => {
      this.ctx.lineTo(point.x, point.y)
    })
    this.ctx.closePath()
    
    // Apply gradient fill for depth
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height)
    gradient.addColorStop(0, config.fillColor)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)')
    
    // Fill with semi-transparent color
    this.ctx.fillStyle = gradient
    this.ctx.fill()
    
    // Draw stroke with shadow for depth
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    this.ctx.shadowBlur = 8
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2
    
    this.ctx.strokeStyle = config.color
    this.ctx.lineWidth = config.strokeWidth
    this.ctx.lineJoin = 'round'
    this.ctx.lineCap = 'round'
    this.ctx.stroke()
    
    // Add corner dots for professional look
    this.ctx.shadowBlur = 0
    polygon.forEach(point => {
      this.ctx.beginPath()
      this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
      this.ctx.fillStyle = 'white'
      this.ctx.fill()
      this.ctx.strokeStyle = config.color
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    })
    
    this.ctx.restore()
  }
  
  /**
   * Draw house footprint
   */
  private drawHouseFootprint(polygon: { x: number; y: number }[]) {
    this.ctx.save()
    
    this.ctx.beginPath()
    this.ctx.moveTo(polygon[0].x, polygon[0].y)
    polygon.forEach(point => {
      this.ctx.lineTo(point.x, point.y)
    })
    this.ctx.closePath()
    
    // Brown fill for house
    this.ctx.fillStyle = 'rgba(139, 69, 19, 0.6)'
    this.ctx.fill()
    
    this.ctx.strokeStyle = '#8B4513'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    this.ctx.restore()
  }
  
  /**
   * Draw driveway
   */
  private drawDriveway(polygon: { x: number; y: number }[]) {
    this.ctx.save()
    
    this.ctx.beginPath()
    this.ctx.moveTo(polygon[0].x, polygon[0].y)
    polygon.forEach(point => {
      this.ctx.lineTo(point.x, point.y)
    })
    this.ctx.closePath()
    
    // Gray fill for driveway
    this.ctx.fillStyle = 'rgba(107, 114, 128, 0.5)'
    this.ctx.fill()
    
    this.ctx.strokeStyle = '#4B5563'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    this.ctx.restore()
  }
  
  /**
   * Add professional labels with measurements
   */
  private async addProfessionalLabels(
    measurements: MeasurementData,
    serviceType: string,
    labelStyle: 'bubble' | 'banner' | 'corner'
  ) {
    const config = SERVICE_CONFIGS[serviceType as keyof typeof SERVICE_CONFIGS] || SERVICE_CONFIGS.outdoor
    
    // Set up text styling
    this.ctx.font = 'bold 16px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'middle'
    
    if (labelStyle === 'bubble') {
      // Draw bubble-style labels like in reference image
      const labels = this.generateLabelData(measurements, serviceType)
      
      labels.forEach((label, index) => {
        const x = 40 + (index % 2) * (this.width - 400)
        const y = 40 + Math.floor(index / 2) * 100
        
        this.drawBubbleLabel(x, y, label.title, label.subtitle, label.color)
      })
      
    } else if (labelStyle === 'banner') {
      // Draw banner across top
      this.drawBannerLabel(measurements, serviceType)
      
    } else if (labelStyle === 'corner') {
      // Draw corner labels
      this.drawCornerLabels(measurements, serviceType)
    }
  }
  
  /**
   * Draw bubble-style label
   */
  private drawBubbleLabel(x: number, y: number, title: string, subtitle: string, color: string) {
    const padding = 15
    const lineHeight = 24
    
    // Measure text
    this.ctx.font = 'bold 14px Arial'
    const titleWidth = this.ctx.measureText(title).width
    this.ctx.font = '12px Arial'
    const subtitleWidth = this.ctx.measureText(subtitle).width
    const maxWidth = Math.max(titleWidth, subtitleWidth)
    
    const bubbleWidth = maxWidth + padding * 2
    const bubbleHeight = lineHeight * 2 + padding * 2
    
    // Draw bubble background
    this.ctx.save()
    
    // Shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    this.ctx.shadowBlur = 10
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2
    
    // Rounded rectangle
    this.roundRect(x, y, bubbleWidth, bubbleHeight, 8)
    this.ctx.fillStyle = 'white'
    this.ctx.fill()
    
    // Border
    this.ctx.shadowBlur = 0
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    // Draw text
    this.ctx.fillStyle = '#2D3748'
    this.ctx.font = 'bold 14px Arial'
    this.ctx.fillText(title, x + padding, y + padding + 8)
    
    this.ctx.fillStyle = '#4A5568'
    this.ctx.font = '12px Arial'
    this.ctx.fillText(subtitle, x + padding, y + padding + lineHeight + 8)
    
    // Draw pointer (like speech bubble)
    this.ctx.beginPath()
    this.ctx.moveTo(x + bubbleWidth / 2 - 10, y + bubbleHeight)
    this.ctx.lineTo(x + bubbleWidth / 2, y + bubbleHeight + 10)
    this.ctx.lineTo(x + bubbleWidth / 2 + 10, y + bubbleHeight)
    this.ctx.closePath()
    this.ctx.fillStyle = 'white'
    this.ctx.fill()
    this.ctx.strokeStyle = color
    this.ctx.stroke()
    
    this.ctx.restore()
  }
  
  /**
   * Draw banner-style label
   */
  private drawBannerLabel(measurements: MeasurementData, serviceType: string) {
    const config = SERVICE_CONFIGS[serviceType as keyof typeof SERVICE_CONFIGS] || SERVICE_CONFIGS.outdoor
    
    // Draw semi-transparent banner
    this.ctx.save()
    
    const bannerHeight = 80
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)')
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, bannerHeight)
    
    // Add colored accent stripe
    this.ctx.fillStyle = config.color
    this.ctx.fillRect(0, bannerHeight - 4, this.width, 4)
    
    // Draw service info
    this.ctx.fillStyle = config.color
    this.ctx.font = 'bold 24px Arial'
    this.ctx.fillText(config.label, 30, 30)
    
    // Draw measurements
    this.ctx.fillStyle = '#2D3748'
    this.ctx.font = '16px Arial'
    const measurementText = this.getMeasurementText(measurements, serviceType)
    this.ctx.fillText(measurementText, 30, 55)
    
    this.ctx.restore()
  }
  
  /**
   * Draw corner labels
   */
  private drawCornerLabels(measurements: MeasurementData, serviceType: string) {
    const labels = this.generateLabelData(measurements, serviceType)
    
    // Top-left
    if (labels[0]) {
      this.drawCornerLabel(40, 40, labels[0], 'top-left')
    }
    
    // Top-right
    if (labels[1]) {
      this.drawCornerLabel(this.width - 320, 40, labels[1], 'top-right')
    }
    
    // Bottom-right
    if (labels[2]) {
      this.drawCornerLabel(this.width - 320, this.height - 120, labels[2], 'bottom-right')
    }
  }
  
  /**
   * Draw individual corner label
   */
  private drawCornerLabel(x: number, y: number, label: any, position: string) {
    const width = 280
    const height = 80
    
    this.ctx.save()
    
    // Background with gradient
    const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.92)')
    
    this.roundRect(x, y, width, height, 12)
    this.ctx.fillStyle = gradient
    this.ctx.fill()
    
    // Colored accent
    this.ctx.fillStyle = label.color
    this.ctx.fillRect(x, y, 4, height)
    
    // Icon background
    this.ctx.beginPath()
    this.ctx.arc(x + 35, y + height / 2, 20, 0, Math.PI * 2)
    this.ctx.fillStyle = label.color + '20'
    this.ctx.fill()
    
    // Text
    this.ctx.fillStyle = '#2D3748'
    this.ctx.font = 'bold 14px Arial'
    this.ctx.fillText(label.title, x + 65, y + 30)
    
    this.ctx.fillStyle = '#4A5568'
    this.ctx.font = '12px Arial'
    this.ctx.fillText(label.subtitle, x + 65, y + 50)
    
    this.ctx.restore()
  }
  
  /**
   * Generate label data based on measurements
   */
  private generateLabelData(measurements: MeasurementData, serviceType: string) {
    const labels = []
    
    if (serviceType === 'outdoor' || serviceType === 'all') {
      if (measurements.lawn) {
        labels.push({
          title: 'Outdoor Pest Control',
          subtitle: `Lawn Size - ${PropertyBoundaryService.formatArea(measurements.lawn.area)}`,
          color: SERVICE_CONFIGS.outdoor.color
        })
      }
    }
    
    if (serviceType === 'perimeter' || serviceType === 'all') {
      if (measurements.house) {
        labels.push({
          title: 'Perimeter Pest Control',
          subtitle: `House Area - ${PropertyBoundaryService.formatArea(measurements.house.area)}, Perimeter - ${PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}`,
          color: SERVICE_CONFIGS.perimeter.color
        })
      }
    }
    
    if (serviceType === 'mosquito' || serviceType === 'all') {
      if (measurements.lot) {
        labels.push({
          title: 'Mosquito Control',
          subtitle: `Lot Size - ${PropertyBoundaryService.formatArea(measurements.lot.area)}`,
          color: SERVICE_CONFIGS.mosquito.color
        })
      }
    }
    
    return labels
  }
  
  /**
   * Get measurement text for service type
   */
  private getMeasurementText(measurements: MeasurementData, serviceType: string): string {
    switch (serviceType) {
      case 'outdoor':
        return measurements.lawn 
          ? `Lawn Size - ${PropertyBoundaryService.formatArea(measurements.lawn.area)}`
          : 'No lawn area detected'
      case 'perimeter':
        return measurements.house
          ? `House Area - ${PropertyBoundaryService.formatArea(measurements.house.area)}, Perimeter - ${PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}`
          : 'No house detected'
      case 'mosquito':
        return measurements.lot
          ? `Lot Size - ${PropertyBoundaryService.formatArea(measurements.lot.area)}`
          : 'No lot area detected'
      default:
        return ''
    }
  }
  
  /**
   * Convert lat/lng coordinates to canvas pixels
   */
  private convertToCanvasCoordinates(polygon: LatLng[], mapUrl: string): { x: number; y: number }[] {
    // Extract bounds from the map URL or calculate from polygon
    const bounds = this.calculateBounds(polygon)
    
    return polygon.map(point => ({
      x: this.mapLngToX(point.lng, bounds),
      y: this.mapLatToY(point.lat, bounds)
    }))
  }
  
  private calculateBounds(polygon: LatLng[]) {
    const lats = polygon.map(p => p.lat)
    const lngs = polygon.map(p => p.lng)
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
  }
  
  private mapLngToX(lng: number, bounds: any): number {
    const width = bounds.east - bounds.west
    const relativeX = (lng - bounds.west) / width
    return relativeX * this.width * 0.8 + this.width * 0.1 // Add 10% padding
  }
  
  private mapLatToY(lat: number, bounds: any): number {
    const height = bounds.north - bounds.south
    const relativeY = (bounds.north - lat) / height
    return relativeY * this.height * 0.8 + this.height * 0.1 // Add 10% padding
  }
  
  /**
   * Enhance image contrast for better visibility
   */
  private enhanceImageContrast() {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data
    
    const factor = 1.2 // Contrast factor
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, (data[i] - 128) * factor + 128)     // Red
      data[i + 1] = Math.min(255, (data[i + 1] - 128) * factor + 128) // Green
      data[i + 2] = Math.min(255, (data[i + 2] - 128) * factor + 128) // Blue
    }
    
    this.ctx.putImageData(imageData, 0, 0)
  }
  
  /**
   * Add vignette effect for professional look
   */
  private addVignetteEffect() {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 2
    )
    
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)')
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
  
  /**
   * Helper function to draw rounded rectangle
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
  }
}