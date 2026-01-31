/**
 * Quantum Real Estate Analyzer - Ingestion Module
 * Handles importing and normalizing lead data from various sources
 */

// ============================================================
// MAIN INGESTION FUNCTIONS
// ============================================================

/**
 * Imports data from all staging sheets to Master Database
 */
function importFromStaging() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  logEvent('INGEST', 'Starting import from staging sheets');

  let totalImported = 0;

  // Import from each staging source
  const stagingSources = [
    { sheet: CONFIG.SHEETS.STAGING_BROWSE_AI, source: 'Browse AI' },
    { sheet: CONFIG.SHEETS.STAGING_PROPSTREAM, source: 'PropStream' },
    { sheet: CONFIG.SHEETS.STAGING_MLS, source: 'MLS' }
  ];

  stagingSources.forEach(({ sheet, source }) => {
    try {
      const count = importFromStagingSheet(ss, sheet, source);
      totalImported += count;
      logEvent('INGEST', `Imported ${count} records from ${source}`);
    } catch (error) {
      logError('INGEST', `Failed to import from ${source}: ${error.message}`, error.stack);
    }
  });

  logEvent('INGEST', `Total imported: ${totalImported} records`);
  return totalImported;
}

/**
 * Imports from a single staging sheet
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {string} stagingSheetName - Name of staging sheet
 * @param {string} sourceName - Name of the data source
 * @returns {number} Number of records imported
 */
function importFromStagingSheet(ss, stagingSheetName, sourceName) {
  const stagingSheet = ss.getSheetByName(stagingSheetName);
  if (!stagingSheet || stagingSheet.getLastRow() <= 1) return 0;

  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  if (!masterSheet) {
    throw new Error('Master Database sheet not found');
  }

  // Get staging data
  const stagingData = stagingSheet.getDataRange().getValues();
  const stagingHeaders = stagingData[0];

  // Get master headers
  const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];

  // Find the Processed column in staging
  const processedCol = stagingHeaders.indexOf('Processed');

  let importedCount = 0;
  const rowsToImport = [];

  // Process each row
  for (let i = 1; i < stagingData.length; i++) {
    const row = stagingData[i];

    // Skip if already processed
    if (processedCol >= 0 && row[processedCol] === 'Yes') continue;

    // Skip if no address
    const addressCol = stagingHeaders.indexOf('Address Raw');
    if (addressCol >= 0 && !row[addressCol]) continue;

    // Map staging row to master row
    const masterRow = mapStagingToMaster(row, stagingHeaders, masterHeaders, sourceName);
    rowsToImport.push({ stagingRow: i + 1, masterRow: masterRow });
  }

  // Batch insert to master
  if (rowsToImport.length > 0) {
    const masterLastRow = masterSheet.getLastRow();

    // Insert all rows
    const masterRows = rowsToImport.map(r => r.masterRow);
    masterSheet.getRange(masterLastRow + 1, 1, masterRows.length, masterRows[0].length)
      .setValues(masterRows);

    // Mark staging rows as processed
    rowsToImport.forEach(r => {
      if (processedCol >= 0) {
        stagingSheet.getRange(r.stagingRow, processedCol + 1).setValue('Yes');
      }
    });

    importedCount = rowsToImport.length;
  }

  return importedCount;
}

/**
 * Maps a staging row to master database format
 * @param {Array} stagingRow - Row data from staging
 * @param {Array} stagingHeaders - Staging headers
 * @param {Array} masterHeaders - Master headers
 * @param {string} sourceName - Source platform name
 * @returns {Array} Row formatted for master database
 */
