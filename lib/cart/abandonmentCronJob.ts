import AbandonedCart from '@/models/AbandonedCart'
import CartRecoveryLog from '@/models/CartRecoveryLog'
import Cart from '@/models/Cart'
import User from '@/models/User'  // Import User model to register schema
import Business from '@/models/Business'  // Import Business model to register schema
import connectDB from '@/lib/saas/db'
import { sendRecoveryEmail } from './recoveryEmailService'
import { sendRecoverySMS } from './recoverySMSService'
import { generateAbandonmentDiscountCode } from './discountCodeGenerator'

interface CronJobResult {
  processed: number
  emailsSent: number
  smsSent: number
  errors: string[]
}

/**
 * Get abandonment threshold from environment or default
 */
function getAbandonmentThreshold(): number {
  const threshold = process.env.ABANDONMENT_THRESHOLD_MINUTES
  return threshold ? parseInt(threshold) : 15
}

/**
 * Main cron job function to detect and process abandoned carts
 * Should be run every 10 minutes
 */
export async function processAbandonedCarts(minutesAgo?: number): Promise<CronJobResult> {
  // Use configurable threshold or provided value
  const threshold = minutesAgo || getAbandonmentThreshold()
  const result: CronJobResult = {
    processed: 0,
    emailsSent: 0,
    smsSent: 0,
    errors: []
  }
  
  try {
    await connectDB()
    
    // Step 1: Find active carts that should be marked as abandoned
    const cutoffTime = new Date(Date.now() - threshold * 60 * 1000)
    
    const activeCarts = await Cart.find({
      status: 'active',
      lastActivityAt: { $lte: cutoffTime },
      items: { $exists: true, $ne: [] }
    })
    
    console.log(`Found ${activeCarts.length} carts to process for abandonment`)
    
    // Step 2: Convert active carts to abandoned carts
    for (const cart of activeCarts) {
      try {
        // Check if abandoned cart already exists
        const existingAbandoned = await AbandonedCart.findOne({
          session_id: cart.sessionId,
          recovery_completed: false
        })
        
        if (!existingAbandoned) {
          // Create abandoned cart record
          const abandonedCart = await AbandonedCart.create({
            user_id: cart.userId,
            session_id: cart.sessionId,
            business_id: cart.businessId,
            cart_data: cart.items,
            customer_email: cart.metadata?.customerEmail,
            customer_name: cart.metadata?.customerName,
            customer_phone: cart.metadata?.customerPhone,
            property_address: cart.propertyAddress,
            property_size: cart.propertySize,
            measurement_id: cart.measurementId,
            cart_value: cart.total,
            abandoned_at: new Date(),
            recovery_completed: false
          })
          
          // Update original cart status
          cart.status = 'abandoned'
          cart.abandonedAt = new Date()
          await cart.save()
          
          result.processed++
          
          console.log(`Created abandoned cart ${abandonedCart._id} for session ${cart.sessionId}`)
        }
      } catch (error) {
        console.error(`Error processing cart ${cart._id}:`, error)
        result.errors.push(`Cart ${cart._id}: ${(error as any).message}`)
      }
    }
    
    // Step 3: Find abandoned carts that need recovery emails
    const cartsForRecovery = await AbandonedCart.find({
      recovery_completed: false,
      abandoned_at: {
        $gte: new Date(Date.now() - threshold * 60 * 1000),
        $lte: new Date(Date.now() - 5 * 60 * 1000) // At least 5 minutes old
      }
    })
    
    console.log(`Found ${cartsForRecovery.length} abandoned carts for recovery`)
    
    // Step 4: Send recovery emails/SMS
    for (const abandonedCart of cartsForRecovery) {
      try {
        // Fetch user and business data if available
        let user = null
        let business = null
        
        if (abandonedCart.user_id) {
          try {
            user = await User.findById(abandonedCart.user_id).select('name email phone')
          } catch (err) {
            console.log('User not found:', abandonedCart.user_id)
          }
        }
        
        if (abandonedCart.business_id) {
          try {
            business = await Business.findById(abandonedCart.business_id).select('name email')
          } catch (err) {
            console.log('Business not found:', abandonedCart.business_id)
          }
        }
        
        // Determine contact method and value
        let contactEmail = user?.email
        let contactPhone = user?.phone
        let contactName = user?.name || 'Valued Customer'
        
        // For guest users, check metadata for contact info
        if (!user && abandonedCart.metadata) {
          // Check for guest email in metadata
          if (abandonedCart.metadata.guest_email) {
            contactEmail = abandonedCart.metadata.guest_email
            contactName = abandonedCart.metadata.guest_name || 'Valued Customer'
            contactPhone = abandonedCart.metadata.guest_phone
            console.log(`Using guest email ${contactEmail} for cart ${abandonedCart._id}`)
          } else {
            console.log(`Skipping guest cart ${abandonedCart._id} - no contact info`)
            continue
          }
        }
        
        // Skip if still no email
        if (!contactEmail) {
          console.log(`Skipping cart ${abandonedCart._id} - no email address`)
          continue
        }
        
        // Generate recovery URL with token
        const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cart/recover?token=${abandonedCart.recovery_token}`
        
        // Calculate cart total
        const cartTotal = abandonedCart.cart_data.reduce((sum: number, item: any) => sum + item.price, 0)
        
        // Check if first-time customer (no previous completed orders)
        const isFirstTime = user ? false : true // Simplified - in production, check order history
        
        // Generate dynamic discount code based on cart value
        const discountData = generateAbandonmentDiscountCode(
          contactEmail,
          cartTotal,
          isFirstTime
        )
        
        abandonedCart.recovery_discount_code = discountData.code
        abandonedCart.recovery_discount_expires = discountData.expiresAt
        
        // Send email if available
        if (contactEmail) {
          try {
            const emailResult = await sendRecoveryEmail({
              to: contactEmail,
              name: contactName,
              cartData: abandonedCart.cart_data,
              recoveryUrl,
              discountCode: discountData.code,
              discountExpires: discountData.expiresAt,
              businessName: business?.name || 'Sunstone Digital',
              propertyAddress: abandonedCart.property_address
            })
            
            // Log email recovery
            const recoveryLog = new CartRecoveryLog({
              abandoned_cart_id: abandonedCart._id,
              business_id: abandonedCart.business_id,
              user_id: abandonedCart.user_id,
              contact_type: 'email',
              contact_value: contactEmail,
              recovery_url: recoveryUrl,
              discount_code: discountData.code,
              discount_amount: discountData.discountPercentage,
              template_used: 'default_recovery',
              email_subject: emailResult.subject,
              delivery_status: emailResult.success ? 'sent' : 'failed',
              delivery_error: emailResult.error,
              metadata: {
                campaign_id: 'auto_recovery',
                send_attempt: 1,
                provider: 'nodemailer',
                message_id: emailResult.messageId
              }
            })
            
            await recoveryLog.save()
            
            if (emailResult.success) {
              result.emailsSent++
            }
          } catch (emailError) {
            console.error(`Failed to send email for cart ${abandonedCart._id}:`, emailError)
            result.errors.push(`Email for cart ${abandonedCart._id}: ${(emailError as any).message}`)
          }
        }
        
        // Send SMS if available and enabled
        if (contactPhone && process.env.TWILIO_ENABLED === 'true') {
          try {
            const smsResult = await sendRecoverySMS({
              to: contactPhone,
              name: contactName,
              recoveryUrl,
              discountCode: discountData.code,
              businessName: business?.name || 'Sunstone Digital'
            })
            
            // Log SMS recovery
            const smsLog = new CartRecoveryLog({
              abandoned_cart_id: abandonedCart._id,
              business_id: abandonedCart.business_id,
              user_id: abandonedCart.user_id,
              contact_type: 'sms',
              contact_value: contactPhone,
              recovery_url: recoveryUrl,
              discount_code: discountData.code,
              discount_amount: discountData.discountPercentage,
              sms_content: smsResult.message,
              delivery_status: smsResult.success ? 'sent' : 'failed',
              delivery_error: smsResult.error,
              metadata: {
                campaign_id: 'auto_recovery',
                send_attempt: 1,
                provider: 'twilio',
                message_id: smsResult.messageId
              }
            })
            
            await smsLog.save()
            
            if (smsResult.success) {
              result.smsSent++
            }
          } catch (smsError) {
            console.error(`Failed to send SMS for cart ${abandonedCart._id}:`, smsError)
            result.errors.push(`SMS for cart ${abandonedCart._id}: ${(smsError as any).message}`)
          }
        }
        
        // Mark cart as reminder sent
        abandonedCart.markReminderSent()
        await abandonedCart.save()
        
      } catch (error:any) {
        console.error(`Error sending recovery for cart ${abandonedCart._id}:`, error)
        result.errors.push(`Recovery for cart ${abandonedCart._id}: ${error.message}`)
      }
    }
    
    // Step 5: Clean up old expired carts (optional)
    const expirationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days old
    
    await Cart.updateMany(
      {
        status: 'abandoned',
        abandonedAt: { $lt: expirationDate }
      },
      {
        $set: { status: 'expired' }
      }
    )
    
    console.log('Abandoned cart processing completed:', result)
    
    return result
    
  } catch (error:any) {
    console.error('Critical error in abandoned cart cron job:', error)
    result.errors.push(`Critical: ${error.message}`)
    return result
  }
}

/**
 * Function to be called by external cron scheduler
 * Can be called by node-cron, bull queue, or external service
 */
export async function runAbandonmentCronJob() {
  console.log(`[${new Date().toISOString()}] Starting abandoned cart cron job`)
  
  const result = await processAbandonedCarts(15) // Process carts abandoned 15+ minutes ago
  
  // Log results
  console.log(`[${new Date().toISOString()}] Cron job completed:`, {
    processed: result.processed,
    emailsSent: result.emailsSent,
    smsSent: result.smsSent,
    errorCount: result.errors.length
  })
  
  // Could send admin notification if there were errors
  if (result.errors.length > 0) {
    console.error('Errors during processing:', result.errors)
    // TODO: Send admin alert email
  }
  
  return result
}