/**
 * Quantum Real Estate Analyzer v2.0
 * Apps Script Code Module
 */

// Initialize the application
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Quantum RE Analyzer')
    .addItem('Open Control Center', 'openControlCenter')
    .addSeparator()
    .addItem('Analyze Property', 'analyzeProperty')
    .addItem('Update Dashboard', 'updateDashboard')
    .addItem('Generate Report', 'generateReport')
    .addToUi();
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
