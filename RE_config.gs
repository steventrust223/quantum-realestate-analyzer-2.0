/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏡 QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RE_config.gs - Central Configuration File
 *
 * All sheet names, column headers, color schemes, and default settings
 * are defined here to maintain consistency across the entire system.
 *
 * @author   Your Senior System Architect
 * @version  2.0
 */

// ═══════════════════════════════════════════════════════════════════════════
// SHEET NAMES
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAMES = {
  // Import / Raw Leads
  LEADS_WEB: 'LEADS_WEB',
  LEADS_SCRAPED: 'LEADS_SCRAPED',
  LEADS_DIRECT: 'LEADS_DIRECT',

  // Core Analysis
  MASTER_PROPERTIES: 'MASTER_PROPERTIES',
  MAO_ENGINE: 'MAO_ENGINE',
  DEAL_CLASSIFIER: 'DEAL_CLASSIFIER',
  EXIT_STRATEGY: 'EXIT_STRATEGY',
  BUYER_MATCH: 'BUYER_MATCH',

  // Market & Velocity
  MARKET_DATA: 'MARKET_DATA',
  SALES_VELOCITY: 'SALES_VELOCITY',
  MARKET_VOLUME_SCORE: 'MARKET_VOLUME_SCORE',

  // Supporting Sheets
  LEADS_TRACKER: 'LEADS_TRACKER',
  BUYERS_DB: 'BUYERS_DB',
  OFFERS_DISPO: 'OFFERS_DISPO',
  SETTINGS: 'SETTINGS',
  SYSTEM_LOG: 'SYSTEM_LOG',
  DASHBOARD_ANALYTICS: 'DASHBOARD_ANALYTICS'
};

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN HEADERS
// ═══════════════════════════════════════════════════════════════════════════

