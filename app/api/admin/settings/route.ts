import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import SystemSettings from '@/models/SystemSettings'
import Business from '@/models/Business'

// GET /api/admin/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
       console.log('==============87GET_TAX')
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Get or create system settings
    const settings = await (SystemSettings as any).getInstance()

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/settings - Update system settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    await connectDB()

    // Get existing settings
    const settings = await (SystemSettings as any).getInstance()

    // Update only provided fields
    const allowedFields = [
      'defaultTaxRate',
      'maintenanceMode',
      'maintenanceMessage',
      'allowNewRegistrations',
      'maxUsersPerBusiness',
      'defaultUserQuota',
      'emailSettings',
      'features'
    ]

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        settings[field] = body[field]
      }
    })

    // Track who made the update
    settings.updatedBy = (session.user as any).id

    await settings.save()

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings
    })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// GET /api/admin/settings/tax - Get tax settings for all businesses
// export async function GET_TAX(request: NextRequest) {
//   try {
//     console.log('==============87GET_TAX')
//     const session = await getServerSession(authOptions)
    
//     if (!session?.user || (session.user as any).role !== 'admin') {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     await connectDB()

//     // Get system default
//     const systemSettings = await (SystemSettings as any).getInstance()
    
//     // Get all business tax rates
//     const businesses = await Business.find({})
//       .select('name taxRate')
//       .lean()

//     return NextResponse.json({
//       defaultTaxRate: systemSettings.defaultTaxRate,
//       businesses: businesses.map(b => ({
//         id: b._id,
//         name: b.name,
//         taxRate: b.taxRate || systemSettings.defaultTaxRate
//       }))
//     })
//   } catch (error: any) {
//     console.error('Error fetching tax settings:', error)
//     return NextResponse.json(
//       { error: 'Failed to fetch tax settings' },
//       { status: 500 }
//     )
//   }
// }

// // PATCH /api/admin/settings/tax - Update tax settings
// export async function PATCH_TAX(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions)
    
//     if (!session?.user || (session.user as any).role !== 'admin') {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const body = await request.json()
//     const { defaultTaxRate, businessUpdates } = body

//     await connectDB()

//     // Update system default if provided
//     if (defaultTaxRate !== undefined) {
//       const settings = await (SystemSettings as any).getInstance()
//       settings.defaultTaxRate = defaultTaxRate
//       settings.updatedBy = (session.user as any).id
//       await settings.save()
//     }

//     // Update individual business tax rates if provided
//     if (businessUpdates && Array.isArray(businessUpdates)) {
//       const updatePromises = businessUpdates.map(update =>
//         Business.findByIdAndUpdate(
//           update.businessId,
//           { taxRate: update.taxRate },
//           { new: true }
//         )
//       )
//       await Promise.all(updatePromises)
//     }

//     return NextResponse.json({
//       message: 'Tax settings updated successfully'
//     })
//   } catch (error: any) {
//     console.error('Error updating tax settings:', error)
//     return NextResponse.json(
//       { error: 'Failed to update tax settings' },
//       { status: 500 }
//     )
//   }
// }