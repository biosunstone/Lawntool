'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { CartService, CartData } from '@/lib/cart/cartService'
import { ICartItem } from '@/models/Cart'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface CartContextType {
  cart: CartData | null
  cartCount: number
  isLoading: boolean
  addToCart: (item: ICartItem, businessId: string) => Promise<void>
  removeFromCart: (serviceType: string) => void
  updateCart: (businessId: string, items: ICartItem[], propertyData?: any) => Promise<void>
  applyDiscount: (code: string) => Promise<void>
  clearCart: () => void
  hasAbandonedCart: boolean
  showRecoveryBanner: boolean
  dismissRecoveryBanner: () => void
  updateGuestInfo: (info: { email?: string; name?: string; phone?: string }) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartData | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasAbandonedCart, setHasAbandonedCart] = useState(false)
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false)
  
  const { data: session } = useSession()
  const cartService = CartService.getInstance()

  // Initialize cart on mount
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true)
      try {
        // Load cart from localStorage
        const localCart = cartService.getCart()
        
        if (localCart) {
          setCart(localCart)
          setCartCount(localCart.items.length)
        }
        
        // If user is logged in, sync with backend
        if (session?.user) {
          const response = await fetch('/api/cart/load', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (response.ok) {
            const serverCart = await response.json()
            if (serverCart && serverCart.items?.length > 0) {
              // Merge carts if needed
              if (localCart && localCart.items.length > 0) {
                // Merge logic: combine items from both carts
                const mergedItems = [...localCart.items]
                serverCart.items.forEach((serverItem: ICartItem) => {
                  const exists = mergedItems.find(
                    item => item.serviceType === serverItem.serviceType
                  )
                  if (!exists) {
                    mergedItems.push(serverItem)
                  }
                })
                
                const mergedCart = await cartService.createOrUpdateCart(
                  serverCart.businessId,
                  mergedItems,
                  {
                    address: serverCart.propertyAddress || localCart.propertyAddress,
                    size: serverCart.propertySize || localCart.propertySize,
                    measurementId: serverCart.measurementId || localCart.measurementId
                  }
                )
                
                setCart(mergedCart)
                setCartCount(mergedCart.items.length)
              } else {
                // Use server cart
                setCart(serverCart)
                setCartCount(serverCart.items.length)
                cartService.saveCart(serverCart)
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load cart:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadCart()
  }, [session])

  // Listen for cart recovery events
  useEffect(() => {
    const handleRecoveryAvailable = () => {
      setHasAbandonedCart(true)
      setShowRecoveryBanner(true)
    }
    
    window.addEventListener('cart:recovery-available', handleRecoveryAvailable)
    
    return () => {
      window.removeEventListener('cart:recovery-available', handleRecoveryAvailable)
    }
  }, [])

  // Add item to cart
  const addToCart = useCallback(async (item: ICartItem, businessId: string) => {
    setIsLoading(true)
    try {
      const updatedCart = await cartService.addToCart(item, businessId)
      setCart(updatedCart)
      setCartCount(updatedCart.items.length)
      
      toast.success(`${item.name} added to cart`)
      
      // Trigger cart update event for UI components
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: updatedCart }))
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      toast.error('Failed to add item to cart')
    } finally {
      setIsLoading(false)
    }
  }, [cartService])

  // Remove item from cart
  const removeFromCart = useCallback((serviceType: string) => {
    const updatedCart = cartService.removeFromCart(serviceType)
    
    if (updatedCart) {
      setCart(updatedCart)
      setCartCount(updatedCart.items.length)
    } else {
      setCart(null)
      setCartCount(0)
    }
    
    toast.success('Item removed from cart')
    
    // Trigger cart update event
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: updatedCart }))
  }, [cartService])

  // Update entire cart
  const updateCart = useCallback(async (
    businessId: string,
    items: ICartItem[],
    propertyData?: {
      address?: string
      size?: number
      measurementId?: string
    }
  ) => {
    setIsLoading(true)
    try {
      const updatedCart = await cartService.createOrUpdateCart(businessId, items, propertyData)
      setCart(updatedCart)
      setCartCount(updatedCart.items.length)
      
      // Trigger cart update event
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: updatedCart }))
    } catch (error) {
      console.error('Failed to update cart:', error)
      toast.error('Failed to update cart')
    } finally {
      setIsLoading(false)
    }
  }, [cartService])

  // Apply discount code
  const applyDiscount = useCallback(async (code: string) => {
    setIsLoading(true)
    try {
      const result = await cartService.applyDiscountCode(code)
      
      if (result.success) {
        const updatedCart = cartService.getCart()
        if (updatedCart) {
          setCart(updatedCart)
          toast.success(result.message)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Failed to apply discount:', error)
      toast.error('Failed to apply discount code')
    } finally {
      setIsLoading(false)
    }
  }, [cartService])

  // Clear cart
  const clearCart = useCallback(() => {
    cartService.clearCart()
    setCart(null)
    setCartCount(0)
    setHasAbandonedCart(false)
    setShowRecoveryBanner(false)
    
    toast.success('Cart cleared')
    
    // Trigger cart update event
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: null }))
  }, [cartService])

  // Dismiss recovery banner
  const dismissRecoveryBanner = useCallback(() => {
    setShowRecoveryBanner(false)
  }, [])

  // Update guest information
  const updateGuestInfo = useCallback((info: { email?: string; name?: string; phone?: string }) => {
    if (cart) {
      const updatedCart = cartService.updateGuestInfo(info)
      if (updatedCart) {
        setCart(updatedCart)
      }
    }
  }, [cart, cartService])

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        isLoading,
        addToCart,
        removeFromCart,
        updateCart,
        applyDiscount,
        clearCart,
        hasAbandonedCart,
        showRecoveryBanner,
        dismissRecoveryBanner,
        updateGuestInfo
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}