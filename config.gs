/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Configuration File (config.gs)
 * ============================================================================
 *
 * All system configuration, thresholds, weights, API keys, and sheet names.
 * Modify these settings to customize the system behavior.
 */

// =============================================================================
// API CONFIGURATION
// =============================================================================

const CONFIG = {
  // API Keys (Set via Setup Wizard or Script Properties)
  API_KEYS: {
    OPENAI_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY') || '',
    SMSIT_API_KEY: PropertiesService.getScriptProperties().getProperty('SMSIT_API_KEY') || '',
    COMPANYHUB_API_KEY: PropertiesService.getScriptProperties().getProperty('COMPANYHUB_API_KEY') || '',
    ONEHASH_API_KEY: PropertiesService.getScriptProperties().getProperty('ONEHASH_API_KEY') || '',
    OHMYLEAD_WEBHOOK: PropertiesService.getScriptProperties().getProperty('OHMYLEAD_WEBHOOK') || '',
    SIGNWELL_API_KEY: PropertiesService.getScriptProperties().getProperty('SIGNWELL_API_KEY') || ''
  },

  // API Endpoints
  API_ENDPOINTS: {
    OPENAI: 'https://api.openai.com/v1/chat/completions',
    SMSIT: 'https://api.sms-it.com/v1/messages',
    COMPANYHUB: 'https://api.companyhub.com/v1',
    ONEHASH: 'https://api.onehash.io/v1',
    SIGNWELL: 'https://api.signwell.com/v1/documents'
  },

  // OpenAI Model Configuration
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
  // Leads Database Columns
  LEADS_DATABASE: [
    'Lead ID',
    'Address',
    'City',
    'State',
    'ZIP',
    'County',
    'Source Platform',
    'Listing URL',
    'Asking Price',
    'Beds',
    'Baths',
    'SqFt',
    'Lot Size',
    'Year Built',
    'Property Type',
    'Occupancy',
    'Condition',
    'Condition Score',
    'Seller Name',
    'Seller Phone',
    'Seller Email',
    'Motivation Signals',
    'Notes',
    'Description',
    'Timestamp Imported',
    'Status'
  ],

  // Deal Analyzer Columns (extends Leads Database)
  DEAL_ANALYZER: [
    'Lead ID',
    'Address',
    'City',
    'State',
    'ZIP',
    'Asking Price',
    'Beds',
    'Baths',
    'SqFt',
    'Year Built',
    'Property Type',
    'Condition',
    'ARV Estimate',
    'Rent Estimate (LTR)',
    'STR Revenue Estimate',
    'MTR Revenue Estimate',
    'Repair Estimate',
    'Repair Complexity Rating',
    'Holding Cost Estimate',
    'MAO (Wholesale)',
    'MAO (Flip)',
    'MAO (BRRRR)',
    'Offer Target',
    'Spread Estimate',
    'Cashflow Estimate (LTR)',
    'Cashflow Estimate (MTR)',
    'Cashflow Estimate (STR)',
    'Equity Estimate',
    'Sub2 Fit Score',
    'Wrap Fit Score',
    'Seller Finance Fit Score',
    'Strategy Recommendation',
    'Strategy Confidence',
    'Deal Classifier',
    'Risk Score',
    'Sales Velocity Score',
    'Market Heat Score',
    'Negotiation Angle',
    'Seller Psychology Score',
    'Motivation Score',
    'Next Best Action',
    'Seller Message',
    'Buyer Match Count',
    'Buyer Match Top 3',
    'CRM Route Target',
    'Synced',
    'Last Analyzed Timestamp'
  ],

  // Verdict Columns
  VERDICT: [
    'Rank',
    'Lead ID',
    'Address',
    'City',
    'State',
    'Strategy',
    'Deal Classifier',
    'Offer Target',
    'Profit/Spread',
    'Risk Score',
    'Velocity Score',
    'Market Heat',
    'Confidence',
    'Action',
    'Listing URL',
    'Timestamp'
  ],

  // Buyers & Exit Options Columns
  BUYERS_EXIT: [
    'Buyer ID',
    'Buyer Name',
    'Company',
    'Email',
    'Phone',
    'Preferred ZIP Codes',
    'Preferred Strategies',
    'Max Price',
    'Min Price',
    'Property Types',
    'Active',
    'Last Contact',
    'Notes'
  ],

  // Offers & Disposition Columns
  OFFERS_DISPOSITION: [
    'Offer ID',
    'Lead ID',
    'Address',
    'Strategy',
    'Offer Amount',
    'Offer Date',
    'Status',
    'Counter Offer',
    'Accepted Price',
    'Contract Date',
    'Buyer Assigned',
    'Assignment Fee',
    'Closing Date',
    'Dispo Notes',
    'Last Updated'
  ],

  // Repair Estimator Columns
  REPAIR_ESTIMATOR: [
    'Item',
    'Category',
    'Low Estimate',
    'Medium Estimate',
    'High Estimate',
    'Unit',
    'Notes'
  ],

  // Market & ZIP Intelligence Columns
  MARKET_ZIP_INTEL: [
    'ZIP Code',
    'City',
    'State',
    'Market Heat Score',
    'Avg DOM',
    'Sales Velocity',
    'Median Price',
    'Price Trend',
    'Avg Rent (LTR)',
    'Avg Rent (STR)',
    'Avg Rent (MTR)',
    'Investor Activity',
    'Foreclosure Rate',
    'Population Growth',
    'Last Updated'
  ],

  // CRM Sync Log Columns
  CRM_SYNC_LOG: [
    'Timestamp',
    'Lead ID',
    'Address',
    'CRM Target',
    'Action',
    'Status',
    'Response Code',
    'Error Message',
    'Retry Count'
  ],

  // Automation Control Center Columns
  AUTOMATION_CONTROL: [
    'Feature',
    'Enabled',
    'Last Run',
    'Next Scheduled',
    'Status',
    'Notes'
  ],

  // System Health Columns
  SYSTEM_HEALTH: [
    'Timestamp',
    'Component',
    'Status',
    'Message',
    'API Quota Used',
    'Error Count',
    'Warning Count'
  ]
};

