/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_dashboard.gs - Dashboard & Analytics
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Populates DASHBOARD_ANALYTICS with KPIs and metrics:
 * - Deal counts by classification
 * - Total profit potential
 * - Pipeline value
 * - Activity metrics
 * - Velocity metrics
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD UPDATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Updates all dashboard metrics
 */
function RE_updateDashboard() {
  RE_logInfo('RE_updateDashboard', 'Updating dashboard analytics');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD_ANALYTICS);

  if (!dashboardSheet) {
    RE_logError('RE_updateDashboard', 'Dashboard sheet not found');
    return;
  }

  // Clear existing data (except headers)
  if (dashboardSheet.getLastRow() > 1) {
    dashboardSheet.deleteRows(2, dashboardSheet.getLastRow() - 1);
  }

  const metrics = [];

  // Deal Count Metrics
  const counts = RE_getDealCounts();
  metrics.push(['Total Properties', counts.total, '', '', 'Deal Counts', new Date()]);
  metrics.push(['Hot Deals', counts.hot, '', '', 'Deal Counts', new Date()]);
  metrics.push(['Solid Deals', counts.solid, '', '', 'Deal Counts', new Date()]);
  metrics.push(['Portfolio Deals', counts.portfolio, '', '', 'Deal Counts', new Date()]);
  metrics.push(['Pass Deals', counts.pass, '', '', 'Deal Counts', new Date()]);

  // Status Metrics
  metrics.push(['New Leads', counts.newLeads, '', '', 'Status', new Date()]);
  metrics.push(['Under Contract', counts.underContract, '', '', 'Status', new Date()]);

  // Financial Metrics
  const financials = RE_calculateFinancialMetrics();
  metrics.push(['Total Profit Potential', RE_formatDollar(financials.totalProfit), '', '', 'Financial', new Date()]);
  metrics.push(['Hot Deals Profit', RE_formatDollar(financials.hotProfit), '', '', 'Financial', new Date()]);
  metrics.push(['Solid Deals Profit', RE_formatDollar(financials.solidProfit), '', '', 'Financial', new Date()]);
  metrics.push(['Avg Profit per Hot Deal', RE_formatDollar(financials.avgHotProfit), '', '', 'Financial', new Date()]);
  metrics.push(['Pipeline Value (ARV)', RE_formatDollar(financials.pipelineARV), '', '', 'Financial', new Date()]);

  // Market Metrics
  const marketMetrics = RE_calculateMarketMetrics();
  metrics.push(['Avg Market Volume Score', marketMetrics.avgVolumeScore.toFixed(1), '', '', 'Market', new Date()]);
  metrics.push(['Avg Velocity Score', marketMetrics.avgVelocityScore.toFixed(1), '', '', 'Market', new Date()]);
  metrics.push(['Avg Risk Score', marketMetrics.avgRiskScore.toFixed(1), '', '', 'Market', new Date()]);

  // Activity Metrics
  const activityMetrics = RE_calculateActivityMetrics();
  metrics.push(['Total Leads Imported', activityMetrics.totalLeads, '', '', 'Activity', new Date()]);
  metrics.push(['Properties Analyzed', activityMetrics.analyzed, '', '', 'Activity', new Date()]);
  metrics.push(['Offers Made', activityMetrics.offersMade, '', '', 'Activity', new Date()]);
  metrics.push(['Buyers in Database', activityMetrics.buyersCount, '', '', 'Activity', new Date()]);

  // Write to dashboard
  if (metrics.length > 0) {
    dashboardSheet.getRange(2, 1, metrics.length, 6).setValues(metrics);
  }

  RE_logSuccess('RE_updateDashboard', `Updated ${metrics.length} dashboard metrics`);
}

/**
 * Calculates financial metrics
 *
 * @returns {Object} Financial metrics
 */
function RE_calculateFinancialMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  const metrics = {
    totalProfit: 0,
    hotProfit: 0,
    solidProfit: 0,
    portfolioProfit: 0,
    avgHotProfit: 0,
    pipelineARV: 0,
    hotDealsCount: 0
  };

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return metrics;
  }

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    const dealClass = RE_getValueByHeader(data[i], 'Deal Class', headerMap);
    const profitPotential = RE_toNumber(RE_getValueByHeader(data[i], 'Profit Potential', headerMap));
    const arv = RE_toNumber(RE_getValueByHeader(data[i], 'Estimated ARV', headerMap));

    metrics.totalProfit += profitPotential;
    metrics.pipelineARV += arv;

    if (dealClass === DEAL_CLASSES.HOT) {
      metrics.hotProfit += profitPotential;
      metrics.hotDealsCount++;
    } else if (dealClass === DEAL_CLASSES.SOLID) {
      metrics.solidProfit += profitPotential;
    } else if (dealClass === DEAL_CLASSES.PORTFOLIO) {
      metrics.portfolioProfit += profitPotential;
    }
  }

  // Calculate averages
  if (metrics.hotDealsCount > 0) {
    metrics.avgHotProfit = metrics.hotProfit / metrics.hotDealsCount;
  }

  return metrics;
}

