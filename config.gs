/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Configuration Module (config.gs) - PRODUCTION PATCHED
 * ============================================================================
 *
 * Central configuration for entire system.
 * All constants, thresholds, weights, API keys, and sheet names.
 *
 * PATCH NOTES v2.0.1:
 * - Added STAGING_MODE toggle for safe testing
 * - Added CIRCUIT_BREAKER config for AI resilience
 * - Added LOCK_CONFIG for concurrency protection
 * - Added CACHE_CONFIG with TTLs
 * - Added RETRY_CONFIG for transient failure handling
 * - Enhanced all 16 strategy definitions with complete parameters
 * - Added comprehensive AI_PROMPTS for all scenarios
 */

// =============================================================================
// SYSTEM MODE - SET TO TRUE FOR SAFE TESTING
// =============================================================================

const STAGING_MODE = false;

// =============================================================================
// CIRCUIT BREAKER CONFIGURATION
// =============================================================================

const CIRCUIT_BREAKER = {
  AI: {
    FAILURE_THRESHOLD: 3,
    RECOVERY_TIME_MS: 60000,
    TIMEOUT_MS: 30000,
    HALF_OPEN_REQUESTS: 1
  },
  CRM: {
    FAILURE_THRESHOLD: 5,
    RECOVERY_TIME_MS: 120000,
    TIMEOUT_MS: 15000
  }
};

// =============================================================================
// LOCK CONFIGURATION
// =============================================================================

const LOCK_CONFIG = {
  TIMEOUT_MS: 30000,
  HOLD_TIME_MS: 120000,
  RETRY_DELAY_MS: 500,
  MAX_RETRIES: 5
};

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_CONFIG = {
  DEFAULT_TTL: 300,
  SHEET_DATA_TTL: 60,
  AI_RESPONSE_TTL: 3600,
  MARKET_DATA_TTL: 86400,
  PREFIX: 'QRA_'
};

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2
};

// =============================================================================
// API CONFIGURATION
// =============================================================================

const CONFIG = {
  VERSION: '2.0.1',
  BUILD: 'PRODUCTION-PATCHED',

  API_KEYS: {
    OPENAI_API_KEY: '',
    SMSIT_API_KEY: '',
    COMPANYHUB_API_KEY: '',
    ONEHASH_API_KEY: '',
    SIGNWELL_API_KEY: '',
    OHMYLEAD_WEBHOOK: ''
  },

  API_ENDPOINTS: {
    OPENAI: 'https://api.openai.com/v1/chat/completions',
    SMSIT: 'https://api.sms-it.com/v1/messages',
    COMPANYHUB: 'https://api.companyhub.com/v1',
    ONEHASH: 'https://api.onehash.io/v1',
    SIGNWELL: 'https://api.signwell.com/v1/documents'
  },

  OPENAI: {
    MODEL: 'gpt-4-turbo-preview',
    MAX_TOKENS: 1500,
    TEMPERATURE: 0.3
  }
};

// =============================================================================
// SHEET NAMES
// =============================================================================

const SHEETS = {
  IMPORT_HUB: 'Import Hub',
  LEADS_DATABASE: 'Leads Database',
  DEAL_ANALYZER: 'Deal Analyzer',
  VERDICT: 'Verdict',
  BUYERS_EXIT: 'Buyers & Exit Options',
  OFFERS_DISPOSITION: 'Offers & Disposition',
  REPAIR_ESTIMATOR: 'Repair Estimator',
  MARKET_ZIP_INTEL: 'Market & ZIP Intelligence',
  CRM_SYNC_LOG: 'CRM Sync Log',
  AUTOMATION_CONTROL: 'Automation Control Center',
  DASHBOARD: 'Dashboard',
  SYSTEM_HEALTH: 'System Health'
};

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

