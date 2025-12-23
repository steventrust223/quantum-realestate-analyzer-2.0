/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Triggers Module (triggers.gs)
 * ============================================================================
 *
 * Handles all automation triggers:
 * - onOpen: Menu creation
 * - onChange: Auto-import on new data
 * - Time-driven: Daily refresh
 */

// =============================================================================
// ONOPEN TRIGGER
// =============================================================================

/**
 * Runs when the spreadsheet is opened
 * Creates the custom menu and checks system status
 */
function onOpen() {
  createCustomMenu();

  // Check if setup is complete
  if (!isSetupComplete()) {
    showToast('Setup required. Go to Quantum Real Estate > Setup Wizard', 'Welcome', 10);
  }
}

/**
 * Creates the custom Quantum Real Estate menu
 */
function createCustomMenu() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Quantum Real Estate')
    .addItem('Setup Wizard', 'showSetupWizard')
    .addSeparator()
    .addSubMenu(ui.createMenu('Import')
      .addItem('Import Now', 'importNewLeads')
      .addItem('Add Sample Lead', 'createSampleImportRow')
      .addItem('Validate Import Data', 'validateAndShowImportData'))
    .addSubMenu(ui.createMenu('Analysis')
      .addItem('Analyze New Leads', 'analyzeNewLeads')
      .addItem('Re-analyze All', 'reanalyzeAllLeads'))
    .addSubMenu(ui.createMenu('Verdict')
      .addItem('Rebuild Verdict', 'rebuildVerdict')
      .addItem('Show Top Deals', 'showTopDeals'))
    .addSubMenu(ui.createMenu('CRM')
      .addItem('Sync HOT Deals to CRM', 'syncHotDealsToCRM')
      .addItem('Retry Failed Syncs', 'retryFailedCrmSyncs')
      .addItem('Test CRM Connections', 'showCrmStatus'))
    .addSeparator()
    .addItem('Open Dashboard', 'showDashboard')
    .addItem('Quick Actions Sidebar', 'showSidebar')
    .addSeparator()
    .addSubMenu(ui.createMenu('System')
      .addItem('System Health Report', 'showSystemHealthReport')
      .addItem('Test AI Connection', 'testAIConnection')
      .addItem('View Automation Status', 'showAutomationStatus')
      .addItem('Install Triggers', 'installTriggers')
      .addItem('Remove All Triggers', 'removeAllTriggers'))
    .addSubMenu(ui.createMenu('Data Management')
      .addItem('Clear All Data', 'clearAllData')
      .addItem('Reset Workbook', 'resetWorkbook'))
    .addSeparator()
    .addItem('Help & Documentation', 'showHelp')
    .addToUi();
}

// =============================================================================
// ONCHANGE TRIGGER
// =============================================================================

/**
 * Handles spreadsheet change events
 * @param {Object} e - Event object
 */
function onChangeHandler(e) {
  try {
    // Skip if change type is not relevant
    if (!e || !e.changeType) return;

    // Only process INSERT_ROW and EDIT changes
    if (e.changeType !== 'INSERT_ROW' && e.changeType !== 'EDIT') return;

    // Check if auto-import is enabled
    if (!isAutoImportEnabled()) return;

    // Check if change was in Import Hub
    const sheet = SpreadsheetApp.getActiveSheet();
    if (sheet.getName() !== SHEETS.IMPORT_HUB) return;

    // Debounce - check if we ran recently
    const cache = CacheService.getScriptCache();
    const lastRun = cache.get('IMPORT_LAST_RUN');

    if (lastRun) {
      const elapsed = Date.now() - parseInt(lastRun, 10);
      if (elapsed < 5000) return; // Wait 5 seconds between runs
    }

    cache.put('IMPORT_LAST_RUN', Date.now().toString(), 60);

    // Run import in background
    logInfo('Triggers', 'Auto-import triggered by spreadsheet change');

    // Delay slightly to allow for batch edits
    Utilities.sleep(1000);

    // Run import
    importNewLeads();

    // Check if auto-analyze is enabled
    if (isAutoAnalyzeEnabled()) {
      analyzeNewLeads();
    }

    // Check if auto-verdict is enabled
    if (isAutoVerdictEnabled()) {
      rebuildVerdict();
    }

    // Check if auto-CRM sync is enabled
    if (isAutoCrmSyncEnabled()) {
      syncHotDealsToCRM();
    }
  } catch (e) {
    logError('Triggers', e, 'onChange handler failed');
  }
}

