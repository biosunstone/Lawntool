'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { useLoadScript, Autocomplete } from '@react-google-maps/api'

const libraries: ("places")[] = ['places']

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, placeDetails?: google.maps.places.PlaceResult) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter your address",
  required = false,
  className = ""
}: AddressAutocompleteProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    region: 'ca'
  })

  const onLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance)
    
    // Configure autocomplete options
    autocompleteInstance.setOptions({
      componentRestrictions: { country: ['ca'] },
      fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
      types: ['address']
    })
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace()
      
      if (place.formatted_address) {
        onChange(place.formatted_address, place)
      }
    }
  }, [autocomplete, onChange])

  // Fallback for manual input without selecting from dropdown
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  if (loadError) {
    console.error('Error loading Google Maps:', loadError)
    // Fallback to regular input if Google Maps fails to load
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
    return (
      <div className="relative">
        <div className="absolute left-3 top-3">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
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
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: ['ca'] },
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
        types: ['address']
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