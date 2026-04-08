/**
 * Quantum Real Estate Analyzer - Configuration Module
 * Contains all system settings, thresholds, and constants
 */

// ============================================================
// MASTER CONFIGURATION OBJECT
// ============================================================

const CONFIG = {
  // Sheet Names
  SHEETS: {
    // Import & Staging
    IMPORT_HUB: 'Import Hub',
    STAGING_BROWSE_AI: 'Staging - Browse AI',
    STAGING_PROPSTREAM: 'Staging - PropStream',
    STAGING_MLS: 'Staging - MLS',
    WEB_AD_LEADS: 'Web & Ad Leads',

    // Core Data
    MASTER_DB: 'Master Database',
    ENHANCED_ANALYZER: 'Enhanced Deal Analyzer',
    LEAD_SCORING: 'Lead Scoring & Risk',

    // Strategy Engines
    STR_ENGINE: 'STR Engine',
    MTR_ENGINE: 'MTR Engine',
    LTR_ENGINE: 'LTR Engine',
    FLIP_ENGINE: 'Flip Engine',
    CREATIVE_ENGINE: 'Creative Finance Engine',

    // Outputs
    VERDICT: 'Verdict',
    OFFERS: 'Offer & Disposition',
    REPAIR_ESTIMATOR: 'Repair Estimator',
    BUYER_MATCHING: 'Buyer Matching Engine',
    BUYER_DATABASE: 'Buyer Database',
    POST_SALE: 'Post-Sale Tracker',

    // Institutional Disposition Layer
    INST_BUYERS: 'Institutional Buyers',
    INST_BUY_BOX_MATCHER: 'Buyer Buy Box Matcher',
    INST_DEAL_PACKAGE: 'Institutional Deal Package',
    INST_PORTFOLIO_BUILDER: 'Portfolio Builder',
    INST_DISPOSITION_TRACKER: 'Disposition Tracker',
    INST_DASHBOARD: 'Institutional Dashboard',

    // Admin & Config
    SETTINGS: 'Settings',
    DASHBOARD: 'Dashboard',
    CONTROL_CENTER: 'Control Center',

    // Logs
    SYSTEM_LOG: 'System Log',
    ERROR_LOG: 'Error Log',
    SYNC_LOG: 'Sync Log'
  },

  // Sales Velocity Thresholds
  VELOCITY: {
    FAST: { maxDOM: 14, score: 90, tier: 'FAST', description: 'Quick exit expected' },
    MODERATE: { maxDOM: 45, score: 70, tier: 'MOD', description: 'Normal market pace' },
    SLOW: { maxDOM: 90, score: 40, tier: 'SLOW', description: 'Extended timeline' },
    STALE: { maxDOM: 999, score: 20, tier: 'STALE', description: 'Potential pricing issues' }
  },

  // Exit Risk Tiers
  EXIT_RISK: {
    LOW: { maxScore: 30, tier: 'LOW', maoMultiplier: 1.0 },
    MODERATE: { maxScore: 50, tier: 'MOD', maoMultiplier: 0.95 },
    HIGH: { maxScore: 70, tier: 'HIGH', maoMultiplier: 0.90 },
    CRITICAL: { maxScore: 100, tier: 'CRIT', maoMultiplier: 0.85 }
  },

  // SOM (Market Saturation) Thresholds
  SOM: {
    LOW: { maxScore: 30, impact: 'FAVORABLE', verdictBoost: 5 },
    MODERATE: { maxScore: 50, impact: 'NEUTRAL', verdictBoost: 0 },
    HIGH: { maxScore: 70, impact: 'CROWDED', verdictBoost: -5 },
    SATURATED: { maxScore: 100, impact: 'SATURATED', verdictBoost: -15 }
  },

  // Speed-to-Lead SLA Thresholds (in minutes)
  SPEED_TO_LEAD: {
    TIER_1: { maxMinutes: 5, penalty: 0, status: 'OPTIMAL', escalation: false },
    TIER_2: { maxMinutes: 15, penalty: -5, status: 'ACCEPTABLE', escalation: false },
    TIER_3: { maxMinutes: 60, penalty: -15, status: 'SLOW', escalation: true },
    BREACH: { maxMinutes: 9999, penalty: -25, status: 'BREACH', escalation: true }
  },

  // Repair Complexity Tiers
  REPAIR: {
    COSMETIC: { tier: 'COSMETIC', lowMultiplier: 5, highMultiplier: 15, riskScore: 10 },
    MODERATE: { tier: 'MODERATE', lowMultiplier: 15, highMultiplier: 35, riskScore: 30 },
    HEAVY: { tier: 'HEAVY', lowMultiplier: 35, highMultiplier: 60, riskScore: 50 },
    FULL_GUT: { tier: 'FULL_GUT', lowMultiplier: 60, highMultiplier: 100, riskScore: 75 },
    TEARDOWN: { tier: 'TEARDOWN', lowMultiplier: 100, highMultiplier: 150, riskScore: 90 }
  },

  // Strategy Engine Defaults
  STRATEGIES: {
    FLIP: {
      holdingCostMonthly: 0.01, // 1% of purchase per month
      agentFees: 0.06,          // 6% total
      closingCosts: 0.03,       // 3% total
      minProfitMargin: 0.15,    // 15% minimum profit
      targetProfitMargin: 0.25  // 25% target profit
    },
    STR: {
      occupancyDefault: 0.65,
      managementFee: 0.20,
      cleaningPerTurn: 75,
      furnishingCost: 8000,
      setupCost: 2000,
      platformFee: 0.03,
      seasonalityFactor: 1.0,
      regulationRiskDefault: 0.5
    },
    MTR: {
      avgStayLength: 3,         // months
      vacancyBetweenStays: 0.5, // weeks
      utilitiesBundleMonthly: 200,
      furnitureAmortization: 24, // months
      managementFee: 0.12
    },
    LTR: {
      vacancyRate: 0.08,
      maintenanceReserve: 0.10,
      capExReserve: 0.05,
      propertyManagement: 0.10,
      rentGrowthAnnual: 0.03,
      targetDSCR: 1.25
    },
    CREATIVE: {
      sub2: {
        discountFromAsking: 0.05,
        holdingPeriodMonths: 24
      },
      wrap: {
        spreadMin: 0.01,
        spreadMax: 0.03,
        downPaymentMin: 0.03
      },
      sellerCarry: {
        interestRate: 0.06,
        termYears: 5,
        balloonYears: 3
      },
      leaseOption: {
        optionFee: 0.03,
        termMonths: 24,
        rentCredit: 0.25
      }
    }
  },

  // Verdict Thresholds
  VERDICT: {
    HOT: { minScore: 80, color: '#4CAF50', action: 'CALL NOW' },
    SOLID: { minScore: 60, color: '#2196F3', action: 'MAKE OFFER' },
    HOLD: { minScore: 40, color: '#FF9800', action: 'WATCH' },
    PASS: { minScore: 0, color: '#F44336', action: 'SKIP' }
  },

  // CRM Integration Settings
  CRM: {
    SMSIT: {
      enabled: false,
      apiUrl: '',
      apiKey: ''
    },
    COMPANYHUB: {
      enabled: false,
      apiUrl: '',
      apiKey: ''
    },
    OHMYLEAD: {
      enabled: false,
      webhookUrl: ''
    }
  },

  // Institutional Disposition Settings
  INSTITUTIONAL: {
    // Scoring weights (must sum to 100)
    WEIGHTS: {
      rentReadiness: 15,
      capRate: 15,
      rehabBurden: 12,
      neighborhoodQuality: 12,
      occupancyCondition: 10,
      landlordFriendliness: 8,
      assetSimplicity: 8,
      pricingFit: 8,
      geographicConsistency: 6,
      portfolioCompatibility: 6
    },
    // Grade thresholds
    GRADES: {
      INSTITUTIONAL_PRIME: { minScore: 85, color: '#1B5E20', label: 'INSTITUTIONAL PRIME' },
      INSTITUTIONAL_FIT: { minScore: 70, color: '#2E7D32', label: 'INSTITUTIONAL FIT' },
      LOCAL_LANDLORD_FIT: { minScore: 55, color: '#558B2F', label: 'LOCAL LANDLORD FIT' },
      PORTFOLIO_ONLY: { minScore: 40, color: '#F57F17', label: 'PORTFOLIO ONLY' },
      NOT_INSTITUTIONAL: { minScore: 0, color: '#BF360C', label: 'NOT INSTITUTIONAL' }
    },
    // Disposition priority engine
    DISPOSITION_PRIORITY: {
      SEND_NOW: { minScore: 80, minCapRate: 0.06, maxRehab: 30000, label: 'SEND NOW' },
      HOLD_FOR_PORTFOLIO: { minScore: 60, label: 'HOLD FOR PORTFOLIO' },
      LOCAL_LANDLORD_FIRST: { minScore: 50, label: 'LOCAL LANDLORD FIRST' },
      REVIEW_MANUALLY: { minScore: 30, label: 'REVIEW MANUALLY' },
      NOT_A_FIT: { minScore: 0, label: 'NOT A FIT' }
    },
    // Portfolio appeal tiers
    PORTFOLIO_APPEAL: {
      BULK_READY: { minScore: 85, label: 'BULK READY', color: '#1B5E20' },
      STRONG_PORTFOLIO: { minScore: 70, label: 'STRONG PORTFOLIO', color: '#2E7D32' },
      LOCAL_PACKAGE: { minScore: 55, label: 'LOCAL PACKAGE', color: '#558B2F' },
      MIXED_QUALITY: { minScore: 35, label: 'MIXED QUALITY', color: '#F57F17' },
      DO_NOT_BUNDLE: { minScore: 0, label: 'DO NOT BUNDLE', color: '#BF360C' }
    },
    // Buyer reliability tiers
    BUYER_RELIABILITY: {
      PLATINUM: { minCloseRate: 0.40, minResponseRate: 0.80, label: 'PLATINUM' },
      GOLD: { minCloseRate: 0.25, minResponseRate: 0.60, label: 'GOLD' },
      SILVER: { minCloseRate: 0.10, minResponseRate: 0.40, label: 'SILVER' },
      BRONZE: { minCloseRate: 0, minResponseRate: 0, label: 'BRONZE' }
    },
    // Default thresholds for automation
    DEFAULTS: {
      minCapRate: 0.06,
      maxRehab: 40000,
      minInstitutionalScore: 60,
      minPortfolioSize: 3,
      minMatchScore: 50,
      packageCompletenessThreshold: 0.75
    }
  },

  // CRM Deal Stages (CompanyHub pipeline)
  CRM_STAGES: [
    'Hot Deal', 'Contacted', 'Negotiating', 'Inspecting',
    'Bought', 'Repairing', 'Listed', 'Sold', 'Dead'
  ],

  // AI/Messaging Settings
  AI: {
    openaiEnabled: false,
    openaiApiKey: '',
    model: 'gpt-4o-mini',
    maxTokens: 500
  },

  // UI Theme Colors
  THEME: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#2196F3',
    headerBg: '#1a1a2e',
    headerText: '#ffffff',
    rowAlt: '#f8f9fa'
  },

  // Column Header Definitions for Each Sheet
  COLUMNS: {
    MASTER_DB: [
      // Identity & Source
      'Deal ID', 'Source Platform', 'Listing URL', 'Address', 'City', 'State', 'ZIP',
      'County', 'Lat', 'Lng', 'Imported At', 'Lead Arrival Timestamp', 'Source Campaign',
      // Property Basics
      'Asking Price', 'Beds', 'Baths', 'Sqft', 'Lot Size', 'Year Built', 'Property Type',
      // Seller Signals
      'Seller Type', 'Motivation Signals', 'Seller Psychology Profile', 'Contact Quality Score',
      // Market Intelligence
      'DOM', 'Sales Velocity Score', 'Exit Speed Tier', 'Exit Risk Tier', 'SOM Score',
      'Market Heat Score',
      // Costs & Rehab
      'Repair Complexity Tier', 'Est Rehab Low', 'Est Rehab High', 'Repair Risk Score',
      // Exit Values
      'ARV', 'Zestimate', 'Comp Confidence Score',
      // P6 FIX: Mortgage Data for Creative Finance (optional inputs)
      'Existing Mortgage Balance', 'Existing Monthly Payment', 'Existing Interest Rate', 'Mortgage Data Source',
      // MAO Variants
      'MAO Flip', 'MAO STR', 'MAO MTR', 'MAO LTR', 'MAO Creative', 'MAO Final',
      // Strategy Outputs - P7 FIX: Multi-Exit Summary persisted here
      'Best Strategy', 'Strategy Rationale', 'Multi-Exit Summary',
      // Offer Engine
      'Offer Type Recommended', 'Offer Price Target', 'Offer Terms Summary', 'Offer Risk Notes',
      // Verdict
      'Deal Score', 'Risk Score', 'Verdict', 'Next Action', 'Priority Rank',
      // Messaging
      'Seller Message', 'Follow-Up Tag', 'Deniability Angle',
      // Workflow / CRM
      'Status Stage', 'Assigned To', 'CRM Synced', 'CRM Record ID', 'Last Contacted At',
      'SLA Tier', 'SLA Status'
    ],

    STAGING: [
      'Source Platform', 'Listing URL', 'Address Raw', 'City', 'State', 'ZIP',
      'Price Raw', 'Beds Raw', 'Baths Raw', 'Sqft Raw', 'Lot Raw', 'Year Built Raw',
      'Description Raw', 'Agent/Seller Name', 'Phone/Email', 'Scrape Timestamp',
      'Scrape Job Link', 'Source Sheet Name', 'Processed'
    ],

    STR_ENGINE: [
      'Deal ID', 'Address', 'ADR', 'Occupancy %', 'Seasonality Index', 'Regulation Risk',
      'Furnish/Setup Cost', 'Cleaning Cost/Turn', 'Mgmt %', 'Platform Fees',
      'STR Monthly Gross', 'STR Monthly Net', 'STR Annual Net', 'Break-Even Occupancy',
      'STR Cash-on-Cash', 'STR Score', 'STR Verdict'
    ],

    MTR_ENGINE: [
      'Deal ID', 'Address', 'Furnished Monthly Rent', 'Avg Stay Length', 'Turns Per Year',
      'Vacancy Smoothing Score', 'Utilities Bundle Cost', 'Furniture Amortization',
      'Mgmt %', 'MTR Monthly Gross', 'MTR Monthly Net', 'MTR Annual Net',
      'MTR Stability Score', 'MTR Advantage Index', 'MTR Score', 'MTR Verdict'
    ],

    LTR_ENGINE: [
      'Deal ID', 'Address', 'Market Rent', 'Vacancy %', 'Effective Gross Income',
      'Maintenance Reserve %', 'Taxes', 'Insurance', 'CapEx Reserve', 'PM Fee',
      'Total Operating Expenses', 'NOI Monthly', 'NOI Annual', 'DSCR',
      'LTR Monthly Net', 'LTR Cash-on-Cash', 'Hold Quality Score', 'Rent Growth Potential',
      'LTR Score', 'LTR Verdict'
    ],

    FLIP_ENGINE: [
      'Deal ID', 'Address', 'ARV', 'Purchase Price', 'Rehab Low', 'Rehab High', 'Rehab Mid',
      'Holding Months', 'Holding Cost', 'Agent Fees', 'Closing Costs', 'Total Costs',
      'Profit if Rehab Low', 'Profit if Rehab High', 'Profit if Rehab Mid',
      'ROI if Rehab Mid', 'DOM', 'Velocity Score', 'Exit Risk', 'Flip Score', 'Flip Verdict'
    ],

    CREATIVE_ENGINE: [
      // P6 FIX: Mortgage data with ASSUMED/KNOWN flag
      'Deal ID', 'Address', 'Asking Price', 'ARV', 'Mortgage Balance [Source]',
      'Existing Monthly Payment', 'Existing Interest Rate',
      // Sub2
      'Sub2 Viable', 'Sub2 Entry Cost', 'Sub2 Monthly Cash Flow', 'Sub2 Equity Position',
      'Sub2 Risk Score', 'Sub2 Notes',
      // Wrap
      'Wrap Viable', 'Wrap Spread', 'Wrap Monthly Cash Flow', 'Wrap Down Payment',
      'Wrap Risk Score', 'Wrap Notes',
      // Seller Carry
      'Carry Viable', 'Carry Terms', 'Carry Monthly Payment', 'Carry Risk Score', 'Carry Notes',
      // Lease Option
      'LO Viable', 'LO Option Fee', 'LO Monthly Rent', 'LO Rent Credit', 'LO Strike Price',
      'LO Risk Score', 'LO Notes',
      // Hybrid
      'Hybrid Viable', 'Hybrid Structure', 'Hybrid Notes',
      // Summary
      'Best Creative Strategy', 'Creative Score', 'Creative Verdict'
    ],

    VERDICT: [
      'Rank', 'Deal ID', 'Address', 'City', 'ZIP', 'Asking Price', 'ARV',
      'Deal Score', 'Risk Score', 'Verdict', 'Best Strategy', 'Offer Type',
      'Offer Target', 'Exit Speed Tier', 'SOM Score', 'SLA Status',
      'Institutional Grade', 'Disposition Priority',
      'Next Action', 'Seller Message Preview', 'Action Link'
    ],

    OFFERS: [
      'Deal ID', 'Address', 'Offer Type', 'Offer Price', 'Terms Summary',
      'Cash Offer', 'Sub2 Terms', 'Wrap Terms', 'Seller Carry Terms', 'Lease Option Terms',
      'Hybrid Terms', 'Risk Notes', 'Sent Date', 'Response', 'Counter Terms',
      'Status', 'Notes', 'Contract Sent', 'Buyer Assigned'
    ],

    BUYER_DATABASE: [
      'Buyer ID', 'Buyer Name', 'Company', 'Email', 'Phone', 'ZIPs',
      'Strategy Preference', 'Budget Min', 'Budget Max', 'Min DSCR', 'Yield Preference',
      'Risk Tolerance', 'Preferred Property Types', 'Active', 'Last Deal Date',
      'Total Deals Closed', 'Notes'
    ],

    BUYER_MATCHING: [
      'Deal ID', 'Address', 'Best Strategy', 'Asking Price', 'ARV',
      'ZIP', 'Property Type', 'Match 1 Buyer', 'Match 1 Score', 'Match 2 Buyer',
      'Match 2 Score', 'Match 3 Buyer', 'Match 3 Score', 'Suggested Dispo Action',
      'Matched At', 'Dispo Status'
    ],

    POST_SALE: [
      'Deal ID', 'Address', 'Strategy Used', 'Projected Sale Price', 'Actual Sale Price',
      'Price Variance', 'Projected Rent', 'Actual Rent', 'Rent Variance',
      'Projected Timeline Days', 'Actual Timeline Days', 'Timeline Variance',
      'Projected Profit', 'Actual Profit', 'Profit Variance',
      'Close Date', 'Notes', 'Lessons Learned', 'Tune Recommendations'
    ],

    REPAIR_ESTIMATOR: [
      'Deal ID', 'Address', 'Year Built', 'Sqft', 'Property Type',
      'Condition Notes', 'Roof', 'HVAC', 'Plumbing', 'Electrical', 'Foundation',
      'Kitchen', 'Bathrooms', 'Flooring', 'Paint', 'Windows/Doors', 'Exterior',
      'Landscaping', 'Other', 'Complexity Tier', 'Rehab Low', 'Rehab High',
      'Rehab Mid', 'Risk Score', 'Notes'
    ],

    SETTINGS: [
      'Setting Name', 'Value', 'Type', 'Description', 'Last Updated'
    ],

    SYSTEM_LOG: [
      'Timestamp', 'Category', 'Message', 'Details'
    ],

    ERROR_LOG: [
      'Timestamp', 'Module', 'Error Message', 'Stack Trace', 'Resolved'
    ],

    SYNC_LOG: [
      'Timestamp', 'CRM System', 'Action', 'Record ID', 'Status', 'Details'
    ],

    // ── Institutional Disposition Layer Columns ──

    INST_BUYERS: [
      'Buyer ID', 'Buyer Name', 'Buyer Type', 'Primary Contact Name', 'Primary Contact Title',
      'Email', 'Phone', 'Company', 'Website', 'Target Market State', 'Target Market City',
      'Preferred ZIP Codes', 'Asset Type', 'Preferred Strategy', 'Min Price', 'Max Price',
      'Min Beds', 'Max Beds', 'Min Baths', 'Max Baths', 'Min Sq Ft', 'Max Sq Ft',
      'Year Built Minimum', 'Condition Preference', 'Occupancy Preference',
      'Min Rent', 'Min Cap Rate', 'Min Cash-on-Cash Return', 'Max Rehab Budget',
      'Preferred Neighborhood Grade', 'Landlord Friendly Only?', 'Wants Tenant Occupied?',
      'Wants Vacant?', 'Bulk Buyer?', 'Minimum Portfolio Size', 'Maximum Portfolio Size',
      'Preferred Deal Class', 'Accepts Off-Market?', 'Accepts Assigned Contracts?',
      'Cash Buyer?', 'Proof of Funds On File?', 'Priority Score', 'Warmth Status',
      'Last Contacted', 'Last Response', 'Buyer Status',
      // Buyer relationship intelligence
      'Deals Sent', 'Deals Responded', 'Deals Closed', 'Response Rate',
      'Close Rate', 'Avg Response Time (hrs)', 'Buyer Reliability Tier',
      'Acquisition Notes', 'Disposition Notes', 'Tags'
    ],

    INST_BUY_BOX_MATCHER: [
      'Match ID', 'Deal ID', 'Address', 'City', 'State', 'ZIP',
      'Buyer ID', 'Buyer Name', 'Buyer Type', 'Strategy Type',
      'Asking Price', 'Offer Target', 'Estimated Rent', 'Cap Rate', 'Cash-on-Cash Return',
      'Beds', 'Baths', 'Sq Ft', 'Year Built', 'Condition', 'Occupancy',
      'Neighborhood Grade', 'Rehab Estimate', 'Deal Classifier', 'Institutional Grade',
      'Portfolio Eligible', 'Buy Box Match Score', 'Match Reason',
      'Primary Match Flags', 'Disqualifying Flags', 'Disposition Priority',
      'Recommended Buyer Action', 'Ready to Send?', 'Sent?', 'Sent Date',
      'Response Status', 'Notes'
    ],

    INST_DEAL_PACKAGE: [
      'Package ID', 'Deal ID', 'Address', 'City', 'State', 'ZIP', 'Property Type',
      'Strategy Type', 'Beds', 'Baths', 'Sq Ft', 'Lot Size', 'Year Built',
      'Occupancy', 'Lease Status', 'Monthly Rent', 'Annual Rent',
      'Asking Price', 'Offer Price', 'Estimated Rehab', 'Estimated Total Investment',
      'Estimated ARV', 'Estimated Exit Value', 'Cap Rate', 'Cash-on-Cash Return',
      'Projected Equity Spread', 'Projected Profit', 'Neighborhood Grade',
      'School Rating', 'Crime Indicator', 'Landlord Friendly Score',
      'Market Strength Score', 'Sales Velocity Score', 'Institutional Grade',
      'Portfolio Group ID', 'Portfolio Eligible', 'Deal Classifier', 'Risk Rating',
      'Primary Value Drivers', 'Primary Risk Flags', 'Listing URL', 'Photo Link',
      'Map Link', 'Analyst Notes', 'AI Summary',
      'Package Completeness Score', 'Package Ready?', 'Disposition Status'
    ],

    INST_PORTFOLIO_BUILDER: [
      'Portfolio Group ID', 'Portfolio Name', 'Deal Count', 'State', 'City',
      'ZIP Cluster', 'Asset Type Mix', 'Strategy Mix', 'Average Asking Price',
      'Average Offer Price', 'Average Rent', 'Average Cap Rate',
      'Average Cash-on-Cash Return', 'Average Rehab', 'Average Sq Ft',
      'Total Estimated Portfolio Cost', 'Total Estimated Annual Rent',
      'Total Estimated Profit', 'Portfolio Risk Rating', 'Portfolio Strength Rating',
      'Institutional Appeal Score', 'Bulk Buyer Fit', 'Geographic Consistency',
      'Occupancy Mix', 'Neighborhood Consistency', 'Package Status',
      'Assigned Buyer Targets', 'Notes'
    ],

    INST_DISPOSITION_TRACKER: [
      'Disposition ID', 'Deal ID', 'Address', 'Buyer ID', 'Buyer Name', 'Buyer Type',
      'Contact Name', 'Email', 'Phone', 'Matched By System?', 'Disposition Tier',
      'Sent Package?', 'Sent Date', 'Last Follow-Up', 'Follow-Up Count',
      'Response Status', 'Interest Level', 'Negotiation Status', 'Offer Received',
      'Counter Sent', 'Final Terms', 'Closed?', 'Pass Reason',
      'Next Action', 'Assigned To', 'Notes'
    ],

    // Additional columns to add to Master DB for institutional support
    MASTER_DB_INSTITUTIONAL: [
      'Institutional Grade', 'Institutional Grade Score', 'Portfolio Eligible',
      'Portfolio Group Suggestion', 'Cap Rate', 'Cash-on-Cash Return',
      'Estimated Annual Rent', 'Neighborhood Grade', 'Landlord Friendly Score',
      'Institutional Buyer Fit', 'Best Buyer Type', 'Best Match Buyer',
      'Disposition Priority', 'Package Ready?', 'Disposition Status'
    ]
  }
};

