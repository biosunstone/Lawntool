'use client'

import MeasurementSection from '@/components/MeasurementSection'
import MainHeader from '@/components/MainHeader'

export default function Home() {
  return (
    <>
      <MainHeader />
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Sunstone Digital Tech</h1>
            <p className="text-xl text-gray-600">AI-Powered Property Measurement Software</p>
          </div>
          
          <MeasurementSection />
        </div>
      </main>
    </>
  )
}