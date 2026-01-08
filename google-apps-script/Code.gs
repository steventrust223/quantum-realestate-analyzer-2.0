/**
 * Quantum Real Estate Analyzer v2.0 - Google Sheets Integration
 * Main Code File
 *
 * This is the main entry point for the Google Apps Script
 */

/**
 * Creates custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏡 Quantum RE Analyzer')
    .addItem('🏢 Open CompanyHub', 'openCompanyHub')
    .addSeparator()
    .addItem('🔍 Analyze Property', 'analyzeProperty')
    .addItem('📊 View Dashboard', 'viewDashboard')
    .addSeparator()
    .addSubMenu(ui.createMenu('Deal Management')
      .addItem('Add New Deal', 'addNewDeal')
      .addItem('Update Deal Status', 'updateDealStatus')
      .addItem('View Active Deals', 'viewActiveDeals'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Buyer Matching')
      .addItem('🎯 Match Property to Buyers', 'matchPropertyPrompt')
      .addItem('Bulk Match Active Deals', 'bulkMatchActiveDeals')
      .addItem('View Match History', 'viewMatchHistory'))
    .addSeparator()
    .addSubMenu(ui.createMenu('CRM')
      .addItem('Add Seller', 'addSeller')
      .addItem('Add Buyer', 'addBuyer')
      .addItem('View Contacts', 'viewContacts'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Reports')
      .addItem('Generate Monthly Report', 'generateMonthlyReport')
      .addItem('Financial Summary', 'financialSummary')
      .addItem('Pipeline Analysis', 'pipelineAnalysis'))
    .addSeparator()
    .addItem('⚙️ Settings', 'openSettings')
    .addItem('📚 Help & Documentation', 'showHelp')
    .addToUi();
}

/**
 * Initialize spreadsheet with required sheets
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create required sheets if they don't exist
  const requiredSheets = [
    'Dashboard',
    'Active Deals',
    'Wholesaling Pipeline',
    'Sub2 Pipeline',
    'Sellers',
    'Buyers',
    'Properties',
    'Financial Tracking',
    'Team Members',
    'Documents',
    'Settings'
  ];

  requiredSheets.forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      const sheet = ss.insertSheet(sheetName);
      setupSheetHeaders(sheet, sheetName);
    }
  });

  SpreadsheetApp.getUi().alert('Initialization Complete',
    'All required sheets have been created successfully!',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Main property analysis function
 */
function analyzeProperty() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Property Analysis',
    'Enter property address:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const address = response.getResponseText();

    if (!address) {
      ui.alert('Error', 'Please enter a valid address.', ui.ButtonSet.OK);
      return;
    }

    // Show loading message
    ui.alert('Analyzing Property',
      'Running quantum analysis on: ' + address,
      ui.ButtonSet.OK);

    // Perform analysis
    const analysisResult = performPropertyAnalysis(address);

    // Save to Properties sheet
    savePropertyAnalysis(analysisResult);

    // Show results
    showAnalysisResults(analysisResult);

    // Offer buyer matching
    const matchResponse = ui.alert('Buyer Matching',
      'Would you like to find matching buyers for this property?',
      ui.ButtonSet.YES_NO);

    if (matchResponse == ui.Button.YES) {
      matchPropertyToBuyers(analysisResult);
    }
  }
}

/**
 * Perform property analysis calculations
 */
function performPropertyAnalysis(address) {
  // This would integrate with real estate APIs
  // For now, return a sample structure

  return {
    address: address,
    timestamp: new Date(),
    estimatedValue: 250000,
    repairCosts: 35000,
    arv: 320000,
    maxOffer: 208000,
    profitPotential: 42000,
    dealScore: 8.5,
    marketTrend: 'Hot',
    daysOnMarket: 12,
    neighborhood: 'Excellent',
    recommended: true
  };
}

/**
 * Add new deal to pipeline
 */
function addNewDeal() {
  showDealEntryForm();
}

/**
 * Update dashboard metrics
 */
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName('Dashboard');

  if (!dashboardSheet) {
    SpreadsheetApp.getUi().alert('Error',
      'Dashboard sheet not found. Please initialize the spreadsheet first.',
      SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Calculate metrics
  const metrics = calculateDashboardMetrics();

  // Update dashboard
  updateDashboardDisplay(dashboardSheet, metrics);

  SpreadsheetApp.getUi().alert('Dashboard Updated',
    'All metrics have been refreshed successfully!',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Calculate dashboard metrics
 */
function calculateDashboardMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeDealsSheet = ss.getSheetByName('Active Deals');
  const financialSheet = ss.getSheetByName('Financial Tracking');

  // Get data
  const activeDeals = activeDealsSheet ? activeDealsSheet.getDataRange().getValues() : [];
  const financialData = financialSheet ? financialSheet.getDataRange().getValues() : [];

  // Calculate metrics
  return {
    totalActiveDeals: Math.max(0, activeDeals.length - 1), // Exclude header
    wholesalingDeals: countDealsByType('Wholesaling'),
    sub2Deals: countDealsByType('Sub2'),
    totalRevenue: calculateTotalRevenue(financialData),
    propertiesAnalyzed: getPropertiesAnalyzedCount(),
    activeBuyers: getActiveBuyersCount(),
    lastUpdated: new Date()
  };
}
