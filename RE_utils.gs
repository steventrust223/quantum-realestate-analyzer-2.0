/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_utils.gs - Utility Functions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Common utilities used throughout the Quantum RE Analyzer system:
 * - Logging
 * - ID generation
 * - Header mapping
 * - Settings management
 * - Data validation
 * - String utilities
 */

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logs an event to the SYSTEM_LOG sheet
 *
 * @param {string} eventType - Type of event (INFO, WARNING, ERROR, SUCCESS)
 * @param {string} module - Module/function name
 * @param {string} message - Log message
 * @param {string} details - Additional details (optional)
 */
function RE_logEvent(eventType, module, message, details = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_NAMES.SYSTEM_LOG);

    if (!logSheet) {
      // Create log sheet if it doesn't exist
      logSheet = ss.insertSheet(SHEET_NAMES.SYSTEM_LOG);
      logSheet.getRange(1, 1, 1, 6).setValues([HEADERS.SYSTEM_LOG]);
    }

    const timestamp = new Date();
    const user = Session.getActiveUser().getEmail() || 'system';

    logSheet.appendRow([
      timestamp,
      eventType,
      module,
      message,
      details,
      user
    ]);

    // Also log to Apps Script console for debugging
    console.log(`[${eventType}] ${module}: ${message}`);
  } catch (error) {
    // If logging fails, at least log to console
    console.error('Logging failed:', error.message);
  }
}

/**
 * Quick logging shortcuts
 */
function RE_logInfo(module, message, details = '') {
  RE_logEvent('INFO', module, message, details);
}

function RE_logWarning(module, message, details = '') {
  RE_logEvent('WARNING', module, message, details);
}

function RE_logError(module, message, details = '') {
  RE_logEvent('ERROR', module, message, details);
}

function RE_logSuccess(module, message, details = '') {
  RE_logEvent('SUCCESS', module, message, details);
}

// ═══════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a unique Property ID
 * Format: PROP-YYYYMMDD-XXXXX
 *
 * @returns {string} Unique property ID
 */
function RE_generatePropertyId() {
  const date = new Date();
  const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `PROP-${dateStr}-${random}`;
}

/**
 * Generates a unique Lead ID
 * Format: LEAD-YYYYMMDD-XXXXX
 *
 * @returns {string} Unique lead ID
 */
function RE_generateLeadId() {
  const date = new Date();
  const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `LEAD-${dateStr}-${random}`;
}

/**
 * Generates a unique Buyer ID
 * Format: BUYER-XXXXX
 *
 * @returns {string} Unique buyer ID
 */
function RE_generateBuyerId() {
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `BUYER-${random}`;
}

/**
 * Generates a unique Offer ID
 * Format: OFFER-YYYYMMDD-XXXXX
 *
 * @returns {string} Unique offer ID
 */
