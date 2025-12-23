/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Utility Functions (utils.gs)
 * ============================================================================
 *
 * Common utility functions used throughout the system.
 * Includes logging, validation, formatting, and helper functions.
 */

// =============================================================================
// LOGGING UTILITIES
// =============================================================================

/**
 * Logs a message to the System Health sheet and console
 * @param {string} component - System component name
 * @param {string} status - Status (SUCCESS, ERROR, WARNING, INFO)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata (optional)
 */
function logToSystem(component, status, message, metadata = {}) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.SYSTEM_HEALTH);

    if (!sheet) {
      Logger.log('System Health sheet not found, creating...');
      sheet = createSystemHealthSheet(ss);
    }

    const timestamp = new Date();
    const apiQuota = metadata.apiQuota || '';
    const errorCount = metadata.errorCount || (status === 'ERROR' ? 1 : 0);
    const warningCount = metadata.warningCount || (status === 'WARNING' ? 1 : 0);

    const row = [
      timestamp,
      component,
      status,
      message,
      apiQuota,
      errorCount,
      warningCount
    ];

    sheet.appendRow(row);

    // Also log to console for debugging
    Logger.log(`[${status}] ${component}: ${message}`);

    // Keep only last 1000 rows to prevent bloat
    trimSheet(sheet, 1000);
  } catch (e) {
    Logger.log('Error logging to system: ' + e.message);
  }
}

/**
 * Logs an error with stack trace
 * @param {string} component - Component name
 * @param {Error} error - Error object
 * @param {string} context - Additional context
 */
function logError(component, error, context = '') {
  const message = context ? `${context}: ${error.message}` : error.message;
  logToSystem(component, 'ERROR', message, {
    stack: error.stack,
    errorCount: 1
  });
}

/**
 * Logs a warning
 * @param {string} component - Component name
 * @param {string} message - Warning message
 */
function logWarning(component, message) {
  logToSystem(component, 'WARNING', message, { warningCount: 1 });
}

/**
 * Logs an info message
 * @param {string} component - Component name
 * @param {string} message - Info message
 */
function logInfo(component, message) {
  logToSystem(component, 'INFO', message);
}

/**
 * Logs a success message
 * @param {string} component - Component name
 * @param {string} message - Success message
 */
function logSuccess(component, message) {
  logToSystem(component, 'SUCCESS', message);
}

// =============================================================================
// SHEET UTILITIES
// =============================================================================

/**
 * Gets a sheet by name, creating it if it doesn't exist
 * @param {string} sheetName - Name of the sheet
 * @param {Array} headers - Optional headers for new sheet
 * @returns {Sheet} Google Sheet object
 */
function getOrCreateSheet(sheetName, headers = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaders(sheet, headers.length);
    }
    logInfo('Utils', `Created new sheet: ${sheetName}`);
  }

  return sheet;
}

/**
 * Gets sheet data as array of objects
 * @param {string} sheetName - Name of the sheet
 * @param {boolean} includeEmpty - Include rows with empty first column
 * @returns {Array} Array of row objects with header keys
 */
function getSheetDataAsObjects(sheetName, includeEmpty = false) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    logWarning('Utils', `Sheet not found: ${sheetName}`);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    if (!includeEmpty && isEmpty(data[i][0])) continue;

    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    row._rowIndex = i + 1; // 1-indexed for sheet reference
    rows.push(row);
  }

  return rows;
}

/**
 * Finds a row by a column value
 * @param {string} sheetName - Sheet name
 * @param {string} columnName - Column header name
 * @param {*} value - Value to find
 * @returns {Object|null} Row object or null
 */
function findRowByColumn(sheetName, columnName, value) {
  const rows = getSheetDataAsObjects(sheetName);
  return rows.find(row => row[columnName] === value) || null;
}

/**
 * Updates a row by Lead ID
 * @param {string} sheetName - Sheet name
 * @param {string} leadId - Lead ID to find
 * @param {Object} updates - Object with column names and new values
 * @returns {boolean} Success status
 */
function updateRowByLeadId(sheetName, leadId, updates) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const leadIdCol = headers.indexOf('Lead ID');

    if (leadIdCol === -1) return false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][leadIdCol] === leadId) {
        for (const [colName, value] of Object.entries(updates)) {
          const colIndex = headers.indexOf(colName);
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(value);
          }
        }
        return true;
      }
    }
    return false;
  } catch (e) {
    logError('Utils', e, 'updateRowByLeadId');
    return false;
  }
}

/**
 * Trims a sheet to keep only the specified number of rows
 * @param {Sheet} sheet - Sheet object
 * @param {number} maxRows - Maximum rows to keep
 */
