/**
 * Data Management Functions
 * Handles all data CRUD operations for sheets
 */

/**
 * Setup sheet headers based on sheet type
 */
function setupSheetHeaders(sheet, sheetName) {
  let headers = [];

  switch(sheetName) {
    case 'Dashboard':
      headers = ['Metric', 'Value', 'Last Updated'];
      setupDashboardSheet(sheet);
      break;

    case 'Active Deals':
      headers = [
        'Deal ID', 'Date Added', 'Property Address', 'Deal Type',
        'Status', 'Seller Name', 'Offer Amount', 'Assignment Fee/Spread',
        'Expected Close Date', 'Assigned To', 'Notes'
      ];
      break;

    case 'Wholesaling Pipeline':
      headers = [
        'Deal ID', 'Stage', 'Property Address', 'Seller', 'Contract Price',
        'ARV', 'Repair Costs', 'Assignment Fee', 'Buyer', 'Days in Pipeline'
      ];
      break;

    case 'Sub2 Pipeline':
      headers = [
        'Deal ID', 'Stage', 'Property Address', 'Seller', 'Loan Balance',
        'Monthly Payment', 'Equity', 'Monthly Spread', 'Close Date', 'Days in Pipeline'
      ];
      break;

    case 'Sellers':
      headers = [
        'Seller ID', 'Date Added', 'Name', 'Phone', 'Email',
        'Property Address', 'Motivation', 'Lead Source', 'Status', 'Notes'
      ];
      break;

    case 'Buyers':
      headers = [
        'Buyer ID', 'Date Added', 'Name', 'Phone', 'Email',
        'Investment Type', 'Max Budget', 'Preferred Areas', 'Cash Verified', 'Active'
      ];
      break;

    case 'Properties':
      headers = [
        'Property ID', 'Date Analyzed', 'Address', 'Estimated Value', 'Repair Costs',
        'ARV', 'Max Offer', 'Deal Score', 'Market Trend', 'Recommended'
      ];
      break;

    case 'Financial Tracking':
      headers = [
        'Date', 'Deal ID', 'Transaction Type', 'Category',
        'Amount', 'Description', 'Payment Method', 'Status'
      ];
      break;

    case 'Team Members':
      headers = [
        'Member ID', 'Name', 'Role', 'Email', 'Phone',
        'Access Level', 'Active', 'Date Added'
      ];
      break;

    case 'Documents':
      headers = [
        'Document ID', 'Deal ID', 'Document Type', 'File Name',
        'Upload Date', 'Uploaded By', 'Link', 'Status'
      ];
      break;

    case 'Settings':
      headers = ['Setting', 'Value', 'Description'];
      setupSettingsSheet(sheet);
      break;
  }

  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * Setup dashboard sheet with initial metrics
 */
function setupDashboardSheet(sheet) {
  const metrics = [
    ['Metric', 'Value', 'Last Updated'],
    ['Total Active Deals', '0', new Date()],
    ['Wholesaling Deals', '0', new Date()],
    ['Sub2 Deals', '0', new Date()],
    ['Total Revenue', '$0', new Date()],
    ['Properties Analyzed', '0', new Date()],
    ['Active Buyers', '0', new Date()],
    ['Active Sellers', '0', new Date()],
    ['Deals Closed This Month', '0', new Date()],
    ['Average Deal Profit', '$0', new Date()],
    ['Pipeline Conversion Rate', '0%', new Date()]
  ];

  sheet.getRange(1, 1, metrics.length, 3).setValues(metrics);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  sheet.autoResizeColumns(1, 3);
}

/**
 * Setup settings sheet with default values
 */
function setupSettingsSheet(sheet) {
  const settings = [
    ['Setting', 'Value', 'Description'],
    ['Company Name', '', 'Your company name'],
    ['Company Email', '', 'Primary business email'],
    ['Company Phone', '', 'Primary business phone'],
    ['Default Assignment Fee %', '10', 'Default percentage for wholesaling'],
    ['Target Profit Minimum', '15000', 'Minimum profit target per deal'],
    ['ARV Calculation Method', '70% Rule', '70% Rule or Custom'],
    ['Auto-Save Frequency', '5', 'Minutes between auto-saves'],
    ['Email Notifications', 'Yes', 'Enable email notifications'],
    ['Currency Format', 'USD', 'Currency format for display']
  ];

  sheet.getRange(1, 1, settings.length, 3).setValues(settings);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  sheet.autoResizeColumns(1, 3);
}

/**
 * Save property analysis to Properties sheet
 */
function savePropertyAnalysis(analysisResult) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Properties');

  if (!sheet) {
    throw new Error('Properties sheet not found');
  }

  const propertyId = 'PROP-' + generateId();
  const row = [
    propertyId,
    analysisResult.timestamp,
    analysisResult.address,
    analysisResult.estimatedValue,
    analysisResult.repairCosts,
    analysisResult.arv,
    analysisResult.maxOffer,
    analysisResult.dealScore,
    analysisResult.marketTrend,
    analysisResult.recommended ? 'Yes' : 'No'
  ];

  sheet.appendRow(row);
}