/**
 * Calculates market metrics
 *
 * @returns {Object} Market metrics
 */
function RE_calculateMarketMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  const metrics = {
    avgVolumeScore: 0,
    avgVelocityScore: 0,
    avgRiskScore: 0,
    count: 0
  };

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return metrics;
  }

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let totalVolume = 0;
  let totalVelocity = 0;
  let totalRisk = 0;
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const volumeScore = RE_toNumber(RE_getValueByHeader(data[i], 'Market Volume Score', headerMap));
    const velocityScore = RE_toNumber(RE_getValueByHeader(data[i], 'Sales Velocity Score', headerMap));
    const riskScore = RE_toNumber(RE_getValueByHeader(data[i], 'Risk Score', headerMap));

    if (volumeScore > 0 || velocityScore > 0 || riskScore > 0) {
      totalVolume += volumeScore;
      totalVelocity += velocityScore;
      totalRisk += riskScore;
      count++;
    }
  }

  if (count > 0) {
    metrics.avgVolumeScore = totalVolume / count;
    metrics.avgVelocityScore = totalVelocity / count;
    metrics.avgRiskScore = totalRisk / count;
    metrics.count = count;
  }

  return metrics;
}

/**
 * Calculates activity metrics
 *
 * @returns {Object} Activity metrics
 */
function RE_calculateActivityMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const trackerSheet = ss.getSheetByName(SHEET_NAMES.LEADS_TRACKER);
  const buyersSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DB);
  const offersSheet = ss.getSheetByName(SHEET_NAMES.OFFERS_DISPO);

  const metrics = {
    totalLeads: 0,
    analyzed: 0,
    offersMade: 0,
    buyersCount: 0
  };

  // Count leads in tracker
  if (trackerSheet && trackerSheet.getLastRow() > 1) {
    metrics.totalLeads = trackerSheet.getLastRow() - 1;
  }

  // Count analyzed properties
  if (masterSheet && masterSheet.getLastRow() > 1) {
    const data = masterSheet.getDataRange().getValues();
    const headerMap = RE_createHeaderMap(data[0]);

    for (let i = 1; i < data.length; i++) {
      const dealClass = RE_getValueByHeader(data[i], 'Deal Class', headerMap);
      if (dealClass && dealClass !== '') {
        metrics.analyzed++;
      }
    }
  }

  // Count offers made
  if (offersSheet && offersSheet.getLastRow() > 1) {
    metrics.offersMade = offersSheet.getLastRow() - 1;
  }

  // Count active buyers
  if (buyersSheet && buyersSheet.getLastRow() > 1) {
    const buyersData = buyersSheet.getDataRange().getValues();
    const buyersHeaderMap = RE_createHeaderMap(buyersData[0]);

    for (let i = 1; i < buyersData.length; i++) {
      const status = RE_getValueByHeader(buyersData[i], 'Status', buyersHeaderMap);
      if (status === 'Active') {
        metrics.buyersCount++;
      }
    }
  }

  return metrics;
}

/**
 * Gets dashboard summary for UI display
 *
 * @returns {Object} Dashboard summary
 */
function RE_getDashboardSummary() {
  const counts = RE_getDealCounts();
  const financials = RE_calculateFinancialMetrics();
  const actionItems = RE_getActionItems();

  return {
    hotDeals: counts.hot,
    solidDeals: counts.solid,
    totalProperties: counts.total,
    underContract: counts.underContract,
    hotProfit: financials.hotProfit,
    totalProfit: financials.totalProfit,
    actionItemsCount: actionItems.length,
    pipelineValue: financials.pipelineARV
  };
}

/**
 * Gets recent log entries for dashboard display
 *
 * @param {number} limit - Number of entries to return
 * @returns {Array} Array of log entries
 */
function RE_getRecentLogs(limit = 5) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_NAMES.SYSTEM_LOG);

  if (!logSheet || logSheet.getLastRow() <= 1) {
    return [];
  }

  const lastRow = logSheet.getLastRow();
  const startRow = Math.max(2, lastRow - limit + 1);
  const numRows = lastRow - startRow + 1;

  const data = logSheet.getRange(startRow, 1, numRows, 6).getValues();

  // Reverse to show most recent first
  return data.reverse().map(row => ({
    timestamp: row[0],
    eventType: row[1],
    module: row[2],
    message: row[3],
    details: row[4],
    user: row[5]
  }));
}