function mapStagingToMaster(stagingRow, stagingHeaders, masterHeaders, sourceName) {
  const masterRow = new Array(masterHeaders.length).fill('');

  // Create mapping
  const mapping = {
    'Deal ID': generateDealId(),
    'Source Platform': sourceName,
    'Listing URL': getValueByHeader(stagingRow, stagingHeaders, 'Listing URL'),
    'Address': normalizeAddress(getValueByHeader(stagingRow, stagingHeaders, 'Address Raw')),
    'City': getValueByHeader(stagingRow, stagingHeaders, 'City'),
    'State': normalizeState(getValueByHeader(stagingRow, stagingHeaders, 'State')),
    'ZIP': normalizeZip(getValueByHeader(stagingRow, stagingHeaders, 'ZIP')),
    'Imported At': new Date(),
    'Lead Arrival Timestamp': new Date(),
    'Asking Price': normalizePrice(getValueByHeader(stagingRow, stagingHeaders, 'Price Raw')),
    'Beds': normalizeNumber(getValueByHeader(stagingRow, stagingHeaders, 'Beds Raw')),
    'Baths': normalizeNumber(getValueByHeader(stagingRow, stagingHeaders, 'Baths Raw')),
    'Sqft': normalizeNumber(getValueByHeader(stagingRow, stagingHeaders, 'Sqft Raw')),
    'Lot Size': normalizeLotSize(getValueByHeader(stagingRow, stagingHeaders, 'Lot Raw')),
    'Year Built': normalizeNumber(getValueByHeader(stagingRow, stagingHeaders, 'Year Built Raw')),
    'Status Stage': 'New Lead',
    'CRM Synced': 'No'
  };

  // Apply mapping to master row
  Object.entries(mapping).forEach(([header, value]) => {
    const index = masterHeaders.indexOf(header);
    if (index >= 0) {
      masterRow[index] = value;
    }
  });

  return masterRow;
}

/**
 * Gets value from row by header name
 */
function getValueByHeader(row, headers, headerName) {
  const index = headers.indexOf(headerName);
  return index >= 0 ? row[index] : '';
}

// ============================================================
// BROWSE AI SPECIFIC IMPORT
// ============================================================

/**
 * Import specifically from Browse AI staging
 */
function importFromBrowseAI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const count = importFromStagingSheet(ss, CONFIG.SHEETS.STAGING_BROWSE_AI, 'Browse AI');
    ss.toast(`Imported ${count} records from Browse AI`, 'Success', 5);
    logEvent('INGEST', `Browse AI import: ${count} records`);
    return count;
  } catch (error) {
    logError('INGEST', 'Browse AI import failed: ' + error.message, error.stack);
    ss.toast('Import failed: ' + error.message, 'Error', 10);
    throw error;
  }
}

// ============================================================
// WEB & AD LEADS IMPORT
// ============================================================

/**
 * Import leads from Web & Ad Leads sheet
 */
function importWebAdLeads() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const webLeadsSheet = ss.getSheetByName(CONFIG.SHEETS.WEB_AD_LEADS);
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!webLeadsSheet || webLeadsSheet.getLastRow() <= 1) {
    ss.toast('No web leads to import', 'Info', 3);
    return 0;
  }

  if (!masterSheet) {
    throw new Error('Master Database sheet not found');
  }

  const webData = webLeadsSheet.getDataRange().getValues();
  const webHeaders = webData[0];
  const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];

  const processedCol = webHeaders.indexOf('Processed');
  let importedCount = 0;
  const rowsToImport = [];

  for (let i = 1; i < webData.length; i++) {
    const row = webData[i];

    // Skip if processed
    if (processedCol >= 0 && row[processedCol] === 'Yes') continue;

    // Map web lead to master format
    const masterRow = mapWebLeadToMaster(row, webHeaders, masterHeaders);
    rowsToImport.push({ webRow: i + 1, masterRow: masterRow });
  }

  if (rowsToImport.length > 0) {
    const masterLastRow = masterSheet.getLastRow();
    const masterRows = rowsToImport.map(r => r.masterRow);
    masterSheet.getRange(masterLastRow + 1, 1, masterRows.length, masterRows[0].length)
      .setValues(masterRows);

    // Mark as processed
    rowsToImport.forEach(r => {
      if (processedCol >= 0) {
        webLeadsSheet.getRange(r.webRow, processedCol + 1).setValue('Yes');
      }
    });

    importedCount = rowsToImport.length;
  }

  ss.toast(`Imported ${importedCount} web leads`, 'Success', 5);
  logEvent('INGEST', `Web & Ad leads import: ${importedCount} records`);
  return importedCount;
}

/**
 * Maps a web lead to master database format
 */
function mapWebLeadToMaster(webRow, webHeaders, masterHeaders) {
  const masterRow = new Array(masterHeaders.length).fill('');

  const mapping = {
    'Deal ID': generateDealId(),
    'Source Platform': 'Web/Ad Lead',
    'Source Campaign': getValueByHeader(webRow, webHeaders, 'Campaign'),
    'Address': normalizeAddress(getValueByHeader(webRow, webHeaders, 'Property Address')),
    'City': getValueByHeader(webRow, webHeaders, 'Property City'),
    'State': normalizeState(getValueByHeader(webRow, webHeaders, 'Property State')),
    'ZIP': normalizeZip(getValueByHeader(webRow, webHeaders, 'Property ZIP')),
    'Imported At': new Date(),
    'Lead Arrival Timestamp': new Date(getValueByHeader(webRow, webHeaders, 'Timestamp') || new Date()),
    'Asking Price': normalizePrice(getValueByHeader(webRow, webHeaders, 'Asking Price')),
    'Motivation Signals': getValueByHeader(webRow, webHeaders, 'Motivation'),
    'Status Stage': 'New Lead',
    'CRM Synced': 'No'
  };

  Object.entries(mapping).forEach(([header, value]) => {
    const index = masterHeaders.indexOf(header);
    if (index >= 0) {
      masterRow[index] = value;
    }
  });

  return masterRow;
}

