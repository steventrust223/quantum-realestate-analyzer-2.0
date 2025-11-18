/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_import.gs - Import & Normalization Engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles:
 * - Importing leads from LEADS_* sheets
 * - Normalizing data into MASTER_PROPERTIES
 * - Deduplication
 * - Field mapping and transformation
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SYNC FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main function to run full import and sync process
 * Imports from all LEADS_* sheets to MASTER_PROPERTIES
 */
function RE_runFullSync() {
  const ui = SpreadsheetApp.getUi();

  try {
    ui.alert('🔄 Import → Master Sync',
             'Starting import from all lead sources...',
             ui.ButtonSet.OK);

    RE_logInfo('RE_runFullSync', 'Starting full sync process');

    let totalImported = 0;

    // Import from each lead source
    totalImported += RE_importFromLeadsWeb();
    totalImported += RE_importFromLeadsScraped();
    totalImported += RE_importFromLeadsDirect();

    // Update LEADS_TRACKER
    RE_syncLeadsTracker();

    RE_logSuccess('RE_runFullSync', `Full sync complete. Imported ${totalImported} new properties`);

    ui.alert('✅ Import Complete',
             `Successfully imported ${totalImported} new properties to MASTER_PROPERTIES.\n\n` +
             'Next step: Run "Full Analysis" to analyze all deals.',
             ui.ButtonSet.OK);

  } catch (error) {
    RE_logError('RE_runFullSync', 'Sync failed', error.message);
    ui.alert('❌ Import Error', `An error occurred: ${error.message}`, ui.ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT FROM INDIVIDUAL SOURCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Imports leads from LEADS_WEB sheet
 *
 * @returns {number} Number of leads imported
 */
function RE_importFromLeadsWeb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SHEET_NAMES.LEADS_WEB);

  if (!sourceSheet) {
    RE_logWarning('RE_importFromLeadsWeb', 'LEADS_WEB sheet not found');
    return 0;
  }

  const data = sourceSheet.getDataRange().getValues();
  if (data.length <= 1) {
    RE_logInfo('RE_importFromLeadsWeb', 'No leads to import from LEADS_WEB');
    return 0;
  }

  const headerMap = RE_createHeaderMap(data[0]);
  let imported = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Check if already imported
    const alreadyImported = RE_getValueByHeader(row, 'Imported to Master', headerMap);
    if (alreadyImported === 'Yes' || alreadyImported === true) {
      continue;
    }

    // Extract and normalize data
    const propertyData = {
      importSource: 'LEADS_WEB',
      leadId: RE_getValueByHeader(row, 'Lead ID', headerMap),
      address: RE_getValueByHeader(row, 'Address', headerMap),
      city: RE_getValueByHeader(row, 'City', headerMap),
      state: RE_getValueByHeader(row, 'State', headerMap),
      zip: RE_getValueByHeader(row, 'ZIP', headerMap),
      county: '',
      propertyType: RE_getValueByHeader(row, 'Property Type', headerMap) || 'Unknown',
      beds: '',
      baths: '',
      sqft: '',
      yearBuilt: '',
      occupancyStatus: '',
      askingPrice: RE_getValueByHeader(row, 'Asking Price', headerMap),
      sellerName: RE_getValueByHeader(row, 'Seller Name', headerMap),
      sellerPhone: RE_formatPhone(RE_getValueByHeader(row, 'Phone', headerMap)),
      sellerEmail: RE_getValueByHeader(row, 'Email', headerMap),
      bestContactTime: RE_getValueByHeader(row, 'Best Contact Time', headerMap),
      motivationLevel: RE_getValueByHeader(row, 'Motivation Level', headerMap),
      notes: `Source: ${RE_getValueByHeader(row, 'Source', headerMap)} | ${RE_getValueByHeader(row, 'Notes', headerMap)}`
    };

    // Add to MASTER_PROPERTIES
    if (RE_addPropertyToMaster(propertyData)) {
      // Mark as imported
      sourceSheet.getRange(i + 1, headerMap['Imported to Master'] + 1).setValue('Yes');
      sourceSheet.getRange(i + 1, headerMap['Import Date'] + 1).setValue(new Date());
      imported++;
    }
  }

  RE_logInfo('RE_importFromLeadsWeb', `Imported ${imported} leads from LEADS_WEB`);
  return imported;
}

/**
 * Imports leads from LEADS_SCRAPED sheet
 *
 * @returns {number} Number of leads imported
 */
