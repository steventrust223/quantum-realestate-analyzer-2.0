/**
 * ================================================================
 * QUANTUM REAL ESTATE ANALYZER v2.0 - Data Synchronization
 * ================================================================
 * Handles importing leads from LEADS_* sheets to MASTER_PROPERTIES
 */

/**
 * Run full sync - import all leads from LEADS_* sheets
 * @return {number} Number of properties synced
 */
function RE_runFullSync() {
  try {
    logEvent('INFO', 'Sync', 'Starting full sync operation...');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    const masterSheet = getOrCreateSheet(SHEET_NAMES.MASTER_PROPERTIES, MASTER_HEADERS);

    let totalImported = 0;
    let totalSkipped = 0;
    let errorCount = 0;

    // Get existing property IDs to avoid duplicates
    const existingProperties = getSheetData(masterSheet);
    const existingAddresses = new Set(
      existingProperties.map(p => normalizeAddress(p['Address'], p['ZIP']))
    );

    // Find all LEADS_* sheets
    const leadSheets = allSheets.filter(sheet =>
      sheet.getName().startsWith(SHEET_NAMES.LEADS_PREFIX)
    );

    if (leadSheets.length === 0) {
      logEvent('WARNING', 'Sync', 'No LEADS_* sheets found. Create sheets named LEADS_<source> to import data.');
      return 0;
    }

    logEvent('INFO', 'Sync', `Found ${leadSheets.length} lead sheets to process`);

    // Process each lead sheet
    leadSheets.forEach(leadSheet => {
      const sheetName = leadSheet.getName();
      const source = sheetName.replace(SHEET_NAMES.LEADS_PREFIX, '');

      try {
        logEvent('INFO', 'Sync', `Processing ${sheetName}...`);

        if (leadSheet.getLastRow() < 2) {
          logEvent('INFO', 'Sync', `${sheetName} is empty, skipping`);
          return;
        }

        // Get data from lead sheet
        const leadData = getSheetData(leadSheet);

        leadData.forEach((lead, index) => {
          try {
            const imported = importLead(lead, source, existingAddresses, masterSheet);
            if (imported) {
              totalImported++;
            } else {
              totalSkipped++;
            }
          } catch (error) {
            logEvent('ERROR', 'Sync', `Error importing lead from ${sheetName} row ${index + 2}`, error.toString());
            errorCount++;
          }
        });

        logEvent('SUCCESS', 'Sync', `Completed processing ${sheetName}`);

      } catch (error) {
        logEvent('ERROR', 'Sync', `Failed to process ${sheetName}`, error.toString());
        errorCount++;
      }
    });

    logEvent('SUCCESS', 'Sync', `Sync completed: ${totalImported} imported, ${totalSkipped} skipped, ${errorCount} errors`);
    return totalImported;

  } catch (error) {
    logEvent('ERROR', 'Sync', 'Full sync failed', error.toString());
    throw error;
  }
}

/**
 * Import a single lead into MASTER_PROPERTIES
 * @param {Object} lead - Lead data object
 * @param {string} source - Lead source name
 * @param {Set} existingAddresses - Set of existing property addresses
 * @param {Sheet} masterSheet - MASTER_PROPERTIES sheet
 * @return {boolean} True if imported, false if skipped
 */
