'use client'

import React, { useEffect, useState } from 'react'
import { X, ShoppingCart, Tag } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useRouter } from 'next/navigation'

interface ExitIntentModalProps {
  businessId?: string
}

export default function ExitIntentModal({ businessId }: ExitIntentModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasShown, setHasShown] = useState(false)
  const { cart, cartCount } = useCart()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined' || !cart || cartCount === 0 || hasShown) return

    let exitIntentTimer: NodeJS.Timeout
    let lastMouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      // Detect upward mouse movement toward browser chrome
      if (e.clientY < lastMouseY && e.clientY < 50) {
        showModal()
      }
      lastMouseY = e.clientY
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Check if mouse is leaving from the top
      if (e.clientY <= 0) {
        showModal()
      }
    }

    const handleInactivity = () => {
      // Show modal after 10 minutes of inactivity on checkout page
      if (window.location.pathname.includes('checkout')) {
        exitIntentTimer = setTimeout(() => {
          showModal()
        }, 10 * 60 * 1000) // 10 minutes
      }
    }

    const resetInactivityTimer = () => {
      if (exitIntentTimer) {
        clearTimeout(exitIntentTimer)
      }
      handleInactivity()
    }

    const showModal = () => {
      if (!hasShown && cartCount > 0) {
        setIsVisible(true)
        setHasShown(true)
        
        // Store that we've shown the modal for this session
        sessionStorage.setItem('exit_intent_shown', 'true')
        
        // Track exit intent event
        trackExitIntent()
      }
    }

    const trackExitIntent = () => {
      // Send analytics event
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'exit_intent_shown',
          businessId,
          cartValue: cart?.total
        })
      }).catch(console.error)
    }

    // Check if we've already shown the modal in this session
    const alreadyShown = sessionStorage.getItem('exit_intent_shown')
    if (alreadyShown) {
      setHasShown(true)
      return
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('click', resetInactivityTimer)
    document.addEventListener('keypress', resetInactivityTimer)
    document.addEventListener('scroll', resetInactivityTimer)

    // Start inactivity timer
    handleInactivity()

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('click', resetInactivityTimer)
      document.removeEventListener('keypress', resetInactivityTimer)
      document.removeEventListener('scroll', resetInactivityTimer)
      
      if (exitIntentTimer) {
        clearTimeout(exitIntentTimer)
      }
    }
  }, [cart, cartCount, hasShown, businessId])

  const handleClose = () => {
    setIsVisible(false)
    
    // Track modal dismissal
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'exit_intent_dismissed',
        businessId,
        cartValue: cart?.total
      })
    }).catch(console.error)
  }

  const handleCompleteCheckout = () => {
    setIsVisible(false)
    
    // Track modal conversion
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'exit_intent_converted',
        businessId,
        cartValue: cart?.total
      })
    }).catch(console.error)
    
    // Navigate to checkout
    router.push('/checkout')
  }

  if (!isVisible || !cart) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slide-up">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Icon */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="bg-green-100 p-3 sm:p-4 rounded-full">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
              </div>
            </div>
            
            {/* Heading */}
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-2">
              Wait! You're almost done
            </h2>
            
            {/* Subheading */}
            <p className="text-sm sm:text-base text-gray-600 text-center mb-4 sm:mb-6">
              Complete your booking now and get <span className="font-semibold text-green-600">5% off</span> your first service!
            </p>
            
            {/* Cart Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Your Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})</h3>
              <div className="space-y-2">
                {cart.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
                {cart.items.length > 3 && (
                  <div className="text-sm text-gray-500">
                    And {cart.items.length - 3} more...
                  </div>
                )}
              </div>
              
              <div className="border-t mt-3 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <div className="text-right">
                    <div className="text-gray-400 line-through text-sm">
                      ${cart.total.toFixed(2)}
                    </div>
                    <div className="font-bold text-green-600">
                      ${(cart.total * 0.95).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Discount Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-2">
                <Tag className="w-4 h-4 text-yellow-700" />
                <span className="text-sm font-medium text-yellow-700">
                  Limited Time: 5% OFF
                </span>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCompleteCheckout}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Complete Checkout & Save 5%
              </button>
              
              <button
                onClick={handleClose}
                className="w-full text-gray-500 hover:text-gray-700 transition-colors text-sm"
              >
                Maybe later
              </button>
            </div>
            
            {/* Urgency message */}
            <p className="text-xs text-center text-gray-500 mt-4">
              🔒 Your information is secure and your cart is saved
            </p>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}