function RE_generateOfferId() {
  const date = new Date();
  const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `OFFER-${dateStr}-${random}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a column index map from header array
 * This allows us to reference columns by name instead of index
 *
 * @param {Array} headers - Array of column headers
 * @returns {Object} Map of header name to column index
 */
function RE_createHeaderMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    map[header] = index;
  });
  return map;
}

/**
 * Gets a header map for a specific sheet
 *
 * @param {Sheet} sheet - The sheet object
 * @returns {Object} Map of header name to column index
 */
function RE_getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return RE_createHeaderMap(headers);
}

/**
 * Gets the value from a row using header name
 *
 * @param {Array} row - Data row
 * @param {string} headerName - Name of the column
 * @param {Object} headerMap - Header map object
 * @returns {*} Value from the row
 */
function RE_getValueByHeader(row, headerName, headerMap) {
  const index = headerMap[headerName];
  return index !== undefined ? row[index] : null;
}

/**
 * Sets a value in a row using header name
 *
 * @param {Array} row - Data row
 * @param {string} headerName - Name of the column
 * @param {*} value - Value to set
 * @param {Object} headerMap - Header map object
 */
function RE_setValueByHeader(row, headerName, value, headerMap) {
  const index = headerMap[headerName];
  if (index !== undefined) {
    row[index] = value;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets a setting value from the SETTINGS sheet
 *
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value if setting not found
 * @returns {*} Setting value
 */
function RE_getSetting(key, defaultValue = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

    if (!settingsSheet) {
      return defaultValue;
    }

    const data = settingsSheet.getDataRange().getValues();
    const headerMap = RE_createHeaderMap(data[0]);

    for (let i = 1; i < data.length; i++) {
      const rowKey = RE_getValueByHeader(data[i], 'Setting Key', headerMap);
      if (rowKey === key) {
        let value = RE_getValueByHeader(data[i], 'Setting Value', headerMap);
        // Try to parse as number if possible
        if (!isNaN(value) && value !== '') {
          value = Number(value);
        }
        return value;
      }
    }

    return defaultValue;
  } catch (error) {
    RE_logError('RE_getSetting', `Error getting setting ${key}: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Sets a setting value in the SETTINGS sheet
 *
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @param {string} description - Setting description
 * @param {string} category - Setting category
 */
function RE_setSetting(key, value, description = '', category = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

    if (!settingsSheet) {
      RE_logError('RE_setSetting', 'Settings sheet not found');
      return;
    }

    const data = settingsSheet.getDataRange().getValues();
    const headerMap = RE_createHeaderMap(data[0]);
    let found = false;

    // Look for existing setting
    for (let i = 1; i < data.length; i++) {
      const rowKey = RE_getValueByHeader(data[i], 'Setting Key', headerMap);
      if (rowKey === key) {
        // Update existing
        settingsSheet.getRange(i + 1, headerMap['Setting Value'] + 1).setValue(value);
        settingsSheet.getRange(i + 1, headerMap['Last Updated'] + 1).setValue(new Date());
        found = true;
        break;
      }
    }

    // Add new setting if not found
    if (!found) {
      settingsSheet.appendRow([key, value, description, category, new Date()]);
    }
  } catch (error) {
    RE_logError('RE_setSetting', `Error setting ${key}: ${error.message}`);
  }
}

/**
 * Loads all settings into a JavaScript object
 *
 * @returns {Object} Object with all settings
 */
function RE_loadAllSettings() {
  const settings = {};

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

    if (!settingsSheet) {
      return settings;
    }

    const data = settingsSheet.getDataRange().getValues();
    const headerMap = RE_createHeaderMap(data[0]);

    for (let i = 1; i < data.length; i++) {
      const key = RE_getValueByHeader(data[i], 'Setting Key', headerMap);
      let value = RE_getValueByHeader(data[i], 'Setting Value', headerMap);

      // Try to parse as number
      if (!isNaN(value) && value !== '') {
        value = Number(value);
      }

      settings[key] = value;
    }
  } catch (error) {
    RE_logError('RE_loadAllSettings', `Error loading settings: ${error.message}`);
  }

  return settings;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA VALIDATION & FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalizes an address string
 *
 * @param {string} address - Raw address
 * @returns {string} Normalized address
 */
function RE_normalizeAddress(address) {
  if (!address) return '';

  return address
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\bST\b/g, 'STREET')
    .replace(/\bAVE\b/g, 'AVENUE')
    .replace(/\bRD\b/g, 'ROAD')
    .replace(/\bDR\b/g, 'DRIVE')
    .replace(/\bLN\b/g, 'LANE')
    .replace(/\bCT\b/g, 'COURT')
    .replace(/\bPL\b/g, 'PLACE');
}

/**
 * Formats a phone number to standard format
 *
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone (XXX) XXX-XXXX
 */
function RE_formatPhone(phone) {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.toString().replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone; // Return original if can't format
}

/**
 * Validates an email address
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function RE_isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formats a dollar amount
 *
 * @param {number} amount - Dollar amount
 * @returns {string} Formatted string like $123,456
 */
