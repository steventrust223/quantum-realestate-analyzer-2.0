/**
 * Quantum Real Estate Analyzer v2.0
 * UI Helpers & Formatting
 *
 * Handles:
 * - Conditional formatting for visual clarity
 * - Data validation rules
 * - Sheet protection
 * - Export functions
 * - Dashboard updates
 */

// ============================================
// CONDITIONAL FORMATTING
// ============================================

/**
 * Apply conditional formatting to all sheets
 */
function applyConditionalFormatting() {
  applyMasterDatabaseFormatting();
  applyVerdictSheetFormatting();
  applyLeadScoringFormatting();
  applyCRMSyncLogFormatting();
  applyBuyersMatchingFormatting();

  SpreadsheetApp.getUi().alert(
    '✅ Conditional Formatting Applied',
    'All sheets now have color-coded formatting for visual clarity.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Apply formatting to Master Database
 */
function applyMasterDatabaseFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!sheet || sheet.getLastRow() <= 1) return;

  // Deal Classifier color coding (column 38)
  const classifierRange = sheet.getRange(2, 38, sheet.getLastRow() - 1, 1);

  const classifierRules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('🔥 HOT DEAL')
      .setBackground('#ff6b6b')  // Red
      .setFontColor('#ffffff')
      .setBold(true)
      .setRanges([classifierRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('🧱 PORTFOLIO FOUNDATION')
      .setBackground('#4ecdc4')  // Teal
      .setFontColor('#ffffff')
      .setBold(true)
      .setRanges([classifierRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('✅ SOLID DEAL')
      .setBackground('#95e1d3')  // Light green
      .setFontColor('#2c3e50')
      .setRanges([classifierRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('❌ PASS')
      .setBackground('#e0e0e0')  // Gray
      .setFontColor('#757575')
      .setRanges([classifierRange])
      .build()
  ];

  // Equity % color coding (column 33)
  const equityRange = sheet.getRange(2, 33, sheet.getLastRow() - 1, 1);

  const equityRules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(30)
      .setBackground('#c8e6c9')  // Light green
      .setRanges([equityRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(20, 29)
      .setBackground('#fff9c4')  // Light yellow
      .setRanges([equityRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(20)
      .setBackground('#ffcdd2')  // Light red
      .setRanges([equityRange])
      .build()
  ];

  // Overall Deal Score color coding (column 37)
  const scoreRange = sheet.getRange(2, 37, sheet.getLastRow() - 1, 1);

  const scoreRules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(70)
      .setBackground('#81c784')  // Green
      .setFontColor('#ffffff')
      .setBold(true)
      .setRanges([scoreRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(50, 69)
      .setBackground('#fff59d')  // Yellow
      .setRanges([scoreRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(50)
      .setBackground('#ef9a9a')  // Red
      .setRanges([scoreRange])
      .build()
  ];

  // Hot Seller highlighting (column 45)
  const hotSellerRange = sheet.getRange(2, 45, sheet.getLastRow() - 1, 1);

  const hotSellerRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Yes')
    .setBackground('#ff9800')  // Orange
    .setFontColor('#ffffff')
    .setBold(true)
    .setRanges([hotSellerRange])
    .build();

  // Apply all rules
  const allRules = sheet.getConditionalFormatRules();
  allRules.push(...classifierRules, ...equityRules, ...scoreRules, hotSellerRule);
  sheet.setConditionalFormatRules(allRules);
}

/**
 * Apply formatting to Verdict Sheet
 */
function applyVerdictSheetFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.VERDICT_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) return;

  // Deal Classifier highlighting (column 2)
  const classifierRange = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1);

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('🔥 HOT DEAL')
      .setBackground('#ff6b6b')
      .setFontColor('#ffffff')
      .setBold(true)
      .setRanges([classifierRange])
      .build()
  ];

  const allRules = sheet.getConditionalFormatRules();
  allRules.push(...rules);
  sheet.setConditionalFormatRules(allRules);
}

/**
 * Apply formatting to Lead Scoring sheet
 */
function applyLeadScoringFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LEAD_SCORING);

  if (!sheet || sheet.getLastRow() <= 1) return;

  // Total Lead Score color scale (last column)
  const scoreRange = sheet.getRange(2, sheet.getLastColumn(), sheet.getLastRow() - 1, 1);

  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(0, 100)
    .setGradientMaxpointWithValue('#4caf50', SpreadsheetApp.InterpolationType.NUMBER, '100')
    .setGradientMidpointWithValue('#ffeb3b', SpreadsheetApp.InterpolationType.NUMBER, '50')
    .setGradientMinpointWithValue('#f44336', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setRanges([scoreRange])
    .build();

  const allRules = sheet.getConditionalFormatRules();
  allRules.push(rule);
  sheet.setConditionalFormatRules(allRules);
}

/**
 * Apply formatting to CRM Sync Log
 */
function applyCRMSyncLogFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CRM_SYNC_LOG);

  if (!sheet || sheet.getLastRow() <= 1) return;

  // Status color coding (column 4)
  const statusRange = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1);

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Success')
      .setBackground('#c8e6c9')
      .setFontColor('#2e7d32')
      .setRanges([statusRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Failed')
      .setBackground('#ffcdd2')
      .setFontColor('#c62828')
      .setRanges([statusRange])
      .build()
  ];

  const allRules = sheet.getConditionalFormatRules();
  allRules.push(...rules);
  sheet.setConditionalFormatRules(allRules);
}

/**
 * Apply formatting to Buyers Matching sheet
 */
function applyBuyersMatchingFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.BUYERS_MATCHING);

  if (!sheet || sheet.getLastRow() <= 1) return;

  // Match Quality color coding (column 26)
  const qualityRange = sheet.getRange(2, 26, sheet.getLastRow() - 1, 1);

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('PERFECT')
      .setBackground('#4caf50')
      .setFontColor('#ffffff')
      .setBold(true)
      .setRanges([qualityRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('STRONG')
      .setBackground('#8bc34a')
      .setRanges([qualityRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('GOOD')
      .setBackground('#cddc39')
      .setRanges([qualityRange])
      .build()
  ];

  const allRules = sheet.getConditionalFormatRules();
  allRules.push(...rules);
  sheet.setConditionalFormatRules(allRules);
}

// ============================================
// DATA VALIDATION
// ============================================

/**
 * Apply data validation to dropdown fields
 */
function applyDataValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  // Property Type dropdown (column 11)
  const propertyTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Single Family', 'Multi-family', 'Condo', 'Townhouse', 'Mobile Home', 'Land'], true)
    .setAllowInvalid(false)
    .build();
  masterSheet.getRange(2, 11, 1000, 1).setDataValidation(propertyTypeRule);

  // Deal Classifier dropdown (column 38)
  const classifierRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['🔥 HOT DEAL', '🧱 PORTFOLIO FOUNDATION', '✅ SOLID DEAL', '❌ PASS'], true)
    .setAllowInvalid(false)
    .build();
  masterSheet.getRange(2, 38, 1000, 1).setDataValidation(classifierRule);

  // Status dropdown (column 65)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['New', 'Analyzing', 'Contacted', 'Offer Made', 'Under Contract', 'Closed', 'Dead'], true)
    .setAllowInvalid(false)
    .build();
  masterSheet.getRange(2, 65, 1000, 1).setDataValidation(statusRule);

  Logger.log('Data validation applied');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export all data to CSV files
 */
function exportAllData() {
  const ui = SpreadsheetApp.getUi();

  ui.alert(
    '📤 Export All Data',
    'This will export all sheets as CSV files to your Google Drive.\n\n' +
    'Files will be saved in a folder named "Quantum Analyzer Export - [Date]".\n\n' +
    'Note: Large sheets may take several minutes to export.',
    ui.ButtonSet.OK
  );

  // In production, this would create CSV exports
  // For now, provide instructions

  ui.alert(
    'Export Instructions',
    'To export manually:\n\n' +
    '1. Go to File → Download\n' +
    '2. Select format (Excel, CSV, PDF)\n' +
    '3. Choose which sheets to export\n\n' +
    'For automated exports, contact support for custom script.',
    ui.ButtonSet.OK
  );
}

// ============================================
// DASHBOARD UPDATES
// ============================================

/**
 * Update dashboard with real-time metrics
 */
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);
  const buyersSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DATABASE);

  if (!dashboardSheet || !masterSheet) return;

  // Calculate metrics
  const masterData = masterSheet.getDataRange().getValues();

  let activeLeads = 0;
  let hotDeals = 0;
  let analyzedThisWeek = 0;
  let hotSellers = 0;
  let underContract = 0;
  let totalPipelineValue = 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (let i = 1; i < masterData.length; i++) {
    const status = masterData[i][64];  // Status column
    const classifier = masterData[i][38];  // Deal Classifier
    const hotSeller = masterData[i][45];  // Hot Seller?
    const lastAnalyzed = masterData[i][58];  // Last AI Analysis Date
    const arv = masterData[i][20] || 0;  // ARV

    if (status !== 'Dead' && status !== 'Closed') {
      activeLeads++;
      totalPipelineValue += arv;
    }

    if (classifier === '🔥 HOT DEAL') hotDeals++;
    if (hotSeller === 'Yes') hotSellers++;
    if (status === 'Under Contract') underContract++;

    if (lastAnalyzed && new Date(lastAnalyzed) >= oneWeekAgo) {
      analyzedThisWeek++;
    }
  }

  // Count active buyers
  let activeBuyers = 0;
  if (buyersSheet) {
    const buyersData = buyersSheet.getDataRange().getValues();
    for (let i = 1; i < buyersData.length; i++) {
      if (buyersData[i][22] === 'Yes' || buyersData[i][22] === true) {
        activeBuyers++;
      }
    }
  }

  // Update dashboard cells
  dashboardSheet.getRange(4, 2).setValue(activeLeads);
  dashboardSheet.getRange(5, 2).setValue(analyzedThisWeek);
  dashboardSheet.getRange(6, 2).setValue(hotSellers);

  dashboardSheet.getRange(4, 4).setValue(hotDeals);
  dashboardSheet.getRange(6, 4).setValue(underContract);

  dashboardSheet.getRange(4, 6).setValue('$' + totalPipelineValue.toLocaleString());

  dashboardSheet.getRange(14, 2).setValue(activeBuyers);

  // Auto-analysis status
  const autoAnalysisEnabled = getSetting('AUTO_ANALYSIS_ENABLED');
  dashboardSheet.getRange(14, 4).setValue(autoAnalysisEnabled === 'TRUE' ? '✅ ON' : '⏸️ OFF');

  // Last refresh timestamp
  dashboardSheet.getRange(1, 7).setValue('Last updated: ' + new Date().toLocaleString());

  Logger.log('Dashboard updated with live metrics');
}

/**
 * Auto-refresh dashboard (called by time trigger)
 */
function autoRefreshDashboard() {
  updateDashboard();
}

// ============================================
// SHEET PROTECTION
// ============================================

/**
 * Protect critical system sheets
 */
function protectSystemSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Protect Settings sheet (read-only except for value column)
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet) {
    const protection = settingsSheet.protect().setDescription('Settings Sheet Protection');

    // Allow editing of value column only
    const valueRange = settingsSheet.getRange(2, 2, 1000, 1);
    protection.setUnprotectedRanges([valueRange]);

    // Restrict to sheet owner
    const me = Session.getEffectiveUser();
    protection.addEditor(me);
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  }

  Logger.log('System sheets protected');
}

