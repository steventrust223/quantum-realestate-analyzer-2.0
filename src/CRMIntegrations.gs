/**
 * Quantum Real Estate Analyzer - CRM Integrations Module
 * Handles sync with SMS-iT, CompanyHub, OhMyLead
 *
 * P1 FIX: Real API calls enabled with retry logic and proper error handling
 */

// ============================================================
// CRM FETCH HELPER WITH RETRY LOGIC
// ============================================================

/**
 * Shared CRM fetch helper with retry, logging, and standardized response
 * @param {string} url - API endpoint URL
 * @param {Object} options - UrlFetchApp options
 * @param {string} serviceName - CRM service name for logging
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 * @returns {Object} Standardized response {success, recordId, service, message, data}
 */
function crmFetch_(url, options, serviceName, maxRetries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s
        Utilities.sleep(attempt * 1000);
        logEvent('CRM', `${serviceName} retry attempt ${attempt}/${maxRetries}`);
      }

      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      // Parse response
      let responseData = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { raw: responseText };
      }

      // Check for success (2xx status codes)
      if (responseCode >= 200 && responseCode < 300) {
        const result = {
          success: true,
          recordId: responseData.id || responseData.recordId || responseData.contact_id || `${serviceName}_${Date.now()}`,
          service: serviceName,
          message: 'Success',
          data: responseData
        };

        logSync(serviceName, 'API_CALL', url, 'SUCCESS', result.recordId);
        logEvent('CRM', `${serviceName} API call successful: ${result.recordId}`);
        return result;
      }

      // Non-2xx response
      lastError = `HTTP ${responseCode}: ${responseData.error || responseData.message || responseText}`;
      logSync(serviceName, 'API_CALL', url, 'FAILED', lastError);

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (responseCode >= 400 && responseCode < 500 && responseCode !== 429) {
        break;
      }

    } catch (error) {
      lastError = error.message;
      logSync(serviceName, 'API_CALL', url, 'ERROR', lastError);
    }
  }

  // All retries exhausted
  logError('CRM', `${serviceName} API call failed after ${maxRetries + 1} attempts: ${lastError}`);
  return {
    success: false,
    recordId: null,
    service: serviceName,
    message: lastError,
    data: null
  };
}

/**
 * Checks if CRM credentials exist (does not validate them)
 * @param {string} crmType - CRM type: 'smsit', 'companyhub', 'ohmylead'
 * @returns {boolean} True if credentials are configured
 */
function hasCRMCredentials(crmType) {
  if (crmType === 'smsit') {
    const apiUrl = getSetting('crm_smsit_api_url', '');
    const apiKey = getSetting('crm_smsit_api_key', '');
    return !!(apiUrl && apiKey);
  }
  if (crmType === 'companyhub') {
    const apiUrl = getSetting('crm_companyhub_api_url', '');
    const apiKey = getSetting('crm_companyhub_api_key', '');
    return !!(apiUrl && apiKey);
  }
  if (crmType === 'ohmylead') {
    const webhook = getSetting('crm_ohmylead_webhook', '');
    return !!webhook;
  }
  return false;
}

// ============================================================
// CRM SYNC MAIN FUNCTIONS
// ============================================================

/**
 * Syncs to CRM if enabled
 */
function syncToCRMIfEnabled() {
  const smsitEnabled = getSetting('crm_smsit_enabled', 'false') === 'true';
  const companyhubEnabled = getSetting('crm_companyhub_enabled', 'false') === 'true';
  const ohmyleadEnabled = getSetting('crm_ohmylead_enabled', 'false') === 'true';

  if (smsitEnabled) {
    syncToSMSiT();
  }

  if (companyhubEnabled) {
    syncToCompanyHub();
  }

  // OhMyLead is typically inbound only
  if (ohmyleadEnabled) {
    logEvent('CRM', 'OhMyLead configured for inbound leads');
  }
}

// ============================================================
// SMS-iT CRM INTEGRATION
// ============================================================

/**
 * Syncs leads to SMS-iT CRM
 */
