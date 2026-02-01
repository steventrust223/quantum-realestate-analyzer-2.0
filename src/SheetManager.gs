/**
 * Quantum Real Estate Analyzer - Sheet Manager Module
 * Handles sheet creation, formatting, and structure management
 */

// ============================================================
// SHEET INITIALIZATION
// ============================================================

/**
 * Initialize all required sheets with proper structure
 */
function initializeAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Initialize Sheets',
    'This will create all required sheets. Existing sheets will NOT be overwritten. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  ss.toast('Creating sheets...', 'Initializing', 30);

  try {
    // Create all sheets in order
    createStagingSheets(ss);
    createCoreSheets(ss);
    createStrategyEngineSheets(ss);
    createOutputSheets(ss);
    createAdminSheets(ss);
    createLogSheets(ss);

    // Apply formatting
    applyAllFormatting();

    // Create Settings defaults
    initializeSettingsSheet();

    logEvent('INIT', 'All sheets initialized successfully');
    ss.toast('All sheets created and formatted!', 'Success', 5);

  } catch (error) {
    logError('INIT', error.message, error.stack);
    ss.toast('Error: ' + error.message, 'Failed', 10);
  }
}

/**
 * Creates staging/import sheets
 */
function createStagingSheets(ss) {
  createSheetWithHeaders(ss, CONFIG.SHEETS.IMPORT_HUB, [
    'Source', 'Records Count', 'Last Import', 'Status', 'Action'
  ]);

  createSheetWithHeaders(ss, CONFIG.SHEETS.STAGING_BROWSE_AI, CONFIG.COLUMNS.STAGING);
  createSheetWithHeaders(ss, CONFIG.SHEETS.STAGING_PROPSTREAM, CONFIG.COLUMNS.STAGING);
  createSheetWithHeaders(ss, CONFIG.SHEETS.STAGING_MLS, CONFIG.COLUMNS.STAGING);

  createSheetWithHeaders(ss, CONFIG.SHEETS.WEB_AD_LEADS, [
    'Lead ID', 'Source', 'Campaign', 'Ad Set', 'Timestamp', 'Name', 'Email', 'Phone',
    'Property Address', 'Property City', 'Property State', 'Property ZIP',
    'Asking Price', 'Motivation', 'Timeline', 'Notes', 'Processed'
  ]);
}

/**
 * Creates core data sheets
 */
function createCoreSheets(ss) {
  createSheetWithHeaders(ss, CONFIG.SHEETS.MASTER_DB, CONFIG.COLUMNS.MASTER_DB);
  createSheetWithHeaders(ss, CONFIG.SHEETS.ENHANCED_ANALYZER, [
    'Deal ID', 'Address', 'Analysis Date', 'Analyzed By',
    ...CONFIG.COLUMNS.MASTER_DB.slice(13) // Skip identity columns already in Master
  ]);
  createSheetWithHeaders(ss, CONFIG.SHEETS.LEAD_SCORING, [
    'Deal ID', 'Address', 'Motivation Score', 'Equity Score', 'Market Score',
    'Condition Score', 'Seller Response Score', 'Speed-to-Lead Score',
    'SOM Impact', 'Total Lead Score', 'Risk Score', 'Combined Grade',
    'Scoring Notes', 'Last Scored'
  ]);
}

/**
 * Creates strategy engine sheets
 */
function createStrategyEngineSheets(ss) {
  createSheetWithHeaders(ss, CONFIG.SHEETS.STR_ENGINE, CONFIG.COLUMNS.STR_ENGINE);
  createSheetWithHeaders(ss, CONFIG.SHEETS.MTR_ENGINE, CONFIG.COLUMNS.MTR_ENGINE);
  createSheetWithHeaders(ss, CONFIG.SHEETS.LTR_ENGINE, CONFIG.COLUMNS.LTR_ENGINE);
  createSheetWithHeaders(ss, CONFIG.SHEETS.FLIP_ENGINE, CONFIG.COLUMNS.FLIP_ENGINE);
  createSheetWithHeaders(ss, CONFIG.SHEETS.CREATIVE_ENGINE, CONFIG.COLUMNS.CREATIVE_ENGINE);
}

