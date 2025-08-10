'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface CartItem {
  service_type: string;
  service_details: {
    name: string;
    description: string;
    area: number;
    price_per_unit: number;
  };
  price: number;
}

interface CartData {
  business_id: string;
  cart_data: CartItem[];
  property_address: string;
  property_size: number;
  measurement_id: string;
  recovery_discount_code?: string;
  total: number;
}

interface RecoveryResponse {
  cart: CartData;
}

type Status = 'loading' | 'success' | 'error';

export default function CartRecoveryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { updateCart }:any = useCart()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string>('')
  const [cartData, setCartData] = useState<CartData | null>(null)
  
  useEffect(() => {
    const recoverCart = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setStatus('error')
        setMessage('Invalid recovery link')
        return
      }
      
      try {
        // Track click
        await fetch(`/api/cart/recovery/track?token=${token}&action=click`)
        
        // Get cart data
        const response = await fetch(`/api/cart/recovery/load?token=${token}`)
        
        if (!response.ok) {
          throw new Error('Failed to load cart')
        }
        
        const data: RecoveryResponse = await response.json()
        
        if (data.cart) {
          setCartData(data.cart)
          
          // Restore cart to localStorage and context
          const cartItems = data.cart.cart_data.map((item: CartItem) => ({
            serviceType: item.service_type,
            name: item.service_details.name,
            description: item.service_details.description,
            area: item.service_details.area,
            pricePerUnit: item.service_details.price_per_unit,
            totalPrice: item.price
          }))
          
          await updateCart(
            data.cart.business_id,
            cartItems,
            {
              address: data.cart.property_address,
              size: data.cart.property_size,
              measurementId: data.cart.measurement_id
            }
          )
          
          // Apply discount if available
          if (data.cart.recovery_discount_code) {
            localStorage.setItem('recovery_discount', data.cart.recovery_discount_code)
          }
          
          setStatus('success')
          setMessage('Your cart has been recovered! Redirecting to checkout...')
          
          // Redirect to checkout after 2 seconds
          setTimeout(() => {
            router.push('/checkout')
          }, 2000)
        }
      } catch (error) {
        console.error('Recovery error:', error)
        setStatus('error')
        setMessage('Unable to recover your cart. It may have expired.')
      }
    }
    
    recoverCart()
  }, [searchParams, router, updateCart])
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Recovering Your Cart...</h2>
            <p className="text-gray-600">Please wait while we restore your selected services</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cart Recovered!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            
            {cartData && cartData.recovery_discount_code && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  Your discount code <strong>{cartData.recovery_discount_code}</strong> has been applied!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Save {cartData.recovery_discount_code.replace('SAVE', '')}% on your order
                </p>
              </div>
            )}
            
            <div className="animate-pulse flex items-center justify-center gap-2 text-green-600">
              <ShoppingCart className="w-5 h-5" />
              <span>Redirecting to checkout...</span>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Recovery Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center"
              >
                Start New Measurement
              </Link>
              
              <Link
                href="/contact"
                className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-center"
              >
                Contact Support
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {cartData && status === 'success' && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-3">Your Cart Items:</h3>
          <div className="space-y-2">
            {cartData.cart_data.map((item: CartItem, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.service_details.name}</span>
                <span className="font-medium">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3">
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span className="text-green-600">${cartData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
