/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Utility Functions (utils.gs) - PRODUCTION PATCHED
 * ============================================================================
 *
 * Common utility functions used throughout the system.
 * Includes logging, validation, formatting, and helper functions.
 *
 * PATCH NOTES v2.0.1:
 * - Added withLock() for concurrency protection
 * - Added circuit breaker pattern functions
 * - Added all missing functions (getDefaultSellerMessage, parseWebhookLead, etc.)
 * - Added batch write functions for performance
 * - Added safeParseJSON with fallbacks
 * - Added retryWithBackoff for resilience
 */

// =============================================================================
// CIRCUIT BREAKER STATE
// =============================================================================

const CircuitBreakerState = {
  _states: {},

  getState: function(service) {
    if (!this._states[service]) {
      this._states[service] = {
        failures: 0,
        lastFailure: 0,
        state: 'CLOSED'
      };
    }
    return this._states[service];
  },

  recordSuccess: function(service) {
    const state = this.getState(service);
    state.failures = 0;
    state.state = 'CLOSED';
  },

  recordFailure: function(service) {
    const state = this.getState(service);
    const config = CIRCUIT_BREAKER[service] || CIRCUIT_BREAKER.AI;

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= config.FAILURE_THRESHOLD) {
      state.state = 'OPEN';
      logWarning('CircuitBreaker', `Circuit OPEN for ${service} after ${state.failures} failures`);
    }
  },

  isOpen: function(service) {
    const state = this.getState(service);
    const config = CIRCUIT_BREAKER[service] || CIRCUIT_BREAKER.AI;

    if (state.state === 'OPEN') {
      const elapsed = Date.now() - state.lastFailure;
      if (elapsed > config.RECOVERY_TIME_MS) {
        state.state = 'HALF_OPEN';
        logInfo('CircuitBreaker', `Circuit HALF_OPEN for ${service}, allowing test request`);
        return false;
      }
      return true;
    }
    return false;
  },

  reset: function(service) {
    this._states[service] = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED'
    };
  }
};

// =============================================================================
// LOCK UTILITIES
// =============================================================================

/**
 * Executes a function with a script lock
 * @param {string} lockName - Name for logging
 * @param {Function} fn - Function to execute
 * @param {number} timeoutMs - Lock timeout in ms
 * @returns {*} Result of function or throws
 */
function withLock(lockName, fn, timeoutMs = null) {
  const timeout = timeoutMs || LOCK_CONFIG.TIMEOUT_MS;
  const lock = LockService.getScriptLock();

  try {
    const acquired = lock.tryLock(timeout);

    if (!acquired) {
      logWarning('Lock', `Could not acquire lock for: ${lockName}`);
      throw new Error(ERROR_MESSAGES.LOCK_TIMEOUT);
    }

    logInfo('Lock', `Acquired lock: ${lockName}`);
    const result = fn();
    return result;

  } finally {
    try {
      lock.releaseLock();
      logInfo('Lock', `Released lock: ${lockName}`);
    } catch (e) {
      // Lock may have timed out
    }
  }
}

/**
 * Executes with document lock (for per-spreadsheet operations)
 * @param {string} lockName - Name for logging
 * @param {Function} fn - Function to execute
 * @returns {*} Result of function
 */
function withDocumentLock(lockName, fn) {
  const lock = LockService.getDocumentLock();

  try {
    const acquired = lock.tryLock(LOCK_CONFIG.TIMEOUT_MS);
    if (!acquired) {
      throw new Error(ERROR_MESSAGES.LOCK_TIMEOUT);
    }
    return fn();
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

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
    if (isStagingMode()) {
      Logger.log(`[STAGING][${status}] ${component}: ${message}`);
      return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.SYSTEM_HEALTH);

    if (!sheet) {
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
    Logger.log(`[${status}] ${component}: ${message}`);
    trimSheet(sheet, 1000);
  } catch (e) {
    Logger.log('Error logging to system: ' + e.message);
  }
}

function logError(component, error, context = '') {
  const message = context ? `${context}: ${error.message}` : error.message;
  logToSystem(component, 'ERROR', message, { stack: error.stack, errorCount: 1 });
}

function logWarning(component, message) {
  logToSystem(component, 'WARNING', message, { warningCount: 1 });
}

function logInfo(component, message) {
  logToSystem(component, 'INFO', message);
}

function logSuccess(component, message) {
  logToSystem(component, 'SUCCESS', message);
}

// =============================================================================
// SHEET UTILITIES
// =============================================================================

function getOrCreateSheet(sheetName, headers = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    if (isStagingMode()) {
      Logger.log(`[STAGING] Would create sheet: ${sheetName}`);
      return null;
    }
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaders(sheet, headers.length);
    }
    logInfo('Utils', `Created new sheet: ${sheetName}`);
  }

  return sheet;
}