function RE_importFromLeadsScraped() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SHEET_NAMES.LEADS_SCRAPED);

  if (!sourceSheet) {
    RE_logWarning('RE_importFromLeadsScraped', 'LEADS_SCRAPED sheet not found');
    return 0;
  }

  const data = sourceSheet.getDataRange().getValues();
  if (data.length <= 1) {
    RE_logInfo('RE_importFromLeadsScraped', 'No leads to import from LEADS_SCRAPED');
    return 0;
  }

  const headerMap = RE_createHeaderMap(data[0]);
  let imported = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Check if already imported
    const alreadyImported = RE_getValueByHeader(row, 'Imported to Master', headerMap);
    if (alreadyImported === 'Yes' || alreadyImported === true) {
      continue;
    }

    // Extract and normalize data
    const propertyData = {
      importSource: 'LEADS_SCRAPED',
      leadId: RE_getValueByHeader(row, 'Lead ID', headerMap),
      address: RE_getValueByHeader(row, 'Property Address', headerMap),
      city: RE_getValueByHeader(row, 'City', headerMap),
      state: RE_getValueByHeader(row, 'State', headerMap),
      zip: RE_getValueByHeader(row, 'ZIP', headerMap),
      county: RE_getValueByHeader(row, 'County', headerMap),
      propertyType: RE_getValueByHeader(row, 'Property Type', headerMap) || 'Unknown',
      beds: RE_getValueByHeader(row, 'Beds', headerMap),
      baths: RE_getValueByHeader(row, 'Baths', headerMap),
      sqft: RE_getValueByHeader(row, 'Sqft', headerMap),
      yearBuilt: RE_getValueByHeader(row, 'Year Built', headerMap),
      occupancyStatus: '',
      askingPrice: RE_getValueByHeader(row, 'Assessed Value', headerMap),
      sellerName: RE_getValueByHeader(row, 'Owner Name', headerMap),
      sellerPhone: RE_formatPhone(RE_getValueByHeader(row, 'Phone', headerMap)),
      sellerEmail: RE_getValueByHeader(row, 'Email', headerMap),
      bestContactTime: '',
      motivationLevel: 'Unknown',
      notes: `List: ${RE_getValueByHeader(row, 'List Source', headerMap)} | ${RE_getValueByHeader(row, 'Notes', headerMap)}`
    };

    // Add to MASTER_PROPERTIES
    if (RE_addPropertyToMaster(propertyData)) {
      // Mark as imported
      sourceSheet.getRange(i + 1, headerMap['Imported to Master'] + 1).setValue('Yes');
      sourceSheet.getRange(i + 1, headerMap['Import Date'] + 1).setValue(new Date());
      imported++;
    }
  }

  RE_logInfo('RE_importFromLeadsScraped', `Imported ${imported} leads from LEADS_SCRAPED`);
  return imported;
}

/**
 * Imports leads from LEADS_DIRECT sheet
 *
 * @returns {number} Number of leads imported
 */
function RE_importFromLeadsDirect() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SHEET_NAMES.LEADS_DIRECT);

  if (!sourceSheet) {
    RE_logWarning('RE_importFromLeadsDirect', 'LEADS_DIRECT sheet not found');
    return 0;
  }

  const data = sourceSheet.getDataRange().getValues();
  if (data.length <= 1) {
    RE_logInfo('RE_importFromLeadsDirect', 'No leads to import from LEADS_DIRECT');
    return 0;
  }

  const headerMap = RE_createHeaderMap(data[0]);
  let imported = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Check if already imported
    const alreadyImported = RE_getValueByHeader(row, 'Imported to Master', headerMap);
    if (alreadyImported === 'Yes' || alreadyImported === true) {
      continue;
    }

    // Extract and normalize data
    const propertyData = {
      importSource: 'LEADS_DIRECT',
      leadId: RE_getValueByHeader(row, 'Lead ID', headerMap),
      address: RE_getValueByHeader(row, 'Address', headerMap),
      city: RE_getValueByHeader(row, 'City', headerMap),
      state: RE_getValueByHeader(row, 'State', headerMap),
      zip: RE_getValueByHeader(row, 'ZIP', headerMap),
      county: RE_getValueByHeader(row, 'County', headerMap),
      propertyType: RE_getValueByHeader(row, 'Property Type', headerMap) || 'Unknown',
      beds: RE_getValueByHeader(row, 'Beds', headerMap),
      baths: RE_getValueByHeader(row, 'Baths', headerMap),
      sqft: RE_getValueByHeader(row, 'Sqft', headerMap),
      yearBuilt: RE_getValueByHeader(row, 'Year Built', headerMap),
      occupancyStatus: RE_getValueByHeader(row, 'Occupancy Status', headerMap),
      askingPrice: RE_getValueByHeader(row, 'Asking Price', headerMap),
      sellerName: RE_getValueByHeader(row, 'Seller Name', headerMap),
      sellerPhone: RE_formatPhone(RE_getValueByHeader(row, 'Phone', headerMap)),
      sellerEmail: RE_getValueByHeader(row, 'Email', headerMap),
      bestContactTime: '',
      motivationLevel: RE_getValueByHeader(row, 'Motivation Level', headerMap),
      notes: RE_getValueByHeader(row, 'Notes', headerMap)
    };

    // Add to MASTER_PROPERTIES
    if (RE_addPropertyToMaster(propertyData)) {
      // Mark as imported
      sourceSheet.getRange(i + 1, headerMap['Imported to Master'] + 1).setValue('Yes');
      sourceSheet.getRange(i + 1, headerMap['Import Date'] + 1).setValue(new Date());
      imported++;
    }
  }

  RE_logInfo('RE_importFromLeadsDirect', `Imported ${imported} leads from LEADS_DIRECT`);
  return imported;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD TO MASTER PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adds a property to MASTER_PROPERTIES with deduplication
 *
 * @param {Object} propertyData - Property data object
 * @returns {boolean} True if added, false if duplicate
 */
