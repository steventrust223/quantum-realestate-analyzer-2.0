/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Setup Module (setup.gs)
 * ============================================================================
 *
 * Handles initial workbook setup, sheet creation, formatting, and system initialization.
 */

// =============================================================================
// MAIN SETUP FUNCTION
// =============================================================================

/**
 * Runs the complete setup wizard
 * Creates all sheets with proper formatting and structure
 */
function runSetupWizard() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Quantum Real Estate Analyzer - Setup',
    'This will create all required sheets and configure the workbook.\n\n' +
    'Existing sheets with the same names will NOT be overwritten.\n\n' +
    'Do you want to continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    showToast('Setup cancelled');
    return;
  }

  try {
    showToast('Starting setup...', 'Setup Wizard', 30);

    // Create all sheets
    createAllSheets();

    // Setup repair estimator with defaults
    populateRepairEstimator();

    // Setup automation control center
    populateAutomationControl();

    // Apply formatting
    applyAllFormatting();

    // Install triggers
    installTriggers();

    // Log success
    logSuccess('Setup', 'Workbook setup completed successfully');
    showToast('Setup complete! All sheets created.', 'Success', 10);

    // Show completion message
    ui.alert(
      'Setup Complete',
      'All sheets have been created and configured.\n\n' +
      'Next steps:\n' +
      '1. Set your API keys in the Setup Wizard (Menu > Quantum Real Estate > Setup Wizard)\n' +
      '2. Import your first leads\n' +
      '3. Run analysis\n\n' +
      'Use the custom menu "Quantum Real Estate" to access all features.',
      ui.ButtonSet.OK
    );
  } catch (e) {
    logError('Setup', e, 'Setup wizard failed');
    ui.alert('Setup Error', 'An error occurred: ' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Creates all required sheets
 */
function createAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create each sheet with its columns
  createSheetWithColumns(ss, SHEETS.IMPORT_HUB, COLUMNS.LEADS_DATABASE);
  createSheetWithColumns(ss, SHEETS.LEADS_DATABASE, COLUMNS.LEADS_DATABASE);
  createSheetWithColumns(ss, SHEETS.DEAL_ANALYZER, COLUMNS.DEAL_ANALYZER);
  createSheetWithColumns(ss, SHEETS.VERDICT, COLUMNS.VERDICT);
  createSheetWithColumns(ss, SHEETS.BUYERS_EXIT, COLUMNS.BUYERS_EXIT);
  createSheetWithColumns(ss, SHEETS.OFFERS_DISPOSITION, COLUMNS.OFFERS_DISPOSITION);
  createSheetWithColumns(ss, SHEETS.REPAIR_ESTIMATOR, COLUMNS.REPAIR_ESTIMATOR);
  createSheetWithColumns(ss, SHEETS.MARKET_ZIP_INTEL, COLUMNS.MARKET_ZIP_INTEL);
  createSheetWithColumns(ss, SHEETS.CRM_SYNC_LOG, COLUMNS.CRM_SYNC_LOG);
  createSheetWithColumns(ss, SHEETS.AUTOMATION_CONTROL, COLUMNS.AUTOMATION_CONTROL);
  createSheetWithColumns(ss, SHEETS.DASHBOARD, ['Metric', 'Value', 'Trend', 'Last Updated']);
  createSheetWithColumns(ss, SHEETS.SYSTEM_HEALTH, COLUMNS.SYSTEM_HEALTH);

  logInfo('Setup', 'All sheets created successfully');
}

/**
 * Creates a single sheet with specified columns
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {string} sheetName - Name for the sheet
 * @param {Array} columns - Column headers
 */
function createSheetWithColumns(ss, sheetName, columns) {
  let sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    logInfo('Setup', `Sheet "${sheetName}" already exists, skipping creation`);
    return sheet;
  }

  sheet = ss.insertSheet(sheetName);
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

  // Apply basic formatting
  formatHeaders(sheet, columns.length);

  // Set column widths based on column type
  setColumnWidths(sheet, columns);

  logInfo('Setup', `Created sheet: ${sheetName}`);
  return sheet;
}

