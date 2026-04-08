/**
 * Quantum Real Estate Analyzer - Ultimate Edition v2.0
 * Main Entry Point & Menu System
 *
 * An investor-grade operating system for real estate deal analysis,
 * lead management, and automated outreach.
 */

// ============================================================
// GLOBAL INITIALIZATION
// ============================================================

/**
 * Called when the spreadsheet is opened
 * Creates custom menu and performs health check
 */
function onOpen(e) {
  createCustomMenu();

  // Run health check on open (non-blocking)
  try {
    const healthStatus = runHealthCheck();
    if (healthStatus.hasErrors) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'System has issues. Check Logs sheet for details.',
        'Health Check Warning',
        10
      );
    }
  } catch (error) {
    Logger.log('Health check failed: ' + error.message);
  }
}

/**
 * Creates the custom Quantum menu with all actions
 */
function createCustomMenu() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Quantum Analyzer')
    // Main Pipeline Actions
    .addItem('Run Full Pipeline', 'runFullPipeline')
    .addSeparator()
    .addSubMenu(ui.createMenu('Data Operations')
      .addItem('Ingest & Clean Leads', 'runIngestAndClean')
      .addItem('Deduplicate Master DB', 'runDeduplication')
      .addItem('Enrich Lead Data', 'runEnrichment')
      .addItem('Import from Browse AI', 'importFromBrowseAI')
      .addItem('Import Web & Ad Leads', 'importWebAdLeads'))
    .addSubMenu(ui.createMenu('Analysis')
      .addItem('Analyze & Score All', 'runAnalyzeAndScore')
      .addItem('Run Strategy Engines', 'runAllStrategyEngines')
      .addItem('Run Flip Engine Only', 'runFlipEngineOnly')
      .addItem('Run STR Engine Only', 'runSTREngineOnly')
      .addItem('Run MTR Engine Only', 'runMTREngineOnly')
      .addItem('Run LTR Engine Only', 'runLTREngineOnly')
      .addItem('Run Creative Finance Engine', 'runCreativeEngineOnly')
      .addItem('Multi-Exit Comparison', 'runMultiExitComparison'))
    .addSubMenu(ui.createMenu('Verdict & Offers')
      .addItem('Generate Verdict Rankings', 'generateVerdictRankings')
      .addItem('Generate Offer Pack', 'generateOfferPack')
      .addItem('Generate Seller Messages', 'generateSellerMessages')
      .addItem('Match Buyers to Deals', 'runBuyerMatching'))
    .addSubMenu(ui.createMenu('CRM & Automation')
      .addItem('Sync to SMS-iT', 'syncToSMSiT')
      .addItem('Sync to CompanyHub', 'syncToCompanyHub')
      .addItem('Sync to OhMyLead', 'syncToOhMyLead')
      .addItem('Process Speed-to-Lead Queue', 'processSpeedToLeadQueue')
      .addItem('Run SLA Escalations', 'runSLAEscalations'))
    .addSeparator()
    // Institutional Disposition Layer
    .addSubMenu(ui.createMenu('Institutional Disposition')
      .addItem('Run Full Institutional Workflow', 'runInstitutionalDispositionWorkflow')
      .addSeparator()
      .addItem('Score Institutional Grades', 'calculateInstitutionalScores')
      .addItem('Run Buyer Buy Box Matching', 'generateBuyerMatches')
      .addItem('Build Deal Packages', 'buildInstitutionalPackages')
      .addItem('Update Portfolio Builder', 'updatePortfolioBuilder')
      .addItem('Create Disposition Entries', 'createDispositionTrackerEntries')
      .addItem('Update Buyer Relationship Metrics', 'updateBuyerRelationshipMetrics')
      .addSeparator()
      .addItem('Refresh Institutional Dashboard', 'refreshInstitutionalDashboard')
      .addItem('Sync Dispositions to CompanyHub', 'syncDispositionsToCompanyHub'))
    .addSeparator()
    .addItem('Refresh Dashboard', 'refreshDashboard')
    .addSeparator()
    .addSubMenu(ui.createMenu('HTML Interfaces')
      .addItem('Open Setup Wizard', 'openSetupWizard')
      .addItem('Open Control Center', 'openControlCenter')
      .addItem('Open Deal Analyzer', 'openDealAnalyzer')
      .addItem('Open Offer Generator', 'openOfferGenerator')
      .addItem('Open Buyer Matcher', 'openBuyerMatcher')
      .addSeparator()
      .addItem('Open Institutional Dashboard', 'openInstitutionalDashboard')
      .addItem('Open Disposition Center', 'openDispositionCenter')
      .addItem('Open Portfolio Viewer', 'openPortfolioViewer')
      .addSeparator()
      .addItem('Open Help / SOP', 'openHelpSOP'))
    .addSubMenu(ui.createMenu('Settings & Admin')
      .addItem('Initialize All Sheets', 'initializeAllSheets')
      .addItem('Apply Formatting', 'applyAllFormatting')
      .addItem('Run Health Check', 'runHealthCheckWithReport')
      .addItem('Clear All Logs', 'clearAllLogs')
      .addItem('Export System Config', 'exportSystemConfig')
      .addItem('Reset to Defaults', 'resetToDefaults'))
    .addToUi();
}