// =============================================================================
// STRATEGY CONFIGURATION
// =============================================================================

const STRATEGIES = {
  // Core Acquisition (Capital-Light)
  WHOLESALING_LOCAL: {
    id: 'WHOLESALING_LOCAL',
    name: 'Wholesaling (Local)',
    category: 'Core Acquisition',
    minSpread: 5000,
    targetSpread: 15000,
    holdingPeriod: 30,
    requiredEquity: 0.25
  },
  WHOLESALING_VIRTUAL: {
    id: 'WHOLESALING_VIRTUAL',
    name: 'Virtual Wholesaling',
    category: 'Core Acquisition',
    minSpread: 7500,
    targetSpread: 20000,
    holdingPeriod: 45,
    requiredEquity: 0.25
  },
  WHOLESALING_JV: {
    id: 'WHOLESALING_JV',
    name: 'JV Wholesaling',
    category: 'Core Acquisition',
    minSpread: 10000,
    targetSpread: 25000,
    holdingPeriod: 30,
    requiredEquity: 0.20
  },

  // Ownership / Creative Finance
  SUBJECT_TO: {
    id: 'SUBJECT_TO',
    name: 'Subject-To (Sub2)',
    category: 'Creative Finance',
    minEquity: 0.10,
    targetEquity: 0.25,
    idealLTV: 0.80,
    cashflowMin: 200
  },
  WRAPAROUND: {
    id: 'WRAPAROUND',
    name: 'Wraparound Mortgage',
    category: 'Creative Finance',
    minSpread: 50,
    targetSpread: 200,
    interestDelta: 0.02,
    cashflowMin: 300
  },
  SELLER_FINANCING: {
    id: 'SELLER_FINANCING',
    name: 'Seller Financing',
    category: 'Creative Finance',
    minDownPayment: 0.05,
    targetDownPayment: 0.15,
    idealRate: 0.06,
    cashflowMin: 200
  },

  // Rehab / Value-Add
  FIX_AND_FLIP: {
    id: 'FIX_AND_FLIP',
    name: 'Fix & Flip',
    category: 'Rehab',
    minProfit: 25000,
    targetProfit: 50000,
    maxRepairPercent: 0.30,
    holdingPeriod: 120
  },
  BRRRR: {
    id: 'BRRRR',
    name: 'BRRRR',
    category: 'Rehab',
    minEquityAfterRefi: 0.20,
    targetEquityAfterRefi: 0.30,
    refinancePercent: 0.75,
    cashflowMin: 150
  },

  // Rentals
  STR: {
    id: 'STR',
    name: 'Short-Term Rental (STR)',
    category: 'Rentals',
    minCashflow: 500,
    targetCashflow: 1500,
    occupancyRate: 0.65,
    seasonalityFactor: 1.2
  },
  MTR: {
    id: 'MTR',
    name: 'Mid-Term Rental (MTR)',
    category: 'Rentals',
    minCashflow: 300,
    targetCashflow: 800,
    occupancyRate: 0.85,
    typicalStay: 90
  },
  LTR: {
    id: 'LTR',
    name: 'Long-Term Rental (LTR)',
    category: 'Rentals',
    minCashflow: 150,
    targetCashflow: 400,
    occupancyRate: 0.95,
    vacancyReserve: 0.05
  },

  // Special Situations
  PRE_FORECLOSURE: {
    id: 'PRE_FORECLOSURE',
    name: 'Pre-Foreclosure',
    category: 'Special Situations',
    urgencyMultiplier: 1.5,
    discountTarget: 0.30,
    negotiationLeverage: 'high'
  },
  TAX_DELINQUENT: {
    id: 'TAX_DELINQUENT',
    name: 'Tax Delinquent / Liens',
    category: 'Special Situations',
    urgencyMultiplier: 1.3,
    discountTarget: 0.35,
    additionalCosts: 'liens'
  },
  VACANT_ABANDONED: {
    id: 'VACANT_ABANDONED',
    name: 'Vacant / Abandoned',
    category: 'Special Situations',
    conditionDiscount: 0.20,
    holdingCostMultiplier: 0.5,
    repairMultiplier: 1.3
  },
  INHERITED_PROBATE: {
    id: 'INHERITED_PROBATE',
    name: 'Inherited / Probate',
    category: 'Special Situations',
    timelineMultiplier: 1.5,
    emotionalFactor: 'high',
    discountTarget: 0.25
  }
};

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