/**
 * Checks if auto-import is enabled
 * @returns {boolean} True if enabled
 */
function isAutoImportEnabled() {
  return isFeatureEnabled('Auto Import on New Rows');
}

/**
 * Checks if auto-analyze is enabled
 * @returns {boolean} True if enabled
 */
function isAutoAnalyzeEnabled() {
  return isFeatureEnabled('Auto Analyze New Leads');
}

/**
 * Checks if auto-verdict is enabled
 * @returns {boolean} True if enabled
 */
function isAutoVerdictEnabled() {
  return isFeatureEnabled('Auto Update Verdict');
}

/**
 * Checks if auto-CRM sync is enabled
 * @returns {boolean} True if enabled
 */
function isAutoCrmSyncEnabled() {
  return isFeatureEnabled('Auto CRM Sync for HOT Deals');
}

// =============================================================================
// TIME-DRIVEN TRIGGERS
// =============================================================================

/**
 * Daily refresh trigger - runs each morning
 * Updates dashboard, refreshes verdicts, checks system health
 */
function dailyRefresh() {
  try {
    logInfo('Triggers', 'Starting daily refresh...');

    // Check if daily refresh is enabled
    if (!isFeatureEnabled('Daily Dashboard Refresh')) {
      logInfo('Triggers', 'Daily refresh is disabled');
      return;
    }

    // Update automation control last run
    updateAutomationLastRun('Daily Dashboard Refresh');

    // Rebuild verdict rankings
    rebuildVerdict();

    // Update dashboard
    updateDashboard();

    // Run system health check
    runSystemHealthCheck();

    // Sync any pending CRM updates
    if (isAutoCrmSyncEnabled()) {
      syncHotDealsToCRM();
    }

    logSuccess('Triggers', 'Daily refresh completed successfully');
  } catch (e) {
    logError('Triggers', e, 'Daily refresh failed');
  }
}

/**
 * Updates the dashboard with current stats
 */
function updateDashboard() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboard = ss.getSheetByName(SHEETS.DASHBOARD);

    if (!dashboard) return;

    const stats = getVerdictStats();
    const pipeline = getPipelineValue();

    // Update KPI values (row 4)
    dashboard.getRange('A4').setValue(stats.totalDeals);
    dashboard.getRange('B4').setValue(stats.hotDeals);
    dashboard.getRange('C4').setValue(formatCurrency(stats.avgSpread));
    dashboard.getRange('D4').setValue(formatCurrency(pipeline.total));

    // Update strategy distribution (rows 7-13)
    let row = 7;
    for (const [strategy, count] of Object.entries(stats.byStrategy).slice(0, 6)) {
      dashboard.getRange(row, 1).setValue(strategy);
      dashboard.getRange(row, 2).setValue(count);
      row++;
    }

    // Update classifier distribution (rows 7-10)
    row = 7;
    for (const [classifier, count] of Object.entries(stats.byClassifier)) {
      dashboard.getRange(row, 3).setValue(classifier);
      dashboard.getRange(row, 4).setValue(count);
      row++;
    }

    // Update timestamp
    dashboard.getRange('B24').setValue(new Date());

    logInfo('Triggers', 'Dashboard updated');
  } catch (e) {
    logError('Triggers', e, 'Dashboard update failed');
  }
}

/**
 * Runs system health check
 */
function runSystemHealthCheck() {
  try {
    const validation = runValidation();
    const aiStatus = getAIStatus();
    const crmStatus = getCrmStatus();
    const quota = getQuotaInfo();

    // Log health status
    logToSystem('Health Check', 'INFO',
      `Sheets: ${validation.sheets.valid ? 'OK' : 'Issues'}, ` +
      `AI: ${aiStatus.available ? 'OK' : 'Not configured'}, ` +
      `API Calls Today: ${quota.dailyCalls}`,
      { apiQuota: quota.dailyCalls }
    );

    // Check for warnings
    if (!validation.sheets.valid) {
      logWarning('Health Check', `Missing sheets: ${validation.sheets.missing.join(', ')}`);
    }

    if (!aiStatus.available) {
      logWarning('Health Check', 'AI is not configured - some features disabled');
    }

    const configuredCrms = Object.values(crmStatus).filter(c => c.configured).length;
    if (configuredCrms === 0) {
      logWarning('Health Check', 'No CRM integrations configured');
    }

    return {
      healthy: validation.sheets.valid,
      validation: validation,
      ai: aiStatus,
      crm: crmStatus,
      quota: quota
    };
  } catch (e) {
    logError('Health Check', e, 'Health check failed');
    return { healthy: false, error: e.message };
  }
}

