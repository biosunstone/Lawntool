/**
 * Check the status of the automatic cron job
 * Run: node test-cron-status.js
 */

const http = require('http')

async function checkCronStatus() {
  console.log('🔍 Checking Cron Job Status...\n')
  
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/cart/recovery/cron-status', (res) => {
      let rawData = ''
      
      res.on('data', (chunk) => {
        rawData += chunk
      })
      
      res.on('end', () => {
        try {
          const data = JSON.parse(rawData)
          
          if (data.status === 'active') {
            console.log('✅ Cron Job Status: ACTIVE')
            console.log('📅 Schedule:', data.schedule)
            console.log('⏰ Next Run:', new Date(data.nextRun).toLocaleString())
            console.log('\n📊 Statistics:')
            console.log('  Abandoned Carts:')
            console.log(`    • Total: ${data.statistics.abandoned.total}`)
            console.log(`    • Today: ${data.statistics.abandoned.today}`)
            console.log(`    • Pending Recovery: ${data.statistics.abandoned.pendingRecovery}`)
            console.log('  Recovery Emails:')
            console.log(`    • Total Sent: ${data.statistics.recovery.totalEmailsSent}`)
            console.log(`    • Sent Today: ${data.statistics.recovery.emailsSentToday}`)
            console.log(`    • Sent Last Hour: ${data.statistics.recovery.emailsSentLastHour}`)
            
            if (data.statistics.lastProcessed) {
              console.log(`\n⏱️  Last Processed: ${new Date(data.statistics.lastProcessed).toLocaleString()}`)
            }
            
            console.log('\n✅ The cron job is running automatically every 10 minutes!')
            console.log('📝 No manual setup required - it starts when the server starts.')
          } else {
            console.log('❌ Cron job is not active')
            console.log('Start your Next.js server to activate the cron job')
          }
          resolve()
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message)
          reject(error)
        }
      })
    }).on('error', (error) => {
      console.error('❌ Failed to check cron status:', error.message)
      console.log('\nMake sure your Next.js server is running:')
      console.log('  npm run dev')
      reject(error)
    })
  })
}

checkCronStatus().catch(console.error)