/**
 * Sets appropriate column widths based on column names
 * @param {Sheet} sheet - Sheet object
 * @param {Array} columns - Column headers
 */
function setColumnWidths(sheet, columns) {
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    let width = UI_CONFIG.FORMATTING.COLUMN_WIDTH_DEFAULT;

    // Narrow columns
    if (['Beds', 'Baths', 'Rank', 'Status', 'Synced', 'Enabled', 'Active'].includes(col)) {
      width = UI_CONFIG.FORMATTING.COLUMN_WIDTH_NARROW;
    }
    // Wide columns
    else if (['Address', 'Description', 'Notes', 'Message', 'Seller Message', 'Listing URL', 'Negotiation Angle'].includes(col)) {
      width = UI_CONFIG.FORMATTING.COLUMN_WIDTH_WIDE;
    }

    sheet.setColumnWidth(i + 1, width);
  }
}

// =============================================================================
// SHEET-SPECIFIC SETUP
// =============================================================================

/**
 * Populates the Repair Estimator with default values
 */
function populateRepairEstimator() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.REPAIR_ESTIMATOR);
  if (!sheet) return;

  // Check if already populated
  if (sheet.getLastRow() > 1) {
    logInfo('Setup', 'Repair Estimator already populated');
    return;
  }

  const data = REPAIR_DEFAULTS.categories.map(item => [
    item.item,
    getCategoryFromItem(item.item),
    item.low,
    item.medium,
    item.high,
    'Per Unit',
    ''
  ]);

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, 7).setValues(data);
    logInfo('Setup', 'Repair Estimator populated with default values');
  }
}

/**
 * Gets category for a repair item
 * @param {string} item - Item name
 * @returns {string} Category name
 */
function getCategoryFromItem(item) {
  const categories = {
    'Roof': ['Roof Replacement'],
    'HVAC': ['HVAC Replacement'],
    'Plumbing': ['Plumbing Updates'],
    'Electrical': ['Electrical Updates'],
    'Foundation': ['Foundation Repair'],
    'Kitchen': ['Kitchen Remodel', 'Appliances'],
    'Bathroom': ['Bathroom Remodel'],
    'Interior': ['Flooring', 'Paint Interior'],
    'Exterior': ['Paint Exterior', 'Windows', 'Siding', 'Landscaping', 'Driveway/Concrete'],
    'Administrative': ['Permits & Fees', 'Contingency']
  };

  for (const [category, items] of Object.entries(categories)) {
    if (items.includes(item)) return category;
  }
  return 'Other';
}

/**
 * Populates the Automation Control Center with default settings
 */
function populateAutomationControl() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTOMATION_CONTROL);
  if (!sheet) return;

  // Check if already populated
  if (sheet.getLastRow() > 1) {
    logInfo('Setup', 'Automation Control already populated');
    return;
  }

  const features = [
    ['Auto Import on New Rows', AUTOMATION.FEATURES.AUTO_IMPORT, '', '', 'Active', 'Automatically imports new rows from Import Hub'],
    ['Auto Analyze New Leads', AUTOMATION.FEATURES.AUTO_ANALYZE, '', '', 'Active', 'Runs analysis on newly imported leads'],
    ['Auto Update Verdict', AUTOMATION.FEATURES.AUTO_VERDICT, '', '', 'Active', 'Rebuilds verdict rankings after analysis'],
    ['Auto CRM Sync for HOT Deals', AUTOMATION.FEATURES.AUTO_CRM_SYNC, '', '', 'Active', 'Pushes HOT DEAL leads to configured CRM'],
    ['Daily Dashboard Refresh', AUTOMATION.FEATURES.DAILY_REFRESH, '', '7:00 AM', 'Active', 'Updates dashboard and system health daily'],
    ['AI Strategy Recommendations', true, '', '', 'Active', 'Uses AI for ambiguous strategy decisions'],
    ['AI Repair Inference', true, '', '', 'Active', 'Uses AI to estimate repairs from descriptions'],
    ['AI Seller Messaging', true, '', '', 'Active', 'Uses AI to generate personalized seller messages']
  ];

  sheet.getRange(2, 1, features.length, 6).setValues(features);

  // Add checkboxes for Enabled column
  const enabledRange = sheet.getRange(2, 2, features.length, 1);
  enabledRange.insertCheckboxes();

  logInfo('Setup', 'Automation Control Center populated with default settings');
}

