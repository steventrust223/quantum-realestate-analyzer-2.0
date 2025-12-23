/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * UI Module (ui.gs)
 * ============================================================================
 *
 * Handles all UI-related functions:
 * - Sidebar display
 * - Dashboard display
 * - Setup wizard
 * - Dialogs and modals
 */

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * Shows the dashboard in a modal dialog
 */
function showDashboard() {
  const html = HtmlService.createHtmlOutputFromFile('dashboard')
    .setWidth(900)
    .setHeight(700)
    .setTitle('Quantum Real Estate Analyzer - Dashboard');

  SpreadsheetApp.getUi().showModalDialog(html, 'Dashboard');
}

/**
 * Gets dashboard data for the HTML template
 * @returns {Object} Dashboard data
 */
function getDashboardData() {
  const stats = getVerdictStats();
  const pipeline = getPipelineValue();
  const topDeals = getTopDeals(10);
  const recentActivity = getRecentCrmActivity(5);
  const nextAction = getNextBestAction();

  return {
    stats: {
      totalDeals: stats.totalDeals,
      hotDeals: stats.hotDeals,
      portfolioFoundation: stats.portfolioFoundation,
      solidDeals: stats.solidDeals,
      avgSpread: stats.avgSpread,
      avgRisk: stats.avgRisk,
      avgVelocity: stats.avgVelocity
    },
    pipeline: {
      hot: pipeline.hot,
      portfolio: pipeline.portfolio,
      solid: pipeline.solid,
      total: pipeline.total
    },
    strategyBreakdown: stats.byStrategy,
    classifierBreakdown: stats.byClassifier,
    topDeals: topDeals.map(deal => ({
      rank: deal['Rank'],
      address: deal['Address'],
      city: deal['City'],
      state: deal['State'],
      strategy: deal['Strategy'],
      classifier: deal['Deal Classifier'],
      offerTarget: deal['Offer Target'],
      spread: deal['Profit/Spread'],
      risk: deal['Risk Score'],
      action: deal['Action']
    })),
    recentActivity: recentActivity,
    nextAction: nextAction,
    lastUpdated: new Date().toISOString()
  };
}

// =============================================================================
// SETUP WIZARD
// =============================================================================

/**
 * Shows the setup wizard dialog
 */
function showSetupWizard() {
  const html = HtmlService.createHtmlOutputFromFile('setup-wizard')
    .setWidth(700)
    .setHeight(600)
    .setTitle('Setup Wizard');

  SpreadsheetApp.getUi().showModalDialog(html, 'Setup Wizard');
}

/**
 * Gets setup wizard data
 * @returns {Object} Setup data
 */
function getSetupWizardData() {
  const setupStatus = getSetupStatus();
  const apiStatus = getApiKeyStatus();
  const triggerStatus = getTriggerStatus();

  return {
    setup: setupStatus,
    api: apiStatus,
    triggers: triggerStatus,
    sheets: Object.values(SHEETS),
    featureToggles: getFeatureToggles()
  };
}

/**
 * Gets feature toggles from Automation Control
 * @returns {Object} Feature toggles
 */
function getFeatureToggles() {
  try {
    const controlData = getSheetDataAsObjects(SHEETS.AUTOMATION_CONTROL);
    const toggles = {};

    controlData.forEach(row => {
      toggles[row['Feature']] = row['Enabled'] === true;
    });

    return toggles;
  } catch (e) {
    return {};
  }
}

/**
 * Saves settings from setup wizard
 * @param {Object} settings - Settings object
 * @returns {Object} Save result
 */
function saveWizardSettings(settings) {
  try {
    // Save API keys
    if (settings.apiKeys) {
      saveApiKeys(settings.apiKeys);
    }

    // Update feature toggles
    if (settings.features) {
      updateFeatureToggles(settings.features);
    }

    // Run setup if needed
    if (settings.runSetup) {
      quickSetup();
    }

    // Install triggers if needed
    if (settings.installTriggers) {
      ensureTriggers();
    }

    return { success: true, message: 'Settings saved successfully' };
  } catch (e) {
    logError('UI', e, 'Failed to save wizard settings');
    return { success: false, message: e.message };
  }
}

/**
 * Updates feature toggles in Automation Control
 * @param {Object} features - Feature toggles
 */