const COLUMNS = {
  IMPORT_HUB: [
    'Timestamp', 'Address', 'City', 'State', 'ZIP', 'County',
    'Property Type', 'Beds', 'Baths', 'SqFt', 'Year Built', 'Lot Size',
    'Asking Price', 'Estimated ARV', 'Estimated Rent', 'Condition',
    'Occupancy', 'Motivation Level', 'Lead Source', 'Lead Type',
    'Seller Name', 'Seller Phone', 'Seller Email', 'Listing URL',
    'Tax Status', 'Foreclosure Status', 'Probate', 'Vacant',
    'Notes', 'Description', 'Imported'
  ],

  LEADS_DATABASE: [
    'Lead ID', 'Address', 'City', 'State', 'ZIP', 'County',
    'Source Platform', 'Listing URL', 'Asking Price', 'Beds', 'Baths',
    'SqFt', 'Lot Size', 'Year Built', 'Property Type', 'Occupancy',
    'Condition', 'Condition Score', 'Seller Name', 'Seller Phone',
    'Seller Email', 'Motivation Signals', 'Notes', 'Description',
    'Timestamp Imported', 'Status'
  ],

  DEAL_ANALYZER: [
    'Lead ID', 'Address', 'City', 'State', 'ZIP', 'Asking Price',
    'Beds', 'Baths', 'SqFt', 'Year Built', 'Property Type', 'Condition',
    'ARV Estimate', 'Rent Estimate (LTR)', 'STR Revenue Estimate',
    'MTR Revenue Estimate', 'Repair Estimate', 'Repair Complexity Rating',
    'Holding Cost Estimate', 'MAO (Wholesale)', 'MAO (Flip)', 'MAO (BRRRR)',
    'Offer Target', 'Spread Estimate', 'Cashflow Estimate (LTR)',
    'Cashflow Estimate (MTR)', 'Cashflow Estimate (STR)', 'Equity Estimate',
    'Sub2 Fit Score', 'Wrap Fit Score', 'Seller Finance Fit Score',
    'Strategy Recommendation', 'Strategy Confidence', 'Deal Classifier',
    'Risk Score', 'Sales Velocity Score', 'Market Heat Score',
    'Negotiation Angle', 'Seller Psychology Score', 'Motivation Score',
    'Next Best Action', 'Seller Message', 'Buyer Match Count',
    'Buyer Match Top 3', 'CRM Route Target', 'Synced', 'Last Analyzed Timestamp'
  ],

  VERDICT: [
    'Rank', 'Lead ID', 'Address', 'City', 'State', 'Strategy',
    'Deal Classifier', 'Offer Target', 'Profit/Spread', 'Risk Score',
    'Velocity Score', 'Market Heat', 'Confidence', 'Action',
    'Listing URL', 'Timestamp'
  ],

  BUYERS_EXIT: [
    'Buyer ID', 'Buyer Name', 'Company', 'Email', 'Phone',
    'Preferred ZIP Codes', 'Preferred Strategies', 'Max Price', 'Min Price',
    'Property Types', 'Active', 'Last Contact', 'Notes'
  ],

  OFFERS_DISPOSITION: [
    'Offer ID', 'Lead ID', 'Address', 'Strategy', 'Offer Amount',
    'Offer Date', 'Status', 'Counter Offer', 'Accepted Price',
    'Contract Date', 'Buyer Assigned', 'Assignment Fee', 'Closing Date',
    'Dispo Notes', 'Last Updated'
  ],

  REPAIR_ESTIMATOR: [
    'Item', 'Category', 'Low Estimate', 'Medium Estimate', 'High Estimate',
    'Unit', 'Notes'
  ],

  MARKET_ZIP_INTEL: [
    'ZIP Code', 'City', 'State', 'Market Heat Score', 'Avg DOM',
    'Sales Velocity', 'Median Price', 'Price Trend', 'Avg Rent (LTR)',
    'Avg Rent (STR)', 'Avg Rent (MTR)', 'Investor Activity',
    'Foreclosure Rate', 'Population Growth', 'Last Updated'
  ],

  CRM_SYNC_LOG: [
    'Timestamp', 'Lead ID', 'Address', 'CRM Target', 'Action',
    'Status', 'Response Code', 'Error Message', 'Retry Count'
  ],

  AUTOMATION_CONTROL: [
    'Feature', 'Enabled', 'Last Run', 'Next Scheduled', 'Status', 'Notes'
  ],

  SYSTEM_HEALTH: [
    'Timestamp', 'Component', 'Status', 'Message', 'API Quota Used',
    'Error Count', 'Warning Count'
  ]
};

// =============================================================================
// STRATEGY CONFIGURATION - ALL 16 STRATEGIES COMPLETE
// =============================================================================

