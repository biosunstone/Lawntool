/**
 * Mobile Navigation Component
 * Responsive navigation with hamburger menu and bottom navigation options
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  Home,
  LayoutDashboard,
  Map,
  FileText,
  User,
  ChevronRight,
  Settings,
  LogOut,
  ShoppingCart
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import CartIcon from '@/components/cart/CartIcon'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  roles?: string[]
}

interface MobileNavProps {
  navigation: NavItem[]
  className?: string
  variant?: 'hamburger' | 'bottom' | 'hybrid'
}

export default function MobileNav({ 
  navigation, 
  className = '',
  variant = 'hybrid' 
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || 'customer'

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  // Bottom navigation items (max 5 for mobile)
  const bottomNavItems = filteredNavigation.slice(0, 5)

  return (
    <>
      {/* Top Navigation Bar - Mobile Only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-mobile-nav bg-white border-b border-gray-200 safe-padding">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-gray-900">Sunstone</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Cart Icon */}
            <CartIcon />
            
            {/* Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg touch-manipulation tap-highlight-transparent hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-mobile-overlay"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-white z-mobile-nav shadow-xl safe-padding"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{session?.user?.name || 'Guest'}</p>
                    <p className="text-sm text-gray-500">{session?.user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation tap-highlight-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto smooth-scroll">
                <div className="px-4 py-2">
                  {filteredNavigation.map((item, index) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          flex items-center justify-between px-3 py-3 mb-1 rounded-lg
                          touch-manipulation tap-highlight-transparent
                          transition-all duration-200
                          ${isActive 
                            ? 'bg-primary-50 text-primary-600' 
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                      </Link>
                    )
                  })}
                </div>

                {/* Secondary Actions */}
                <div className="px-4 py-2 border-t border-gray-200 mt-4">
                  <Link
                    href="/settings"
                    className="flex items-center space-x-3 px-3 py-3 mb-1 rounded-lg text-gray-700 hover:bg-gray-50 touch-manipulation tap-highlight-transparent"
                  >
                    <Settings className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">Settings</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 touch-manipulation tap-highlight-transparent"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Mobile Only */}
      {(variant === 'bottom' || variant === 'hybrid') && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-mobile-nav safe-padding shadow-mobile-nav">
          <nav className="flex items-center justify-around h-16">
            {bottomNavItems.map((item, index) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center flex-1 h-full
                    touch-manipulation tap-highlight-transparent
                    transition-all duration-200 relative
                    ${isActive ? 'text-primary-600' : 'text-gray-400'}
                  `}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary-600"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                    {item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name}
                  </span>
                  
                  {/* Badge */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}