const SCORING_WEIGHTS = {
  // Deal Classifier Weights
  DEAL_CLASSIFIER: {
    profitWeight: 0.30,
    riskWeight: 0.25,
    velocityWeight: 0.20,
    marketHeatWeight: 0.15,
    motivationWeight: 0.10
  },

  // Risk Score Components
  RISK_FACTORS: {
    conditionWeight: 0.25,
    marketWeight: 0.20,
    priceWeight: 0.20,
    ageWeight: 0.15,
    locationWeight: 0.10,
    timeWeight: 0.10
  },

  // Market Heat Components
  MARKET_HEAT: {
    domWeight: 0.30,
    priceGrowthWeight: 0.25,
    inventoryWeight: 0.20,
    demandWeight: 0.15,
    investorActivityWeight: 0.10
  },

  // Strategy Selection Weights
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
  // Deal Classification Thresholds
  DEAL_CLASSIFIER: {
    HOT_DEAL: 85,
    PORTFOLIO_FOUNDATION: 70,
    SOLID_DEAL: 55,
    PASS: 0
  },

  // Risk Levels
  RISK: {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 100
  },

  // Market Heat Levels
  MARKET_HEAT: {
    COLD: 25,
    COOL: 45,
    WARM: 65,
    HOT: 85,
    ON_FIRE: 100
  },

  // Confidence Levels
  CONFIDENCE: {
    LOW: 40,
    MODERATE: 60,
    HIGH: 80,
    VERY_HIGH: 95
  },

  // MAO Calculation Defaults
  MAO: {
    WHOLESALE_DISCOUNT: 0.70,
    FLIP_DISCOUNT: 0.70,
    BRRRR_DISCOUNT: 0.75,
    ASSIGNMENT_FEE: 10000,
    HOLDING_COST_MONTHLY: 0.01
  },

  // Rental Calculations
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

  // Condition multipliers
  conditionMultipliers: {
    'Excellent': 0.0,
    'Good': 0.15,
    'Fair': 0.40,
    'Poor': 0.70,
    'Very Poor': 1.0,
    'Tear Down': 1.5
  },

  // Per square foot estimates
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
  // Feature Toggles (can be overridden in Automation Control Center)
  FEATURES: {
    AUTO_IMPORT: true,
    AUTO_ANALYZE: true,
    AUTO_VERDICT: true,
    AUTO_CRM_SYNC: true,
    DAILY_REFRESH: true
  },

  // Timing
  TIMING: {
    DAILY_TRIGGER_HOUR: 7,
    DAILY_TRIGGER_MINUTE: 0,
    IMPORT_DELAY_MS: 500,
    ANALYSIS_BATCH_SIZE: 50,
    API_RATE_LIMIT_MS: 1000
  },

  // CRM Routing Rules
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
  // Color Scheme
  COLORS: {
    PRIMARY: '#1a73e8',
    SUCCESS: '#34a853',
    WARNING: '#fbbc04',
    DANGER: '#ea4335',
    INFO: '#4285f4',
    DARK: '#202124',
    LIGHT: '#f8f9fa',
    WHITE: '#ffffff',

    // Deal Classifier Colors
    HOT_DEAL: '#ff4444',
    PORTFOLIO: '#00C851',
    SOLID_DEAL: '#33b5e5',
    PASS: '#aaaaaa'
  },

  // Formatting
  FORMATTING: {
    HEADER_BG: '#1a73e8',
    HEADER_TEXT: '#ffffff',
    ALTERNATE_ROW: '#f8f9fa',
    FROZEN_ROWS: 1,
    COLUMN_WIDTH_DEFAULT: 120,
    COLUMN_WIDTH_NARROW: 80,
    COLUMN_WIDTH_WIDE: 200
  },

  // Dashboard Settings
  DASHBOARD: {
    CHART_HEIGHT: 300,
    KPI_TILES: 6,
    REFRESH_INTERVAL: 300000 // 5 minutes
  }
};

// =============================================================================
// PROMPT TEMPLATES (AI)
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
  GENERAL_ERROR: 'An unexpected error occurred: '
};

// =============================================================================
// HELPER FUNCTION TO GET CONFIG VALUES
// =============================================================================

/**
 * Gets a nested configuration value safely
 * @param {string} path - Dot-notation path (e.g., 'THRESHOLDS.DEAL_CLASSIFIER.HOT_DEAL')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value or default
 */
function getConfig(path, defaultValue = null) {
  try {
    const parts = path.split('.');
    let value = { CONFIG, SHEETS, COLUMNS, STRATEGIES, SCORING_WEIGHTS, THRESHOLDS, AUTOMATION, UI_CONFIG, AI_PROMPTS };

    for (const part of parts) {
      if (value[part] === undefined) {
        return defaultValue;
      }
      value = value[part];
    }
    return value;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Updates a script property (for API keys, etc.)
 * @param {string} key - Property key
 * @param {string} value - Property value
 */
function setConfigProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

/**
 * Gets a script property
 * @param {string} key - Property key
 * @returns {string} Property value or empty string
 */
function getConfigProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}
