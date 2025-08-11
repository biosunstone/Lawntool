'use client'

import React, { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, X, Settings, Wrench } from 'lucide-react'
import { ComplianceResult, ComplianceViolation, AutoAdjustment } from '@/lib/mosquito/PerimeterMeasurementService'

interface CompliancePanelProps {
  result: ComplianceResult
  onAutoFix: (adjustments?: AutoAdjustment[]) => void
  onClose: () => void
}

const SEVERITY_COLORS = {
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  error: 'text-red-600 bg-red-50 border-red-200'
}

const SEVERITY_ICONS = {
  warning: '⚠️',
  error: '🚨'
}

export default function CompliancePanel({
  result,
  onAutoFix,
  onClose
}: CompliancePanelProps) {
  const [selectedAdjustments, setSelectedAdjustments] = useState<string[]>(
    result.autoAdjustments.map((adj, index) => index.toString())
  )
  const [showDetails, setShowDetails] = useState(true)

  const handleAdjustmentToggle = (adjustmentId: string) => {
    setSelectedAdjustments(prev => 
      prev.includes(adjustmentId)
        ? prev.filter(id => id !== adjustmentId)
        : [...prev, adjustmentId]
    )
  }

  const handleAutoFix = () => {
    const adjustmentsToApply = result.autoAdjustments.filter((adj, index) => 
      selectedAdjustments.includes(index.toString())
    )
    onAutoFix(adjustmentsToApply)
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.75) return 'text-yellow-600'
    if (score >= 0.6) return 'text-orange-600'
    return 'text-red-600'
  }

  const allViolations = result.violations
  const errorCount = allViolations.filter(v => v.severity === 'error').length
  const warningCount = allViolations.filter(v => v.severity === 'warning').length

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.passed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Shield className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Compliance {result.passed ? 'Passed' : 'Check'}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className={`font-medium ${getScoreColor(result.complianceScore)}`}>
                Score: {Math.round(result.complianceScore * 100)}%
              </span>
              <span className="text-sm text-gray-600">
                {allViolations.length} issue{allViolations.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="p-4 border-b bg-gray-50">
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {result.recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        {(errorCount > 0 || warningCount > 0) && (
          <div className="flex items-center gap-4 mt-3 text-sm">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                🚨 {errorCount} error{errorCount !== 1 ? 's' : ''}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                ⚠️ {warningCount} warning{warningCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Details Toggle */}
      <div className="p-4 border-b">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <Settings className="w-4 h-4" />
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {showDetails && (
        <>
          {/* Violations List */}
          {allViolations.length > 0 && (
            <div className="p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Issues Found
              </h4>
              
              {allViolations.map((violation, index) => (
                <div
                  key={`violation-${index}`}
                  className={`p-3 rounded-lg border ${SEVERITY_COLORS[violation.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{SEVERITY_ICONS[violation.severity]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{violation.type}</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-current bg-opacity-10 uppercase tracking-wide">
                          {violation.severity}
                        </span>
                      </div>
                      <div className="text-sm mb-2 space-y-1">
                        {violation.zone && <div>Zone: {violation.zone}</div>}
                        {violation.geometry && <div>Geometry: {violation.geometry}</div>}
                        <div>Required: {violation.required} ft • Actual: {violation.actual} ft</div>
                        <div className="text-xs opacity-75">Regulation: {violation.regulation}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Auto Adjustments */}
          {result.autoAdjustments.length > 0 && (
            <div className="p-4 border-t space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Suggested Auto-Fixes
              </h4>
              
              <div className="space-y-2">
                {result.autoAdjustments.map((adjustment, index) => (
                  <div
                    key={`adj-${index}`}
                    className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <input
                      type="checkbox"
                      id={`adj-${index}`}
                      checked={selectedAdjustments.includes(index.toString())}
                      onChange={() => handleAdjustmentToggle(index.toString())}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`adj-${index}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm text-blue-900 capitalize mb-1">
                        {adjustment.type} ({adjustment.targetType}: {adjustment.targetId})
                      </div>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div>Reason: {adjustment.reason}</div>
                        {adjustment.newValue && <div>New value: {adjustment.newValue}</div>}
                        {adjustment.newCoordinates && <div>New coordinates: {adjustment.newCoordinates.length} points</div>}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAutoFix}
                  disabled={selectedAdjustments.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  Apply {selectedAdjustments.length} Fix{selectedAdjustments.length !== 1 ? 'es' : ''}
                </button>
                <button
                  onClick={() => setSelectedAdjustments(result.autoAdjustments.map((adj, index) => index.toString()))}
                  className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedAdjustments([])}
                  className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      {result.passed && (
        <div className="p-4 bg-green-50 border-t">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">All compliance requirements met!</span>
          </div>
        </div>
      )}
    </div>
  )
}