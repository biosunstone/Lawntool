'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, MapPin } from 'lucide-react'
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api'

interface AddressSearchWithAutocompleteProps {
  onSearch: (address: string, coordinates?: { lat: number; lng: number }) => void
  placeholder?: string
  className?: string
}

const libraries: ("places" | "drawing" | "geometry")[] = ["places", "drawing", "geometry"]

export default function AddressSearchWithAutocomplete({ 
  onSearch, 
  placeholder = "Enter property address...", 
  className = "" 
}: AddressSearchWithAutocompleteProps) {
  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | undefined>()
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries
  })

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
    // Restrict to addresses in USA and Canada
    autocomplete.setComponentRestrictions({ country: ['us', 'ca'] })
    // Set types to address for better results
    autocomplete.setTypes(['address'])
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      if (place.formatted_address) {
        setAddress(place.formatted_address)
        
        // Get coordinates if available
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          setSelectedCoordinates({ lat, lng })
        }
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) {
      setIsSearching(true)
      await onSearch(address, selectedCoordinates)
      setIsSearching(false)
      // Don't clear the address after search to allow consecutive searches
    }
  }
  
  if (loadError) {
    console.error('Error loading Google Maps:', loadError)
    return <div>Error loading maps</div>
  }
  
  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            fields: ['formatted_address', 'geometry'],
            types: ['address']
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
              // Clear coordinates when manually typing
              setSelectedCoordinates(undefined)
            }}
            placeholder={placeholder}
            className="block w-full pl-12 pr-32 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSearching}
          />
        </Autocomplete>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
          {address && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setAddress('')
                setSelectedCoordinates(undefined)
                // Focus back on input for easy new search
                inputRef.current?.focus()
              }}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 transition-colors"
              title="Clear address"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching || !address.trim()}
            className="bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Search className="h-5 w-5" />
            {isSearching ? 'Analyzing...' : 'Measure'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Start typing an address and select from the suggestions
      </p>
    </form>
  )
}