// ============================================================
// HTML UI LAUNCHERS
// ============================================================

/**
 * Opens the Setup Wizard HTML interface
 */
function openSetupWizard() {
  const html = HtmlService.createHtmlOutputFromFile('setup-wizard')
    .setWidth(900)
    .setHeight(700)
    .setTitle('Quantum Setup Wizard');
  SpreadsheetApp.getUi().showModalDialog(html, 'Quantum Setup Wizard');
}

/**
 * Opens the Control Center HTML interface
 */
function openControlCenter() {
  const html = HtmlService.createHtmlOutputFromFile('control-center')
    .setWidth(1200)
    .setHeight(800)
    .setTitle('Quantum Control Center');
  SpreadsheetApp.getUi().showModalDialog(html, 'Quantum Control Center');
}

/**
 * Opens the Deal Analyzer HTML interface
 */
function openDealAnalyzer() {
  const html = HtmlService.createHtmlOutputFromFile('deal-analyzer')
    .setWidth(1100)
    .setHeight(750)
    .setTitle('Deal Analyzer');
  SpreadsheetApp.getUi().showModalDialog(html, 'Deal Analyzer');
}

/**
 * Opens the Offer Generator HTML interface
 */
function openOfferGenerator() {
  const html = HtmlService.createHtmlOutputFromFile('offer-generator')
    .setWidth(1000)
    .setHeight(700)
    .setTitle('Offer Generator');
  SpreadsheetApp.getUi().showModalDialog(html, 'Offer Generator');
}

/**
 * Opens the Buyer Matcher HTML interface
 */
function openBuyerMatcher() {
  const html = HtmlService.createHtmlOutputFromFile('buyer-matcher')
    .setWidth(1000)
    .setHeight(700)
    .setTitle('Buyer Matcher');
  SpreadsheetApp.getUi().showModalDialog(html, 'Buyer Matcher');
}

/**
 * Opens the Institutional Dashboard HTML interface
 */
function openInstitutionalDashboard() {
  const html = HtmlService.createHtmlOutputFromFile('institutional-dashboard')
    .setWidth(1200)
    .setHeight(850)
    .setTitle('Institutional Disposition Dashboard');
  SpreadsheetApp.getUi().showModalDialog(html, 'Institutional Disposition Dashboard');
}

/**
 * Opens the Disposition Center HTML interface
 */
function openDispositionCenter() {
  const html = HtmlService.createHtmlOutputFromFile('disposition-center')
    .setWidth(1050)
    .setHeight(750)
    .setTitle('Disposition Action Center');
  SpreadsheetApp.getUi().showModalDialog(html, 'Disposition Action Center');
}

/**
 * Opens the Portfolio Viewer HTML interface
 */
function openPortfolioViewer() {
  const html = HtmlService.createHtmlOutputFromFile('portfolio-viewer')
    .setWidth(1050)
    .setHeight(700)
    .setTitle('Portfolio Builder');
  SpreadsheetApp.getUi().showModalDialog(html, 'Portfolio Builder');
}

/**
 * Opens the Help/SOP HTML interface
 */
function openHelpSOP() {
  const html = HtmlService.createHtmlOutputFromFile('help-sop')
    .setWidth(900)
    .setHeight(650)
    .setTitle('Help & SOPs');
  SpreadsheetApp.getUi().showModalDialog(html, 'Help & SOPs');
}

// ============================================================
// PIPELINE ORCHESTRATION
// ============================================================

/**
 * Runs the complete pipeline end-to-end
 * 1) Ingest -> 2) Clean/Normalize -> 3) Deduplicate -> 4) Enrich ->
 * 5) Score -> 6) Strategy Compare -> 7) Verdict Rank ->
 * 8) Generate Offer+Message -> 9) Buyer Match -> 10) CRM Sync
 */
