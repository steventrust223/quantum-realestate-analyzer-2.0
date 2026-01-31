/**
 * Quantum Real Estate Analyzer - Logging Module
 * Handles system logs, error tracking, and sync logs
 */

// ============================================================
// EVENT LOGGING
// ============================================================

/**
 * Logs a system event
 * @param {string} category - Category of the event (PIPELINE, INGEST, ANALYSIS, etc.)
 * @param {string} message - Event message
 * @param {string} details - Optional additional details
 */
function logEvent(category, message, details = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);

    if (!logSheet) {
      Logger.log(`[${category}] ${message} - ${details}`);
      return;
    }

    const timestamp = new Date();
    const row = [timestamp, category, message, details];

    // Insert at row 2 (after header) for most recent first
    logSheet.insertRowAfter(1);
    logSheet.getRange(2, 1, 1, 4).setValues([row]);

    // Format timestamp
    logSheet.getRange(2, 1).setNumberFormat('yyyy-MM-dd HH:mm:ss');

    // Trim log if too large (keep last 1000 entries)
    const lastRow = logSheet.getLastRow();
    if (lastRow > 1001) {
      logSheet.deleteRows(1002, lastRow - 1001);
    }
  } catch (error) {
    Logger.log(`Log error: ${error.message}`);
  }
}

// ============================================================
// ERROR LOGGING
// ============================================================

/**
 * Logs an error
 * @param {string} module - Module where error occurred
 * @param {string} errorMessage - Error message
 * @param {string} stackTrace - Optional stack trace
 */
function logError(module, errorMessage, stackTrace = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const errorSheet = ss.getSheetByName(CONFIG.SHEETS.ERROR_LOG);

    if (!errorSheet) {
      Logger.log(`[ERROR - ${module}] ${errorMessage}\n${stackTrace}`);
      return;
    }

    const timestamp = new Date();
    const row = [timestamp, module, errorMessage, stackTrace, 'No'];

    // Insert at row 2 (after header)
    errorSheet.insertRowAfter(1);
    errorSheet.getRange(2, 1, 1, 5).setValues([row]);

    // Format timestamp
    errorSheet.getRange(2, 1).setNumberFormat('yyyy-MM-dd HH:mm:ss');

    // Highlight error row
    errorSheet.getRange(2, 1, 1, 5).setBackground('#FFEBEE');

    // Also log to system log
    logEvent('ERROR', `${module}: ${errorMessage}`, stackTrace.substring(0, 200));

    // Trim log if too large
    const lastRow = errorSheet.getLastRow();
    if (lastRow > 501) {
      errorSheet.deleteRows(502, lastRow - 501);
    }
  } catch (error) {
    Logger.log(`Error log failed: ${error.message}`);
  }
}

/**
 * Marks an error as resolved
 * @param {number} rowNumber - Row number of the error to resolve
 */
function resolveError(rowNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const errorSheet = ss.getSheetByName(CONFIG.SHEETS.ERROR_LOG);

  if (!errorSheet || rowNumber < 2) return;

  errorSheet.getRange(rowNumber, 5).setValue('Yes');
  errorSheet.getRange(rowNumber, 1, 1, 5).setBackground('#E8F5E9');

  logEvent('ERROR', `Error at row ${rowNumber} marked as resolved`);
}

// ============================================================
// SYNC LOGGING
// ============================================================

/**
 * Logs a CRM sync event
 * @param {string} crmSystem - CRM system (SMS-iT, CompanyHub, OhMyLead)
 * @param {string} action - Action performed (CREATE, UPDATE, DELETE, SYNC)
 * @param {string} recordId - Record/Deal ID
 * @param {string} status - Status (SUCCESS, FAILED, PENDING)
 * @param {string} details - Optional details
 */
function logSync(crmSystem, action, recordId, status, details = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const syncSheet = ss.getSheetByName(CONFIG.SHEETS.SYNC_LOG);

    if (!syncSheet) {
      Logger.log(`[SYNC - ${crmSystem}] ${action} ${recordId}: ${status}`);
      return;
    }

    const timestamp = new Date();
    const row = [timestamp, crmSystem, action, recordId, status, details];

    // Insert at row 2 (after header)
    syncSheet.insertRowAfter(1);
    syncSheet.getRange(2, 1, 1, 6).setValues([row]);

    // Format timestamp
    syncSheet.getRange(2, 1).setNumberFormat('yyyy-MM-dd HH:mm:ss');

    // Color code status
    const statusCell = syncSheet.getRange(2, 5);
    if (status === 'SUCCESS') {
      statusCell.setBackground('#C8E6C9');
    } else if (status === 'FAILED') {
      statusCell.setBackground('#FFCDD2');
    } else if (status === 'PENDING') {
      statusCell.setBackground('#FFF9C4');
    }

    // Trim log if too large
    const lastRow = syncSheet.getLastRow();
    if (lastRow > 1001) {
      syncSheet.deleteRows(1002, lastRow - 1001);
    }
  } catch (error) {
    Logger.log(`Sync log error: ${error.message}`);
  }
}