function getSheetDataAsObjects(sheetName, includeEmpty = false) {
  const cacheKey = CACHE_CONFIG.PREFIX + 'SHEET_' + sheetName;
  const cached = getCached(cacheKey);
  if (cached) return cached;

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
    row._rowIndex = i + 1;
    rows.push(row);
  }

  setCached(cacheKey, rows, CACHE_CONFIG.SHEET_DATA_TTL);
  return rows;
}

function findRowByColumn(sheetName, columnName, value) {
  const rows = getSheetDataAsObjects(sheetName);
  return rows.find(row => row[columnName] === value) || null;
}

function updateRowByLeadId(sheetName, leadId, updates) {
  if (isStagingMode()) {
    Logger.log(`[STAGING] Would update ${leadId} in ${sheetName}`);
    return true;
  }

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
        clearCached(CACHE_CONFIG.PREFIX + 'SHEET_' + sheetName);
        return true;
      }
    }
    return false;
  } catch (e) {
    logError('Utils', e, 'updateRowByLeadId');
    return false;
  }
}

function trimSheet(sheet, maxRows) {
  const lastRow = sheet.getLastRow();
  if (lastRow > maxRows + 1) {
    const rowsToDelete = lastRow - maxRows - 1;
    sheet.deleteRows(2, rowsToDelete);
  }
}

function clearSheetData(sheetName) {
  if (isStagingMode()) {
    Logger.log(`[STAGING] Would clear sheet: ${sheetName}`);
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }
  clearCached(CACHE_CONFIG.PREFIX + 'SHEET_' + sheetName);
}

/**
 * Batch writes multiple rows to a sheet
 * @param {string} sheetName - Sheet name
 * @param {Array} rows - Array of row arrays
 */