// ============================================================
// CONFIGURATION HELPERS
// ============================================================

/**
 * Gets a setting value from the Settings sheet
 * @param {string} settingName - Name of the setting
 * @param {any} defaultValue - Default value if setting not found
 * @returns {any} Setting value
 */
function getSetting(settingName, defaultValue = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

    if (!settingsSheet) return defaultValue;

    const data = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === settingName) {
        return data[i][1] || defaultValue;
      }
    }
    return defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Sets a setting value in the Settings sheet
 * @param {string} settingName - Name of the setting
 * @param {any} value - Value to set
 */
function setSetting(settingName, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

  if (!settingsSheet) return;

  const data = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === settingName) {
      settingsSheet.getRange(i + 1, 2).setValue(value);
      settingsSheet.getRange(i + 1, 5).setValue(new Date());
      return;
    }
  }

  // Setting not found, add new row
  const lastRow = settingsSheet.getLastRow();
  settingsSheet.getRange(lastRow + 1, 1, 1, 5).setValues([
    [settingName, value, 'custom', '', new Date()]
  ]);
}

/**
 * Gets velocity tier based on DOM
 * @param {number} dom - Days on Market
 * @returns {Object} Velocity tier object
 */
function getVelocityTier(dom) {
  if (dom <= CONFIG.VELOCITY.FAST.maxDOM) return CONFIG.VELOCITY.FAST;
  if (dom <= CONFIG.VELOCITY.MODERATE.maxDOM) return CONFIG.VELOCITY.MODERATE;
  if (dom <= CONFIG.VELOCITY.SLOW.maxDOM) return CONFIG.VELOCITY.SLOW;
  return CONFIG.VELOCITY.STALE;
}

