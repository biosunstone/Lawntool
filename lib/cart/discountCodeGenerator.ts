/**
 * Dynamic Discount Code Generator for Abandoned Cart Recovery
 */

import crypto from 'crypto'

interface DiscountCodeOptions {
  prefix?: string
  length?: number
  includeNumbers?: boolean
  includeLetters?: boolean
  expiryHours?: number
  discountPercentage?: number
  maxUses?: number
}

interface GeneratedDiscountCode {
  code: string
  discountPercentage: number
  expiresAt: Date
  maxUses: number
  metadata: {
    generatedFor: string // email or session ID
    generatedAt: Date
    type: 'abandonment' | 'exit_intent' | 'manual'
    cartValue?: number
  }
}

/**
 * Generate a unique discount code
 */
export function generateDiscountCode(options: DiscountCodeOptions = {}): string {
  const {
    prefix = 'SAVE',
    length = 6,
    includeNumbers = true,
    includeLetters = true
  } = options

  let chars = ''
  if (includeLetters) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (includeNumbers) chars += '0123456789'
  
  if (!chars) chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let code = prefix
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return code
}

/**
 * Generate a unique hash-based discount code for a specific user/session
 */
export function generatePersonalizedCode(identifier: string, salt?: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(identifier + (salt || Date.now().toString()))
    .digest('hex')
  
  // Take first 8 characters and convert to uppercase
  return 'CART' + hash.substring(0, 8).toUpperCase()
}

/**
 * Generate dynamic discount percentage based on cart value
 */
export function calculateDynamicDiscount(cartValue: number, isFirstTime: boolean = false): number {
  // Base discount
  let discount = 5

  // Increase discount for higher cart values
  if (cartValue > 500) {
    discount = 20
  } else if (cartValue > 300) {
    discount = 15
  } else if (cartValue > 150) {
    discount = 10
  }

  // Bonus for first-time customers
  if (isFirstTime) {
    discount += 5
  }

  // Cap at 25%
  return Math.min(discount, 25)
}

/**
 * Generate a complete discount code object for abandoned cart recovery
 */
export function generateAbandonmentDiscountCode(
  email: string,
  cartValue: number,
  isFirstTime: boolean = false
): GeneratedDiscountCode {
  const discountPercentage = calculateDynamicDiscount(cartValue, isFirstTime)
  
  // Generate unique code based on email and timestamp
  const code = generatePersonalizedCode(email, 'abandonment')
  
  // Set expiry (default 48 hours)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 48)

  return {
    code,
    discountPercentage,
    expiresAt,
    maxUses: 1,
    metadata: {
      generatedFor: email,
      generatedAt: new Date(),
      type: 'abandonment',
      cartValue
    }
  }
}

/**
 * Generate exit intent discount code (smaller discount, shorter expiry)
 */
export function generateExitIntentCode(sessionId: string): GeneratedDiscountCode {
  const code = generateDiscountCode({
    prefix: 'EXIT',
    length: 5
  })

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

  return {
    code,
    discountPercentage: 5, // Fixed 5% for exit intent
    expiresAt,
    maxUses: 1,
    metadata: {
      generatedFor: sessionId,
      generatedAt: new Date(),
      type: 'exit_intent'
    }
  }
}

/**
 * Validate if a discount code is still valid
 */
export function isDiscountCodeValid(
  discountCode: GeneratedDiscountCode,
  currentUses: number = 0
): { valid: boolean; reason?: string } {
  const now = new Date()

  // Check expiry
  if (discountCode.expiresAt < now) {
    return { valid: false, reason: 'Code has expired' }
  }

  // Check max uses
  if (currentUses >= discountCode.maxUses) {
    return { valid: false, reason: 'Code has reached maximum uses' }
  }

  return { valid: true }
}

/**
 * Generate bulk discount codes for campaigns
 */
export function generateBulkDiscountCodes(
  count: number,
  options: DiscountCodeOptions = {}
): string[] {
  const codes = new Set<string>()
  
  while (codes.size < count) {
    codes.add(generateDiscountCode(options))
  }

  return Array.from(codes)
}

/**
 * Format discount code for display
 */
export function formatDiscountCode(code: string): string {
  // Add spacing for readability if code is long
  if (code.length > 8) {
    return code.match(/.{1,4}/g)?.join('-') || code
  }
  return code
}