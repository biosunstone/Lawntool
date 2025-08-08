import type { Metadata } from 'next'
import { Providers } from '@/components/saas/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sunstone Digital Tech - AI-Powered Property Measurement Software',
  description: 'Measure lawns, driveways, sidewalks, and buildings remotely with AI-powered software. Get instant property measurements in 30-60 seconds.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}