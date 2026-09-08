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

  // Verify inputs before trusting the mapping. A drifted header row makes every
  // name-based read resolve to undefined and syncs blank deals that look successful.
  assertQuantumDbColumns('CompanyHub sync', masterSheet);

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const cols = buildQuantumDbColMap_(headers);

  const data = masterSheet.getDataRange().getValues();

  // ---- Pass 1: build every payload before sending any. ----
  // An unmapped Status Stage throws here, which aborts the whole sync with the
  // offending deal named and nothing written. Building payloads inside the send
  // loop would leave the first N deals already in the CRM when deal N+1 failed.
  const pending = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dealId = cols.value(row, 'Deal ID');
    if (!dealId) continue;

    // Check if already synced
    if (cols.value(row, 'CRM Synced') === 'Yes') continue;

    // Only sync actionable leads
    if (cols.value(row, 'Verdict') === 'PASS') continue;

    pending.push({
      rowNumber: i + 1,
      dealId: dealId,
      payload: buildCompanyHubDealPayload(row, cols, dealId)
    });
  }

  if (!pending.length) {
    logEvent('CRM', 'CompanyHub sync completed: 0 deals to sync');
    return { synced: 0, errors: 0 };
  }

  // ---- Pass 2: send. ----
  const syncedColNumber = cols.num('CRM Synced');
  const recordIdColNumber = cols.has('CRM Record ID') ? cols.num('CRM Record ID') : null;
  let syncedCount = 0;
  let errorCount = 0;

  for (let p = 0; p < pending.length; p++) {
    const deal = pending[p];

    try {
      const result = sendToCompanyHub(apiUrl, apiKey, deal.payload);

      if (result.success) {
        masterSheet.getRange(deal.rowNumber, syncedColNumber).setValue('Yes');
        if (recordIdColNumber) {
          masterSheet.getRange(deal.rowNumber, recordIdColNumber).setValue(result.recordId || '');
        }
        syncedCount++;
        logSync('CompanyHub', 'CREATE', deal.dealId, 'SUCCESS', result.recordId);
      } else {
        errorCount++;
        logSync('CompanyHub', 'CREATE', deal.dealId, 'FAILED', result.message);
      }
    } catch (error) {
      errorCount++;
      logSync('CompanyHub', 'CREATE', deal.dealId, 'FAILED', error.message);
    }

    // Rate limiting
    Utilities.sleep(200);
  }

  logEvent('CRM', `CompanyHub sync completed: ${syncedCount} synced, ${errorCount} errors`);
  return { synced: syncedCount, errors: errorCount };
}

// ============================================================
// COMPANYHUB STAGE VOCABULARY (Blueprint v1.0)
// ============================================================

/**
 * Blueprint stage names this repo is permitted to emit.
 *
 * INCOMPLETE BY DESIGN. The Unified Blueprint v1.0 defines 12 stages; only the
 * eight below are named verbatim in a document available to this repo (CRM
 * Integration Brief 2, section 4). The other four are NOT guessed here — an
 * invented stage string is the exact defect this constant exists to prevent.
 *
 * Consequence: every stage the mapping below emits is in this list, so the
 * assertion is sound today. If a future mapping needs one of the four
 * unenumerated Blueprint stages, add it here with its exact Blueprint spelling
 * confirmed against the Blueprint itself — not from memory, and not from any
 * document written *about* the Blueprint.
 */
var COMPANYHUB_STAGES = Object.freeze([
  'New Lead',
  'Contacted',
  'Analyzed',
  'Negotiating',
  'Under Contract',
  'Nurture',
  'Closed',
  'Dead'
]);