function syncToSMSiT() {
  const enabled = getSetting('crm_smsit_enabled', 'false') === 'true';
  if (!enabled) {
    logEvent('CRM', 'SMS-iT sync skipped - not enabled');
    return { skipped: true, reason: 'Not enabled' };
  }

  const apiUrl = getSetting('crm_smsit_api_url', '');
  const apiKey = getSetting('crm_smsit_api_key', '');

  if (!apiUrl || !apiKey) {
    logError('CRM', 'SMS-iT configuration incomplete');
    return { error: 'Configuration incomplete' };
  }

  logEvent('CRM', 'Starting SMS-iT sync');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { synced: 0 };
  }

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();
  let syncedCount = 0;
  let errorCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dealId = row[colMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Check if already synced
    const crmSynced = row[colMap['CRM Synced'] - 1];
    if (crmSynced === 'Yes') continue;

    // Only sync HOT and SOLID leads
    const verdict = row[colMap['Verdict'] - 1];
    if (verdict !== 'HOT' && verdict !== 'SOLID') continue;

    try {
      const leadData = buildSMSiTLeadPayload(row, headers, colMap);
      const result = sendToSMSiT(apiUrl, apiKey, leadData);

      if (result.success) {
        // Update sync status
        masterSheet.getRange(i + 1, colMap['CRM Synced']).setValue('Yes');
        if (colMap['CRM Record ID']) {
          masterSheet.getRange(i + 1, colMap['CRM Record ID']).setValue(result.recordId || '');
        }
        syncedCount++;
        logSync('SMS-iT', 'CREATE', dealId, 'SUCCESS', result.recordId);
      } else {
        errorCount++;
        logSync('SMS-iT', 'CREATE', dealId, 'FAILED', result.message);
      }
    } catch (error) {
      errorCount++;
      logSync('SMS-iT', 'CREATE', dealId, 'FAILED', error.message);
    }

    // Rate limiting
    Utilities.sleep(200);
  }

  logEvent('CRM', `SMS-iT sync completed: ${syncedCount} synced, ${errorCount} errors`);
  return { synced: syncedCount, errors: errorCount };
}

/**
 * Builds SMS-iT lead payload
 */
function buildSMSiTLeadPayload(row, headers, colMap) {
  return {
    firstName: extractFirstName(row[colMap['Address'] - 1]),
    lastName: 'Property Owner',
    phone: '', // Would need contact info
    email: '',
    address: row[colMap['Address'] - 1] || '',
    city: row[colMap['City'] - 1] || '',
    state: row[colMap['State'] - 1] || '',
    zip: row[colMap['ZIP'] - 1] || '',
    customFields: {
      dealId: row[colMap['Deal ID'] - 1],
      askingPrice: row[colMap['Asking Price'] - 1],
      arv: row[colMap['ARV'] - 1],
      verdict: row[colMap['Verdict'] - 1],
      bestStrategy: row[colMap['Best Strategy'] - 1],
      sellerMessage: row[colMap['Seller Message'] - 1]
    },
    tags: [
      row[colMap['Verdict'] - 1],
      row[colMap['Best Strategy'] - 1],
      'Quantum-Import'
    ].filter(t => t)
  };
}

/**
 * Sends lead to SMS-iT using real API call
 */
function sendToSMSiT(apiUrl, apiKey, leadData) {
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(leadData),
    muteHttpExceptions: true
  };

  // Real API call with retry logic
  return crmFetch_(apiUrl + '/contacts', options, 'SMS-iT');
}

// ============================================================
// COMPANYHUB CRM INTEGRATION
// ============================================================

/**
 * Syncs leads to CompanyHub CRM
 */
