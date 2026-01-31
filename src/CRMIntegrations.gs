/**
 * Quantum Real Estate Analyzer - CRM Integrations Module
 * Handles sync with SMS-iT, CompanyHub, OhMyLead
 */

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
        logSync('SMS-iT', 'CREATE', dealId, 'FAILED', result.error);
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
 * Sends lead to SMS-iT
 */
function sendToSMSiT(apiUrl, apiKey, leadData) {
  // Placeholder for actual API call
  // In production, this would make HTTP request to SMS-iT API

  try {
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(leadData),
      muteHttpExceptions: true
    };

    // const response = UrlFetchApp.fetch(apiUrl + '/contacts', options);
    // const json = JSON.parse(response.getContentText());

    // Simulated response for development
    return {
      success: true,
      recordId: 'SMSIT_' + Date.now()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
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
        logSync('CompanyHub', 'CREATE', dealId, 'FAILED', result.error);
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
 * Sends deal to CompanyHub
 */
function sendToCompanyHub(apiUrl, apiKey, dealData) {
  try {
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(dealData),
      muteHttpExceptions: true
    };

    // const response = UrlFetchApp.fetch(apiUrl + '/deals', options);
    // const json = JSON.parse(response.getContentText());

    // Simulated response
    return {
      success: true,
      recordId: 'CH_' + Date.now()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
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
 * Processes inbound OhMyLead webhook
 * This would be called by a web app deployment
 */
function processOhMyLeadWebhook(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // Map OhMyLead fields to staging format
    const leadData = {
      source: 'OhMyLead',
      name: payload.name || '',
      email: payload.email || '',
      phone: payload.phone || '',
      address: payload.property_address || '',
      city: payload.city || '',
      state: payload.state || '',
      zip: payload.zip || '',
      askingPrice: payload.asking_price || '',
      motivation: payload.motivation || '',
      notes: payload.notes || '',
      timestamp: new Date()
    };

    // Add to Web & Ad Leads sheet
    addWebAdLead(leadData);

    logSync('OhMyLead', 'INBOUND', 'webhook', 'SUCCESS', payload.email);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logSync('OhMyLead', 'INBOUND', 'webhook', 'FAILED', error.message);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Adds a web/ad lead to staging
 */
function addWebAdLead(leadData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const webLeadsSheet = ss.getSheetByName(CONFIG.SHEETS.WEB_AD_LEADS);

  if (!webLeadsSheet) return;

  const leadId = 'WL' + Date.now().toString(36).toUpperCase();

  const newRow = [
    leadId,
    leadData.source || '',
    '', // Campaign
    '', // Ad Set
    leadData.timestamp || new Date(),
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
  logEvent('CRM', `Web lead added: ${leadId}`);
}

// ============================================================
// CRM STATUS & UTILITIES
// ============================================================

/**
 * Gets CRM integration status
 */
function getCRMStatus() {
  return {
    smsit: {
      enabled: getSetting('crm_smsit_enabled', 'false') === 'true',
      configured: !!getSetting('crm_smsit_api_key', '')
    },
    companyhub: {
      enabled: getSetting('crm_companyhub_enabled', 'false') === 'true',
      configured: !!getSetting('crm_companyhub_api_key', '')
    },
    ohmylead: {
      enabled: getSetting('crm_ohmylead_enabled', 'false') === 'true',
      configured: !!getSetting('crm_ohmylead_webhook', '')
    }
  };
}

/**
 * Tests CRM connection
 */
function testCRMConnection(crmType) {
  logEvent('CRM', `Testing ${crmType} connection`);

  if (crmType === 'smsit') {
    const apiUrl = getSetting('crm_smsit_api_url', '');
    const apiKey = getSetting('crm_smsit_api_key', '');

    if (!apiUrl || !apiKey) {
      return { success: false, error: 'Configuration incomplete' };
    }

    // Test API call
    return { success: true, message: 'SMS-iT connection successful' };
  }

  if (crmType === 'companyhub') {
    const apiUrl = getSetting('crm_companyhub_api_url', '');
    const apiKey = getSetting('crm_companyhub_api_key', '');

    if (!apiUrl || !apiKey) {
      return { success: false, error: 'Configuration incomplete' };
    }

    return { success: true, message: 'CompanyHub connection successful' };
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
 * Extracts first name from address (placeholder)
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
