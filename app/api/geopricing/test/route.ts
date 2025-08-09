import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import { calculateGeopricing } from '@/lib/geopricing/calculator'
import { calculatePricing } from '@/lib/saas/pricing-calculator'

// POST /api/geopricing/test - Test geopricing for an address
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const businessId = (session.user as any).businessId
    if (!businessId) {
      return NextResponse.json({ error: 'No business associated' }, { status: 400 })
    }
    
    const body = await request.json()
    const { location, services, customerTags, date } = body
    
    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      )
    }
    
    await connectDB()
    
    // Calculate geopricing for the location
    const geopricingResult = await calculateGeopricing(
      businessId,
      location,
      date ? new Date(date) : new Date()
    )
    
    // If services are provided, calculate full pricing with geopricing
    let pricingResult = null
    if (services && Array.isArray(services)) {
      const totalArea = services.reduce((sum, s) => sum + (s.area || 0), 0)
      
      pricingResult = await calculatePricing(
        businessId,
        services,
        customerTags || [],
        location.zipcode,
        totalArea,
        date ? new Date(date) : new Date(),
        location
      )
    }
    
    return NextResponse.json({
      location,
      geopricing: geopricingResult,
      pricing: pricingResult,
      summary: {
        zonesApplied: geopricingResult.applicableZones.length,
        totalAdjustment: geopricingResult.finalAdjustment,
        metadata: geopricingResult.metadata
      }
    })
    
  } catch (error) {
    console.error('Error testing geopricing:', error)
    return NextResponse.json(
      { error: 'Failed to test geopricing' },
      { status: 500 }
    )
  }
}

// GET /api/geopricing/test - Get sample test scenarios
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Return sample test scenarios
    const scenarios = [
      {
        name: 'Close to base (5 min drive)',
        location: {
          address: '123 Main St, Toronto, ON',
          lat: 43.6532,
          lng: -79.3832,
          zipcode: 'M5V 3A8',
          city: 'Toronto'
        },
        expectedAdjustment: -5, // 5% discount
        reason: 'Within 5 minute drive time'
      },
      {
        name: 'Medium distance (15 min drive)',
        location: {
          address: '456 Queen St W, Toronto, ON',
          lat: 43.6489,
          lng: -79.4044,
          zipcode: 'M5V 2A9',
          city: 'Toronto'
        },
        expectedAdjustment: 0, // Base pricing
        reason: 'Standard service area'
      },
      {
        name: 'Far from base (30+ min drive)',
        location: {
          address: '789 Eglinton Ave E, Toronto, ON',
          lat: 43.7278,
          lng: -79.3088,
          zipcode: 'M4G 4G7',
          city: 'Toronto'
        },
        expectedAdjustment: 10, // 10% surcharge
        reason: 'Extended service area'
      },
      {
        name: 'Premium neighborhood',
        location: {
          address: '100 Forest Hill Rd, Toronto, ON',
          lat: 43.6969,
          lng: -79.4058,
          zipcode: 'M4V 2L8',
          city: 'Toronto'
        },
        expectedAdjustment: 15, // 15% premium pricing
        reason: 'Premium service zone'
      },
      {
        name: 'High density area',
        location: {
          address: '200 Bay St, Toronto, ON',
          lat: 43.6464,
          lng: -79.3793,
          zipcode: 'M5J 2J2',
          city: 'Toronto'
        },
        expectedAdjustment: -10, // 10% discount for route density
        reason: 'High customer density bonus'
      }
    ]
    
    return NextResponse.json({
      scenarios,
      instructions: 'POST to this endpoint with a location object to test geopricing'
    })
    
  } catch (error) {
    console.error('Error getting test scenarios:', error)
    return NextResponse.json(
      { error: 'Failed to get test scenarios' },
      { status: 500 }
    )
  }
}