function trimSheet(sheet, maxRows) {
  const lastRow = sheet.getLastRow();
  if (lastRow > maxRows + 1) { // +1 for header
    const rowsToDelete = lastRow - maxRows - 1;
    sheet.deleteRows(2, rowsToDelete);
  }
}

/**
 * Clears a sheet except for headers
 * @param {string} sheetName - Sheet name
 */
function clearSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Formats header row with standard styling
 * @param {Sheet} sheet - Sheet object
 * @param {number} numColumns - Number of columns
 */
function formatHeaders(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange
    .setBackground(UI_CONFIG.COLORS.PRIMARY)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
}

/**
 * Applies alternating row colors (banding)
 * @param {Sheet} sheet - Sheet object
 */
function applyBanding(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return;

  // Remove existing bandings
  const bandings = sheet.getBandings();
  bandings.forEach(b => b.remove());

  // Apply new banding
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
}

/**
 * Applies conditional formatting for deal classifiers
 * @param {Sheet} sheet - Sheet object
 * @param {number} column - Column number (1-indexed)
 */
function applyDealClassifierFormatting(sheet, column) {
  const lastRow = Math.max(sheet.getLastRow(), 100);
  const range = sheet.getRange(2, column, lastRow - 1, 1);

  const rules = [];

  // HOT DEAL - Red background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('HOT DEAL')
    .setBackground(UI_CONFIG.COLORS.HOT_DEAL)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setRanges([range])
    .build());

  // PORTFOLIO FOUNDATION - Green background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('PORTFOLIO')
    .setBackground(UI_CONFIG.COLORS.PORTFOLIO)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setRanges([range])
    .build());

  // SOLID DEAL - Blue background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('SOLID')
    .setBackground(UI_CONFIG.COLORS.SOLID_DEAL)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setRanges([range])
    .build());

  // PASS - Grey background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('PASS')
    .setBackground(UI_CONFIG.COLORS.PASS)
    .setFontColor(UI_CONFIG.COLORS.DARK)
    .setRanges([range])
    .build());

  const existingRules = sheet.getConditionalFormatRules();
  sheet.setConditionalFormatRules(existingRules.concat(rules));
}

/**
 * Formats currency values
 * @param {number} value - Numeric value
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
  if (!value || isNaN(value)) return '$0';
  return '$' + Math.round(value).toLocaleString('en-US');
}

/**
 * Formats percentage values
 * @param {number} value - Numeric value (0-100 or 0-1)
 * @param {boolean} isDecimal - Whether input is decimal (0-1)
 * @returns {string} Formatted percentage string
 */
function formatPercent(value, isDecimal = false) {
  if (!value || isNaN(value)) return '0%';
  const pct = isDecimal ? value * 100 : value;
  return Math.round(pct) + '%';
}

/**
 * Formats a date for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  if (!(date instanceof Date)) date = new Date(date);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

/**
 * Makes a URL clickable in sheets
 * @param {string} url - URL string
 * @param {string} label - Optional display label
 * @returns {string} HYPERLINK formula
 */
