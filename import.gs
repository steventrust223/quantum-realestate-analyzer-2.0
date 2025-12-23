/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Import Module (import.gs)
 * ============================================================================
 *
 * Handles data import from Import Hub, normalization, and population of Leads Database.
 * Supports Browse.AI imports, manual entry, and webhook captures.
 */

// =============================================================================
// MAIN IMPORT FUNCTIONS
// =============================================================================

/**
 * Main import function - imports all new rows from Import Hub to Leads Database
 * @returns {Object} Import result summary
 */
function importNewLeads() {
  try {
    logInfo('Import', 'Starting lead import process...');
    showToast('Importing leads...', 'Import', 30);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const importSheet = ss.getSheetByName(SHEETS.IMPORT_HUB);
    const leadsSheet = ss.getSheetByName(SHEETS.LEADS_DATABASE);

    if (!importSheet || !leadsSheet) {
      throw new Error('Required sheets not found. Please run setup first.');
    }

    // Get import data
    const importData = importSheet.getDataRange().getValues();
    if (importData.length < 2) {
      logInfo('Import', 'No data to import');
      showToast('No new leads to import');
      return { imported: 0, skipped: 0, errors: 0 };
    }

    const importHeaders = importData[0];

    // Get existing leads to check for duplicates
    const existingLeads = getExistingLeadIds();

    // Process each row
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 1; i < importData.length; i++) {
      try {
        const row = importData[i];

        // Skip empty rows
        if (isRowEmpty(row)) {
          skipped++;
          continue;
        }

        // Create lead object from import row
        const lead = parseImportRow(row, importHeaders);

        // Check for duplicates by address
        if (isDuplicateLead(lead, existingLeads)) {
          logInfo('Import', `Skipping duplicate: ${lead.address}`);
          skipped++;
          continue;
        }

        // Normalize and add lead
        const normalizedLead = normalizeLead(lead);
        addLeadToDatabase(leadsSheet, normalizedLead);

        // Add to existing set to prevent duplicates in same batch
        existingLeads.add(normalizedLead.leadId);
        existingLeads.add(normalizedLead.address.toLowerCase());

        imported++;

        // Rate limiting
        if (imported % 10 === 0) {
          Utilities.sleep(AUTOMATION.TIMING.IMPORT_DELAY_MS);
        }
      } catch (rowError) {
        logError('Import', rowError, `Error processing row ${i + 1}`);
        errors++;
      }
    }

    // Clear Import Hub after successful import
    if (imported > 0) {
      clearImportHub(importSheet);
    }

    const result = { imported, skipped, errors };
    logSuccess('Import', `Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    showToast(`Imported ${imported} leads`, 'Import Complete');

    return result;
  } catch (e) {
    logError('Import', e, 'Import process failed');
    showToast('Import failed: ' + e.message, 'Error');
    throw e;
  }
}

/**
 * Gets set of existing lead IDs and addresses for duplicate checking
 * @returns {Set} Set of existing identifiers
 */
function getExistingLeadIds() {
  const existingSet = new Set();

  try {
    const leadsData = getSheetDataAsObjects(SHEETS.LEADS_DATABASE);

    leadsData.forEach(lead => {
      if (lead['Lead ID']) existingSet.add(lead['Lead ID']);
      if (lead['Address']) existingSet.add(lead['Address'].toString().toLowerCase());
    });
  } catch (e) {
    logWarning('Import', 'Could not load existing leads for duplicate check');
  }

  return existingSet;
}

/**
 * Checks if a row is empty
 * @param {Array} row - Row data
 * @returns {boolean} True if empty
 */
function isRowEmpty(row) {
  return row.every(cell => isEmpty(cell));
}

/**
 * Parses an import row into a lead object
 * @param {Array} row - Row data
 * @param {Array} headers - Column headers
 * @returns {Object} Parsed lead object
 */
function parseImportRow(row, headers) {
  const lead = {};

  // Map columns flexibly (handles different import formats)
  const columnMappings = {
    // Address variants
    'address': ['Address', 'Property Address', 'Street Address', 'Full Address', 'address'],
    'city': ['City', 'city'],
    'state': ['State', 'state', 'ST'],
    'zip': ['ZIP', 'Zip', 'Zip Code', 'Postal Code', 'zip', 'zipcode'],
    'county': ['County', 'county'],

    // Property details
    'askingPrice': ['Asking Price', 'Price', 'List Price', 'asking_price', 'price'],
    'beds': ['Beds', 'Bedrooms', 'BR', 'beds', 'bedrooms'],
    'baths': ['Baths', 'Bathrooms', 'BA', 'baths', 'bathrooms'],
    'sqft': ['SqFt', 'Square Feet', 'Sq Ft', 'sqft', 'square_feet', 'Living Area'],
    'lotSize': ['Lot Size', 'Lot', 'lot_size', 'Lot Sq Ft'],
    'yearBuilt': ['Year Built', 'Year', 'year_built', 'Built'],
    'propertyType': ['Property Type', 'Type', 'property_type', 'Home Type'],

    // Condition and occupancy
    'occupancy': ['Occupancy', 'Occupied', 'Vacant', 'occupancy'],
    'condition': ['Condition', 'Property Condition', 'condition'],

    // Seller info
    'sellerName': ['Seller Name', 'Owner Name', 'Name', 'seller_name', 'owner'],
    'sellerPhone': ['Seller Phone', 'Phone', 'Owner Phone', 'phone', 'seller_phone'],
    'sellerEmail': ['Seller Email', 'Email', 'Owner Email', 'email', 'seller_email'],

    // Source and notes
    'source': ['Source Platform', 'Source', 'Platform', 'source'],
    'listingUrl': ['Listing URL', 'URL', 'Link', 'listing_url', 'url'],
    'motivationSignals': ['Motivation Signals', 'Motivation', 'motivation'],
    'notes': ['Notes', 'Comments', 'notes'],
    'description': ['Description', 'Property Description', 'description', 'Remarks']
  };

  // Map each field
  for (const [field, variants] of Object.entries(columnMappings)) {
    for (const variant of variants) {
      const colIndex = headers.findIndex(h =>
        h.toString().toLowerCase() === variant.toLowerCase()
      );
      if (colIndex !== -1 && !isEmpty(row[colIndex])) {
        lead[field] = row[colIndex];
        break;
      }
    }
  }

  return lead;
}

/**
 * Checks if a lead is a duplicate
 * @param {Object} lead - Lead to check
 * @param {Set} existingSet - Set of existing identifiers
 * @returns {boolean} True if duplicate
 */
function isDuplicateLead(lead, existingSet) {
  if (!lead.address) return false;

  const normalizedAddress = lead.address.toString().toLowerCase().trim();
  return existingSet.has(normalizedAddress);
}

/**
 * Normalizes a lead object with clean, consistent data
 * @param {Object} lead - Raw lead data
 * @returns {Object} Normalized lead
 */
function normalizeLead(lead) {
  const conditionData = normalizeCondition(lead.condition);

  return {
    leadId: generateLeadId(),
    address: cleanAddress(lead.address),
    city: (lead.city || '').toString().trim(),
    state: (lead.state || '').toString().toUpperCase().trim(),
    zip: extractZip(lead.address, lead.zip),
    county: (lead.county || '').toString().trim(),
    source: (lead.source || 'Manual').toString().trim(),
    listingUrl: (lead.listingUrl || '').toString().trim(),
    askingPrice: safeParseNumber(lead.askingPrice, 0),
    beds: safeParseNumber(lead.beds, 0),
    baths: safeParseNumber(lead.baths, 0),
    sqft: safeParseNumber(lead.sqft, 0),
    lotSize: safeParseNumber(lead.lotSize, 0),
    yearBuilt: safeParseNumber(lead.yearBuilt, 0),
    propertyType: normalizePropertyType(lead.propertyType),
    occupancy: normalizeOccupancy(lead.occupancy),
    condition: conditionData.text,
    conditionScore: conditionData.score,
    sellerName: (lead.sellerName || '').toString().trim(),
    sellerPhone: cleanPhone(lead.sellerPhone),
    sellerEmail: (lead.sellerEmail || '').toString().toLowerCase().trim(),
    motivationSignals: (lead.motivationSignals || '').toString().trim(),
    notes: (lead.notes || '').toString().trim(),
    description: (lead.description || '').toString().trim(),
    timestamp: new Date(),
    status: 'New'
  };
}

/**
 * Normalizes property type to standard format
 * @param {string} type - Raw property type
 * @returns {string} Normalized type
 */
function normalizePropertyType(type) {
  if (isEmpty(type)) return 'Single Family';

  const typeLower = type.toString().toLowerCase();

  const typeMap = {
    'single family': ['single family', 'sfr', 'single-family', 'house', 'detached'],
    'multi-family': ['multi-family', 'multifamily', 'multi family', 'duplex', 'triplex', 'quadplex', 'fourplex'],
    'condo': ['condo', 'condominium', 'condo/townhouse'],
    'townhouse': ['townhouse', 'townhome', 'row house'],
    'mobile': ['mobile', 'manufactured', 'mobile home', 'trailer'],
    'land': ['land', 'lot', 'vacant land', 'acreage'],
    'commercial': ['commercial', 'retail', 'office', 'industrial']
  };

  for (const [normalized, variants] of Object.entries(typeMap)) {
    if (variants.some(v => typeLower.includes(v))) {
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
  }

  return type;
}

/**
 * Adds a normalized lead to the Leads Database
 * @param {Sheet} sheet - Leads Database sheet
 * @param {Object} lead - Normalized lead object
 */
function addLeadToDatabase(sheet, lead) {
  const row = [
    lead.leadId,
    lead.address,
    lead.city,
    lead.state,
    lead.zip,
    lead.county,
    lead.source,
    lead.listingUrl,
    lead.askingPrice,
    lead.beds,
    lead.baths,
    lead.sqft,
    lead.lotSize,
    lead.yearBuilt,
    lead.propertyType,
    lead.occupancy,
    lead.condition,
    lead.conditionScore,
    lead.sellerName,
    lead.sellerPhone,
    lead.sellerEmail,
    lead.motivationSignals,
    lead.notes,
    lead.description,
    lead.timestamp,
    lead.status
  ];

  sheet.appendRow(row);
}

/**
 * Clears the Import Hub after successful import
 * @param {Sheet} sheet - Import Hub sheet
 */
function clearImportHub(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }
}

// =============================================================================
// WEBHOOK HANDLERS
// =============================================================================

/**
 * Handles incoming webhook data from OhmyLead or similar services
 * @param {Object} e - Event object from doPost
 * @returns {Object} Response object
 */
function handleWebhookImport(e) {
  try {
    logInfo('Import', 'Webhook received');

    if (!e || !e.postData) {
      throw new Error('No data received');
    }

    const data = JSON.parse(e.postData.contents);

    // Validate webhook source
    if (!validateWebhookSource(e)) {
      logWarning('Import', 'Invalid webhook source');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid source'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Parse and import the lead
    const lead = parseWebhookLead(data);
    const normalized = normalizeLead(lead);

    const leadsSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(SHEETS.LEADS_DATABASE);

    if (leadsSheet) {
      addLeadToDatabase(leadsSheet, normalized);
      logSuccess('Import', `Webhook lead imported: ${normalized.address}`);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      leadId: normalized.leadId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    logError('Import', e, 'Webhook import failed');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: e.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Validates webhook source (stub - implement based on your security needs)
 * @param {Object} e - Event object
 * @returns {boolean} True if valid
 */
function validateWebhookSource(e) {
  // Check for API key in header or parameter
  const apiKey = e.parameter.api_key ||
    (e.headers && e.headers['X-API-Key']) ||
    (e.headers && e.headers['Authorization']);

  // TODO: Implement actual validation against stored API key
  return true; // Placeholder - implement security check
}

/**
 * Parses webhook data into lead format
 * @param {Object} data - Webhook payload
 * @returns {Object} Parsed lead
 */
function parseWebhookLead(data) {
  // OhmyLead format adaptation
  return {
    address: data.address || data.property_address || data.street,
    city: data.city,
    state: data.state,
    zip: data.zip || data.postal_code,
    askingPrice: data.price || data.asking_price || data.list_price,
    beds: data.beds || data.bedrooms,
    baths: data.baths || data.bathrooms,
    sqft: data.sqft || data.square_feet || data.living_area,
    yearBuilt: data.year_built || data.year,
    propertyType: data.property_type || data.type,
    condition: data.condition,
    occupancy: data.occupancy,
    sellerName: data.seller_name || data.owner_name || data.contact_name,
    sellerPhone: data.seller_phone || data.phone || data.contact_phone,
    sellerEmail: data.seller_email || data.email || data.contact_email,
    source: data.source || 'OhmyLead',
    listingUrl: data.url || data.listing_url,
    motivationSignals: data.motivation || data.motivation_signals,
    notes: data.notes,
    description: data.description || data.remarks
  };
}

/**
 * Web app entry point for POST requests
 * @param {Object} e - Event object
 * @returns {Object} Response
 */
function doPost(e) {
  return handleWebhookImport(e);
}

/**
 * Web app entry point for GET requests (health check)
 * @param {Object} e - Event object
 * @returns {Object} Response
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Quantum Real Estate Analyzer Webhook Endpoint',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// =============================================================================
// BROWSE.AI SPECIFIC IMPORT
// =============================================================================

/**
 * Imports data from Browse.AI format
 * @param {Array} browseData - Data from Browse.AI
 * @returns {Object} Import result
 */
function importFromBrowseAI(browseData) {
  try {
    logInfo('Import', 'Importing from Browse.AI format...');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const importSheet = ss.getSheetByName(SHEETS.IMPORT_HUB);

    if (!importSheet) {
      throw new Error('Import Hub sheet not found');
    }

    // Clear existing import data
    clearImportHub(importSheet);

    // Parse Browse.AI data structure
    const leads = Array.isArray(browseData) ? browseData :
      (browseData.results || browseData.data || []);

    if (leads.length === 0) {
      logInfo('Import', 'No Browse.AI data to import');
      return { success: true, count: 0 };
    }

    // Get headers from first item
    const headers = Object.keys(leads[0]);
    importSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Add data rows
    const rows = leads.map(lead => headers.map(h => lead[h] || ''));
    if (rows.length > 0) {
      importSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    logSuccess('Import', `Browse.AI data loaded: ${rows.length} rows`);

    // Now run the standard import
    return importNewLeads();
  } catch (e) {
    logError('Import', e, 'Browse.AI import failed');
    throw e;
  }
}

// =============================================================================
// MANUAL IMPORT HELPERS
// =============================================================================

/**
 * Creates a sample import row for testing
 */
function createSampleImportRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(SHEETS.IMPORT_HUB);

  if (!importSheet) {
    showToast('Import Hub sheet not found');
    return;
  }

  const sampleData = [
    '123 Main Street',
    'Austin',
    'TX',
    '78701',
    'Travis',
    'Zillow',
    'https://zillow.com/homedetails/123',
    250000,
    3,
    2,
    1500,
    7500,
    1985,
    'Single Family',
    'Vacant',
    'Fair - needs updates',
    '',
    'John Smith',
    '512-555-1234',
    'john@email.com',
    'Motivated - relocating for work',
    'Owner mentioned needs to sell quickly',
    'Charming home needs cosmetic updates. Great bones!',
    new Date(),
    'New'
  ];

  importSheet.appendRow(sampleData);
  showToast('Sample row added to Import Hub');
}

/**
 * Validates import data before processing
 * @returns {Object} Validation result
 */
function validateImportData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(SHEETS.IMPORT_HUB);

  if (!importSheet) {
    return { valid: false, message: 'Import Hub not found' };
  }

  const data = importSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { valid: true, message: 'No data to validate', rowCount: 0 };
  }

  const headers = data[0];
  const issues = [];
  let validRows = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Check for required address
    const addressCol = headers.findIndex(h =>
      h.toLowerCase().includes('address')
    );

    if (addressCol === -1 || isEmpty(row[addressCol])) {
      issues.push(`Row ${i + 1}: Missing address`);
    } else {
      validRows++;
    }
  }

  return {
    valid: issues.length === 0,
    message: issues.length === 0 ? `${validRows} valid rows` : `${issues.length} issues found`,
    validRows: validRows,
    issues: issues.slice(0, 10) // Limit to first 10 issues
  };
}

// =============================================================================
// IMPORT STATISTICS
// =============================================================================

/**
 * Gets import statistics
 * @returns {Object} Import statistics
 */
function getImportStats() {
  const leadsData = getSheetDataAsObjects(SHEETS.LEADS_DATABASE);

  // Count by source
  const bySource = {};
  const byStatus = {};
  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  leadsData.forEach(lead => {
    // By source
    const source = lead['Source Platform'] || 'Unknown';
    bySource[source] = (bySource[source] || 0) + 1;

    // By status
    const status = lead['Status'] || 'Unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    // By date
    const timestamp = lead['Timestamp Imported'];
    if (timestamp) {
      const date = new Date(timestamp);
      if (date >= todayStart) today++;
      if (date >= weekStart) thisWeek++;
      if (date >= monthStart) thisMonth++;
    }
  });

  return {
    total: leadsData.length,
    today: today,
    thisWeek: thisWeek,
    thisMonth: thisMonth,
    bySource: bySource,
    byStatus: byStatus
  };
}

/**
 * Gets recent imports for display
 * @param {number} limit - Maximum number to return
 * @returns {Array} Recent imports
 */
function getRecentImports(limit = 10) {
  const leadsData = getSheetDataAsObjects(SHEETS.LEADS_DATABASE);

  // Sort by timestamp descending
  return leadsData
    .sort((a, b) => {
      const dateA = new Date(a['Timestamp Imported'] || 0);
      const dateB = new Date(b['Timestamp Imported'] || 0);
      return dateB - dateA;
    })
    .slice(0, limit)
    .map(lead => ({
      leadId: lead['Lead ID'],
      address: lead['Address'],
      city: lead['City'],
      state: lead['State'],
      askingPrice: lead['Asking Price'],
      source: lead['Source Platform'],
      timestamp: lead['Timestamp Imported'],
      status: lead['Status']
    }));
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Imports multiple leads from a 2D array (for API/programmatic use)
 * @param {Array} data - 2D array with headers in first row
 * @returns {Object} Import result
 */
function bulkImportLeads(data) {
  if (!Array.isArray(data) || data.length < 2) {
    return { success: false, message: 'Invalid data format' };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const importSheet = ss.getSheetByName(SHEETS.IMPORT_HUB);

    // Clear and populate Import Hub
    clearImportHub(importSheet);

    // Set headers
    importSheet.getRange(1, 1, 1, data[0].length).setValues([data[0]]);

    // Set data
    if (data.length > 1) {
      importSheet.getRange(2, 1, data.length - 1, data[0].length)
        .setValues(data.slice(1));
    }

    // Run import
    return importNewLeads();
  } catch (e) {
    logError('Import', e, 'Bulk import failed');
    return { success: false, message: e.message };
  }
}

/**
 * Exports leads to CSV format
 * @param {string} filter - Optional filter (all, new, analyzed, hot)
 * @returns {string} CSV content
 */
function exportLeadsToCsv(filter = 'all') {
  const leadsData = getSheetDataAsObjects(SHEETS.LEADS_DATABASE);

  let filtered = leadsData;
  if (filter === 'new') {
    filtered = leadsData.filter(l => l['Status'] === 'New');
  } else if (filter === 'analyzed') {
    filtered = leadsData.filter(l => l['Status'] === 'Analyzed');
  }

  if (filtered.length === 0) {
    return '';
  }

  // Get headers
  const headers = Object.keys(filtered[0]).filter(k => k !== '_rowIndex');

  // Build CSV
  let csv = headers.join(',') + '\n';

  filtered.forEach(row => {
    const values = headers.map(h => {
      let val = row[h] || '';
      // Escape quotes and wrap in quotes if contains comma
      if (typeof val === 'string') {
        val = val.replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n')) {
          val = `"${val}"`;
        }
      }
      return val;
    });
    csv += values.join(',') + '\n';
  });

  return csv;
}