function RE_formatDollar(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  return '$' + Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Formats a percentage
 *
 * @param {number} value - Percentage value (e.g., 15 for 15%)
 * @returns {string} Formatted string like 15.0%
 */
function RE_formatPercent(value) {
  if (value === null || value === undefined || value === '') return '';
  return Number(value).toFixed(1) + '%';
}

/**
 * Parses a dollar string to number
 *
 * @param {string} dollarStr - String like "$123,456"
 * @returns {number} Numeric value
 */
function RE_parseDollar(dollarStr) {
  if (!dollarStr) return 0;
  return Number(dollarStr.toString().replace(/[$,]/g, ''));
}

/**
 * Safely converts to number
 *
 * @param {*} value - Value to convert
 * @param {number} defaultValue - Default if conversion fails
 * @returns {number} Numeric value
 */
function RE_toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Checks if a value is empty (null, undefined, empty string)
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
function RE_isEmpty(value) {
  return value === null || value === undefined || value === '';
}

/**
 * Generates a composite key for deduplication
 * Used to identify duplicate properties
 *
 * @param {string} address - Property address
 * @param {string} zip - ZIP code
 * @param {string} seller - Seller name
 * @returns {string} Composite key
 */
function RE_generateCompositeKey(address, zip, seller) {
  const normalizedAddress = RE_normalizeAddress(address);
  const normalizedZip = zip ? zip.toString().trim() : '';
  const normalizedSeller = seller ? seller.toString().trim().toUpperCase() : '';

  return `${normalizedAddress}|${normalizedZip}|${normalizedSeller}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHEET UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets or creates a sheet
 *
 * @param {string} sheetName - Name of the sheet
 * @returns {Sheet} The sheet object
 */
function RE_getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    RE_logInfo('RE_getOrCreateSheet', `Created new sheet: ${sheetName}`);
  }

  return sheet;
}

/**
 * Clears all data in a sheet except headers
 *
 * @param {Sheet} sheet - The sheet to clear
 */
function RE_clearSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

/**
 * Applies header formatting to a sheet
 *
 * @param {Sheet} sheet - The sheet to format
 */
function RE_formatHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());

  headerRange
    .setBackground(COLORS.HEADER_BG)
    .setFontColor(COLORS.HEADER_TEXT)
    .setFontWeight('bold')
    .setFontSize(10)
    .setWrap(true)
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(1);
}

/**
 * Applies alternating row banding to a sheet
 *
 * @param {Sheet} sheet - The sheet to format
 */
function RE_applyBanding(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow > 1) {
    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);

    // Remove existing banding
    const bandings = sheet.getBandings();
    bandings.forEach(banding => banding.remove());

    // Apply new banding
    dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  }
}

/**
 * Gets the next available row in a sheet
 *
 * @param {Sheet} sheet - The sheet
 * @returns {number} Next available row number
 */
function RE_getNextRow(sheet) {
  return sheet.getLastRow() + 1;
}

/**
 * Finds a row by a specific column value
 *
 * @param {Sheet} sheet - The sheet to search
 * @param {string} columnName - Header name to search in
 * @param {*} value - Value to search for
 * @returns {number} Row number (0 if not found)
 */
function RE_findRowByValue(sheet, columnName, value) {
  const data = sheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);
  const colIndex = headerMap[columnName];

  if (colIndex === undefined) return 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex] === value) {
      return i + 1; // Return 1-indexed row number
    }
  }

  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats a date to standard format
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function RE_formatDate(date) {
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Formats a date with time
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted datetime string
 */
function RE_formatDateTime(date) {
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Gets days difference between two dates
 *
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Days difference
 */
function RE_daysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

// ═══════════════════════════════════════════════════════════════════════════
// ARRAY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Removes duplicates from an array
 *
 * @param {Array} arr - Array with potential duplicates
 * @returns {Array} Array with duplicates removed
 */
function RE_uniqueArray(arr) {
  return [...new Set(arr)];
}

/**
 * Chunks an array into smaller arrays
 *
 * @param {Array} arr - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
function RE_chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
