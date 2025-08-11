import mongoose, { Schema, Document } from 'mongoose'

export type GeometryType = 'lot_perimeter' | 'structure_perimeter' | 'custom_path' | 'vegetation_line' | 'exclusion'
export type ExclusionType = 'pool' | 'pond' | 'garden' | 'beehive' | 'playset' | 'water_feature' | 'neighbor_buffer'
export type PathType = 'fence' | 'hedge' | 'tree_line' | 'mixed'

interface Coordinate {
  lat: number
  lng: number
}

interface ElevationPoint {
  location: Coordinate
  elevation: number // meters
  resolution: number
}

interface LineSegment {
  start: Coordinate
  end: Coordinate
  length: number // feet
  bearing: number // degrees
  excluded?: boolean
  exclusionReason?: string
}

interface MeasurementVersion {
  version: number
  timestamp: Date
  userId: string
  userName: string
  changes: {
    field: string
    oldValue: any
    newValue: any
  }[]
  imageryDate?: Date
  comment?: string
}

export interface IMeasurementGeometry {
  id: string
  name: string // "Backyard perimeter", "North hedge line"
  type: GeometryType
  pathType?: PathType
  coordinates: Coordinate[]
  
  // Measurements
  linearFeet: number
  linearMeters: number
  slopeAdjustedLength?: number
  elevationProfile?: ElevationPoint[]
  
  // Properties
  isBackyardOnly?: boolean
  isFrontyardOnly?: boolean
  includesNeighborBoundary?: boolean
  
  // Metadata
  locked: boolean
  simplified: boolean
  snapConfidence?: number
  createdAt: Date
  updatedAt: Date
}

export interface IExclusionZone {
  id: string
  name: string // "Pool", "Garden", "Pond"
  type: ExclusionType
  geometry: Coordinate[]
  
  // Buffer configuration
  bufferDistance: {
    value: number
    unit: 'feet' | 'meters'
    regulatory: boolean
    regulation?: string // "EPA Water Feature Buffer"
  }
  
  // Computed
  bufferedGeometry?: Coordinate[]
  affectedLinearFeet?: number
  affectedArea?: number
}

export interface IBandMeasurement {
  bandWidth: number // feet
  totalArea: number // sq ft
  netArea: number // after exclusions
  excludedArea: number
  segments: {
    geometryId: string
    linearFeet: number
    area: number
    excluded: boolean
    exclusionZones?: string[]
  }[]
  chemicalVolume: {
    concentrate: number // oz
    diluted: number // gallons
    applicationRate: string
    mixRatio: string
    coverage: string
  }
}

export interface IComplianceResult {
  passed: boolean
  violations: {
    type: string
    severity: 'warning' | 'error'
    zone?: string
    geometry?: string
    required: number
    actual: number
    regulation: string
  }[]
  autoAdjustments: {
    type: string
    targetId: string
    targetType: 'zone' | 'geometry'
    newValue?: number
    newCoordinates?: Coordinate[]
    reason: string
  }[]
  complianceScore: number
  recommendations: string[]
}

export interface IMosquitoMeasurement extends Document {
  propertyId: string
  businessId: string
  customerId?: string
  address: string
  
  // Geometries
  geometries: IMeasurementGeometry[]
  exclusionZones: IExclusionZone[]
  
  // Measurements
  measurements: {
    lotPerimeter?: {
      linearFeet: number
      linearMeters: number
      confidence: number
    }
    structurePerimeter?: {
      linearFeet: number
      linearMeters: number
      buildingType?: string
    }
    customPaths: {
      name: string
      linearFeet: number
      pathType: PathType
    }[]
    totalLinearFeet: number
    treatmentBand?: IBandMeasurement
  }
  
  // Imagery
  imagerySource: {
    provider: 'google_earth'
    date: Date
    resolution: number
    historical: boolean
    url?: string
  }
  
  // Compliance
  compliance?: IComplianceResult
  
