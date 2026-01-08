/**
 * Quantum Real Estate Analyzer v2.0
 * Apps Script Code Module
 */

// Initialize the application
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Quantum RE Analyzer')
    .addItem('🚀 Initialize System', 'initializeSystem')
    .addSeparator()
    .addItem('Open Control Center', 'openControlCenter')
    .addSeparator()
    .addItem('Analyze Property', 'analyzeProperty')
    .addItem('Update Dashboard', 'updateDashboard')
    .addItem('Generate Report', 'generateReport')
    .addToUi();
}

/**
 * Initialize the Quantum Real Estate Analyzer System
 * Creates all required sheets and sets up the structure
 */
function initializeSystem() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Initialize Quantum Real Estate Analyzer',
    'This will create all required sheets and set up the system. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // Create Dashboard sheet
    createDashboardSheet(ss);

    // Create Deals sheet
    createDealsSheet(ss);

    // Create Properties sheet
    createPropertiesSheet(ss);

    // Create Buyers sheet
    createBuyersSheet(ss);

    // Create Sellers sheet
    createSellersSheet(ss);

    // Create Financial sheet
    createFinancialSheet(ss);

    ui.alert('Success!', 'System initialized successfully! All sheets have been created.', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('Error', 'Failed to initialize system: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Create Dashboard sheet
 */
function createDashboardSheet(ss) {
  let sheet = ss.getSheetByName('Dashboard');

  if (!sheet) {
    sheet = ss.insertSheet('Dashboard');
  } else {
    sheet.clear();
  }

  // Set up headers and structure
  sheet.getRange('A1').setValue('🏡 Quantum Real Estate Analyzer - Dashboard').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Last Updated: ' + new Date().toLocaleString());

  // Metrics section
  sheet.getRange('A4').setValue('📊 Key Metrics').setFontSize(14).setFontWeight('bold');

  const metrics = [
    ['Metric', 'Value', 'Status'],
    ['Active Deals', '0', 'Starting'],
    ['Wholesaling Deals', '0', '-'],
    ['Sub2 Deals', '0', '-'],
    ['Pending Deals', '0', '-'],
    ['Total Revenue', '$0', '-'],
    ['Properties Analyzed', '0', '-'],
    ['Active Buyers', '0', '-']
  ];

  sheet.getRange(5, 1, metrics.length, metrics[0].length).setValues(metrics);
  sheet.getRange(5, 1, 1, metrics[0].length).setFontWeight('bold').setBackground('#667eea').setFontColor('white');

  // Format columns
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);

  return sheet;
}

/**
 * Create Deals sheet
 */
function createDealsSheet(ss) {
  let sheet = ss.getSheetByName('Deals');

  if (!sheet) {
    sheet = ss.insertSheet('Deals');
  } else {
    sheet.clear();
  }

  const headers = [
    'Deal ID',
    'Status',
    'Deal Type',
    'Property Address',
    'Seller Name',
    'Revenue/Profit',
    'Contract Date',
    'Closing Date',
    'Buyer Assigned',
    'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#667eea').setFontColor('white');

  // Set column widths
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 250);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 150);
  sheet.setColumnWidth(10, 300);

  return sheet;
}

/**
 * Create Properties sheet
 */
function createPropertiesSheet(ss) {
  let sheet = ss.getSheetByName('Properties');

  if (!sheet) {
    sheet = ss.insertSheet('Properties');
  } else {
    sheet.clear();
  }

  const headers = [
    'Property ID',
    'Address',
    'City',
    'State',
    'Zip',
    'ARV',
    'Repair Estimate',
    'Offer Price',
    'Analysis Date',
    'Status',
    'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#667eea').setFontColor('white');

  // Set column widths
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 140);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 120);
  sheet.setColumnWidth(10, 100);
  sheet.setColumnWidth(11, 300);

  return sheet;
}

/**
 * Create Buyers sheet
 */
function createBuyersSheet(ss) {
  let sheet = ss.getSheetByName('Buyers');

  if (!sheet) {
    sheet = ss.insertSheet('Buyers');
  } else {
    sheet.clear();
  }

  const headers = [
    'Buyer ID',
    'Name',
    'Email',
    'Phone',
    'Preferred Areas',
    'Budget Range',
    'Property Type',
    'Status',
    'Deals Closed',
    'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#667eea').setFontColor('white');

  // Set column widths
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 100);
  sheet.setColumnWidth(9, 100);
  sheet.setColumnWidth(10, 300);

  return sheet;
}