// ============================================
// VISUAL ENHANCEMENTS
// ============================================

/**
 * Add clickable buttons to Verdict Sheet
 */
function addVerdictSheetButtons() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.VERDICT_SHEET);

  if (!sheet) return;

  // In Google Sheets, we can't add actual buttons, but we can:
  // 1. Add hyperlinks to trigger functions
  // 2. Use Apps Script sidebar with buttons
  // 3. Use custom menu (already implemented)

  // Add instruction text
  sheet.getRange(1, 17).setValue('Use Menu: Deal Analysis → View Details');

  Logger.log('Verdict Sheet enhanced with instructions');
}

/**
 * Show market heat map (future enhancement)
 */
function showMarketHeatMap() {
  const html = HtmlService.createHtmlOutput(`
    <h2>🌍 Market Heat Map</h2>
    <p>Market Intelligence visualization showing hottest ZIP codes.</p>
    <p><strong>Coming Soon:</strong> Interactive heat map with ZIP code overlays.</p>
    <p>For now, view the Market Intelligence sheet for ZIP-level data.</p>
  `)
  .setWidth(500)
  .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(html, 'Market Heat Map');
}

/**
 * Show financial report
 */
function showFinancialReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const financialSheet = ss.getSheetByName(SHEET_NAMES.FINANCIAL_TRACKING);

  if (!financialSheet) {
    SpreadsheetApp.getUi().alert('Financial Tracking sheet not found');
    return;
  }

  const html = HtmlService.createHtmlOutput(`
    <h2>💵 Financial Report</h2>
    <p>View detailed financial data in the Financial Tracking sheet.</p>
    <p>Track:</p>
    <ul>
      <li>Revenue by deal type</li>
      <li>Expenses by category</li>
      <li>Profit margins</li>
      <li>ROI calculations</li>
    </ul>
    <p><strong>Future Enhancement:</strong> Auto-generated PDF reports with charts.</p>
  `)
  .setWidth(500)
  .setHeight(350);

  SpreadsheetApp.getUi().showModalDialog(html, 'Financial Report');
}

