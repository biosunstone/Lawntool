import { Coordinate } from '@/types/manualSelection'

export interface ZoomPreset {
  name: string
  id: string
  description: string
  icon?: string
  getZoomLevel: (bounds: google.maps.LatLngBounds) => number
  getPadding: () => google.maps.Padding
  focusArea?: 'full' | 'structure' | 'yard' | 'custom'
}

export interface PropertyBounds {
  bounds: google.maps.LatLngBounds
  center: google.maps.LatLng
  area: number // in square meters
  propertyType?: 'residential' | 'commercial' | 'large' | 'small'
}

export class PropertyZoomManager {
  private map: google.maps.Map | null = null
  private propertyPolygon: google.maps.Polygon | null = null
  private customZoomSettings: { zoom: number; center: google.maps.LatLng } | null = null
  private currentPreset: string = 'full-property'
  
  // Zoom level calculations based on property size
  private readonly ZOOM_LEVELS = {
    // Ultra HD zoom levels for different property sizes (in square meters)
    TINY: { maxArea: 500, zoomLevel: 22 },      // < 500 m² (~5,400 ft²)
    SMALL: { maxArea: 1000, zoomLevel: 21 },    // < 1,000 m² (~10,800 ft²)
    MEDIUM: { maxArea: 2000, zoomLevel: 20 },   // < 2,000 m² (~21,500 ft²)
    LARGE: { maxArea: 4000, zoomLevel: 19 },    // < 4,000 m² (~43,000 ft²)
    XLARGE: { maxArea: 8000, zoomLevel: 18 },   // < 8,000 m² (~86,000 ft²)
    HUGE: { maxArea: Infinity, zoomLevel: 17 }  // > 8,000 m²
  }
  
  // Predefined zoom presets
  public readonly PRESETS: Record<string, ZoomPreset> = {
    'full-property': {
      name: 'Full Property Overview',
      id: 'full-property',
      description: 'Entire parcel framed edge-to-edge',
      icon: '🏡',
      focusArea: 'full',
      getZoomLevel: (bounds: google.maps.LatLngBounds) => {
        const area = this.calculateBoundsArea(bounds)
        return this.getOptimalZoomForArea(area)
      },
      getPadding: () => ({
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      })
    },
    'structure-focus': {
      name: 'Structure Focus',
      id: 'structure-focus',
      description: 'Zoomed to house/building footprint with 10-15ft surround',
      icon: '🏠',
      focusArea: 'structure',
      getZoomLevel: (bounds: google.maps.LatLngBounds) => {
        // Zoom in 1-2 levels from full property for structure focus
        const area = this.calculateBoundsArea(bounds)
        const baseZoom = this.getOptimalZoomForArea(area)
        return Math.min(22, baseZoom + 2)
      },
      getPadding: () => ({
        top: 30,
        right: 30,
        bottom: 30,
        left: 30
      })
    },
    'yard-detail': {
      name: 'Yard Detail',
      id: 'yard-detail',
      description: 'Zoomed on backyard/front yard for detailed inspection',
      icon: '🌳',
      focusArea: 'yard',
      getZoomLevel: (bounds: google.maps.LatLngBounds) => {
        // Maximum zoom for yard details
        return 21
      },
      getPadding: () => ({
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      })
    },
    'custom': {
      name: 'Custom Area',
      id: 'custom',
      description: 'User-defined zoom and position',
      icon: '📍',
      focusArea: 'custom',
      getZoomLevel: () => {
        return this.customZoomSettings?.zoom || 20
      },
      getPadding: () => ({
        top: 40,
        right: 40,
        bottom: 40,
        left: 40
      })
    }
  }
  
  constructor() {}
  
  // Initialize with map instance
  public setMap(map: google.maps.Map): void {
    this.map = map
  }
  
  // Set property polygon
  public setPropertyPolygon(polygon: google.maps.Polygon | Coordinate[]): void {
    if (Array.isArray(polygon)) {
      // Create polygon from coordinates
      if (this.map) {
        this.propertyPolygon = new google.maps.Polygon({
          paths: polygon,
          map: this.map
        })
      }
    } else {
      this.propertyPolygon = polygon
    }
  }
  
  // Calculate area of bounds in square meters
  private calculateBoundsArea(bounds: google.maps.LatLngBounds): number {
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    
    // Approximate area calculation
    const latDiff = Math.abs(ne.lat() - sw.lat())
    const lngDiff = Math.abs(ne.lng() - sw.lng())
    
    // Convert to meters (approximate)
    const latMeters = latDiff * 111320 // 1 degree latitude ≈ 111.32 km
    const lngMeters = lngDiff * 111320 * Math.cos((ne.lat() + sw.lat()) / 2 * Math.PI / 180)
    
    return latMeters * lngMeters
  }
  
  // Get optimal zoom level based on property area
  private getOptimalZoomForArea(area: number): number {
    if (area <= this.ZOOM_LEVELS.TINY.maxArea) return this.ZOOM_LEVELS.TINY.zoomLevel
    if (area <= this.ZOOM_LEVELS.SMALL.maxArea) return this.ZOOM_LEVELS.SMALL.zoomLevel
    if (area <= this.ZOOM_LEVELS.MEDIUM.maxArea) return this.ZOOM_LEVELS.MEDIUM.zoomLevel
    if (area <= this.ZOOM_LEVELS.LARGE.maxArea) return this.ZOOM_LEVELS.LARGE.zoomLevel
    if (area <= this.ZOOM_LEVELS.XLARGE.maxArea) return this.ZOOM_LEVELS.XLARGE.zoomLevel
    return this.ZOOM_LEVELS.HUGE.zoomLevel
  }
  
