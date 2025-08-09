import { Types } from "mongoose";

export type UserRole = "admin" | "business_owner" | "staff" | "customer";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";
export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired";
export type MeasurementStatus = "pending" | "completed" | "failed";

export interface IUser {
  _id?: Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  businessId?: Types.ObjectId;
  emailVerified?: Date;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  status?: 'active' | 'suspended' | 'pending' | 'deleted';
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    registrationSource?: 'signup' | 'admin' | 'import' | 'api';
  };
  lastLogin?: Date;
  loginCount?: number;
}

export interface IWidgetSettings {
  // Visual Settings
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: string;
  logo?: string;
  
  // Display Options
  showCompanyName: boolean;
  showDescription: boolean;
  description: string;
  buttonText: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  
  // Form Configuration
  collectPhone: boolean;
  collectAddress: boolean;
  requiredFields: Array<'name' | 'email' | 'phone' | 'address'>;
  
  // Services Configuration
  allowedServices: string[];
  serviceDescriptions?: Map<string, string>;
  
  // Automation Settings
  autoGenerateQuote: boolean;
  sendQuoteEmail: boolean;
  autoOpen: boolean;
  delay: number;
  
  // Advanced Features
  enableManualSelection: boolean;
  enableAIDetection: boolean;
  showPriceBreakdown: boolean;
  allowServiceCustomization: boolean;
  
  // Widget Behavior
  triggerOn: 'pageLoad' | 'exitIntent' | 'scroll' | 'timer' | 'click';
  scrollPercentage: number;
  exitIntentSensitivity: number;
  
  // Widget Analytics
  enableAnalytics: boolean;
  trackingId?: string;
  
  // Custom CSS
  customCss?: string;
  
  // Widget Status
  isActive: boolean;
  domains?: string[];
}

export interface IBusiness {
  _id?: Types.ObjectId;
  name: string;
  ownerId: Types.ObjectId;
  logo?: string;
  website?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  taxRate?: number;
  settings: {
    defaultPricing: {
      lawnPerSqFt: number;
      drivewayPerSqFt: number;
      sidewalkPerSqFt: number;
      minimumCharge: number;
    };
    serviceAreas: Array<{
      name: string;
      zipCodes: string[];
      priceMultiplier: number;
    }>;
    branding: {
      primaryColor: string;
      logo?: string;
    };
  };
  teamMembers: Types.ObjectId[];
  permissions?: Map<string, string[]>;
  maxTeamMembers?: number;
  widgetSettings?: IWidgetSettings;
  zapierSettings?: {
    enabled: boolean;
    apiKey?: string;
    tier: 'none' | 'basic' | 'pro' | 'enterprise';
    configId?: Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  plan: "free" | "starter" | "professional" | "enterprise";
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  measurementQuota: number;
  measurementsUsed: number;
  features: {
    teamMembers: number;
    apiAccess: boolean;
    whiteLabel: boolean;
    customBranding: boolean;
    advancedReporting: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IMeasurement {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  customerId?: Types.ObjectId;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  measurements: {
    totalArea: number;
    perimeter: number;
    lawn: {
      frontYard: number;
      backYard: number;
      sideYard: number;
      total: number;
      perimeter: number;
    };
    driveway: number;
    sidewalk: number;
    building: number;
    other: number;
  };
  status: MeasurementStatus;
  metadata?: {
    source: "web" | "api" | "widget";
    ipAddress?: string;
    userAgent?: string;
  };
  selectionMethod?: "ai" | "manual" | "hybrid";
  manualSelections?: {
    lawn?: {
      polygon: number[][];
      area: number;
      selections: any[];
    };
    driveway?: {
      polygon: number[][];
      area: number;
      selections: any[];
    };
    sidewalk?: {
      polygon: number[][];
      area: number;
      selections: any[];
    };
    building?: {
      polygon: number[][];
      area: number;
      selections: any[];
    };
  };
  createdAt: Date;
  updatedAt: Date;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentSessionId?: string;
  stripeSessionId?: string;
  paymentAmount?: number;
  paymentCompletedAt?: Date;
  fullDataAccess?: boolean;
  customerEmail?: string;
  quoteId?: Types.ObjectId;
}

export interface IQuote {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  measurementId: Types.ObjectId;
  quoteNumber: string;
  status: QuoteStatus;
  services: Array<{
    name: string;
    description?: string;
    area: number;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  validUntil: Date;
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomer {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  email: string;
  name: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  properties: Array<{
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    notes?: string;
  }>;
  tags?: string[];
  notes?: string;
  status: "active" | "inactive" | "archived";
  metadata?: {
    source?: string;
    referral?: string;
    customFields?: Record<string, any>;
  };
  archivedAt?: Date;
  measurementCount: number;
  quoteCount: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKey {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  key: string;
  lastUsed?: Date;
  usageCount: number;
  isActive: boolean;
  permissions: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPricingRule {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  type: "zone" | "service" | "customer" | "volume";
  conditions: {
    zipCodes?: string[];
    serviceTypes?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    customerTags?: string[];
    minArea?: number;
    maxArea?: number;
  };
  pricing: {
    priceMultiplier?: number;
    fixedPrices?: {
      lawnPerSqFt?: number;
      drivewayPerSqFt?: number;
      sidewalkPerSqFt?: number;
    };
    minimumCharge?: number;
  };
  priority: number;
  isActive: boolean;
  description: string;
  appliedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeamInvitation {
  _id?: Types.ObjectId;
  businessId: Types.ObjectId;
  email: string;
  role: 'staff' | 'business_owner';
  invitedBy: Types.ObjectId;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  permissions?: string[];
  acceptedBy?: Types.ObjectId;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isExpired?: () => boolean;
  markExpired?: () => Promise<ITeamInvitation>;
  accept?: (userId: string) => Promise<ITeamInvitation>;
}