const HEADERS = {

  // ─────────────────────────────────────────────────────────────────────────
  // LEADS_WEB
  // ─────────────────────────────────────────────────────────────────────────
  LEADS_WEB: [
    'Lead ID',
    'Timestamp',
    'Source',
    'Campaign',
    'Ad Set',
    'Seller Name',
    'Phone',
    'Email',
    'Address',
    'City',
    'State',
    'ZIP',
    'Property Type',
    'Asking Price',
    'Motivation Level',
    'Best Contact Time',
    'Notes',
    'Imported to Master',
    'Import Date'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // LEADS_SCRAPED
  // ─────────────────────────────────────────────────────────────────────────
  LEADS_SCRAPED: [
    'Lead ID',
    'Timestamp',
    'List Source',
    'Scrape Date',
    'Owner Name',
    'Phone',
    'Email',
    'Property Address',
    'City',
    'State',
    'ZIP',
    'County',
    'Property Type',
    'Beds',
    'Baths',
    'Sqft',
    'Year Built',
    'Assessed Value',
    'Notes',
    'Imported to Master',
    'Import Date'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // LEADS_DIRECT
  // ─────────────────────────────────────────────────────────────────────────
  LEADS_DIRECT: [
    'Lead ID',
    'Entry Date',
    'Entry Method',
    'Seller Name',
    'Phone',
    'Email',
    'Address',
    'City',
    'State',
    'ZIP',
    'County',
    'Property Type',
    'Beds',
    'Baths',
    'Sqft',
    'Year Built',
    'Asking Price',
    'Motivation Level',
    'Occupancy Status',
    'Notes',
    'Imported to Master',
    'Import Date'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // MASTER_PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────
  MASTER_PROPERTIES: [
    'Property ID',
    'Import Source',
    'Lead ID',
    'Address',
    'City',
    'State',
    'ZIP',
    'County',
    'Property Type',
    'Beds',
    'Baths',
    'Sqft',
    'Year Built',
    'Occupancy Status',
    'Asking Price',
    'Estimated ARV',
    'Repair Estimate (Light)',
    'Repair Estimate (Full)',
    'Chosen Repair Budget',
    'Total All-In Cost',
    'MAO',
    'Suggested Initial Offer',
    'Max Wholesale Fee',
    'Equity %',
    'Profit Potential',
    'Profit Margin %',
    'Motivation Level',
    'Lead Score',
    'Risk Score',
    'Deal Class',
    'Market Volume Score',
    'Sales Velocity Score',
    'Exit Strategy',
    'Hazard Flags',
    'Seller Name',
    'Seller Phone',
    'Seller Email',
    'Best Contact Time',
    'Notes',
    'Status',
    'Last Updated',
    'Created Date'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // MAO_ENGINE
  // ─────────────────────────────────────────────────────────────────────────
  MAO_ENGINE: [
    'Property ID',
    'Address',
    'ARV',
    'Repair Type',
    'Repair Estimate',
    'Holding Months',
    'Holding Costs / mo',
    'Total Holding Costs',
    'Closing Cost %',
    'Closing Cost $',
    'Assignment / Wholesale Fee',
    'Target Profit',
    'Total Costs',
    'MAO',
    'Suggested Initial Offer',
    'Counter Offer Range Low',
    'Counter Offer Range High',
    'Max Offer % of ARV',
    'Strategy Notes',
    'Last Calculated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // DEAL_CLASSIFIER
  // ─────────────────────────────────────────────────────────────────────────
  DEAL_CLASSIFIER: [
    'Property ID',
    'Address',
    'Profit Potential',
    'Profit Margin %',
    'Risk Score',
    'Market Volume Score',
    'Sales Velocity Score',
    'Equity %',
    'Hazard Flags',
    'Deal Class',
    'Reason / Notes',
    'Last Classified'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // EXIT_STRATEGY
  // ─────────────────────────────────────────────────────────────────────────
  EXIT_STRATEGY: [
    'Property ID',
    'Address',
    'ARV',
    'Repair Estimate',
    'Equity %',
    'Market Volume Score',
    'Sales Velocity Score',
    'Estimated Rent',
    'Cash Flow Potential',
    'Condition',
    'Primary Exit Strategy',
    'Secondary Exit Strategy',
    'Strategy Reason',
    'Expected Timeline',
    'Expected Profit',
    'Notes',
    'Last Analyzed'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // BUYER_MATCH
  // ─────────────────────────────────────────────────────────────────────────
  BUYER_MATCH: [
    'Property ID',
    'Address',
    'ZIP',
    'Area Type',
    'ARV',
    'ARV Range',
    'Exit Strategy',
    'Matched Buyer IDs',
    'Best Buyer ID',
    'Best Buyer Name',
    'Match Score',
    'Match Criteria Met',
    'Notes',
    'Last Matched'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // MARKET_DATA
  // ─────────────────────────────────────────────────────────────────────────
  MARKET_DATA: [
    'ZIP',
    'City',
    'County',
    'Area Type',
    'Median DOM',
    'Avg DOM',
    'Sales Per Month',
    'Price Low',
    'Price Median',
    'Price High',
    'Volume Trend',
    'Market Heat',
    'Last Updated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // SALES_VELOCITY
  // ─────────────────────────────────────────────────────────────────────────
  SALES_VELOCITY: [
    'Property ID',
    'Address',
    'ZIP',
    'ARV',
    'Price Point Tier',
    'DOM Estimate',
    'Sales Volume Score',
    'Velocity Score',
    'Velocity Tier',
    'Notes',
    'Last Calculated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // MARKET_VOLUME_SCORE
  // ─────────────────────────────────────────────────────────────────────────
  MARKET_VOLUME_SCORE: [
    'ZIP',
    'Area Type',
    'Sales Per Month',
    'Inventory Level',
    'Volume Score',
    'Heat Level',
    'Liquidity Rating',
    'Notes',
    'Last Updated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // LEADS_TRACKER
  // ─────────────────────────────────────────────────────────────────────────
  LEADS_TRACKER: [
    'Lead ID',
    'Property ID',
    'Seller Name',
    'Phone',
    'Email',
    'Source',
    'Stage',
    'Temperature',
    'Contact Attempts',
    'Last Contact Date',
    'Last Contact Method',
    'Next Action Date',
    'Next Action Type',
    'Outcome',
    'Notes',
    'Created Date',
    'Last Updated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // BUYERS_DB
  // ─────────────────────────────────────────────────────────────────────────
  BUYERS_DB: [
    'Buyer ID',
    'Name',
    'Company',
    'Phone',
    'Email',
    'Markets (ZIPs)',
    'Markets (Cities)',
    'Price Range Low',
    'Price Range High',
    'Strategy Preference',
    'Property Types',
    'Max Repair Level',
    'Criteria Notes',
    'Status',
    'Last Deal Date',
    'Total Deals',
    'Rating',
    'Notes',
    'Created Date',
    'Last Updated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // OFFERS_DISPO
  // ─────────────────────────────────────────────────────────────────────────
  OFFERS_DISPO: [
    'Offer ID',
    'Property ID',
    'Address',
    'Seller Name',
    'Offer Amount',
    'Offer Date',
    'Offer Type',
    'Status',
    'Seller Response',
    'Counter Offer',
    'Accepted Amount',
    'Assignment Fee',
    'Buyer ID',
    'Buyer Name',
    'Close Date',
    'Final Profit',
    'Notes',
    'Last Updated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  SETTINGS: [
    'Setting Key',
    'Setting Value',
    'Description',
    'Category',
    'Last Updated'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM_LOG
  // ─────────────────────────────────────────────────────────────────────────
  SYSTEM_LOG: [
    'Timestamp',
    'Event Type',
    'Module',
    'Message',
    'Details',
    'User'
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD_ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────
  DASHBOARD_ANALYTICS: [
    'Metric',
    'Value',
    'Previous Value',
    'Change',
    'Category',
    'Last Updated'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// COLOR SCHEMES & FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Header colors
  HEADER_BG: '#1a237e',           // Deep blue
  HEADER_TEXT: '#ffffff',         // White

  // Sheet tab colors
  TAB_LEADS: '#ff9800',           // Orange
  TAB_CORE: '#2196f3',            // Blue
  TAB_MARKET: '#4caf50',          // Green
  TAB_SUPPORT: '#9c27b0',         // Purple
  TAB_SYSTEM: '#607d8b',          // Blue Grey

  // Row banding
  BAND_COLOR_1: '#f5f5f5',        // Light grey
  BAND_COLOR_2: '#ffffff',        // White

  // Deal class colors
  HOT_DEAL: '#4caf50',            // Green
  SOLID: '#2196f3',               // Blue
  PORTFOLIO: '#ff9800',           // Orange
  PASS: '#f44336',                // Red

  // Status colors
  ACTIVE: '#4caf50',              // Green
  PENDING: '#ff9800',             // Orange
  DEAD: '#9e9e9e',                // Grey

  // Temperature colors
  HOT: '#f44336',                 // Red
  WARM: '#ff9800',                // Orange
  COLD: '#2196f3'                 // Blue
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SETTINGS = {
  // MAO Calculation Settings
  'mao.wholesale.maxOfferPercent': { value: 70, description: 'Max offer % of ARV for wholesale', category: 'MAO' },
  'mao.wholesale.targetProfit': { value: 15000, description: 'Target profit for wholesale deals', category: 'MAO' },
  'mao.wholesale.assignmentFee': { value: 10000, description: 'Typical assignment/wholesale fee', category: 'MAO' },
  'mao.sub2.maxOfferPercent': { value: 85, description: 'Max offer % of ARV for Sub2', category: 'MAO' },
  'mao.wrap.maxOfferPercent': { value: 80, description: 'Max offer % of ARV for wraparound', category: 'MAO' },
  'mao.closingCostPercent': { value: 3, description: 'Closing cost % of purchase', category: 'MAO' },
  'mao.holdingCostsPerMonth': { value: 1000, description: 'Default holding costs per month', category: 'MAO' },
  'mao.lightRepairMultiplier': { value: 15, description: 'Light repair: $/sqft', category: 'MAO' },
  'mao.fullRepairMultiplier': { value: 35, description: 'Full repair: $/sqft', category: 'MAO' },

  // Deal Classification Thresholds
  'classify.hotDeal.minProfit': { value: 25000, description: 'Min profit for HOT DEAL', category: 'Classification' },
  'classify.hotDeal.minMargin': { value: 15, description: 'Min margin % for HOT DEAL', category: 'Classification' },
  'classify.hotDeal.maxRisk': { value: 60, description: 'Max risk score for HOT DEAL', category: 'Classification' },
  'classify.solid.minProfit': { value: 15000, description: 'Min profit for SOLID deal', category: 'Classification' },
  'classify.solid.minMargin': { value: 10, description: 'Min margin % for SOLID deal', category: 'Classification' },
  'classify.solid.maxRisk': { value: 70, description: 'Max risk score for SOLID deal', category: 'Classification' },
  'classify.portfolio.minProfit': { value: 8000, description: 'Min profit for PORTFOLIO deal', category: 'Classification' },
  'classify.portfolio.minMargin': { value: 5, description: 'Min margin % for PORTFOLIO deal', category: 'Classification' },

  // Risk Scoring
  'risk.highRepair.threshold': { value: 50000, description: 'High repair threshold ($)', category: 'Risk' },
  'risk.lowEquity.threshold': { value: 15, description: 'Low equity threshold (%)', category: 'Risk' },
  'risk.highDOM.threshold': { value: 90, description: 'High days on market threshold', category: 'Risk' },
  'risk.lowVolume.threshold': { value: 10, description: 'Low sales volume threshold (sales/mo)', category: 'Risk' },

  // Market & Velocity
  'market.hotMarket.salesPerMonth': { value: 50, description: 'Hot market sales/month threshold', category: 'Market' },
  'market.coldMarket.salesPerMonth': { value: 10, description: 'Cold market sales/month threshold', category: 'Market' },
  'velocity.tierA.maxDOM': { value: 30, description: 'Velocity Tier A: max DOM', category: 'Velocity' },
  'velocity.tierB.maxDOM': { value: 60, description: 'Velocity Tier B: max DOM', category: 'Velocity' },
  'velocity.tierC.maxDOM': { value: 90, description: 'Velocity Tier C: max DOM', category: 'Velocity' },

  // Exit Strategy
  'exit.wholesale.minEquity': { value: 20, description: 'Min equity % for wholesale', category: 'Exit Strategy' },
  'exit.sub2.minEquity': { value: 10, description: 'Min equity % for Sub2', category: 'Exit Strategy' },
  'exit.str.minCashflow': { value: 500, description: 'Min monthly cashflow for STR', category: 'Exit Strategy' },
  'exit.mtr.minCashflow': { value: 300, description: 'Min monthly cashflow for MTR', category: 'Exit Strategy' },
  'exit.ltr.minCashflow': { value: 200, description: 'Min monthly cashflow for LTR', category: 'Exit Strategy' },
  'exit.rentEstimate.multiplier': { value: 0.008, description: 'Monthly rent = ARV × multiplier', category: 'Exit Strategy' },

  // Buyer Matching
  'buyer.match.minScore': { value: 60, description: 'Min match score to show buyer', category: 'Buyer Match' },

  // System
  'system.autoArchiveDays': { value: 180, description: 'Days before auto-archiving dead leads', category: 'System' },
  'system.logRetentionDays': { value: 90, description: 'Days to retain system logs', category: 'System' }
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & ENUMS
// ═══════════════════════════════════════════════════════════════════════════

const DEAL_CLASSES = {
  HOT: 'HOT DEAL',
  SOLID: 'SOLID',
  PORTFOLIO: 'PORTFOLIO',
  PASS: 'PASS'
};

const EXIT_STRATEGIES = {
  WHOLESALE: 'Wholesale',
  WHOLETAIL: 'Wholetail',
  SUB2: 'Sub2',
  WRAP: 'Wraparound',
  STR: 'STR',
  MTR: 'MTR',
  LTR: 'LTR',
  TRASH: 'Trash/Pass'
};

const LEAD_STAGES = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  FOLLOW_UP: 'Follow-up',
  UNDER_CONTRACT: 'Under Contract',
  DEAD: 'Dead'
};

const LEAD_TEMPERATURES = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold'
};

const PROPERTY_STATUSES = {
  NEW: 'New',
  ANALYZING: 'Analyzing',
  READY_TO_OFFER: 'Ready to Offer',
  OFFER_MADE: 'Offer Made',
  UNDER_CONTRACT: 'Under Contract',
  ASSIGNED: 'Assigned',
  CLOSED: 'Closed',
  DEAD: 'Dead'
};

const REPAIR_TYPES = {
  LIGHT: 'Light',
  FULL: 'Full',
  COSMETIC: 'Cosmetic',
  STRUCTURAL: 'Structural'
};

const VELOCITY_TIERS = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D'
};

const AREA_TYPES = {
  URBAN: 'Urban',
  SUBURBAN: 'Suburban',
  RURAL: 'Rural',
  WAR_ZONE: 'War Zone'
};

// ═══════════════════════════════════════════════════════════════════════════
// UI CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const UI_CONFIG = {
  SIDEBAR_WIDTH: 350,
  DIALOG_WIDTH: 600,
  DIALOG_HEIGHT: 500,

  // Control Center
  CONTROL_CENTER_TITLE: '🏡 Quantum RE Control Center',

  // Deal Review
  DEAL_REVIEW_TOP_N: 25,

  // Log display
  LOG_DISPLAY_ROWS: 5
};

// ═══════════════════════════════════════════════════════════════════════════
// HAZARD FLAGS
// ═══════════════════════════════════════════════════════════════════════════

const HAZARD_FLAGS = {
  NO_TITLE: 'No Title',
  LOW_EQUITY: 'Low Equity',
  HIGH_REHAB: 'High Rehab',
  WAR_ZONE: 'War Zone',
  STRUCTURAL: 'Structural Issues',
  FLOOD_ZONE: 'Flood Zone',
  HIGH_CRIME: 'High Crime Area',
  LOW_LIQUIDITY: 'Low Liquidity',
  OVERPRICED: 'Overpriced',
  TITLE_ISSUES: 'Title Issues'
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

// Make config available to other modules
// (In Apps Script, global variables are accessible across all .gs files)
