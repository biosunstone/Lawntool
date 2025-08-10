'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import CartIcon from '@/components/cart/CartIcon'
import RecoveryBanner from '@/components/cart/RecoveryBanner'
import ExitIntentModal from '@/components/cart/ExitIntentModal'
import { User, LogOut, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'

export default function MainHeader() {
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <>
      {/* Recovery Banner */}
      <RecoveryBanner />
      
      {/* Exit Intent Modal */}
      <ExitIntentModal businessId={(session?.user as any)?.businessId} />
      
      {/* Main Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-green-600">Sunstone Digital</h1>
            </Link>
            
            {/* Right Side Navigation */}
            <div className="flex items-center gap-4">
              {/* Cart Icon */}
              <CartIcon />
              
              {/* User Menu */}
              {session ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">
                      {session.user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium">
                      {session.user?.name}
                    </span>
                  </button>
                  
                  {dropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                        <div className="py-1">
                          <div className="px-4 py-2 border-b">
                            <p className="text-sm font-medium">{session.user?.name}</p>
                            <p className="text-xs text-gray-500">{session.user?.email}</p>
                          </div>
                          
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </Link>
                          
                          <button
                            onClick={() => {
                              setDropdownOpen(false)
                              signOut({ callbackUrl: '/' })
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 w-full text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}