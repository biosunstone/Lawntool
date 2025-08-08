import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import SystemSettings from '@/models/SystemSettings'
import Business from '@/models/Business'

// GET /api/admin/settings/tax - Get tax settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Get system default
    const systemSettings = await (SystemSettings as any).getInstance()
    
    // Get all business tax rates with pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const totalBusinesses = await Business.countDocuments()
    const businesses = await Business.find({})
      .select('name taxRate ownerId')
      .populate('ownerId', 'name email')
      .skip(skip)
      .limit(limit)
      .lean()

    return NextResponse.json({
      defaultTaxRate: systemSettings.defaultTaxRate,
      businesses: businesses.map(b => ({
        id: b._id,
        name: b.name,
        taxRate: b.taxRate || systemSettings.defaultTaxRate,
        owner: b.ownerId
      })),
      pagination: {
        page,
        limit,
        total: totalBusinesses,
        pages: Math.ceil(totalBusinesses / limit)
      }
    })
  } catch (error: any) {
    console.error('Error fetching tax settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tax settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/settings/tax - Update tax settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { defaultTaxRate, businessUpdates, applyToAll } = body

    await connectDB()

    const results: any = {
      systemUpdated: false,
      businessesUpdated: 0
    }

    // Update system default if provided
    if (defaultTaxRate !== undefined) {
      if (defaultTaxRate < 0 || defaultTaxRate > 1) {
        return NextResponse.json(
          { error: 'Tax rate must be between 0 and 1' },
          { status: 400 }
        )
      }

      const settings = await (SystemSettings as any).getInstance()
      settings.defaultTaxRate = defaultTaxRate
      settings.updatedBy = (session.user as any).id
      await settings.save()
      results.systemUpdated = true

      // If applyToAll is true, update all businesses to use the new default
      if (applyToAll) {
        const updateResult = await Business.updateMany(
          {},
          { taxRate: defaultTaxRate }
        )
        results.businessesUpdated = updateResult.modifiedCount
      }
    }

    // Update individual business tax rates if provided
    if (businessUpdates && Array.isArray(businessUpdates)) {
      for (const update of businessUpdates) {
        if (update.taxRate < 0 || update.taxRate > 1) {
          continue // Skip invalid rates
        }
        
        await Business.findByIdAndUpdate(
          update.businessId,
          { taxRate: update.taxRate }
        )
        results.businessesUpdated++
      }
    }

    return NextResponse.json({
      message: 'Tax settings updated successfully',
      results
    })
  } catch (error: any) {
    console.error('Error updating tax settings:', error)
    return NextResponse.json(
      { error: 'Failed to update tax settings' },
      { status: 500 }
    )
  }
}