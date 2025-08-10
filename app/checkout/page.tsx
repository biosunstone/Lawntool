'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Trash2, Tag, ArrowLeft, ShoppingCart, CreditCard } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import GuestEmailCapture from '@/components/cart/GuestEmailCapture'
import { CartService } from '@/lib/cart/cartService'

export default function CheckoutPage() {
  const { cart, removeFromCart, applyDiscount, clearCart } = useCart()
  const { data: session } = useSession()
  const router = useRouter()
  const [discountCode, setDiscountCode] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [guestEmailSaved, setGuestEmailSaved] = useState(false)
  
  // Customer form state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: cart?.propertyAddress || '',
    notes: ''
  })

  useEffect(() => {
    // Pre-fill customer info if logged in
    if (session?.user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: session.user?.name || '',
        email: session.user?.email || ''
      }))
    } else {
      // For guest users, load saved info from localStorage
      const savedEmail = localStorage.getItem('guest_email')
      const savedName = localStorage.getItem('guest_name')
      const savedPhone = localStorage.getItem('guest_phone')
      
      if (savedEmail) {
        setCustomerInfo(prev => ({
          ...prev,
          email: savedEmail,
          name: savedName || '',
          phone: savedPhone || ''
        }))
        setGuestEmailSaved(true)
      }
    }
  }, [session])

  // Handle guest email capture
  const handleGuestEmailCapture = (email: string, name?: string, phone?: string) => {
    // Update customer info
    setCustomerInfo(prev => ({
      ...prev,
      email,
      name: name || prev.name,
      phone: phone || prev.phone
    }))
    
    // Save to cart metadata using CartService
    const cartService = CartService.getInstance()
    cartService.updateGuestInfo({ email, name, phone })
    
    setGuestEmailSaved(true)
    toast.success('Your cart has been saved!')
  }

  // Auto-save guest info when email changes
  useEffect(() => {
    if (!session && customerInfo.email && customerInfo.email.includes('@')) {
      // Save to localStorage and cart metadata
      localStorage.setItem('guest_email', customerInfo.email)
      localStorage.setItem('guest_name', customerInfo.name)
      localStorage.setItem('guest_phone', customerInfo.phone)
      
      // Update cart metadata
      const cartService = CartService.getInstance()
      cartService.updateGuestInfo({
        email: customerInfo.email,
        name: customerInfo.name,
        phone: customerInfo.phone
      })
    }
  }, [customerInfo, session])

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error('Please enter a discount code')
      return
    }
    
    await applyDiscount(discountCode)
    setDiscountCode('')
  }

  const handleCheckout = async () => {
    // Validate customer info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all required fields')
      return
    }
    
    setIsProcessing(true)
    
    try {
      // Process checkout (works for both guest and authenticated users)
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          customerInfo,
          businessId: cart?.businessId || '507f1f77bcf86cd799439011' // Default business ID
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        clearCart()
        toast.success('Order completed successfully!')
        
        // For guests, show success page; for users, redirect to quote
        if (session) {
          router.push(`/quotes/${data.quote._id}`)
        } else {
          // Redirect to a success page for guests
          router.push(`/checkout/success?order=${data.quote.quoteNumber}`)
        }
      } else {
        throw new Error(data.error || 'Failed to complete checkout')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to complete checkout')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add services to your cart to continue</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Email Capture - Only show for guest users */}
            {!session && !guestEmailSaved && (
              <GuestEmailCapture 
                onCapture={handleGuestEmailCapture}
                className="mb-6"
              />
            )}
            
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Address
                  </label>
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Any special instructions or requests..."
                />
              </div>
            </div>

            {/* Cart Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Services</h2>
              <div className="space-y-4">
                {cart.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-4 border-b last:border-0">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Area: {item.area.toLocaleString()} sq ft</span>
                        <span>Rate: ${item.pricePerUnit}/sq ft</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-lg">${item.totalPrice.toFixed(2)}</span>
                      <button
                        onClick={() => removeFromCart(item.serviceType)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              {/* Discount Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Tag className="w-4 h-4" />
                    Apply
                  </button>
                </div>
              </div>
              
              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                
                {cart.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${cart.discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>${cart.tax.toFixed(2)}</span>
                </div>
                
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-green-600">${cart.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Complete Order
                  </>
                )}
              </button>
              
              {/* Security Note */}
              <p className="text-xs text-center text-gray-500 mt-4">
                🔒 Your information is secure and encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}