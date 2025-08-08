'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, RefreshCw } from 'lucide-react'

export default function TestSwitchPage() {
  const { data: session, update } = useSession()
  const [businesses, setBusinesses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentBusiness, setCurrentBusiness] = useState<any>(null)

  useEffect(() => {
    fetchBusinesses()
  }, [session])

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/user/businesses')
      if (res.ok) {
        const data = await res.json()
        setBusinesses(data.businesses)
        const current = data.businesses.find((b: any) => b.isCurrent)
        setCurrentBusiness(current)
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    }
  }

  const handleSwitch = async (businessId: string) => {
    setLoading(true)
    
    try {
      const res = await fetch('/api/user/switch-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })

      if (res.ok) {
        const data = await res.json()
        console.log('Switch response:', data)
        
        // Force session update
        await update()
        
        // Refetch businesses
        await fetchBusinesses()
        
        // Reload the page to ensure everything updates
        window.location.reload()
      } else {
        const error = await res.json()
        console.error('Switch error:', error)
      }
    } catch (error) {
      console.error('Error switching business:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Business Switching</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Session</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">User ID:</span> {(session?.user as any)?.id}
          </div>
          <div>
            <span className="font-medium">Email:</span> {session?.user?.email}
          </div>
          <div>
            <span className="font-medium">Current Business ID:</span> {(session?.user as any)?.businessId || 'None'}
          </div>
          <div>
            <span className="font-medium">Current Role:</span> {(session?.user as any)?.role || 'None'}
          </div>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="mt-4 flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh Page</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Available Businesses</h2>
        
        {businesses.length === 0 ? (
          <p className="text-gray-500">No businesses found</p>
        ) : (
          <div className="space-y-3">
            {businesses.map((business) => (
              <div
                key={business._id}
                className={`p-4 border rounded-lg ${
                  business.isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium">{business.name}</div>
                      <div className="text-sm text-gray-500">
                        Role: {business.role} | ID: {business._id}
                      </div>
                      {business.isPrimary && (
                        <span className="text-xs text-blue-600">Primary Business</span>
                      )}
                    </div>
                  </div>
                  
                  {!business.isCurrent && (
                    <button
                      onClick={() => handleSwitch(business._id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Switching...' : 'Switch'}
                    </button>
                  )}
                  
                  {business.isCurrent && (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded">
                      Current
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}