'use client'

import { useState } from 'react'
import { 
  Square, 
  Circle, 
  Triangle, 
  Hexagon, 
  Home, 
  Building, 
  Trees, 
  MapPin,
  Plus,
  Check
} from 'lucide-react'

interface PolygonTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  coordinates: Array<{lat: number, lng: number}>
  category: 'basic' | 'property' | 'landscape'
  estimatedArea?: number // square feet
  color: string
}

interface PolygonTemplatesProps {
  onSelectTemplate: (template: PolygonTemplate) => void
  centerLat?: number
  centerLng?: number
  isVisible?: boolean
  onClose?: () => void
}

const generatePolygonCoordinates = (
  centerLat: number, 
  centerLng: number, 
  shape: string, 
  sizeMultiplier: number = 1
): Array<{lat: number, lng: number}> => {
  const baseOffset = 0.0001 * sizeMultiplier // Roughly 30-40 feet per 0.0001 degrees
  
  switch (shape) {
    case 'rectangle':
      return [
        { lat: centerLat - baseOffset, lng: centerLng - baseOffset * 1.5 },
        { lat: centerLat + baseOffset, lng: centerLng - baseOffset * 1.5 },
        { lat: centerLat + baseOffset, lng: centerLng + baseOffset * 1.5 },
        { lat: centerLat - baseOffset, lng: centerLng + baseOffset * 1.5 },
        { lat: centerLat - baseOffset, lng: centerLng - baseOffset * 1.5 }
      ]
    
    case 'square':
      return [
        { lat: centerLat - baseOffset, lng: centerLng - baseOffset },
        { lat: centerLat + baseOffset, lng: centerLng - baseOffset },
        { lat: centerLat + baseOffset, lng: centerLng + baseOffset },
        { lat: centerLat - baseOffset, lng: centerLng + baseOffset },
        { lat: centerLat - baseOffset, lng: centerLng - baseOffset }
      ]
    
    case 'circle':
      const points = 16
      const coords = []
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI
        coords.push({
          lat: centerLat + baseOffset * Math.cos(angle),
          lng: centerLng + baseOffset * Math.sin(angle)
        })
      }
      coords.push(coords[0]) // Close the circle
      return coords
    
    case 'triangle':
      return [
        { lat: centerLat + baseOffset, lng: centerLng },
        { lat: centerLat - baseOffset, lng: centerLng - baseOffset },
        { lat: centerLat - baseOffset, lng: centerLng + baseOffset },
        { lat: centerLat + baseOffset, lng: centerLng }
      ]
    
    case 'hexagon':
      const hexCoords = []
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * 2 * Math.PI
        hexCoords.push({
          lat: centerLat + baseOffset * Math.cos(angle),
          lng: centerLng + baseOffset * Math.sin(angle)
        })
      }
      hexCoords.push(hexCoords[0]) // Close the hexagon
      return hexCoords
    
    case 'L-shape':
      return [
        { lat: centerLat - baseOffset, lng: centerLng - baseOffset },
        { lat: centerLat + baseOffset * 0.3, lng: centerLng - baseOffset },
        { lat: centerLat + baseOffset * 0.3, lng: centerLng - baseOffset * 0.3 },
        { lat: centerLat + baseOffset, lng: centerLng - baseOffset * 0.3 },
        { lat: centerLat + baseOffset, lng: centerLng + baseOffset },
        { lat: centerLat - baseOffset, lng: centerLng + baseOffset },
        { lat: centerLat - baseOffset, lng: centerLng - baseOffset }
      ]
    
    case 'house':
      return [
        { lat: centerLat - baseOffset * 0.8, lng: centerLng - baseOffset },
        { lat: centerLat - baseOffset * 0.8, lng: centerLng + baseOffset },
        { lat: centerLat + baseOffset * 0.5, lng: centerLng + baseOffset },
        { lat: centerLat + baseOffset * 0.5, lng: centerLng + baseOffset * 0.3 },
        { lat: centerLat + baseOffset, lng: centerLng },
        { lat: centerLat + baseOffset * 0.5, lng: centerLng - baseOffset * 0.3 },
        { lat: centerLat + baseOffset * 0.5, lng: centerLng - baseOffset },
        { lat: centerLat - baseOffset * 0.8, lng: centerLng - baseOffset }
      ]
    
    default:
      return []
  }
}