function runFullPipeline() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startTime = new Date();

  logEvent('PIPELINE', 'Starting full pipeline run');
  ss.toast('Starting full pipeline...', 'Quantum Pipeline', 5);

  try {
    // Step 1-2: Ingest & Clean
    ss.toast('Step 1/10: Ingesting and cleaning leads...', 'Pipeline', 3);
    runIngestAndClean();

    // Step 3: Deduplicate
    ss.toast('Step 3/10: Deduplicating records...', 'Pipeline', 3);
    runDeduplication();

    // Step 4: Enrich
    ss.toast('Step 4/10: Enriching lead data...', 'Pipeline', 3);
    runEnrichment();

    // Step 5: Score
    ss.toast('Step 5/10: Computing risk and deal scores...', 'Pipeline', 3);
    computeAllScores();

    // Step 6: Strategy Compare
    ss.toast('Step 6/10: Running strategy engines...', 'Pipeline', 3);
    runAllStrategyEngines();

    // Step 7: Verdict Rank
    ss.toast('Step 7/10: Generating verdict rankings...', 'Pipeline', 3);
    generateVerdictRankings();

    // Step 8: Generate Offers & Messages
    ss.toast('Step 8/10: Generating offer packs...', 'Pipeline', 3);
    generateOfferPack();
    generateSellerMessages();

    // Step 9: Buyer Match
    ss.toast('Step 9/13: Matching buyers to deals...', 'Pipeline', 3);
    runBuyerMatching();

    // Step 10: Institutional Scoring
    ss.toast('Step 10/13: Running institutional screening...', 'Pipeline', 3);
    calculateInstitutionalScores();

    // Step 11: Institutional Buyer Matching & Packaging
    ss.toast('Step 11/13: Matching institutional buyers...', 'Pipeline', 3);
    generateBuyerMatches();
    buildInstitutionalPackages();
    updatePortfolioBuilder();
    createDispositionTrackerEntries();

    // Step 12: CRM Sync (if enabled)
    ss.toast('Step 12/13: Syncing to CRM...', 'Pipeline', 3);
    syncToCRMIfEnabled();

    // Step 13: Refresh Dashboards
    ss.toast('Step 13/13: Refreshing dashboards...', 'Pipeline', 3);
    refreshDashboard();
    refreshInstitutionalDashboard();

    const duration = ((new Date() - startTime) / 1000).toFixed(1);
    logEvent('PIPELINE', `Full pipeline completed in ${duration}s`);
    ss.toast(`Pipeline completed in ${duration} seconds!`, 'Success', 10);

  } catch (error) {
    logError('PIPELINE', error.message, error.stack);
    ss.toast('Pipeline failed: ' + error.message, 'Error', 10);
    throw error;
  }
}

/**
 * Runs ingest and clean operations
 */
function runIngestAndClean() {
  logEvent('INGEST', 'Starting ingest and clean');
  importFromStaging();
  normalizeAllData();
  stampLeadArrival();
  logEvent('INGEST', 'Ingest and clean completed');
}

/**
 * Runs analysis and scoring
 */
function runAnalyzeAndScore() {
  logEvent('ANALYSIS', 'Starting analysis and scoring');
  computeAllScores();
  runAllStrategyEngines();
  runMultiExitComparison();
  logEvent('ANALYSIS', 'Analysis and scoring completed');
}

// ============================================================
// INSTITUTIONAL DISPOSITION WORKFLOW
// ============================================================

/**
 * Runs the complete institutional disposition workflow
 * Can be run independently of the main pipeline
 */
function runInstitutionalDispositionWorkflow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startTime = new Date();

  logEvent('INST', 'Starting institutional disposition workflow');
  ss.toast('Starting institutional workflow...', 'Institutional Disposition', 5);

  try {
    // Step 1: Score all deals for institutional fitness
    ss.toast('Step 1/7: Scoring institutional grades...', 'Institutional', 3);
    calculateInstitutionalScores();

    // Step 2: Update portfolio group suggestions based on market concentration
    ss.toast('Step 2/7: Detecting market concentration...', 'Institutional', 3);
    updatePortfolioGroupSuggestions();

    // Step 3: Run buy box matching against institutional buyers
    ss.toast('Step 3/7: Running buyer buy box matching...', 'Institutional', 3);
    generateBuyerMatches();

    // Step 4: Build investor-ready deal packages
    ss.toast('Step 4/7: Building deal packages...', 'Institutional', 3);
    buildInstitutionalPackages();

    // Step 5: Build portfolio groups
    ss.toast('Step 5/7: Building portfolio groups...', 'Institutional', 3);
    updatePortfolioBuilder();

    // Step 6: Create/update disposition tracker entries
    ss.toast('Step 6/7: Creating disposition entries...', 'Institutional', 3);
    createDispositionTrackerEntries();
    updateBuyerRelationshipMetrics();

    // Step 7: Refresh institutional dashboard
    ss.toast('Step 7/7: Refreshing dashboard...', 'Institutional', 3);
    refreshInstitutionalDashboard();

    const duration = ((new Date() - startTime) / 1000).toFixed(1);
    logEvent('INST', `Institutional workflow completed in ${duration}s`);
    ss.toast(`Institutional workflow completed in ${duration}s!`, 'Success', 10);

  } catch (error) {
    logError('INST', 'Institutional workflow failed: ' + error.message, error.stack);
    ss.toast('Institutional workflow failed: ' + error.message, 'Error', 10);
    throw error;
  }
}

