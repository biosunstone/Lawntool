'use client'

import { useState } from 'react'
import { PropertyMeasurements } from './MeasurementResults'
import { formatArea } from '@/lib/propertyMeasurement'
import { calculateMosquitoControl } from '@/lib/accurateMeasurements'
import { Edit2, Save, X, AlertCircle, Ruler } from 'lucide-react'

interface EditableMeasurementsProps {
  measurements: PropertyMeasurements
  onUpdate: (measurements: PropertyMeasurements) => void
}

export default function EditableMeasurements({ measurements, onUpdate }: EditableMeasurementsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMeasurements, setEditedMeasurements] = useState(measurements)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleEdit = () => {
    setIsEditing(true)
    setEditedMeasurements(measurements)
    setErrors({})
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedMeasurements(measurements)
    setErrors({})
  }

  const validateAndCalculate = () => {
    const newErrors: Record<string, string> = {}
    
    // Validate all inputs are positive numbers
    if (editedMeasurements.totalArea <= 0) newErrors.totalArea = 'Must be greater than 0'
    if (editedMeasurements.perimeter <= 0) newErrors.perimeter = 'Must be greater than 0'
    if (editedMeasurements.lawn.total < 0) newErrors.lawnTotal = 'Cannot be negative'
    if (editedMeasurements.driveway < 0) newErrors.driveway = 'Cannot be negative'
    if (editedMeasurements.sidewalk < 0) newErrors.sidewalk = 'Cannot be negative'
    if (editedMeasurements.building < 0) newErrors.building = 'Cannot be negative'
    
    // Realistic property size validation (in sq ft)
    if (editedMeasurements.totalArea < 500) newErrors.totalArea = 'Too small for a residential property'
    if (editedMeasurements.totalArea > 100000) newErrors.totalArea = 'Unusually large for residential (>2.3 acres)'
    
    // Realistic perimeter validation
    const minPerimeter = 4 * Math.sqrt(editedMeasurements.totalArea) * 0.8 // 80% of square perimeter
    const maxPerimeter = 4 * Math.sqrt(editedMeasurements.totalArea) * 2.5 // Very irregular shape
    if (editedMeasurements.perimeter < minPerimeter) {
      newErrors.perimeter = `Too small for this area (min: ${Math.round(minPerimeter)} ft)`
    }
    if (editedMeasurements.perimeter > maxPerimeter) {
      newErrors.perimeter = `Too large for this area (max: ${Math.round(maxPerimeter)} ft)`
    }
    
    // Validate component proportions
    const buildingRatio = editedMeasurements.building / editedMeasurements.totalArea
    if (buildingRatio > 0.6) newErrors.building = 'Building coverage too high (>60%)'
    if (buildingRatio < 0.05 && editedMeasurements.building > 0) newErrors.building = 'Building coverage too low (<5%)'
    
    const lawnRatio = editedMeasurements.lawn.total / editedMeasurements.totalArea
    if (lawnRatio > 0.85) newErrors.lawnTotal = 'Lawn coverage unusually high (>85%)'
    
    const drivewayRatio = editedMeasurements.driveway / editedMeasurements.totalArea
    if (drivewayRatio > 0.25) newErrors.driveway = 'Driveway coverage too high (>25%)'
    
    // Check that components don't exceed total
    const componentsTotal = editedMeasurements.lawn.total + editedMeasurements.driveway + 
                          editedMeasurements.sidewalk + editedMeasurements.building
    if (componentsTotal > editedMeasurements.totalArea) {
      newErrors.total = 'Components exceed total area'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateAndCalculate()) {
      // Calculate lawn breakdown proportionally
      const lawnTotal = editedMeasurements.lawn.total
      const originalLawnTotal = measurements.lawn.total
      const ratio = originalLawnTotal > 0 ? lawnTotal / originalLawnTotal : 1
      
      const updatedMeasurements: PropertyMeasurements = {
        ...editedMeasurements,
        lawn: {
          ...editedMeasurements.lawn,
          frontYard: Math.round(measurements.lawn.frontYard * ratio),
          backYard: Math.round(measurements.lawn.backYard * ratio),
          sideYard: Math.round(measurements.lawn.sideYard * ratio),
          perimeter: Math.round(4.2 * Math.sqrt(lawnTotal))
        },
        other: Math.max(0, editedMeasurements.totalArea - 
          (editedMeasurements.lawn.total + editedMeasurements.driveway + 
           editedMeasurements.sidewalk + editedMeasurements.building))
      }
      
      onUpdate(updatedMeasurements)
      setIsEditing(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseInt(value) || 0
    
    if (field === 'lawnTotal') {
      setEditedMeasurements({
        ...editedMeasurements,
        lawn: { ...editedMeasurements.lawn, total: numValue }
      })
    } else {
      setEditedMeasurements({
        ...editedMeasurements,
        [field]: numValue
      })
    }
  }

  const mosquitoControl = calculateMosquitoControl(measurements.perimeter)

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Measurement Details</h3>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit Measurements
          </button>
        </div>
        
        {/* Perimeter and Mosquito Control Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900">Mosquito Control Information</h4>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-yellow-700">Property Perimeter</p>
                  <p className="font-semibold text-yellow-900">{measurements.perimeter.toLocaleString()} linear ft</p>
                </div>
                <div>
                  <p className="text-yellow-700">Treatment Area</p>
                  <p className="font-semibold text-yellow-900">{mosquitoControl.treatmentArea.toLocaleString()} sq ft</p>
                </div>
                <div>
                  <p className="text-yellow-700">Cost per Treatment</p>
                  <p className="font-semibold text-yellow-900">${mosquitoControl.costPerTreatment}</p>
                </div>
                <div>
                  <p className="text-yellow-700">Annual Cost ({mosquitoControl.treatmentsPerYear} treatments)</p>
                  <p className="font-semibold text-yellow-900">${mosquitoControl.annualCost}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Edit Measurements</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>

      {errors.total && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {errors.total}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Property Area (sq ft)
          </label>
          <input
            type="number"
            value={editedMeasurements.totalArea}
            onChange={(e) => handleInputChange('totalArea', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errors.totalArea ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.totalArea && <p className="text-xs text-red-500 mt-1">{errors.totalArea}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Perimeter (linear ft)
          </label>
          <input
            type="number"
            value={editedMeasurements.perimeter}
            onChange={(e) => handleInputChange('perimeter', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errors.perimeter ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.perimeter && <p className="text-xs text-red-500 mt-1">{errors.perimeter}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Lawn Area (sq ft)
          </label>
          <input
            type="number"
            value={editedMeasurements.lawn.total}
            onChange={(e) => handleInputChange('lawnTotal', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errors.lawnTotal ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.lawnTotal && <p className="text-xs text-red-500 mt-1">{errors.lawnTotal}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Driveway Area (sq ft)
          </label>
          <input
            type="number"
            value={editedMeasurements.driveway}
            onChange={(e) => handleInputChange('driveway', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errors.driveway ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.driveway && <p className="text-xs text-red-500 mt-1">{errors.driveway}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sidewalk Area (sq ft)
          </label>
          <input
            type="number"
            value={editedMeasurements.sidewalk}
            onChange={(e) => handleInputChange('sidewalk', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errors.sidewalk ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.sidewalk && <p className="text-xs text-red-500 mt-1">{errors.sidewalk}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Building Area (sq ft)
          </label>
          <input
            type="number"
            value={editedMeasurements.building}
            onChange={(e) => handleInputChange('building', e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errors.building ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.building && <p className="text-xs text-red-500 mt-1">{errors.building}</p>}
        </div>
      </div>

      <div className="bg-gray-50 rounded p-4 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="h-4 w-4 text-gray-600" />
          <span className="font-medium">Calculation Summary</span>
        </div>
        <div className="space-y-1 text-gray-600">
          <p>Other Area: {Math.max(0, editedMeasurements.totalArea - 
            (editedMeasurements.lawn.total + editedMeasurements.driveway + 
             editedMeasurements.sidewalk + editedMeasurements.building)).toLocaleString()} sq ft</p>
          <p>Components Total: {(editedMeasurements.lawn.total + editedMeasurements.driveway + 
             editedMeasurements.sidewalk + editedMeasurements.building).toLocaleString()} sq ft</p>
        </div>
      </div>
    </div>
  )
}