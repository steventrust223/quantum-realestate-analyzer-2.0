/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_setup.gs - Setup & Initialization
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles:
 * - onOpen menu creation
 * - Sheet creation and configuration
 * - Header application
 * - Formatting and styling
 * - Initial settings population
 */

// ═══════════════════════════════════════════════════════════════════════════
// MENU SETUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates the custom menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🏡 Quantum RE Analyzer')
    .addItem('🔧 Setup / Refresh Structure', 'RE_createOrUpdateSheets')
    .addSeparator()
    .addItem('🔄 Run Import → Master Sync', 'RE_runFullSync')
    .addItem('📊 Run Full Analysis (All Deals)', 'RE_runFullAnalysis')
    .addItem('🏅 Rebuild Verdict / Hot Deals', 'RE_rebuildVerdict')
    .addSeparator()
    .addSubMenu(ui.createMenu('🏢 CompanyHub CRM')
      .addItem('🔗 Test Connection', 'CH_testConnectionMenu')
      .addItem('📤 Sync HOT/SOLID Deals', 'CH_syncAllDealsToCompanyHub')
      .addItem('📋 View Sync Log', 'CH_openSyncLog'))
    .addSeparator()
    .addItem('🎛️ Control Center', 'RE_showControlCenter')
    .addItem('➕ Lead Intake', 'RE_showLeadIntake')
    .addItem('📂 Deal Review Panel', 'RE_showDealReview')
    .addSeparator()
    .addItem('⚙️ Settings', 'RE_showSettings')
    .addItem('📚 Help / Overview', 'RE_showHelp')
    .addToUi();

  RE_logInfo('onOpen', 'Quantum RE Analyzer menu loaded');
}

/**
 * Menu function to test CompanyHub connection
 */
function CH_testConnectionMenu() {
  const ui = SpreadsheetApp.getUi();
  const result = CH_testConnection();

  ui.alert(
    result.success ? '✅ Connection Successful' : '❌ Connection Failed',
    result.message,
    ui.ButtonSet.OK
  );
}

/**
 * Menu function to open SYNC_LOG sheet
 */
