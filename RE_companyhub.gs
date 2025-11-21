/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_companyhub.gs - CompanyHub CRM Integration (Enterprise-Grade)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles bidirectional sync between Quantum RE Analyzer and CompanyHub CRM:
 * - Properties → CompanyHub PROPERTIES object
 * - Sellers → CompanyHub CONTACTS object
 * - Deals → CompanyHub RE DEALS object
 * - Buyers → CompanyHub BUYER PROFILES object
 * - Lead Sources tracking
 * - Comprehensive sync logging
 * - Webhook handling for bidirectional updates
 *
 * @version 2.0 Enterprise Edition
 */

// ═══════════════════════════════════════════════════════════════════════════
// COMPANYHUB API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets CompanyHub API credentials from SETTINGS
 *
 * @returns {Object} API configuration
 */
function CH_getConfig() {
  return {
    apiKey: RE_getSetting('companyhub.apiKey', ''),
    accountUrl: RE_getSetting('companyhub.accountUrl', ''),
    autoSyncEnabled: RE_getSetting('companyhub.autoSyncEnabled', false),
    syncOnlyHotSolid: RE_getSetting('companyhub.syncOnlyHotSolid', true),
    autoCreateContacts: RE_getSetting('companyhub.autoCreateContacts', true),
    autoCreateDeals: RE_getSetting('companyhub.autoCreateDeals', 'HOT_ONLY'), // HOT_ONLY, HOT_SOLID, NEVER
    dedupeStrategy: RE_getSetting('companyhub.dedupeStrategy', 'HASH_ADDRESS_COMBO')
  };
}

/**
 * Tests CompanyHub connection
 *
 * @returns {Object} Connection test result
 */