/**
 * Sets up the Dashboard sheet with KPI layout
 */
function setupDashboard() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DASHBOARD);
  if (!sheet) return;

  // Clear existing content
  sheet.clear();

  // Set up header
  sheet.getRange('A1:D1').merge()
    .setValue('QUANTUM REAL ESTATE ANALYZER - DASHBOARD')
    .setBackground(UI_CONFIG.COLORS.PRIMARY)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontSize(16)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // KPI Section Headers
  const kpiHeaders = [
    ['Total Leads', 'HOT Deals', 'Avg Spread', 'Total Pipeline Value'],
    [0, 0, '$0', '$0']
  ];

  sheet.getRange('A3:D4').setValues(kpiHeaders);
  sheet.getRange('A3:D3')
    .setBackground(UI_CONFIG.COLORS.INFO)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange('A4:D4')
    .setFontSize(20)
    .setHorizontalAlignment('center');

  // Strategy Distribution header
  sheet.getRange('A6:B6').merge()
    .setValue('Strategy Distribution')
    .setBackground(UI_CONFIG.COLORS.DARK)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontWeight('bold');

  // Deal Classifier Distribution header
  sheet.getRange('C6:D6').merge()
    .setValue('Deal Classifications')
    .setBackground(UI_CONFIG.COLORS.DARK)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontWeight('bold');

  // Risk Distribution header
  sheet.getRange('A15:B15').merge()
    .setValue('Risk Distribution')
    .setBackground(UI_CONFIG.COLORS.DARK)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontWeight('bold');

  // Recent Activity header
  sheet.getRange('C15:D15').merge()
    .setValue('Recent Activity')
    .setBackground(UI_CONFIG.COLORS.DARK)
    .setFontColor(UI_CONFIG.COLORS.WHITE)
    .setFontWeight('bold');

  // Last updated
  sheet.getRange('A24').setValue('Last Updated:');
  sheet.getRange('B24').setValue(new Date());

  logInfo('Setup', 'Dashboard layout configured');
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Applies formatting to all sheets
 */
function applyAllFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Apply banding to data sheets
  const dataSheets = [
    SHEETS.LEADS_DATABASE,
    SHEETS.DEAL_ANALYZER,
    SHEETS.VERDICT,
    SHEETS.BUYERS_EXIT,
    SHEETS.OFFERS_DISPOSITION,
    SHEETS.CRM_SYNC_LOG
  ];

  dataSheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      applyBanding(sheet);
    }
  });

  // Apply conditional formatting for Deal Analyzer
  const dealSheet = ss.getSheetByName(SHEETS.DEAL_ANALYZER);
  if (dealSheet) {
    const classifierCol = COLUMNS.DEAL_ANALYZER.indexOf('Deal Classifier') + 1;
    if (classifierCol > 0) {
      applyDealClassifierFormatting(dealSheet, classifierCol);
    }
  }

  // Apply conditional formatting for Verdict
  const verdictSheet = ss.getSheetByName(SHEETS.VERDICT);
  if (verdictSheet) {
    const classifierCol = COLUMNS.VERDICT.indexOf('Deal Classifier') + 1;
    if (classifierCol > 0) {
      applyDealClassifierFormatting(verdictSheet, classifierCol);
    }
  }

  // Setup Dashboard
  setupDashboard();

  logInfo('Setup', 'Formatting applied to all sheets');
}