// ============================================================
// LOG RETRIEVAL
// ============================================================

/**
 * Gets recent system logs
 * @param {number} count - Number of entries to retrieve
 * @returns {Array} Array of log entries
 */
function getRecentLogs(count = 50) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);

  if (!logSheet || logSheet.getLastRow() <= 1) return [];

  const lastRow = Math.min(logSheet.getLastRow(), count + 1);
  const data = logSheet.getRange(2, 1, lastRow - 1, 4).getValues();

  return data.map(row => ({
    timestamp: row[0],
    category: row[1],
    message: row[2],
    details: row[3]
  }));
}

/**
 * Gets recent errors
 * @param {number} count - Number of entries to retrieve
 * @param {boolean} unresolvedOnly - Only return unresolved errors
 * @returns {Array} Array of error entries
 */
function getRecentErrors(count = 20, unresolvedOnly = false) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const errorSheet = ss.getSheetByName(CONFIG.SHEETS.ERROR_LOG);

  if (!errorSheet || errorSheet.getLastRow() <= 1) return [];

  const lastRow = Math.min(errorSheet.getLastRow(), count + 1);
  const data = errorSheet.getRange(2, 1, lastRow - 1, 5).getValues();

  let errors = data.map(row => ({
    timestamp: row[0],
    module: row[1],
    message: row[2],
    stackTrace: row[3],
    resolved: row[4] === 'Yes'
  }));

  if (unresolvedOnly) {
    errors = errors.filter(e => !e.resolved);
  }

  return errors;
}

/**
 * Gets recent sync logs
 * @param {number} count - Number of entries to retrieve
 * @param {string} crmSystem - Optional filter by CRM system
 * @returns {Array} Array of sync entries
 */
function getRecentSyncLogs(count = 50, crmSystem = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const syncSheet = ss.getSheetByName(CONFIG.SHEETS.SYNC_LOG);

  if (!syncSheet || syncSheet.getLastRow() <= 1) return [];

  const lastRow = Math.min(syncSheet.getLastRow(), count + 1);
  const data = syncSheet.getRange(2, 1, lastRow - 1, 6).getValues();

  let syncs = data.map(row => ({
    timestamp: row[0],
    crmSystem: row[1],
    action: row[2],
    recordId: row[3],
    status: row[4],
    details: row[5]
  }));

  if (crmSystem) {
    syncs = syncs.filter(s => s.crmSystem === crmSystem);
  }

  return syncs;
}

// ============================================================
// DIAGNOSTICS
// ============================================================

/**
 * Generates a diagnostic report
 * @returns {Object} Diagnostic information
 */
function generateDiagnostics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const diagnostics = {
    timestamp: new Date(),
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheets: {},
    recentErrors: [],
    recentSyncs: [],
    systemHealth: 'HEALTHY'
  };

  // Check each required sheet
  Object.entries(CONFIG.SHEETS).forEach(([key, sheetName]) => {
    const sheet = ss.getSheetByName(sheetName);
    diagnostics.sheets[key] = {
      exists: !!sheet,
      rowCount: sheet ? sheet.getLastRow() : 0,
      colCount: sheet ? sheet.getLastColumn() : 0
    };

    if (!sheet) {
      diagnostics.systemHealth = 'DEGRADED';
    }
  });

  // Get recent errors
  diagnostics.recentErrors = getRecentErrors(10, true);
  if (diagnostics.recentErrors.length > 0) {
    diagnostics.systemHealth = 'ISSUES';
  }

  // Get recent sync status
  diagnostics.recentSyncs = getRecentSyncLogs(10);
  const failedSyncs = diagnostics.recentSyncs.filter(s => s.status === 'FAILED');
  if (failedSyncs.length > 3) {
    diagnostics.systemHealth = 'ISSUES';
  }

  return diagnostics;
}

/**
 * Exports diagnostics to a sheet
 */
