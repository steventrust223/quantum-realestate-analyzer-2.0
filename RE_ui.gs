/**
 * ================================================================
 * QUANTUM REAL ESTATE ANALYZER v2.0 - User Interface
 * ================================================================
 * Handles menu creation, dialogs, and sidebar UI
 */

/**
 * Runs when the spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏡 Quantum RE Analyzer')
    .addItem('📊 Control Center', 'RE_showControlCenter')
    .addItem('📂 Deal Review', 'RE_showDealReview')
    .addSeparator()
    .addItem('🔄 Run Full Sync', 'RE_runFullSyncWithUI')
    .addItem('📈 Run Full Analysis', 'RE_runFullAnalysisWithUI')
    .addItem('🏅 Rebuild Verdict', 'RE_rebuildVerdictWithUI')
    .addSeparator()
    .addItem('⚙️ Initialize System', 'RE_initializeSystem')
    .addItem('📋 View Logs', 'RE_showLogs')
    .addItem('ℹ️ About', 'RE_showAbout')
    .addToUi();

  logEvent('INFO', 'UI', 'Menu initialized');
}

/**
 * Show the Control Center sidebar
 */
function RE_showControlCenter() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('re_control_center')
      .setTitle('🏡 Quantum RE Control Center')
      .setWidth(380);

    SpreadsheetApp.getUi().showSidebar(html);
    logEvent('INFO', 'UI', 'Control Center opened');
  } catch (error) {
    logEvent('ERROR', 'UI', 'Failed to show Control Center', error.toString());
    SpreadsheetApp.getUi().alert('Error opening Control Center: ' + error.message);
  }
}

/**
 * Show Deal Review sidebar
 */
function RE_showDealReview() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('re_deal_review')
      .setTitle('📂 Deal Review')
      .setWidth(400);

    SpreadsheetApp.getUi().showSidebar(html);
    logEvent('INFO', 'UI', 'Deal Review opened');
  } catch (error) {
    logEvent('ERROR', 'UI', 'Failed to show Deal Review', error.toString());

    // Fallback: navigate to VERDICT sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const verdictSheet = ss.getSheetByName(SHEET_NAMES.VERDICT);
    if (verdictSheet) {
      verdictSheet.activate();
      SpreadsheetApp.getUi().alert(
        'Deal Review sidebar is not yet available.\n\n' +
        'Showing VERDICT sheet instead. Top deals are at the top.'
      );
    }
  }
}

/**
 * Run full sync with UI feedback
 */
function RE_runFullSyncWithUI() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Run Full Sync',
    'This will import all new leads from LEADS_* sheets into MASTER_PROPERTIES.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    try {
      ui.alert('Sync started! Check the SYSTEM_LOG sheet for progress.');
      RE_runFullSync();
      ui.alert('✅ Sync completed successfully!\n\nCheck MASTER_PROPERTIES and SYSTEM_LOG for details.');
    } catch (error) {
      ui.alert('❌ Sync failed: ' + error.message);
    }
  }
}

/**
 * Run full analysis with UI feedback
 */
function RE_runFullAnalysisWithUI() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Run Full Analysis',
    'This will analyze all properties and calculate:\n' +
    '• MAO (Maximum Allowable Offer)\n' +
    '• Risk Scores\n' +
    '• Deal Classifications (HOT/SOLID/MARGINAL/PASS)\n' +
    '• Profit Potential\n\n' +
    'This may take a few minutes for large datasets.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    try {
      ui.alert('Analysis started! This may take a minute...');
      RE_runFullAnalysis();
      ui.alert('✅ Analysis completed!\n\nCheck the VERDICT sheet for results.');
    } catch (error) {
      ui.alert('❌ Analysis failed: ' + error.message);
    }
  }
}

/**
 * Rebuild verdict with UI feedback
 */
function RE_rebuildVerdictWithUI() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Rebuild Verdict',
    'This will recalculate all deal classifications and rankings.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    try {
      RE_rebuildVerdict();
      ui.alert('✅ Verdict rebuilt successfully!\n\nCheck the VERDICT sheet.');
    } catch (error) {
      ui.alert('❌ Rebuild failed: ' + error.message);
    }
  }
}

