/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_verdict.gs - Hot Deals & Verdict Builder
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Creates sorted views of:
 * - Hot deals (highest priority)
 * - All deals sorted by classification
 * - Action items
 */

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rebuilds the verdict/hot deals view
 * This creates a sorted, filtered view of the best deals
 */
function RE_rebuildVerdict() {
  const ui = SpreadsheetApp.getUi();

  try {
    ui.alert('🏅 Rebuilding Verdict',
             'Creating sorted view of hot deals...',
             ui.ButtonSet.OK);

    RE_logInfo('RE_rebuildVerdict', 'Starting verdict rebuild');

    const hotDeals = RE_getHotDeals();
    const solidDeals = RE_getSolidDeals();

    RE_logSuccess('RE_rebuildVerdict',
      `Found ${hotDeals.length} hot deals and ${solidDeals.length} solid deals`);

    // Show summary
    let message = `Verdict Summary:\n\n`;
    message += `🔥 HOT DEALS: ${hotDeals.length}\n`;
    message += `✅ SOLID DEALS: ${solidDeals.length}\n\n`;

    if (hotDeals.length > 0) {
      message += `Top 3 Hot Deals:\n`;
      for (let i = 0; i < Math.min(3, hotDeals.length); i++) {
        message += `${i + 1}. ${hotDeals[i].address} - ${hotDeals[i].profitPotential}\n`;
      }
    }

    ui.alert('✅ Verdict Complete', message, ui.ButtonSet.OK);

  } catch (error) {
    RE_logError('RE_rebuildVerdict', 'Verdict rebuild failed', error.message);
    ui.alert('❌ Error', `An error occurred: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Gets all HOT deals
 *
 * @returns {Array} Array of hot deal objects
 */
function RE_getHotDeals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return [];
  }

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  const hotDeals = [];

  for (let i = 1; i < data.length; i++) {
    const dealClass = RE_getValueByHeader(data[i], 'Deal Class', headerMap);

    if (dealClass === DEAL_CLASSES.HOT) {
      hotDeals.push({
        propertyId: RE_getValueByHeader(data[i], 'Property ID', headerMap),
        address: RE_getValueByHeader(data[i], 'Address', headerMap),
        city: RE_getValueByHeader(data[i], 'City', headerMap),
        state: RE_getValueByHeader(data[i], 'State', headerMap),
        askingPrice: RE_toNumber(RE_getValueByHeader(data[i], 'Asking Price', headerMap)),
        arv: RE_toNumber(RE_getValueByHeader(data[i], 'Estimated ARV', headerMap)),
        mao: RE_toNumber(RE_getValueByHeader(data[i], 'MAO', headerMap)),
        suggestedOffer: RE_toNumber(RE_getValueByHeader(data[i], 'Suggested Initial Offer', headerMap)),
        profitPotential: RE_toNumber(RE_getValueByHeader(data[i], 'Profit Potential', headerMap)),
        profitMargin: RE_toNumber(RE_getValueByHeader(data[i], 'Profit Margin %', headerMap)),
        exitStrategy: RE_getValueByHeader(data[i], 'Exit Strategy', headerMap),
        sellerName: RE_getValueByHeader(data[i], 'Seller Name', headerMap),
        sellerPhone: RE_getValueByHeader(data[i], 'Seller Phone', headerMap),
        status: RE_getValueByHeader(data[i], 'Status', headerMap)
      });
    }
  }

  // Sort by profit potential (highest first)
  hotDeals.sort((a, b) => b.profitPotential - a.profitPotential);

  return hotDeals;
}

/**
 * Gets all SOLID deals
 *
 * @returns {Array} Array of solid deal objects
 */
function RE_getSolidDeals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return [];
  }

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  const solidDeals = [];

  for (let i = 1; i < data.length; i++) {
    const dealClass = RE_getValueByHeader(data[i], 'Deal Class', headerMap);

    if (dealClass === DEAL_CLASSES.SOLID) {
      solidDeals.push({
        propertyId: RE_getValueByHeader(data[i], 'Property ID', headerMap),
        address: RE_getValueByHeader(data[i], 'Address', headerMap),
        profitPotential: RE_toNumber(RE_getValueByHeader(data[i], 'Profit Potential', headerMap)),
        exitStrategy: RE_getValueByHeader(data[i], 'Exit Strategy', headerMap)
      });
    }
  }

  // Sort by profit potential
  solidDeals.sort((a, b) => b.profitPotential - a.profitPotential);

  return solidDeals;
}

/**
 * Gets deal counts by classification
 *
 * @returns {Object} Object with counts
 */
function RE_getDealCounts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  const counts = {
    hot: 0,
    solid: 0,
    portfolio: 0,
    pass: 0,
    total: 0,
    newLeads: 0,
    underContract: 0
  };

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return counts;
  }

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    counts.total++;

    const dealClass = RE_getValueByHeader(data[i], 'Deal Class', headerMap);
    const status = RE_getValueByHeader(data[i], 'Status', headerMap);

    // Count by deal class
    if (dealClass === DEAL_CLASSES.HOT) counts.hot++;
    else if (dealClass === DEAL_CLASSES.SOLID) counts.solid++;
    else if (dealClass === DEAL_CLASSES.PORTFOLIO) counts.portfolio++;
    else counts.pass++;

    // Count by status
    if (status === PROPERTY_STATUSES.NEW) counts.newLeads++;
    if (status === PROPERTY_STATUSES.UNDER_CONTRACT) counts.underContract++;
  }

  return counts;
}

/**
 * Gets properties that need action
 *
 * @returns {Array} Array of properties needing action
 */
function RE_getActionItems() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const trackerSheet = ss.getSheetByName(SHEET_NAMES.LEADS_TRACKER);

  const actionItems = [];

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return actionItems;
  }

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaderMap = RE_createHeaderMap(masterData[0]);

  // Get tracker data for follow-ups
  let trackerData = [];
  let trackerHeaderMap = {};

  if (trackerSheet && trackerSheet.getLastRow() > 1) {
    trackerData = trackerSheet.getDataRange().getValues();
    trackerHeaderMap = RE_createHeaderMap(trackerData[0]);
  }

  const today = new Date();

  // Check MASTER_PROPERTIES for hot deals without offers
  for (let i = 1; i < masterData.length; i++) {
    const dealClass = RE_getValueByHeader(masterData[i], 'Deal Class', masterHeaderMap);
    const status = RE_getValueByHeader(masterData[i], 'Status', masterHeaderMap);
    const propertyId = RE_getValueByHeader(masterData[i], 'Property ID', masterHeaderMap);
    const address = RE_getValueByHeader(masterData[i], 'Address', masterHeaderMap);

    // Hot deals that are new or ready to offer
    if (dealClass === DEAL_CLASSES.HOT &&
        (status === PROPERTY_STATUSES.NEW || status === PROPERTY_STATUSES.READY_TO_OFFER)) {
      actionItems.push({
        type: 'Make Offer',
        propertyId: propertyId,
        address: address,
        priority: 'High',
        reason: 'Hot deal - make offer ASAP'
      });
    }
  }

  // Check LEADS_TRACKER for overdue follow-ups
  for (let i = 1; i < trackerData.length; i++) {
    const nextActionDate = RE_getValueByHeader(trackerData[i], 'Next Action Date', trackerHeaderMap);
    const stage = RE_getValueByHeader(trackerData[i], 'Stage', trackerHeaderMap);

    if (nextActionDate && stage !== LEAD_STAGES.DEAD && stage !== LEAD_STAGES.UNDER_CONTRACT) {
      const actionDate = new Date(nextActionDate);
      if (actionDate <= today) {
        actionItems.push({
          type: 'Follow Up',
          propertyId: RE_getValueByHeader(trackerData[i], 'Property ID', trackerHeaderMap),
          address: RE_getValueByHeader(trackerData[i], 'Seller Name', trackerHeaderMap),
          priority: 'Medium',
          reason: `Follow-up overdue since ${RE_formatDate(actionDate)}`
        });
      }
    }
  }

  return actionItems;
}

/**
 * Gets top deals (combined hot + solid, sorted)
 *
 * @param {number} limit - Maximum number of deals to return
 * @returns {Array} Array of top deals
 */
function RE_getTopDeals(limit = 25) {
  const hotDeals = RE_getHotDeals();
  const solidDeals = RE_getSolidDeals();

  // Combine and mark
  const allDeals = [
    ...hotDeals.map(d => ({ ...d, class: DEAL_CLASSES.HOT })),
    ...solidDeals.map(d => ({ ...d, class: DEAL_CLASSES.SOLID }))
  ];

  // Sort by profit potential
  allDeals.sort((a, b) => b.profitPotential - a.profitPotential);

  // Return top N
  return allDeals.slice(0, limit);
}

/**
 * Formats deal summary for display
 *
 * @param {Object} deal - Deal object
 * @returns {string} Formatted summary
 */
function RE_formatDealSummary(deal) {
  let summary = `${deal.address}\n`;
  summary += `Class: ${deal.class || deal.dealClass}\n`;
  summary += `ARV: ${RE_formatDollar(deal.arv)} | `;
  summary += `Asking: ${RE_formatDollar(deal.askingPrice)}\n`;
  summary += `Profit: ${RE_formatDollar(deal.profitPotential)} `;
  summary += `(${deal.profitMargin.toFixed(1)}%)\n`;
  summary += `Strategy: ${deal.exitStrategy}\n`;

  return summary;
}