/**
 * Add new deal to Active Deals sheet
 */
function addDealToSheet(dealData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Active Deals');

  if (!sheet) {
    throw new Error('Active Deals sheet not found');
  }

  const dealId = 'DEAL-' + generateId();
  const row = [
    dealId,
    new Date(),
    dealData.address,
    dealData.dealType,
    dealData.status || 'New',
    dealData.sellerName,
    dealData.offerAmount,
    dealData.fee,
    dealData.closeDate,
    dealData.assignedTo || '',
    dealData.notes || ''
  ];

  sheet.appendRow(row);
  return dealId;
}

/**
 * Update deal status
 */
function updateDealStatus() {
  const ui = SpreadsheetApp.getUi();

  // Get deal ID
  const dealResponse = ui.prompt(
    'Update Deal Status',
    'Enter Deal ID:',
    ui.ButtonSet.OK_CANCEL
  );

  if (dealResponse.getSelectedButton() == ui.Button.OK) {
    const dealId = dealResponse.getResponseText();

    // Get new status
    const statusResponse = ui.prompt(
      'Update Deal Status',
      'Enter new status (Lead/Under Contract/Marketed/Assigned/Closed):',
      ui.ButtonSet.OK_CANCEL
    );

    if (statusResponse.getSelectedButton() == ui.Button.OK) {
      const newStatus = statusResponse.getResponseText();

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('Active Deals');
      const data = sheet.getDataRange().getValues();

      // Find and update deal
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === dealId) {
          sheet.getRange(i + 1, 5).setValue(newStatus);
          ui.alert('Success', 'Deal status updated successfully!', ui.ButtonSet.OK);
          return;
        }
      }

      ui.alert('Error', 'Deal ID not found.', ui.ButtonSet.OK);
    }
  }
}

/**
 * Count deals by type
 */
function countDealsByType(dealType) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Active Deals');

  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === dealType) {
      count++;
    }
  }

  return count;
}

/**
 * Calculate total revenue
 */
function calculateTotalRevenue(financialData) {
  let total = 0;

  for (let i = 1; i < financialData.length; i++) {
    if (financialData[i][2] === 'Income') {
      total += Number(financialData[i][4]) || 0;
    }
  }

  return total;
}

/**
 * Get properties analyzed count
 */
function getPropertiesAnalyzedCount() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Properties');

  if (!sheet) return 0;

  return Math.max(0, sheet.getLastRow() - 1);
}

/**
 * Get active buyers count
 */
function getActiveBuyersCount() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Buyers');

  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][9] === true || data[i][9] === 'Yes') {
      count++;
    }
  }

  return count;
}

/**
 * Update dashboard display
 */
function updateDashboardDisplay(sheet, metrics) {
  const updates = [
    ['Total Active Deals', metrics.totalActiveDeals, metrics.lastUpdated],
    ['Wholesaling Deals', metrics.wholesalingDeals, metrics.lastUpdated],
    ['Sub2 Deals', metrics.sub2Deals, metrics.lastUpdated],
    ['Total Revenue', '$' + formatNumber(metrics.totalRevenue), metrics.lastUpdated],
    ['Properties Analyzed', metrics.propertiesAnalyzed, metrics.lastUpdated],
    ['Active Buyers', metrics.activeBuyers, metrics.lastUpdated]
  ];

  sheet.getRange(2, 1, updates.length, 3).setValues(updates);
}

/**
 * Generate unique ID
 */
function generateId() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') +
         Math.floor(Math.random() * 1000);
}