function makeClickableUrl(url, label = null) {
  if (!url) return '';
  const displayLabel = label || url;
  return `=HYPERLINK("${url}", "${displayLabel}")`;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Checks if a value is empty
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
function isEmpty(value) {
  return value === undefined ||
         value === null ||
         value === '' ||
         (typeof value === 'string' && value.trim() === '');
}

/**
 * Checks if a value is a valid number
 * @param {*} value - Value to check
 * @returns {boolean} True if valid number
 */
function isValidNumber(value) {
  return !isEmpty(value) && !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Parses a number safely
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default if invalid
 * @returns {number} Parsed number or default
 */
function safeParseNumber(value, defaultValue = 0) {
  if (isEmpty(value)) return defaultValue;

  // Remove currency symbols and commas
  if (typeof value === 'string') {
    value = value.replace(/[$,]/g, '').trim();
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validates an email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  if (isEmpty(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number (basic)
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
  if (isEmpty(phone)) return false;
  const cleaned = phone.toString().replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Validates a ZIP code
 * @param {string} zip - ZIP code to validate
 * @returns {boolean} True if valid
 */
function isValidZip(zip) {
  if (isEmpty(zip)) return false;
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip.toString());
}

/**
 * Normalizes condition text to standard format
 * @param {string} condition - Condition text
 * @returns {Object} Normalized condition and score
 */
function normalizeCondition(condition) {
  if (isEmpty(condition)) {
    return { text: 'Unknown', score: 50 };
  }

  const conditionLower = condition.toString().toLowerCase();

  const conditionMap = [
    { keywords: ['excellent', 'pristine', 'move-in', 'turnkey', 'like new'], text: 'Excellent', score: 95 },
    { keywords: ['good', 'well-maintained', 'updated', 'renovated'], text: 'Good', score: 75 },
    { keywords: ['fair', 'average', 'some updates', 'dated'], text: 'Fair', score: 55 },
    { keywords: ['poor', 'needs work', 'fixer', 'investor'], text: 'Poor', score: 35 },
    { keywords: ['very poor', 'major repairs', 'distressed', 'condemned'], text: 'Very Poor', score: 15 },
    { keywords: ['tear down', 'demolition', 'uninhabitable'], text: 'Tear Down', score: 5 }
  ];

  for (const mapping of conditionMap) {
    if (mapping.keywords.some(kw => conditionLower.includes(kw))) {
      return { text: mapping.text, score: mapping.score };
    }
  }

  return { text: condition, score: 50 };
}

/**
 * Normalizes occupancy status
 * @param {string} occupancy - Occupancy text
 * @returns {string} Normalized occupancy
 */
function normalizeOccupancy(occupancy) {
  if (isEmpty(occupancy)) return 'Unknown';

  const occLower = occupancy.toString().toLowerCase();

  if (occLower.includes('vacant') || occLower.includes('empty')) return 'Vacant';
  if (occLower.includes('occupied') || occLower.includes('tenant') || occLower.includes('owner')) return 'Occupied';

  return 'Unknown';
}

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generates a unique Lead ID
 * @returns {string} Unique ID in format QRA-XXXXXXXX
 */
function generateLeadId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'QRA-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Generates a unique Offer ID
 * @returns {string} Unique ID in format OFR-XXXXXXXX
 */
function generateOfferId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'OFR-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Generates a unique Buyer ID
 * @returns {string} Unique ID in format BYR-XXXXXXXX
 */
function generateBuyerId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'BYR-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Cleans and normalizes an address
 * @param {string} address - Raw address
 * @returns {string} Cleaned address
 */
function cleanAddress(address) {
  if (isEmpty(address)) return '';

  return address
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s,.-]/g, '');
}

/**
 * Extracts ZIP code from address or returns provided ZIP
 * @param {string} address - Address string
 * @param {string} zip - Explicit ZIP if provided
 * @returns {string} ZIP code
 */
function extractZip(address, zip = null) {
  if (zip && isValidZip(zip)) return zip.toString();

  if (!isEmpty(address)) {
    const zipMatch = address.toString().match(/\b\d{5}(-\d{4})?\b/);
    if (zipMatch) return zipMatch[0];
  }

  return '';
}

/**
 * Cleans phone number to E.164-ish format
 * @param {string} phone - Raw phone
 * @returns {string} Cleaned phone
 */
function cleanPhone(phone) {
  if (isEmpty(phone)) return '';

  const cleaned = phone.toString().replace(/\D/g, '');

  if (cleaned.length === 10) {
    return '+1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }

  return cleaned;
}

/**
 * Truncates text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 160) {
  if (isEmpty(text)) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// =============================================================================
// ARRAY AND OBJECT UTILITIES
// =============================================================================

/**
 * Safely gets a nested object value
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot-notation path
 * @param {*} defaultValue - Default if not found
 * @returns {*} Value or default
 */
function safeGet(obj, path, defaultValue = null) {
  try {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) return defaultValue;
      value = value[part];
    }

    return value !== undefined ? value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Removes duplicates from an array of objects by key
 * @param {Array} array - Array of objects
 * @param {string} key - Key to check for duplicates
 * @returns {Array} Deduplicated array
 */
function deduplicateByKey(array, key) {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Sorts an array of objects by a numeric key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {boolean} descending - Sort descending
 * @returns {Array} Sorted array
 */
function sortByKey(array, key, descending = true) {
  return array.sort((a, b) => {
    const valA = safeParseNumber(a[key], 0);
    const valB = safeParseNumber(b[key], 0);
    return descending ? valB - valA : valA - valB;
  });
}

// =============================================================================
// HTTP/API UTILITIES
// =============================================================================

/**
 * Makes a safe HTTP request with retry logic
 * @param {string} url - URL to request
 * @param {Object} options - UrlFetchApp options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Object} Response object or null
 */
function safeFetch(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        ...options
      });

      const code = response.getResponseCode();

      if (code >= 200 && code < 300) {
        return {
          success: true,
          code: code,
          data: JSON.parse(response.getContentText())
        };
      } else if (code === 429) {
        // Rate limited - wait and retry
        Utilities.sleep(Math.pow(2, attempt) * 1000);
        continue;
      } else {
        return {
          success: false,
          code: code,
          error: response.getContentText()
        };
      }
    } catch (e) {
      lastError = e;
      Utilities.sleep(Math.pow(2, attempt) * 1000);
    }
  }

  return {
    success: false,
    code: 0,
    error: lastError ? lastError.message : 'Max retries exceeded'
  };
}

/**
 * Validates JSON response against expected schema
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Required field names
 * @returns {boolean} True if valid
 */
function validateJsonSchema(data, requiredFields) {
  if (!data || typeof data !== 'object') return false;

  for (const field of requiredFields) {
    if (!(field in data)) return false;
  }

  return true;
}

// =============================================================================
// CACHING UTILITIES
// =============================================================================

/**
 * Gets a cached value with optional expiry
 * @param {string} key - Cache key
 * @returns {*} Cached value or null
 */
function getCached(key) {
  const cache = CacheService.getScriptCache();
  const value = cache.get(key);
  return value ? JSON.parse(value) : null;
}

/**
 * Sets a cached value
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds (default 6 hours)
 */
function setCached(key, value, ttlSeconds = 21600) {
  const cache = CacheService.getScriptCache();
  cache.put(key, JSON.stringify(value), ttlSeconds);
}

/**
 * Clears a cached value
 * @param {string} key - Cache key
 */
function clearCached(key) {
  const cache = CacheService.getScriptCache();
  cache.remove(key);
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

/**
 * Processes items in batches with delay
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {number} batchSize - Items per batch
 * @param {number} delayMs - Delay between batches
 * @returns {Array} Results
 */
function processBatch(items, processor, batchSize = 50, delayMs = 1000) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    for (const item of batch) {
      try {
        results.push(processor(item));
      } catch (e) {
        results.push({ error: e.message, item: item });
        logError('BatchProcessor', e, 'Processing item');
      }
    }

    if (i + batchSize < items.length) {
      Utilities.sleep(delayMs);
    }
  }

  return results;
}