function syncToCompanyHub() {
  const enabled = getSetting('crm_companyhub_enabled', 'false') === 'true';
  if (!enabled) {
    logEvent('CRM', 'CompanyHub sync skipped - not enabled');
    return { skipped: true, reason: 'Not enabled' };
  }

  const apiUrl = getSetting('crm_companyhub_api_url', '');
  const apiKey = getSetting('crm_companyhub_api_key', '');

  if (!apiUrl || !apiKey) {
    logError('CRM', 'CompanyHub configuration incomplete');
    return { error: 'Configuration incomplete' };
  }

  logEvent('CRM', 'Starting CompanyHub sync');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { synced: 0 };
  }

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();
  let syncedCount = 0;
  let errorCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dealId = row[colMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Check if already synced
    const crmSynced = row[colMap['CRM Synced'] - 1];
    if (crmSynced === 'Yes') continue;

    // Only sync actionable leads
    const verdict = row[colMap['Verdict'] - 1];
    if (verdict === 'PASS') continue;

    try {
      const dealData = buildCompanyHubDealPayload(row, headers, colMap);
      const result = sendToCompanyHub(apiUrl, apiKey, dealData);

      if (result.success) {
        masterSheet.getRange(i + 1, colMap['CRM Synced']).setValue('Yes');
        if (colMap['CRM Record ID']) {
          masterSheet.getRange(i + 1, colMap['CRM Record ID']).setValue(result.recordId || '');
        }
        syncedCount++;
        logSync('CompanyHub', 'CREATE', dealId, 'SUCCESS', result.recordId);
      } else {
        errorCount++;
        logSync('CompanyHub', 'CREATE', dealId, 'FAILED', result.message);
      }
    } catch (error) {
      errorCount++;
      logSync('CompanyHub', 'CREATE', dealId, 'FAILED', error.message);
    }

    Utilities.sleep(200);
  }

  logEvent('CRM', `CompanyHub sync completed: ${syncedCount} synced, ${errorCount} errors`);
  return { synced: syncedCount, errors: errorCount };
}

/**
 * Builds CompanyHub deal payload
 */
function buildCompanyHubDealPayload(row, headers, colMap) {
  return {
    name: row[colMap['Address'] - 1] || 'Unknown Property',
    type: 'Deal',
    stage: mapVerdictToStage(row[colMap['Verdict'] - 1]),
    value: row[colMap['Asking Price'] - 1] || 0,
    properties: {
      address: row[colMap['Address'] - 1],
      city: row[colMap['City'] - 1],
      state: row[colMap['State'] - 1],
      zip: row[colMap['ZIP'] - 1],
      askingPrice: row[colMap['Asking Price'] - 1],
      arv: row[colMap['ARV'] - 1],
      dealScore: row[colMap['Deal Score'] - 1],
      riskScore: row[colMap['Risk Score'] - 1],
      bestStrategy: row[colMap['Best Strategy'] - 1],
      offerPrice: row[colMap['Offer Price Target'] - 1]
    },
    customFields: {
      quantumDealId: row[colMap['Deal ID'] - 1],
      verdict: row[colMap['Verdict'] - 1],
      nextAction: row[colMap['Next Action'] - 1]
    }
  };
}

/**
 * Maps verdict to CRM stage
 */
function mapVerdictToStage(verdict) {
  const stageMap = {
    'HOT': 'Qualified',
    'SOLID': 'Interested',
    'HOLD': 'Nurturing',
    'PASS': 'Disqualified'
  };
  return stageMap[verdict] || 'New';
}

/**
 * Sends deal to CompanyHub using real API call
 */
function sendToCompanyHub(apiUrl, apiKey, dealData) {
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(dealData),
    muteHttpExceptions: true
  };

  // Real API call with retry logic
  return crmFetch_(apiUrl + '/deals', options, 'CompanyHub');
}

// ============================================================
// OHMYLEAD INTEGRATION
// ============================================================

/**
 * Syncs to OhMyLead (outbound)
 */
function syncToOhMyLead() {
  const enabled = getSetting('crm_ohmylead_enabled', 'false') === 'true';
  if (!enabled) {
    logEvent('CRM', 'OhMyLead sync skipped - not enabled');
    return { skipped: true };
  }

  const webhookUrl = getSetting('crm_ohmylead_webhook', '');
  if (!webhookUrl) {
    logError('CRM', 'OhMyLead webhook URL not configured');
    return { error: 'Webhook not configured' };
  }

  logEvent('CRM', 'Starting OhMyLead sync');
  // OhMyLead is typically used for inbound leads
  // This would send data via webhook if needed

  return { info: 'OhMyLead configured for inbound' };
}