/**
 * Creates output sheets
 */
function createOutputSheets(ss) {
  createSheetWithHeaders(ss, CONFIG.SHEETS.VERDICT, CONFIG.COLUMNS.VERDICT);
  createSheetWithHeaders(ss, CONFIG.SHEETS.OFFERS, CONFIG.COLUMNS.OFFERS);
  createSheetWithHeaders(ss, CONFIG.SHEETS.REPAIR_ESTIMATOR, CONFIG.COLUMNS.REPAIR_ESTIMATOR);
  createSheetWithHeaders(ss, CONFIG.SHEETS.BUYER_DATABASE, CONFIG.COLUMNS.BUYER_DATABASE);
  createSheetWithHeaders(ss, CONFIG.SHEETS.BUYER_MATCHING, CONFIG.COLUMNS.BUYER_MATCHING);
  createSheetWithHeaders(ss, CONFIG.SHEETS.POST_SALE, CONFIG.COLUMNS.POST_SALE);
}

/**
 * Creates admin/config sheets
 */
function createAdminSheets(ss) {
  createSheetWithHeaders(ss, CONFIG.SHEETS.SETTINGS, CONFIG.COLUMNS.SETTINGS);
  createSheetWithHeaders(ss, CONFIG.SHEETS.DASHBOARD, [
    'Metric', 'Value', 'Change', 'Trend', 'Last Updated'
  ]);
  createSheetWithHeaders(ss, CONFIG.SHEETS.CONTROL_CENTER, [
    'Action', 'Status', 'Last Run', 'Next Scheduled', 'Notes'
  ]);
}

/**
 * Creates log sheets
 */
function createLogSheets(ss) {
  createSheetWithHeaders(ss, CONFIG.SHEETS.SYSTEM_LOG, CONFIG.COLUMNS.SYSTEM_LOG);
  createSheetWithHeaders(ss, CONFIG.SHEETS.ERROR_LOG, CONFIG.COLUMNS.ERROR_LOG);
  createSheetWithHeaders(ss, CONFIG.SHEETS.SYNC_LOG, CONFIG.COLUMNS.SYNC_LOG);
}

/**
 * Creates a sheet with headers if it doesn't exist
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {string} sheetName - Name of the sheet
 * @param {Array} headers - Array of header names
 */
function createSheetWithHeaders(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    logEvent('SHEET', `Created sheet: ${sheetName}`);
  }

  // Set headers if row 1 is empty
  if (sheet.getRange('A1').getValue() === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

// ============================================================
// FORMATTING
// ============================================================

/**
 * Apply formatting to all sheets
 */
function applyAllFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Format each sheet type appropriately
  formatOperationalSheet(ss, CONFIG.SHEETS.MASTER_DB);
  formatOperationalSheet(ss, CONFIG.SHEETS.VERDICT);
  formatOperationalSheet(ss, CONFIG.SHEETS.OFFERS);
  formatOperationalSheet(ss, CONFIG.SHEETS.BUYER_MATCHING);

  formatStrategySheet(ss, CONFIG.SHEETS.STR_ENGINE);
  formatStrategySheet(ss, CONFIG.SHEETS.MTR_ENGINE);
  formatStrategySheet(ss, CONFIG.SHEETS.LTR_ENGINE);
  formatStrategySheet(ss, CONFIG.SHEETS.FLIP_ENGINE);
  formatStrategySheet(ss, CONFIG.SHEETS.CREATIVE_ENGINE);

  formatStagingSheet(ss, CONFIG.SHEETS.STAGING_BROWSE_AI);
  formatStagingSheet(ss, CONFIG.SHEETS.STAGING_PROPSTREAM);
  formatStagingSheet(ss, CONFIG.SHEETS.STAGING_MLS);
  formatStagingSheet(ss, CONFIG.SHEETS.WEB_AD_LEADS);

  formatLogSheet(ss, CONFIG.SHEETS.SYSTEM_LOG);
  formatLogSheet(ss, CONFIG.SHEETS.ERROR_LOG);
  formatLogSheet(ss, CONFIG.SHEETS.SYNC_LOG);

  formatDashboardSheet(ss, CONFIG.SHEETS.DASHBOARD);

  // Apply conditional formatting to key sheets
  applyVerdictConditionalFormatting(ss);
  applyScoreConditionalFormatting(ss);

  logEvent('FORMAT', 'All formatting applied');
}