function RE_addPropertyToMaster(propertyData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) {
    RE_logError('RE_addPropertyToMaster', 'MASTER_PROPERTIES sheet not found');
    return false;
  }

  // Check for duplicates
  if (RE_isDuplicateProperty(propertyData.address, propertyData.zip, propertyData.sellerName)) {
    RE_logInfo('RE_addPropertyToMaster', `Skipping duplicate: ${propertyData.address}`);
    return false;
  }

  // Generate Property ID
  const propertyId = RE_generatePropertyId();

  // Build row data matching MASTER_PROPERTIES headers
  const newRow = [
    propertyId,                                  // Property ID
    propertyData.importSource,                   // Import Source
    propertyData.leadId,                         // Lead ID
    RE_normalizeAddress(propertyData.address),   // Address
    propertyData.city,                           // City
    propertyData.state,                          // State
    propertyData.zip,                            // ZIP
    propertyData.county,                         // County
    propertyData.propertyType,                   // Property Type
    propertyData.beds,                           // Beds
    propertyData.baths,                          // Baths
    propertyData.sqft,                           // Sqft
    propertyData.yearBuilt,                      // Year Built
    propertyData.occupancyStatus,                // Occupancy Status
    propertyData.askingPrice,                    // Asking Price
    '',                                          // Estimated ARV (will be calculated)
    '',                                          // Repair Estimate (Light)
    '',                                          // Repair Estimate (Full)
    '',                                          // Chosen Repair Budget
    '',                                          // Total All-In Cost
    '',                                          // MAO
    '',                                          // Suggested Initial Offer
    '',                                          // Max Wholesale Fee
    '',                                          // Equity %
    '',                                          // Profit Potential
    '',                                          // Profit Margin %
    propertyData.motivationLevel,                // Motivation Level
    '',                                          // Lead Score (will be calculated)
    '',                                          // Risk Score (will be calculated)
    '',                                          // Deal Class (will be calculated)
    '',                                          // Market Volume Score
    '',                                          // Sales Velocity Score
    '',                                          // Exit Strategy
    '',                                          // Hazard Flags
    propertyData.sellerName,                     // Seller Name
    propertyData.sellerPhone,                    // Seller Phone
    propertyData.sellerEmail,                    // Seller Email
    propertyData.bestContactTime,                // Best Contact Time
    propertyData.notes,                          // Notes
    PROPERTY_STATUSES.NEW,                       // Status
    new Date(),                                  // Last Updated
    new Date()                                   // Created Date
  ];

  // Append to MASTER_PROPERTIES
  masterSheet.appendRow(newRow);

  RE_logInfo('RE_addPropertyToMaster', `Added property: ${propertyId} - ${propertyData.address}`);
  return true;
}

/**
 * Checks if a property is a duplicate
 *
 * @param {string} address - Property address
 * @param {string} zip - ZIP code
 * @param {string} seller - Seller name
 * @returns {boolean} True if duplicate exists
 */
