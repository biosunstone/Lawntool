'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { switchBusinessAction } from '@/app/actions/business'

export function useBusinessContext() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (session?.user) {
      setCurrentBusinessId((session.user as any).businessId)
    }
  }, [session])

  const switchBusiness = async (businessId: string): Promise<any> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          // Call server action
          const result = await switchBusinessAction(businessId)
          
          if (result.success) {
            // Update local state
            setCurrentBusinessId(businessId)
            
            // Force session refresh
            await update()
            
            // Refresh the router
            router.refresh()
            
            resolve({ success: true, data: result })
          } else {
            resolve({ success: false, error: result.error })
          }
        } catch (error) {
          console.error('Error switching business:', error)
          resolve({ success: false, error: 'Failed to switch business' })
        }
      })
    })
  }

  return {
    currentBusinessId,
    switchBusiness,
    isLoading: isPending,
    session
  }
}