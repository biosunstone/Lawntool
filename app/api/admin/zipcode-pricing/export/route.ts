import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'
import connectDB from '@/lib/saas/db'
import mongoose from 'mongoose'

const ZipCodePricingSchema = new mongoose.Schema({
  zipCode: { type: String, index: true },
  postalCode: { type: String, index: true },
  country: { type: String, enum: ['US', 'CA'], required: true },
  region: String,
  city: String,
  state: String,
  basePrice: { type: Number, default: 50 },
  pricePerSqFt: { type: Number, default: 0.05 },
  surchargePercentage: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  minimumPrice: { type: Number, default: 30 },
  maximumPrice: { type: Number, default: 500 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
})

const ZipCodePricing = mongoose.models.ZipCodePricing || mongoose.model('ZipCodePricing', ZipCodePricingSchema)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Get all rules
    const rules = await ZipCodePricing.find({}).sort({ country: 1, zipCode: 1, postalCode: 1 })
    
    // Create CSV content
    const headers = [
      'Country',
      'Code',
      'City',
      'State',
      'Region',
      'BasePrice',
      'PricePerSqFt',
      'Surcharge',
      'Discount',
      'MinPrice',
      'MaxPrice',
      'Active',
      'CreatedAt',
      'UpdatedAt'
    ]
    
    const rows = rules.map(rule => [
      rule.country,
      rule.country === 'US' ? rule.zipCode : rule.postalCode,
      rule.city || '',
      rule.state || '',
      rule.region || '',
      rule.basePrice,
      rule.pricePerSqFt,
      rule.surchargePercentage,
      rule.discountPercentage,
      rule.minimumPrice,
      rule.maximumPrice,
      rule.isActive ? 'true' : 'false',
      rule.createdAt ? new Date(rule.createdAt).toISOString() : '',
      rule.updatedAt ? new Date(rule.updatedAt).toISOString() : ''
    ])
    
    // Build CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')
    
    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="zipcode-pricing-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
    
  } catch (error: any) {
    console.error('Error exporting ZIP code pricing rules:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export rules' },
      { status: 500 }
    )
  }
}