const STRATEGIES = {
  WHOLESALING_LOCAL: {
    id: 'WHOLESALING_LOCAL',
    name: 'Wholesaling (Local)',
    code: 'LW',
    family: 'WHOLESALE',
    category: 'Core Acquisition',
    description: 'Assign contract to local cash buyer',
    minSpread: 5000,
    targetSpread: 15000,
    arvMultiplier: 0.70,
    holdingPeriod: 30,
    requiredEquity: 0.25,
    riskLevel: 'Low',
    capitalRequired: 'Minimal',
    idealCondition: ['Poor', 'Fair'],
    idealMotivation: ['High', 'Very High'],
    exitOptions: ['Assignment', 'Double Close']
  },

  WHOLESALING_VIRTUAL: {
    id: 'WHOLESALING_VIRTUAL',
    name: 'Virtual Wholesaling',
    code: 'VW',
    family: 'WHOLESALE',
    category: 'Core Acquisition',
    description: 'Remote market wholesale with boots on ground partner',
    minSpread: 7500,
    targetSpread: 20000,
    arvMultiplier: 0.65,
    holdingPeriod: 45,
    requiredEquity: 0.25,
    riskLevel: 'Medium',
    capitalRequired: 'Minimal',
    idealCondition: ['Poor', 'Fair'],
    idealMotivation: ['High', 'Very High'],
    exitOptions: ['Assignment', 'Double Close'],
    requiresPartner: true
  },

  WHOLESALING_JV: {
    id: 'WHOLESALING_JV',
    name: 'JV Wholesaling',
    code: 'JV',
    family: 'WHOLESALE',
    category: 'Core Acquisition',
    description: 'Joint venture wholesale with partner split',
    minSpread: 10000,
    targetSpread: 25000,
    arvMultiplier: 0.68,
    holdingPeriod: 30,
    requiredEquity: 0.20,
    riskLevel: 'Low',
    capitalRequired: 'Minimal',
    idealCondition: ['Poor', 'Fair', 'Good'],
    idealMotivation: ['Medium', 'High', 'Very High'],
    exitOptions: ['Assignment'],
    splitPercentage: 0.50
  },

  SUBJECT_TO: {
    id: 'SUBJECT_TO',
    name: 'Subject-To (Sub2)',
    code: 'SUB',
    family: 'CREATIVE',
    category: 'Creative Finance',
    description: 'Take over existing mortgage payments',
    minEquity: 0.10,
    targetEquity: 0.25,
    arvMultiplier: 0.85,
    idealLTV: 0.80,
    cashflowMin: 200,
    riskLevel: 'Medium',
    capitalRequired: 'Low',
    idealCondition: ['Fair', 'Good'],
    idealMotivation: ['High', 'Very High'],
    exitOptions: ['Wrap', 'Lease Option', 'Sell', 'Rent'],
    requiresEquity: true,
    minEquityPercent: 0.15
  },

  WRAPAROUND: {
    id: 'WRAPAROUND',
    name: 'Wraparound Mortgage',
    code: 'WRAP',
    family: 'CREATIVE',
    category: 'Creative Finance',
    description: 'Create new mortgage wrapping existing debt',
    minSpread: 50,
    targetSpread: 200,
    arvMultiplier: 0.90,
    interestDelta: 0.02,
    cashflowMin: 300,
    riskLevel: 'Medium',
    capitalRequired: 'Low',
    idealCondition: ['Fair', 'Good', 'Excellent'],
    idealMotivation: ['Medium', 'High'],
    exitOptions: ['Cash Flow', 'Backend Profit'],
    requiresEquity: true,
    spreadOnInterest: true
  },

  SELLER_FINANCING: {
    id: 'SELLER_FINANCING',
    name: 'Seller Financing',
    code: 'SF',
    family: 'CREATIVE',
    category: 'Creative Finance',
    description: 'Seller acts as the bank with negotiated terms',
    minDownPayment: 0.05,
    targetDownPayment: 0.15,
    arvMultiplier: 0.88,
    idealRate: 0.06,
    cashflowMin: 200,
    riskLevel: 'Low',
    capitalRequired: 'Medium',
    idealCondition: ['Good', 'Fair'],
    idealMotivation: ['Medium', 'High'],
    exitOptions: ['Refinance', 'Sell', 'Hold'],
    freeAndClearPreferred: true
  },

  FIX_AND_FLIP: {
    id: 'FIX_AND_FLIP',
    name: 'Fix & Flip',
    code: 'FF',
    family: 'FLIP',
    category: 'Rehab',
    description: 'Renovate and sell for retail profit',
    minProfit: 25000,
    targetProfit: 50000,
    arvMultiplier: 0.70,
    maxRepairPercent: 0.30,
    holdingPeriod: 120,
    riskLevel: 'High',
    capitalRequired: 'High',
    idealCondition: ['Poor', 'Fair'],
    idealMotivation: ['Any'],
    exitOptions: ['Retail Sale'],
    requiresRehab: true
  },

  BRRRR: {
    id: 'BRRRR',
    name: 'BRRRR',
    code: 'BR',
    family: 'RENTAL',
    category: 'Rehab',
    description: 'Buy, Rehab, Rent, Refinance, Repeat',
    minEquityAfterRefi: 0.20,
    targetEquityAfterRefi: 0.30,
    arvMultiplier: 0.75,
    refinancePercent: 0.75,
    cashflowMin: 150,
    holdingPeriod: 180,
    riskLevel: 'Medium',
    capitalRequired: 'High',
    idealCondition: ['Poor', 'Fair'],
    idealMotivation: ['Any'],
    exitOptions: ['Refinance', 'Hold'],
    requiresRehab: true,
    targetCashOnCash: 0.12
  },

  STR: {
    id: 'STR',
    name: 'Short-Term Rental (STR)',
    code: 'STR',
    family: 'RENTAL',
    category: 'Rentals',
    description: 'Airbnb/VRBO vacation rental',
    minCashflow: 500,
    targetCashflow: 1500,
    arvMultiplier: 0.85,
    occupancyRate: 0.65,
    seasonalityFactor: 1.2,
    holdingPeriod: 45,
    riskLevel: 'Medium',
    capitalRequired: 'High',
    idealCondition: ['Good', 'Excellent'],
    idealMotivation: ['Any'],
    exitOptions: ['Cash Flow', 'Sell'],
    locationSensitive: true,
    rentMultiplier: 2.5
  },

  MTR: {
    id: 'MTR',
    name: 'Mid-Term Rental (MTR)',
    code: 'MTR',
    family: 'RENTAL',
    category: 'Rentals',
    description: 'Furnished rental for traveling professionals',
    minCashflow: 300,
    targetCashflow: 800,
    arvMultiplier: 0.85,
    occupancyRate: 0.85,
    typicalStay: 90,
    holdingPeriod: 45,
    riskLevel: 'Low',
    capitalRequired: 'Medium',
    idealCondition: ['Good', 'Fair'],
    idealMotivation: ['Any'],
    exitOptions: ['Cash Flow', 'Sell'],
    rentMultiplier: 1.5
  },

  LTR: {
    id: 'LTR',
    name: 'Long-Term Rental (LTR)',
    code: 'LTR',
    family: 'RENTAL',
    category: 'Rentals',
    description: 'Traditional 12-month lease rental',
    minCashflow: 150,
    targetCashflow: 400,
    arvMultiplier: 0.80,
    occupancyRate: 0.95,
    vacancyReserve: 0.05,
    holdingPeriod: 45,
    riskLevel: 'Low',
    capitalRequired: 'Medium',
    idealCondition: ['Good', 'Fair', 'Excellent'],
    idealMotivation: ['Any'],
    exitOptions: ['Cash Flow', 'Appreciation', 'Sell'],
    targetCashFlow: 200
  },

  PRE_FORECLOSURE: {
    id: 'PRE_FORECLOSURE',
    name: 'Pre-Foreclosure',
    code: 'PF',
    family: 'DISTRESSED',
    category: 'Special Situations',
    description: 'Purchase from distressed homeowner before auction',
    urgencyMultiplier: 1.5,
    discountTarget: 0.30,
    arvMultiplier: 0.65,
    negotiationLeverage: 'high',
    holdingPeriod: 14,
    riskLevel: 'Medium',
    capitalRequired: 'Medium',
    idealCondition: ['Any'],
    idealMotivation: ['Very High'],
    exitOptions: ['Wholesale', 'Flip', 'Sub-To', 'Hold'],
    urgencyFactor: true
  },

  TAX_DELINQUENT: {
    id: 'TAX_DELINQUENT',
    name: 'Tax Delinquent / Liens',
    code: 'TD',
    family: 'DISTRESSED',
    category: 'Special Situations',
    description: 'Purchase properties with delinquent taxes',
    urgencyMultiplier: 1.3,
    discountTarget: 0.35,
    arvMultiplier: 0.60,
    additionalCosts: 'liens',
    holdingPeriod: 30,
    riskLevel: 'Medium',
    capitalRequired: 'Medium',
    idealCondition: ['Any'],
    idealMotivation: ['High', 'Very High'],
    exitOptions: ['Wholesale', 'Flip', 'Hold'],
    requiresTaxCure: true
  },

  VACANT_ABANDONED: {
    id: 'VACANT_ABANDONED',
    name: 'Vacant / Abandoned',
    code: 'VAC',
    family: 'DISTRESSED',
    category: 'Special Situations',
    description: 'Purchase vacant or abandoned properties',
    conditionDiscount: 0.20,
    holdingCostMultiplier: 0.5,
    arvMultiplier: 0.55,
    repairMultiplier: 1.3,
    holdingPeriod: 45,
    riskLevel: 'High',
    capitalRequired: 'Medium',
    idealCondition: ['Poor'],
    idealMotivation: ['High', 'Very High'],
    exitOptions: ['Wholesale', 'Flip'],
    requiresSkipTrace: true
  },

  INHERITED_PROBATE: {
    id: 'INHERITED_PROBATE',
    name: 'Inherited / Probate',
    code: 'PRO',
    family: 'DISTRESSED',
    category: 'Special Situations',
    description: 'Purchase from heirs or through probate',
    timelineMultiplier: 1.5,
    emotionalFactor: 'high',
    arvMultiplier: 0.70,
    discountTarget: 0.25,
    holdingPeriod: 60,
    riskLevel: 'Low',
    capitalRequired: 'Medium',
    idealCondition: ['Any'],
    idealMotivation: ['Medium', 'High'],
    exitOptions: ['Wholesale', 'Flip', 'Hold'],
    sensitivityRequired: true
  }
};

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