// ============================================================
// DATA NORMALIZATION
// ============================================================

/**
 * Normalizes all data in Master Database
 */
function normalizeAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  logEvent('NORMALIZE', 'Starting data normalization');

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];

  // Get column indices
  const colMap = {};
  headers.forEach((header, index) => {
    colMap[header] = index;
  });

  let changesCount = 0;

  // Normalize each row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let changed = false;

    // Normalize Address
    if (colMap['Address'] !== undefined) {
      const normalized = normalizeAddress(row[colMap['Address']]);
      if (normalized !== row[colMap['Address']]) {
        data[i][colMap['Address']] = normalized;
        changed = true;
      }
    }

    // Normalize State
    if (colMap['State'] !== undefined) {
      const normalized = normalizeState(row[colMap['State']]);
      if (normalized !== row[colMap['State']]) {
        data[i][colMap['State']] = normalized;
        changed = true;
      }
    }

    // Normalize ZIP
    if (colMap['ZIP'] !== undefined) {
      const normalized = normalizeZip(row[colMap['ZIP']]);
      if (normalized !== row[colMap['ZIP']]) {
        data[i][colMap['ZIP']] = normalized;
        changed = true;
      }
    }

    // Normalize Asking Price
    if (colMap['Asking Price'] !== undefined) {
      const normalized = normalizePrice(row[colMap['Asking Price']]);
      if (normalized !== row[colMap['Asking Price']]) {
        data[i][colMap['Asking Price']] = normalized;
        changed = true;
      }
    }

    // Normalize numeric fields
    const numericFields = ['Beds', 'Baths', 'Sqft', 'Year Built', 'ARV'];
    numericFields.forEach(field => {
      if (colMap[field] !== undefined) {
        const normalized = normalizeNumber(row[colMap[field]]);
        if (normalized !== row[colMap[field]]) {
          data[i][colMap[field]] = normalized;
          changed = true;
        }
      }
    });

    if (changed) changesCount++;
  }

  // Write back if changes made
  if (changesCount > 0) {
    masterSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    logEvent('NORMALIZE', `Normalized ${changesCount} rows`);
  }

  return changesCount;
}

/**
 * Normalizes an address string
 * @param {string} address - Raw address
 * @returns {string} Normalized address
 */
function normalizeAddress(address) {
  if (!address) return '';

  let normalized = String(address).trim();

  // Title case
  normalized = normalized.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  // Standardize common abbreviations
  const replacements = {
    ' Street': ' St',
    ' Avenue': ' Ave',
    ' Boulevard': ' Blvd',
    ' Drive': ' Dr',
    ' Lane': ' Ln',
    ' Road': ' Rd',
    ' Court': ' Ct',
    ' Circle': ' Cir',
    ' Place': ' Pl',
    ' North ': ' N ',
    ' South ': ' S ',
    ' East ': ' E ',
    ' West ': ' W ',
    ' Northeast ': ' NE ',
    ' Northwest ': ' NW ',
    ' Southeast ': ' SE ',
    ' Southwest ': ' SW '
  };

  Object.entries(replacements).forEach(([from, to]) => {
    normalized = normalized.replace(new RegExp(from, 'gi'), to);
  });

  // Remove unit/apt duplicates
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Normalizes a state to 2-letter abbreviation
 * @param {string} state - State input
 * @returns {string} 2-letter state code
 */
function normalizeState(state) {
  if (!state) return '';

  const stateMap = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
  };

  const cleaned = String(state).trim().toLowerCase();

  // Already a 2-letter code?
  if (cleaned.length === 2) {
    return cleaned.toUpperCase();
  }

  return stateMap[cleaned] || cleaned.toUpperCase();
}

/**
 * Normalizes a ZIP code to 5 digits
 * @param {*} zip - ZIP code input
 * @returns {string} 5-digit ZIP code
 */
