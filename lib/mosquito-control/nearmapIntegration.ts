/**
 * Nearmap Integration for Temporal Mosquito Control Monitoring
 * Track changes in property conditions and treatment effectiveness
 */

import { Coordinate } from '@/types/manualSelection'

export interface NearmapCapture {
  captureId: string
  captureDate: Date
  season: 'spring' | 'summer' | 'fall' | 'winter'
  weatherConditions: {
    recentRainfall: boolean
    temperature: number
    humidity: number
  }
  imageUrl: string
  resolution: number // cm per pixel
}

export interface TemporalChange {
  type: 'water_increase' | 'water_decrease' | 'vegetation_growth' | 
        'vegetation_removal' | 'structure_added' | 'structure_removed' |
        'treatment_effective' | 'treatment_ineffective'
  severity: 'minor' | 'moderate' | 'significant'
  area: number
  coordinates: Coordinate[]
  detectedDate: Date
  mosquitoImpact: 'positive' | 'negative' | 'neutral'
}

export interface SeasonalAnalysis {
  season: string
  mosquitoRiskLevel: number // 1-10
  breedingAreaChange: number // percentage change
  treatmentRecommendations: string[]
  historicalEffectiveness: number // percentage
}

export interface PropertyMonitoring {
  propertyId: string
  address: string
  captures: NearmapCapture[]
  changes: TemporalChange[]
  seasonalAnalysis: SeasonalAnalysis[]
  treatmentHistory: TreatmentRecord[]
  currentRiskScore: number
  trendDirection: 'improving' | 'worsening' | 'stable'
}

export interface TreatmentRecord {
  date: Date
  type: 'larvicide' | 'adulticide' | 'barrier' | 'combined'
  areasTreated: number
  productUsed: string
  effectiveness: number // 0-100%
  nextTreatmentDue: Date
}

/**
 * Nearmap API Service for temporal analysis
 */
export class NearmapService {
  private apiKey: string
  private baseUrl = 'https://api.nearmap.com/v3'
  
  constructor(apiKey: string = process.env.NEARMAP_API_KEY || 'demo-key') {
    this.apiKey = apiKey
  }
  
  /**
   * Get historical captures for a property
   */
  async getHistoricalCaptures(
    address: string,
    coordinates: { lat: number; lng: number },
    months: number = 12
  ): Promise<NearmapCapture[]> {
    console.log(`📸 Nearmap: Fetching ${months} months of historical imagery for ${address}`)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const captures: NearmapCapture[] = []
    const now = Date.now()
    
    // Generate monthly captures
    for (let i = 0; i < months; i++) {
      const captureDate = new Date(now - i * 30 * 24 * 60 * 60 * 1000)
      const month = captureDate.getMonth()
      
      let season: NearmapCapture['season']
      if (month >= 2 && month <= 4) season = 'spring'
      else if (month >= 5 && month <= 7) season = 'summer'
      else if (month >= 8 && month <= 10) season = 'fall'
      else season = 'winter'
      
      captures.push({
        captureId: `NM-${coordinates.lat}-${coordinates.lng}-${i}`,
        captureDate,
        season,
        weatherConditions: {
          recentRainfall: Math.random() > 0.6,
          temperature: this.getSeasonalTemp(season),
          humidity: 40 + Math.random() * 40
        },
        imageUrl: `/nearmap/${coordinates.lat}_${coordinates.lng}_${captureDate.getTime()}.jpg`,
        resolution: 5.5 // 5.5cm per pixel
      })
    }
    
    return captures
  }
  