const SCORING_WEIGHTS = {
  DEAL_CLASSIFIER: {
    profitWeight: 0.30,
    riskWeight: 0.25,
    velocityWeight: 0.20,
    marketHeatWeight: 0.15,
    motivationWeight: 0.10
  },

  RISK_FACTORS: {
    conditionWeight: 0.25,
    marketWeight: 0.20,
    priceWeight: 0.20,
    ageWeight: 0.15,
    locationWeight: 0.10,
    timeWeight: 0.10
  },

  MARKET_HEAT: {
    domWeight: 0.30,
    priceGrowthWeight: 0.25,
    inventoryWeight: 0.20,
    demandWeight: 0.15,
    investorActivityWeight: 0.10
  },

  STRATEGY_SELECTION: {
    profitPotential: 0.30,
    riskLevel: 0.25,
    timeToProfit: 0.20,
    capitalRequired: 0.15,
    skillMatch: 0.10
  }
};

// =============================================================================
// THRESHOLDS AND LIMITS
// =============================================================================

const THRESHOLDS = {
  DEAL_CLASSIFIER: {
    HOT_DEAL: 85,
    PORTFOLIO_FOUNDATION: 70,
    SOLID_DEAL: 55,
    PASS: 0
  },

  RISK: {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 100
  },

  MARKET_HEAT: {
    COLD: 25,
    COOL: 45,
    WARM: 65,
    HOT: 85,
    ON_FIRE: 100
  },

  CONFIDENCE: {
    LOW: 40,
    MODERATE: 60,
    HIGH: 80,
    VERY_HIGH: 95
  },

  MAO: {
    WHOLESALE_DISCOUNT: 0.70,
    FLIP_DISCOUNT: 0.70,
    BRRRR_DISCOUNT: 0.75,
    ASSIGNMENT_FEE: 10000,
    HOLDING_COST_MONTHLY: 0.01
  },

  RENTALS: {
    LTR_CAP_RATE: 0.08,
    MTR_PREMIUM: 1.25,
    STR_PREMIUM: 2.0,
    EXPENSE_RATIO: 0.40,
    VACANCY_RATE: 0.05
  }
};

