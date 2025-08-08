'use client'

export const dynamic = 'force-dynamic'

import SimpleMap from '@/components/SimpleMap'

export default function DirectMapTest() {
  const testCenter = { lat: 43.6532, lng: -79.3832 } // Toronto coordinates
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Direct Map Test</h1>
      <p className="mb-4">Testing SimpleMap component directly with Toronto coordinates</p>
      <SimpleMap center={testCenter} address="Toronto, ON, Canada" />
    </div>
  )
}