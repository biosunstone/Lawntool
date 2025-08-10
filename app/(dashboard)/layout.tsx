'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Map,
  FileText,
  Users,
  UserPlus,
  CreditCard,
  Settings,
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building,
  User,
  DollarSign,
  Code,
  MapPin,
  Clock,
  Zap,
  ShoppingCart,
} from 'lucide-react'
import TeamSwitcher from '@/components/TeamSwitcher'
import CartIcon from '@/components/cart/CartIcon'
import RecoveryBanner from '@/components/cart/RecoveryBanner'
import ExitIntentModal from '@/components/cart/ExitIntentModal'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Measurements', href: '/measurements', icon: Map },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Pricing Rules', href: '/pricing', icon: DollarSign, roles: ['admin', 'business_owner'] },
  { name: 'Widget', href: '/widget', icon: Code, roles: ['admin', 'business_owner'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team', href: '/team', icon: UserPlus, roles: ['admin', 'business_owner'] },
  { name: 'Billing', href: '/billing', icon: CreditCard, roles: ['admin', 'business_owner'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'business_owner'] },
]

// Admin-only navigation section
const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: Building },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Cart Recovery', href: '/dashboard/admin/cart-recovery', icon: ShoppingCart },
  { name: 'Tax Settings', href: '/admin/tax-settings', icon: DollarSign },
  { name: 'ZIP/Postal Code Pricing', href: '/admin/zipcode-pricing', icon: MapPin },
  { name: 'Geofencing & Zones', href: '/admin/pricing-management', icon: Clock },
  { name: 'Zapier Integration', href: '/admin/integrations', icon: Zap },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const userRole = (session?.user as any)?.role || 'customer'
  
  const filteredNavigation = navigation.filter(item => {
    // If no roles specified, everyone can see it
    if (!item.roles) return true
    // Check if user's role is in the allowed roles
    return item.roles.includes(userRole)
  })

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      {/* Recovery Banner */}
      <RecoveryBanner />
      
      {/* Exit Intent Modal */}
      <ExitIntentModal businessId={(session?.user as any)?.businessId} />
      
      <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h2 className="text-xl font-bold text-primary">Sunstone Digital</h2>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              ))}
              
              {/* Admin Section */}
              {userRole === 'admin' && (
                <>
                  <div className="pt-4 pb-2">
                    <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Administration
                    </p>
                  </div>
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        pathname.startsWith(item.href)
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h2 className="text-xl font-bold text-primary">Sunstone Digital</h2>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              
              {/* Admin Section */}
              {userRole === 'admin' && (
                <>
                  <div className="pt-4 pb-2">
                    <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Administration
                    </p>
                  </div>
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        pathname.startsWith(item.href)
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white shadow">
          <button
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {filteredNavigation.find(item => item.href === pathname)?.name || 
                   adminNavigation.find(item => pathname.startsWith(item.href))?.name || 
                   'Dashboard'}
                </h1>
              </div>
              
              {/* User menu */}
              <div className="flex items-center space-x-4">
                {/* Cart Icon */}
                <CartIcon />
                
                {/* Team Switcher */}
                <TeamSwitcher />
                
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                      {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="ml-3 text-gray-700">{session?.user?.name}</span>
                    <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 border-b">
                          <div className="font-medium">{session?.user?.name}</div>
                          <div className="text-xs text-gray-500">{session?.user?.email}</div>
                        </div>
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <User className="mr-3 h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Building className="mr-3 h-4 w-4" />
                          Business Settings
                        </Link>
                        <button
                          onClick={() => signOut({ callbackUrl: process.env.NEXT_PUBLIC_APP_URL })}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Sign out000
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  )
}