  // Obstacles/Notes
  obstacles: {
    gates: number
    narrowAccess: boolean
    steepSlopes: boolean
    denseVegetation: boolean
    notes?: string
  }
  
  // Versioning
  version: number
  versions: MeasurementVersion[]
  
  // Metadata
  createdBy: string
  createdByName: string
  createdAt: Date
  updatedAt: Date
  
  // Quote reference
  quoteId?: string
  quoteSent?: boolean
  quoteSentAt?: Date
}

const CoordinateSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false })

const LineSegmentSchema = new Schema({
  start: CoordinateSchema,
  end: CoordinateSchema,
  length: Number,
  bearing: Number,
  excluded: Boolean,
  exclusionReason: String
}, { _id: false })

const MeasurementGeometrySchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['lot_perimeter', 'structure_perimeter', 'custom_path', 'vegetation_line', 'exclusion'],
    required: true
  },
  pathType: {
    type: String,
    enum: ['fence', 'hedge', 'tree_line', 'mixed']
  },
  coordinates: [CoordinateSchema],
  
  linearFeet: { type: Number, required: true },
  linearMeters: { type: Number, required: true },
  slopeAdjustedLength: Number,
  elevationProfile: [{
    location: CoordinateSchema,
    elevation: Number,
    resolution: Number
  }],
  
  isBackyardOnly: Boolean,
  isFrontyardOnly: Boolean,
  includesNeighborBoundary: Boolean,
  
  locked: { type: Boolean, default: false },
  simplified: { type: Boolean, default: false },
  snapConfidence: Number,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false })

const ExclusionZoneSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['pool', 'pond', 'garden', 'beehive', 'playset', 'water_feature', 'neighbor_buffer'],
    required: true
  },
  geometry: [CoordinateSchema],
  
  bufferDistance: {
    value: { type: Number, required: true },
    unit: { type: String, enum: ['feet', 'meters'], default: 'feet' },
    regulatory: { type: Boolean, default: false },
    regulation: String
  },
  
  bufferedGeometry: [CoordinateSchema],
  affectedLinearFeet: Number,
  affectedArea: Number
}, { _id: false })

const BandMeasurementSchema = new Schema({
  bandWidth: { type: Number, required: true },
  totalArea: { type: Number, required: true },
  netArea: { type: Number, required: true },
  excludedArea: { type: Number, required: true },
  segments: [{
    geometryId: String,
    linearFeet: Number,
    area: Number,
    excluded: Boolean,
    exclusionZones: [String]
  }],
  chemicalVolume: {
    concentrate: Number,
    diluted: Number,
    applicationRate: String,
    mixRatio: String,
    coverage: String
  }
}, { _id: false })

const ComplianceResultSchema = new Schema({
  passed: { type: Boolean, required: true },
  violations: [{
    type: String,
    severity: { type: String, enum: ['warning', 'error'] },
    zone: String,
    geometry: String,
    required: Number,
    actual: Number,
    regulation: String
  }],
  autoAdjustments: [{
    type: String,
    targetId: String,
    targetType: { type: String, enum: ['zone', 'geometry'] },
    newValue: Number,
    newCoordinates: [CoordinateSchema],
    reason: String
  }],
  complianceScore: { type: Number, min: 0, max: 1 },
  recommendations: [String]
}, { _id: false })

const MeasurementVersionSchema = new Schema({
  version: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  changes: [{
    field: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
  }],
  imageryDate: Date,
  comment: String
}, { _id: false })

