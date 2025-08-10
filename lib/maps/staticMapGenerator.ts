/**
 * Static Map Image Generation Service
 * Creates static map images with property boundary overlays
 */

import { LatLng, MeasurementData } from './propertyBoundaryService'

export interface StaticMapOptions {
  width?: number
  height?: number
  zoom?: number
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'
  scale?: 1 | 2
  format?: 'png' | 'jpg'
  markers?: MapMarker[]
  paths?: MapPath[]
}

export interface MapMarker {
  position: LatLng
  color?: string
  label?: string
  size?: 'tiny' | 'small' | 'mid'
}

export interface MapPath {
  points: LatLng[]
  color?: string
  weight?: number
  fillColor?: string
  fillOpacity?: number
}

export class StaticMapGenerator {
  private static readonly BASE_URL = 'https://maps.googleapis.com/maps/api/staticmap'
  private static readonly MAX_URL_LENGTH = 8192
  
  /**
   * Generate static map URL with property boundary overlay
   * Creates a green outline (#00A651) around the yard that avoids house footprint
   */
  static generateMapUrl(
    center: LatLng,
    polygon: LatLng[],
    measurements?: MeasurementData,
    options: StaticMapOptions = {}
  ): string {
    const {
      width = 640,
      height = 480,
      zoom = 19,
      mapType = 'satellite',
      scale = 2,
      format = 'png'
    } = options
    
    const params = new URLSearchParams({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      center: `${center.lat},${center.lng}`,
      zoom: zoom.toString(),
      size: `${width}x${height}`,
      scale: scale.toString(),
      maptype: mapType,
      format: format
    })
    
    // Add property boundary path - green outline (#00A651) around yard
    if (polygon.length > 0) {
      const pathString = this.createPathString({
        points: polygon,
        color: '0x00A651',  // Green color #00A651
        weight: 4,           // 4px width
        fillColor: '0x00A651',
        fillOpacity: 0.15
      })
      params.append('path', pathString)
    }
    
    // Add house overlay if present - this will be excluded from the yard outline
    if (measurements?.house?.polygon) {
      const housePathString = this.createPathString({
        points: measurements.house.polygon,
        color: '0x8B4513',  // Brown for house
        weight: 2,
        fillColor: '0x8B4513',
        fillOpacity: 0.6
      })
      params.append('path', housePathString)
    }
    
    // Add driveway overlay if present
    if (measurements?.driveway?.polygon) {
      const drivewayPathString = this.createPathString({
        points: measurements.driveway.polygon,
        color: '0x4b5563',
        weight: 2,
        fillColor: '0x6b7280',
        fillOpacity: 0.5
      })
      params.append('path', drivewayPathString)
    }
    
    // Add center marker
    const markerString = `color:red|${center.lat},${center.lng}`
    params.append('markers', markerString)
    
    const url = `${this.BASE_URL}?${params.toString()}`
    
    // Check URL length limit
    if (url.length > this.MAX_URL_LENGTH) {
      // Simplify polygon if URL is too long
      const simplifiedPolygon = this.simplifyPolygonForUrl(polygon)
      return this.generateMapUrl(center, simplifiedPolygon, measurements, options)
    }
    
    return url
  }
  
  /**
   * Create path string for Google Static Maps API
   */
  private static createPathString(path: MapPath): string {
    const parts: string[] = []
    
    if (path.color) {
      parts.push(`color:${path.color}`)
    }
    if (path.weight) {
      parts.push(`weight:${path.weight}`)
    }
    if (path.fillColor) {
      parts.push(`fillcolor:${path.fillColor}`)
    }
    
    // Add polygon points
    const points = path.points.map(p => `${p.lat},${p.lng}`).join('|')
    
    // Close the polygon
    if (path.points.length > 2) {
      const first = path.points[0]
      parts.push(points + `|${first.lat},${first.lng}`)
    } else {
      parts.push(points)
    }
    
    return parts.join('|')
  }
  
  /**
   * Simplify polygon to reduce URL length
   */
  private static simplifyPolygonForUrl(polygon: LatLng[]): LatLng[] {
    if (polygon.length <= 10) return polygon
    
    // Keep every nth point to reduce size
    const step = Math.ceil(polygon.length / 10)
    const simplified: LatLng[] = []
    
    for (let i = 0; i < polygon.length; i += step) {
      simplified.push(polygon[i])
    }
    
    return simplified
  }
  