function importLead(lead, source, existingAddresses, masterSheet) {
  try {
    // Extract and normalize data
    const address = safeString(lead['Address'] || lead['Property Address'] || lead['Street']);
    const city = safeString(lead['City']);
    const state = safeString(lead['State']);
    const zip = safeString(lead['ZIP'] || lead['Zip Code'] || lead['ZipCode']);
    const price = safeNumber(lead['Price'] || lead['Asking Price'] || lead['List Price'], 0);

    // Skip if missing critical data
    if (!address || !city || !zip) {
      logEvent('WARNING', 'Sync', 'Skipping lead with missing address/city/zip', JSON.stringify(lead));
      return false;
    }

    // Check for duplicates
    const normalizedAddress = normalizeAddress(address, zip);
    if (existingAddresses.has(normalizedAddress)) {
      // Already exists, skip
      return false;
    }

    // Generate property ID
    const propertyId = generatePropertyID(address, zip);

    // Extract additional fields
    const bedrooms = safeNumber(lead['Bedrooms'] || lead['Beds'] || lead['BR'], 0);
    const bathrooms = safeNumber(lead['Bathrooms'] || lead['Baths'] || lead['BA'], 0);
    const sqft = safeNumber(lead['Sqft'] || lead['Square Feet'] || lead['Living Area'], 0);
    const lotSize = safeString(lead['Lot Size'] || lead['Lot']);
    const yearBuilt = safeNumber(lead['Year Built'] || lead['Year'], 0);
    const propertyType = safeString(lead['Property Type'] || lead['Type'] || 'Single Family');
    const status = safeString(lead['Status'] || 'New Lead');
    const arv = safeNumber(lead['ARV'] || lead['After Repair Value'], 0);
    const repairs = safeNumber(lead['Repairs'] || lead['Estimated Repairs'] || lead['Repair Estimate'], 0);
    const notes = safeString(lead['Notes'] || lead['Comments'] || lead['Description']);

    const now = new Date();

    // Append to MASTER_PROPERTIES
    masterSheet.appendRow([
      propertyId,
      address,
      city,
      state,
      zip,
      price,
      bedrooms,
      bathrooms,
      sqft,
      lotSize,
      yearBuilt,
      propertyType,
      status,
      source,
      now,
      now,
      arv,
      repairs,
      '', // MAO (calculated later)
      '', // Profit Potential (calculated later)
      '', // Risk Score (calculated later)
      notes
    ]);

    // Add to existing set to prevent duplicates in same sync
    existingAddresses.add(normalizedAddress);

    return true;

  } catch (error) {
    logEvent('ERROR', 'Sync', 'Failed to import lead', error.toString());
    throw error;
  }
}

/**
 * Normalize address for duplicate detection
 * @param {string} address - Address string
 * @param {string} zip - ZIP code
 * @return {string} Normalized address
 */
function normalizeAddress(address, zip) {
  const clean = safeString(address)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return `${clean}|${zip}`;
}

/**
 * Update a property in MASTER_PROPERTIES
 * @param {string} propertyId - Property ID to update
 * @param {Object} updates - Fields to update
 * @return {boolean} Success status
 */
function RE_updateProperty(propertyId, updates) {
  try {
    const masterSheet = getOrCreateSheet(SHEET_NAMES.MASTER_PROPERTIES, MASTER_HEADERS);
    const data = getSheetData(masterSheet);

    const propertyIndex = data.findIndex(p => p['Property ID'] === propertyId);
    if (propertyIndex === -1) {
      logEvent('WARNING', 'Sync', `Property ID ${propertyId} not found`);
      return false;
    }

    const rowNum = propertyIndex + 2; // +2 for header and 0-index
    const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];

    // Update each field
    Object.keys(updates).forEach(field => {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1) {
        masterSheet.getRange(rowNum, colIndex + 1).setValue(updates[field]);
      }
    });

    // Update "Last Updated" timestamp
    const lastUpdatedCol = headers.indexOf('Last Updated');
    if (lastUpdatedCol !== -1) {
      masterSheet.getRange(rowNum, lastUpdatedCol + 1).setValue(new Date());
    }

    logEvent('SUCCESS', 'Sync', `Updated property ${propertyId}`);
    return true;

  } catch (error) {
    logEvent('ERROR', 'Sync', `Failed to update property ${propertyId}`, error.toString());
    return false;
  }
}

/**
 * Mark a property as under contract
 * @param {string} propertyId - Property ID
 * @param {string} buyer - Buyer name
 * @param {Date} contractDate - Contract date
 * @return {boolean} Success status
 */
