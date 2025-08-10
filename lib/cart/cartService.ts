import { ICartItem } from '@/models/Cart'

const CART_STORAGE_KEY = 'lawn_service_cart'
const CART_SESSION_KEY = 'lawn_service_session'
const CART_EXPIRY_KEY = 'lawn_service_cart_expiry'
const ABANDONMENT_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds

export interface CartData {
  sessionId: string
  businessId: string
  items: ICartItem[]
  propertyAddress?: string
  propertySize?: number
  measurementId?: string
  customerId?: string
  subtotal: number
  tax: number
  discount: number
  discountCode?: string
  total: number
  lastActivityAt: string
  metadata?: {
    source?: string
    referrer?: string
    device?: string
  }
}

export class CartService {
  private static instance: CartService
  private abandonmentTimer: NodeJS.Timeout | null = null
  private activityTimer: NodeJS.Timeout | null = null
  private syncDebounceTimer: NodeJS.Timeout | null = null
  private lastSyncTime: number = 0
  private readonly SYNC_DEBOUNCE_DELAY = 5000 // 5 seconds
  private readonly MIN_SYNC_INTERVAL = 30000 // 30 seconds minimum between syncs

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSession()
      this.setupEventListeners()
      this.checkForAbandonedCart()
    }
  }

  static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService()
    }
    return CartService.instance
  }

  // Initialize or get session ID
  private initializeSession(): string {
    let sessionId = localStorage.getItem(CART_SESSION_KEY)
    
    if (!sessionId) {
      sessionId = this.generateSessionId()
      localStorage.setItem(CART_SESSION_KEY, sessionId)
    }
    
    return sessionId
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  // Setup event listeners for activity tracking
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // Track user activity with debouncing to prevent excessive updates
    let activityDebounce: NodeJS.Timeout | null = null
    const resetActivityTimer = () => {
      // Clear previous debounce timer
      if (activityDebounce) {
        clearTimeout(activityDebounce)
      }
      
      // Set new debounce timer
      activityDebounce = setTimeout(() => {
        this.resetAbandonmentTimer()
        this.updateLastActivity()
      }, 1000) // Wait 1 second after last activity before updating
    }

    // Listen for various user activities
    document.addEventListener('mousemove', resetActivityTimer)
    document.addEventListener('keypress', resetActivityTimer)
    document.addEventListener('click', resetActivityTimer)
    document.addEventListener('scroll', resetActivityTimer)
    document.addEventListener('touchstart', resetActivityTimer)

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.startAbandonmentTimer()
      } else {
        this.resetAbandonmentTimer()
        this.checkForAbandonedCart()
      }
    })

    // Track before unload
    window.addEventListener('beforeunload', () => {
      const cart = this.getCart()
      if (cart && cart.items.length > 0) {
        this.saveCartState()
      }
    })
  }

  // Start abandonment timer
  private startAbandonmentTimer(): void {
    if (this.abandonmentTimer) {
      clearTimeout(this.abandonmentTimer)
    }

    this.abandonmentTimer = setTimeout(() => {
      this.markCartAsAbandoned()
    }, ABANDONMENT_TIMEOUT)
  }

  // Reset abandonment timer
  private resetAbandonmentTimer(): void {
    if (this.abandonmentTimer) {
      clearTimeout(this.abandonmentTimer)
      this.abandonmentTimer = null
    }
    this.startAbandonmentTimer()
  }

  // Update last activity timestamp
  private updateLastActivity(): void {
    const cart = this.getCart()
    if (cart) {
      cart.lastActivityAt = new Date().toISOString()
      // Don't force sync for activity updates - let debouncing handle it
      this.saveCart(cart, false)
    }
  }

  // Get cart from localStorage
  getCart(): CartData | null {
    if (typeof window === 'undefined') return null
    
    const cartStr = localStorage.getItem(CART_STORAGE_KEY)
    if (!cartStr) return null
    
    try {
      return JSON.parse(cartStr)
    } catch {
      return null
    }
  }

  // Save cart to localStorage
  saveCart(cart: CartData, forceSync: boolean = false): void {
    if (typeof window === 'undefined') return
    
    cart.lastActivityAt = new Date().toISOString()
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    
    // Only sync with backend when necessary, not on every save
    this.scheduleSyncWithBackend(cart, forceSync)
  }

  // Create or update cart
  async createOrUpdateCart(
    businessId: string,
    items: ICartItem[],
    propertyData?: {
      address?: string
      size?: number
      measurementId?: string
    }
  ): Promise<CartData> {
    const sessionId = this.initializeSession()
    const existingCart = this.getCart()
    
    const cart: CartData = {
      sessionId,
      businessId,
      items,
      propertyAddress: propertyData?.address || existingCart?.propertyAddress,
      propertySize: propertyData?.size || existingCart?.propertySize,
      measurementId: propertyData?.measurementId || existingCart?.measurementId,
      subtotal: this.calculateSubtotal(items),
      tax: 0, // Will be calculated based on business settings
      discount: existingCart?.discount || 0,
      discountCode: existingCart?.discountCode,
      total: 0,
      lastActivityAt: new Date().toISOString(),
      metadata: {
        source: this.getSource(),
        referrer: document.referrer,
        device: this.getDeviceType()
      }
    }
    
    // Calculate tax and total
    cart.tax = this.calculateTax(cart.subtotal, businessId)
    cart.total = cart.subtotal + cart.tax - cart.discount
    
    this.saveCart(cart, true) // Force sync for cart creation/major update
    this.resetAbandonmentTimer()
    
    return cart
  }

  // Add item to cart
  async addToCart(item: ICartItem, businessId: string): Promise<CartData> {
    let cart = this.getCart()
    
    if (!cart) {
      cart = await this.createOrUpdateCart(businessId, [item])
    } else {
      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(
        i => i.serviceType === item.serviceType
      )
      
      if (existingItemIndex > -1) {
        // Update existing item
        cart.items[existingItemIndex] = item
      } else {
        // Add new item
        cart.items.push(item)
      }
      
      // Recalculate totals
      cart.subtotal = this.calculateSubtotal(cart.items)
      cart.tax = this.calculateTax(cart.subtotal, businessId)
      cart.total = cart.subtotal + cart.tax - cart.discount
      
      this.saveCart(cart, true) // Force sync when adding items
    }
    
    this.resetAbandonmentTimer()
    return cart
  }

  // Remove item from cart
  removeFromCart(serviceType: string): CartData | null {
    const cart = this.getCart()
    if (!cart) return null
    
    cart.items = cart.items.filter(item => item.serviceType !== serviceType)
    
    // Recalculate totals
    cart.subtotal = this.calculateSubtotal(cart.items)
    cart.tax = this.calculateTax(cart.subtotal, cart.businessId)
    cart.total = cart.subtotal + cart.tax - cart.discount
    
    if (cart.items.length === 0) {
      this.clearCart()
      return null
    }
    
    this.saveCart(cart, true) // Force sync when removing items
    return cart
  }

  // Apply discount code
  async applyDiscountCode(code: string): Promise<{ success: boolean; discount: number; message: string }> {
    const cart = this.getCart()
    if (!cart) {
      return { success: false, discount: 0, message: 'No active cart found' }
    }
    
    // Validate discount code with backend
    try {
      const response = await fetch('/api/cart/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, businessId: cart.businessId })
      })
      
      const data = await response.json()
      
      if (data.valid) {
        cart.discount = data.discount
        cart.discountCode = code
        cart.total = cart.subtotal + cart.tax - cart.discount
        this.saveCart(cart, true) // Force sync when applying discount
        
        return { success: true, discount: data.discount, message: 'Discount applied successfully' }
      } else {
        return { success: false, discount: 0, message: data.message || 'Invalid discount code' }
      }
    } catch (error) {
      return { success: false, discount: 0, message: 'Failed to validate discount code' }
    }
  }

  // Update guest information
  updateGuestInfo(info: { email?: string; name?: string; phone?: string }): CartData | null {
    const cart:any = this.getCart()
    if (!cart) return null
    
    // Update cart metadata with guest info
    if (!cart.metadata) {
      cart.metadata = {}
    }
    
    if (info.email) cart.metadata.guest_email = info.email
    if (info.name) cart.metadata.guest_name = info.name
    if (info.phone) cart.metadata.guest_phone = info.phone
    
    this.saveCart(cart, true) // Force sync when guest info is added
    
    // Sync with backend if cart ID exists
    if (cart.cartId) {
      this.syncGuestInfoWithBackend(cart.cartId, info)
    }
    
    return cart
  }
  
  // Sync guest info with backend
  private async syncGuestInfoWithBackend(cartId: string, info: { email?: string; name?: string; phone?: string }) {
    try {
      await fetch(`/api/cart/${cartId}/guest-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info)
      })
    } catch (error) {
      console.error('Failed to sync guest info with backend:', error)
    }
  }

  // Clear cart
  clearCart(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(CART_STORAGE_KEY)
    localStorage.removeItem(CART_EXPIRY_KEY)
    
    if (this.abandonmentTimer) {
      clearTimeout(this.abandonmentTimer)
      this.abandonmentTimer = null
    }
  }

  // Mark cart as abandoned
  private async markCartAsAbandoned(): Promise<void> {
    const cart = this.getCart()
    if (!cart || cart.items.length === 0) return
    
    try {
      await fetch('/api/cart/abandon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: cart.sessionId,
          cart
        })
      })
      
      // Store abandonment time
      localStorage.setItem(CART_EXPIRY_KEY, new Date().toISOString())
    } catch (error) {
      console.error('Failed to mark cart as abandoned:', error)
    }
  }

  // Check for previously abandoned cart
  private checkForAbandonedCart(): void {
    const cart = this.getCart()
    const expiryTime = localStorage.getItem(CART_EXPIRY_KEY)
    
    if (cart && cart.items.length > 0 && expiryTime) {
      const timeSinceAbandonment = Date.now() - new Date(expiryTime).getTime()
      const oneDay = 24 * 60 * 60 * 1000
      
      if (timeSinceAbandonment < oneDay) {
        // Show recovery banner
        this.showRecoveryBanner()
      }
    }
  }

  // Show recovery banner for returning users
  private showRecoveryBanner(): void {
    // This will be implemented in the UI component
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:recovery-available'))
    }
  }

  // Schedule sync with backend using intelligent debouncing
  private scheduleSyncWithBackend(cart: any, forceSync: boolean = false): void {
    // Clear existing sync timer
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer)
    }

    // Check if we should sync immediately (for important changes)
    const shouldSyncImmediately = forceSync || 
      cart.items.length === 0 || // Cart was cleared
      cart.discountCode || // Discount was applied
      cart.metadata?.guest_email // Guest email was added

    if (shouldSyncImmediately) {
      // Sync immediately for important changes
      this.syncCartWithBackend(cart)
    } else {
      // Check if enough time has passed since last sync
      const timeSinceLastSync = Date.now() - this.lastSyncTime
      
      // Schedule debounced sync
      this.syncDebounceTimer = setTimeout(() => {
        // Only sync if minimum interval has passed
        if (timeSinceLastSync >= this.MIN_SYNC_INTERVAL) {
          this.syncCartWithBackend(cart)
        }
      }, this.SYNC_DEBOUNCE_DELAY)
    }
  }

  // Sync cart with backend
  private async syncCartWithBackend(cart: CartData): Promise<void> {
    try {
      // Prevent too frequent syncs
      const timeSinceLastSync = Date.now() - this.lastSyncTime
      if (timeSinceLastSync < 1000) { // Don't sync more than once per second
        return
      }

      this.lastSyncTime = Date.now()
      
      await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cart)
      })
    } catch (error) {
      console.error('Failed to sync cart with backend:', error)
    }
  }

  // Save cart state before leaving
  private saveCartState(): void {
    const cart = this.getCart()
    if (cart) {
      cart.lastActivityAt = new Date().toISOString()
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    }
  }

  // Calculate subtotal
  private calculateSubtotal(items: ICartItem[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  // Calculate tax (simplified - should be based on business settings)
  private calculateTax(subtotal: number, businessId: string): number {
    // This should fetch actual tax rate from business settings
    const taxRate = 0.0825 // 8.25% default
    return Math.round(subtotal * taxRate * 100) / 100
  }

  // Get traffic source
  private getSource(): string {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('utm_source') || urlParams.get('ref') || 'direct'
  }

  // Get device type
  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/mobile|android|iphone/.test(userAgent)) return 'mobile'
    if (/tablet|ipad/.test(userAgent)) return 'tablet'
    return 'desktop'
  }

  // Get cart count
  getCartCount(): number {
    const cart = this.getCart()
    return cart?.items.length || 0
  }

  // Check if cart has items
  hasItems(): boolean {
    return this.getCartCount() > 0
  }
}