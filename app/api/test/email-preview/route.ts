import { NextRequest } from 'next/server'
import { generateRecoveryEmailHTML } from '@/lib/cart/recoveryEmailTemplates'

export async function GET(request: NextRequest) {
  // Test data
  const templateData = {
    firstName: 'John',
    packageName: 'Premium Lawn Care Package',
    discount: '15%',
    recoveryUrl: 'http://localhost:3000/cart/recover?token=test_token_123',
    businessName: 'LawnCare Pro',
    cartItems: [
      {
        name: 'Lawn Mowing & Treatment',
        price: 250,
        description: 'Complete lawn care service for 5000 sq ft'
      },
      {
        name: 'Driveway Sealing',
        price: 150,
        description: 'Professional driveway sealing for 1000 sq ft'
      }
    ],
    subtotal: 400,
    discountAmount: 60,
    total: 340
  }
  
  const html = generateRecoveryEmailHTML(templateData)
  
  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  })
}