  /**
   * Generate map with measurement overlays (labels)
   * This creates a more detailed map with measurement annotations
   */
  static generateDetailedMapUrl(
    center: LatLng,
    measurements: MeasurementData,
    address: string,
    options: StaticMapOptions = {}
  ): string {
    const baseUrl = this.generateMapUrl(
      center,
      measurements.lot?.polygon || [],
      measurements,
      options
    )
    
    // Note: Google Static Maps API doesn't support text overlays directly
    // In production, you would generate this server-side with image manipulation
    // or use a service like Mapbox Static API which supports better overlays
    
    return baseUrl
  }
  
  /**
   * Generate multiple map views for comprehensive property overview
   */
  static generateMultiViewUrls(
    center: LatLng,
    polygon: LatLng[],
    measurements: MeasurementData
  ): {
    overview: string
    satellite: string
    detailed: string
    street: string
  } {
    return {
      // Wide overview
      overview: this.generateMapUrl(center, polygon, measurements, {
        zoom: 18,
        mapType: 'hybrid',
        width: 800,
        height: 600
      }),
      
      // Detailed satellite view
      satellite: this.generateMapUrl(center, polygon, measurements, {
        zoom: 20,
        mapType: 'satellite',
        width: 800,
        height: 600
      }),
      
      // Detailed with measurements
      detailed: this.generateDetailedMapUrl(center, measurements, '', {
        zoom: 19,
        mapType: 'hybrid',
        width: 800,
        height: 600
      }),
      
      // Street view for context
      street: this.generateMapUrl(center, polygon, measurements, {
        zoom: 17,
        mapType: 'roadmap',
        width: 800,
        height: 600
      })
    }
  }
  
  /**
   * Create data URL for embedding in emails
   * Fetches the image and converts to base64
   */
  static async getMapDataUrl(mapUrl: string): Promise<string> {
    try {
      const response = await fetch(mapUrl)
      const blob = await response.blob()
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error fetching map image:', error)
      throw error
    }
  }
  
  /**
   * Save map image to server and database
   * Returns the saved image URL for backend email use
   */
  static async saveMapImage(
    mapUrl: string,
    filename: string,
    metadata?: {
      businessId?: string
      customerId?: string
      quoteId?: string
      address?: string
    }
  ): Promise<string> {
    try {
      const response = await fetch('/api/maps/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mapUrl, 
          filename,
          metadata 
        })
      })
      
      const data = await response.json()
      return data.url || data.path
    } catch (error) {
      console.error('Error saving map image:', error)
      throw error
    }
  }
  
  /**
   * Generate print-ready map with all measurements
   * This would be used for PDF generation
   */
  static generatePrintMap(
    center: LatLng,
    measurements: MeasurementData,
    address: string
  ): string {
    return this.generateMapUrl(
      center,
      measurements.lot?.polygon || [],
      measurements,
      {
        width: 1200,
        height: 900,
        zoom: 19,
        mapType: 'hybrid',
        scale: 2 // High resolution for print
      }
    )
  }
  
  /**
   * Generate and save static map for email use
   * Ensures proper zoom to property bounds and green outline
   */
  static async generateEmailMap(
    center: LatLng,
    polygon: LatLng[],
    measurements: MeasurementData,
    address: string,
    metadata?: any
  ): Promise<string> {
    // Calculate proper zoom level based on polygon bounds
    const bounds = this.calculateBounds(polygon)
    const zoom = this.calculateZoomLevel(bounds)
    
    // Generate the static map URL
    const mapUrl = this.generateMapUrl(
      center,
      polygon,
      measurements,
      {
        width: 800,
        height: 600,
        zoom,
        mapType: 'satellite',
        scale: 2
      }
    )
    
    // Save for backend email use
    const filename = `property-${Date.now()}-${address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
    const savedUrl = await this.saveMapImage(mapUrl, filename, metadata)
    
    return savedUrl
  }
  
  /**
   * Calculate bounds from polygon
   */
  private static calculateBounds(polygon: LatLng[]): {
    north: number
    south: number
    east: number
    west: number
  } {
    const lats = polygon.map(p => p.lat)
    const lngs = polygon.map(p => p.lng)
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
  }
  
  /**
   * Calculate appropriate zoom level for bounds
   */
  private static calculateZoomLevel(bounds: {
    north: number
    south: number
    east: number
    west: number
  }): number {
    const latDiff = bounds.north - bounds.south
    const lngDiff = bounds.east - bounds.west
    const maxDiff = Math.max(latDiff, lngDiff)
    
    // Approximate zoom levels based on difference
    if (maxDiff < 0.0005) return 20
    if (maxDiff < 0.001) return 19
    if (maxDiff < 0.002) return 18
    if (maxDiff < 0.004) return 17
    if (maxDiff < 0.008) return 16
    if (maxDiff < 0.016) return 15
    return 14
  }
}