/**
 * Gets exit risk tier based on score
 * @param {number} riskScore - Risk score (0-100)
 * @returns {Object} Exit risk tier object
 */
function getExitRiskTier(riskScore) {
  if (riskScore <= CONFIG.EXIT_RISK.LOW.maxScore) return CONFIG.EXIT_RISK.LOW;
  if (riskScore <= CONFIG.EXIT_RISK.MODERATE.maxScore) return CONFIG.EXIT_RISK.MODERATE;
  if (riskScore <= CONFIG.EXIT_RISK.HIGH.maxScore) return CONFIG.EXIT_RISK.HIGH;
  return CONFIG.EXIT_RISK.CRITICAL;
}

/**
 * Gets SOM tier based on saturation score
 * @param {number} somScore - SOM score (0-100)
 * @returns {Object} SOM tier object
 */
function getSOMTier(somScore) {
  if (somScore <= CONFIG.SOM.LOW.maxScore) return CONFIG.SOM.LOW;
  if (somScore <= CONFIG.SOM.MODERATE.maxScore) return CONFIG.SOM.MODERATE;
  if (somScore <= CONFIG.SOM.HIGH.maxScore) return CONFIG.SOM.HIGH;
  return CONFIG.SOM.SATURATED;
}

/**
 * Gets Speed-to-Lead SLA tier
 * @param {number} minutes - Minutes since lead arrival
 * @returns {Object} SLA tier object
 */
