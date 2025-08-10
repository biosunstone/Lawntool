/**
 * Responsive Layout Component
 * Main layout wrapper with responsive navigation and content areas
 */

'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import MobileNav from './MobileNav'
import { useIsMobile, useStickyHeader } from '@/hooks/useResponsive'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, Menu } from 'lucide-react'

interface ResponsiveLayoutProps {
  children: ReactNode
  navigation: any[]
  showBackButton?: boolean
  pageTitle?: string
  headerActions?: ReactNode
  bottomNav?: boolean
  sidebarContent?: ReactNode
  className?: string
}

export default function ResponsiveLayout({
  children,
  navigation,
  showBackButton = false,
  pageTitle,
  headerActions,
  bottomNav = true,
  sidebarContent,
  className = ''
}: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()
  const { isSticky, isVisible } = useStickyHeader(50)
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobile, sidebarOpen])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav
          navigation={navigation}
          variant={bottomNav ? 'hybrid' : 'hamburger'}
        />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <>
          {/* Backdrop */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <aside
            className={`
              fixed top-0 left-0 bottom-0 z-40
              w-64 bg-white border-r border-gray-200
              transform transition-transform duration-300
              lg:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            {/* Sidebar Header */}
            <div className="h-16 border-b border-gray-200 flex items-center px-6">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <span className="font-semibold text-gray-900">Sunstone</span>
              </Link>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center px-3 py-2 rounded-lg
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-primary-50 text-primary-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Sidebar Footer/Custom Content */}
            {sidebarContent && (
              <div className="p-4 border-t border-gray-200">
                {sidebarContent}
              </div>
            )}
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className={`${!isMobile ? 'lg:pl-64' : ''}`}>
        {/* Page Header */}
        {(pageTitle || headerActions || (!isMobile && !isSticky)) && (
          <motion.header
            animate={{ 
              y: isVisible ? 0 : -100,
              opacity: isVisible ? 1 : 0
            }}
            transition={{ duration: 0.2 }}
            className={`
              ${isMobile ? 'fixed top-14 left-0 right-0 z-30' : 'sticky top-0 z-30'}
              bg-white border-b border-gray-200
              ${isSticky ? 'shadow-sm' : ''}
            `}
          >
            <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Toggle */}
                {!isMobile && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}

                {/* Back Button */}
                {showBackButton && (
                  <button
                    onClick={() => window.history.back()}
                    className="p-2 rounded-lg hover:bg-gray-100 flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                )}

                {/* Page Title */}
                {pageTitle && (
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    {pageTitle}
                  </h1>
                )}
              </div>

              {/* Header Actions */}
              {headerActions && (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {headerActions}
                </div>
              )}
            </div>
          </motion.header>
        )}

        {/* Main Content */}
        <main 
          className={`
            ${className}
            ${isMobile ? 'pt-14' : ''}
            ${isMobile && pageTitle ? 'pt-[7.5rem]' : ''}
            ${isMobile && bottomNav ? 'pb-20' : 'pb-6'}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

// Container component for consistent padding and max-width
interface ContainerProps {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
}

export function Container({
  children,
  size = 'xl',
  padding = 'md',
  className = ''
}: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    sm: 'px-4 sm:px-6 py-4',
    md: 'px-4 sm:px-6 lg:px-8 py-6',
    lg: 'px-4 sm:px-6 lg:px-8 py-8 lg:py-12'
  }

  return (
    <div className={`
      ${sizeClasses[size]}
      ${paddingClasses[padding]}
      mx-auto
      ${className}
    `}>
      {children}
    </div>
  )
}

// Grid layout component
interface GridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'sm' | 'md' | 'lg'
  responsive?: boolean
  className?: string
}

export function Grid({
  children,
  columns = 3,
  gap = 'md',
  responsive = true,
  className = ''
}: GridProps) {
  const columnClasses = responsive ? {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
  } : {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  }

  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  }

  return (
    <div className={`
      grid
      ${columnClasses[columns]}
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  )
}

// Stack layout component (vertical spacing)
interface StackProps {
  children: ReactNode
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  divider?: boolean
  className?: string
}

export function Stack({
  children,
  spacing = 'md',
  divider = false,
  className = ''
}: StackProps) {
  const spacingClasses = {
    xs: 'space-y-1',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8'
  }

  return (
    <div className={`
      ${spacingClasses[spacing]}
      ${divider ? 'divide-y divide-gray-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}