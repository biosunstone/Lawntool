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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Read CSV file
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or invalid' },
        { status: 400 }
      )
    }
    
    // Parse CSV header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredHeaders = ['country', 'code', 'city', 'state', 'baseprice', 'pricepersqft']
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Parse CSV data
    const rules = []
    const errors = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      
      // Validate and transform data
      try {
        const country = row.country?.toUpperCase()
        if (!['US', 'CA'].includes(country)) {
          errors.push(`Row ${i + 1}: Invalid country ${row.country}`)
          continue
        }
        
        const rule: any = {
          country,
          city: row.city || '',
          state: row.state || '',
          region: row.region || '',
          basePrice: parseFloat(row.baseprice) || 50,
          pricePerSqFt: parseFloat(row.pricepersqft) || 0.05,
          surchargePercentage: parseFloat(row.surcharge) || 0,
          discountPercentage: parseFloat(row.discount) || 0,
          minimumPrice: parseFloat(row.minprice) || 30,
          maximumPrice: parseFloat(row.maxprice) || 500,
          isActive: row.active !== 'false',
          createdBy: new mongoose.Types.ObjectId(session.user.id)
        }
        
        // Set code based on country
        if (country === 'US') {
          rule.zipCode = row.code
        } else {
          rule.postalCode = row.code
        }
        
        rules.push(rule)
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error}`)
      }
    }
    
    if (rules.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid rules found in CSV', errors },
        { status: 400 }
      )
    }
    
    // Bulk insert rules (skip duplicates)
    let inserted = 0
    let skipped = 0
    
    for (const rule of rules) {
      try {
        // Check for existing rule
        const existingQuery: any = { country: rule.country }
        if (rule.country === 'US') {
          existingQuery.zipCode = rule.zipCode
        } else {
          existingQuery.postalCode = rule.postalCode
        }
        
        const existing = await ZipCodePricing.findOne(existingQuery)
        if (existing) {
          skipped++
        } else {
          await ZipCodePricing.create(rule)
          inserted++
        }
      } catch (error) {
        errors.push(`Failed to insert ${rule.zipCode || rule.postalCode}: ${error}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      count: inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${inserted} rules, skipped ${skipped} duplicates`
    })
    
  } catch (error: any) {
    console.error('Error bulk uploading ZIP code pricing rules:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}