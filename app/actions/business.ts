'use server'

import { revalidatePath } from 'next/cache'
import connectDB from '@/lib/saas/db'
import User from '@/models/User'
import Business from '@/models/Business'
import BusinessMembership from '@/models/BusinessMembership'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/saas/auth'

export async function switchBusinessAction(businessId: string) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    // Find user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Check if user has a membership for this business
    const membership = await BusinessMembership.findOne({
      userId: user._id,
      businessId: businessId,
      status: 'active'
    })

    if (!membership) {
      // Check if user is a member through legacy system
      const business = await Business.findById(businessId)
      
      if (!business) {
        return { success: false, error: 'Business not found' }
      }

      const isMember = business.teamMembers.some(
        (memberId:any) => memberId.toString() === user._id.toString()
      )

      if (!isMember) {
        return { success: false, error: 'You are not a member of this business' }
      }

      // Create membership for backward compatibility
      const role = business.ownerId?.toString() === user._id.toString() ? 'business_owner' : 'staff'
      await BusinessMembership.create({
        userId: user._id,
        businessId: businessId,
        role: role,
        isPrimary: false,
        status: 'active'
      })

      // Update user's current business and role
      user.businessId = businessId
      user.role = role
      await user.save()

      // Revalidate all paths to ensure UI updates
      revalidatePath('/', 'layout')

      return {
        success: true,
        businessId: businessId,
        businessName: business.name,
        role: role
      }
    }

    // Get the business details
    const business = await Business.findById(businessId)
    
    // Update user's current business and role from membership
    user.businessId = businessId
    user.role = membership.role
    await user.save()

    // Update primary flag if needed
    await BusinessMembership.updateMany(
      { userId: user._id },
      { isPrimary: false }
    )
    membership.isPrimary = true
    await membership.save()

    // Revalidate all paths to ensure UI updates
    revalidatePath('/', 'layout')

    return {
      success: true,
      businessId: businessId,
      businessName: business?.name,
      role: membership.role
    }
  } catch (error) {
    console.error('Error switching business:', error)
    return { success: false, error: 'Failed to switch business' }
  }
}