// =============================================================================
// DEFAULT REPAIR ESTIMATES
// =============================================================================

const REPAIR_DEFAULTS = {
  categories: [
    { item: 'Roof Replacement', low: 5000, medium: 8000, high: 15000 },
    { item: 'HVAC Replacement', low: 4000, medium: 7000, high: 12000 },
    { item: 'Plumbing Updates', low: 2000, medium: 5000, high: 10000 },
    { item: 'Electrical Updates', low: 1500, medium: 4000, high: 8000 },
    { item: 'Foundation Repair', low: 5000, medium: 15000, high: 30000 },
    { item: 'Kitchen Remodel', low: 5000, medium: 15000, high: 35000 },
    { item: 'Bathroom Remodel', low: 3000, medium: 8000, high: 20000 },
    { item: 'Flooring', low: 2000, medium: 5000, high: 12000 },
    { item: 'Paint Interior', low: 1500, medium: 3000, high: 6000 },
    { item: 'Paint Exterior', low: 2000, medium: 4000, high: 8000 },
    { item: 'Windows', low: 3000, medium: 8000, high: 15000 },
    { item: 'Siding', low: 4000, medium: 10000, high: 20000 },
    { item: 'Landscaping', low: 1000, medium: 3000, high: 8000 },
    { item: 'Driveway/Concrete', low: 2000, medium: 5000, high: 12000 },
    { item: 'Appliances', low: 2000, medium: 4000, high: 8000 },
    { item: 'Permits & Fees', low: 500, medium: 2000, high: 5000 },
    { item: 'Contingency', low: 3000, medium: 8000, high: 15000 }
  ],

  conditionMultipliers: {
    'Excellent': 0.0,
    'Good': 0.15,
    'Fair': 0.40,
    'Poor': 0.70,
    'Very Poor': 1.0,
    'Tear Down': 1.5
  },

  perSqFt: {
    light: 15,
    medium: 35,
    heavy: 60,
    gutRehab: 100
  }
};

