'use client'

import { useState, useEffect } from 'react'
import { Building2, ChevronDown, Users, UserPlus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useBusinessContext } from '@/hooks/useBusinessContext'

interface Business {
  _id: string
  name: string
  role: string
  isPrimary?: boolean
  description?: string
}

export default function TeamSwitcher() {
  const { currentBusinessId, switchBusiness: switchBusinessContext, isLoading: switching, session } = useBusinessContext()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchUserBusinesses()
    }
  }, [session])

  const fetchUserBusinesses = async () => {
    try {
      const res = await fetch('/api/user/businesses')
      if (res.ok) {
        const data = await res.json()
        setBusinesses(data.businesses)
        
        // Set current business from session or currentBusinessId
        const current = data.businesses.find(
          (b: Business) => b._id === (currentBusinessId || (session?.user as any)?.businessId)
        )
        setCurrentBusiness(current || data.businesses[0])
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchBusiness = async (businessId: string) => {
    setIsOpen(false)
    
    const result = await switchBusinessContext(businessId)
    
    if (result.success) {
      toast.success(`Switched to ${result.data?.businessName || 'business'}`)
      // Refetch businesses to update the UI
      await fetchUserBusinesses()
    } else {
      toast.error(result.error || 'Failed to switch business')
    }
  }

  if (loading || !currentBusiness) {
    return null
  }

  // Only show switcher if user belongs to multiple businesses
  if (businesses.length <= 1) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Building2 className="h-4 w-4" />
        <span>{currentBusiness.name}</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {switching ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
        ) : (
          <Building2 className="h-4 w-4 text-gray-600" />
        )}
        <span className="text-sm font-medium">{currentBusiness.name}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="text-xs text-gray-500 px-3 py-2 uppercase tracking-wider">
                Your Teams
              </div>
              {businesses.map((business) => (
                <button
                  key={business._id}
                  onClick={() => {
                    if (business._id !== currentBusiness._id) {
                      switchBusiness(business._id)
                    }
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 flex items-center justify-between ${
                    business._id === currentBusiness._id ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div>{business.name}</div>
                      {business.isPrimary && (
                        <span className="text-xs text-gray-500">Primary</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{business.role.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-200 p-2">
              <Link
                href="/dashboard/team/invitations"
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 flex items-center space-x-2"
                onClick={() => setIsOpen(false)}
              >
                <UserPlus className="h-4 w-4" />
                <span>View Invitations</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}