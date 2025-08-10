/**
 * Professional Static Map Generator
 * Creates high-quality map images with annotations for emails
 */

import { LatLng, MeasurementData, PropertyBoundaryService } from './propertyBoundaryService'

export interface ProfessionalMapOptions {
  width?: number
  height?: number
  scale?: 1 | 2
  mapType?: 'satellite' | 'hybrid' | 'roadmap'
  serviceType?: 'outdoor' | 'perimeter' | 'mosquito' | 'all'
  showAnnotations?: boolean
  quality?: 'standard' | 'high' | 'retina'
}

export interface ServiceAnnotation {
  type: 'outdoor' | 'perimeter' | 'mosquito'
  label: string
  measurement: string
  color: string
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export class ProfessionalMapGenerator {
  private static readonly BASE_URL = 'https://maps.googleapis.com/maps/api/staticmap'
  private static readonly MAX_URL_LENGTH = 8192
  
  // Service zone configurations
  private static readonly SERVICE_CONFIGS = {
    outdoor: {
      color: '0x00A651',
      fillColor: '0x00A65126',
      weight: 4,
      label: 'Outdoor Pest Control',
      icon: '🌿'
    },
    perimeter: {
      color: '0x0066CC',
      fillColor: '0x0066CC26',
      weight: 4,
      label: 'Perimeter Pest Control',
      icon: '🛡️'
    },
    mosquito: {
      color: '0xCC0000',
      fillColor: '0xCC000026',
      weight: 4,
      label: 'Mosquito Control',
      icon: '🦟'
    }
  }
  
  /**
   * Generate professional static map with annotations
   */
  static generateProfessionalMap(
    center: LatLng,
    polygon: LatLng[],
    measurements: MeasurementData,
    options: ProfessionalMapOptions = {}
  ): string {
    const {
      width = 1200,
      height = 800,
      scale = 2,
      mapType = 'satellite',
      serviceType = 'outdoor',
      quality = 'high'
    } = options
    
    // Calculate optimal zoom and center
    const bounds = this.calculateBounds(polygon)
    const zoom = this.calculateOptimalZoom(bounds, width, height)
    const mapCenter = this.calculateCentroid(polygon)
    
    // Build query parameters
    const params = new URLSearchParams({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      center: `${mapCenter.lat},${mapCenter.lng}`,
      zoom: zoom.toString(),
      size: `${width}x${height}`,
      scale: scale.toString(),
      maptype: mapType,
      format: 'png'
    })
    
    // Add professional map styling
    this.addMapStyling(params)
    
    // Add property boundary with service-specific styling
    if (polygon.length > 0) {
      const serviceConfig = this.SERVICE_CONFIGS[serviceType as keyof typeof this.SERVICE_CONFIGS] 
        || this.SERVICE_CONFIGS.outdoor
      
      const pathString = this.createEnhancedPath({
        points: polygon,
        color: serviceConfig.color,
        weight: serviceConfig.weight,
        fillColor: serviceConfig.fillColor
      })
      params.append('path', pathString)
    }
    
    // Add house footprint overlay
    if (measurements?.house?.polygon) {
      const housePath = this.createEnhancedPath({
        points: measurements.house.polygon,
        color: '0x8B4513',
        weight: 2,
        fillColor: '0x8B451360'
      })
      params.append('path', housePath)
    }
    
    // Add driveway overlay
    if (measurements?.driveway?.polygon) {
      const drivewayPath = this.createEnhancedPath({
        points: measurements.driveway.polygon,
        color: '0x4B5563',
        weight: 2,
        fillColor: '0x6B728080'
      })
      params.append('path', drivewayPath)
    }
    
    // Add property marker
    const markerStyle = this.createCustomMarker(mapCenter)
    params.append('markers', markerStyle)
    
    return `${this.BASE_URL}?${params.toString()}`
  }
  
  /**
   * Generate map with all service zones
   */
  static generateMultiServiceMap(
    center: LatLng,
    polygon: LatLng[],
    measurements: MeasurementData,
    options: ProfessionalMapOptions = {}
  ): {
    outdoor: string
    perimeter: string
    mosquito: string
    combined: string
  } {
    return {
      outdoor: this.generateProfessionalMap(center, polygon, measurements, {
        ...options,
        serviceType: 'outdoor'
      }),
      perimeter: this.generateProfessionalMap(center, polygon, measurements, {
        ...options,
        serviceType: 'perimeter'
      }),
      mosquito: this.generateProfessionalMap(center, polygon, measurements, {
        ...options,
        serviceType: 'mosquito'
      }),
      combined: this.generateCombinedServiceMap(center, polygon, measurements, options)
    }
  }
  
  /**
   * Generate combined service map with all zones
   */
  private static generateCombinedServiceMap(
    center: LatLng,
    polygon: LatLng[],
    measurements: MeasurementData,
    options: ProfessionalMapOptions = {}
  ): string {
    const {
      width = 1200,
      height = 800,
      scale = 2,
      mapType = 'satellite'
    } = options
    
    const bounds = this.calculateBounds(polygon)
    const zoom = this.calculateOptimalZoom(bounds, width, height)
    const mapCenter = this.calculateCentroid(polygon)
    
    const params = new URLSearchParams({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      center: `${mapCenter.lat},${mapCenter.lng}`,
      zoom: zoom.toString(),
      size: `${width}x${height}`,
      scale: scale.toString(),
      maptype: mapType,
      format: 'png'
    })
    
    this.addMapStyling(params)
    
    // Add all service zones with different colors
    const outdoorPath = this.createEnhancedPath({
      points: polygon,
      color: this.SERVICE_CONFIGS.outdoor.color,
      weight: 4,
      fillColor: this.SERVICE_CONFIGS.outdoor.fillColor
    })
    params.append('path', outdoorPath)
    
    return `${this.BASE_URL}?${params.toString()}`
  }
  
  /**
   * Create enhanced path string with professional styling
   */
  private static createEnhancedPath(options: {
    points: LatLng[]
    color: string
    weight: number
    fillColor: string
  }): string {
    const parts: string[] = []
    
    parts.push(`color:${options.color}`)
    parts.push(`weight:${options.weight}`)
    parts.push(`fillcolor:${options.fillColor}`)
    
    // Add polygon points with precision
    const points = options.points.map(p => 
      `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
    ).join('|')
    
    // Close the polygon
    if (options.points.length > 2) {
      const first = options.points[0]
      parts.push(points + `|${first.lat.toFixed(6)},${first.lng.toFixed(6)}`)
    } else {
      parts.push(points)
    }
    
    return parts.join('|')
  }
  
  /**
   * Add professional map styling
   */
  private static addMapStyling(params: URLSearchParams) {
    // Enhanced satellite view styling
    const styles = [
      'feature:administrative|visibility:simplified',
      'feature:road|element:labels|visibility:on',
      'feature:poi|element:labels|visibility:off',
      'element:labels|lightness:20'
    ]
    
    styles.forEach(style => params.append('style', style))
  }
  
  /**
   * Create custom marker styling
   */
  private static createCustomMarker(position: LatLng): string {
    return `size:mid|color:red|label:P|${position.lat},${position.lng}`
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
   * Calculate optimal zoom level for bounds with padding
   */
  private static calculateOptimalZoom(
    bounds: { north: number; south: number; east: number; west: number },
    width: number,
    height: number
  ): number {
    const WORLD_DIM = { height: 256, width: 256 }
    const ZOOM_MAX = 21
    
    const latDiff = bounds.north - bounds.south
    const lngDiff = bounds.east - bounds.west
    
    // Add padding (10% on each side)
    const paddedLatDiff = latDiff * 1.2
    const paddedLngDiff = lngDiff * 1.2
    
    const latZoom = Math.floor(
      Math.log(height * 360 / paddedLatDiff / WORLD_DIM.height) / Math.LN2
    )
    
    const lngZoom = Math.floor(
      Math.log(width * 360 / paddedLngDiff / WORLD_DIM.width) / Math.LN2
    )
    
    const zoom = Math.min(latZoom, lngZoom, ZOOM_MAX)
    
    // For property-level detail, ensure minimum zoom of 18
    return Math.max(zoom, 18)
  }
  
  /**
   * Calculate polygon centroid for optimal centering
   */
  private static calculateCentroid(polygon: LatLng[]): LatLng {
    let sumLat = 0
    let sumLng = 0
    
    polygon.forEach(point => {
      sumLat += point.lat
      sumLng += point.lng
    })
    
    return {
      lat: sumLat / polygon.length,
      lng: sumLng / polygon.length
    }
  }
  
  /**
   * Generate annotation data for overlay
   */
  static generateAnnotations(
    measurements: MeasurementData,
    serviceType: 'outdoor' | 'perimeter' | 'mosquito' | 'all'
  ): ServiceAnnotation[] {
    const annotations: ServiceAnnotation[] = []
    
    if (serviceType === 'outdoor' || serviceType === 'all') {
      if (measurements.lawn) {
        annotations.push({
          type: 'outdoor',
          label: 'Outdoor Pest Control',
          measurement: `Lawn Size - ${PropertyBoundaryService.formatArea(measurements.lawn.area)}`,
          color: '#00A651',
          position: 'top-left'
        })
      }
    }
    
    if (serviceType === 'perimeter' || serviceType === 'all') {
      if (measurements.house) {
        annotations.push({
          type: 'perimeter',
          label: 'Perimeter Pest Control',
          measurement: `House Area - ${PropertyBoundaryService.formatArea(measurements.house.area)}, Perimeter - ${PropertyBoundaryService.formatPerimeter(measurements.house.perimeter)}`,
          color: '#0066CC',
          position: 'top-right'
        })
      }
    }
    
    if (serviceType === 'mosquito' || serviceType === 'all') {
      if (measurements.lot) {
        annotations.push({
          type: 'mosquito',
          label: 'Mosquito Control',
          measurement: `Lot Size - ${PropertyBoundaryService.formatArea(measurements.lot.area)}`,
          color: '#CC0000',
          position: 'bottom-right'
        })
      }
    }
    
    return annotations
  }
  
  /**
   * Generate email-ready map URL with all optimizations
   */
  static async generateEmailMap(
    center: LatLng,
    polygon: LatLng[],
    measurements: MeasurementData,
    address: string,
    serviceType: 'outdoor' | 'perimeter' | 'mosquito' = 'outdoor'
  ): Promise<string> {
    const mapUrl = this.generateProfessionalMap(
      center,
      polygon,
      measurements,
      {
        width: 1200,
        height: 800,
        scale: 2,
        mapType: 'satellite',
        serviceType,
        quality: 'retina'
      }
    )
    
    // In production, save to CDN and return permanent URL
    return mapUrl
  }
}