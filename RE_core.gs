/**
 * ================================================================
 * QUANTUM REAL ESTATE ANALYZER v2.0 - Core Configuration
 * ================================================================
 * Enterprise-grade real estate investment analysis system
 * Author: Quantum RE Analytics Team
 * License: MIT
 */

// ============================================================================
// SHEET CONFIGURATION
// ============================================================================

const SHEET_NAMES = {
  MASTER_PROPERTIES: 'MASTER_PROPERTIES',
  VERDICT: 'VERDICT',
  SYSTEM_LOG: 'SYSTEM_LOG',
  CONFIG: 'CONFIG',
  LEADS_PREFIX: 'LEADS_'
};

const MASTER_HEADERS = [
  'Property ID',
  'Address',
  'City',
  'State',
  'ZIP',
  'Price',
  'Bedrooms',
  'Bathrooms',
  'Sqft',
  'Lot Size',
  'Year Built',
  'Property Type',
  'Status',
  'Lead Source',
  'Date Added',
  'Last Updated',
  'ARV',
  'Estimated Repairs',
  'MAO',
  'Profit Potential',
  'Risk Score',
  'Notes'
];

const VERDICT_HEADERS = [
  'Property ID',
  'Address',
  'City',
  'State',
  'Classification',
  'Deal Score',
  'MAO',
  'Asking Price',
  'Spread',
  'ARV',
  'Repair Estimate',
  'Profit Potential',
  'Risk Score',
  'Under Contract',
  'Contract Date',
  'Buyer',
  'Action Items',
  'Last Analyzed',
  'Priority'
];

const LOG_HEADERS = [
  'Timestamp',
  'Event Type',
  'Module',
  'Message',
  'Details',
  'User'
];

// ============================================================================
// CLASSIFICATION THRESHOLDS
// ============================================================================

const DEAL_THRESHOLDS = {
  HOT: {
    minSpread: 25000,
    minProfitPercent: 20,
    maxRiskScore: 3
  },
  SOLID: {
    minSpread: 15000,
    minProfitPercent: 12,
    maxRiskScore: 5
  },
  MARGINAL: {
    minSpread: 8000,
    minProfitPercent: 8,
    maxRiskScore: 7
  }
};

const RISK_FACTORS = {
  HIGH_REPAIR: { threshold: 50000, points: 2 },
  FOUNDATION_ISSUES: { keywords: ['foundation', 'structural'], points: 3 },
  LEGAL_ISSUES: { keywords: ['probate', 'lien', 'foreclosure'], points: 2 },
  LOCATION: { keywords: ['high crime', 'flood zone'], points: 2 },
  AGE: { threshold: 1950, points: 1 }
};

// ============================================================================
// ANALYSIS PARAMETERS
// ============================================================================

const ANALYSIS_CONFIG = {
  DEFAULT_ARV_MULTIPLIER: 0.70,
  HOLDING_COSTS_MONTHLY: 1500,
  AVG_HOLDING_MONTHS: 6,
  CLOSING_COSTS_PERCENT: 0.03,
  MIN_PROFIT_MARGIN: 10000,
  REPAIR_ESTIMATE_SQF: 25 // dollars per sqft for default repair estimate
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get or create a sheet with headers
 * @param {string} sheetName - Name of the sheet
 * @param {Array} headers - Array of header strings
 * @return {Sheet} The sheet object
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1a237e')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    logEvent('SYSTEM', 'Core', `Created new sheet: ${sheetName}`);
  }

  return sheet;
}

/**
 * Log an event to the SYSTEM_LOG sheet
 * @param {string} eventType - Type of event (INFO, WARNING, ERROR, SUCCESS)
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {string} details - Optional additional details
 */
function logEvent(eventType, module, message, details = '') {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.SYSTEM_LOG, LOG_HEADERS);
    const timestamp = new Date();
    const user = Session.getActiveUser().getEmail() || 'System';

    sheet.appendRow([timestamp, eventType, module, message, details, user]);

    // Auto-cleanup: keep only last 1000 logs
    const lastRow = sheet.getLastRow();
    if (lastRow > 1001) {
      sheet.deleteRows(2, lastRow - 1001);
    }
  } catch (error) {
    // Silent fail for logging errors to prevent infinite loops
    console.error('Logging failed:', error);
  }
}

/**
 * Safe string conversion
 * @param {*} value - Value to convert
 * @return {string} String representation
 */
function safeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Safe number conversion
 * @param {*} value - Value to convert
 * @param {number} defaultValue - Default if conversion fails
 * @return {number} Number value
 */
function safeNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Safe date conversion
 * @param {*} value - Value to convert
 * @return {Date|null} Date object or null
 */
function safeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

/**
 * Format currency
 * @param {number} value - Number to format
 * @return {string} Formatted currency string
 */
function formatCurrency(value) {
  const num = safeNumber(value, 0);
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} whole - Whole value
 * @return {number} Percentage
 */
function calculatePercent(part, whole) {
  if (!whole || whole === 0) return 0;
  return (part / whole) * 100;
}

/**
 * Get sheet data as objects
 * @param {Sheet} sheet - Sheet to read
 * @return {Array<Object>} Array of row objects
 */
function getSheetData(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];

  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    return data.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  } catch (error) {
    logEvent('ERROR', 'Core', 'Error reading sheet data', error.toString());
    return [];
  }
}

/**
 * Generate unique property ID
 * @param {string} address - Property address
 * @param {string} zip - ZIP code
 * @return {string} Unique ID
 */
function generatePropertyID(address, zip) {
  const clean = safeString(address).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const timestamp = Date.now();
  return `QRE-${zip}-${clean.substring(0, 10)}-${timestamp.toString(36)}`;
}

/**
 * Initialize all required sheets
 */
function initializeSheets() {
  try {
    logEvent('INFO', 'Core', 'Initializing sheet structure...');

    getOrCreateSheet(SHEET_NAMES.MASTER_PROPERTIES, MASTER_HEADERS);
    getOrCreateSheet(SHEET_NAMES.VERDICT, VERDICT_HEADERS);
    getOrCreateSheet(SHEET_NAMES.SYSTEM_LOG, LOG_HEADERS);
    getOrCreateSheet(SHEET_NAMES.CONFIG, ['Setting', 'Value', 'Description']);

    logEvent('SUCCESS', 'Core', 'All sheets initialized successfully');
    return true;
  } catch (error) {
    logEvent('ERROR', 'Core', 'Sheet initialization failed', error.toString());
    return false;
  }
}

/**
 * Get configuration value
 * @param {string} setting - Setting name
 * @param {*} defaultValue - Default value if not found
 * @return {*} Configuration value
 */
function getConfig(setting, defaultValue = null) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.CONFIG, ['Setting', 'Value', 'Description']);
    const data = getSheetData(sheet);
    const config = data.find(row => row['Setting'] === setting);
    return config ? config['Value'] : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Set configuration value
 * @param {string} setting - Setting name
 * @param {*} value - Value to set
 * @param {string} description - Optional description
 */
function setConfig(setting, value, description = '') {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.CONFIG, ['Setting', 'Value', 'Description']);
    const data = getSheetData(sheet);
    const existingIndex = data.findIndex(row => row['Setting'] === setting);

    if (existingIndex >= 0) {
      sheet.getRange(existingIndex + 2, 2).setValue(value);
      if (description) {
        sheet.getRange(existingIndex + 2, 3).setValue(description);
      }
    } else {
      sheet.appendRow([setting, value, description]);
    }
  } catch (error) {
    logEvent('ERROR', 'Core', 'Error setting config', error.toString());
  }
}
