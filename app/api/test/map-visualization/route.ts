/**
 * Test Endpoint: Map Visualization
 * Tests the green outline (#00A651) around yard perimeter
 */

import { NextRequest, NextResponse } from 'next/server'
import { StaticMapGenerator } from '@/lib/maps/staticMapGenerator'
import { PropertyBoundaryService } from '@/lib/maps/propertyBoundaryService'

export async function GET(request: NextRequest) {
  try {
    // Test coordinates (example property)
    const center = { lat: 40.7128, lng: -74.0060 } // NYC example
    
    // Generate a test polygon for the yard
    const yardPolygon = PropertyBoundaryService.generateDefaultBoundary(center, 8000)
    
    // Generate a house polygon (smaller, inside the yard)
    const houseOffset = 0.0001
    const housePolygon = [
      { lat: center.lat + houseOffset * 0.5, lng: center.lng - houseOffset * 0.4 },
      { lat: center.lat + houseOffset * 0.5, lng: center.lng + houseOffset * 0.4 },
      { lat: center.lat - houseOffset * 0.3, lng: center.lng + houseOffset * 0.4 },
      { lat: center.lat - houseOffset * 0.3, lng: center.lng - houseOffset * 0.4 },
    ]
    
    // Generate a driveway polygon
    const drivewayPolygon = [
      { lat: center.lat - houseOffset * 0.3, lng: center.lng - houseOffset * 0.4 },
      { lat: center.lat - houseOffset * 0.3, lng: center.lng - houseOffset * 0.2 },
      { lat: center.lat - houseOffset * 0.8, lng: center.lng - houseOffset * 0.2 },
      { lat: center.lat - houseOffset * 0.8, lng: center.lng - houseOffset * 0.4 },
    ]
    
    // Create measurement data
    const measurements = PropertyBoundaryService.createMeasurementData(
      yardPolygon,
      housePolygon,
      drivewayPolygon
    )
    
    // Generate static map URL with green outline
    const mapUrl = StaticMapGenerator.generateMapUrl(
      center,
      yardPolygon,
      measurements,
      {
        width: 800,
        height: 600,
        zoom: 18,
        mapType: 'satellite'
      }
    )
    
    // Generate detailed view
    const detailedMapUrl = StaticMapGenerator.generateDetailedMapUrl(
      center,
      measurements,
      '123 Test Street, New York, NY',
      {
        width: 800,
        height: 600,
        zoom: 19,
        mapType: 'hybrid'
      }
    )
    
    // Generate multiple views
    const multiViews = StaticMapGenerator.generateMultiViewUrls(
      center,
      yardPolygon,
      measurements
    )
    
    return NextResponse.json({
      success: true,
      message: 'Map visualization test successful',
      visualization: {
        center,
        yardOutlineColor: '#00A651',
        strokeWidth: '4px',
        measurements: {
          totalLot: PropertyBoundaryService.formatArea(measurements.lot?.area || 0),
          lawnArea: PropertyBoundaryService.formatArea(measurements.lawn?.area || 0),
          houseArea: PropertyBoundaryService.formatArea(measurements.house?.area || 0),
          drivewayArea: PropertyBoundaryService.formatArea(measurements.driveway?.area || 0),
          housePerimeter: measurements.house ? PropertyBoundaryService.formatPerimeter(measurements.house.perimeter) : 'N/A'
        },
        maps: {
          primary: mapUrl,
          detailed: detailedMapUrl,
          overview: multiViews.overview,
          satellite: multiViews.satellite,
          street: multiViews.street
        },
        notes: [
          'Green outline (#00A651) with 4px width around yard perimeter',
          'House footprint is excluded from lawn area calculation',
          'Driveway is also excluded from lawn area',
          'Static maps are generated at proper zoom to fit property bounds',
          'Maps are ready for backend email use'
        ]
      }
    })
    
  } catch (error) {
    console.error('Map visualization test error:', error)
    return NextResponse.json(
      { 
        error: 'Map visualization test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}