function CH_testConnection() {
  const config = CH_getConfig();

  if (!config.apiKey || !config.accountUrl) {
    return {
      success: false,
      message: 'CompanyHub API Key or Account URL not configured. Please update SETTINGS.'
    };
  }

  try {
    // Test API connection with a simple query
    const response = CH_apiRequest('GET', '/contacts?limit=1');

    if (response.success) {
      return {
        success: true,
        message: `Connected to CompanyHub successfully!\nAccount: ${config.accountUrl}`,
        contactCount: response.data.total || 0
      };
    } else {
      return {
        success: false,
        message: `Connection failed: ${response.error}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection error: ${error.message}`
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPANYHUB API WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Makes an API request to CompanyHub
 *
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} endpoint - API endpoint (e.g., '/contacts')
 * @param {Object} payload - Request payload (optional)
 * @returns {Object} API response
 */
function CH_apiRequest(method, endpoint, payload = null) {
  const config = CH_getConfig();

  if (!config.apiKey || !config.accountUrl) {
    throw new Error('CompanyHub not configured');
  }

  const url = config.accountUrl.replace(/\/$/, '') + '/api/v1' + endpoint;

  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload && (method === 'POST' || method === 'PUT')) {
    options.payload = JSON.stringify(payload);
  }

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      return {
        success: true,
        data: responseText ? JSON.parse(responseText) : {},
        statusCode: responseCode
      };
    } else {
      return {
        success: false,
        error: responseText || `HTTP ${responseCode}`,
        statusCode: responseCode
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      statusCode: 0
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION & HASH GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates dedupe hash for a property
 * Uses: normalized_address + zip + county_parcel_id
 *
 * @param {Object} propertyData - Property data
 * @returns {string} MD5 hash for deduplication
 */
function CH_generatePropertyHash(propertyData) {
  const address = (propertyData.address || '').toString().toUpperCase().trim();
  const zip = (propertyData.zip || '').toString().trim();
  const county = (propertyData.county || '').toString().toUpperCase().trim();

  const hashInput = `${address}|${zip}|${county}`;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, hashInput)
    .map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates dedupe hash for a contact
 *
 * @param {Object} contactData - Contact data
 * @returns {string} MD5 hash for deduplication
 */
function CH_generateContactHash(contactData) {
  const name = (contactData.name || '').toString().toUpperCase().trim();
  const phone = (contactData.phone || '').toString().replace(/\D/g, '');

  const hashInput = `${name}|${phone}`;
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, hashInput)
    .map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Finds existing CompanyHub record by dedupe hash
 *
 * @param {string} objectType - Object type (properties, contacts)
 * @param {string} dedupeHash - Hash to search for
 * @returns {Object|null} Existing record or null
 */
function CH_findByHash(objectType, dedupeHash) {
  const response = CH_apiRequest('GET', `/${objectType}?dedupe_hash=${dedupeHash}`);

  if (response.success && response.data.results && response.data.results.length > 0) {
    return response.data.results[0];
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logs a sync event to SYNC_LOG sheet
 *
 * @param {Object} logData - Log entry data
 */
function CH_logSync(logData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_NAMES.SYNC_LOG);

  if (!logSheet) {
    RE_logWarning('CH_logSync', 'SYNC_LOG sheet not found');
    return;
  }

  const logRow = [
    new Date(),                              // Timestamp
    'RE Analyzer',                           // System Origin
    logData.action || 'Unknown',             // Action
    logData.objectType || 'Unknown',         // Object Type
    logData.chRecordId || '',                // CompanyHub Record ID
    logData.sheetsRow || '',                 // Sheets Row Number
    logData.propertyId || '',                // Property ID
    logData.status || 'Unknown',             // Status
    logData.message || '',                   // Message
    JSON.stringify(logData.payload || {}),   // Request Payload
    JSON.stringify(logData.response || {}),  // Response Payload
    Session.getActiveUser().getEmail()       // User
  ];

  logSheet.appendRow(logRow);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY SYNC TO COMPANYHUB
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Syncs a single property to CompanyHub
 *
 * @param {string} propertyId - Property ID to sync
 * @returns {Object} Sync result
 */
function CH_syncProperty(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) {
    return { success: false, message: 'MASTER_PROPERTIES sheet not found' };
  }

  // Find property in sheet
  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);
  let propertyRow = null;
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (RE_getValueByHeader(data[i], 'Property ID', headerMap) === propertyId) {
      propertyRow = data[i];
      rowIndex = i + 1;
      break;
    }
  }

  if (!propertyRow) {
    return { success: false, message: `Property ${propertyId} not found` };
  }

  // Extract property data
  const propertyData = CH_extractPropertyData(propertyRow, headerMap);

  // Generate dedupe hash
  const dedupeHash = CH_generatePropertyHash(propertyData);
  propertyData.dedupe_hash = dedupeHash;

  // Check for existing record
  const existing = CH_findByHash('properties', dedupeHash);

  let result;
  if (existing) {
    // Update existing
    result = CH_updateProperty(existing.id, propertyData);
    result.action = 'Update';
  } else {
    // Create new
    result = CH_createProperty(propertyData);
    result.action = 'Create';
  }

  // Log sync
  CH_logSync({
    action: result.action,
    objectType: 'Property',
    chRecordId: result.recordId || '',
    sheetsRow: rowIndex,
    propertyId: propertyId,
    status: result.success ? 'Success' : 'Error',
    message: result.message || '',
    payload: propertyData,
    response: result.data || {}
  });

  // Update sheet with sync info
  if (result.success) {
    masterSheet.getRange(rowIndex, headerMap['CRM Synced'] + 1).setValue(true);
    masterSheet.getRange(rowIndex, headerMap['CRM Record ID'] + 1).setValue(result.recordId);
    masterSheet.getRange(rowIndex, headerMap['Last Sync Date'] + 1).setValue(new Date());
    masterSheet.getRange(rowIndex, headerMap['Dedupe Hash'] + 1).setValue(dedupeHash);

    // Also sync seller contact if enabled
    const config = CH_getConfig();
    if (config.autoCreateContacts) {
      CH_syncContact(propertyRow, headerMap);
    }

    // Create deal if enabled
    if (config.autoCreateDeals !== 'NEVER') {
      const dealClass = RE_getValueByHeader(propertyRow, 'Deal Class', headerMap);
      const shouldCreateDeal =
        (config.autoCreateDeals === 'HOT_ONLY' && dealClass === DEAL_CLASSES.HOT) ||
        (config.autoCreateDeals === 'HOT_SOLID' && (dealClass === DEAL_CLASSES.HOT || dealClass === DEAL_CLASSES.SOLID));

      if (shouldCreateDeal) {
        CH_createDeal(propertyData, result.recordId);
      }
    }
  }

  return result;
}

/**
 * Extracts property data from sheet row
 *
 * @param {Array} row - Data row
 * @param {Object} headerMap - Header map
 * @returns {Object} Property data for CompanyHub
 */
function CH_extractPropertyData(row, headerMap) {
  return {
    property_id: RE_getValueByHeader(row, 'Property ID', headerMap),
    address: RE_getValueByHeader(row, 'Address', headerMap),
    city: RE_getValueByHeader(row, 'City', headerMap),
    state: RE_getValueByHeader(row, 'State', headerMap),
    zip: RE_getValueByHeader(row, 'ZIP', headerMap),
    county: RE_getValueByHeader(row, 'County', headerMap),
    property_type: RE_getValueByHeader(row, 'Property Type', headerMap),
    beds: RE_getValueByHeader(row, 'Beds', headerMap),
    baths: RE_getValueByHeader(row, 'Baths', headerMap),
    sqft: RE_getValueByHeader(row, 'Sqft', headerMap),
    year_built: RE_getValueByHeader(row, 'Year Built', headerMap),
    occupancy_status: RE_getValueByHeader(row, 'Occupancy Status', headerMap),
    asking_price: RE_getValueByHeader(row, 'Asking Price', headerMap),
    arv: RE_getValueByHeader(row, 'Estimated ARV', headerMap),
    repair_estimate: RE_getValueByHeader(row, 'Chosen Repair Budget', headerMap),
    mao: RE_getValueByHeader(row, 'MAO', headerMap),
    suggested_offer: RE_getValueByHeader(row, 'Suggested Initial Offer', headerMap),
    profit_potential: RE_getValueByHeader(row, 'Profit Potential', headerMap),
    profit_margin: RE_getValueByHeader(row, 'Profit Margin %', headerMap),
    deal_class: RE_getValueByHeader(row, 'Deal Class', headerMap),
    exit_strategy: RE_getValueByHeader(row, 'Exit Strategy', headerMap),
    market_volume_score: RE_getValueByHeader(row, 'Market Volume Score', headerMap),
    sales_velocity_score: RE_getValueByHeader(row, 'Sales Velocity Score', headerMap),
    risk_score: RE_getValueByHeader(row, 'Risk Score', headerMap),
    hazard_flags: RE_getValueByHeader(row, 'Hazard Flags', headerMap),
    status: RE_getValueByHeader(row, 'Status', headerMap),
    seller_name: RE_getValueByHeader(row, 'Seller Name', headerMap),
    seller_phone: RE_getValueByHeader(row, 'Seller Phone', headerMap),
    seller_email: RE_getValueByHeader(row, 'Seller Email', headerMap),
    import_source: RE_getValueByHeader(row, 'Import Source', headerMap),
    notes: RE_getValueByHeader(row, 'Notes', headerMap),
    system_origin: 'RE Analyzer',
    source_platform: CH_extractSourcePlatform(RE_getValueByHeader(row, 'Import Source', headerMap))
  };
}

/**
 * Extracts source platform from import source
 *
 * @param {string} importSource - Import source
 * @returns {string} Source platform
 */
function CH_extractSourcePlatform(importSource) {
  if (!importSource) return 'Unknown';

  if (importSource.includes('WEB')) return 'Web Form';
  if (importSource.includes('SCRAPED')) return 'Scraped List';
  if (importSource.includes('DIRECT')) return 'Direct Entry';

  return importSource;
}

/**
 * Creates a property in CompanyHub
 *
 * @param {Object} propertyData - Property data
 * @returns {Object} Creation result
 */
function CH_createProperty(propertyData) {
  const response = CH_apiRequest('POST', '/properties', propertyData);

  if (response.success) {
    RE_logSuccess('CH_createProperty', `Created property in CompanyHub: ${propertyData.property_id}`);
    return {
      success: true,
      recordId: response.data.id,
      message: 'Property created successfully',
      data: response.data
    };
  } else {
    RE_logError('CH_createProperty', `Failed to create property: ${response.error}`);
    return {
      success: false,
      message: response.error
    };
  }
}

/**
 * Updates a property in CompanyHub
 *
 * @param {string} recordId - CompanyHub record ID
 * @param {Object} propertyData - Property data
 * @returns {Object} Update result
 */
function CH_updateProperty(recordId, propertyData) {
  const response = CH_apiRequest('PUT', `/properties/${recordId}`, propertyData);

  if (response.success) {
    RE_logSuccess('CH_updateProperty', `Updated property in CompanyHub: ${propertyData.property_id}`);
    return {
      success: true,
      recordId: recordId,
      message: 'Property updated successfully',
      data: response.data
    };
  } else {
    RE_logError('CH_updateProperty', `Failed to update property: ${response.error}`);
    return {
      success: false,
      message: response.error
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT SYNC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Syncs a contact (seller) to CompanyHub
 *
 * @param {Array} propertyRow - Property row data
 * @param {Object} headerMap - Header map
 * @returns {Object} Sync result
 */
function CH_syncContact(propertyRow, headerMap) {
  const sellerName = RE_getValueByHeader(propertyRow, 'Seller Name', headerMap);
  const sellerPhone = RE_getValueByHeader(propertyRow, 'Seller Phone', headerMap);
  const sellerEmail = RE_getValueByHeader(propertyRow, 'Seller Email', headerMap);

  // Skip if no contact info
  if (!sellerName || !sellerPhone) {
    return { success: false, message: 'Insufficient contact info' };
  }

  const contactData = {
    name: sellerName,
    phone: sellerPhone,
    email: sellerEmail,
    contact_type: ['RE Seller'],
    system_origin: 'RE Analyzer',
    source_platform: CH_extractSourcePlatform(RE_getValueByHeader(propertyRow, 'Import Source', headerMap)),
    temperature: RE_getValueByHeader(propertyRow, 'Motivation Level', headerMap) || 'Unknown',
    best_contact_time: RE_getValueByHeader(propertyRow, 'Best Contact Time', headerMap),
    tags: ['re-seller']
  };

  // Generate dedupe hash
  const dedupeHash = CH_generateContactHash(contactData);
  contactData.dedupe_hash = dedupeHash;

  // Check for existing
  const existing = CH_findByHash('contacts', dedupeHash);

  if (existing) {
    // Update existing
    return CH_apiRequest('PUT', `/contacts/${existing.id}`, contactData);
  } else {
    // Create new
    return CH_apiRequest('POST', '/contacts', contactData);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL CREATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a deal in CompanyHub
 *
 * @param {Object} propertyData - Property data
 * @param {string} propertyRecordId - CompanyHub property record ID
 * @returns {Object} Creation result
 */
function CH_createDeal(propertyData, propertyRecordId) {
  const dealData = {
    name: `${propertyData.address} - ${propertyData.exit_strategy}`,
    property_id: propertyRecordId,
    deal_class: propertyData.deal_class,
    offer_amount: propertyData.suggested_offer,
    expected_profit: propertyData.profit_potential,
    exit_strategy: propertyData.exit_strategy,
    stage: 'New Lead',
    system_tag: 'RE Analyzer',
    notes: `Auto-created from ${propertyData.deal_class} deal`
  };

  const response = CH_apiRequest('POST', '/deals', dealData);

  if (response.success) {
    RE_logSuccess('CH_createDeal', `Created deal for ${propertyData.property_id}`);
  } else {
    RE_logError('CH_createDeal', `Failed to create deal: ${response.error}`);
  }

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Syncs all HOT and SOLID deals to CompanyHub
 *
 * @returns {Object} Sync summary
 */
function CH_syncHotSolidDeals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) {
    return { success: false, message: 'MASTER_PROPERTIES sheet not found' };
  }

  const config = CH_getConfig();
  if (!config.apiKey || !config.accountUrl) {
    return { success: false, message: 'CompanyHub not configured' };
  }

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 1; i < data.length; i++) {
    const dealClass = RE_getValueByHeader(data[i], 'Deal Class', headerMap);
    const pushToCRM = RE_getValueByHeader(data[i], 'Push to CRM', headerMap);
    const propertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);

    // Check if should sync
    const shouldSync =
      pushToCRM === true ||
      (config.syncOnlyHotSolid && (dealClass === DEAL_CLASSES.HOT || dealClass === DEAL_CLASSES.SOLID));

    if (!shouldSync) {
      skipped++;
      continue;
    }

    // Sync property
    const result = CH_syncProperty(propertyId);
    if (result.success) {
      synced++;
    } else {
      errors++;
    }

    // Rate limiting - wait 100ms between requests
    Utilities.sleep(100);
  }

  const summary = {
    success: true,
    synced: synced,
    skipped: skipped,
    errors: errors,
    message: `Synced ${synced} properties, skipped ${skipped}, ${errors} errors`
  };

  RE_logSuccess('CH_syncHotSolidDeals', summary.message);
  return summary;
}

/**
 * Menu function to sync all deals
 */
function CH_syncAllDealsToCompanyHub() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.alert(
    'Sync to CompanyHub',
    'This will sync all HOT and SOLID deals to CompanyHub.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    return;
  }

  ui.alert('Syncing...', 'Please wait while properties are synced to CompanyHub.', ui.ButtonSet.OK);

  const summary = CH_syncHotSolidDeals();

  ui.alert(
    'Sync Complete',
    summary.message,
    ui.ButtonSet.OK
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLING (COMPANYHUB → SHEETS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handles incoming webhooks from CompanyHub
 * This function is triggered when CompanyHub sends updates
 *
 * @param {Object} e - Event object from webhook
 * @returns {Object} Response
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // Log incoming webhook
    RE_logInfo('CH_webhook', `Received webhook: ${payload.event_type}`);

    // Handle different webhook events
    switch (payload.event_type) {
      case 'deal.stage_changed':
        CH_handleDealStageChange(payload);
        break;
      case 'property.updated':
        CH_handlePropertyUpdate(payload);
        break;
      case 'contact.updated':
        CH_handleContactUpdate(payload);
        break;
      default:
        RE_logWarning('CH_webhook', `Unknown webhook event: ${payload.event_type}`);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    RE_logError('CH_webhook', `Webhook error: ${error.message}`);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles deal stage change webhook
 *
 * @param {Object} payload - Webhook payload
 */
function CH_handleDealStageChange(payload) {
  // Update property status in MASTER_PROPERTIES based on deal stage
  const propertyId = payload.data.property_id;
  const newStage = payload.data.new_stage;

  // Map CompanyHub stages to our statuses
  const stageMap = {
    'New Lead': PROPERTY_STATUSES.NEW,
    'Contacted': PROPERTY_STATUSES.ANALYZING,
    'Offer Made': PROPERTY_STATUSES.OFFER_MADE,
    'Under Contract': PROPERTY_STATUSES.UNDER_CONTRACT,
    'Closed': PROPERTY_STATUSES.CLOSED,
    'Dead': PROPERTY_STATUSES.DEAD
  };

  const newStatus = stageMap[newStage] || newStage;

  if (propertyId && newStatus) {
    RE_updatePropertyStatus(propertyId, newStatus);
    RE_logInfo('CH_handleDealStageChange', `Updated ${propertyId} to ${newStatus}`);
  }
}

/**
 * Handles property update webhook
 *
 * @param {Object} payload - Webhook payload
 */
function CH_handlePropertyUpdate(payload) {
  // Stub for future bidirectional sync
  RE_logInfo('CH_handlePropertyUpdate', `Property updated: ${payload.data.property_id}`);
}

/**
 * Handles contact update webhook
 *
 * @param {Object} payload - Webhook payload
 */
function CH_handleContactUpdate(payload) {
  // Stub for future bidirectional sync
  RE_logInfo('CH_handleContactUpdate', `Contact updated: ${payload.data.contact_id}`);
}
