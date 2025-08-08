'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import AddressSearchWithAutocomplete from './AddressSearchWithAutocomplete'
import { useState } from 'react'

export default function Hero() {
  const [showSearch, setShowSearch] = useState(false)

  const handleSearch = (address: string, coordinates?: { lat: number; lng: number }) => {
    // Scroll to measurement section
    const measureSection = document.getElementById('measure')
    if (measureSection) {
      measureSection.scrollIntoView({ behavior: 'smooth' })
      // Trigger search in measurement section
      const event = new CustomEvent('searchFromHero', { detail: { address, coordinates } })
      window.dispatchEvent(event)
    }
  }

  return (
    <section className="relative bg-gradient-to-b from-green-50 to-white pt-24 pb-16 lg:pt-32 lg:pb-24">
      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Measure Properties with
            <span className="block text-primary">AI-Powered Precision</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
            Instantly measure lawns, driveways, sidewalks, and buildings using satellite and aerial imagery. 
            Get accurate property measurements in 30-60 seconds.
          </p>

          {!showSearch ? (
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowSearch(true)}
                className="btn-primary px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                Try It Now
              </button>
              
              <button className="btn-secondary px-8 py-4 text-lg font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
                <Play className="h-5 w-5" />
                Watch Demo
              </button>
            </div>
          ) : (
            <div className="mt-10 max-w-2xl mx-auto">
              <AddressSearchWithAutocomplete 
                onSearch={handleSearch}
                placeholder="Enter property address to measure"
                className="shadow-xl"
              />
              <p className="mt-4 text-sm text-gray-500">
                Try it free • No credit card required • Instant results
              </p>
            </div>
          )}
          
          {!showSearch && (
            <div className="mt-10">
              <p className="text-sm text-gray-500">
                No credit card required • Free 14-day trial • Cancel anytime
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-16 flow-root sm:mt-24">
          <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
            <div className="relative aspect-video rounded-lg bg-gradient-to-br from-green-100 to-green-200 shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-24 w-24 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="h-10 w-10 text-primary ml-1" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-gray-700">Demo Video</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}