/**
 * Applies number formatting to currency columns
 * @param {Sheet} sheet - Sheet object
 * @param {Array} columns - Column headers
 */
function applyCurrencyFormatting(sheet, columns) {
  const currencyColumns = [
    'Asking Price', 'ARV Estimate', 'Repair Estimate', 'MAO (Wholesale)',
    'MAO (Flip)', 'MAO (BRRRR)', 'Offer Target', 'Spread Estimate',
    'Holding Cost Estimate', 'Equity Estimate', 'Offer Amount',
    'Counter Offer', 'Accepted Price', 'Assignment Fee'
  ];

  const lastRow = Math.max(sheet.getLastRow(), 100);

  columns.forEach((col, index) => {
    if (currencyColumns.includes(col)) {
      const range = sheet.getRange(2, index + 1, lastRow - 1, 1);
      range.setNumberFormat('$#,##0');
    }
  });
}

/**
 * Applies percentage formatting to score columns
 * @param {Sheet} sheet - Sheet object
 * @param {Array} columns - Column headers
 */
function applyPercentageFormatting(sheet, columns) {
  const percentColumns = [
    'Risk Score', 'Sales Velocity Score', 'Market Heat Score',
    'Strategy Confidence', 'Sub2 Fit Score', 'Wrap Fit Score',
    'Seller Finance Fit Score', 'Motivation Score', 'Seller Psychology Score',
    'Confidence'
  ];

  const lastRow = Math.max(sheet.getLastRow(), 100);

  columns.forEach((col, index) => {
    if (percentColumns.includes(col)) {
      const range = sheet.getRange(2, index + 1, lastRow - 1, 1);
      range.setNumberFormat('0');
    }
  });
}

// =============================================================================
// TRIGGER MANAGEMENT
// =============================================================================

/**
 * Installs all required triggers
 */
function installTriggers() {
  // Remove existing triggers first
  removeAllTriggers();

  // Install onOpen trigger for menu
  ScriptApp.newTrigger('onOpen')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onOpen()
    .create();

  // Install onChange trigger for auto-import
  ScriptApp.newTrigger('onChangeHandler')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();

  // Install daily trigger
  ScriptApp.newTrigger('dailyRefresh')
    .timeBased()
    .atHour(AUTOMATION.TIMING.DAILY_TRIGGER_HOUR)
    .everyDays(1)
    .create();

  logInfo('Setup', 'Triggers installed successfully');
}

/**
 * Removes all project triggers
 */
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  logInfo('Setup', 'All triggers removed');
}

/**
 * Lists all installed triggers
 * @returns {Array} Trigger information
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  return triggers.map(t => ({
    id: t.getUniqueId(),
    handler: t.getHandlerFunction(),
    type: t.getEventType().toString()
  }));
}

// =============================================================================
// VALIDATION AND TESTING
// =============================================================================

/**
 * Validates that all required sheets exist
 * @returns {Object} Validation result
 */
function validateSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const missing = [];
  const present = [];

  Object.values(SHEETS).forEach(sheetName => {
    if (ss.getSheetByName(sheetName)) {
      present.push(sheetName);
    } else {
      missing.push(sheetName);
    }
  });

  return {
    valid: missing.length === 0,
    present: present,
    missing: missing
  };
}

/**
 * Validates that all required columns exist in key sheets
 * @returns {Object} Validation result
 */
function validateColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const issues = [];

  // Check Leads Database
  const leadsSheet = ss.getSheetByName(SHEETS.LEADS_DATABASE);
  if (leadsSheet) {
    const headers = leadsSheet.getRange(1, 1, 1, leadsSheet.getLastColumn()).getValues()[0];
    const missing = COLUMNS.LEADS_DATABASE.filter(col => !headers.includes(col));
    if (missing.length > 0) {
      issues.push({ sheet: SHEETS.LEADS_DATABASE, missingColumns: missing });
    }
  }

  // Check Deal Analyzer
  const dealSheet = ss.getSheetByName(SHEETS.DEAL_ANALYZER);
  if (dealSheet) {
    const headers = dealSheet.getRange(1, 1, 1, dealSheet.getLastColumn()).getValues()[0];
    const missing = COLUMNS.DEAL_ANALYZER.filter(col => !headers.includes(col));
    if (missing.length > 0) {
      issues.push({ sheet: SHEETS.DEAL_ANALYZER, missingColumns: missing });
    }
  }

  return {
    valid: issues.length === 0,
    issues: issues
  };
}