  /**
   * Detect changes between captures
   */
  async detectChanges(
    captures: NearmapCapture[],
    coordinates: { lat: number; lng: number }
  ): Promise<TemporalChange[]> {
    console.log(`🔍 Nearmap: Analyzing temporal changes across ${captures.length} captures`)
    
    const changes: TemporalChange[] = []
    
    // Compare consecutive captures
    for (let i = 1; i < captures.length; i++) {
      const previous = captures[i]
      const current = captures[i - 1]
      
      // Detect seasonal water changes
      if (current.season === 'summer' && previous.season === 'spring') {
        if (current.weatherConditions.recentRainfall) {
          changes.push({
            type: 'water_increase',
            severity: 'moderate',
            area: 200 + Math.random() * 300,
            coordinates: this.generateChangeArea(coordinates, 0.05),
            detectedDate: current.captureDate,
            mosquitoImpact: 'negative'
          })
        }
      }
      
      // Detect vegetation growth in spring/summer
      if ((current.season === 'spring' || current.season === 'summer') && 
          (previous.season === 'winter' || previous.season === 'fall')) {
        changes.push({
          type: 'vegetation_growth',
          severity: 'significant',
          area: 500 + Math.random() * 1000,
          coordinates: this.generateChangeArea(coordinates, 0.1),
          detectedDate: current.captureDate,
          mosquitoImpact: 'negative'
        })
      }
      
      // Detect treatment effectiveness (random for demo)
      if (Math.random() > 0.7) {
        changes.push({
          type: 'treatment_effective',
          severity: 'minor',
          area: 1000 + Math.random() * 500,
          coordinates: this.generateChangeArea(coordinates, 0.15),
          detectedDate: current.captureDate,
          mosquitoImpact: 'positive'
        })
      }
    }
    
    return changes
  }
  
  /**
   * Analyze seasonal patterns
   */
  async analyzeSeasonalPatterns(
    captures: NearmapCapture[],
    changes: TemporalChange[]
  ): Promise<SeasonalAnalysis[]> {
    const seasons: SeasonalAnalysis[] = []
    
    const seasonGroups = {
      spring: captures.filter(c => c.season === 'spring'),
      summer: captures.filter(c => c.season === 'summer'),
      fall: captures.filter(c => c.season === 'fall'),
      winter: captures.filter(c => c.season === 'winter')
    }
    
    for (const [season, seasonCaptures] of Object.entries(seasonGroups)) {
      if (seasonCaptures.length === 0) continue
      
      const seasonChanges = changes.filter(c => {
        const changeMonth = c.detectedDate.getMonth()
        if (season === 'spring') return changeMonth >= 2 && changeMonth <= 4
        if (season === 'summer') return changeMonth >= 5 && changeMonth <= 7
        if (season === 'fall') return changeMonth >= 8 && changeMonth <= 10
        return changeMonth === 11 || changeMonth <= 1
      })
      
      const negativeChanges = seasonChanges.filter(c => c.mosquitoImpact === 'negative').length
      const positiveChanges = seasonChanges.filter(c => c.mosquitoImpact === 'positive').length
      
      let riskLevel = 5
      let recommendations: string[] = []
      
      switch (season) {
        case 'spring':
          riskLevel = 7
          recommendations = [
            'Begin larvicide treatments in standing water',
            'Clear debris that collects water',
            'Treat emerging vegetation areas'
          ]
          break
        case 'summer':
          riskLevel = 9
          recommendations = [
            'Increase treatment frequency to bi-weekly',
            'Focus on shaded and moist areas',
            'Monitor and treat new water accumulation',
            'Apply barrier treatments around structures'
          ]
          break
        case 'fall':
          riskLevel = 6
          recommendations = [
            'Continue treatments until first frost',
            'Focus on leaf removal to prevent water collection',
            'Treat overwintering sites'
          ]
          break
        case 'winter':
          riskLevel = 2
          recommendations = [
            'Inspect and eliminate potential overwintering sites',
            'Plan for next season treatments',
            'Maintain property drainage'
          ]
          break
      }
      
      const effectiveness = positiveChanges / (positiveChanges + negativeChanges) * 100 || 50
      
      seasons.push({
        season,
        mosquitoRiskLevel: riskLevel,
        breedingAreaChange: (negativeChanges - positiveChanges) * 10,
        treatmentRecommendations: recommendations,
        historicalEffectiveness: effectiveness
      })
    }
    
    return seasons
  }
  
  /**
   * Generate comprehensive property monitoring report
   */
  async getPropertyMonitoring(
    address: string,
    coordinates: { lat: number; lng: number }
  ): Promise<PropertyMonitoring> {
    const captures = await this.getHistoricalCaptures(address, coordinates, 12)
    const changes = await this.detectChanges(captures, coordinates)
    const seasonalAnalysis = await this.analyzeSeasonalPatterns(captures, changes)
    
    // Generate treatment history
    const treatmentHistory = this.generateTreatmentHistory(captures)
    
    // Calculate current risk score
    const recentChanges = changes.slice(0, 3)
    const negativeImpacts = recentChanges.filter(c => c.mosquitoImpact === 'negative').length
    const currentRiskScore = Math.min(10, 5 + negativeImpacts * 2)
    
    // Determine trend
    const oldRisk = changes.slice(-3).filter(c => c.mosquitoImpact === 'negative').length
    const newRisk = changes.slice(0, 3).filter(c => c.mosquitoImpact === 'negative').length
    let trendDirection: PropertyMonitoring['trendDirection'] = 'stable'
    if (newRisk > oldRisk) trendDirection = 'worsening'
    else if (newRisk < oldRisk) trendDirection = 'improving'
    
    return {
      propertyId: `PROP-${coordinates.lat}-${coordinates.lng}`,
      address,
      captures,
      changes,
      seasonalAnalysis,
      treatmentHistory,
      currentRiskScore,
      trendDirection
    }
  }
  