/**
 * Format an operational sheet (Master DB, Verdict, etc.)
 */
function formatOperationalSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastCol = sheet.getLastColumn() || 10;

  // Freeze header row
  sheet.setFrozenRows(1);

  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground(CONFIG.THEME.headerBg)
    .setFontColor(CONFIG.THEME.headerText)
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  // Set row height for header
  sheet.setRowHeight(1, 40);

  // Auto-resize columns (with max width)
  for (let i = 1; i <= lastCol; i++) {
    sheet.autoResizeColumn(i);
    const width = sheet.getColumnWidth(i);
    if (width > 200) {
      sheet.setColumnWidth(i, 200);
    } else if (width < 80) {
      sheet.setColumnWidth(i, 80);
    }
  }

  // Apply alternating row colors
  applyAlternatingColors(sheet);

  // Add filter
  if (sheet.getLastRow() > 0) {
    const dataRange = sheet.getDataRange();
    if (!sheet.getFilter()) {
      dataRange.createFilter();
    }
  }
}

/**
 * Format a strategy engine sheet
 */
function formatStrategySheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastCol = sheet.getLastColumn() || 10;

  // Freeze header and Deal ID/Address columns
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // Format header row - strategy color
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground('#2E7D32')  // Green theme for strategy
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.setRowHeight(1, 40);

  // Auto-resize columns
  for (let i = 1; i <= lastCol; i++) {
    sheet.autoResizeColumn(i);
    const width = sheet.getColumnWidth(i);
    if (width > 150) sheet.setColumnWidth(i, 150);
    if (width < 70) sheet.setColumnWidth(i, 70);
  }

  applyAlternatingColors(sheet, '#E8F5E9', '#ffffff');
}

/**
 * Format a staging/import sheet
 */
function formatStagingSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastCol = sheet.getLastColumn() || 10;

  sheet.setFrozenRows(1);

  // Format header row - staging color (orange)
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground('#E65100')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setWrap(true);

  sheet.setRowHeight(1, 35);

  applyAlternatingColors(sheet, '#FFF3E0', '#ffffff');
}

/**
 * Format a log sheet
 */
function formatLogSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastCol = sheet.getLastColumn() || 5;

  sheet.setFrozenRows(1);

  // Format header row - log color (gray)
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground('#424242')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center');

  sheet.setRowHeight(1, 30);

  // Timestamp column width
  if (lastCol >= 1) sheet.setColumnWidth(1, 180);
}

/**
 * Format the dashboard sheet
 */
function formatDashboardSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastCol = sheet.getLastColumn() || 5;

  sheet.setFrozenRows(1);

  // Format header row - dashboard color (purple gradient theme)
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground(CONFIG.THEME.primary)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(12)
    .setHorizontalAlignment('center');

  sheet.setRowHeight(1, 45);

  // Metric column wider
  if (lastCol >= 1) sheet.setColumnWidth(1, 250);
  if (lastCol >= 2) sheet.setColumnWidth(2, 150);
}

/**
 * Apply alternating row colors
 */
function applyAlternatingColors(sheet, color1 = '#f8f9fa', color2 = '#ffffff') {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol <= 0) return;

  // Clear existing banding
  const bandings = sheet.getBandings();
  bandings.forEach(b => b.remove());

  // Apply new banding
  const dataRange = sheet.getRange(2, 1, Math.max(1, lastRow - 1), lastCol);
  dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
}

// ============================================================
// CONDITIONAL FORMATTING
// ============================================================

/**
 * Apply conditional formatting to Verdict sheet
 */
