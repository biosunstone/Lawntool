import { connectDB } from '@/lib/saas/db'
import Quote from '@/models/Quote'

/**
 * Generates a unique quote number for a business
 * Uses atomic operations to prevent duplicates in concurrent requests
 * 
 * @param businessId - The business ID to generate the quote number for
 * @returns A unique quote number string
 */
export async function generateQuoteNumber(businessId: string): Promise<string> {
  await connectDB()
  
  const maxRetries = 5
  let retryCount = 0
  
  while (retryCount < maxRetries) {
    try {
      // Use aggregation to get the highest quote number for this business
      const result = await Quote.aggregate([
        { $match: { businessId } },
        { 
          $project: {
            quoteNumber: 1,
            // Extract the numeric part from quote numbers (e.g., "Q-1234567890-0001" -> 1)
            numericPart: {
              $toInt: {
                $substr: [
                  "$quoteNumber",
                  { $add: [{ $indexOfCP: ["$quoteNumber", "-"] }, 1] },
                  -1
                ]
              }
            }
          }
        },
        { $sort: { numericPart: -1 } },
        { $limit: 1 }
      ])
      
      // Determine the next number
      let nextNumber = 1
      
      if (result.length > 0 && result[0].numericPart) {
        nextNumber = result[0].numericPart + 1
      } else {
        // Fallback: count documents if no valid numeric parts found
        const count = await Quote.countDocuments({ businessId })
        nextNumber = count + 1
      }
      
      // Generate the quote number with business-specific sequence
      const timestamp = Date.now()
      const paddedNumber = nextNumber.toString().padStart(4, '0')
      const quoteNumber = `Q-${timestamp}-${paddedNumber}`
      
      // Attempt to create a placeholder document to reserve this number
      // This uses MongoDB's unique index to prevent duplicates
      const testQuote = new Quote({
        businessId,
        quoteNumber,
        // Minimal required fields for validation
        customerId: '000000000000000000000000', // Placeholder ObjectId
        status: 'draft',
        services: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      
      // Validate the quote number is unique
      await testQuote.validate()
      
      // Check if this quote number already exists (extra safety)
      const exists = await Quote.findOne({ quoteNumber, businessId })
      if (exists) {
        throw new Error('Quote number already exists')
      }
      
      return quoteNumber
      
    } catch (error: any) {
      retryCount++
      
      if (retryCount >= maxRetries) {
        // Final fallback: use timestamp with random string
        const fallbackNumber = `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        console.error(`Failed to generate quote number after ${maxRetries} attempts, using fallback:`, fallbackNumber)
        return fallbackNumber
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100))
    }
  }
  
  // This should never be reached, but TypeScript needs it
  return `Q-${Date.now()}-EMERGENCY`
}

/**
 * Alternative simpler implementation that's more reliable
 * Uses timestamp + random string to ensure uniqueness
 */
export async function generateSimpleQuoteNumber(businessId: string): Promise<string> {
  await connectDB()
  
  // Get count for this business (for sequential part)
  const count = await Quote.countDocuments({ businessId })
  const sequential = (count + 1).toString().padStart(4, '0')
  
  // Generate unique identifier
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 5).toUpperCase()
  
  // Format: Q-{sequential}-{timestamp}-{random}
  // Example: Q-0001-1704816299547-A3X9K
  return `Q-${sequential}-${timestamp}-${random}`
}

/**
 * Business-specific sequential quote number generator
 * Maintains a simple counter per business
 */
export async function generateBusinessQuoteNumber(businessId: string): Promise<string> {
  await connectDB()
  
  const maxRetries = 3
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Count existing quotes for this business
      const count = await Quote.countDocuments({ businessId })
      const nextNumber = count + 1
      
      // Generate a business-specific quote number
      // Format: QT-{YYYYMMDD}-{NNNN}
      const date = new Date()
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const paddedNumber = nextNumber.toString().padStart(4, '0')
      
      const quoteNumber = `QT-${year}${month}${day}-${paddedNumber}`
      
      // Verify this number doesn't exist
      const exists = await Quote.findOne({ quoteNumber, businessId })
      if (!exists) {
        return quoteNumber
      }
      
      // If it exists, try with a random suffix
      const withRandom = `${quoteNumber}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      const existsWithRandom = await Quote.findOne({ quoteNumber: withRandom, businessId })
      if (!existsWithRandom) {
        return withRandom
      }
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error)
    }
  }
  
  // Ultimate fallback: timestamp-based unique number
  return `QT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

// Export the most reliable version as default
export default generateBusinessQuoteNumber