  // Get property bounds from polygon
  public getPropertyBounds(): PropertyBounds | null {
    if (!this.propertyPolygon) return null
    
    const bounds = new google.maps.LatLngBounds()
    const path = this.propertyPolygon.getPath()
    
    path.forEach((latLng) => {
      bounds.extend(latLng)
    })
    
    const center = bounds.getCenter()
    const area = this.calculateBoundsArea(bounds)
    
    // Determine property type based on area
    let propertyType: PropertyBounds['propertyType'] = 'residential'
    if (area < 500) propertyType = 'small'
    else if (area > 4000) propertyType = 'large'
    else if (area > 8000) propertyType = 'commercial'
    
    return {
      bounds,
      center,
      area,
      propertyType
    }
  }
  
  // Apply zoom preset to map
  public applyPreset(presetId: string, animate: boolean = true): void {
    if (!this.map) return
    
    const preset = this.PRESETS[presetId]
    if (!preset) return
    
    this.currentPreset = presetId
    const propertyBounds = this.getPropertyBounds()
    
    if (!propertyBounds) return
    
    if (presetId === 'custom' && this.customZoomSettings) {
      // Apply custom zoom settings
      if (animate) {
        this.map.panTo(this.customZoomSettings.center)
        this.map.setZoom(this.customZoomSettings.zoom)
      } else {
        this.map.setCenter(this.customZoomSettings.center)
        this.map.setZoom(this.customZoomSettings.zoom)
      }
    } else if (presetId === 'structure-focus') {
      // Focus on the center portion of the property (assumed structure location)
      const bounds = propertyBounds.bounds
      const center = bounds.getCenter()
      
      // Create smaller bounds around center for structure
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const latSpan = (ne.lat() - sw.lat()) * 0.4 // 40% of property
      const lngSpan = (ne.lng() - sw.lng()) * 0.4
      
      const structureBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(center.lat() - latSpan/2, center.lng() - lngSpan/2),
        new google.maps.LatLng(center.lat() + latSpan/2, center.lng() + lngSpan/2)
      )
      
      this.map.fitBounds(structureBounds, preset.getPadding())
      
      // Apply zoom level after fitting
      setTimeout(() => {
        const zoom = preset.getZoomLevel(propertyBounds.bounds)
        this.map!.setZoom(zoom)
      }, 100)
    } else if (presetId === 'yard-detail') {
      // Focus on the back portion of the property (assumed yard location)
      const bounds = propertyBounds.bounds
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const center = bounds.getCenter()
      
      // Create bounds for yard area (back half of property)
      const yardBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(sw.lat(), sw.lng()),
        new google.maps.LatLng(center.lat() + (ne.lat() - center.lat()) * 0.5, ne.lng())
      )
      
      this.map.fitBounds(yardBounds, preset.getPadding())
      
      // Apply zoom level after fitting
      setTimeout(() => {
        const zoom = preset.getZoomLevel(propertyBounds.bounds)
        this.map!.setZoom(zoom)
      }, 100)
    } else {
      // Standard full property view
      this.map.fitBounds(propertyBounds.bounds, preset.getPadding())
      
      // Apply optimal zoom level after fitting
      setTimeout(() => {
        const zoom = preset.getZoomLevel(propertyBounds.bounds)
        this.map!.setZoom(zoom)
      }, 100)
    }
  }
  
  // Save current view as custom preset
  public saveCustomView(): void {
    if (!this.map) return
    
    this.customZoomSettings = {
      zoom: this.map.getZoom() || 20,
      center: this.map.getCenter() || new google.maps.LatLng(0, 0)
    }
  }
  
  // Get current preset
  public getCurrentPreset(): string {
    return this.currentPreset
  }
  
  // Auto-center and frame property
  public autoCenterProperty(animate: boolean = true): void {
    this.applyPreset('full-property', animate)
  }
  
  // Smooth zoom to level
  public smoothZoom(targetZoom: number, duration: number = 500): void {
    if (!this.map) return
    
    const startZoom = this.map.getZoom() || 20
    const zoomDiff = targetZoom - startZoom
    const steps = 10
    const stepDuration = duration / steps
    
    let currentStep = 0
    
    const zoomInterval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easeProgress = this.easeInOutCubic(progress)
      const newZoom = startZoom + (zoomDiff * easeProgress)
      
      this.map!.setZoom(newZoom)
      
      if (currentStep >= steps) {
        clearInterval(zoomInterval)
      }
    }, stepDuration)
  }
  
  // Easing function for smooth transitions
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
  
  // Check if HD tiles are loaded
  public isHDLoaded(): boolean {
    if (!this.map) return false
    const zoom = this.map.getZoom() || 0
    return zoom >= 19 // HD tiles typically available at zoom 19+
  }
  
  // Get zoom info for display
  public getZoomInfo(): { level: number; quality: string; description: string } {
    if (!this.map) return { level: 0, quality: 'Unknown', description: '' }
    
    const zoom = this.map.getZoom() || 0
    let quality = 'Standard'
    let description = 'Standard resolution'
    
    if (zoom >= 22) {
      quality = 'Ultra HD'
      description = 'Maximum detail - individual features visible'
    } else if (zoom >= 21) {
      quality = 'Very High'
      description = 'Sidewalk cracks and yard features visible'
    } else if (zoom >= 20) {
      quality = 'High'
      description = 'Roof features and fence lines clear'
    } else if (zoom >= 19) {
      quality = 'Good'
      description = 'Property boundaries and structures clear'
    } else if (zoom >= 18) {
      quality = 'Standard'
      description = 'Full property overview'
    }
    
    return { level: zoom, quality, description }
  }
}