function batchWriteRows(sheetName, rows) {
  if (!rows || rows.length === 0) return;
  if (isStagingMode()) {
    Logger.log(`[STAGING] Would batch write ${rows.length} rows to ${sheetName}`);
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
  clearCached(CACHE_CONFIG.PREFIX + 'SHEET_' + sheetName);
}

/**
 * Adds a lead to the database
 * @param {Sheet} sheet - Leads Database sheet
 * @param {Object} lead - Normalized lead object
 */
function addLeadToDatabase(sheet, lead) {
  if (isStagingMode()) {
    Logger.log(`[STAGING] Would add lead: ${lead.address}`);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => {
    const key = header.replace(/\s+/g, '').toLowerCase();
    for (const [leadKey, value] of Object.entries(lead)) {
      if (leadKey.toLowerCase().replace(/\s+/g, '') === key) {
        return value;
      }
    }
    return '';
  });

  sheet.appendRow(row);
  clearCached(CACHE_CONFIG.PREFIX + 'SHEET_' + SHEETS.LEADS_DATABASE);
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

function formatHeaders(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange
    .setBackground(UI_CONFIG.COLORS.PRIMARY)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function applyBanding(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  const bandings = sheet.getBandings();
  bandings.forEach(b => b.remove());

  const range = sheet.getRange(1, 1, lastRow, lastCol);
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
}

function applyDealClassifierFormatting(sheet, column) {
  const lastRow = Math.max(sheet.getLastRow(), 100);
  const range = sheet.getRange(2, column, lastRow - 1, 1);

  const rules = [];

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('HOT DEAL')
    .setBackground(UI_CONFIG.COLORS.HOT_DEAL)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setRanges([range])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('PORTFOLIO')
    .setBackground(UI_CONFIG.COLORS.PORTFOLIO)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setRanges([range])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('SOLID')
    .setBackground(UI_CONFIG.COLORS.SOLID_DEAL)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setRanges([range])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('PASS')
    .setBackground(UI_CONFIG.COLORS.PASS)
    .setFontColor(UI_CONFIG.COLORS.DARK)
    .setRanges([range])
    .build());

  const existingRules = sheet.getConditionalFormatRules();
  sheet.setConditionalFormatRules(existingRules.concat(rules));
}

function formatCurrency(value) {
  if (!value || isNaN(value)) return '$0';
  return '$' + Math.round(value).toLocaleString('en-US');
}

function formatPercent(value, isDecimal = false) {
  if (!value || isNaN(value)) return '0%';
  const pct = isDecimal ? value * 100 : value;
  return Math.round(pct) + '%';
}

function formatDate(date) {
  if (!date) return '';
  if (!(date instanceof Date)) date = new Date(date);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function makeClickableUrl(url, label = null) {
  if (!url) return '';
  const displayLabel = label || url;
  return `=HYPERLINK("${url}", "${displayLabel}")`;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

function isEmpty(value) {
  return value === undefined ||
         value === null ||
         value === '' ||
         (typeof value === 'string' && value.trim() === '');
}

function isValidNumber(value) {
  return !isEmpty(value) && !isNaN(parseFloat(value)) && isFinite(value);
}

function safeParseNumber(value, defaultValue = 0) {
  if (isEmpty(value)) return defaultValue;
  if (typeof value === 'string') {
    value = value.replace(/[$,]/g, '').trim();
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parses JSON with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
function safeParseJSON(jsonString, fallback = null) {
  if (!jsonString || typeof jsonString !== 'string') {
    return fallback;
  }

  try {
    // Try to extract JSON from potential markdown code blocks
    let cleaned = jsonString.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }

    // Try to find JSON object in text
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      cleaned = objectMatch[0];
    }

    return JSON.parse(cleaned);
  } catch (e) {
    logWarning('Utils', `JSON parse failed: ${e.message}`);
    return fallback;
  }
}

function isValidEmail(email) {
  if (isEmpty(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  if (isEmpty(phone)) return false;
  const cleaned = phone.toString().replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

function isValidZip(zip) {
  if (isEmpty(zip)) return false;
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip.toString());
}

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

function normalizeOccupancy(occupancy) {
  if (isEmpty(occupancy)) return 'Unknown';
  const occLower = occupancy.toString().toLowerCase();
  if (occLower.includes('vacant') || occLower.includes('empty')) return 'Vacant';
  if (occLower.includes('occupied') || occLower.includes('tenant') || occLower.includes('owner')) return 'Occupied';
  return 'Unknown';
}

/**
 * Validates import data in Import Hub
 * @returns {Object} Validation result
 */
function validateImportData() {
  const importData = getSheetDataAsObjects(SHEETS.IMPORT_HUB);
  const issues = [];
  let validRows = 0;

  for (const row of importData) {
    if (row['Imported'] === true) continue;

    const rowIssues = [];
    if (isEmpty(row['Address'])) rowIssues.push('Missing address');
    if (isEmpty(row['City'])) rowIssues.push('Missing city');
    if (isEmpty(row['State'])) rowIssues.push('Missing state');

    if (rowIssues.length === 0) {
      validRows++;
    } else {
      issues.push(`Row ${row._rowIndex}: ${rowIssues.join(', ')}`);
    }
  }

  return {
    validRows,
    issues,
    total: importData.length
  };
}

// =============================================================================
// ID GENERATION
// =============================================================================

function generateLeadId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'QRA-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateOfferId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'OFR-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

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

function cleanAddress(address) {
  if (isEmpty(address)) return '';
  return address.toString().trim().replace(/\s+/g, ' ').replace(/[^\w\s,.-]/g, '');
}

function extractZip(address, zip = null) {
  if (zip && isValidZip(zip)) return zip.toString();
  if (!isEmpty(address)) {
    const zipMatch = address.toString().match(/\b\d{5}(-\d{4})?\b/);
    if (zipMatch) return zipMatch[0];
  }
  return '';
}

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

function truncateText(text, maxLength = 160) {
  if (isEmpty(text)) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Parses webhook lead data into normalized format
 * @param {Object} webhookData - Raw webhook data
 * @returns {Object} Normalized lead
 */
function parseWebhookLead(webhookData) {
  return {
    address: webhookData.address || webhookData.property_address || '',
    city: webhookData.city || '',
    state: webhookData.state || '',
    zip: webhookData.zip || webhookData.zipcode || '',
    askingPrice: safeParseNumber(webhookData.price || webhookData.asking_price, 0),
    beds: safeParseNumber(webhookData.beds || webhookData.bedrooms, 0),
    baths: safeParseNumber(webhookData.baths || webhookData.bathrooms, 0),
    sqft: safeParseNumber(webhookData.sqft || webhookData.square_feet, 0),
    yearBuilt: safeParseNumber(webhookData.year_built || webhookData.yearBuilt, 0),
    propertyType: webhookData.property_type || webhookData.type || 'Single Family',
    condition: webhookData.condition || 'Unknown',
    sellerName: webhookData.seller_name || webhookData.name || '',
    sellerPhone: webhookData.seller_phone || webhookData.phone || '',
    sellerEmail: webhookData.seller_email || webhookData.email || '',
    motivation: webhookData.motivation || '',
    notes: webhookData.notes || webhookData.description || '',
    source: webhookData.source || 'Webhook'
  };
}

/**
 * Gets default seller message when AI is unavailable
 * @param {Object} lead - Lead data
 * @returns {Object} Message object
 */
function getDefaultSellerMessage(lead) {
  const address = lead['Address'] || lead.address || 'your property';

  return {
    message: `Hi! I came across ${address} and would love to discuss it with you. I'm a local investor who can close quickly and make the process easy. Would you be open to a quick chat?`,
    tone: 'Friendly',
    callToAction: 'Quick chat'
  };
}

// =============================================================================
// ARRAY AND OBJECT UTILITIES
// =============================================================================

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

function deduplicateByKey(array, key) {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

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
 * Retries a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Max retries
 * @returns {*} Result or throws
 */
function retryWithBackoff(fn, maxRetries = null) {
  const retries = maxRetries || RETRY_CONFIG.MAX_RETRIES;
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return fn();
    } catch (e) {
      lastError = e;
      const delay = Math.min(
        RETRY_CONFIG.BASE_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
        RETRY_CONFIG.MAX_DELAY_MS
      );
      Utilities.sleep(delay);
    }
  }

  throw lastError;
}

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
        incrementApiCounter();
        return {
          success: true,
          code: code,
          data: safeParseJSON(response.getContentText(), {})
        };
      } else if (code === 429) {
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

function getCached(key) {
  try {
    const cache = CacheService.getScriptCache();
    const value = cache.get(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    return null;
  }
}

function setCached(key, value, ttlSeconds = null) {
  try {
    const ttl = ttlSeconds || CACHE_CONFIG.DEFAULT_TTL;
    const cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(value), ttl);
  } catch (e) {
    // Cache failure is non-critical
  }
}

function clearCached(key) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(key);
  } catch (e) {}
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

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
// IMPORT STATISTICS
// =============================================================================

/**
 * Gets import statistics
 * @returns {Object} Import stats
 */
function getImportStats() {
  const leads = getSheetDataAsObjects(SHEETS.LEADS_DATABASE);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayCount = 0;
  let weekCount = 0;
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const lead of leads) {
    const imported = lead['Timestamp Imported'] || lead['Import Date'];
    if (imported) {
      const date = new Date(imported);
      if (date >= today) todayCount++;
      if (date >= weekAgo) weekCount++;
    }
  }

  return {
    total: leads.length,
    today: todayCount,
    thisWeek: weekCount
  };
}

/**
 * Gets recent imports
 * @param {number} limit - Number to return
 * @returns {Array} Recent imports
 */
function getRecentImports(limit = 5) {
  const leads = getSheetDataAsObjects(SHEETS.LEADS_DATABASE);
  return leads.slice(-limit).reverse().map(lead => ({
    leadId: lead['Lead ID'],
    address: lead['Address'],
    city: lead['City'],
    state: lead['State'],
    source: lead['Source Platform'] || lead['Lead Source'] || 'Unknown',
    date: lead['Timestamp Imported']
  }));
}

/**
 * Exports verdict summary for reports
 * @returns {Object} Summary data
 */
function exportVerdictSummary() {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  const stats = getVerdictStats();

  return {
    summary: {
      totalDeals: stats.totalDeals,
      hotDeals: stats.hotDeals,
      avgSpread: formatCurrency(stats.avgSpread),
      totalPipelineValue: formatCurrency(stats.totalPipeline || 0)
    },
    topDeals: verdictData.slice(0, 10).map(deal => ({
      rank: deal['Rank'],
      address: deal['Address'],
      strategy: deal['Strategy'],
      classifier: deal['Deal Classifier'],
      offerTarget: formatCurrency(deal['Offer Target']),
      spread: formatCurrency(deal['Profit/Spread'])
    })),
    exportDate: new Date().toISOString()
  };
}

// =============================================================================
// AI STATUS
// =============================================================================

/**
 * Gets AI service status
 * @returns {Object} AI status
 */
function getAIStatus() {
  const apiKey = getApiKey('openai');
  const circuitOpen = CircuitBreakerState.isOpen('AI');

  return {
    available: !isEmpty(apiKey) && !circuitOpen,
    configured: !isEmpty(apiKey),
    circuitOpen: circuitOpen,
    features: {
      strategyRecommendations: isFeatureEnabled('AI Strategy Recommendations'),
      repairInference: isFeatureEnabled('AI Repair Inference'),
      sellerMessaging: isFeatureEnabled('AI Seller Messaging')
    }
  };
}

// =============================================================================
// SYSTEM UTILITIES
// =============================================================================

function getQuotaInfo() {
  const properties = PropertiesService.getScriptProperties();
  const daily = properties.getProperty('DAILY_API_CALLS') || '0';
  const lastReset = properties.getProperty('LAST_QUOTA_RESET') || '';

  return {
    dailyCalls: parseInt(daily, 10),
    lastReset: lastReset,
    estimatedRemaining: 10000 - parseInt(daily, 10)
  };
}

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

function createSystemHealthSheet(ss) {
  const sheet = ss.insertSheet(SHEETS.SYSTEM_HEALTH);
  sheet.getRange(1, 1, 1, COLUMNS.SYSTEM_HEALTH.length).setValues([COLUMNS.SYSTEM_HEALTH]);
  formatHeaders(sheet, COLUMNS.SYSTEM_HEALTH.length);
  return sheet;
}

function showToast(message, title = 'Quantum Real Estate', duration = 5) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title, duration);
}

function showAlert(message, title = 'Quantum Real Estate') {
  SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function getSpreadsheetName() {
  return SpreadsheetApp.getActiveSpreadsheet().getName();
}

function getSpreadsheetUrl() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}

/**
 * Checks if a feature is enabled in Automation Control
 * @param {string} featureName - Feature name
 * @returns {boolean} True if enabled
 */
function isFeatureEnabled(featureName) {
  try {
    const controlData = getSheetDataAsObjects(SHEETS.AUTOMATION_CONTROL);
    const feature = controlData.find(row => row['Feature'] === featureName);
    return feature ? feature['Enabled'] === true : true;
  } catch (e) {
    return true;
  }
}

/**
 * Runs smoke tests to verify system health
 * @returns {Object} Test results
 */
function runSmokeTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Sheets exist
  const requiredSheets = Object.values(SHEETS);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const sheetName of requiredSheets) {
    const exists = ss.getSheetByName(sheetName) !== null;
    results.tests.push({
      name: `Sheet exists: ${sheetName}`,
      passed: exists
    });
    exists ? results.passed++ : results.failed++;
  }

  // Test 2: Config accessible
  try {
    const version = CONFIG.VERSION;
    results.tests.push({ name: 'Config accessible', passed: true });
    results.passed++;
  } catch (e) {
    results.tests.push({ name: 'Config accessible', passed: false, error: e.message });
    results.failed++;
  }

  // Test 3: Cache working
  try {
    setCached('smoke_test', { test: true }, 60);
    const cached = getCached('smoke_test');
    const passed = cached && cached.test === true;
    clearCached('smoke_test');
    results.tests.push({ name: 'Cache working', passed });
    passed ? results.passed++ : results.failed++;
  } catch (e) {
    results.tests.push({ name: 'Cache working', passed: false, error: e.message });
    results.failed++;
  }

  // Test 4: Properties accessible
  try {
    PropertiesService.getScriptProperties().getProperty('test');
    results.tests.push({ name: 'Properties accessible', passed: true });
    results.passed++;
  } catch (e) {
    results.tests.push({ name: 'Properties accessible', passed: false, error: e.message });
    results.failed++;
  }

  results.allPassed = results.failed === 0;
  return results;
}