/**
 * Create Sellers sheet
 */
function createSellersSheet(ss) {
  let sheet = ss.getSheetByName('Sellers');

  if (!sheet) {
    sheet = ss.insertSheet('Sellers');
  } else {
    sheet.clear();
  }

  const headers = [
    'Seller ID',
    'Name',
    'Email',
    'Phone',
    'Property Address',
    'Motivation',
    'Lead Source',
    'Contact Date',
    'Status',
    'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#667eea').setFontColor('white');

  // Set column widths
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 250);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 100);
  sheet.setColumnWidth(10, 300);

  return sheet;
}

/**
 * Create Financial sheet
 */
function createFinancialSheet(ss) {
  let sheet = ss.getSheetByName('Financial');

  if (!sheet) {
    sheet = ss.insertSheet('Financial');
  } else {
    sheet.clear();
  }

  const headers = [
    'Transaction ID',
    'Date',
    'Deal ID',
    'Type',
    'Category',
    'Amount',
    'Description',
    'Status',
    'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#667eea').setFontColor('white');

  // Set column widths
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 250);
  sheet.setColumnWidth(8, 100);
  sheet.setColumnWidth(9, 300);

  return sheet;
}

// Open the control center HTML
function openControlCenter() {
  const html = HtmlService.createHtmlOutputFromFile('control-center')
    .setWidth(1200)
    .setHeight(800)
    .setTitle('Quantum Real Estate Analyzer - Control Center');
  SpreadsheetApp.getUi().showModalDialog(html, 'Control Center');
}

// Update dashboard metrics
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName('Dashboard');

  if (!dashboardSheet) {
    SpreadsheetApp.getUi().alert('Dashboard sheet not found!');
    return;
  }

  // Update timestamp
  const timestamp = new Date();
  dashboardSheet.getRange('A1').setValue('Last Updated: ' + timestamp.toLocaleString());

  // Calculate metrics
  const dealsSheet = ss.getSheetByName('Deals');
  if (dealsSheet) {
    const dealsData = dealsSheet.getDataRange().getValues();
    const activeDeals = dealsData.filter(row => row[1] === 'Active').length;
    dashboardSheet.getRange('B2').setValue(activeDeals);
  }

  SpreadsheetApp.getUi().alert('Dashboard updated successfully!');
}

// Analyze property function
function analyzeProperty() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Enter property address:');

  if (response.getSelectedButton() === ui.Button.OK) {
    const address = response.getResponseText();
    ui.alert('Analyzing property: ' + address);
    // Add your property analysis logic here
  }
}

// Generate report function
function generateReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  ui.alert('Report generation in progress...');
  // Add your report generation logic here
}

// Helper function to get data from sheet
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return null;
  }

  return sheet.getDataRange().getValues();
}

// Helper function to calculate deal metrics
function calculateDealMetrics() {
  const dealsData = getSheetData('Deals');

  if (!dealsData) {
    return {
      active: 0,
      wholesaling: 0,
      sub2: 0,
      pending: 0
    };
  }

  const metrics = {
    active: 0,
    wholesaling: 0,
    sub2: 0,
    pending: 0
  };

  // Skip header row
  for (let i = 1; i < dealsData.length; i++) {
    const row = dealsData[i];
    const status = row[1]; // Assuming status is in column B
    const dealType = row[2]; // Assuming deal type is in column C

    if (status === 'Active') {
      metrics.active++;
      if (dealType === 'Wholesaling') {
        metrics.wholesaling++;
      } else if (dealType === 'Sub2') {
        metrics.sub2++;
      }
    } else if (status === 'Pending') {
      metrics.pending++;
    }
  }

  return metrics;
}

// Calculate total revenue
function calculateRevenue() {
  const dealsData = getSheetData('Deals');

  if (!dealsData) {
    return 0;
  }

  let totalRevenue = 0;

  // Skip header row
  for (let i = 1; i < dealsData.length; i++) {
    const row = dealsData[i];
    const revenue = parseFloat(row[5]) || 0; // Assuming revenue is in column F
    totalRevenue += revenue;
  }

  return totalRevenue;
}