/**
 * Validates API key configuration
 * @returns {Object} Validation result
 */
function validateApiKeys() {
  const keys = {
    openai: !isEmpty(CONFIG.API_KEYS.OPENAI_API_KEY),
    smsit: !isEmpty(CONFIG.API_KEYS.SMSIT_API_KEY),
    companyhub: !isEmpty(CONFIG.API_KEYS.COMPANYHUB_API_KEY),
    onehash: !isEmpty(CONFIG.API_KEYS.ONEHASH_API_KEY)
  };

  const configured = Object.entries(keys).filter(([_, v]) => v).map(([k]) => k);
  const missing = Object.entries(keys).filter(([_, v]) => !v).map(([k]) => k);

  return {
    valid: keys.openai, // OpenAI is required for AI features
    configured: configured,
    missing: missing,
    message: keys.openai ? 'OpenAI configured' : 'OpenAI API key required for AI features'
  };
}

/**
 * Runs all validations and returns summary
 * @returns {Object} Validation summary
 */
function runValidation() {
  const sheets = validateSheets();
  const columns = validateColumns();
  const apiKeys = validateApiKeys();

  const allValid = sheets.valid && columns.valid;

  return {
    valid: allValid,
    sheets: sheets,
    columns: columns,
    apiKeys: apiKeys,
    timestamp: new Date().toISOString()
  };
}

/**
 * Tests the system setup by running validation
 * Used by the setup wizard
 */
function testSetup() {
  const validation = runValidation();

  let message = 'System Validation Results:\n\n';

  // Sheets
  message += `Sheets: ${validation.sheets.valid ? 'OK' : 'ISSUES'}\n`;
  if (!validation.sheets.valid) {
    message += `  Missing: ${validation.sheets.missing.join(', ')}\n`;
  }

  // Columns
  message += `Columns: ${validation.columns.valid ? 'OK' : 'ISSUES'}\n`;
  if (!validation.columns.valid) {
    validation.columns.issues.forEach(issue => {
      message += `  ${issue.sheet}: Missing ${issue.missingColumns.length} columns\n`;
    });
  }

  // API Keys
  message += `API Keys: ${validation.apiKeys.message}\n`;
  message += `  Configured: ${validation.apiKeys.configured.join(', ') || 'None'}\n`;

  SpreadsheetApp.getUi().alert('System Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);

  return validation;
}

// =============================================================================
// RESET AND CLEANUP
// =============================================================================

/**
 * Resets the entire workbook (destructive - use with caution)
 */
function resetWorkbook() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'WARNING - Reset Workbook',
    'This will DELETE ALL DATA and reset the workbook to initial state.\n\n' +
    'This action CANNOT be undone!\n\n' +
    'Are you absolutely sure?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    showToast('Reset cancelled');
    return;
  }

  // Second confirmation
  const confirm = ui.alert(
    'FINAL CONFIRMATION',
    'Type YES to confirm you want to delete all data.',
    ui.ButtonSet.OK_CANCEL
  );

  if (confirm !== ui.Button.OK) {
    showToast('Reset cancelled');
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Delete all sheets except first
    const sheets = ss.getSheets();
    const firstSheet = sheets[0];

    // Rename first sheet temporarily
    firstSheet.setName('_temp_');

    // Delete all other sheets
    for (let i = 1; i < sheets.length; i++) {
      ss.deleteSheet(sheets[i]);
    }

    // Create fresh setup
    runSetupWizard();

    // Delete temp sheet
    ss.deleteSheet(firstSheet);

    logSuccess('Setup', 'Workbook reset completed');
    showToast('Workbook has been reset');
  } catch (e) {
    logError('Setup', e, 'Reset failed');
    ui.alert('Reset Error', 'An error occurred: ' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Clears all data but keeps sheet structure
 */
function clearAllData() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Clear All Data',
    'This will clear all data from all sheets but keep the structure.\n\n' +
    'Are you sure?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    const dataSheets = [
      SHEETS.IMPORT_HUB,
      SHEETS.LEADS_DATABASE,
      SHEETS.DEAL_ANALYZER,
      SHEETS.VERDICT,
      SHEETS.OFFERS_DISPOSITION,
      SHEETS.CRM_SYNC_LOG,
      SHEETS.SYSTEM_HEALTH
    ];

    dataSheets.forEach(sheetName => clearSheetData(sheetName));

    logSuccess('Setup', 'All data cleared');
    showToast('All data has been cleared');
  } catch (e) {
    logError('Setup', e, 'Clear data failed');
  }
}