function getSLATier(minutes) {
  if (minutes <= CONFIG.SPEED_TO_LEAD.TIER_1.maxMinutes) return CONFIG.SPEED_TO_LEAD.TIER_1;
  if (minutes <= CONFIG.SPEED_TO_LEAD.TIER_2.maxMinutes) return CONFIG.SPEED_TO_LEAD.TIER_2;
  if (minutes <= CONFIG.SPEED_TO_LEAD.TIER_3.maxMinutes) return CONFIG.SPEED_TO_LEAD.TIER_3;
  return CONFIG.SPEED_TO_LEAD.BREACH;
}

/**
 * Gets verdict based on deal score
 * @param {number} score - Deal score (0-100)
 * @returns {Object} Verdict object with label and action
 */
function getVerdict(score) {
  if (score >= CONFIG.VERDICT.HOT.minScore) return { verdict: 'HOT', ...CONFIG.VERDICT.HOT };
  if (score >= CONFIG.VERDICT.SOLID.minScore) return { verdict: 'SOLID', ...CONFIG.VERDICT.SOLID };
  if (score >= CONFIG.VERDICT.HOLD.minScore) return { verdict: 'HOLD', ...CONFIG.VERDICT.HOLD };
  return { verdict: 'PASS', ...CONFIG.VERDICT.PASS };
}

/**
 * Gets repair tier based on complexity
 * @param {string} complexity - Complexity level
 * @returns {Object} Repair tier object
 */
function getRepairTier(complexity) {
  const upperComplexity = (complexity || 'MODERATE').toUpperCase();
  return CONFIG.REPAIR[upperComplexity] || CONFIG.REPAIR.MODERATE;
}

// ============================================================
// CACHED DATA HELPERS
// ============================================================

/**
 * Cache manager for frequently accessed data
 */
const CacheManager = {
  cache: CacheService.getScriptCache(),

  /**
   * Get cached value
   */
  get: function(key) {
    const value = this.cache.get(key);
    return value ? JSON.parse(value) : null;
  },

  /**
   * Set cached value
   */
  set: function(key, value, expirationInSeconds = 300) {
    this.cache.put(key, JSON.stringify(value), expirationInSeconds);
  },

  /**
   * Clear specific key
   */
  clear: function(key) {
    this.cache.remove(key);
  },

  /**
   * Clear all cached data
   */
  clearAll: function() {
    this.cache.removeAll(['settings', 'buyers', 'zipVelocity']);
  }
};
