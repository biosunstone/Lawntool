'use client'

import React, { useState, useEffect } from 'react'
import { Droplets, AlertTriangle, TrendingUp, TrendingDown, Calendar, MapPin, Activity } from 'lucide-react'
import { EagleViewService, calculateTreatmentAreas } from '@/lib/mosquito-control/eagleViewIntegration'
import { NearmapService, generateTreatmentSchedule } from '@/lib/mosquito-control/nearmapIntegration'
import { formatArea } from '@/lib/propertyMeasurementSimple'

interface MosquitoControlMapProps {
  address: string
  coordinates: { lat: number; lng: number }
  propertySize?: number // acres
}

export default function MosquitoControlMap({ 
  address, 
  coordinates,
  propertySize = 1
}: MosquitoControlMapProps) {
  const [loading, setLoading] = useState(true)
  const [eagleViewData, setEagleViewData] = useState<any>(null)
  const [nearmapData, setNearmapData] = useState<any>(null)
  const [treatmentAreas, setTreatmentAreas] = useState<any>(null)
  const [schedule, setSchedule] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'analysis' | 'monitoring' | 'treatment'>('analysis')

  useEffect(() => {
    loadMosquitoData()
  }, [address, coordinates])

  const loadMosquitoData = async () => {
    setLoading(true)
    
    try {
      // Initialize services
      const eagleView = new EagleViewService()
      const nearmap = new NearmapService()
      
      // Fetch EagleView precision imagery and analysis
      console.log('🦅 Loading EagleView precision imagery...')
      const imagery = await eagleView.getPropertyImagery(address, coordinates)
      setEagleViewData(imagery)
      
      // Calculate treatment areas
      const areas = calculateTreatmentAreas(imagery)
      setTreatmentAreas(areas)
      
      // Fetch Nearmap temporal monitoring
      console.log('📸 Loading Nearmap temporal analysis...')
      const monitoring = await nearmap.getPropertyMonitoring(address, coordinates)
      setNearmapData(monitoring)
      
      // Generate treatment schedule
      const treatmentSchedule = generateTreatmentSchedule(monitoring)
      setSchedule(treatmentSchedule)
      
    } catch (error) {
      console.error('Error loading mosquito control data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div>
            <p className="text-white font-medium">Analyzing property with AI...</p>
            <p className="text-gray-400 text-sm">EagleView precision + Nearmap monitoring</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Droplets className="w-6 h-6" />
              Mosquito Control Analysis
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Powered by EagleView & Nearmap AI
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              Risk Level: {nearmapData?.currentRiskScore || 0}/10
            </div>
            <div className="flex items-center gap-1 text-sm">
              {nearmapData?.trendDirection === 'improving' ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-300" />
                  <span className="text-green-300">Improving</span>
                </>
              ) : nearmapData?.trendDirection === 'worsening' ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-300" />
                  <span className="text-red-300">Worsening</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-yellow-300" />
                  <span className="text-yellow-300">Stable</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Property Analysis
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'monitoring'
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Temporal Monitoring
          </button>
          <button
            onClick={() => setActiveTab('treatment')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'treatment'
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Treatment Plan
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'analysis' && eagleViewData && (
          <div className="space-y-6">
            {/* Property Overview */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Property Overview
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Area:</span>
                  <p className="text-white font-medium">
                    {formatArea(propertySize * 43560)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Image Resolution:</span>
                  <p className="text-white font-medium">
                    {eagleViewData.resolution}cm/pixel (Ultra HD)
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Capture Date:</span>
                  <p className="text-white font-medium">
                    {new Date(eagleViewData.captureDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Analysis Type:</span>
                  <p className="text-white font-medium">
                    Orthomosaic + Oblique + Thermal
                  </p>
                </div>
              </div>
            </div>

            {/* Water Features - Critical for Mosquito Control */}
            <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4">
              <h3 className="text-red-400 font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Water Features & Breeding Sites
              </h3>
              <div className="space-y-3">
                {eagleViewData.analysis.waterFeatures.map((feature: any, idx: number) => (
                  <div key={idx} className="bg-gray-800 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium capitalize">
                          {feature.type.replace('_', ' ')}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Area: {feature.area} sq ft
                          {feature.depth && ` • Depth: ${feature.depth}m`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          feature.mosquitoRisk === 'critical' ? 'bg-red-600 text-white' :
                          feature.mosquitoRisk === 'high' ? 'bg-orange-600 text-white' :
                          feature.mosquitoRisk === 'medium' ? 'bg-yellow-600 text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {feature.mosquitoRisk.toUpperCase()} RISK
                        </span>
                        <p className="text-gray-400 text-xs mt-1">
                          Priority: {feature.treatmentPriority}/10
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vegetation Analysis */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Vegetation Analysis</h3>
              <div className="space-y-2">
                {eagleViewData.analysis.vegetation.map((veg: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        veg.type === 'lawn' ? 'bg-green-500' :
                        veg.type === 'trees' ? 'bg-green-700' :
                        veg.type === 'shrubs' ? 'bg-green-600' :
                        veg.type === 'wetland' ? 'bg-blue-600' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-gray-300 capitalize">{veg.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white">{formatArea(veg.area)}</span>
                      <div className="text-xs text-gray-400">
                        Moisture: {veg.moistureLevel}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && nearmapData && (
          <div className="space-y-6">
            {/* Seasonal Risk Analysis */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Seasonal Risk Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                {nearmapData.seasonalAnalysis.map((season: any) => (
                  <div key={season.season} className="bg-gray-800 rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-white font-medium capitalize">
                        {season.season}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        season.mosquitoRiskLevel >= 7 ? 'bg-red-600' :
                        season.mosquitoRiskLevel >= 5 ? 'bg-yellow-600' :
                        'bg-green-600'
                      } text-white`}>
                        Risk: {season.mosquitoRiskLevel}/10
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Effectiveness: {season.historicalEffectiveness.toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Changes */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Recent Property Changes</h3>
              <div className="space-y-2">
                {nearmapData.changes.slice(0, 5).map((change: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        change.mosquitoImpact === 'positive' ? 'bg-green-500' :
                        change.mosquitoImpact === 'negative' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <span className="text-gray-300">
                        {change.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-gray-400">
                      {new Date(change.detectedDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatment History */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Treatment History</h3>
              <div className="space-y-2">
                {nearmapData.treatmentHistory.slice(0, 3).map((treatment: any, idx: number) => (
                  <div key={idx} className="bg-gray-800 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white text-sm">
                          {treatment.type.charAt(0).toUpperCase() + treatment.type.slice(1)} Treatment
                        </p>
                        <p className="text-gray-400 text-xs">
                          {treatment.productUsed}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm">
                          {treatment.effectiveness.toFixed(0)}% Effective
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(treatment.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatment' && treatmentAreas && schedule && (
          <div className="space-y-6">
            {/* Immediate Actions */}
            {schedule.immediateActions.length > 0 && (
              <div className="bg-orange-900 bg-opacity-20 border border-orange-700 rounded-lg p-4">
                <h3 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Immediate Actions Required
                </h3>
                <ul className="space-y-2">
                  {schedule.immediateActions.map((action: string, idx: number) => (
                    <li key={idx} className="text-white text-sm flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Treatment Areas */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Priority Treatment Zones</h3>
              <div className="space-y-3">
                {treatmentAreas.priorityZones.slice(0, 5).map((zone: any, idx: number) => (
                  <div key={idx} className="bg-gray-800 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium capitalize">
                          {zone.zone}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Area: {zone.area.toLocaleString()} sq ft
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          zone.priority >= 8 ? 'bg-red-600' :
                          zone.priority >= 6 ? 'bg-yellow-600' :
                          'bg-green-600'
                        } text-white`}>
                          Priority {zone.priority}/10
                        </span>
                        <p className="text-gray-400 text-xs mt-1">
                          {zone.treatmentType}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-gray-400 text-sm">
                  Total Treatment Area: {treatmentAreas.totalTreatmentArea.toLocaleString()} sq ft
                </p>
              </div>
            </div>

            {/* Product Estimates */}
            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
              <h3 className="text-blue-400 font-medium mb-3">Estimated Product Requirements</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm">Larvicide</p>
                  <p className="text-white text-xl font-bold">
                    {treatmentAreas.estimatedProduct.larvicide.toFixed(1)} gal
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Adulticide</p>
                  <p className="text-white text-xl font-bold">
                    {treatmentAreas.estimatedProduct.adulticide.toFixed(1)} gal
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Granular</p>
                  <p className="text-white text-xl font-bold">
                    {treatmentAreas.estimatedProduct.granular.toFixed(0)} lbs
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Schedule */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Upcoming Treatment Schedule
              </h3>
              <div className="space-y-2">
                {schedule.upcomingTreatments.slice(0, 4).map((treatment: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="text-white text-sm">
                        {new Date(treatment.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-gray-400 text-xs capitalize">
                        {treatment.type} treatment
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">
                        ${treatment.estimatedCost}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {treatment.targetAreas.length} areas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}