function RE_isDuplicateProperty(address, zip, seller) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return false; // No data, can't be duplicate
  }

  const compositeKey = RE_generateCompositeKey(address, zip, seller);

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    const rowAddress = RE_getValueByHeader(data[i], 'Address', headerMap);
    const rowZip = RE_getValueByHeader(data[i], 'ZIP', headerMap);
    const rowSeller = RE_getValueByHeader(data[i], 'Seller Name', headerMap);

    const rowKey = RE_generateCompositeKey(rowAddress, rowZip, rowSeller);

    if (rowKey === compositeKey) {
      return true; // Duplicate found
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADS TRACKER SYNC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Syncs MASTER_PROPERTIES with LEADS_TRACKER
 * Creates tracker entries for new properties
 */
function RE_syncLeadsTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const trackerSheet = ss.getSheetByName(SHEET_NAMES.LEADS_TRACKER);

  if (!masterSheet || !trackerSheet) {
    RE_logError('RE_syncLeadsTracker', 'Required sheets not found');
    return;
  }

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaderMap = RE_createHeaderMap(masterData[0]);

  const trackerData = trackerSheet.getDataRange().getValues();
  const trackerHeaderMap = RE_createHeaderMap(trackerData[0]);

  // Get existing lead IDs in tracker
  const existingLeadIds = new Set();
  for (let i = 1; i < trackerData.length; i++) {
    const leadId = RE_getValueByHeader(trackerData[i], 'Lead ID', trackerHeaderMap);
    if (leadId) existingLeadIds.add(leadId);
  }

  // Add missing leads to tracker
  let added = 0;
  for (let i = 1; i < masterData.length; i++) {
    const leadId = RE_getValueByHeader(masterData[i], 'Lead ID', masterHeaderMap);
    const propertyId = RE_getValueByHeader(masterData[i], 'Property ID', masterHeaderMap);

    if (!leadId || existingLeadIds.has(leadId)) {
      continue; // Skip if no lead ID or already in tracker
    }

    // Add to tracker
    const newTrackerRow = [
      leadId,
      propertyId,
      RE_getValueByHeader(masterData[i], 'Seller Name', masterHeaderMap),
      RE_getValueByHeader(masterData[i], 'Seller Phone', masterHeaderMap),
      RE_getValueByHeader(masterData[i], 'Seller Email', masterHeaderMap),
      RE_getValueByHeader(masterData[i], 'Import Source', masterHeaderMap),
      LEAD_STAGES.NEW,
      LEAD_TEMPERATURES.COLD,
      0,              // Contact Attempts
      '',             // Last Contact Date
      '',             // Last Contact Method
      '',             // Next Action Date
      '',             // Next Action Type
      '',             // Outcome
      '',             // Notes
      new Date(),     // Created Date
      new Date()      // Last Updated
    ];

    trackerSheet.appendRow(newTrackerRow);
    added++;
  }

  if (added > 0) {
    RE_logInfo('RE_syncLeadsTracker', `Added ${added} new entries to LEADS_TRACKER`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARV ESTIMATION (STUB)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estimates ARV for properties
 * This is a stub - in production, this would connect to Zillow API,
 * Redfin, or other comps sources
 *
 * For now, uses a simple heuristic based on asking price
 */
function RE_estimateARVs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) return;

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let updated = 0;

  for (let i = 1; i < data.length; i++) {
    const currentARV = RE_getValueByHeader(data[i], 'Estimated ARV', headerMap);

    if (!RE_isEmpty(currentARV)) {
      continue; // Already has ARV
    }

    const askingPrice = RE_toNumber(RE_getValueByHeader(data[i], 'Asking Price', headerMap));

    if (askingPrice > 0) {
      // Simple heuristic: ARV = asking price × 1.15
      // (assumes seller is asking below market)
      const estimatedARV = Math.round(askingPrice * 1.15);

      masterSheet.getRange(i + 1, headerMap['Estimated ARV'] + 1).setValue(estimatedARV);
      updated++;
    }
  }

  if (updated > 0) {
    RE_logInfo('RE_estimateARVs', `Estimated ARV for ${updated} properties`);
  }
}

/**
 * Estimates repair costs based on sqft
 */
function RE_estimateRepairCosts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) return;

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  const lightRepairPerSqft = RE_getSetting('mao.lightRepairMultiplier', 15);
  const fullRepairPerSqft = RE_getSetting('mao.fullRepairMultiplier', 35);

  let updated = 0;

  for (let i = 1; i < data.length; i++) {
    const sqft = RE_toNumber(RE_getValueByHeader(data[i], 'Sqft', headerMap));

    if (sqft > 0) {
      const lightRepair = Math.round(sqft * lightRepairPerSqft);
      const fullRepair = Math.round(sqft * fullRepairPerSqft);

      masterSheet.getRange(i + 1, headerMap['Repair Estimate (Light)'] + 1).setValue(lightRepair);
      masterSheet.getRange(i + 1, headerMap['Repair Estimate (Full)'] + 1).setValue(fullRepair);
      updated++;
    }
  }

  if (updated > 0) {
    RE_logInfo('RE_estimateRepairCosts', `Estimated repair costs for ${updated} properties`);
  }
}
