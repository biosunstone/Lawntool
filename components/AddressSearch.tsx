'use client'

import { useState } from 'react'
import { Search, MapPin } from 'lucide-react'

interface AddressSearchProps {
  onSearch: (address: string) => void
  placeholder?: string
  className?: string
}

export default function AddressSearch({ onSearch, placeholder = "Enter property address...", className = "" }: AddressSearchProps) {
  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) {
      setIsSearching(true)
      await onSearch(address)
      setIsSearching(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-12 pr-20 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isSearching}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          <button
            type="submit"
            disabled={isSearching || !address.trim()}
            className="bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Search className="h-5 w-5" />
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </form>
  )
}