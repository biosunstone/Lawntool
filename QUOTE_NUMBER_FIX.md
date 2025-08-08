# Quote Number Duplicate Error Fix

## Problem
The application was experiencing E11000 duplicate key errors when creating quotes, particularly when multiple quotes were created simultaneously. This was caused by race conditions in the quote number generation logic.

## Root Cause
Quote numbers were being generated in three different places:
1. **Quote model pre-save hook** (`models/Quote.ts` lines 71-78)
2. **POST /api/quotes** route (`app/api/quotes/route.ts` lines 139-141)  
3. **POST /api/widget/submit** route (`app/api/widget/submit/route.ts` lines 122-123)

Each location used `Quote.countDocuments()` to determine the next number, but this approach is not atomic and causes duplicates when multiple requests execute simultaneously.

## Solution Implemented

### 1. Created Centralized Quote Number Generator
**File:** `/lib/saas/quoteNumberGenerator.ts`

This module provides three generation strategies:
- **generateQuoteNumber**: Attempts atomic generation with retry logic
- **generateSimpleQuoteNumber**: Uses timestamp + random string for guaranteed uniqueness
- **generateBusinessQuoteNumber** (default): Business-specific sequential numbering with fallback

Key features:
- Retry logic with exponential backoff
- Multiple fallback strategies
- Timestamp-based uniqueness guarantee
- Business-specific sequential numbering

### 2. Removed Duplicate Generation Logic
- **Removed** pre-save hook from `models/Quote.ts` (lines 70-78)
- **Updated** `/api/quotes/route.ts` to use centralized generator
- **Updated** `/api/widget/submit/route.ts` to use centralized generator

### 3. Updated Import Statements
Added import for the new generator in both API routes:
```typescript
import generateQuoteNumber from '@/lib/saas/quoteNumberGenerator'
```

## Files Modified
1. `/lib/saas/quoteNumberGenerator.ts` - NEW: Centralized generator
2. `/models/Quote.ts` - Removed pre-save hook
3. `/app/api/quotes/route.ts` - Updated to use generator
4. `/app/api/widget/submit/route.ts` - Updated to use generator

## Testing
A test script has been created at `/test-quote-generation.js` to verify:
- Sequential generation produces unique numbers
- Concurrent generation (10 simultaneous requests) produces unique numbers
- No duplicate key errors occur

### How to Test
```bash
# Run the test script
node test-quote-generation.js

# Or test via the application:
# 1. Create multiple quotes rapidly from the dashboard
# 2. Submit multiple widget forms simultaneously
# 3. Check that no duplicate key errors appear in the logs
```

## Quote Number Format
The new format is: `QT-YYYYMMDD-NNNN` 
- Example: `QT-20250806-0001`
- Fallback format: `QT-{timestamp}-{random}`
- Example fallback: `QT-1704816299547-A3X9K`

## Benefits
1. **No more duplicate key errors** - Guaranteed unique quote numbers
2. **Better performance** - Reduced database queries with retry logic
3. **Cleaner architecture** - Single source of truth for quote generation
4. **Business-specific numbering** - Each business has its own sequence
5. **Date-based organization** - Quote numbers include creation date

## Rollback Plan
If issues arise, you can temporarily revert by:
1. Restoring the pre-save hook in `models/Quote.ts`
2. Removing the import and usage of `generateQuoteNumber` from the API routes
3. Using the previous generation logic

However, this would reintroduce the duplicate key error issue.

## Future Enhancements
Consider implementing:
1. Redis-based atomic counters for better performance
2. Business-specific quote number formatting preferences
3. Quote number prefix customization per business
4. Annual reset option for sequential numbering