/**
 * Initialize the system
 */
function RE_initializeSystem() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Initialize System',
    'This will create all required sheets and set default configurations.\n\n' +
    'Existing data will NOT be deleted.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    try {
      initializeSheets();

      // Set default configurations
      setConfig('ARV_MULTIPLIER', 0.70, 'Default ARV multiplier for MAO calculation');
      setConfig('MIN_PROFIT', 10000, 'Minimum acceptable profit');
      setConfig('HOLDING_COSTS', 1500, 'Monthly holding costs');

      ui.alert(
        '✅ System initialized successfully!\n\n' +
        'Sheets created:\n' +
        '• MASTER_PROPERTIES\n' +
        '• VERDICT\n' +
        '• SYSTEM_LOG\n' +
        '• CONFIG\n\n' +
        'You can now add LEADS_* sheets and run sync.'
      );
    } catch (error) {
      ui.alert('❌ Initialization failed: ' + error.message);
    }
  }
}

/**
 * Show system logs
 */
function RE_showLogs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = getOrCreateSheet(SHEET_NAMES.SYSTEM_LOG, LOG_HEADERS);
    logSheet.activate();

    // Auto-format log sheet for better readability
    const lastRow = logSheet.getLastRow();
    if (lastRow > 1) {
      // Apply conditional formatting for event types
      const range = logSheet.getRange(2, 1, lastRow - 1, logSheet.getLastColumn());

      // Clear existing formatting
      range.setBackground(null);

      // Get data and apply row-based formatting
      const data = logSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      data.forEach((row, index) => {
        const eventType = row[0];
        const rowNum = index + 2;
        let color = null;

        switch (eventType) {
          case 'ERROR':
            color = '#ffebee';
            break;
          case 'WARNING':
            color = '#fff3e0';
            break;
          case 'SUCCESS':
            color = '#e8f5e9';
            break;
          case 'INFO':
            color = '#e3f2fd';
            break;
        }

        if (color) {
          logSheet.getRange(rowNum, 1, 1, logSheet.getLastColumn()).setBackground(color);
        }
      });
    }

    SpreadsheetApp.getUi().alert(
      'System logs are now displayed.\n\n' +
      'Color coding:\n' +
      '• Red: Errors\n' +
      '• Orange: Warnings\n' +
      '• Green: Success\n' +
      '• Blue: Info'
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error showing logs: ' + error.message);
  }
}

/**
 * Show about dialog
 */
function RE_showAbout() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '🏡 Quantum Real Estate Analyzer v2.0',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Enterprise-Grade Real Estate Investment Analysis\n\n' +
    'Features:\n' +
    '✓ Automated lead import & synchronization\n' +
    '✓ Intelligent deal classification (HOT/SOLID/MARGINAL/PASS)\n' +
    '✓ MAO calculation with risk assessment\n' +
    '✓ Real-time control center dashboard\n' +
    '✓ Comprehensive activity logging\n' +
    '✓ Deal tracking & contract management\n\n' +
    'Quick Start:\n' +
    '1. Click "Initialize System" to set up sheets\n' +
    '2. Create LEADS_* sheets with your data\n' +
    '3. Run "Full Sync" to import leads\n' +
    '4. Run "Full Analysis" to analyze deals\n' +
    '5. Open "Control Center" for overview\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '© 2024 Quantum RE Analytics\n' +
    'Built with ❤️ for real estate investors',
    ui.ButtonSet.OK
  );
}

/**
 * Show a custom dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} type - Type: 'info', 'success', 'warning', 'error'
 */
function showDialog(title, message, type = 'info') {
  const ui = SpreadsheetApp.getUi();
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  const icon = icons[type] || icons.info;
  ui.alert(`${icon} ${title}`, message, ui.ButtonSet.OK);
}

/**
 * Show a confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @return {boolean} True if confirmed
 */
function showConfirmation(title, message) {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(title, message, ui.ButtonSet.YES_NO);
  return response === ui.Button.YES;
}
