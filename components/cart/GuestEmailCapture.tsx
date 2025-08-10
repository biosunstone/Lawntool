'use client'

import { useState, useEffect } from 'react'
import { Mail, User, Phone } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

interface GuestEmailCaptureProps {
  onCapture?: (email: string, name?: string, phone?: string) => void
  className?: string
}

export default function GuestEmailCapture({ onCapture, className = '' }: GuestEmailCaptureProps) {
  const { updateGuestInfo } = useCart()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saved, setSaved] = useState(false)

  // Load saved guest info from localStorage
  useEffect(() => {
    const savedGuestInfo = localStorage.getItem('guestInfo')
    if (savedGuestInfo) {
      try {
        const info = JSON.parse(savedGuestInfo)
        setEmail(info.email || '')
        setName(info.name || '')
        setPhone(info.phone || '')
        setSaved(true)
      } catch (e) {
        console.error('Error loading guest info:', e)
      }
    }
  }, [])

  const handleSave = () => {
    if (!email) {
      alert('Please enter your email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address')
      return
    }

    // Save to localStorage and context
    const guestInfo = { email, name, phone }
    localStorage.setItem('guestInfo', JSON.stringify(guestInfo))
    
    // Update cart context with guest info
    updateGuestInfo(guestInfo)
    
    setSaved(true)
    
    if (onCapture) {
      onCapture(email, name, phone)
    }
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 ${className}`}>
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
        Save Your Cart & Get Exclusive Offers
      </h3>
      
      {!saved ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Enter your email to save your cart and receive special discounts!
          </p>
          
          <div className="space-y-3">
            {/* Email Field (Required) */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Your email address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {/* Name Field (Optional) */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Phone Field (Optional) */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder="Your phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleSave}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Save My Cart
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            We'll save your cart and send you exclusive offers. You can unsubscribe anytime.
          </p>
        </>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-700 font-medium">
            ✓ Your cart has been saved!
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Email: {email}
            {name && <span className="block">Name: {name}</span>}
          </p>
          <button
            onClick={() => setSaved(false)}
            className="text-blue-600 text-sm underline mt-2 hover:text-blue-700"
          >
            Update Information
          </button>
        </div>
      )}
    </div>
  )
}