/**
 * Master Database column 63 `Status Stage` -> Blueprint stage.
 *
 * `Status Stage` is the manual pipeline-position enum. Its ten permitted values
 * are fixed by the data validation applied in applyMasterDBValidations()
 * (SheetManager.gs); this map covers all ten, plus blank.
 *
 * Verdict is deliberately NOT an input here. Verdict is a score band, not a
 * pipeline position: a HOT deal nobody has called is still a New Lead. Verdict
 * travels on the Deal record in its own field (see customFields.verdict below)
 * where it can drive tags, priority and automations without moving the deal.
 *
 * KNOWN LOSSY NARROWING: `Under Contract` and `Due Diligence` both collapse to
 * Blueprint `Under Contract`, whose definition is "PSA signed, due diligence
 * running". That is a deliberate Blueprint consolidation, not a bug. The
 * distinction does not survive into the CRM. Do not work around it.
 *
 * FLAGGED FOR REVIEW: `Offer Sent` -> `Negotiating` is a judgment call. An offer
 * that has been sent but not answered is arguably not yet a negotiation. It is
 * mapped this way because Blueprint has no `Offer Sent` stage among the eight
 * known names and `Contacted` would understate pipeline position. Revisit once
 * the remaining four Blueprint stages are known.
 */
var STATUS_STAGE_TO_COMPANYHUB_STAGE = Object.freeze({
  'New Lead': 'New Lead',
  'Contacted': 'Contacted',
  'Analyzing': 'Analyzed',
  'Offer Sent': 'Negotiating',
  'Negotiating': 'Negotiating',
  'Under Contract': 'Under Contract',
  'Due Diligence': 'Under Contract',
  'Closed': 'Closed',
  'Dead': 'Dead',
  'On Hold': 'Nurture',
  '': 'Analyzed'
});

/**
 * Near-miss pairs: strings that differ from a real vocabulary member by a
 * suffix, a tense, or a plural. These are the values most likely to be
 * introduced by a well-meaning edit and least likely to be noticed in review,
 * because they read correctly.
 *
 * Left side = the wrong string. Right side = what was meant, and where it lives.
 */
var COMPANYHUB_STAGE_NEAR_MISSES = Object.freeze({
  'Analyzing': 'Analyzed (Blueprint stage). "Analyzing" is the Master DB `Status Stage` value, not a CRM stage.',
  'Analyze': 'Analyzed',
  'Negotiation': 'Negotiating',
  'Negotiations': 'Negotiating',
  'Nurturing': 'Nurture',
  'New': 'New Lead. "New" is not a stage in any vocabulary in this system.',
  'Contact': 'Contacted',
  'Under contract': 'Under Contract (capital C)',
  'Close': 'Closed',
  'Closed Won': 'Closed',
  'Dead Lead': 'Dead'
});

/**
 * Asserts a stage string is a permitted Blueprint stage.
 *
 * This guards the OUTPUT of the mapping, not its input. Its purpose is that an
 * edit to STATUS_STAGE_TO_COMPANYHUB_STAGE cannot reintroduce a non-Blueprint
 * stage string without failing immediately and by name.
 *
 * @param {string} stage - Candidate Blueprint stage
 * @param {string} context - What produced it, for the error message
 * @throws {Error} If the stage is not in COMPANYHUB_STAGES
 */
function assertCompanyHubStage_(stage, context) {
  if (COMPANYHUB_STAGES.indexOf(stage) >= 0) return;

  const nearMiss = COMPANYHUB_STAGE_NEAR_MISSES[stage];
  const hint = nearMiss
    ? ` Did you mean: ${nearMiss}`
    : ` Permitted stages: ${COMPANYHUB_STAGES.join(', ')}.`;

  throw new Error(
    `CompanyHub stage "${stage}" is not a Blueprint stage (${context}).${hint}`
  );
}

/**
 * Maps Master DB `Status Stage` (column 63) to a Blueprint CompanyHub stage.
 *
 * Throws rather than defaulting. An unrecognised `Status Stage` means either the
 * sheet's data validation was bypassed or the pipeline vocabulary changed
 * without this map being updated; both are conditions a human must resolve.
 * Defaulting would push the deal into the CRM at a stage nobody chose.
 *
 * @param {*} statusStage - Raw value of Master DB column 63
 * @param {string} dealId - Deal ID, named in any error
 * @returns {string} A Blueprint stage from COMPANYHUB_STAGES
 * @throws {Error} If the value is not a recognised `Status Stage`
 */