const MosquitoMeasurementSchema = new Schema({
  propertyId: { type: String, required: true, index: true },
  businessId: { type: String, required: true, index: true },
  customerId: { type: String, index: true },
  address: { type: String, required: true },
  
  geometries: [MeasurementGeometrySchema],
  exclusionZones: [ExclusionZoneSchema],
  
  measurements: {
    lotPerimeter: {
      linearFeet: Number,
      linearMeters: Number,
      confidence: Number
    },
    structurePerimeter: {
      linearFeet: Number,
      linearMeters: Number,
      buildingType: String
    },
    customPaths: [{
      name: String,
      linearFeet: Number,
      pathType: { type: String, enum: ['fence', 'hedge', 'tree_line', 'mixed'] }
    }],
    totalLinearFeet: { type: Number, required: true },
    treatmentBand: BandMeasurementSchema
  },
  
  imagerySource: {
    provider: { type: String, default: 'google_earth' },
    date: { type: Date, required: true },
    resolution: { type: Number, required: true },
    historical: { type: Boolean, default: false },
    url: String
  },
  
  compliance: ComplianceResultSchema,
  
  obstacles: {
    gates: { type: Number, default: 0 },
    narrowAccess: { type: Boolean, default: false },
    steepSlopes: { type: Boolean, default: false },
    denseVegetation: { type: Boolean, default: false },
    notes: String
  },
  
  version: { type: Number, default: 1 },
  versions: [MeasurementVersionSchema],
  
  createdBy: { type: String, required: true },
  createdByName: { type: String, required: true },
  
  quoteId: String,
  quoteSent: { type: Boolean, default: false },
  quoteSentAt: Date
}, {
  timestamps: true,
  collection: 'mosquito_measurements'
})

// Indexes for performance
MosquitoMeasurementSchema.index({ propertyId: 1, version: -1 })
MosquitoMeasurementSchema.index({ businessId: 1, createdAt: -1 })
MosquitoMeasurementSchema.index({ customerId: 1, createdAt: -1 })
MosquitoMeasurementSchema.index({ 'geometries.type': 1 })
MosquitoMeasurementSchema.index({ quoteSent: 1, quoteSentAt: -1 })

// Virtual for total exclusion area
MosquitoMeasurementSchema.virtual('totalExclusionArea').get(function() {
  return this.exclusionZones.reduce((total, zone) => total + (zone.affectedArea || 0), 0)
})

// Virtual for treatment area
MosquitoMeasurementSchema.virtual('treatmentArea').get(function() {
  return this.measurements?.treatmentBand?.netArea || 0
})

// Method to add version
MosquitoMeasurementSchema.methods.addVersion = function(userId: string, userName: string, changes: any[], comment?: string) {
  const newVersion = {
    version: this.version + 1,
    timestamp: new Date(),
    userId,
    userName,
    changes,
    imageryDate: this.imagerySource.date,
    comment
  }
  
  this.versions.push(newVersion)
  this.version = newVersion.version
  this.updatedAt = new Date()
  
  return this.save()
}

// Method to calculate total linear feet
MosquitoMeasurementSchema.methods.calculateTotalLinearFeet = function() {
  let total = 0
  
  for (const geometry of this.geometries) {
    if (geometry.type !== 'exclusion') {
      total += geometry.linearFeet
    }
  }
  
  this.measurements.totalLinearFeet = total
  return total
}

// Method to check compliance
MosquitoMeasurementSchema.methods.checkCompliance = async function(regulations: any) {
  // Implementation would go here
  // This would call the PerimeterMeasurementService
  return {
    passed: true,
    violations: [],
    autoAdjustments: [],
    complianceScore: 1,
    recommendations: []
  }
}

// Static method to find by property
MosquitoMeasurementSchema.statics.findByProperty = function(propertyId: string) {
  return this.find({ propertyId }).sort({ version: -1 }).limit(1)
}

// Static method to find latest version
MosquitoMeasurementSchema.statics.findLatestVersion = function(propertyId: string, businessId: string) {
  return this.findOne({ propertyId, businessId }).sort({ version: -1 })
}

const MosquitoMeasurement = mongoose.models.MosquitoMeasurement || 
  mongoose.model<IMosquitoMeasurement>('MosquitoMeasurement', MosquitoMeasurementSchema)

export default MosquitoMeasurement