// =============================================================================
// API KEY MANAGEMENT
// =============================================================================

/**
 * Saves API keys to script properties
 * @param {Object} keys - Object with API key values
 */
function saveApiKeys(keys) {
  try {
    if (keys.openai) setConfigProperty('OPENAI_API_KEY', keys.openai);
    if (keys.smsit) setConfigProperty('SMSIT_API_KEY', keys.smsit);
    if (keys.companyhub) setConfigProperty('COMPANYHUB_API_KEY', keys.companyhub);
    if (keys.onehash) setConfigProperty('ONEHASH_API_KEY', keys.onehash);
    if (keys.ohmylead) setConfigProperty('OHMYLEAD_WEBHOOK', keys.ohmylead);
    if (keys.signwell) setConfigProperty('SIGNWELL_API_KEY', keys.signwell);

    logSuccess('Setup', 'API keys saved successfully');
    return { success: true, message: 'API keys saved successfully' };
  } catch (e) {
    logError('Setup', e, 'Failed to save API keys');
    return { success: false, message: e.message };
  }
}

/**
 * Gets current API key status (masked)
 * @returns {Object} API key status
 */
function getApiKeyStatus() {
  const mask = (key) => {
    if (!key || key.length < 8) return '';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  return {
    openai: mask(getConfigProperty('OPENAI_API_KEY')),
    smsit: mask(getConfigProperty('SMSIT_API_KEY')),
    companyhub: mask(getConfigProperty('COMPANYHUB_API_KEY')),
    onehash: mask(getConfigProperty('ONEHASH_API_KEY')),
    ohmylead: mask(getConfigProperty('OHMYLEAD_WEBHOOK')),
    signwell: mask(getConfigProperty('SIGNWELL_API_KEY'))
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Quick setup - creates sheets without prompts
 * Useful for programmatic initialization
 */
function quickSetup() {
  try {
    createAllSheets();
    populateRepairEstimator();
    populateAutomationControl();
    applyAllFormatting();
    logSuccess('Setup', 'Quick setup completed');
    return { success: true };
  } catch (e) {
    logError('Setup', e, 'Quick setup failed');
    return { success: false, error: e.message };
  }
}

/**
 * Checks if initial setup has been completed
 * @returns {boolean} True if setup is complete
 */
function isSetupComplete() {
  const validation = validateSheets();
  return validation.valid;
}

/**
 * Gets setup status for UI
 * @returns {Object} Setup status
 */
function getSetupStatus() {
  const validation = runValidation();

  return {
    complete: validation.valid,
    sheetsReady: validation.sheets.valid,
    columnsReady: validation.columns.valid,
    apiReady: validation.apiKeys.valid,
    missingSheets: validation.sheets.missing,
    missingApiKeys: validation.apiKeys.missing,
    message: validation.valid ? 'System ready' : 'Setup required'
  };
}