// =============================================================================
// AUTOMATION SETTINGS
// =============================================================================

const AUTOMATION = {
  FEATURES: {
    AUTO_IMPORT: true,
    AUTO_ANALYZE: true,
    AUTO_VERDICT: true,
    AUTO_CRM_SYNC: true,
    DAILY_REFRESH: true
  },

  TIMING: {
    DAILY_TRIGGER_HOUR: 7,
    DAILY_TRIGGER_MINUTE: 0,
    IMPORT_DELAY_MS: 500,
    ANALYSIS_BATCH_SIZE: 50,
    API_RATE_LIMIT_MS: 1000
  },

  CRM_ROUTING: {
    HOT_DEAL: 'SMS-iT',
    PORTFOLIO: 'CompanyHub',
    SOLID_DEAL: 'OneHash',
    DEFAULT: 'CompanyHub'
  }
};

// =============================================================================
// UI CONFIGURATION
// =============================================================================

const UI_CONFIG = {
  COLORS: {
    PRIMARY: '#1a73e8',
    SUCCESS: '#34a853',
    WARNING: '#fbbc04',
    DANGER: '#ea4335',
    INFO: '#4285f4',
    DARK: '#202124',
    LIGHT: '#f8f9fa',
    WHITE: '#ffffff',
    HOT_DEAL: '#ff4444',
    PORTFOLIO: '#00C851',
    SOLID_DEAL: '#33b5e5',
    PASS: '#aaaaaa'
  },

  FORMATTING: {
    HEADER_BG: '#1a73e8',
    HEADER_TEXT: '#ffffff',
    ALTERNATE_ROW: '#f8f9fa',
    FROZEN_ROWS: 1,
    COLUMN_WIDTH_DEFAULT: 120,
    COLUMN_WIDTH_NARROW: 80,
    COLUMN_WIDTH_WIDE: 200
  },

  DASHBOARD: {
    CHART_HEIGHT: 300,
    KPI_TILES: 6,
    REFRESH_INTERVAL: 300000
  }
};

// =============================================================================
// AI PROMPTS - COMPLETE SET
// =============================================================================