function exportDiagnostics() {
  const diagnostics = generateDiagnostics();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let exportSheet = ss.getSheetByName('Diagnostics Export');
  if (!exportSheet) {
    exportSheet = ss.insertSheet('Diagnostics Export');
  }

  exportSheet.clear();

  // Header
  exportSheet.getRange('A1').setValue('System Diagnostics Report');
  exportSheet.getRange('A1').setFontSize(16).setFontWeight('bold');

  exportSheet.getRange('A2').setValue('Generated: ' + diagnostics.timestamp.toISOString());
  exportSheet.getRange('A3').setValue('System Health: ' + diagnostics.systemHealth);

  // Color code health
  const healthCell = exportSheet.getRange('A3');
  if (diagnostics.systemHealth === 'HEALTHY') {
    healthCell.setBackground('#C8E6C9');
  } else if (diagnostics.systemHealth === 'DEGRADED') {
    healthCell.setBackground('#FFE0B2');
  } else {
    healthCell.setBackground('#FFCDD2');
  }

  // Sheet status
  exportSheet.getRange('A5').setValue('Sheet Status:').setFontWeight('bold');
  let row = 6;
  Object.entries(diagnostics.sheets).forEach(([key, status]) => {
    exportSheet.getRange(row, 1).setValue(key);
    exportSheet.getRange(row, 2).setValue(status.exists ? 'OK' : 'MISSING');
    exportSheet.getRange(row, 3).setValue(status.rowCount + ' rows');

    if (!status.exists) {
      exportSheet.getRange(row, 2).setBackground('#FFCDD2');
    }
    row++;
  });

  // Recent errors
  row += 2;
  exportSheet.getRange(row, 1).setValue('Recent Unresolved Errors:').setFontWeight('bold');
  row++;
  diagnostics.recentErrors.forEach(error => {
    exportSheet.getRange(row, 1).setValue(error.timestamp);
    exportSheet.getRange(row, 2).setValue(error.module);
    exportSheet.getRange(row, 3).setValue(error.message);
    row++;
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('Diagnostics exported', 'Success', 3);
  logEvent('DIAGNOSTICS', 'Diagnostic report generated');
}

// ============================================================
// LOG MANAGEMENT
// ============================================================

/**
 * Clears old log entries
 * @param {number} daysToKeep - Number of days of logs to keep
 */
function clearOldLogs(daysToKeep = 30) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const logSheets = [
    CONFIG.SHEETS.SYSTEM_LOG,
    CONFIG.SHEETS.ERROR_LOG,
    CONFIG.SHEETS.SYNC_LOG
  ];

  logSheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() <= 1) return;

    const data = sheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = data.length - 1; i >= 1; i--) {
      const timestamp = new Date(data[i][0]);
      if (timestamp < cutoffDate) {
        rowsToDelete.push(i + 1);
      }
    }

    // Delete rows from bottom to top
    rowsToDelete.forEach(row => {
      sheet.deleteRow(row);
    });
  });

  logEvent('MAINTENANCE', `Cleared logs older than ${daysToKeep} days`);
}

/**
 * Gets log statistics
 * @returns {Object} Log statistics
 */
function getLogStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const stats = {
    systemLog: { total: 0, today: 0 },
    errorLog: { total: 0, unresolved: 0 },
    syncLog: { total: 0, failed: 0, success: 0 }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // System log stats
  const systemSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);
  if (systemSheet && systemSheet.getLastRow() > 1) {
    const data = systemSheet.getDataRange().getValues();
    stats.systemLog.total = data.length - 1;
    stats.systemLog.today = data.filter(row => {
      const rowDate = new Date(row[0]);
      return rowDate >= today;
    }).length - 1;
  }

  // Error log stats
  const errorSheet = ss.getSheetByName(CONFIG.SHEETS.ERROR_LOG);
  if (errorSheet && errorSheet.getLastRow() > 1) {
    const data = errorSheet.getDataRange().getValues();
    stats.errorLog.total = data.length - 1;
    stats.errorLog.unresolved = data.filter(row => row[4] !== 'Yes').length - 1;
  }

  // Sync log stats
  const syncSheet = ss.getSheetByName(CONFIG.SHEETS.SYNC_LOG);
  if (syncSheet && syncSheet.getLastRow() > 1) {
    const data = syncSheet.getDataRange().getValues();
    stats.syncLog.total = data.length - 1;
    stats.syncLog.failed = data.filter(row => row[4] === 'FAILED').length;
    stats.syncLog.success = data.filter(row => row[4] === 'SUCCESS').length;
  }

  return stats;
}