/**
 * Updates the last run timestamp in Automation Control
 * @param {string} feature - Feature name
 */
function updateAutomationLastRun(feature) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.AUTOMATION_CONTROL);

    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const featureCol = headers.indexOf('Feature');
    const lastRunCol = headers.indexOf('Last Run');

    if (featureCol === -1 || lastRunCol === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (data[i][featureCol] === feature) {
        sheet.getRange(i + 1, lastRunCol + 1).setValue(new Date());
        break;
      }
    }
  } catch (e) {
    // Silent fail - non-critical
  }
}

// =============================================================================
// MANUAL TRIGGER EXECUTION
// =============================================================================

/**
 * Manually runs the full processing pipeline
 */
function runFullPipeline() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Run Full Pipeline',
    'This will run:\n' +
    '1. Import new leads\n' +
    '2. Analyze all new leads\n' +
    '3. Rebuild verdict\n' +
    '4. Sync HOT deals to CRM\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    showToast('Running full pipeline...', 'Pipeline', 120);

    // Step 1: Import
    const importResult = importNewLeads();
    logInfo('Pipeline', `Import: ${importResult.imported} leads`);

    // Step 2: Analyze
    const analysisResult = analyzeNewLeads();
    logInfo('Pipeline', `Analysis: ${analysisResult.analyzed} leads`);

    // Step 3: Verdict
    const verdictResult = rebuildVerdict();
    logInfo('Pipeline', `Verdict: ${verdictResult.count} deals ranked`);

    // Step 4: CRM Sync
    const crmResult = syncHotDealsToCRM();
    logInfo('Pipeline', `CRM: ${crmResult.synced} synced`);

    // Summary
    const summary =
      `Pipeline Complete!\n\n` +
      `Imported: ${importResult.imported}\n` +
      `Analyzed: ${analysisResult.analyzed}\n` +
      `Ranked: ${verdictResult.count}\n` +
      `Synced to CRM: ${crmResult.synced}`;

    ui.alert('Pipeline Complete', summary, ui.ButtonSet.OK);
    logSuccess('Pipeline', 'Full pipeline completed');
  } catch (e) {
    logError('Pipeline', e, 'Pipeline failed');
    ui.alert('Pipeline Error', 'An error occurred: ' + e.message, ui.ButtonSet.OK);
  }
}

// =============================================================================
// TRIGGER INSTALLATION HELPERS
// =============================================================================

/**
 * Gets trigger status
 * @returns {Object} Trigger status
 */
function getTriggerStatus() {
  const triggers = ScriptApp.getProjectTriggers();

  return {
    count: triggers.length,
    triggers: triggers.map(t => ({
      id: t.getUniqueId(),
      handler: t.getHandlerFunction(),
      type: t.getEventType().toString(),
      source: t.getTriggerSource().toString()
    }))
  };
}

/**
 * Checks if specific trigger exists
 * @param {string} handlerName - Handler function name
 * @returns {boolean} True if exists
 */
function triggerExists(handlerName) {
  const triggers = ScriptApp.getProjectTriggers();
  return triggers.some(t => t.getHandlerFunction() === handlerName);
}

/**
 * Ensures all required triggers are installed
 */
function ensureTriggers() {
  if (!triggerExists('onOpen')) {
    ScriptApp.newTrigger('onOpen')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onOpen()
      .create();
  }

  if (!triggerExists('onChangeHandler')) {
    ScriptApp.newTrigger('onChangeHandler')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onChange()
      .create();
  }

  if (!triggerExists('dailyRefresh')) {
    ScriptApp.newTrigger('dailyRefresh')
      .timeBased()
      .atHour(AUTOMATION.TIMING.DAILY_TRIGGER_HOUR)
      .everyDays(1)
      .create();
  }

  logInfo('Triggers', 'All triggers verified');
}

// =============================================================================
// UI HELPER FUNCTIONS FOR MENU
// =============================================================================

/**
 * Shows and validates import data
 */
function validateAndShowImportData() {
  const result = validateImportData();
  const ui = SpreadsheetApp.getUi();

  let message = `Valid Rows: ${result.validRows}\n`;

  if (result.issues && result.issues.length > 0) {
    message += `\nIssues Found:\n`;
    result.issues.forEach(issue => {
      message += `- ${issue}\n`;
    });
  }

  ui.alert('Import Validation', message, ui.ButtonSet.OK);
}

/**
 * Shows top deals in a dialog
 */
