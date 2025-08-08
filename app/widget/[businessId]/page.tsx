'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamically import the appropriate widget version
const EnhancedWidget = dynamic(() => import('./enhanced-page'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
})

const BasicWidget = dynamic(() => import('./basic-widget'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
})

export default function WidgetPage() {
  const params = useParams()
  const businessId = params.businessId as string
  const [useEnhanced, setUseEnhanced] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkWidgetVersion()
  }, [businessId])

  const checkWidgetVersion = async () => {
    try {
      const response = await fetch(`/api/widget/config?businessId=${businessId}`)
      if (!response.ok) throw new Error('Failed to load configuration')
      
      const data = await response.json()
      
      // Check if enhanced features are enabled
      const enhanced = data.settings?.allowServiceCustomization || 
                       data.settings?.showPriceBreakdown || 
                       false
      
      setUseEnhanced(enhanced)
    } catch (error) {
      console.error('Error loading widget config:', error)
      setUseEnhanced(false) // Default to basic on error
    } finally {
      setLoading(false)
    }
  }

  if (loading || useEnhanced === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Render the appropriate widget version
  if (useEnhanced) {
    return <EnhancedWidget />
  }
  
  return <BasicWidget />
}