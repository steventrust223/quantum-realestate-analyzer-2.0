/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_ui.gs - UI Functions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles all HTML UI display and form submissions:
 * - Control Center
 * - Lead Intake
 * - Deal Review
 * - Settings Editor
 * - Help
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL CENTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shows the Control Center sidebar
 */
function RE_showControlCenter() {
  const html = HtmlService.createHtmlOutputFromFile('re_control_center')
    .setTitle('🏡 Quantum RE Control Center')
    .setWidth(UI_CONFIG.SIDEBAR_WIDTH);

  SpreadsheetApp.getUi().showSidebar(html);

  RE_logInfo('RE_showControlCenter', 'Control Center opened');
}

/**
 * Gets data for Control Center (called from HTML)
 *
 * @returns {Object} Control Center data
 */
function RE_getControlCenterData() {
  const summary = RE_getDashboardSummary();
  const recentLogs = RE_getRecentLogs(5);
  const actionItems = RE_getActionItems().slice(0, 5); // Top 5 action items

  return {
    summary: summary,
    recentLogs: recentLogs,
    actionItems: actionItems
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LEAD INTAKE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shows the Lead Intake dialog
 */
function RE_showLeadIntake() {
  const html = HtmlService.createHtmlOutputFromFile('re_lead_intake')
    .setWidth(UI_CONFIG.DIALOG_WIDTH)
    .setHeight(UI_CONFIG.DIALOG_HEIGHT);

  SpreadsheetApp.getUi().showModalDialog(html, '➕ Quick Lead Intake');

  RE_logInfo('RE_showLeadIntake', 'Lead Intake opened');
}

/**
 * Adds a new lead from UI form
 *
 * @param {Object} formData - Form data from HTML
 * @returns {Object} Result object
 */
function RE_addLeadFromUi(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leadsDirectSheet = ss.getSheetByName(SHEET_NAMES.LEADS_DIRECT);

    if (!leadsDirectSheet) {
      return { success: false, message: 'LEADS_DIRECT sheet not found' };
    }

    // Generate Lead ID
    const leadId = RE_generateLeadId();

    // Build row data
    const newRow = [
      leadId,
      new Date(),
      'Manual Entry - UI',
      formData.sellerName || '',
      formData.phone || '',
      formData.email || '',
      formData.address || '',
      formData.city || '',
      formData.state || '',
      formData.zip || '',
      formData.county || '',
      formData.propertyType || 'SFR',
      formData.beds || '',
      formData.baths || '',
      formData.sqft || '',
      formData.yearBuilt || '',
      formData.askingPrice || '',
      formData.motivationLevel || 'Unknown',
      formData.occupancyStatus || '',
      formData.notes || '',
      '',  // Imported to Master
      ''   // Import Date
    ];

    // Add to sheet
    leadsDirectSheet.appendRow(newRow);

    // Immediately import to master
    RE_importFromLeadsDirect();

    RE_logSuccess('RE_addLeadFromUi', `Added lead: ${leadId} - ${formData.address}`);

    return {
      success: true,
      message: `Lead added successfully!\nLead ID: ${leadId}\n\nRun "Import → Master Sync" to process.`,
      leadId: leadId
    };

  } catch (error) {
    RE_logError('RE_addLeadFromUi', 'Failed to add lead', error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL REVIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shows the Deal Review panel
 */
function RE_showDealReview() {
  const html = HtmlService.createHtmlOutputFromFile('re_deal_review')
    .setWidth(UI_CONFIG.DIALOG_WIDTH)
    .setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(html, '📂 Deal Review Panel');

  RE_logInfo('RE_showDealReview', 'Deal Review opened');
}

/**
 * Gets data for Deal Review panel (called from HTML)
 *
 * @returns {Object} Deal review data
 */
function RE_getDealReviewData() {
  const topDeals = RE_getTopDeals(UI_CONFIG.DEAL_REVIEW_TOP_N);

  // Format deals for display
  const formattedDeals = topDeals.map(deal => ({
    propertyId: deal.propertyId,
    address: deal.address,
    city: deal.city || '',
    state: deal.state || '',
    dealClass: deal.class,
    arv: deal.arv,
    askingPrice: deal.askingPrice,
    mao: deal.mao,
    suggestedOffer: deal.suggestedOffer,
    profitPotential: deal.profitPotential,
    profitMargin: deal.profitMargin,
    exitStrategy: deal.exitStrategy,
    sellerName: deal.sellerName,
    sellerPhone: deal.sellerPhone,
    status: deal.status
  }));

  return {
    deals: formattedDeals,
    totalCount: formattedDeals.length
  };
}

/**
 * Creates an offer record from UI
 *
 * @param {Object} offerData - Offer data from HTML
 * @returns {Object} Result object
 */
function RE_createOfferFromUi(offerData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const offersSheet = ss.getSheetByName(SHEET_NAMES.OFFERS_DISPO);
    const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

    if (!offersSheet) {
      return { success: false, message: 'OFFERS_DISPO sheet not found' };
    }

    // Get property details
    const propertyData = masterSheet.getDataRange().getValues();
    const propertyHeaderMap = RE_createHeaderMap(propertyData[0]);

    let propertyAddress = '';
    let sellerName = '';

    for (let i = 1; i < propertyData.length; i++) {
      if (RE_getValueByHeader(propertyData[i], 'Property ID', propertyHeaderMap) === offerData.propertyId) {
        propertyAddress = RE_getValueByHeader(propertyData[i], 'Address', propertyHeaderMap);
        sellerName = RE_getValueByHeader(propertyData[i], 'Seller Name', propertyHeaderMap);
        break;
      }
    }

    // Generate Offer ID
    const offerId = RE_generateOfferId();

    // Build row data
    const newRow = [
      offerId,
      offerData.propertyId,
      propertyAddress,
      sellerName,
      offerData.offerAmount || 0,
      new Date(),
      offerData.offerType || 'Cash',
      'Sent',
      '',  // Seller Response
      '',  // Counter Offer
      '',  // Accepted Amount
      offerData.assignmentFee || 0,
      '',  // Buyer ID
      '',  // Buyer Name
      '',  // Close Date
      '',  // Final Profit
      offerData.notes || '',
      new Date()
    ];

    // Add to sheet
    offersSheet.appendRow(newRow);

    // Update property status in MASTER_PROPERTIES
    RE_updatePropertyStatus(offerData.propertyId, PROPERTY_STATUSES.OFFER_MADE);

    RE_logSuccess('RE_createOfferFromUi', `Created offer: ${offerId} for ${offerData.propertyId}`);

    return {
      success: true,
      message: `Offer created successfully!\nOffer ID: ${offerId}`,
      offerId: offerId
    };

  } catch (error) {
    RE_logError('RE_createOfferFromUi', 'Failed to create offer', error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Updates property status
 *
 * @param {string} propertyId - Property ID
 * @param {string} newStatus - New status
 */
function RE_updatePropertyStatus(propertyId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) return;

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    if (RE_getValueByHeader(data[i], 'Property ID', headerMap) === propertyId) {
      masterSheet.getRange(i + 1, headerMap['Status'] + 1).setValue(newStatus);
      masterSheet.getRange(i + 1, headerMap['Last Updated'] + 1).setValue(new Date());
      break;
    }
  }
}

/**
 * Sends property to buyer match
 *
 * @param {string} propertyId - Property ID
 * @returns {Object} Result object
 */
function RE_sendToBuyerMatchFromUi(propertyId) {
  try {
    // This is a stub - in production would integrate with CRM/email
    const buyers = RE_getMatchedBuyers(propertyId);

    RE_logInfo('RE_sendToBuyerMatchFromUi',
      `STUB: Would send property ${propertyId} to ${buyers.length} matched buyers`);

    return {
      success: true,
      message: `Property sent to ${buyers.length} matched buyers!\n\n` +
               `(This is a stub - integrate with your CRM/email system)`
    };

  } catch (error) {
    RE_logError('RE_sendToBuyerMatchFromUi', 'Failed to send to buyers', error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shows the Settings editor
 */
function RE_showSettings() {
  const html = HtmlService.createHtmlOutputFromFile('re_settings')
    .setWidth(UI_CONFIG.DIALOG_WIDTH)
    .setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(html, '⚙️ System Settings');

  RE_logInfo('RE_showSettings', 'Settings editor opened');
}

/**
 * Gets all settings for display (called from HTML)
 *
 * @returns {Object} Settings data
 */
function RE_getSettingsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

  if (!settingsSheet || settingsSheet.getLastRow() <= 1) {
    return { settings: [] };
  }

  const data = settingsSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  const settings = [];

  for (let i = 1; i < data.length; i++) {
    settings.push({
      key: RE_getValueByHeader(data[i], 'Setting Key', headerMap),
      value: RE_getValueByHeader(data[i], 'Setting Value', headerMap),
      description: RE_getValueByHeader(data[i], 'Description', headerMap),
      category: RE_getValueByHeader(data[i], 'Category', headerMap)
    });
  }

  // Group by category
  const grouped = {};
  settings.forEach(setting => {
    if (!grouped[setting.category]) {
      grouped[setting.category] = [];
    }
    grouped[setting.category].push(setting);
  });

  return { settings: settings, grouped: grouped };
}

/**
 * Saves settings from UI form
 *
 * @param {Object} settingsData - Settings data from HTML
 * @returns {Object} Result object
 */
function RE_saveSettingsFromUi(settingsData) {
  try {
    let updated = 0;

    for (const [key, value] of Object.entries(settingsData)) {
      // Skip non-setting fields
      if (key === 'action') continue;

      RE_setSetting(key, value);
      updated++;
    }

    RE_logSuccess('RE_saveSettingsFromUi', `Updated ${updated} settings`);

    return {
      success: true,
      message: `Successfully updated ${updated} settings!\n\nSettings will take effect immediately.`
    };

  } catch (error) {
    RE_logError('RE_saveSettingsFromUi', 'Failed to save settings', error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shows the Help dialog
 */
function RE_showHelp() {
  const html = HtmlService.createHtmlOutputFromFile('re_help')
    .setWidth(UI_CONFIG.DIALOG_WIDTH)
    .setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(html, '📚 Quantum RE Analyzer - Help & Overview');

  RE_logInfo('RE_showHelp', 'Help dialog opened');
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS FOR UI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats currency for UI display
 *
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return RE_formatDollar(amount);
}

/**
 * Formats percentage for UI display
 *
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value) {
  return RE_formatPercent(value);
}

/**
 * Formats date for UI display
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return RE_formatDate(date);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPANYHUB CRM FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets CompanyHub connection status for UI
 *
 * @returns {Object} Connection status
 */
function RE_getCompanyHubStatus() {
  const config = CH_getConfig();

  return {
    configured: !!(config.apiKey && config.accountUrl),
    apiKey: config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'Not set',
    accountUrl: config.accountUrl || 'Not set',
    autoSyncEnabled: config.autoSyncEnabled,
    syncOnlyHotSolid: config.syncOnlyHotSolid
  };
}

/**
 * Syncs a single property from UI
 *
 * @param {string} propertyId - Property ID to sync
 * @returns {Object} Sync result
 */
function RE_syncPropertyFromUi(propertyId) {
  try {
    const config = CH_getConfig();

    if (!config.apiKey || !config.accountUrl) {
      return {
        success: false,
        message: 'CompanyHub not configured. Please add API Key and Account URL in Settings.'
      };
    }

    const result = CH_syncProperty(propertyId);

    return result;

  } catch (error) {
    RE_logError('RE_syncPropertyFromUi', `Error syncing property: ${error.message}`);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Syncs all HOT/SOLID deals from UI
 *
 * @returns {Object} Sync summary
 */
function RE_syncAllDealsFromUi() {
  try {
    const config = CH_getConfig();

    if (!config.apiKey || !config.accountUrl) {
      return {
        success: false,
        message: 'CompanyHub not configured. Please add API Key and Account URL in Settings.'
      };
    }

    const summary = CH_syncHotSolidDeals();

    return summary;

  } catch (error) {
    RE_logError('RE_syncAllDealsFromUi', `Error syncing deals: ${error.message}`);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}