/**
 * P5 FIX: doPost handler for OhMyLead inbound webhooks
 * Called when OhMyLead sends a webhook to this script's deployed web app URL
 * @param {Object} e - Event object from web app
 * @returns {TextOutput} JSON response
 */
function doPost(e) {
  try {
    // Validate request
    if (!e || !e.postData || !e.postData.contents) {
      logSync('OhMyLead', 'INBOUND', 'webhook', 'FAILED', 'Empty request body');
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Empty request body'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      logSync('OhMyLead', 'INBOUND', 'webhook', 'FAILED', 'Invalid JSON: ' + parseError.message);
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Invalid JSON payload'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Optional: Validate webhook secret if configured
    const webhookSecret = getSetting('crm_ohmylead_secret', '');
    if (webhookSecret) {
      const providedSecret = e.parameter.secret || payload.secret || '';
      if (providedSecret !== webhookSecret) {
        logSync('OhMyLead', 'INBOUND', 'webhook', 'FAILED', 'Invalid webhook secret');
        return ContentService.createTextOutput(JSON.stringify({
          error: 'Unauthorized'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Map OhMyLead fields to staging format
    const leadData = {
      source: 'OhMyLead',
      campaign: payload.campaign || payload.ad_campaign || '',
      adSet: payload.ad_set || payload.adset || '',
      name: payload.name || payload.full_name || '',
      email: payload.email || '',
      phone: payload.phone || payload.phone_number || '',
      address: payload.property_address || payload.address || '',
      city: payload.city || '',
      state: payload.state || '',
      zip: payload.zip || payload.postal_code || '',
      askingPrice: payload.asking_price || payload.price || '',
      motivation: payload.motivation || payload.reason_for_selling || '',
      notes: payload.notes || payload.comments || '',
      timestamp: new Date() // P5 FIX: Stamp Lead Arrival Timestamp
    };

    // Add to Web & Ad Leads sheet
    addWebAdLead(leadData);

    logSync('OhMyLead', 'INBOUND', 'webhook', 'SUCCESS', leadData.email || leadData.phone || 'anonymous');
    logEvent('CRM', `OhMyLead webhook received: ${leadData.address || 'no address'}`);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      leadId: leadData.leadId,
      message: 'Lead received and processed'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logSync('OhMyLead', 'INBOUND', 'webhook', 'FAILED', error.message);
    logError('CRM', 'OhMyLead webhook error: ' + error.message, error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doGet handler for webhook verification (some services require this)
 */
function doGet(e) {
  // Return simple verification response
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    service: 'Quantum Real Estate Analyzer',
    version: '2.0',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Adds a web/ad lead to staging with Lead Arrival Timestamp
 */
function addWebAdLead(leadData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const webLeadsSheet = ss.getSheetByName(CONFIG.SHEETS.WEB_AD_LEADS);

  if (!webLeadsSheet) return null;

  const leadId = 'WL' + Date.now().toString(36).toUpperCase();
  leadData.leadId = leadId;

  const newRow = [
    leadId,
    leadData.source || '',
    leadData.campaign || '', // Campaign
    leadData.adSet || '', // Ad Set
    leadData.timestamp || new Date(), // Lead Arrival Timestamp - P5 FIX
    leadData.name || '',
    leadData.email || '',
    leadData.phone || '',
    leadData.address || '',
    leadData.city || '',
    leadData.state || '',
    leadData.zip || '',
    leadData.askingPrice || '',
    leadData.motivation || '',
    '', // Timeline
    leadData.notes || '',
    'No' // Processed
  ];

  webLeadsSheet.appendRow(newRow);
  logEvent('CRM', `Web lead added: ${leadId} via ${leadData.source}`);

  return leadId;
}

// ============================================================
// CRM STATUS & UTILITIES
// ============================================================

/**
 * Gets CRM integration status with credentials indicator
 */
function getCRMStatus() {
  return {
    smsit: {
      enabled: getSetting('crm_smsit_enabled', 'false') === 'true',
      configured: !!getSetting('crm_smsit_api_key', ''),
      hasCredentials: hasCRMCredentials('smsit') // P1 FIX: Credentials indicator
    },
    companyhub: {
      enabled: getSetting('crm_companyhub_enabled', 'false') === 'true',
      configured: !!getSetting('crm_companyhub_api_key', ''),
      hasCredentials: hasCRMCredentials('companyhub') // P1 FIX: Credentials indicator
    },
    ohmylead: {
      enabled: getSetting('crm_ohmylead_enabled', 'false') === 'true',
      configured: !!getSetting('crm_ohmylead_webhook', ''),
      hasCredentials: hasCRMCredentials('ohmylead') // P1 FIX: Credentials indicator
    }
  };
}

/**
 * Tests CRM connection with real API call
 */
function testCRMConnection(crmType) {
  logEvent('CRM', `Testing ${crmType} connection`);

  if (crmType === 'smsit') {
    const apiUrl = getSetting('crm_smsit_api_url', '');
    const apiKey = getSetting('crm_smsit_api_key', '');

    if (!apiUrl || !apiKey) {
      return { success: false, error: 'Configuration incomplete' };
    }

    // Real connection test
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const result = crmFetch_(apiUrl + '/me', options, 'SMS-iT-Test', 1);
    return {
      success: result.success,
      message: result.success ? 'SMS-iT connection successful' : result.message
    };
  }

  if (crmType === 'companyhub') {
    const apiUrl = getSetting('crm_companyhub_api_url', '');
    const apiKey = getSetting('crm_companyhub_api_key', '');

    if (!apiUrl || !apiKey) {
      return { success: false, error: 'Configuration incomplete' };
    }

    // Real connection test
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const result = crmFetch_(apiUrl + '/me', options, 'CompanyHub-Test', 1);
    return {
      success: result.success,
      message: result.success ? 'CompanyHub connection successful' : result.message
    };
  }

  return { success: false, error: 'Unknown CRM type' };
}

/**
 * Gets sync statistics
 */
function getCRMSyncStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { total: 0, synced: 0, pending: 0 };
  }

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const syncedCol = headers.indexOf('CRM Synced');
  const data = masterSheet.getDataRange().getValues();

  let synced = 0;
  let pending = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][syncedCol] === 'Yes') {
      synced++;
    } else {
      pending++;
    }
  }

  return {
    total: data.length - 1,
    synced: synced,
    pending: pending
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Extracts first name from address
 */
function extractFirstName(address) {
  // In production, this would use skip tracing or property data
  return 'Property';
}

/**
 * Marks a record as synced
 */
function markAsSynced(dealId, crmRecordId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet) return;

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][colMap['Deal ID'] - 1] === dealId) {
      masterSheet.getRange(i + 1, colMap['CRM Synced']).setValue('Yes');
      if (crmRecordId && colMap['CRM Record ID']) {
        masterSheet.getRange(i + 1, colMap['CRM Record ID']).setValue(crmRecordId);
      }
      break;
    }
  }
}

/**
 * Creates a CRM task for escalation (used by Speed-to-Lead)
 * @param {Object} escalation - Escalation data
 * @returns {Object} Result of task creation
 */
function createCRMEscalationTask(escalation) {
  const smsitEnabled = getSetting('crm_smsit_enabled', 'false') === 'true';
  const companyhubEnabled = getSetting('crm_companyhub_enabled', 'false') === 'true';

  const taskData = {
    title: `URGENT: Follow up on ${escalation.address}`,
    description: `Lead ${escalation.dealId} has been waiting ${escalation.minutesWaiting} minutes. Status: ${escalation.slaStatus}. Verdict: ${escalation.verdict}`,
    dueDate: new Date().toISOString(),
    priority: escalation.verdict === 'HOT' ? 'high' : 'medium',
    dealId: escalation.dealId
  };

  let result = { created: false, service: null };

  if (companyhubEnabled && hasCRMCredentials('companyhub')) {
    const apiUrl = getSetting('crm_companyhub_api_url', '');
    const apiKey = getSetting('crm_companyhub_api_key', '');

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(taskData),
      muteHttpExceptions: true
    };

    const apiResult = crmFetch_(apiUrl + '/tasks', options, 'CompanyHub');
    if (apiResult.success) {
      result = { created: true, service: 'CompanyHub', taskId: apiResult.recordId };
    }
  }

  return result;
}