function updateFeatureToggles(features) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.AUTOMATION_CONTROL);

  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const featureCol = headers.indexOf('Feature');
  const enabledCol = headers.indexOf('Enabled');

  if (featureCol === -1 || enabledCol === -1) return;

  for (let i = 1; i < data.length; i++) {
    const feature = data[i][featureCol];
    if (feature in features) {
      sheet.getRange(i + 1, enabledCol + 1).setValue(features[feature]);
    }
  }
}

// =============================================================================
// SIDEBAR
// =============================================================================

/**
 * Shows the quick actions sidebar
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('Quick Actions')
    .setWidth(350);

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Gets sidebar data
 * @returns {Object} Sidebar data
 */
function getSidebarData() {
  const stats = getVerdictStats();
  const nextAction = getNextBestAction();
  const importStats = getImportStats();

  return {
    stats: {
      total: stats.totalDeals,
      hot: stats.hotDeals,
      newToday: importStats.today
    },
    nextAction: nextAction,
    recentImports: getRecentImports(5),
    systemStatus: {
      aiAvailable: isAIAvailable(),
      crmConfigured: Object.values(getCrmStatus()).some(c => c.configured)
    }
  };
}

// =============================================================================
// DIALOG HELPERS
// =============================================================================

/**
 * Shows a progress dialog
 * @param {string} title - Dialog title
 * @param {string} message - Progress message
 */
function showProgressDialog(title, message) {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
      .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #1a73e8;
                 border-radius: 50%; width: 40px; height: 40px;
                 animation: spin 1s linear infinite; margin: 20px auto; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
    <div class="spinner"></div>
    <p>${message}</p>
  `).setWidth(300).setHeight(150);

  SpreadsheetApp.getUi().showModelessDialog(html, title);
}

/**
 * Shows a success dialog
 * @param {string} title - Dialog title
 * @param {string} message - Success message
 */
function showSuccessDialog(title, message) {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
      .check { color: #34a853; font-size: 48px; }
      button { background: #1a73e8; color: white; border: none; padding: 10px 20px;
               border-radius: 4px; cursor: pointer; margin-top: 15px; }
    </style>
    <div class="check">✓</div>
    <p>${message}</p>
    <button onclick="google.script.host.close()">Close</button>
  `).setWidth(300).setHeight(180);

  SpreadsheetApp.getUi().showModalDialog(html, title);
}

/**
 * Shows an error dialog
 * @param {string} title - Dialog title
 * @param {string} message - Error message
 */
