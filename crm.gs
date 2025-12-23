/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * CRM Integration Module (crm.gs)
 * ============================================================================
 *
 * Handles all CRM integrations:
 * - SMS-iT (SMS messaging)
 * - CompanyHub (Deal tracking)
 * - OneHash (CRM)
 * - SignWell (Contract generation)
 * - OhmyLead (Inbound capture)
 */

// =============================================================================
// MAIN CRM SYNC FUNCTIONS
// =============================================================================

/**
 * Syncs HOT DEAL leads to configured CRMs
 * @returns {Object} Sync result
 */
function syncHotDealsToCRM() {
  try {
    logInfo('CRM', 'Starting CRM sync for HOT deals...');
    showToast('Syncing HOT deals to CRM...', 'CRM Sync', 30);

    const hotDeals = getUnsyncedHotDeals();

    if (hotDeals.length === 0) {
      logInfo('CRM', 'No unsynced HOT deals to process');
      showToast('No new deals to sync');
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const deal of hotDeals) {
      try {
        const result = syncDealToCRM(deal);

        if (result.success) {
          // Mark as synced in Deal Analyzer
          updateRowByLeadId(SHEETS.DEAL_ANALYZER, deal['Lead ID'], {
            'Synced': true
          });
          synced++;
        } else {
          failed++;
        }

        // Rate limiting
        Utilities.sleep(AUTOMATION.TIMING.API_RATE_LIMIT_MS);
      } catch (e) {
        logError('CRM', e, `Failed to sync deal: ${deal['Lead ID']}`);
        failed++;
      }
    }

    const result = { synced, failed };
    logSuccess('CRM', `CRM sync complete: ${synced} synced, ${failed} failed`);
    showToast(`Synced ${synced} deals to CRM`, 'Complete');

    return result;
  } catch (e) {
    logError('CRM', e, 'CRM sync process failed');
    throw e;
  }
}

/**
 * Gets unsynced HOT deals
 * @returns {Array} Unsynced hot deals
 */
function getUnsyncedHotDeals() {
  const analyzerData = getSheetDataAsObjects(SHEETS.DEAL_ANALYZER);

  return analyzerData.filter(deal =>
    deal['Deal Classifier'] === 'HOT DEAL' &&
    deal['Synced'] !== true
  );
}

/**
 * Syncs a single deal to its designated CRM
 * @param {Object} deal - Deal data
 * @returns {Object} Sync result
 */
function syncDealToCRM(deal) {
  const crmTarget = deal['CRM Route Target'] || AUTOMATION.CRM_ROUTING.DEFAULT;

  let result;

  switch (crmTarget) {
    case 'SMS-iT':
      result = syncToSmsIt(deal);
      break;
    case 'CompanyHub':
      result = syncToCompanyHub(deal);
      break;
    case 'OneHash':
      result = syncToOneHash(deal);
      break;
    default:
      result = syncToCompanyHub(deal);
  }

  // Log the sync attempt
  logCrmSync(deal, crmTarget, result);

  return result;
}

// =============================================================================
// SMS-iT INTEGRATION
// =============================================================================

/**
 * Syncs a deal to SMS-iT and sends seller message
 * @param {Object} deal - Deal data
 * @returns {Object} Sync result
 */
function syncToSmsIt(deal) {
  const apiKey = CONFIG.API_KEYS.SMSIT_API_KEY || getConfigProperty('SMSIT_API_KEY');

  if (!apiKey) {
    return {
      success: false,
      error: 'SMS-iT API key not configured',
      code: 0
    };
  }

  try {
    // Get seller phone from leads database
    const lead = findRowByColumn(SHEETS.LEADS_DATABASE, 'Lead ID', deal['Lead ID']);
    const sellerPhone = lead ? lead['Seller Phone'] : null;

    if (!sellerPhone) {
      return {
        success: false,
        error: 'No seller phone number available',
        code: 0
      };
    }

    // Prepare message
    const message = deal['Seller Message'] || getDefaultSellerMessage(lead).message;

    // API request payload
    const payload = {
      to: cleanPhone(sellerPhone),
      message: message,
      from: 'QRA', // Sender ID
      metadata: {
        leadId: deal['Lead ID'],
        address: deal['Address'],
        strategy: deal['Strategy Recommendation']
      }
    };

    // Make API call (stub implementation)
    const response = smsItApiCall('POST', '/messages', payload, apiKey);

    return {
      success: response.success,
      messageId: response.data?.messageId,
      code: response.code,
      error: response.error
    };
  } catch (e) {
    logError('CRM', e, 'SMS-iT sync failed');
    return {
      success: false,
      error: e.message,
      code: 0
    };
  }
}

