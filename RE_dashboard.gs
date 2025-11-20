/**
 * ================================================================
 * QUANTUM REAL ESTATE ANALYZER v2.0 - Dashboard & Control Center
 * ================================================================
 * Provides data aggregation for the Control Center UI
 */

/**
 * Get all data for the Control Center dashboard
 * This is the main function called by re_control_center.html
 * @return {Object} Dashboard data object
 */
function RE_getControlCenterData() {
  try {
    logEvent('INFO', 'Dashboard', 'Control Center data requested');

    const data = {
      summary: RE_getSummaryMetrics(),
      actionItems: RE_getActionItems(),
      recentLogs: RE_getRecentLogs(15)
    };

    logEvent('SUCCESS', 'Dashboard', 'Control Center data compiled successfully');
    return data;

  } catch (error) {
    logEvent('ERROR', 'Dashboard', 'Failed to get Control Center data', error.toString());

    // Return safe defaults so UI doesn't break
    return {
      summary: {
        hotDeals: 0,
        solidDeals: 0,
        totalProperties: 0,
        underContract: 0
      },
      actionItems: [{
        priority: 'HIGH',
        type: 'System Error',
        address: 'Control Center',
        reason: 'Failed to load dashboard data: ' + error.message
      }],
      recentLogs: [{
        timestamp: new Date(),
        eventType: 'ERROR',
        module: 'Dashboard',
        message: 'Control Center data loading failed: ' + error.message
      }]
    };
  }
}

/**
 * Get summary metrics for the dashboard
 * @return {Object} Summary metrics
 */
function RE_getSummaryMetrics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const verdictSheet = ss.getSheetByName(SHEET_NAMES.VERDICT);
    const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

    let hotDeals = 0;
    let solidDeals = 0;
    let totalProperties = 0;
    let underContract = 0;

    // Get total properties from MASTER_PROPERTIES
    if (masterSheet && masterSheet.getLastRow() > 1) {
      totalProperties = masterSheet.getLastRow() - 1; // Subtract header row
    }

    // Get deal counts from VERDICT
    if (verdictSheet && verdictSheet.getLastRow() > 1) {
      const verdictData = getSheetData(verdictSheet);

      verdictData.forEach(row => {
        const classification = safeString(row['Classification']).toUpperCase();
        const isUnderContract = safeString(row['Under Contract']).toUpperCase();

        // Count by classification
        if (classification === 'HOT') {
          hotDeals++;
        } else if (classification === 'SOLID') {
          solidDeals++;
        }

        // Count under contract
        if (isUnderContract === 'YES' || isUnderContract === 'TRUE' || isUnderContract === 'Y') {
          underContract++;
        }
      });
    }

    return {
      hotDeals,
      solidDeals,
      totalProperties,
      underContract
    };

  } catch (error) {
    logEvent('ERROR', 'Dashboard', 'Failed to get summary metrics', error.toString());
    return {
      hotDeals: 0,
      solidDeals: 0,
      totalProperties: 0,
      underContract: 0
    };
  }
}

/**
 * Get action items that need attention
 * @return {Array<Object>} Array of action items
 */
function RE_getActionItems() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const verdictSheet = ss.getSheetByName(SHEET_NAMES.VERDICT);
    const actionItems = [];

    if (!verdictSheet || verdictSheet.getLastRow() < 2) {
      return actionItems;
    }

    const verdictData = getSheetData(verdictSheet);

    verdictData.forEach(row => {
      const classification = safeString(row['Classification']).toUpperCase();
      const address = safeString(row['Address']);
      const actionItemsText = safeString(row['Action Items']);
      const priority = safeString(row['Priority']).toUpperCase();
      const underContract = safeString(row['Under Contract']).toUpperCase();
      const dealScore = safeNumber(row['Deal Score'], 0);
      const spread = safeNumber(row['Spread'], 0);

      // HIGH PRIORITY: Hot deals not under contract
      if (classification === 'HOT' && underContract !== 'YES' && underContract !== 'TRUE') {
        actionItems.push({
          priority: 'HIGH',
          type: 'HOT Deal - Not Contracted',
          address: address,
          reason: `Strong deal with ${formatCurrency(spread)} spread. Contact seller ASAP!`
        });
      }

      // MEDIUM PRIORITY: Solid deals not under contract
      if (classification === 'SOLID' && underContract !== 'YES' && underContract !== 'TRUE') {
        actionItems.push({
          priority: 'MEDIUM',
          type: 'SOLID Deal - Follow Up',
          address: address,
          reason: `Good opportunity with ${formatCurrency(spread)} potential profit.`
        });
      }

      // MEDIUM PRIORITY: Deals with specific action items noted
      if (actionItemsText && actionItemsText.length > 0 && actionItemsText !== '-') {
        actionItems.push({
          priority: priority || 'MEDIUM',
          type: 'Action Required',
          address: address,
          reason: actionItemsText
        });
      }

      // HIGH PRIORITY: High score deals (>80) not contracted
      if (dealScore >= 80 && underContract !== 'YES' && underContract !== 'TRUE') {
        actionItems.push({
          priority: 'HIGH',
          type: 'High Score Deal',
          address: address,
          reason: `Deal score: ${dealScore}. Excellent opportunity!`
        });
      }
    });

    // Sort by priority (HIGH first, then MEDIUM, then LOW)
    const priorityOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    actionItems.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 3;
      const priorityB = priorityOrder[b.priority] || 3;
      return priorityA - priorityB;
    });

    // Limit to top 20 action items
    return actionItems.slice(0, 20);

  } catch (error) {
    logEvent('ERROR', 'Dashboard', 'Failed to get action items', error.toString());
    return [];
  }
}