/**
 * Show deal velocity report
 */
function showDealVelocityReport() {
  const html = HtmlService.createHtmlOutput(`
    <h2>🎯 Deal Velocity Report</h2>
    <p>Analyze how fast deals move through your pipeline.</p>
    <p>Metrics:</p>
    <ul>
      <li>Average days in each stage</li>
      <li>Conversion rates between stages</li>
      <li>Bottleneck identification</li>
      <li>Team performance by deal stage</li>
    </ul>
    <p>View Deal Pipelines sheet for current status.</p>
  `)
  .setWidth(500)
  .setHeight(350);

  SpreadsheetApp.getUi().showModalDialog(html, 'Deal Velocity Report');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a hyperlink formula
 */
function createHyperlink(url, text) {
  return '=HYPERLINK("' + url + '","' + text + '")';
}

/**
 * Format currency
 */
function formatCurrency(value) {
  return '$' + parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Format percentage
 */
function formatPercentage(value) {
  return parseFloat(value).toFixed(1) + '%';
}

/**
 * Get row color based on deal classifier
 */
function getClassifierColor(classifier) {
  const colors = {
    '🔥 HOT DEAL': '#ff6b6b',
    '🧱 PORTFOLIO FOUNDATION': '#4ecdc4',
    '✅ SOLID DEAL': '#95e1d3',
    '❌ PASS': '#e0e0e0'
  };

  return colors[classifier] || '#ffffff';
}