function CH_openSyncLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const syncLogSheet = ss.getSheetByName(SHEET_NAMES.SYNC_LOG);

  if (syncLogSheet) {
    syncLogSheet.activate();
  } else {
    SpreadsheetApp.getUi().alert('SYNC_LOG sheet not found. Run Setup first.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHEET CREATION & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main setup function - creates/updates all sheets
 */
function RE_createOrUpdateSheets() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    ui.alert('🏡 Quantum RE Analyzer Setup',
             'Setting up your workbook structure...\n\nThis may take a moment.',
             ui.ButtonSet.OK);

    RE_logInfo('RE_createOrUpdateSheets', 'Starting workbook setup');

    // Create all sheets
    RE_createLeadSheets();
    RE_createCoreSheets();
    RE_createMarketSheets();
    RE_createSupportSheets();
    RE_createSystemSheets();

    // Initialize settings
    RE_initializeSettings();

    // Apply tab colors
    RE_applyTabColors();

    RE_logSuccess('RE_createOrUpdateSheets', 'Workbook setup complete');

    ui.alert('✅ Setup Complete',
             'Your Quantum RE Analyzer is ready to use!\n\n' +
             'Next steps:\n' +
             '1. Add some leads to LEADS_DIRECT or LEADS_WEB\n' +
             '2. Click "Run Import → Master Sync"\n' +
             '3. Click "Run Full Analysis"\n' +
             '4. Open the Control Center to review deals',
             ui.ButtonSet.OK);

  } catch (error) {
    RE_logError('RE_createOrUpdateSheets', 'Setup failed', error.message);
    ui.alert('❌ Setup Error', `An error occurred: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Creates lead import sheets
 */
function RE_createLeadSheets() {
  RE_createSheet(SHEET_NAMES.LEADS_WEB, HEADERS.LEADS_WEB, COLORS.TAB_LEADS);
  RE_createSheet(SHEET_NAMES.LEADS_SCRAPED, HEADERS.LEADS_SCRAPED, COLORS.TAB_LEADS);
  RE_createSheet(SHEET_NAMES.LEADS_DIRECT, HEADERS.LEADS_DIRECT, COLORS.TAB_LEADS);

  RE_logInfo('RE_createLeadSheets', 'Lead sheets created/updated');
}

/**
 * Creates core analysis sheets
 */
function RE_createCoreSheets() {
  RE_createSheet(SHEET_NAMES.MASTER_PROPERTIES, HEADERS.MASTER_PROPERTIES, COLORS.TAB_CORE);
  RE_createSheet(SHEET_NAMES.MAO_ENGINE, HEADERS.MAO_ENGINE, COLORS.TAB_CORE);
  RE_createSheet(SHEET_NAMES.DEAL_CLASSIFIER, HEADERS.DEAL_CLASSIFIER, COLORS.TAB_CORE);
  RE_createSheet(SHEET_NAMES.EXIT_STRATEGY, HEADERS.EXIT_STRATEGY, COLORS.TAB_CORE);
  RE_createSheet(SHEET_NAMES.BUYER_MATCH, HEADERS.BUYER_MATCH, COLORS.TAB_CORE);

  RE_logInfo('RE_createCoreSheets', 'Core analysis sheets created/updated');
}

/**
 * Creates market & velocity sheets
 */
function RE_createMarketSheets() {
  RE_createSheet(SHEET_NAMES.MARKET_DATA, HEADERS.MARKET_DATA, COLORS.TAB_MARKET);
  RE_createSheet(SHEET_NAMES.SALES_VELOCITY, HEADERS.SALES_VELOCITY, COLORS.TAB_MARKET);
  RE_createSheet(SHEET_NAMES.MARKET_VOLUME_SCORE, HEADERS.MARKET_VOLUME_SCORE, COLORS.TAB_MARKET);

  RE_logInfo('RE_createMarketSheets', 'Market sheets created/updated');
}

/**
 * Creates supporting sheets
 */
function RE_createSupportSheets() {
  RE_createSheet(SHEET_NAMES.LEADS_TRACKER, HEADERS.LEADS_TRACKER, COLORS.TAB_SUPPORT);
  RE_createSheet(SHEET_NAMES.BUYERS_DB, HEADERS.BUYERS_DB, COLORS.TAB_SUPPORT);
  RE_createSheet(SHEET_NAMES.OFFERS_DISPO, HEADERS.OFFERS_DISPO, COLORS.TAB_SUPPORT);

  // Add some sample buyers if BUYERS_DB is empty
  RE_addSampleBuyers();

  RE_logInfo('RE_createSupportSheets', 'Support sheets created/updated');
}

/**
 * Creates system sheets
 */
function RE_createSystemSheets() {
  RE_createSheet(SHEET_NAMES.SETTINGS, HEADERS.SETTINGS, COLORS.TAB_SYSTEM);
  RE_createSheet(SHEET_NAMES.SYSTEM_LOG, HEADERS.SYSTEM_LOG, COLORS.TAB_SYSTEM);
  RE_createSheet(SHEET_NAMES.DASHBOARD_ANALYTICS, HEADERS.DASHBOARD_ANALYTICS, COLORS.TAB_SYSTEM);
  RE_createSheet(SHEET_NAMES.SYNC_LOG, HEADERS.SYNC_LOG, COLORS.TAB_SYSTEM);

  RE_logInfo('RE_createSystemSheets', 'System sheets created/updated');
}

/**
 * Creates or updates a single sheet
 *
 * @param {string} sheetName - Name of the sheet
 * @param {Array} headers - Array of column headers
 * @param {string} tabColor - Hex color for tab
 */
function RE_createSheet(sheetName, headers, tabColor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    // Create new sheet
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    RE_logInfo('RE_createSheet', `Created sheet: ${sheetName}`);
  } else {
    // Update headers if sheet exists
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Only update if headers have changed
    if (JSON.stringify(currentHeaders) !== JSON.stringify(headers)) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      RE_logInfo('RE_createSheet', `Updated headers for: ${sheetName}`);
    }
  }

  // Apply formatting
  RE_formatHeaders(sheet);
  RE_applyBanding(sheet);

  // Set tab color
  if (tabColor) {
    sheet.setTabColor(tabColor);
  }

  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Applies tab colors to all sheets
 */
function RE_applyTabColors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Lead sheets - Orange
  [SHEET_NAMES.LEADS_WEB, SHEET_NAMES.LEADS_SCRAPED, SHEET_NAMES.LEADS_DIRECT].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.setTabColor(COLORS.TAB_LEADS);
  });

  // Core sheets - Blue
  [SHEET_NAMES.MASTER_PROPERTIES, SHEET_NAMES.MAO_ENGINE, SHEET_NAMES.DEAL_CLASSIFIER,
   SHEET_NAMES.EXIT_STRATEGY, SHEET_NAMES.BUYER_MATCH].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.setTabColor(COLORS.TAB_CORE);
  });

  // Market sheets - Green
  [SHEET_NAMES.MARKET_DATA, SHEET_NAMES.SALES_VELOCITY, SHEET_NAMES.MARKET_VOLUME_SCORE].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.setTabColor(COLORS.TAB_MARKET);
  });

  // Support sheets - Purple
  [SHEET_NAMES.LEADS_TRACKER, SHEET_NAMES.BUYERS_DB, SHEET_NAMES.OFFERS_DISPO].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.setTabColor(COLORS.TAB_SUPPORT);
  });

  // System sheets - Blue Grey
  [SHEET_NAMES.SETTINGS, SHEET_NAMES.SYSTEM_LOG, SHEET_NAMES.DASHBOARD_ANALYTICS].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.setTabColor(COLORS.TAB_SYSTEM);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initializes all default settings
 */
function RE_initializeSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

  if (!settingsSheet) {
    RE_logError('RE_initializeSettings', 'Settings sheet not found');
    return;
  }

  // Check if settings already exist
  const lastRow = settingsSheet.getLastRow();
  if (lastRow > 1) {
    // Settings already exist, don't overwrite
    RE_logInfo('RE_initializeSettings', 'Settings already exist, skipping initialization');
    return;
  }

  // Add all default settings
  const rows = [];
  for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
    rows.push([
      key,
      config.value,
      config.description,
      config.category,
      new Date()
    ]);
  }

  if (rows.length > 0) {
    settingsSheet.getRange(2, 1, rows.length, 5).setValues(rows);
    RE_logSuccess('RE_initializeSettings', `Initialized ${rows.length} settings`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adds sample buyers to BUYERS_DB if empty
 */
function RE_addSampleBuyers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyersSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DB);

  if (!buyersSheet) return;

  // Check if buyers already exist
  if (buyersSheet.getLastRow() > 1) {
    return; // Don't add samples if data exists
  }

  const sampleBuyers = [
    [
      RE_generateBuyerId(),
      'John Smith',
      'Smith Investments LLC',
      '(555) 123-4567',
      'john@smithinvestments.com',
      '90001, 90002, 90003',
      'Los Angeles',
      100000,
      300000,
      'Wholesale, Sub2',
      'SFR, Condo',
      'Light',
      'Looking for quick flips in LA',
      'Active',
      '',
      0,
      'A',
      'High-volume buyer, very responsive',
      new Date(),
      new Date()
    ],
    [
      RE_generateBuyerId(),
      'Sarah Johnson',
      'Capital Realty Group',
      '(555) 234-5678',
      'sarah@capitalrealty.com',
      '75001, 75002, 75201',
      'Dallas',
      150000,
      500000,
      'STR, MTR',
      'SFR, Townhouse',
      'Full',
      'Prefers turnkey or light rehab for STR',
      'Active',
      '',
      0,
      'A',
      'Strong airbnb investor',
      new Date(),
      new Date()
    ],
    [
      RE_generateBuyerId(),
      'Mike Rodriguez',
      'RodCo Properties',
      '(555) 345-6789',
      'mike@rodcoproperties.com',
      '33101, 33102, 33125',
      'Miami',
      200000,
      750000,
      'LTR, Wholesale',
      'SFR, Multi-family',
      'Full',
      'Buy and hold investor, also wholesales',
      'Active',
      '',
      0,
      'B',
      'Slower to close but reliable',
      new Date(),
      new Date()
    ]
  ];

  buyersSheet.getRange(2, 1, sampleBuyers.length, sampleBuyers[0].length).setValues(sampleBuyers);
  RE_logInfo('RE_addSampleBuyers', `Added ${sampleBuyers.length} sample buyers`);
}

/**
 * Adds sample market data (for testing/demo purposes)
 */
function RE_addSampleMarketData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const marketSheet = ss.getSheetByName(SHEET_NAMES.MARKET_DATA);

  if (!marketSheet) return;

  // Check if data already exists
  if (marketSheet.getLastRow() > 1) {
    return;
  }

  const sampleMarkets = [
    ['90001', 'Los Angeles', 'Los Angeles', 'Urban', 45, 52, 35, 250000, 450000, 650000, 'Up', 'Hot', new Date()],
    ['75001', 'Dallas', 'Dallas', 'Urban', 38, 42, 42, 200000, 350000, 550000, 'Up', 'Hot', new Date()],
    ['33101', 'Miami', 'Miami-Dade', 'Urban', 55, 62, 28, 300000, 475000, 725000, 'Stable', 'Warm', new Date()],
    ['60601', 'Chicago', 'Cook', 'Urban', 65, 72, 22, 180000, 325000, 525000, 'Down', 'Cool', new Date()],
    ['85001', 'Phoenix', 'Maricopa', 'Urban', 40, 48, 38, 220000, 380000, 580000, 'Up', 'Hot', new Date()]
  ];

  marketSheet.getRange(2, 1, sampleMarkets.length, sampleMarkets[0].length).setValues(sampleMarkets);
  RE_logInfo('RE_addSampleMarketData', `Added ${sampleMarkets.length} sample markets`);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK SETUP FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick setup with sample data for testing
 * This is useful for demo/testing purposes
 */
function RE_quickSetupWithSamples() {
  RE_createOrUpdateSheets();

  // Add sample market data
  RE_addSampleMarketData();

  // Add a sample lead
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadsDirectSheet = ss.getSheetByName(SHEET_NAMES.LEADS_DIRECT);

  if (leadsDirectSheet && leadsDirectSheet.getLastRow() === 1) {
    const sampleLead = [
      RE_generateLeadId(),
      new Date(),
      'Manual Entry',
      'Bob Williams',
      '(555) 111-2222',
      'bob@example.com',
      '123 Main Street',
      'Los Angeles',
      'CA',
      '90001',
      'Los Angeles',
      'SFR',
      3,
      2,
      1500,
      1985,
      275000,
      'High',
      'Vacant',
      'Inherited property, wants quick sale',
      '',
      ''
    ];

    leadsDirectSheet.appendRow(sampleLead);
    RE_logInfo('RE_quickSetupWithSamples', 'Added sample lead');
  }

  SpreadsheetApp.getUi().alert('✅ Quick Setup Complete',
    'Sample data added!\n\n' +
    'Try running "Import → Master Sync" and "Full Analysis" next.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
