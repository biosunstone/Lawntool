'use client'

import React from 'react'
import { ShoppingCart, X, Clock } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useRouter } from 'next/navigation'

export default function RecoveryBanner() {
  const { showRecoveryBanner, dismissRecoveryBanner, cart, cartCount } = useCart()
  const router = useRouter()

  if (!showRecoveryBanner || !cart || cartCount === 0) return null

  const handleViewCart = () => {
    dismissRecoveryBanner()
    router.push('/checkout')
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 shadow-lg z-50 animate-slide-down">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <ShoppingCart className="w-5 h-5" />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-semibold">You left items in your cart!</span>
            <span className="text-sm opacity-90">
              Complete your purchase and save 5% today only
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-1 ml-4 bg-white/20 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Limited time offer</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleViewCart}
            className="bg-white text-green-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-50 transition-colors shadow-md"
          >
            View Cart ({cartCount})
          </button>
          
          <button
            onClick={dismissRecoveryBanner}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}