/**
 * SMS-iT API call wrapper
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Request payload
 * @param {string} apiKey - API key
 * @returns {Object} API response
 */
function smsItApiCall(method, endpoint, payload, apiKey) {
  // Stub implementation - replace with actual API call
  try {
    const url = CONFIG.API_ENDPOINTS.SMSIT + endpoint;

    const options = {
      method: method.toLowerCase(),
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'X-API-Key': apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // Uncomment for actual implementation:
    // const response = UrlFetchApp.fetch(url, options);
    // return {
    //   success: response.getResponseCode() === 200,
    //   code: response.getResponseCode(),
    //   data: JSON.parse(response.getContentText())
    // };

    // Stub response
    logInfo('CRM', `SMS-iT API call (stub): ${method} ${endpoint}`);
    return {
      success: true,
      code: 200,
      data: { messageId: 'MSG-' + generateLeadId().substring(4) }
    };
  } catch (e) {
    return {
      success: false,
      code: 0,
      error: e.message
    };
  }
}

// =============================================================================
// COMPANYHUB INTEGRATION
// =============================================================================

/**
 * Syncs a deal to CompanyHub CRM
 * @param {Object} deal - Deal data
 * @returns {Object} Sync result
 */
function syncToCompanyHub(deal) {
  const apiKey = CONFIG.API_KEYS.COMPANYHUB_API_KEY || getConfigProperty('COMPANYHUB_API_KEY');

  if (!apiKey) {
    return {
      success: false,
      error: 'CompanyHub API key not configured',
      code: 0
    };
  }

  try {
    // Get lead details
    const lead = findRowByColumn(SHEETS.LEADS_DATABASE, 'Lead ID', deal['Lead ID']);

    // Prepare deal record
    const dealRecord = {
      externalId: deal['Lead ID'],
      name: `${deal['Address']}, ${deal['City']}, ${deal['State']}`,
      stage: mapDealClassifierToStage(deal['Deal Classifier']),
      value: safeParseNumber(deal['Spread Estimate'], 0),
      expectedCloseDate: getExpectedCloseDate(deal),
      customFields: {
        strategy: deal['Strategy Recommendation'],
        offerTarget: deal['Offer Target'],
        riskScore: deal['Risk Score'],
        velocityScore: deal['Sales Velocity Score'],
        marketHeat: deal['Market Heat Score']
      },
      contact: lead ? {
        name: lead['Seller Name'],
        phone: lead['Seller Phone'],
        email: lead['Seller Email']
      } : null,
      notes: deal['Negotiation Angle'],
      source: 'Quantum Real Estate Analyzer'
    };

    // Make API call (stub implementation)
    const response = companyHubApiCall('POST', '/deals', dealRecord, apiKey);

    return {
      success: response.success,
      dealId: response.data?.dealId,
      code: response.code,
      error: response.error
    };
  } catch (e) {
    logError('CRM', e, 'CompanyHub sync failed');
    return {
      success: false,
      error: e.message,
      code: 0
    };
  }
}

/**
 * CompanyHub API call wrapper
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Request payload
 * @param {string} apiKey - API key
 * @returns {Object} API response
 */
function companyHubApiCall(method, endpoint, payload, apiKey) {
  // Stub implementation
  try {
    const url = CONFIG.API_ENDPOINTS.COMPANYHUB + endpoint;

    const options = {
      method: method.toLowerCase(),
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // Stub response
    logInfo('CRM', `CompanyHub API call (stub): ${method} ${endpoint}`);
    return {
      success: true,
      code: 200,
      data: { dealId: 'CH-' + generateLeadId().substring(4) }
    };
  } catch (e) {
    return {
      success: false,
      code: 0,
      error: e.message
    };
  }
}

/**
 * Maps deal classifier to CompanyHub pipeline stage
 * @param {string} classifier - Deal classifier
 * @returns {string} Pipeline stage
 */
function mapDealClassifierToStage(classifier) {
  switch (classifier) {
    case 'HOT DEAL':
      return 'Qualified';
    case 'PORTFOLIO FOUNDATION':
      return 'Working';
    case 'SOLID DEAL':
      return 'Prospecting';
    default:
      return 'New Lead';
  }
}

/**
 * Calculates expected close date based on strategy
 * @param {Object} deal - Deal data
 * @returns {string} Expected close date
 */
function getExpectedCloseDate(deal) {
  const strategy = (deal['Strategy Recommendation'] || '').toLowerCase();
  let daysOut = 30; // Default

  if (strategy.includes('wholesale')) {
    daysOut = 14;
  } else if (strategy.includes('flip')) {
    daysOut = 120;
  } else if (strategy.includes('rental')) {
    daysOut = 45;
  }

  const date = new Date();
  date.setDate(date.getDate() + daysOut);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// =============================================================================
// ONEHASH INTEGRATION
// =============================================================================

/**
 * Syncs a deal to OneHash CRM
 * @param {Object} deal - Deal data
 * @returns {Object} Sync result
 */
function syncToOneHash(deal) {
  const apiKey = CONFIG.API_KEYS.ONEHASH_API_KEY || getConfigProperty('ONEHASH_API_KEY');

  if (!apiKey) {
    return {
      success: false,
      error: 'OneHash API key not configured',
      code: 0
    };
  }

  try {
    const lead = findRowByColumn(SHEETS.LEADS_DATABASE, 'Lead ID', deal['Lead ID']);

    const leadRecord = {
      leadId: deal['Lead ID'],
      name: lead ? lead['Seller Name'] : 'Unknown',
      email: lead ? lead['Seller Email'] : '',
      phone: lead ? lead['Seller Phone'] : '',
      company: '',
      source: 'Quantum Real Estate Analyzer',
      status: 'New',
      leadScore: deal['Strategy Confidence'],
      customData: {
        address: deal['Address'],
        city: deal['City'],
        state: deal['State'],
        strategy: deal['Strategy Recommendation'],
        dealClassifier: deal['Deal Classifier'],
        offerTarget: deal['Offer Target']
      }
    };

    // Stub implementation
    logInfo('CRM', `OneHash API call (stub): POST /leads`);
    return {
      success: true,
      leadId: 'OH-' + generateLeadId().substring(4),
      code: 200
    };
  } catch (e) {
    logError('CRM', e, 'OneHash sync failed');
    return {
      success: false,
      error: e.message,
      code: 0
    };
  }
}

// =============================================================================
// SIGNWELL INTEGRATION
// =============================================================================

/**
 * Creates a contract via SignWell
 * @param {Object} deal - Deal data
 * @param {string} templateId - Contract template ID
 * @returns {Object} Contract result
 */
function createSignWellContract(deal, templateId = 'default-purchase') {
  const apiKey = CONFIG.API_KEYS.SIGNWELL_API_KEY || getConfigProperty('SIGNWELL_API_KEY');

  if (!apiKey) {
    return {
      success: false,
      error: 'SignWell API key not configured'
    };
  }

  try {
    const lead = findRowByColumn(SHEETS.LEADS_DATABASE, 'Lead ID', deal['Lead ID']);

    const contractData = {
      templateId: templateId,
      name: `Purchase Agreement - ${deal['Address']}`,
      recipients: [
        {
          email: lead ? lead['Seller Email'] : '',
          name: lead ? lead['Seller Name'] : 'Seller',
          role: 'seller'
        }
      ],
      fields: {
        propertyAddress: `${deal['Address']}, ${deal['City']}, ${deal['State']} ${deal['ZIP'] || ''}`,
        purchasePrice: deal['Offer Target'],
        closingDate: getExpectedCloseDate(deal),
        buyerName: 'Your Company Name', // Would be configured
        earnestMoney: Math.round(safeParseNumber(deal['Offer Target'], 0) * 0.01)
      },
      metadata: {
        leadId: deal['Lead ID'],
        source: 'Quantum Real Estate Analyzer'
      }
    };

    // Stub implementation
    logInfo('CRM', `SignWell API call (stub): POST /documents`);
    return {
      success: true,
      documentId: 'SW-' + generateLeadId().substring(4),
      signUrl: 'https://app.signwell.com/sign/...',
      code: 200
    };
  } catch (e) {
    logError('CRM', e, 'SignWell contract creation failed');
    return {
      success: false,
      error: e.message
    };
  }
}

// =============================================================================
// OHMYLEAD INTEGRATION
// =============================================================================

/**
 * Processes inbound lead from OhmyLead webhook
 * @param {Object} webhookData - Webhook payload
 * @returns {Object} Processing result
 */
function processOhmyLeadWebhook(webhookData) {
  try {
    logInfo('CRM', 'Processing OhmyLead webhook...');

    // Validate webhook data
    if (!webhookData || !webhookData.lead) {
      throw new Error('Invalid webhook payload');
    }

    // Parse lead data
    const lead = parseWebhookLead(webhookData.lead);

    // Normalize and import
    const normalized = normalizeLead(lead);

    // Add to leads database
    const leadsSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(SHEETS.LEADS_DATABASE);

    if (leadsSheet) {
      addLeadToDatabase(leadsSheet, normalized);

      logSuccess('CRM', `OhmyLead webhook processed: ${normalized.address}`);
      return {
        success: true,
        leadId: normalized.leadId
      };
    }

    return {
      success: false,
      error: 'Could not add lead to database'
    };
  } catch (e) {
    logError('CRM', e, 'OhmyLead webhook processing failed');
    return {
      success: false,
      error: e.message
    };
  }
}

// =============================================================================
// CRM SYNC LOGGING
// =============================================================================

/**
 * Logs a CRM sync attempt
 * @param {Object} deal - Deal data
 * @param {string} crmTarget - Target CRM
 * @param {Object} result - Sync result
 */
function logCrmSync(deal, crmTarget, result) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEETS.CRM_SYNC_LOG);

    if (!logSheet) return;

    const logRow = [
      new Date(),
      deal['Lead ID'],
      deal['Address'],
      crmTarget,
      result.success ? 'SYNC' : 'FAILED',
      result.success ? 'SUCCESS' : 'FAILED',
      result.code || 0,
      result.error || '',
      0 // Retry count
    ];

    logSheet.appendRow(logRow);

    // Trim log to last 1000 entries
    trimSheet(logSheet, 1000);
  } catch (e) {
    Logger.log('Failed to log CRM sync: ' + e.message);
  }
}