function RE_markUnderContract(propertyId, buyer, contractDate) {
  try {
    // Update MASTER_PROPERTIES
    RE_updateProperty(propertyId, {
      'Status': 'Under Contract'
    });

    // Update VERDICT
    const verdictSheet = getOrCreateSheet(SHEET_NAMES.VERDICT, VERDICT_HEADERS);
    const data = getSheetData(verdictSheet);

    const propertyIndex = data.findIndex(p => p['Property ID'] === propertyId);
    if (propertyIndex === -1) {
      logEvent('WARNING', 'Sync', `Property ${propertyId} not found in VERDICT`);
      return false;
    }

    const rowNum = propertyIndex + 2;
    const headers = verdictSheet.getRange(1, 1, 1, verdictSheet.getLastColumn()).getValues()[0];

    // Update contract fields
    const underContractCol = headers.indexOf('Under Contract');
    const contractDateCol = headers.indexOf('Contract Date');
    const buyerCol = headers.indexOf('Buyer');

    if (underContractCol !== -1) {
      verdictSheet.getRange(rowNum, underContractCol + 1).setValue('YES');
    }
    if (contractDateCol !== -1) {
      verdictSheet.getRange(rowNum, contractDateCol + 1).setValue(contractDate || new Date());
    }
    if (buyerCol !== -1) {
      verdictSheet.getRange(rowNum, buyerCol + 1).setValue(buyer || '');
    }

    logEvent('SUCCESS', 'Sync', `Marked property ${propertyId} as under contract to ${buyer}`);
    return true;

  } catch (error) {
    logEvent('ERROR', 'Sync', `Failed to mark property ${propertyId} under contract`, error.toString());
    return false;
  }
}

/**
 * Remove duplicate properties from MASTER_PROPERTIES
 * Keeps the most recent entry for each unique address
 * @return {number} Number of duplicates removed
 */
function RE_removeDuplicates() {
  try {
    logEvent('INFO', 'Sync', 'Checking for duplicate properties...');

    const masterSheet = getOrCreateSheet(SHEET_NAMES.MASTER_PROPERTIES, MASTER_HEADERS);
    const data = getSheetData(masterSheet);

    const seen = new Map();
    const rowsToDelete = [];

    data.forEach((property, index) => {
      const normalizedAddr = normalizeAddress(property['Address'], property['ZIP']);
      const rowNum = index + 2;

      if (seen.has(normalizedAddr)) {
        // Duplicate found - keep the newer one
        const existingRowNum = seen.get(normalizedAddr);
        const existingDate = masterSheet.getRange(existingRowNum, 16).getValue(); // Last Updated
        const currentDate = property['Last Updated'];

        if (currentDate > existingDate) {
          // Current is newer, delete the old one
          rowsToDelete.push(existingRowNum);
          seen.set(normalizedAddr, rowNum);
        } else {
          // Existing is newer, delete current
          rowsToDelete.push(rowNum);
        }
      } else {
        seen.set(normalizedAddr, rowNum);
      }
    });

    // Delete duplicates (in reverse order to maintain row numbers)
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowNum => {
      masterSheet.deleteRow(rowNum);
    });

    logEvent('SUCCESS', 'Sync', `Removed ${rowsToDelete.length} duplicate properties`);
    return rowsToDelete.length;

  } catch (error) {
    logEvent('ERROR', 'Sync', 'Failed to remove duplicates', error.toString());
    return 0;
  }
}

/**
 * Archive old properties that haven't been updated in X days
 * @param {number} daysOld - Number of days threshold
 * @return {number} Number of properties archived
 */
function RE_archiveOldProperties(daysOld = 90) {
  try {
    logEvent('INFO', 'Sync', `Archiving properties older than ${daysOld} days...`);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = getOrCreateSheet(SHEET_NAMES.MASTER_PROPERTIES, MASTER_HEADERS);
    const archiveSheet = getOrCreateSheet('ARCHIVE', MASTER_HEADERS);

    const data = getSheetData(masterSheet);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let archivedCount = 0;
    const rowsToDelete = [];

    data.forEach((property, index) => {
      const lastUpdated = safeDate(property['Last Updated']);
      const rowNum = index + 2;

      if (lastUpdated && lastUpdated < cutoffDate) {
        // Archive this property
        const rowData = masterSheet.getRange(rowNum, 1, 1, masterSheet.getLastColumn()).getValues()[0];
        archiveSheet.appendRow(rowData);
        rowsToDelete.push(rowNum);
        archivedCount++;
      }
    });

    // Delete archived rows (in reverse order)
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowNum => {
      masterSheet.deleteRow(rowNum);
    });

    logEvent('SUCCESS', 'Sync', `Archived ${archivedCount} old properties`);
    return archivedCount;

  } catch (error) {
    logEvent('ERROR', 'Sync', 'Failed to archive old properties', error.toString());
    return 0;
  }
}