export default function PolygonTemplates({ 
  onSelectTemplate, 
  centerLat = 40.7128, 
  centerLng = -74.0060,
  isVisible = true,
  onClose 
}: PolygonTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const getTemplates = (): PolygonTemplate[] => [
    // Basic Shapes
    {
      id: 'rectangle',
      name: 'Rectangle',
      description: 'Standard rectangular area',
      icon: <Square className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'rectangle'),
      category: 'basic',
      estimatedArea: 2400,
      color: '#22c55e'
    },
    {
      id: 'square',
      name: 'Square',
      description: 'Perfect square area',
      icon: <Square className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'square'),
      category: 'basic',
      estimatedArea: 1600,
      color: '#3b82f6'
    },
    {
      id: 'circle',
      name: 'Circle',
      description: 'Circular treatment area',
      icon: <Circle className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'circle'),
      category: 'basic',
      estimatedArea: 1963,
      color: '#ef4444'
    },
    {
      id: 'triangle',
      name: 'Triangle',
      description: 'Triangular area',
      icon: <Triangle className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'triangle'),
      category: 'basic',
      estimatedArea: 800,
      color: '#f59e0b'
    },
    {
      id: 'hexagon',
      name: 'Hexagon',
      description: 'Six-sided treatment area',
      icon: <Hexagon className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'hexagon'),
      category: 'basic',
      estimatedArea: 2078,
      color: '#8b5cf6'
    },
    
    // Property Shapes
    {
      id: 'house-perimeter',
      name: 'House Perimeter',
      description: 'Typical house foundation perimeter',
      icon: <Home className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'house'),
      category: 'property',
      estimatedArea: 2800,
      color: '#06b6d4'
    },
    {
      id: 'L-shaped-lot',
      name: 'L-Shaped Lot',
      description: 'Common L-shaped property layout',
      icon: <Building className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'L-shape'),
      category: 'property',
      estimatedArea: 3200,
      color: '#ec4899'
    },
    {
      id: 'backyard-rectangle',
      name: 'Backyard Area',
      description: 'Standard backyard rectangular area',
      icon: <Trees className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'rectangle', 1.5),
      category: 'landscape',
      estimatedArea: 3600,
      color: '#10b981'
    },
    {
      id: 'front-yard',
      name: 'Front Yard',
      description: 'Typical front yard area',
      icon: <MapPin className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'rectangle', 0.8),
      category: 'landscape',
      estimatedArea: 1200,
      color: '#f97316'
    },
    {
      id: 'garden-circle',
      name: 'Garden Area',
      description: 'Circular garden or landscaped area',
      icon: <Trees className="w-5 h-5" />,
      coordinates: generatePolygonCoordinates(centerLat, centerLng, 'circle', 0.7),
      category: 'landscape',
      estimatedArea: 962,
      color: '#84cc16'
    }
  ]

  const templates = getTemplates()
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  const categories = [
    { id: 'all', name: 'All Templates', count: templates.length },
    { id: 'basic', name: 'Basic Shapes', count: templates.filter(t => t.category === 'basic').length },
    { id: 'property', name: 'Property', count: templates.filter(t => t.category === 'property').length },
    { id: 'landscape', name: 'Landscape', count: templates.filter(t => t.category === 'landscape').length }
  ]

  const handleTemplateSelect = (template: PolygonTemplate) => {
    setSelectedTemplate(template.id)
    onSelectTemplate(template)
    
    // Auto-close after selection (optional)
    setTimeout(() => {
      setSelectedTemplate(null)
      onClose?.()
    }, 1500)
  }

  if (!isVisible) return null

  return (
    <div className="bg-white rounded-lg shadow-lg border p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Polygon Templates</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Choose from pre-built polygon shapes to quickly start measuring your property.
      </p>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex-1 ${
              selectedCategory === category.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {category.name} ({category.count})
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className={`relative p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
              selectedTemplate === template.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Selection Indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2">
                <Check className="w-4 h-4 text-green-600" />
              </div>
            )}
            
            {/* Template Icon */}
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: `${template.color}20` }}
            >
              <div style={{ color: template.color }}>
                {template.icon}
              </div>
            </div>
            
            {/* Template Info */}
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">
                {template.name}
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                {template.description}
              </p>
              {template.estimatedArea && (
                <div className="text-xs text-gray-500">
                  ~{template.estimatedArea.toLocaleString()} sq ft
                </div>
              )}
            </div>
            
            {/* Color Indicator */}
            <div 
              className="absolute bottom-2 right-2 w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: template.color }}
            />
          </button>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Plus className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No templates found in this category</p>
        </div>
      )}
    </div>
  )
}