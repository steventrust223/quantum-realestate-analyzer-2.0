/**
 * Quantum Real Estate Analyzer - Disposition Tracker
 * Tracks outreach, follow-ups, buyer responses, and deal closings
 */

// ============================================================
// DISPOSITION ENTRY CREATION
// ============================================================

/**
 * Creates disposition tracker entries from buy box matches
 */
function createDispositionTrackerEntries() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matcherSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUY_BOX_MATCHER);
  const dispoSheet = ss.getSheetByName(CONFIG.SHEETS.INST_DISPOSITION_TRACKER);
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUYERS);

  if (!matcherSheet || matcherSheet.getLastRow() <= 1) return;
  if (!dispoSheet) return;

  logEvent('INST', 'Creating disposition tracker entries');

  const matchData = matcherSheet.getDataRange().getValues();
  const matchHeaders = matchData[0];
  const mColMap = {};
  matchHeaders.forEach((h, i) => mColMap[h] = i);

  // Load buyer contact details
  const buyerContacts = {};
  if (buyerSheet && buyerSheet.getLastRow() > 1) {
    const bData = buyerSheet.getDataRange().getValues();
    const bHeaders = bData[0];
    for (let i = 1; i < bData.length; i++) {
      const obj = {};
      bHeaders.forEach((h, j) => obj[h] = bData[i][j]);
      buyerContacts[obj['Buyer ID']] = obj;
    }
  }

  // Load existing disposition entries to avoid duplicates
  const existingKeys = new Set();
  if (dispoSheet.getLastRow() > 1) {
    const dispoData = dispoSheet.getDataRange().getValues();
    const dHeaders = dispoData[0];
    const dealIdCol = dHeaders.indexOf('Deal ID');
    const buyerIdCol = dHeaders.indexOf('Buyer ID');
    for (let i = 1; i < dispoData.length; i++) {
      existingKeys.add(`${dispoData[i][dealIdCol]}__${dispoData[i][buyerIdCol]}`);
    }
  }

  const dispoHeaders = CONFIG.COLUMNS.INST_DISPOSITION_TRACKER;
  const newEntries = [];
  let dispoId = dispoSheet.getLastRow(); // Continue from last row

  for (let i = 1; i < matchData.length; i++) {
    const row = matchData[i];
    const matchScore = parseFloat(row[mColMap['Buy Box Match Score']]) || 0;
    const readyToSend = row[mColMap['Ready to Send?']];
    const dealId = row[mColMap['Deal ID']];
    const buyerId = row[mColMap['Buyer ID']];

    // Only create entries for actionable matches
    if (matchScore < 40 || readyToSend === 'No') continue;

    // Check for duplicate
    const key = `${dealId}__${buyerId}`;
    if (existingKeys.has(key)) continue;

    dispoId++;
    const buyer = buyerContacts[buyerId] || {};
    const dispositionPriority = row[mColMap['Disposition Priority']] || 'REVIEW MANUALLY';

    // Determine disposition tier
    let tier = 'Tier 2 - Standard';
    if (matchScore >= 80) tier = 'Tier 1 - Priority';
    else if (matchScore >= 60) tier = 'Tier 2 - Standard';
    else if (matchScore >= 40) tier = 'Tier 3 - Bulk';

    newEntries.push([
      'D' + String(dispoId).padStart(5, '0'),
      dealId,
      row[mColMap['Address']] || '',
      buyerId,
      row[mColMap['Buyer Name']] || '',
      row[mColMap['Buyer Type']] || '',
      buyer['Primary Contact Name'] || buyer['Buyer Name'] || '',
      buyer['Email'] || '',
      buyer['Phone'] || '',
      'Yes', // Matched By System
      tier,
      'No', // Sent Package?
      '', // Sent Date
      '', // Last Follow-Up
      0, // Follow-Up Count
      'No Contact', // Response Status
      '', // Interest Level
      'Not Started', // Negotiation Status
      '', // Offer Received
      '', // Counter Sent
      '', // Final Terms
      'No', // Closed?
      '', // Pass Reason
      dispositionPriority === 'SEND NOW' ? 'Send package' : 'Review and decide',
      '', // Assigned To
      `Match score: ${matchScore}. ${row[mColMap['Match Reason']] || ''}`
    ]);

    existingKeys.add(key);
  }

  // Append new entries
  if (newEntries.length > 0) {
    const lastRow = dispoSheet.getLastRow();
    dispoSheet.getRange(lastRow + 1, 1, newEntries.length, dispoHeaders.length).setValues(newEntries);
  }

  logEvent('INST', `Disposition entries created: ${newEntries.length} new entries`);
}

// ============================================================
// DISPOSITION STATUS MANAGEMENT
// ============================================================

/**
 * Updates disposition status for a deal-buyer pair
 */
