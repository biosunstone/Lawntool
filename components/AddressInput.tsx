'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin } from 'lucide-react'

declare global {
  interface Window {
    initPlaces?: () => void
    google?: any
  }
}

interface AddressInputProps {
  value: string
  onChange: (address: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function AddressInput({
  value,
  onChange,
  placeholder = "Enter your property address",
  required = false,
  className = ""
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeAutocomplete()
      return
    }

    // Check if API key exists
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key is not configured')
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', initializeAutocomplete)
      return
    }

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initPlaces`
    script.async = true
    script.defer = true
    
    // Set up global callback
    const initPlaces = () => {
      initializeAutocomplete()
    }
    
    // Add callback to window object
    if (typeof window !== 'undefined') {
      window.initPlaces = initPlaces
    }
    
    document.head.appendChild(script)

    return () => {
      if (autocompleteRef.current && window.google) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [])

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
      console.log('Google Maps not fully loaded yet')
      return
    }

    try {
      // Create autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['us', 'ca'] }, // Support both US and Canada
        fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
      })

      // Listen for place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place && place.formatted_address) {
          onChange(place.formatted_address)
        }
      })

      autocompleteRef.current = autocomplete
      setIsLoaded(true)
      console.log('Google Maps Autocomplete initialized successfully')
    } catch (error) {
      console.error('Error initializing autocomplete:', error)
      setIsLoaded(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
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
      {!isLoaded && (
        <div className="absolute right-3 top-3 text-xs text-gray-400">
          Loading suggestions...
        </div>
      )}
    </div>
  )
}