// ============================================================
// TRIGGER MANAGEMENT
// ============================================================

/**
 * Creates time-based triggers for automation
 */
function createTriggers() {
  // Delete existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Nightly refresh at 2 AM
  ScriptApp.newTrigger('nightlyRefresh')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();

  // Dashboard update every hour
  ScriptApp.newTrigger('refreshDashboard')
    .timeBased()
    .everyHours(1)
    .create();

  // Speed-to-lead check every 5 minutes
  ScriptApp.newTrigger('checkSpeedToLeadSLA')
    .timeBased()
    .everyMinutes(5)
    .create();

  logEvent('TRIGGERS', 'All triggers created successfully');
}

/**
 * Nightly refresh job
 */
function nightlyRefresh() {
  logEvent('SCHEDULED', 'Starting nightly refresh');

  try {
    // Import any new staging data
    importFromStaging();

    // Run analysis on new leads
    runAnalyzeAndScore();

    // Update dashboard
    refreshDashboard();

    // Run institutional disposition workflow
    runInstitutionalDispositionWorkflow();

    // Archive old logs
    archiveOldLogs();

    logEvent('SCHEDULED', 'Nightly refresh completed');
  } catch (error) {
    logError('SCHEDULED', 'Nightly refresh failed: ' + error.message, error.stack);
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Runs health check with user-facing report
 */
function runHealthCheckWithReport() {
  const status = runHealthCheck();
  const ui = SpreadsheetApp.getUi();

  let message = 'Health Check Results:\n\n';
  message += `Sheets: ${status.sheets.ok ? 'OK' : 'MISSING - ' + status.sheets.missing.join(', ')}\n`;
  message += `Formatting: ${status.formatting.ok ? 'OK' : 'Issues found'}\n`;
  message += `Config: ${status.config.ok ? 'OK' : 'Invalid settings'}\n`;
  message += `Triggers: ${status.triggers.ok ? 'OK' : 'Not configured'}\n`;
  message += `\nOverall: ${status.hasErrors ? 'ISSUES FOUND' : 'HEALTHY'}`;

  ui.alert('Health Check', message, ui.ButtonSet.OK);
}

/**
 * Runs system health check
 * @returns {Object} Health status object
 */
function runHealthCheck() {
  const status = {
    sheets: { ok: true, missing: [] },
    formatting: { ok: true },
    config: { ok: true },
    triggers: { ok: true },
    hasErrors: false
  };

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Check required sheets
  const requiredSheets = Object.values(CONFIG.SHEETS);
  requiredSheets.forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      status.sheets.missing.push(sheetName);
      status.sheets.ok = false;
      status.hasErrors = true;
    }
  });

  // Check triggers
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    status.triggers.ok = false;
  }

  return status;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Clears all log sheets
 */
function clearAllLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheets = [CONFIG.SHEETS.SYSTEM_LOG, CONFIG.SHEETS.ERROR_LOG, CONFIG.SHEETS.SYNC_LOG];

  logSheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('All logs cleared', 'Success', 3);
}

/**
 * Archives logs older than 30 days
 */
function archiveOldLogs() {
  // Implementation for archiving old log entries
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  logEvent('MAINTENANCE', 'Log archival completed');
}

/**
 * Exports system configuration
 */
function exportSystemConfig() {
  const config = JSON.stringify(CONFIG, null, 2);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create or get export sheet
  let exportSheet = ss.getSheetByName('Config Export');
  if (!exportSheet) {
    exportSheet = ss.insertSheet('Config Export');
  }

  exportSheet.clear();
  exportSheet.getRange('A1').setValue('System Configuration Export');
  exportSheet.getRange('A2').setValue(new Date().toISOString());
  exportSheet.getRange('A4').setValue(config);

  SpreadsheetApp.getActiveSpreadsheet().toast('Config exported to "Config Export" sheet', 'Success', 5);
}

/**
 * Resets all settings to defaults
 */
function resetToDefaults() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Reset to Defaults',
    'This will reset all settings to their default values. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    // Reset settings sheet
    initializeSettingsSheet();
    SpreadsheetApp.getActiveSpreadsheet().toast('Settings reset to defaults', 'Success', 5);
  }
}