function showErrorDialog(title, message) {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
      .error { color: #ea4335; font-size: 48px; }
      p { color: #333; }
      button { background: #ea4335; color: white; border: none; padding: 10px 20px;
               border-radius: 4px; cursor: pointer; margin-top: 15px; }
    </style>
    <div class="error">✕</div>
    <p>${message}</p>
    <button onclick="google.script.host.close()">Close</button>
  `).setWidth(300).setHeight(180);

  SpreadsheetApp.getUi().showModalDialog(html, title);
}

// =============================================================================
// ACTION HANDLERS (Called from HTML)
// =============================================================================

/**
 * Runs import from UI
 * @returns {Object} Result
 */
function runImportFromUI() {
  try {
    const result = importNewLeads();
    return {
      success: true,
      message: `Imported ${result.imported} leads`,
      data: result
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Runs analysis from UI
 * @returns {Object} Result
 */
function runAnalysisFromUI() {
  try {
    const result = analyzeNewLeads();
    return {
      success: true,
      message: `Analyzed ${result.analyzed} leads`,
      data: result
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Rebuilds verdict from UI
 * @returns {Object} Result
 */
function runVerdictFromUI() {
  try {
    const result = rebuildVerdict();
    return {
      success: true,
      message: `Ranked ${result.count} deals`,
      data: result
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Syncs CRM from UI
 * @returns {Object} Result
 */
function runCrmSyncFromUI() {
  try {
    const result = syncHotDealsToCRM();
    return {
      success: true,
      message: `Synced ${result.synced} deals`,
      data: result
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Runs full pipeline from UI
 * @returns {Object} Result
 */
function runFullPipelineFromUI() {
  try {
    const importResult = importNewLeads();
    const analysisResult = analyzeNewLeads();
    const verdictResult = rebuildVerdict();
    const crmResult = syncHotDealsToCRM();

    return {
      success: true,
      message: 'Pipeline completed successfully',
      data: {
        imported: importResult.imported,
        analyzed: analysisResult.analyzed,
        ranked: verdictResult.count,
        synced: crmResult.synced
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Tests AI connection from UI
 * @returns {Object} Result
 */
function testAIFromUI() {
  return testAIConnection();
}

/**
 * Runs setup from UI
 * @returns {Object} Result
 */
function runSetupFromUI() {
  try {
    const result = quickSetup();
    return {
      success: result.success,
      message: result.success ? 'Setup completed' : result.error
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// =============================================================================
// SHEET NAVIGATION
// =============================================================================

/**
 * Navigates to a specific sheet
 * @param {string} sheetName - Sheet name
 */
function navigateToSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    ss.setActiveSheet(sheet);
    showToast(`Switched to ${sheetName}`);
  } else {
    showToast(`Sheet not found: ${sheetName}`, 'Error');
  }
}

/**
 * Navigates to a specific lead in Deal Analyzer
 * @param {string} leadId - Lead ID
 */
function navigateToLead(leadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.DEAL_ANALYZER);

  if (!sheet) {
    showToast('Deal Analyzer sheet not found', 'Error');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const leadIdCol = headers.indexOf('Lead ID');

  if (leadIdCol === -1) {
    showToast('Lead ID column not found', 'Error');
    return;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][leadIdCol] === leadId) {
      ss.setActiveSheet(sheet);
      sheet.getRange(i + 1, 1).activate();
      showToast(`Navigated to lead ${leadId}`);
      return;
    }
  }

  showToast(`Lead not found: ${leadId}`, 'Error');
}

// =============================================================================
// FORMAT HELPERS
// =============================================================================

/**
 * Formats a number as currency for UI display
 * @param {number} value - Value to format
 * @returns {string} Formatted string
 */
function formatCurrencyForUI(value) {
  return formatCurrency(value);
}

/**
 * Formats a date for UI display
 * @param {Date} date - Date to format
 * @returns {string} Formatted string
 */
function formatDateForUI(date) {
  return formatDate(date);
}

// =============================================================================
// COLOR THEME
// =============================================================================

/**
 * Gets the UI color theme
 * @returns {Object} Color theme
 */
function getUITheme() {
  return {
    primary: UI_CONFIG.COLORS.PRIMARY,
    success: UI_CONFIG.COLORS.SUCCESS,
    warning: UI_CONFIG.COLORS.WARNING,
    danger: UI_CONFIG.COLORS.DANGER,
    info: UI_CONFIG.COLORS.INFO,
    dark: UI_CONFIG.COLORS.DARK,
    light: UI_CONFIG.COLORS.LIGHT,
    white: UI_CONFIG.COLORS.WHITE,
    hotDeal: UI_CONFIG.COLORS.HOT_DEAL,
    portfolio: UI_CONFIG.COLORS.PORTFOLIO,
    solidDeal: UI_CONFIG.COLORS.SOLID_DEAL,
    pass: UI_CONFIG.COLORS.PASS
  };
}

// =============================================================================
// QUICK REPORTS
// =============================================================================

/**
 * Generates a quick summary report
 * @returns {string} Report HTML
 */
function generateQuickReport() {
  const summary = exportVerdictSummary();

  let html = `
    <h2>Quantum Real Estate Analyzer Report</h2>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <h3>Summary</h3>
    <ul>
      <li>Total Deals: ${summary.summary.totalDeals}</li>
      <li>HOT Deals: ${summary.summary.hotDeals}</li>
      <li>Average Spread: ${summary.summary.avgSpread}</li>
      <li>Pipeline Value: ${summary.summary.totalPipelineValue}</li>
    </ul>

    <h3>Top Deals</h3>
    <table border="1" cellpadding="5">
      <tr><th>Rank</th><th>Address</th><th>Strategy</th><th>Offer</th><th>Spread</th></tr>
  `;

  summary.topDeals.forEach(deal => {
    html += `
      <tr>
        <td>${deal.rank}</td>
        <td>${deal.address}</td>
        <td>${deal.strategy}</td>
        <td>${deal.offerTarget}</td>
        <td>${deal.spread}</td>
      </tr>
    `;
  });

  html += '</table>';

  return html;
}

/**
 * Shows the quick report
 */
function showQuickReport() {
  const reportHtml = generateQuickReport();

  const html = HtmlService.createHtmlOutput(reportHtml)
    .setWidth(800)
    .setHeight(600)
    .setTitle('Quick Report');

  SpreadsheetApp.getUi().showModalDialog(html, 'Quick Report');
}