function showTopDeals() {
  const topDeals = getTopDeals(5);
  const ui = SpreadsheetApp.getUi();

  if (topDeals.length === 0) {
    ui.alert('Top Deals', 'No deals available. Run analysis first.', ui.ButtonSet.OK);
    return;
  }

  let message = 'Top 5 Deals:\n\n';

  topDeals.forEach((deal, index) => {
    message += `${index + 1}. ${deal['Address']}\n`;
    message += `   Strategy: ${deal['Strategy']}\n`;
    message += `   Classifier: ${deal['Deal Classifier']}\n`;
    message += `   Offer: ${formatCurrency(deal['Offer Target'])}\n`;
    message += `   Spread: ${formatCurrency(deal['Profit/Spread'])}\n\n`;
  });

  ui.alert('Top Deals', message, ui.ButtonSet.OK);
}

/**
 * Shows CRM connection status
 */
function showCrmStatus() {
  const status = testCrmConnections();
  const ui = SpreadsheetApp.getUi();

  let message = 'CRM Integration Status:\n\n';

  for (const [key, crm] of Object.entries(status)) {
    const icon = crm.status === 'configured' ? '✓' : '✗';
    message += `${icon} ${crm.name}: ${crm.message}\n`;
  }

  ui.alert('CRM Status', message, ui.ButtonSet.OK);
}

/**
 * Shows system health report
 */
function showSystemHealthReport() {
  const health = runSystemHealthCheck();
  const ui = SpreadsheetApp.getUi();

  let message = 'System Health Report\n\n';

  // Sheets
  message += `Sheets: ${health.validation?.sheets?.valid ? 'OK' : 'Issues'}\n`;
  if (health.validation?.sheets?.missing?.length > 0) {
    message += `  Missing: ${health.validation.sheets.missing.join(', ')}\n`;
  }

  // AI
  message += `\nAI: ${health.ai?.available ? 'Configured' : 'Not configured'}\n`;
  if (health.ai?.features) {
    message += `  Strategy AI: ${health.ai.features.strategyRecommendations ? 'On' : 'Off'}\n`;
    message += `  Repair AI: ${health.ai.features.repairInference ? 'On' : 'Off'}\n`;
    message += `  Messaging AI: ${health.ai.features.sellerMessaging ? 'On' : 'Off'}\n`;
  }

  // Quota
  message += `\nAPI Usage Today: ${health.quota?.dailyCalls || 0} calls\n`;

  // CRM
  const crmCount = Object.values(health.crm || {}).filter(c => c.configured).length;
  message += `\nCRM Integrations: ${crmCount} configured\n`;

  ui.alert('System Health', message, ui.ButtonSet.OK);
}

/**
 * Shows automation status
 */
function showAutomationStatus() {
  const triggerStatus = getTriggerStatus();
  const ui = SpreadsheetApp.getUi();

  let message = `Installed Triggers: ${triggerStatus.count}\n\n`;

  triggerStatus.triggers.forEach(t => {
    message += `- ${t.handler} (${t.type})\n`;
  });

  message += '\nFeature Status:\n';
  message += `- Auto Import: ${isAutoImportEnabled() ? 'Enabled' : 'Disabled'}\n`;
  message += `- Auto Analyze: ${isAutoAnalyzeEnabled() ? 'Enabled' : 'Disabled'}\n`;
  message += `- Auto Verdict: ${isAutoVerdictEnabled() ? 'Enabled' : 'Disabled'}\n`;
  message += `- Auto CRM Sync: ${isAutoCrmSyncEnabled() ? 'Enabled' : 'Disabled'}\n`;

  ui.alert('Automation Status', message, ui.ButtonSet.OK);
}

/**
 * Shows help documentation
 */
function showHelp() {
  const ui = SpreadsheetApp.getUi();

  const message = `
QUANTUM REAL ESTATE ANALYZER v2.0

Quick Start:
1. Run Setup Wizard to configure sheets
2. Add API keys for AI and CRM integrations
3. Paste leads into Import Hub
4. Run Import, Analyze, and Verdict

Supported Strategies:
- Wholesaling (Local, Virtual, JV)
- Subject-To, Wraparound, Seller Financing
- Fix & Flip, BRRRR
- STR, MTR, LTR Rentals
- Pre-foreclosure, Tax Delinquent
- Vacant/Abandoned, Inherited/Probate

Need Help?
Visit documentation or contact support.
  `.trim();

  ui.alert('Help & Documentation', message, ui.ButtonSet.OK);
}