function updateDispositionStatus(dispositionId, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_DISPOSITION_TRACKER);
  if (!sheet || sheet.getLastRow() <= 1) return { error: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dispositionId) {
      Object.entries(updates).forEach(([key, value]) => {
        const colIndex = headers.indexOf(key);
        if (colIndex >= 0) {
          sheet.getRange(i + 1, colIndex + 1).setValue(value);
        }
      });
      logEvent('INST', `Disposition ${dispositionId} updated`);
      return { success: true };
    }
  }

  return { error: 'Disposition not found' };
}

/**
 * Marks a package as sent to a buyer
 */
function markPackageSent(dispositionId) {
  return updateDispositionStatus(dispositionId, {
    'Sent Package?': 'Yes',
    'Sent Date': new Date(),
    'Response Status': 'Sent - Awaiting',
    'Next Action': 'Follow up in 48 hours'
  });
}

/**
 * Records a follow-up action
 */
function recordFollowUp(dispositionId, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_DISPOSITION_TRACKER);
  if (!sheet || sheet.getLastRow() <= 1) return { error: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const followUpCountCol = headers.indexOf('Follow-Up Count');
  const lastFollowUpCol = headers.indexOf('Last Follow-Up');
  const notesCol = headers.indexOf('Notes');

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dispositionId) {
      const currentCount = parseInt(data[i][followUpCountCol]) || 0;
      sheet.getRange(i + 1, followUpCountCol + 1).setValue(currentCount + 1);
      sheet.getRange(i + 1, lastFollowUpCol + 1).setValue(new Date());
      if (notes && notesCol >= 0) {
        const existing = data[i][notesCol] || '';
        sheet.getRange(i + 1, notesCol + 1).setValue(
          existing + (existing ? ' | ' : '') + `[${new Date().toLocaleDateString()}] ${notes}`
        );
      }
      logEvent('INST', `Follow-up recorded for ${dispositionId}`);
      return { success: true };
    }
  }

  return { error: 'Disposition not found' };
}

/**
 * Records buyer response
 */
function recordBuyerResponse(dispositionId, responseStatus, interestLevel) {
  return updateDispositionStatus(dispositionId, {
    'Response Status': responseStatus,
    'Interest Level': interestLevel || '',
    'Last Follow-Up': new Date()
  });
}

/**
 * Marks a disposition as closed
 */
function markDispositionClosed(dispositionId, finalTerms) {
  return updateDispositionStatus(dispositionId, {
    'Closed?': 'Yes',
    'Negotiation Status': 'Agreed',
    'Final Terms': finalTerms || '',
    'Next Action': 'Completed',
    'Response Status': 'Closed'
  });
}

/**
 * Records buyer pass with reason
 */
function recordBuyerPass(dispositionId, passReason) {
  return updateDispositionStatus(dispositionId, {
    'Response Status': 'Passed',
    'Interest Level': 'Not Interested',
    'Pass Reason': passReason || '',
    'Next Action': 'Consider other buyers'
  });
}

// ============================================================
// FOLLOW-UP REMINDERS
// ============================================================

/**
 * Gets dispositions needing follow-up
 * @returns {Array} Overdue follow-up items
 */
function getFollowUpReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_DISPOSITION_TRACKER);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);

  const reminders = [];
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const sentPackage = row[colMap['Sent Package?']];
    const responseStatus = row[colMap['Response Status']] || '';
    const closed = row[colMap['Closed?']];
    const sentDate = row[colMap['Sent Date']];
    const lastFollowUp = row[colMap['Last Follow-Up']];

    // Skip closed, passed, or unsent items
    if (closed === 'Yes' || responseStatus === 'Passed' || responseStatus === 'Closed') continue;
    if (sentPackage !== 'Yes') continue;

    // Calculate days since last activity
    const lastActivity = lastFollowUp || sentDate;
    if (!lastActivity) continue;

    const daysSince = (now - new Date(lastActivity)) / (1000 * 60 * 60 * 24);

    // Follow-up needed after 2 days for priority, 5 days for standard
    const tier = row[colMap['Disposition Tier']] || '';
    const threshold = tier.includes('Priority') ? 2 : 5;

    if (daysSince >= threshold) {
      reminders.push({
        dispositionId: row[0],
        dealId: row[colMap['Deal ID']],
        address: row[colMap['Address']],
        buyerName: row[colMap['Buyer Name']],
        email: row[colMap['Email']],
        phone: row[colMap['Phone']],
        daysSinceActivity: Math.round(daysSince),
        tier: tier,
        followUpCount: row[colMap['Follow-Up Count']] || 0,
        responseStatus: responseStatus
      });
    }
  }

  return reminders.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
}

// ============================================================
// DISPOSITION STATISTICS
// ============================================================

/**
 * Gets comprehensive disposition statistics
 */
function getDispositionStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_DISPOSITION_TRACKER);

  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      total: 0, sent: 0, awaiting: 0, interested: 0,
      negotiating: 0, closed: 0, passed: 0, noContact: 0,
      responseRate: 0, closeRate: 0, followUpsDue: 0
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);

  let total = 0, sent = 0, awaiting = 0, interested = 0;
  let negotiating = 0, closed = 0, passed = 0, noContact = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[colMap['Deal ID']]) continue;

    total++;
    const responseStatus = row[colMap['Response Status']] || '';
    const negoStatus = row[colMap['Negotiation Status']] || '';

    if (row[colMap['Sent Package?']] === 'Yes') sent++;
    if (responseStatus === 'Sent - Awaiting' || responseStatus === 'No Response') awaiting++;
    if (responseStatus === 'Interested' || row[colMap['Interest Level']] === 'Very Interested') interested++;
    if (negoStatus && !['Not Started', 'Dead'].includes(negoStatus)) negotiating++;
    if (row[colMap['Closed?']] === 'Yes') closed++;
    if (responseStatus === 'Passed') passed++;
    if (responseStatus === 'No Contact') noContact++;
  }

  const responded = interested + negotiating + closed + passed;
  const responseRate = sent > 0 ? responded / sent : 0;
  const closeRate = sent > 0 ? closed / sent : 0;

  const followUpsDue = getFollowUpReminders().length;

  return {
    total, sent, awaiting, interested, negotiating, closed, passed, noContact,
    responseRate: Math.round(responseRate * 100),
    closeRate: Math.round(closeRate * 100),
    followUpsDue
  };
}

// ============================================================
// CRM EXPORT PREPARATION
// ============================================================

/**
 * Prepares disposition data for CRM export (CompanyHub-ready)
 * Returns clean structured data for sync
 */
function prepareDispositionForCRMExport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_DISPOSITION_TRACKER);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);

  const exportRows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[colMap['Deal ID']]) continue;

    // Map to CompanyHub deal stages
    const responseStatus = row[colMap['Response Status']] || '';
    const negoStatus = row[colMap['Negotiation Status']] || '';
    const closed = row[colMap['Closed?']] === 'Yes';

    let crmStage = 'Hot Deal';
    if (closed) crmStage = 'Sold';
    else if (negoStatus === 'Dead' || responseStatus === 'Passed') crmStage = 'Dead';
    else if (negoStatus && negoStatus !== 'Not Started') crmStage = 'Negotiating';
    else if (responseStatus === 'Interested') crmStage = 'Contacted';
    else if (row[colMap['Sent Package?']] === 'Yes') crmStage = 'Contacted';

    exportRows.push({
      dealId: row[colMap['Deal ID']],
      address: row[colMap['Address']],
      buyerId: row[colMap['Buyer ID']],
      buyerName: row[colMap['Buyer Name']],
      buyerType: row[colMap['Buyer Type']],
      contactName: row[colMap['Contact Name']],
      email: row[colMap['Email']],
      phone: row[colMap['Phone']],
      dispositionTier: row[colMap['Disposition Tier']],
      responseStatus: responseStatus,
      negotiationStatus: negoStatus,
      closed: closed,
      crmStage: crmStage,
      lastFollowUp: row[colMap['Last Follow-Up']],
      notes: row[colMap['Notes']]
    });
  }

  return exportRows;
}

/**
 * Exports disposition data to CompanyHub CRM
 */
function syncDispositionsToCompanyHub() {
  const enabled = getSetting('crm_companyhub_enabled', 'false') === 'true';
  if (!enabled) {
    logEvent('INST', 'CompanyHub sync disabled');
    return { skipped: true };
  }

  const exportData = prepareDispositionForCRMExport();
  if (exportData.length === 0) return { synced: 0 };

  const apiUrl = getSetting('crm_companyhub_api_url', '');
  const apiKey = getSetting('crm_companyhub_api_key', '');
  if (!apiUrl || !apiKey) return { error: 'Configuration incomplete' };

  let synced = 0;
  let errors = 0;

  exportData.forEach(item => {
    const payload = {
      name: `DISPO: ${item.address} -> ${item.buyerName}`,
      type: 'Deal',
      stage: item.crmStage,
      value: 0,
      properties: {
        address: item.address,
        buyerName: item.buyerName,
        buyerType: item.buyerType,
        contactEmail: item.email,
        contactPhone: item.phone,
        dispositionTier: item.dispositionTier,
        responseStatus: item.responseStatus,
        negotiationStatus: item.negotiationStatus
      },
      customFields: {
        quantumDealId: item.dealId,
        quantumBuyerId: item.buyerId,
        source: 'Quantum Institutional Disposition'
      }
    };

    const options = {
      method: 'post',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const result = crmFetch_(apiUrl + '/deals', options, 'CompanyHub');
    if (result.success) synced++;
    else errors++;

    Utilities.sleep(200); // Rate limit
  });

  logEvent('INST', `CompanyHub disposition sync: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}