// =============================================================================
// SYSTEM UTILITIES
// =============================================================================

/**
 * Gets the current execution quota usage
 * @returns {Object} Quota information
 */
function getQuotaInfo() {
  const properties = PropertiesService.getScriptProperties();
  const daily = properties.getProperty('DAILY_API_CALLS') || '0';
  const lastReset = properties.getProperty('LAST_QUOTA_RESET') || '';

  return {
    dailyCalls: parseInt(daily, 10),
    lastReset: lastReset,
    estimatedRemaining: 10000 - parseInt(daily, 10) // Rough estimate
  };
}

/**
 * Increments the API call counter
 */
function incrementApiCounter() {
  const properties = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const lastReset = properties.getProperty('LAST_QUOTA_RESET') || '';

  if (lastReset !== today) {
    properties.setProperty('DAILY_API_CALLS', '1');
    properties.setProperty('LAST_QUOTA_RESET', today);
  } else {
    const current = parseInt(properties.getProperty('DAILY_API_CALLS') || '0', 10);
    properties.setProperty('DAILY_API_CALLS', (current + 1).toString());
  }
}

/**
 * Creates a System Health sheet if it doesn't exist
 * @param {Spreadsheet} ss - Spreadsheet object
 * @returns {Sheet} Created sheet
 */
function createSystemHealthSheet(ss) {
  const sheet = ss.insertSheet(SHEETS.SYSTEM_HEALTH);
  sheet.getRange(1, 1, 1, COLUMNS.SYSTEM_HEALTH.length).setValues([COLUMNS.SYSTEM_HEALTH]);
  formatHeaders(sheet, COLUMNS.SYSTEM_HEALTH.length);
  return sheet;
}

/**
 * Shows a toast notification
 * @param {string} message - Message to show
 * @param {string} title - Toast title
 * @param {number} duration - Duration in seconds
 */
function showToast(message, title = 'Quantum Real Estate', duration = 5) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title, duration);
}

/**
 * Shows an alert dialog
 * @param {string} message - Message to show
 * @param {string} title - Alert title
 */
function showAlert(message, title = 'Quantum Real Estate') {
  SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Gets the active spreadsheet name
 * @returns {string} Spreadsheet name
 */
function getSpreadsheetName() {
  return SpreadsheetApp.getActiveSpreadsheet().getName();
}

/**
 * Gets the spreadsheet URL
 * @returns {string} Spreadsheet URL
 */
function getSpreadsheetUrl() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}