/**
 * Gets CRM sync history for a lead
 * @param {string} leadId - Lead ID
 * @returns {Array} Sync history
 */
function getCrmSyncHistory(leadId) {
  const logData = getSheetDataAsObjects(SHEETS.CRM_SYNC_LOG);
  return logData.filter(log => log['Lead ID'] === leadId);
}

/**
 * Gets recent CRM sync activity
 * @param {number} limit - Number of records to return
 * @returns {Array} Recent sync activity
 */
function getRecentCrmActivity(limit = 20) {
  const logData = getSheetDataAsObjects(SHEETS.CRM_SYNC_LOG);
  return logData.slice(-limit).reverse();
}

// =============================================================================
// CRM STATUS AND HEALTH
// =============================================================================

/**
 * Gets CRM integration status
 * @returns {Object} Integration status for all CRMs
 */
function getCrmStatus() {
  return {
    smsIt: {
      configured: !isEmpty(CONFIG.API_KEYS.SMSIT_API_KEY || getConfigProperty('SMSIT_API_KEY')),
      name: 'SMS-iT',
      type: 'SMS'
    },
    companyHub: {
      configured: !isEmpty(CONFIG.API_KEYS.COMPANYHUB_API_KEY || getConfigProperty('COMPANYHUB_API_KEY')),
      name: 'CompanyHub',
      type: 'CRM'
    },
    oneHash: {
      configured: !isEmpty(CONFIG.API_KEYS.ONEHASH_API_KEY || getConfigProperty('ONEHASH_API_KEY')),
      name: 'OneHash',
      type: 'CRM'
    },
    signWell: {
      configured: !isEmpty(CONFIG.API_KEYS.SIGNWELL_API_KEY || getConfigProperty('SIGNWELL_API_KEY')),
      name: 'SignWell',
      type: 'Contracts'
    },
    ohmyLead: {
      configured: !isEmpty(CONFIG.API_KEYS.OHMYLEAD_WEBHOOK || getConfigProperty('OHMYLEAD_WEBHOOK')),
      name: 'OhmyLead',
      type: 'Lead Capture'
    }
  };
}