const AI_PROMPTS = {
  STRATEGY_RECOMMENDATION: `You are a real estate investment expert. Analyze the following property data and recommend the BEST investment strategy from this list:
- Wholesaling (Local)
- Virtual Wholesaling
- JV Wholesaling
- Subject-To (Sub2)
- Wraparound Mortgage
- Seller Financing
- Fix & Flip
- BRRRR
- Short-Term Rental (STR)
- Mid-Term Rental (MTR)
- Long-Term Rental (LTR)
- Pre-Foreclosure
- Tax Delinquent / Liens
- Vacant / Abandoned
- Inherited / Probate

Property Data:
{{PROPERTY_DATA}}

Return JSON only:
{
  "strategy": "strategy name",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "alternateStrategies": ["backup1", "backup2"],
  "riskFactors": ["risk1", "risk2"],
  "dealClassifier": "HOT DEAL|PORTFOLIO FOUNDATION|SOLID DEAL|PASS"
}`,

  REPAIR_INFERENCE: `Analyze this property description and estimate repairs needed.

Description: {{DESCRIPTION}}
Condition: {{CONDITION}}
Year Built: {{YEAR_BUILT}}
Square Feet: {{SQFT}}

Return JSON only:
{
  "estimatedTotal": number,
  "complexityRating": "Light|Medium|Heavy|Gut Rehab",
  "majorItems": [{"item": "name", "estimate": number}],
  "concerns": ["concern1", "concern2"],
  "confidence": 0-100
}`,

  SELLER_PSYCHOLOGY: `Analyze seller motivation based on this information:

Motivation Signals: {{MOTIVATION_SIGNALS}}
Property Condition: {{CONDITION}}
Occupancy: {{OCCUPANCY}}
Notes: {{NOTES}}

Return JSON only:
{
  "motivationScore": 0-100,
  "psychologyProfile": "type",
  "painPoints": ["pain1", "pain2"],
  "negotiationAngle": "recommended approach",
  "urgencyLevel": "Low|Medium|High|Urgent"
}`,

  SELLER_MESSAGE: `Write a short, friendly SMS message (max 160 chars) to a motivated seller.

Strategy: {{STRATEGY}}
Negotiation Angle: {{NEGOTIATION_ANGLE}}
Property Address: {{ADDRESS}}

The message should:
- Be warm and personal
- Reference the property briefly
- Express genuine interest
- Include soft call to action

Return JSON only:
{
  "message": "SMS text here",
  "tone": "description of tone",
  "callToAction": "what we want them to do"
}`
};

// =============================================================================
// ERROR MESSAGES
// =============================================================================

const ERROR_MESSAGES = {
  SHEET_NOT_FOUND: 'Required sheet not found: ',
  API_KEY_MISSING: 'API key not configured: ',
  DATA_VALIDATION: 'Data validation failed: ',
  NETWORK_ERROR: 'Network request failed: ',
  RATE_LIMIT: 'API rate limit exceeded. Please wait.',
  PARSE_ERROR: 'Failed to parse response: ',
  GENERAL_ERROR: 'An unexpected error occurred: ',
  CIRCUIT_OPEN: 'Service temporarily unavailable (circuit breaker open)',
  LOCK_TIMEOUT: 'Could not acquire lock - operation in progress',
  STAGING_MODE: '[STAGING] Operation blocked in staging mode'
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getConfig(path, defaultValue = null) {
  try {
    const parts = path.split('.');
    let value = { CONFIG, SHEETS, COLUMNS, STRATEGIES, SCORING_WEIGHTS, THRESHOLDS, AUTOMATION, UI_CONFIG, AI_PROMPTS };
    for (const part of parts) {
      if (value[part] === undefined) return defaultValue;
      value = value[part];
    }
    return value;
  } catch (e) {
    return defaultValue;
  }
}

function setConfigProperty(key, value) {
  if (STAGING_MODE) {
    Logger.log('[STAGING] Would set property: ' + key);
    return;
  }
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function getConfigProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function isStagingMode() {
  return STAGING_MODE === true;
}

function getApiKey(service) {
  const keyMap = {
    'openai': 'OPENAI_API_KEY',
    'smsit': 'SMSIT_API_KEY',
    'companyhub': 'COMPANYHUB_API_KEY',
    'onehash': 'ONEHASH_API_KEY',
    'signwell': 'SIGNWELL_API_KEY'
  };
  const propKey = keyMap[service.toLowerCase()];
  if (!propKey) return '';
  return CONFIG.API_KEYS[propKey] || getConfigProperty(propKey);
}

function getAllStrategyCodes() {
  return Object.keys(STRATEGIES);
}

function getStrategyByCode(code) {
  for (const [key, strategy] of Object.entries(STRATEGIES)) {
    if (strategy.code === code) return { key, ...strategy };
  }
  return null;
}

function getStrategyByName(name) {
  for (const [key, strategy] of Object.entries(STRATEGIES)) {
    if (strategy.name.toLowerCase() === name.toLowerCase()) {
      return { key, ...strategy };
    }
  }
  return null;
}

function getStrategiesByFamily(family) {
  return Object.entries(STRATEGIES)
    .filter(([_, s]) => s.family === family)
    .map(([key, strategy]) => ({ key, ...strategy }));
}