  /**
   * Helper functions
   */
  private getSeasonalTemp(season: string): number {
    switch (season) {
      case 'summer': return 75 + Math.random() * 15
      case 'spring': return 55 + Math.random() * 15
      case 'fall': return 50 + Math.random() * 15
      case 'winter': return 30 + Math.random() * 20
      default: return 60
    }
  }
  
  private generateChangeArea(center: { lat: number; lng: number }, offset: number): Coordinate[] {
    const polygon: Coordinate[] = []
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * 2 * Math.PI
      polygon.push({
        lat: center.lat + offset * Math.sin(angle) * 0.001,
        lng: center.lng + offset * Math.cos(angle) * 0.001
      })
    }
    return polygon
  }
  
  private generateTreatmentHistory(captures: NearmapCapture[]): TreatmentRecord[] {
    const treatments: TreatmentRecord[] = []
    
    // Generate treatments every 2-4 weeks during active season
    captures.forEach((capture, index) => {
      if (capture.season === 'summer' || capture.season === 'spring') {
        if (index % 2 === 0) {
          treatments.push({
            date: capture.captureDate,
            type: index % 3 === 0 ? 'combined' : 'larvicide',
            areasTreated: 5000 + Math.random() * 10000,
            productUsed: index % 3 === 0 ? 'Altosid + Suspend' : 'Altosid WSP',
            effectiveness: 70 + Math.random() * 25,
            nextTreatmentDue: new Date(capture.captureDate.getTime() + 21 * 24 * 60 * 60 * 1000)
          })
        }
      }
    })
    
    return treatments
  }
}

/**
 * Generate treatment schedule based on monitoring data
 */
export function generateTreatmentSchedule(
  monitoring: PropertyMonitoring
): {
  immediateActions: string[]
  upcomingTreatments: Array<{
    date: Date
    type: string
    targetAreas: string[]
    estimatedCost: number
  }>
  seasonalPlan: Map<string, string[]>
} {
  const immediateActions: string[] = []
  const upcomingTreatments: any[] = []
  const seasonalPlan = new Map<string, string[]>()
  
  // Immediate actions based on risk score
  if (monitoring.currentRiskScore >= 7) {
    immediateActions.push('Schedule immediate comprehensive treatment')
    immediateActions.push('Eliminate all standing water sources')
    immediateActions.push('Apply larvicide to water features')
  } else if (monitoring.currentRiskScore >= 5) {
    immediateActions.push('Inspect property for new breeding sites')
    immediateActions.push('Schedule routine treatment within 7 days')
  }
  
  // Generate upcoming treatments
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const treatmentDate = new Date(now.getTime() + i * 21 * 24 * 60 * 60 * 1000)
    const month = treatmentDate.getMonth()
    
    let treatmentType = 'maintenance'
    let targetAreas = ['General property']
    let cost = 150
    
    if (month >= 5 && month <= 7) {
      treatmentType = 'comprehensive'
      targetAreas = ['Standing water', 'Vegetation', 'Structure perimeters', 'Shaded areas']
      cost = 350
    } else if (month >= 3 && month <= 4) {
      treatmentType = 'preventive'
      targetAreas = ['Water features', 'Low-lying areas']
      cost = 250
    }
    
    upcomingTreatments.push({
      date: treatmentDate,
      type: treatmentType,
      targetAreas,
      estimatedCost: cost
    })
  }
  
  // Seasonal planning
  monitoring.seasonalAnalysis.forEach(season => {
    seasonalPlan.set(season.season, season.treatmentRecommendations)
  })
  
  return {
    immediateActions,
    upcomingTreatments,
    seasonalPlan
  }
}