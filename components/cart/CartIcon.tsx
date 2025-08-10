'use client'

import React, { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import Link from 'next/link'

interface CartIconProps {
  className?: string
}

export default function CartIcon({ className = '' }: CartIconProps) {
  const { cartCount } = useCart()
  const [isAnimating, setIsAnimating] = useState(false)

  // Animate when cart count changes
  useEffect(() => {
    if (cartCount > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [cartCount])

  return (
    <Link 
      href="/checkout" 
      className={`relative inline-flex items-center p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      aria-label={`Shopping cart with ${cartCount} items`}
    >
      <ShoppingCart className="w-6 h-6 text-gray-700" />
      
      {cartCount > 0 && (
        <span 
          className={`
            absolute -top-1 -right-1 bg-green-600 text-white text-xs 
            font-bold rounded-full h-5 w-5 flex items-center justify-center
            ${isAnimating ? 'animate-bounce-in' : ''}
          `}
        >
          {cartCount > 9 ? '9+' : cartCount}
        </span>
      )}
      
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </Link>
  )
}