function applyVerdictConditionalFormatting(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.VERDICT);
  if (!sheet) return;

  // Clear existing rules
  sheet.clearConditionalFormatRules();

  const rules = [];
  const lastRow = Math.max(sheet.getLastRow(), 100);

  // Find Verdict column (usually column 10)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const verdictCol = headers.indexOf('Verdict') + 1;
  if (verdictCol <= 0) return;

  const verdictRange = sheet.getRange(2, verdictCol, lastRow, 1);

  // HOT = Green
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('HOT')
    .setBackground(CONFIG.VERDICT.HOT.color)
    .setFontColor('#ffffff')
    .setBold(true)
    .setRanges([verdictRange])
    .build());

  // SOLID = Blue
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('SOLID')
    .setBackground(CONFIG.VERDICT.SOLID.color)
    .setFontColor('#ffffff')
    .setBold(true)
    .setRanges([verdictRange])
    .build());

  // HOLD = Orange
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('HOLD')
    .setBackground(CONFIG.VERDICT.HOLD.color)
    .setFontColor('#ffffff')
    .setBold(true)
    .setRanges([verdictRange])
    .build());

  // PASS = Red
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('PASS')
    .setBackground(CONFIG.VERDICT.PASS.color)
    .setFontColor('#ffffff')
    .setBold(true)
    .setRanges([verdictRange])
    .build());

  sheet.setConditionalFormatRules(rules);
}

/**
 * Apply conditional formatting to score columns in Master DB
 */
function applyScoreConditionalFormatting(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rules = [];
  const lastRow = Math.max(sheet.getLastRow(), 100);

  // Deal Score column - gradient green
  const dealScoreCol = headers.indexOf('Deal Score') + 1;
  if (dealScoreCol > 0) {
    const range = sheet.getRange(2, dealScoreCol, lastRow, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(80)
      .setBackground('#C8E6C9')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(60, 79)
      .setBackground('#BBDEFB')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(40, 59)
      .setBackground('#FFE0B2')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(40)
      .setBackground('#FFCDD2')
      .setRanges([range])
      .build());
  }

  // Risk Score column - gradient red (higher = worse)
  const riskScoreCol = headers.indexOf('Risk Score') + 1;
  if (riskScoreCol > 0) {
    const range = sheet.getRange(2, riskScoreCol, lastRow, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(70)
      .setBackground('#FFCDD2')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(50, 69)
      .setBackground('#FFE0B2')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(50)
      .setBackground('#C8E6C9')
      .setRanges([range])
      .build());
  }

  // SLA Status column
  const slaCol = headers.indexOf('SLA Status') + 1;
  if (slaCol > 0) {
    const range = sheet.getRange(2, slaCol, lastRow, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('OPTIMAL')
      .setBackground('#C8E6C9')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('ACCEPTABLE')
      .setBackground('#BBDEFB')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('SLOW')
      .setBackground('#FFE0B2')
      .setRanges([range])
      .build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('BREACH')
      .setBackground('#FFCDD2')
      .setFontColor('#B71C1C')
      .setBold(true)
      .setRanges([range])
      .build());
  }

  if (rules.length > 0) {
    const existingRules = sheet.getConditionalFormatRules();
    sheet.setConditionalFormatRules([...existingRules, ...rules]);
  }
}

// ============================================================
// DATA VALIDATIONS
// ============================================================

/**
 * Apply data validations to sheets
 */
function applyDataValidations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Verdict sheet validations
  applyVerdictValidations(ss);

  // Master DB validations
  applyMasterDBValidations(ss);

  // Buyer Database validations
  applyBuyerDBValidations(ss);

  logEvent('VALIDATION', 'Data validations applied');
}

/**
 * Apply validations to Verdict sheet
 */