function normalizeZip(zip) {
  if (!zip) return '';

  let cleaned = String(zip).replace(/[^0-9]/g, '');

  // Take first 5 digits
  if (cleaned.length >= 5) {
    cleaned = cleaned.substring(0, 5);
  }

  // Pad with leading zeros if needed
  while (cleaned.length < 5 && cleaned.length > 0) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Normalizes a price value to number
 * @param {*} price - Price input
 * @returns {number} Numeric price
 */
function normalizePrice(price) {
  if (!price) return 0;

  // Remove currency symbols and commas
  let cleaned = String(price).replace(/[$,]/g, '');

  // Handle K/M suffixes
  if (/k$/i.test(cleaned)) {
    cleaned = parseFloat(cleaned) * 1000;
  } else if (/m$/i.test(cleaned)) {
    cleaned = parseFloat(cleaned) * 1000000;
  } else {
    cleaned = parseFloat(cleaned);
  }

  return isNaN(cleaned) ? 0 : Math.round(cleaned);
}

/**
 * Normalizes a number value
 * @param {*} value - Input value
 * @returns {number} Numeric value
 */
function normalizeNumber(value) {
  if (!value && value !== 0) return '';

  let cleaned = String(value).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? '' : parsed;
}

/**
 * Normalizes lot size to acres
 * @param {*} lot - Lot size input
 * @returns {number} Lot size in acres
 */
function normalizeLotSize(lot) {
  if (!lot) return '';

  let cleaned = String(lot).toLowerCase();
  let acres = 0;

  // Check for sqft
  if (cleaned.includes('sqft') || cleaned.includes('sq ft')) {
    const sqft = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
    acres = sqft / 43560;
  }
  // Check for acres
  else if (cleaned.includes('acre')) {
    acres = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  }
  // Assume sqft if large number
  else {
    const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
    if (num > 100) {
      acres = num / 43560;
    } else {
      acres = num;
    }
  }

  return isNaN(acres) ? '' : Math.round(acres * 100) / 100;
}

// ============================================================
// DEAL ID GENERATION
// ============================================================

/**
 * Generates a unique Deal ID
 * @returns {string} Unique deal ID
 */
function generateDealId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `Q${timestamp}${random}`;
}

// ============================================================
// LEAD ARRIVAL TIMESTAMP
// ============================================================

/**
 * Stamps lead arrival timestamp for speed-to-lead tracking
 */
function stampLeadArrival() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const arrivalCol = headers.indexOf('Lead Arrival Timestamp') + 1;

  if (arrivalCol <= 0) return;

  const data = masterSheet.getRange(2, 1, masterSheet.getLastRow() - 1, masterSheet.getLastColumn()).getValues();

  let stamped = 0;
  for (let i = 0; i < data.length; i++) {
    // If no arrival timestamp, set it
    if (!data[i][arrivalCol - 1]) {
      masterSheet.getRange(i + 2, arrivalCol).setValue(new Date());
      stamped++;
    }
  }

  if (stamped > 0) {
    logEvent('STL', `Stamped arrival time for ${stamped} leads`);
  }
}

// ============================================================
// IMPORT HUB MANAGEMENT
// ============================================================

/**
 * Updates the Import Hub with current status
 */
function updateImportHub() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hubSheet = ss.getSheetByName(CONFIG.SHEETS.IMPORT_HUB);

  if (!hubSheet) return;

  // Clear and rebuild
  if (hubSheet.getLastRow() > 1) {
    hubSheet.getRange(2, 1, hubSheet.getLastRow() - 1, 5).clearContent();
  }

  const sources = [
    { name: 'Browse AI', sheet: CONFIG.SHEETS.STAGING_BROWSE_AI },
    { name: 'PropStream', sheet: CONFIG.SHEETS.STAGING_PROPSTREAM },
    { name: 'MLS', sheet: CONFIG.SHEETS.STAGING_MLS },
    { name: 'Web & Ad Leads', sheet: CONFIG.SHEETS.WEB_AD_LEADS }
  ];

  const hubData = [];
  sources.forEach(source => {
    const sheet = ss.getSheetByName(source.sheet);
    const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
    const status = sheet ? 'Active' : 'Not Found';

    hubData.push([
      source.name,
      count,
      new Date(),
      status,
      '=HYPERLINK("#gid=' + (sheet ? sheet.getSheetId() : '') + '","Go")'
    ]);
  });

  hubSheet.getRange(2, 1, hubData.length, 5).setValues(hubData);
}
