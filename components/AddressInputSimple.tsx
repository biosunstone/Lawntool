'use client'

import { useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { useLoadScript, Autocomplete } from '@react-google-maps/api'

const libraries: ("places")[] = ['places']

interface AddressInputSimpleProps {
  value: string
  onChange: (address: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function AddressInputSimple({
  value,
  onChange,
  placeholder = "Start typing your address...",
  required = false,
  className = ""
}: AddressInputSimpleProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  const handlePlaceChanged = (autocomplete: google.maps.places.Autocomplete) => {
    const place = autocomplete.getPlace()
    if (place && place.formatted_address) {
      onChange(place.formatted_address)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  if (loadError) {
    // Fallback to regular input if Google Maps fails
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${className}`}
        />
      </div>
    )
  }

  if (!isLoaded) {
    // Loading state
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          disabled
          placeholder="Loading address search..."
          className={`w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 ${className}`}
        />
      </div>
    )
  }

  return (
    <Autocomplete
      onLoad={(autocomplete) => {
        // Configure autocomplete on load
        autocomplete.setOptions({
          componentRestrictions: { country: ['us', 'ca'] },
          fields: ['formatted_address', 'geometry', 'place_id'],
          types: ['address']
        })
      }}
      onPlaceChanged={function(this: google.maps.places.Autocomplete) {
        handlePlaceChanged(this)
      }}
    >
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${className}`}
        />
      </div>
    </Autocomplete>
  )
}