function applyVerdictValidations(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.VERDICT);
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Verdict column dropdown
  const verdictCol = headers.indexOf('Verdict') + 1;
  if (verdictCol > 0) {
    const range = sheet.getRange(2, verdictCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['HOT', 'SOLID', 'HOLD', 'PASS'], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }

  // Next Action column dropdown
  const actionCol = headers.indexOf('Next Action') + 1;
  if (actionCol > 0) {
    const range = sheet.getRange(2, actionCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['CALL NOW', 'MAKE OFFER', 'WATCH', 'SKIP', 'RESEARCH', 'FOLLOW UP'], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }
}

/**
 * Apply validations to Master DB
 */
function applyMasterDBValidations(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Status Stage dropdown
  const statusCol = headers.indexOf('Status Stage') + 1;
  if (statusCol > 0) {
    const range = sheet.getRange(2, statusCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        'New Lead', 'Contacted', 'Analyzing', 'Offer Sent', 'Negotiating',
        'Under Contract', 'Due Diligence', 'Closed', 'Dead', 'On Hold'
      ], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }

  // Seller Type dropdown
  const sellerTypeCol = headers.indexOf('Seller Type') + 1;
  if (sellerTypeCol > 0) {
    const range = sheet.getRange(2, sellerTypeCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Owner', 'Agent', 'Investor', 'Bank/REO', 'Estate', 'Unknown'], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }

  // Property Type dropdown
  const propTypeCol = headers.indexOf('Property Type') + 1;
  if (propTypeCol > 0) {
    const range = sheet.getRange(2, propTypeCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        'SFR', 'Duplex', 'Triplex', 'Fourplex', 'Condo', 'Townhouse',
        'Mobile Home', 'Multi-Family', 'Land', 'Commercial', 'Other'
      ], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }
}

/**
 * Apply validations to Buyer Database
 */
function applyBuyerDBValidations(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Strategy Preference dropdown
  const strategyCol = headers.indexOf('Strategy Preference') + 1;
  if (strategyCol > 0) {
    const range = sheet.getRange(2, strategyCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Wholesale', 'Flip', 'STR', 'MTR', 'LTR', 'Creative', 'Any'], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }

  // Risk Tolerance dropdown
  const riskCol = headers.indexOf('Risk Tolerance') + 1;
  if (riskCol > 0) {
    const range = sheet.getRange(2, riskCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Conservative', 'Moderate', 'Aggressive'], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }

  // Active dropdown
  const activeCol = headers.indexOf('Active') + 1;
  if (activeCol > 0) {
    const range = sheet.getRange(2, activeCol, 500, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Yes', 'No'], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
  }
}

// ============================================================
// SETTINGS INITIALIZATION
// ============================================================

/**
 * Initialize Settings sheet with default values
 */
function initializeSettingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!sheet) return;

  // Clear existing data (keep headers)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).clearContent();
  }

  const defaults = [
    // General Settings
    ['system_name', 'Quantum Real Estate Analyzer v2.0', 'string', 'System display name', new Date()],
    ['timezone', 'America/New_York', 'string', 'Default timezone for timestamps', new Date()],
    ['currency', 'USD', 'string', 'Currency for all calculations', new Date()],

    // Flip Settings
    ['flip_holding_cost_monthly', '0.01', 'number', 'Monthly holding cost as % of purchase', new Date()],
    ['flip_agent_fees', '0.06', 'number', 'Total agent fees (buy + sell)', new Date()],
    ['flip_closing_costs', '0.03', 'number', 'Total closing costs', new Date()],
    ['flip_min_profit_margin', '0.15', 'number', 'Minimum acceptable profit margin', new Date()],
    ['flip_target_profit_margin', '0.25', 'number', 'Target profit margin', new Date()],

    // STR Settings
    ['str_default_occupancy', '0.65', 'number', 'Default STR occupancy rate', new Date()],
    ['str_management_fee', '0.20', 'number', 'STR management fee percentage', new Date()],
    ['str_cleaning_per_turn', '75', 'number', 'Cleaning cost per guest turnover', new Date()],
    ['str_furnishing_cost', '8000', 'number', 'Default furnishing budget', new Date()],
    ['str_platform_fee', '0.03', 'number', 'Booking platform fee', new Date()],

    // MTR Settings
    ['mtr_avg_stay_length', '3', 'number', 'Average stay length in months', new Date()],
    ['mtr_vacancy_between_stays', '0.5', 'number', 'Vacancy between stays in weeks', new Date()],
    ['mtr_utilities_bundle', '200', 'number', 'Monthly utilities bundle cost', new Date()],
    ['mtr_management_fee', '0.12', 'number', 'MTR management fee percentage', new Date()],

    // LTR Settings
    ['ltr_vacancy_rate', '0.08', 'number', 'Annual vacancy rate', new Date()],
    ['ltr_maintenance_reserve', '0.10', 'number', 'Maintenance reserve percentage', new Date()],
    ['ltr_capex_reserve', '0.05', 'number', 'CapEx reserve percentage', new Date()],
    ['ltr_property_management', '0.10', 'number', 'Property management fee', new Date()],
    ['ltr_target_dscr', '1.25', 'number', 'Target DSCR for LTR deals', new Date()],

    // Creative Finance Settings
    ['creative_sub2_discount', '0.05', 'number', 'Sub2 discount from asking', new Date()],
    ['creative_wrap_spread_min', '0.01', 'number', 'Minimum wrap spread', new Date()],
    ['creative_wrap_spread_max', '0.03', 'number', 'Maximum wrap spread', new Date()],
    ['creative_seller_carry_rate', '0.06', 'number', 'Default seller carry interest rate', new Date()],
    ['creative_lease_option_fee', '0.03', 'number', 'Lease option fee percentage', new Date()],

    // Speed-to-Lead Settings
    ['stl_tier1_minutes', '5', 'number', 'Tier 1 SLA threshold (minutes)', new Date()],
    ['stl_tier2_minutes', '15', 'number', 'Tier 2 SLA threshold (minutes)', new Date()],
    ['stl_tier3_minutes', '60', 'number', 'Tier 3 SLA threshold (minutes)', new Date()],
    ['stl_tier1_penalty', '0', 'number', 'Tier 1 score penalty', new Date()],
    ['stl_tier2_penalty', '-5', 'number', 'Tier 2 score penalty', new Date()],
    ['stl_tier3_penalty', '-15', 'number', 'Tier 3 score penalty', new Date()],
    ['stl_breach_penalty', '-25', 'number', 'SLA breach score penalty', new Date()],

    // CRM Settings
    ['crm_smsit_enabled', 'false', 'boolean', 'Enable SMS-iT CRM sync', new Date()],
    ['crm_smsit_api_url', '', 'string', 'SMS-iT API URL', new Date()],
    ['crm_smsit_api_key', '', 'string', 'SMS-iT API Key', new Date()],
    ['crm_companyhub_enabled', 'false', 'boolean', 'Enable CompanyHub CRM sync', new Date()],
    ['crm_companyhub_api_url', '', 'string', 'CompanyHub API URL', new Date()],
    ['crm_companyhub_api_key', '', 'string', 'CompanyHub API Key', new Date()],
    ['crm_ohmylead_enabled', 'false', 'boolean', 'Enable OhMyLead integration', new Date()],
    ['crm_ohmylead_webhook', '', 'string', 'OhMyLead webhook URL', new Date()],

    // AI Settings
    ['ai_openai_enabled', 'false', 'boolean', 'Enable OpenAI for messaging', new Date()],
    ['ai_openai_api_key', '', 'string', 'OpenAI API Key', new Date()],
    ['ai_model', 'gpt-4o-mini', 'string', 'AI model to use', new Date()],
    ['ai_max_tokens', '500', 'number', 'Max tokens for AI responses', new Date()],

    // Automation Settings
    ['auto_nightly_refresh', 'true', 'boolean', 'Enable nightly refresh job', new Date()],
    ['auto_dashboard_update', 'true', 'boolean', 'Enable hourly dashboard update', new Date()],
    ['auto_stl_check', 'true', 'boolean', 'Enable speed-to-lead checks', new Date()],
    ['auto_crm_sync', 'false', 'boolean', 'Enable automatic CRM sync', new Date()]
  ];

  sheet.getRange(2, 1, defaults.length, 5).setValues(defaults);

  // Format Settings sheet
  formatOperationalSheet(ss, CONFIG.SHEETS.SETTINGS);

  logEvent('SETTINGS', 'Settings initialized with defaults');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get column index by header name
 * @param {Sheet} sheet - Sheet object
 * @param {string} headerName - Name of the header
 * @returns {number} Column index (1-based) or -1 if not found
 */
function getColumnByHeader(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf(headerName);
  return index >= 0 ? index + 1 : -1;
}

/**
 * Get all column indices as an object
 * @param {Sheet} sheet - Sheet object
 * @returns {Object} Object mapping header names to column indices
 */
function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    if (header) {
      map[header] = index + 1;
    }
  });
  return map;
}
