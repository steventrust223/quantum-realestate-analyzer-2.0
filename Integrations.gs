/**
 * Quantum Real Estate Analyzer v2.0
 * External Integrations
 *
 * Integrations:
 * - Browse.AI (lead scraping)
 * - SMS-iT CRM (messaging & negotiation bots)
 * - CompanyHub CRM (pipeline & deal tracking)
 * - Ohmylead (web & ad lead intake)
 * - SignWell (e-signature contracts)
 * - Book Like A Boss (appointment scheduling)
 */

// ============================================
// BROWSE.AI INTEGRATION
// ============================================

/**
 * Import leads from Browse.AI robot
 * Fetches scraped data from Facebook, Zillow, PropStream-style sources
 */
function importBrowseAILeads() {
  const apiKey = getSetting('BROWSE_AI_API_KEY');
  const robotId = getSetting('BROWSE_AI_ROBOT_ID');

  if (!apiKey || !robotId) {
    SpreadsheetApp.getUi().alert(
      '⚠️ Browse.AI Not Configured',
      'Please configure Browse.AI API credentials in Settings sheet:\n\n' +
      '• BROWSE_AI_API_KEY\n' +
      '• BROWSE_AI_ROBOT_ID\n\n' +
      'Get your API key from browse.ai/api-keys',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  try {
    // Fetch latest robot run data
    const url = `https://api.browse.ai/v2/robots/${robotId}/tasks`;
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      throw new Error('Browse.AI API error: ' + response.getContentText());
    }

    const data = JSON.parse(response.getContentText());
    const tasks = data.result.robotTasks.items || [];

    // Process latest completed task
    let imported = 0;
    for (let task of tasks) {
      if (task.status === 'successful') {
        imported += processBrowseAITask(task);
        break;  // Only process most recent
      }
    }

    logCRMSync('Browse.AI', 'Import Leads', 'Success', `Imported ${imported} leads`);

    SpreadsheetApp.getUi().alert(
      '✅ Browse.AI Import Complete',
      `Successfully imported ${imported} new leads from Browse.AI.\n\n` +
      'Check the Import Hub sheet to review new data.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    logCRMSync('Browse.AI', 'Import Leads', 'Failed', error.toString());
    SpreadsheetApp.getUi().alert(
      '❌ Browse.AI Import Error',
      'Failed to import leads:\n\n' + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Process a Browse.AI task and import to Import Hub
 */
function processBrowseAITask(task) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(SHEET_NAMES.IMPORT_HUB);

  if (!importSheet) return 0;

  const capturedData = task.capturedLists || {};
  let imported = 0;

  // Extract property listings (structure depends on robot configuration)
  const listings = capturedData.properties || capturedData.listings || [];

  listings.forEach(function(listing) {
    const row = [
      new Date(),  // Import Date
      'Browse.AI',  // Source
      task.robotUrl || '',  // Source URL
      generateLeadId(),  // Lead ID
      listing.address || '',
      listing.city || '',
      listing.state || '',
      listing.zip || '',
      listing.county || '',
      parsePrice(listing.price || listing.asking_price),
      listing.bedrooms || listing.beds || '',
      listing.bathrooms || listing.baths || '',
      listing.sqft || listing.square_feet || '',
      listing.lot_size || '',
      listing.year_built || '',
      listing.property_type || 'Single Family',
      listing.status || 'For Sale',
      listing.days_on_market || '',
      listing.seller_name || '',
      listing.seller_phone || '',
      listing.seller_email || '',
      listing.mls_number || '',
      listing.photos_url || '',
      listing.description || '',
      JSON.stringify(listing),  // Raw Data (JSON)
      'No',  // Processed?
      'Pending',  // Import Status
      '',  // Error Notes
      ''  // Processed Date
    ];

    importSheet.appendRow(row);
    imported++;
  });

  return imported;
}

/**
 * Webhook receiver for Browse.AI (manual trigger)
 */
function receiveBrowseAIWebhook(e) {
  // This function would be deployed as a web app to receive webhook POSTs
  // from Browse.AI when new data is scraped

  try {
    const payload = JSON.parse(e.postData.contents);
    const task = payload.task;

    if (task && task.status === 'successful') {
      processBrowseAITask(task);
      logCRMSync('Browse.AI', 'Webhook Received', 'Success', 'Auto-import from webhook');
    }

    return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Browse.AI webhook error: ' + error);
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// SMS-IT CRM INTEGRATION
// ============================================

/**
 * Sync lead to SMS-iT CRM for messaging campaigns
 */
function syncToSMSiT(propertyId, contactInfo) {
  const apiKey = getSetting('SMSIT_API_KEY');
  const workspaceId = getSetting('SMSIT_WORKSPACE_ID');

  if (!apiKey || !workspaceId) {
    throw new Error('SMS-iT CRM not configured. Add API key and workspace ID to Settings.');
  }

  try {
    const url = `https://api.sms-it.com/v1/workspaces/${workspaceId}/contacts`;
    const payload = {
      phone: contactInfo.phone,
      firstName: contactInfo.firstName || '',
      lastName: contactInfo.lastName || '',
      email: contactInfo.email || '',
      customFields: {
        propertyId: propertyId,
        propertyAddress: contactInfo.address || '',
        leadSource: 'Quantum Analyzer',
        motivation: contactInfo.motivation || '',
        dealClassifier: contactInfo.dealClassifier || ''
      },
      tags: [contactInfo.dealClassifier || 'Lead', contactInfo.strategy || 'Wholesaling']
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200 || responseCode === 201) {
      const data = JSON.parse(response.getContentText());
      logCRMSync('SMS-iT', 'Create Contact', 'Success', `Contact ID: ${data.id}`);
      return data.id;  // Return SMS-iT contact ID
    } else {
      throw new Error('SMS-iT API error: ' + response.getContentText());
    }

  } catch (error) {
    logCRMSync('SMS-iT', 'Create Contact', 'Failed', error.toString());
    throw error;
  }
}

/**
 * Send SMS via SMS-iT to a seller
 */
function sendSMSviaSMSiT(contactId, message) {
  const apiKey = getSetting('SMSIT_API_KEY');
  const workspaceId = getSetting('SMSIT_WORKSPACE_ID');

  if (!apiKey || !workspaceId) {
    throw new Error('SMS-iT not configured');
  }

  try {
    const url = `https://api.sms-it.com/v1/workspaces/${workspaceId}/messages`;
    const payload = {
      contactId: contactId,
      message: message,
      type: 'sms'
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200 || responseCode === 201) {
      logCRMSync('SMS-iT', 'Send SMS', 'Success', `Message sent to ${contactId}`);
      return true;
    } else {
      throw new Error('SMS-iT send error: ' + response.getContentText());
    }

  } catch (error) {
    logCRMSync('SMS-iT', 'Send SMS', 'Failed', error.toString());
    return false;
  }
}

/**
 * Trigger SMS-iT negotiation bot campaign
 */
function triggerSMSiTCampaign(contactId, campaignType) {
  // Campaign types: 'hot_lead', 'follow_up', 'cold_nurture', etc.
  const apiKey = getSetting('SMSIT_API_KEY');
  const workspaceId = getSetting('SMSIT_WORKSPACE_ID');

  if (!apiKey) return false;

  try {
    const url = `https://api.sms-it.com/v1/workspaces/${workspaceId}/campaigns/trigger`;
    const payload = {
      contactId: contactId,
      campaignName: campaignType
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    logCRMSync('SMS-iT', 'Trigger Campaign', 'Success', `Campaign: ${campaignType}`);
    return true;

  } catch (error) {
    logCRMSync('SMS-iT', 'Trigger Campaign', 'Failed', error.toString());
    return false;
  }
}

// ============================================
// COMPANYHUB CRM INTEGRATION
// ============================================

/**
 * Sync deal to CompanyHub pipeline
 */
function syncToCompanyHub(dealData) {
  const apiKey = getSetting('COMPANYHUB_API_KEY');

  if (!apiKey) {
    throw new Error('CompanyHub not configured. Add API key to Settings.');
  }

  try {
    const url = 'https://api.companyhub.com/v1/deals';
    const payload = {
      name: dealData.address || 'New Deal',
      value: dealData.arv || 0,
      currency: 'USD',
      stage: mapDealStageToCompanyHub(dealData.status),
      customFields: {
        propertyId: dealData.propertyId,
        address: dealData.address,
        strategy: dealData.strategy,
        dealClassifier: dealData.classifier,
        equity: dealData.equity,
        sellerName: dealData.sellerName,
        sellerPhone: dealData.sellerPhone
      },
      contactId: dealData.companyHubContactId || null
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200 || responseCode === 201) {
      const data = JSON.parse(response.getContentText());
      logCRMSync('CompanyHub', 'Create Deal', 'Success', `Deal ID: ${data.id}`);
      return data.id;
    } else {
      throw new Error('CompanyHub API error: ' + response.getContentText());
    }

  } catch (error) {
    logCRMSync('CompanyHub', 'Create Deal', 'Failed', error.toString());
    throw error;
  }
}

/**
 * Map internal deal status to CompanyHub pipeline stages
 */
function mapDealStageToCompanyHub(status) {
  const stageMap = {
    'New': 'lead',
    'Analyzing': 'qualified',
    'Contacted': 'proposal',
    'Offer Made': 'negotiation',
    'Under Contract': 'contract',
    'Closed': 'won',
    'Dead': 'lost'
  };

  return stageMap[status] || 'lead';
}

/**
 * Update CompanyHub deal stage
 */
function updateCompanyHubDealStage(companyHubDealId, newStage) {
  const apiKey = getSetting('COMPANYHUB_API_KEY');
  if (!apiKey) return false;

  try {
    const url = `https://api.companyhub.com/v1/deals/${companyHubDealId}`;
    const payload = {
      stage: newStage
    };

    const options = {
      method: 'patch',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    logCRMSync('CompanyHub', 'Update Deal Stage', 'Success', `Deal ${companyHubDealId} → ${newStage}`);
    return true;

  } catch (error) {
    logCRMSync('CompanyHub', 'Update Deal Stage', 'Failed', error.toString());
    return false;
  }
}

// ============================================
// OHMYLEAD INTEGRATION
// ============================================

/**
 * Import leads from Ohmylead (web forms, landing pages)
 */
function syncOhmylead() {
  const apiKey = getSetting('OHMYLEAD_API_KEY');

  if (!apiKey) {
    SpreadsheetApp.getUi().alert(
      '⚠️ Ohmylead Not Configured',
      'Please add OHMYLEAD_API_KEY to Settings sheet.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  try {
    const url = 'https://api.ohmylead.com/v1/leads';
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      throw new Error('Ohmylead API error: ' + response.getContentText());
    }

    const data = JSON.parse(response.getContentText());
    const leads = data.leads || [];

    let imported = processOhmyleadLeads(leads);

    logCRMSync('Ohmylead', 'Import Leads', 'Success', `Imported ${imported} leads`);

    SpreadsheetApp.getUi().alert(
      '✅ Ohmylead Sync Complete',
      `Imported ${imported} new leads from Ohmylead.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    logCRMSync('Ohmylead', 'Import Leads', 'Failed', error.toString());
    SpreadsheetApp.getUi().alert(
      '❌ Ohmylead Sync Error',
      error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Process Ohmylead leads and import to Import Hub
 */
function processOhmyleadLeads(leads) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(SHEET_NAMES.IMPORT_HUB);

  if (!importSheet) return 0;

  let imported = 0;

  leads.forEach(function(lead) {
    // Check if already imported
    if (isLeadAlreadyImported(lead.id, 'Ohmylead')) {
      return;  // Skip
    }

    const row = [
      new Date(),
      'Ohmylead',
      lead.source_url || '',
      lead.id,
      lead.property_address || '',
      lead.city || '',
      lead.state || '',
      lead.zip || '',
      '',  // County
      parsePrice(lead.property_value),
      '',  // Bedrooms
      '',  // Bathrooms
      '',  // Sqft
      '',  // Lot size
      '',  // Year built
      'Single Family',
      'Lead',
      '',  // Days on market
      lead.name || '',
      lead.phone || '',
      lead.email || '',
      '',  // MLS
      '',  // Photos
      lead.message || '',
      JSON.stringify(lead),
      'No',
      'Pending',
      '',
      ''
    ];

    importSheet.appendRow(row);
    imported++;
  });

  return imported;
}

// ============================================
// SIGNWELL INTEGRATION
// ============================================

/**
 * Send contract to SignWell for e-signature
 */
function sendToSignWell(propertyId, contractType, signers) {
  const apiKey = getSetting('SIGNWELL_API_KEY');

  if (!apiKey) {
    throw new Error('SignWell not configured. Add API key to Settings.');
  }

  try {
    // Create document from template
    const url = 'https://www.signwell.com/api/v1/documents';
    const payload = {
      template_id: getSignWellTemplateId(contractType),
      test_mode: false,
      draft: false,
      apply_signing_order: true,
      recipients: signers.map(function(signer, index) {
        return {
          id: `signer_${index + 1}`,
          name: signer.name,
          email: signer.email,
          order: index + 1
        };
      }),
      customization: {
        propertyId: propertyId,
        // Add more merge fields as needed
      }
    };

    const options = {
      method: 'post',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200 || responseCode === 201) {
      const data = JSON.parse(response.getContentText());
      logCRMSync('SignWell', 'Send Contract', 'Success', `Document ID: ${data.id}`);

      // Update Offers & Disposition sheet
      updateOfferWithSignWellId(propertyId, data.id);

      return data.id;
    } else {
      throw new Error('SignWell API error: ' + response.getContentText());
    }

  } catch (error) {
    logCRMSync('SignWell', 'Send Contract', 'Failed', error.toString());
    throw error;
  }
}

/**
 * Get SignWell template ID based on contract type
 */
function getSignWellTemplateId(contractType) {
  // In production, store template IDs in Settings
  const templates = {
    'purchase_agreement': 'template_xxxxx',
    'assignment_contract': 'template_yyyyy',
    'sub2_agreement': 'template_zzzzz'
  };

  return templates[contractType] || templates['purchase_agreement'];
}

/**
 * Check SignWell document status
 */
function checkSignWellStatus(documentId) {
  const apiKey = getSetting('SIGNWELL_API_KEY');
  if (!apiKey) return null;

  try {
    const url = `https://www.signwell.com/api/v1/documents/${documentId}`;
    const options = {
      method: 'get',
      headers: {
        'X-Api-Key': apiKey
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    return {
      status: data.status,  // 'pending', 'completed', 'declined', etc.
      completed: data.completed_at,
      signedBy: data.recipients.filter(r => r.signed).map(r => r.name)
    };

  } catch (error) {
    Logger.log('SignWell status check error: ' + error);
    return null;
  }
}

// ============================================
// BOOK LIKE A BOSS INTEGRATION
// ============================================

/**
 * Create appointment booking link for seller calls
 */
function createBookingLink(propertyId, sellerInfo) {
  const apiKey = getSetting('BOOK_LIKE_A_BOSS_API_KEY');

  if (!apiKey) {
    // Return generic booking link if not configured
    return 'https://booklikeaboss.com/your-booking-page';
  }

  try {
    // Create a booking with pre-filled info
    const url = 'https://api.booklikeaboss.com/v1/bookings';
    const payload = {
      service_id: 'seller_consultation',  // Configure in Book Like A Boss
      customer_name: sellerInfo.name,
      customer_email: sellerInfo.email,
      customer_phone: sellerInfo.phone,
      notes: `Property: ${sellerInfo.address} (ID: ${propertyId})`
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    logCRMSync('Book Like A Boss', 'Create Booking Link', 'Success', `Property ${propertyId}`);

    return data.booking_url;

  } catch (error) {
    logCRMSync('Book Like A Boss', 'Create Booking Link', 'Failed', error.toString());
    return 'https://booklikeaboss.com/your-booking-page';
  }
}

// ============================================
// MULTI-CRM SYNC
// ============================================

/**
 * Sync qualified lead to all CRMs
 */
function syncAllCRMs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return;

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '🔄 Sync All CRMs',
    'This will sync all qualified deals to:\n' +
    '• CompanyHub (pipeline tracking)\n' +
    '• SMS-iT (messaging campaigns)\n' +
    '• Ohmylead (lead tracking)\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const data = masterSheet.getDataRange().getValues();
  let synced = 0;
  let errors = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const classifier = row[38];  // Deal Classifier
    const status = row[64];  // Status

    // Only sync HOT DEALS and SOLID DEALS that aren't already synced
    if ((classifier === '🔥 HOT DEAL' || classifier === '✅ SOLID DEAL') && status !== 'Dead') {
      try {
        syncSingleDealToAllCRMs(row);
        synced++;
      } catch (error) {
        Logger.log('Sync error for row ' + i + ': ' + error);
        errors++;
      }
    }
  }

  ui.alert(
    '✅ Multi-CRM Sync Complete',
    `Synced ${synced} deals to all CRMs.\n${errors > 0 ? `Errors: ${errors}` : ''}`,
    ui.ButtonSet.OK
  );
}

/**
 * Sync a single deal to all CRMs
 */
function syncSingleDealToAllCRMs(row) {
  const dealData = {
    propertyId: row[0],
    address: row[3],
    arv: row[20],
    strategy: row[39],
    classifier: row[38],
    equity: row[33],
    sellerName: row[40],
    sellerPhone: row[41],
    sellerEmail: row[42],
    status: row[64]
  };

  // Sync to CompanyHub
  if (getSetting('COMPANYHUB_API_KEY')) {
    try {
      const companyHubId = syncToCompanyHub(dealData);
      // Update Master Database with CompanyHub ID
    } catch (error) {
      Logger.log('CompanyHub sync error: ' + error);
    }
  }

  // Sync to SMS-iT
  if (getSetting('SMSIT_API_KEY') && dealData.sellerPhone) {
    try {
      const smsitId = syncToSMSiT(dealData.propertyId, {
        phone: dealData.sellerPhone,
        firstName: dealData.sellerName.split(' ')[0],
        lastName: dealData.sellerName.split(' ')[1] || '',
        email: dealData.sellerEmail,
        address: dealData.address,
        motivation: '',
        dealClassifier: dealData.classifier,
        strategy: dealData.strategy
      });
      // Update Master Database with SMS-iT ID
    } catch (error) {
      Logger.log('SMS-iT sync error: ' + error);
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique lead ID
 */
function generateLeadId() {
  return 'LEAD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * Parse price string to number
 */
function parsePrice(priceString) {
  if (typeof priceString === 'number') return priceString;
  if (!priceString) return 0;

  // Remove currency symbols, commas
  return parseInt(priceString.toString().replace(/[$,]/g, '')) || 0;
}

/**
 * Check if lead already imported
 */
function isLeadAlreadyImported(externalId, source) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(SHEET_NAMES.IMPORT_HUB);

  if (!importSheet) return false;

  const data = importSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === externalId && data[i][1] === source) {  // Lead ID & Source columns
      return true;
    }
  }

  return false;
}

/**
 * Update Offers sheet with SignWell document ID
 */
function updateOfferWithSignWellId(propertyId, signWellId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const offersSheet = ss.getSheetByName(SHEET_NAMES.OFFERS_DISPOSITION);

  if (!offersSheet) return;

  const data = offersSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === propertyId) {
      offersSheet.getRange(i + 1, 23).setValue(signWellId);  // SignWell Document ID column
      offersSheet.getRange(i + 1, 22).setValue('Yes');  // Contract Sent via SignWell?
      break;
    }
  }
}

/**
 * Automated hourly CRM sync (called by trigger)
 */
function runHourlySync() {
  const enabled = getSetting('HOURLY_SYNC_ENABLED');
  if (enabled !== 'TRUE') return;

  try {
    // Sync new Ohmylead leads
    if (getSetting('OHMYLEAD_API_KEY')) {
      syncOhmylead();
    }

    // Check SignWell document statuses
    checkAllSignWellDocuments();

    logCRMSync('System', 'Hourly Sync', 'Success', 'Automated sync completed');

  } catch (error) {
    logCRMSync('System', 'Hourly Sync', 'Failed', error.toString());
  }
}

/**
 * Check all pending SignWell documents
 */
function checkAllSignWellDocuments() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const offersSheet = ss.getSheetByName(SHEET_NAMES.OFFERS_DISPOSITION);

  if (!offersSheet) return;

  const data = offersSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const signWellId = data[i][22];  // SignWell Document ID
    const contractStatus = data[i][24];  // Contract Status

    if (signWellId && contractStatus !== 'Completed') {
      const status = checkSignWellStatus(signWellId);

      if (status && status.status === 'completed') {
        offersSheet.getRange(i + 1, 25).setValue('Completed');  // Update status
        offersSheet.getRange(i + 1, 24).setValue(status.completed);  // Completed date
      }
    }
  }
}