/**
 * Tests CRM connections
 * @returns {Object} Test results
 */
function testCrmConnections() {
  const results = {};
  const status = getCrmStatus();

  for (const [key, crm] of Object.entries(status)) {
    if (crm.configured) {
      results[key] = {
        name: crm.name,
        status: 'configured',
        message: `${crm.name} API key is set`
      };
    } else {
      results[key] = {
        name: crm.name,
        status: 'not_configured',
        message: `${crm.name} API key not set`
      };
    }
  }

  return results;
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

/**
 * Retries failed CRM syncs
 * @returns {Object} Retry result
 */
function retryFailedCrmSyncs() {
  const logData = getSheetDataAsObjects(SHEETS.CRM_SYNC_LOG);

  // Get failed syncs with less than 3 retries
  const failedSyncs = logData.filter(log =>
    log['Status'] === 'FAILED' &&
    safeParseNumber(log['Retry Count'], 0) < 3
  );

  if (failedSyncs.length === 0) {
    logInfo('CRM', 'No failed syncs to retry');
    return { retried: 0, succeeded: 0 };
  }

  let retried = 0;
  let succeeded = 0;

  for (const sync of failedSyncs) {
    const deal = findRowByColumn(SHEETS.DEAL_ANALYZER, 'Lead ID', sync['Lead ID']);

    if (deal) {
      const result = syncDealToCRM(deal);

      if (result.success) {
        updateRowByLeadId(SHEETS.DEAL_ANALYZER, deal['Lead ID'], {
          'Synced': true
        });
        succeeded++;
      }
      retried++;

      Utilities.sleep(AUTOMATION.TIMING.API_RATE_LIMIT_MS);
    }
  }

  logInfo('CRM', `Retry complete: ${retried} attempted, ${succeeded} succeeded`);
  return { retried, succeeded };
}

// =============================================================================
// MANUAL CRM OPERATIONS
// =============================================================================

/**
 * Manually syncs a specific lead to CRM
 * @param {string} leadId - Lead ID to sync
 * @returns {Object} Sync result
 */
function manualCrmSync(leadId) {
  const deal = findRowByColumn(SHEETS.DEAL_ANALYZER, 'Lead ID', leadId);

  if (!deal) {
    throw new Error('Lead not found in Deal Analyzer: ' + leadId);
  }

  return syncDealToCRM(deal);
}

/**
 * Syncs all unsynced deals (not just HOT)
 * @returns {Object} Sync result
 */
function syncAllUnsyncedDeals() {
  const analyzerData = getSheetDataAsObjects(SHEETS.DEAL_ANALYZER);
  const unsynced = analyzerData.filter(d => d['Synced'] !== true);

  let synced = 0;
  let failed = 0;

  for (const deal of unsynced) {
    try {
      const result = syncDealToCRM(deal);
      if (result.success) {
        updateRowByLeadId(SHEETS.DEAL_ANALYZER, deal['Lead ID'], {
          'Synced': true
        });
        synced++;
      } else {
        failed++;
      }
      Utilities.sleep(AUTOMATION.TIMING.API_RATE_LIMIT_MS);
    } catch (e) {
      failed++;
    }
  }

  return { total: unsynced.length, synced, failed };
}