function mapStatusStageToCompanyHubStage(statusStage, dealId) {
  const raw = statusStage === null || statusStage === undefined ? '' : String(statusStage).trim();

  if (!Object.prototype.hasOwnProperty.call(STATUS_STAGE_TO_COMPANYHUB_STAGE, raw)) {
    const nearMiss = COMPANYHUB_STAGE_NEAR_MISSES[raw];
    throw new Error(
      `Deal ${dealId}: Master DB "Status Stage" value "${raw}" is not a recognised ` +
      `pipeline stage.` +
      (nearMiss ? ` Did you mean: ${nearMiss}` : '') +
      ` Permitted values: ${Object.keys(STATUS_STAGE_TO_COMPANYHUB_STAGE)
        .filter(k => k !== '').join(', ')} (or blank). Sync aborted; nothing written.`
    );
  }

  const stage = STATUS_STAGE_TO_COMPANYHUB_STAGE[raw];
  assertCompanyHubStage_(stage, `Status Stage "${raw}" on deal ${dealId}`);
  return stage;
}

/**
 * Coerces a sheet value to a bare number for CompanyHub.
 *
 * CompanyHub's Amount and Number field types accept digits and a decimal point
 * only, max 9 digits, and its CSV import rejects the whole row on any other
 * character — no currency symbol, no thousands separator, no percent sign. The
 * REST client this repo uses sends JSON, which is not subject to the CSV parser,
 * but a value that arrives as the string "$150,000" is wrong over either
 * transport. Cells hold whatever was typed into them, so coerce at the boundary.
 *
 * Returns null for a value that is not a number, rather than 0 — a missing ARV
 * and an ARV of zero are different facts.
 *
 * @param {*} value - Raw sheet value
 * @returns {number|null} Bare number, or null if not numeric
 */
function toCompanyHubNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;

  // Strip currency symbols, thousands separators, percent signs and whitespace.
  const cleaned = String(value).replace(/[$%,\s]/g, '');
  if (cleaned === '') return null;

  const parsed = Number(cleaned);
  return isFinite(parsed) ? parsed : null;
}

/**
 * Builds CompanyHub deal payload.
 *
 * Stage comes from `Status Stage`; verdict rides along as its own field.
 * All monetary and numeric fields are emitted as bare numbers (or null).
 *
 * @param {Array} row - Master DB data row
 * @param {Object} cols - Accessor from buildQuantumDbColMap_
 * @param {string} dealId - Deal ID, for error messages
 * @returns {Object} CompanyHub deal payload
 */
function buildCompanyHubDealPayload(row, cols, dealId) {
  return {
    name: cols.value(row, 'Address') || 'Unknown Property',
    type: 'Deal',
    stage: mapStatusStageToCompanyHubStage(cols.value(row, 'Status Stage'), dealId),
    value: toCompanyHubNumber_(cols.value(row, 'Asking Price')),
    properties: {
      address: cols.value(row, 'Address'),
      city: cols.value(row, 'City'),
      state: cols.value(row, 'State'),
      zip: cols.value(row, 'ZIP'),
      askingPrice: toCompanyHubNumber_(cols.value(row, 'Asking Price')),
      arv: toCompanyHubNumber_(cols.value(row, 'ARV')),
      dealScore: toCompanyHubNumber_(cols.value(row, 'Deal Score')),
      riskScore: toCompanyHubNumber_(cols.value(row, 'Risk Score')),
      bestStrategy: cols.value(row, 'Best Strategy'),
      offerPrice: toCompanyHubNumber_(cols.value(row, 'Offer Price Target'))
    },
    customFields: {
      quantumDealId: dealId,
      verdict: cols.value(row, 'Verdict'),
      statusStage: cols.value(row, 'Status Stage'),
      nextAction: cols.value(row, 'Next Action')
    }
  };
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
