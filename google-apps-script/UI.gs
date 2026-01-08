/**
 * UI Functions for Quantum Real Estate Analyzer
 * Handles all user interface elements, dialogs, and forms
 */

/**
 * Open CompanyHub interface
 */
function openCompanyHub() {
  const htmlOutput = HtmlService.createHtmlOutputFromFile('CompanyHub')
    .setWidth(800)
    .setHeight(600)
    .setTitle('🏢 CompanyHub');

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'CompanyHub');
}

/**
 * View dashboard in dialog
 */
function viewDashboard() {
  const htmlOutput = HtmlService.createHtmlOutputFromFile('Dashboard')
    .setWidth(1000)
    .setHeight(700)
    .setTitle('📊 Dashboard');

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Dashboard');
}

/**
 * Show deal entry form
 */
function showDealEntryForm() {
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutputFromFile('DealEntryForm')
    .setWidth(600)
    .setHeight(500)
    .setTitle('Add New Deal');

  ui.showModalDialog(html, 'New Deal Entry');
}

/**
 * Show property analysis results
 */
function showAnalysisResults(analysisResult) {
  const ui = SpreadsheetApp.getUi();

  const message = `
Property Analysis Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Address: ${analysisResult.address}

💰 Financial Analysis:
   • Estimated Value: $${formatNumber(analysisResult.estimatedValue)}
   • Repair Costs: $${formatNumber(analysisResult.repairCosts)}
   • ARV: $${formatNumber(analysisResult.arv)}
   • Max Offer: $${formatNumber(analysisResult.maxOffer)}
   • Profit Potential: $${formatNumber(analysisResult.profitPotential)}

📊 Deal Score: ${analysisResult.dealScore}/10

🔥 Market Status: ${analysisResult.marketTrend}
📅 Days on Market: ${analysisResult.daysOnMarket}
🏘️ Neighborhood: ${analysisResult.neighborhood}

✅ Recommendation: ${analysisResult.recommended ? 'PURSUE THIS DEAL' : 'PASS'}
  `;

  ui.alert('Property Analysis Complete', message, ui.ButtonSet.OK);
}

/**
 * Show seller entry form
 */
function addSeller() {
  const html = HtmlService.createHtmlOutputFromFile('SellerForm')
    .setWidth(500)
    .setHeight(600)
    .setTitle('Add Seller');

  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Seller');
}

/**
 * Show buyer entry form
 */
function addBuyer() {
  const html = HtmlService.createHtmlOutputFromFile('BuyerForm')
    .setWidth(500)
    .setHeight(600)
    .setTitle('Add Buyer');

  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Buyer');
}

/**
 * View all contacts
 */
function viewContacts() {
  const html = HtmlService.createHtmlOutputFromFile('ContactsList')
    .setWidth(900)
    .setHeight(600)
    .setTitle('Contacts Directory');

  SpreadsheetApp.getUi().showModalDialog(html, 'CRM - Contacts');
}

/**
 * View active deals
 */
function viewActiveDeals() {
  const html = HtmlService.createHtmlOutputFromFile('ActiveDealsList')
    .setWidth(1000)
    .setHeight(700)
    .setTitle('Active Deals');

  SpreadsheetApp.getUi().showModalDialog(html, 'Active Deals Pipeline');
}

/**
 * Open settings dialog
 */
function openSettings() {
  const html = HtmlService.createHtmlOutputFromFile('Settings')
    .setWidth(600)
    .setHeight(500)
    .setTitle('⚙️ Settings');

  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}

/**
 * Show help documentation
 */
function showHelp() {
  const ui = SpreadsheetApp.getUi();

  const helpMessage = `
🏡 Quantum Real Estate Analyzer v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUICK START GUIDE:

1️⃣ INITIALIZATION
   • First time? Run: Extensions > Apps Script > Run > initializeSpreadsheet()
   • This creates all required sheets

2️⃣ ANALYZE PROPERTIES
   • Menu: Quantum RE Analyzer > Analyze Property
   • Enter property address
   • Review analysis results

3️⃣ MANAGE DEALS
   • Add deals: Deal Management > Add New Deal
   • Track progress in Wholesaling/Sub2 Pipeline sheets

4️⃣ CRM FEATURES
   • Add sellers and buyers via CRM menu
   • All contacts stored in dedicated sheets

5️⃣ REPORTS
   • Generate reports via Reports menu
   • View financial summaries and analytics

📚 DOCUMENTATION:
   • Full guide: github.com/your-repo/docs
   • Video tutorials: Available in repository
   • Support: Contact your team admin

⚡ TIPS:
   • Keep data updated daily
   • Use Dashboard for quick overview
   • Export reports regularly
  `;

  ui.alert('Help & Documentation', helpMessage, ui.ButtonSet.OK);
}

/**
 * Show loading message
 */
function showLoading(message) {
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutput(
    `<div style="text-align:center; padding:20px;">
      <p>${message}</p>
      <p>Please wait...</p>
    </div>`
  )
  .setWidth(300)
  .setHeight(100);

  ui.showModelessDialog(html, 'Processing');
}

/**
 * Show success message
 */
function showSuccess(title, message) {
  SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Show error message
 */
function showError(title, message) {
  SpreadsheetApp.getUi().alert('❌ ' + title, message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Confirm action dialog
 */
function confirmAction(title, message) {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(title, message, ui.ButtonSet.YES_NO);
  return response == ui.Button.YES;
}