/**
 * Get recent log entries
 * @param {number} limit - Maximum number of logs to return
 * @return {Array<Object>} Array of log entries
 */
function RE_getRecentLogs(limit = 15) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEET_NAMES.SYSTEM_LOG);

    if (!logSheet || logSheet.getLastRow() < 2) {
      return [{
        timestamp: new Date(),
        eventType: 'INFO',
        module: 'System',
        message: 'No activity logged yet. System is ready to use.'
      }];
    }

    const lastRow = logSheet.getLastRow();
    const startRow = Math.max(2, lastRow - limit + 1);
    const numRows = lastRow - startRow + 1;

    const headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
    const data = logSheet.getRange(startRow, 1, numRows, logSheet.getLastColumn()).getValues();

    const logs = data.map(row => {
      const log = {};
      headers.forEach((header, index) => {
        log[header] = row[index];
      });
      return {
        timestamp: log['Timestamp'],
        eventType: safeString(log['Event Type']),
        module: safeString(log['Module']),
        message: safeString(log['Message'])
      };
    });

    // Reverse to show most recent first
    return logs.reverse();

  } catch (error) {
    console.error('Failed to get recent logs:', error);
    return [{
      timestamp: new Date(),
      eventType: 'ERROR',
      module: 'Dashboard',
      message: 'Failed to load recent logs: ' + error.message
    }];
  }
}

/**
 * Get deal statistics for charts/graphs
 * @return {Object} Deal statistics
 */
function RE_getDealStatistics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const verdictSheet = ss.getSheetByName(SHEET_NAMES.VERDICT);

    if (!verdictSheet || verdictSheet.getLastRow() < 2) {
      return {
        byClassification: { HOT: 0, SOLID: 0, MARGINAL: 0, PASS: 0 },
        byRiskScore: { Low: 0, Medium: 0, High: 0 },
        byCity: {},
        totalValue: 0,
        totalPotentialProfit: 0
      };
    }

    const data = getSheetData(verdictSheet);
    const stats = {
      byClassification: { HOT: 0, SOLID: 0, MARGINAL: 0, PASS: 0 },
      byRiskScore: { Low: 0, Medium: 0, High: 0 },
      byCity: {},
      totalValue: 0,
      totalPotentialProfit: 0
    };

    data.forEach(row => {
      const classification = safeString(row['Classification']).toUpperCase();
      const riskScore = safeNumber(row['Risk Score'], 0);
      const city = safeString(row['City']);
      const askingPrice = safeNumber(row['Asking Price'], 0);
      const profit = safeNumber(row['Profit Potential'], 0);

      // Count by classification
      if (stats.byClassification.hasOwnProperty(classification)) {
        stats.byClassification[classification]++;
      }

      // Count by risk score
      if (riskScore <= 3) {
        stats.byRiskScore.Low++;
      } else if (riskScore <= 6) {
        stats.byRiskScore.Medium++;
      } else {
        stats.byRiskScore.High++;
      }

      // Count by city
      if (city) {
        stats.byCity[city] = (stats.byCity[city] || 0) + 1;
      }

      // Sum totals
      stats.totalValue += askingPrice;
      stats.totalPotentialProfit += profit;
    });

    return stats;

  } catch (error) {
    logEvent('ERROR', 'Dashboard', 'Failed to get deal statistics', error.toString());
    return {
      byClassification: { HOT: 0, SOLID: 0, MARGINAL: 0, PASS: 0 },
      byRiskScore: { Low: 0, Medium: 0, High: 0 },
      byCity: {},
      totalValue: 0,
      totalPotentialProfit: 0
    };
  }
}

/**
 * Get performance metrics
 * @return {Object} Performance metrics
 */
function RE_getPerformanceMetrics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const verdictSheet = ss.getSheetByName(SHEET_NAMES.VERDICT);

    if (!verdictSheet || verdictSheet.getLastRow() < 2) {
      return {
        averageDealScore: 0,
        averageProfit: 0,
        averageROI: 0,
        conversionRate: 0,
        totalUnderContract: 0
      };
    }

    const data = getSheetData(verdictSheet);
    let totalScore = 0;
    let totalProfit = 0;
    let totalROI = 0;
    let countHotOrSolid = 0;
    let countUnderContract = 0;

    data.forEach(row => {
      const classification = safeString(row['Classification']).toUpperCase();
      const dealScore = safeNumber(row['Deal Score'], 0);
      const profit = safeNumber(row['Profit Potential'], 0);
      const askingPrice = safeNumber(row['Asking Price'], 1);
      const underContract = safeString(row['Under Contract']).toUpperCase();

      totalScore += dealScore;
      totalProfit += profit;

      if (askingPrice > 0) {
        totalROI += (profit / askingPrice) * 100;
      }

      if (classification === 'HOT' || classification === 'SOLID') {
        countHotOrSolid++;
      }

      if (underContract === 'YES' || underContract === 'TRUE') {
        countUnderContract++;
      }
    });

    const count = data.length;
    const conversionRate = countHotOrSolid > 0 ? (countUnderContract / countHotOrSolid) * 100 : 0;

    return {
      averageDealScore: count > 0 ? Math.round(totalScore / count) : 0,
      averageProfit: count > 0 ? Math.round(totalProfit / count) : 0,
      averageROI: count > 0 ? Math.round(totalROI / count) : 0,
      conversionRate: Math.round(conversionRate),
      totalUnderContract: countUnderContract
    };

  } catch (error) {
    logEvent('ERROR', 'Dashboard', 'Failed to get performance metrics', error.toString());
    return {
      averageDealScore: 0,
      averageProfit: 0,
      averageROI: 0,
      conversionRate: 0,
      totalUnderContract: 0
    };
  }
}
