/**
 * Quantum Real Estate Analyzer - Automation Center Module
 * Handles scheduled jobs, pipeline automation, and safety controls
 */

// ============================================================
// AUTOMATION ORCHESTRATION
// ============================================================

/**
 * Runs the full pipeline with safety controls
 */
function runFullPipelineSafe() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Check for lock to prevent concurrent runs
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(5000);

  if (!hasLock) {
    logEvent('AUTOMATION', 'Pipeline already running - skipped');
    ss.toast('Pipeline already in progress', 'Skipped', 3);
    return { skipped: true, reason: 'Already running' };
  }

  try {
    const startTime = new Date();
    logEvent('AUTOMATION', 'Starting safe pipeline run');

    // Run pipeline
    runFullPipeline();

    const duration = ((new Date() - startTime) / 1000).toFixed(1);
    logEvent('AUTOMATION', `Safe pipeline completed in ${duration}s`);

    return { success: true, duration: duration };

  } catch (error) {
    logError('AUTOMATION', 'Pipeline failed: ' + error.message, error.stack);
    return { error: error.message };

  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// SCHEDULED JOBS
// ============================================================

/**
 * Creates all automation triggers
 */
function setupAutomationTriggers() {
  // Delete existing triggers
  const existingTriggers = ScriptApp.getProjectTriggers();
  existingTriggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Create onOpen trigger
  ScriptApp.newTrigger('onOpen')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onOpen()
    .create();

  // Nightly refresh (2 AM)
  if (getSetting('auto_nightly_refresh', 'true') === 'true') {
    ScriptApp.newTrigger('nightlyRefresh')
      .timeBased()
      .atHour(2)
      .everyDays(1)
      .inTimezone(getSetting('timezone', 'America/New_York'))
      .create();
  }

  // Hourly dashboard update
  if (getSetting('auto_dashboard_update', 'true') === 'true') {
    ScriptApp.newTrigger('refreshDashboard')
      .timeBased()
      .everyHours(1)
      .create();
  }

  // Speed-to-lead check (every 5 minutes)
  if (getSetting('auto_stl_check', 'true') === 'true') {
    ScriptApp.newTrigger('checkSpeedToLeadSLA')
      .timeBased()
      .everyMinutes(5)
      .create();
  }

  logEvent('AUTOMATION', 'Triggers configured');
  return { success: true };
}

/**
 * Lists all current triggers
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  return triggers.map(t => ({
    id: t.getUniqueId(),
    handlerFunction: t.getHandlerFunction(),
    eventType: t.getEventType().toString(),
    triggerSource: t.getTriggerSource().toString()
  }));
}

/**
 * Removes all triggers
 */
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  logEvent('AUTOMATION', 'All triggers removed');
  return { removed: triggers.length };
}

// ============================================================
// DASHBOARD REFRESH
// ============================================================

/**
 * Refreshes the dashboard with current metrics
 */
function refreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);

  if (!dashboardSheet) return;

  logEvent('DASHBOARD', 'Refreshing dashboard');

  // Gather metrics
  const metrics = gatherDashboardMetrics();

  // Clear existing data (keep header)
  if (dashboardSheet.getLastRow() > 1) {
    dashboardSheet.getRange(2, 1, dashboardSheet.getLastRow() - 1, 5).clearContent();
  }

  // Build dashboard rows
  const dashboardData = [
    ['Total Leads', metrics.totalLeads, '', '', new Date()],
    ['HOT Deals', metrics.hotDeals, '', '', ''],
    ['SOLID Deals', metrics.solidDeals, '', '', ''],
    ['HOLD Deals', metrics.holdDeals, '', '', ''],
    ['PASS Deals', metrics.passDeals, '', '', ''],
    ['', '', '', '', ''],
    ['Avg Deal Score', metrics.avgDealScore, '', '', ''],
    ['Avg Risk Score', metrics.avgRiskScore, '', '', ''],
    ['', '', '', '', ''],
    ['STL - Optimal', metrics.stlOptimal, '', '', ''],
    ['STL - Breach', metrics.stlBreach, '', '', ''],
    ['Avg Response Time', metrics.avgResponseTime + ' min', '', '', ''],
    ['', '', '', '', ''],
    ['CRM Synced', metrics.crmSynced, '', '', ''],
    ['CRM Pending', metrics.crmPending, '', '', ''],
    ['', '', '', '', ''],
    ['Active Buyers', metrics.activeBuyers, '', '', ''],
    ['', '', '', '', ''],
    ['Offers Sent', metrics.offersSent, '', '', ''],
    ['Offers Accepted', metrics.offersAccepted, '', '', ''],
    ['', '', '', '', ''],
    ['Last Pipeline Run', metrics.lastPipelineRun, '', '', ''],
    ['System Health', metrics.systemHealth, '', '', '']
  ];

  dashboardSheet.getRange(2, 1, dashboardData.length, 5).setValues(dashboardData);

  // Apply formatting
  formatDashboardMetrics(dashboardSheet);

  logEvent('DASHBOARD', 'Dashboard refreshed');
}

/**
 * Gathers all dashboard metrics
 */
function gatherDashboardMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get verdict counts
  const verdictCounts = getVerdictCounts();

  // Get STL stats
  const stlStats = getSTLStatistics();

  // Get CRM stats
  const crmStats = getCRMSyncStats();

  // Get buyer stats
  const buyerStats = getBuyerStatistics();

  // Get offer stats
  const offerStats = getOfferStatistics();

  // Get scores
  const scoreStats = getScoreStatistics();

  return {
    totalLeads: verdictCounts.total,
    hotDeals: verdictCounts.HOT || 0,
    solidDeals: verdictCounts.SOLID || 0,
    holdDeals: verdictCounts.HOLD || 0,
    passDeals: verdictCounts.PASS || 0,
    avgDealScore: scoreStats.avgDealScore,
    avgRiskScore: scoreStats.avgRiskScore,
    stlOptimal: stlStats.optimal || 0,
    stlBreach: stlStats.breach || 0,
    avgResponseTime: stlStats.avgResponseTime || 'N/A',
    crmSynced: crmStats.synced || 0,
    crmPending: crmStats.pending || 0,
    activeBuyers: buyerStats.activeBuyers || 0,
    offersSent: offerStats.sent || 0,
    offersAccepted: offerStats.accepted || 0,
    lastPipelineRun: getLastPipelineRun(),
    systemHealth: getSystemHealthStatus()
  };
}

/**
 * Gets verdict counts
 */
function getVerdictCounts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { total: 0 };
  }

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const verdictCol = headers.indexOf('Verdict');
  const data = masterSheet.getDataRange().getValues();

  const counts = { total: data.length - 1, HOT: 0, SOLID: 0, HOLD: 0, PASS: 0 };

  for (let i = 1; i < data.length; i++) {
    const verdict = data[i][verdictCol];
    if (counts.hasOwnProperty(verdict)) {
      counts[verdict]++;
    }
  }

  return counts;
}

/**
 * Gets score statistics
 */
function getScoreStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { avgDealScore: 0, avgRiskScore: 0 };
  }

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const dealScoreCol = headers.indexOf('Deal Score');
  const riskScoreCol = headers.indexOf('Risk Score');
  const data = masterSheet.getDataRange().getValues();

  let dealScoreSum = 0;
  let riskScoreSum = 0;
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const dealScore = parseFloat(data[i][dealScoreCol]) || 0;
    const riskScore = parseFloat(data[i][riskScoreCol]) || 0;

    if (dealScore > 0 || riskScore > 0) {
      dealScoreSum += dealScore;
      riskScoreSum += riskScore;
      count++;
    }
  }

  return {
    avgDealScore: count > 0 ? Math.round(dealScoreSum / count) : 0,
    avgRiskScore: count > 0 ? Math.round(riskScoreSum / count) : 0
  };
}

/**
 * Gets offer statistics
 */
function getOfferStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const offersSheet = ss.getSheetByName(CONFIG.SHEETS.OFFERS);

  if (!offersSheet || offersSheet.getLastRow() <= 1) {
    return { sent: 0, accepted: 0 };
  }

  const headers = offersSheet.getRange(1, 1, 1, offersSheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Status');
  const sentDateCol = headers.indexOf('Sent Date');
  const data = offersSheet.getDataRange().getValues();

  let sent = 0;
  let accepted = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][sentDateCol]) sent++;
    if (data[i][statusCol] === 'Accepted') accepted++;
  }

  return { sent: sent, accepted: accepted };
}

/**
 * Gets last pipeline run timestamp
 */
function getLastPipelineRun() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);

  if (!logSheet || logSheet.getLastRow() <= 1) return 'Never';

  const data = logSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === 'PIPELINE' && String(data[i][2]).includes('completed')) {
      const timestamp = new Date(data[i][0]);
      return timestamp.toLocaleString();
    }
  }

  return 'Never';
}

/**
 * Gets system health status
 */
function getSystemHealthStatus() {
  const health = runHealthCheck();
  return health.hasErrors ? 'ISSUES' : 'HEALTHY';
}

/**
 * Formats dashboard metrics
 */
function formatDashboardMetrics(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  // Color code key metrics
  for (let i = 2; i <= lastRow; i++) {
    const metric = sheet.getRange(i, 1).getValue();
    const valueCell = sheet.getRange(i, 2);

    if (metric === 'HOT Deals') {
      valueCell.setBackground('#C8E6C9');
    } else if (metric === 'STL - Breach') {
      valueCell.setBackground('#FFCDD2');
    } else if (metric === 'System Health') {
      const value = valueCell.getValue();
      valueCell.setBackground(value === 'HEALTHY' ? '#C8E6C9' : '#FFCDD2');
    }
  }
}

// ============================================================
// ENRICHMENT
// ============================================================

/**
 * Runs data enrichment on leads
 */
function runEnrichment() {
  logEvent('ENRICHMENT', 'Starting data enrichment');

  // Compute market intelligence
  computeMarketIntelligence();

  // Run repair analysis
  runRepairAnalysis();

  // Compute comp confidence
  updateCompConfidence();

  logEvent('ENRICHMENT', 'Data enrichment completed');
}

/**
 * Updates comp confidence scores
 */
function updateCompConfidence() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const deal = {};
    headers.forEach((h, j) => deal[h] = data[i][j]);

    const confidence = calculateCompConfidence(deal);

    if (colMap['Comp Confidence Score']) {
      masterSheet.getRange(i + 1, colMap['Comp Confidence Score']).setValue(confidence);
    }
  }
}

// ============================================================
// CONTROL CENTER DATA
// ============================================================

/**
 * Gets control center data for HTML UI
 */
function getControlCenterData() {
  return {
    metrics: gatherDashboardMetrics(),
    triggers: listTriggers(),
    crmStatus: getCRMStatus(),
    logStats: getLogStats(),
    slaConfig: getSLAConfig(),
    recentLogs: getRecentLogs(20),
    recentErrors: getRecentErrors(5, true)
  };
}

/**
 * Gets automation status
 */
function getAutomationStatus() {
  const triggers = listTriggers();

  return {
    nightlyRefresh: triggers.some(t => t.handlerFunction === 'nightlyRefresh'),
    dashboardUpdate: triggers.some(t => t.handlerFunction === 'refreshDashboard'),
    stlCheck: triggers.some(t => t.handlerFunction === 'checkSpeedToLeadSLA'),
    totalTriggers: triggers.length
  };
}

/**
 * Toggles automation setting
 */
function toggleAutomation(settingKey, enabled) {
  setSetting(settingKey, enabled ? 'true' : 'false');

  // Recreate triggers with new settings
  setupAutomationTriggers();

  logEvent('AUTOMATION', `${settingKey} set to ${enabled}`);
  return { success: true };
}

// ============================================================
// POST-SALE FEEDBACK LOOP
// ============================================================

/**
 * Records post-sale outcome
 */
function recordPostSaleOutcome(dealId, outcomes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const postSaleSheet = ss.getSheetByName(CONFIG.SHEETS.POST_SALE);
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!postSaleSheet || !masterSheet) return { error: 'Sheets not found' };

  // Get deal data from master
  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];

  let dealData = null;
  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][masterHeaders.indexOf('Deal ID')] === dealId) {
      dealData = {};
      masterHeaders.forEach((h, j) => dealData[h] = masterData[i][j]);
      break;
    }
  }

  if (!dealData) return { error: 'Deal not found' };

  // Calculate variances
  const projectedPrice = parseFloat(dealData['Offer Price Target']) || 0;
  const actualPrice = parseFloat(outcomes.actualPrice) || 0;
  const priceVariance = projectedPrice > 0 ? ((actualPrice - projectedPrice) / projectedPrice * 100).toFixed(1) : 0;

  const projectedProfit = parseFloat(outcomes.projectedProfit) || 0;
  const actualProfit = parseFloat(outcomes.actualProfit) || 0;
  const profitVariance = projectedProfit > 0 ? ((actualProfit - projectedProfit) / projectedProfit * 100).toFixed(1) : 0;

  // Add to post-sale sheet
  const postSaleRow = [
    dealId,
    dealData['Address'],
    dealData['Best Strategy'],
    projectedPrice,
    actualPrice,
    priceVariance + '%',
    outcomes.projectedRent || '',
    outcomes.actualRent || '',
    outcomes.rentVariance || '',
    outcomes.projectedTimeline || '',
    outcomes.actualTimeline || '',
    outcomes.timelineVariance || '',
    projectedProfit,
    actualProfit,
    profitVariance + '%',
    outcomes.closeDate || new Date(),
    outcomes.notes || '',
    outcomes.lessonsLearned || '',
    generateTuneRecommendations(priceVariance, profitVariance)
  ];

  postSaleSheet.appendRow(postSaleRow);

  // Update master status
  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][masterHeaders.indexOf('Deal ID')] === dealId) {
      const statusCol = masterHeaders.indexOf('Status Stage');
      if (statusCol >= 0) {
        masterSheet.getRange(i + 1, statusCol + 1).setValue('Closed');
      }
      break;
    }
  }

  logEvent('POST-SALE', `Outcome recorded for ${dealId}`);
  return { success: true };
}

/**
 * Generates tune recommendations based on variances
 */
function generateTuneRecommendations(priceVariance, profitVariance) {
  const recommendations = [];

  const pv = parseFloat(priceVariance);
  const pfv = parseFloat(profitVariance);

  if (pv < -10) {
    recommendations.push('Consider more conservative ARV estimates');
  } else if (pv > 10) {
    recommendations.push('May be able to increase offer prices');
  }

  if (pfv < -20) {
    recommendations.push('Review rehab estimation process');
    recommendations.push('Consider higher contingency reserves');
  } else if (pfv > 20) {
    recommendations.push('Current estimates conservative - may compete more aggressively');
  }

  return recommendations.join('; ') || 'Estimates aligned with actuals';
}

/**
 * Gets post-sale analytics
 */
function getPostSaleAnalytics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const postSaleSheet = ss.getSheetByName(CONFIG.SHEETS.POST_SALE);

  if (!postSaleSheet || postSaleSheet.getLastRow() <= 1) {
    return { totalClosed: 0 };
  }

  const data = postSaleSheet.getDataRange().getValues();
  const headers = data[0];

  let totalClosed = data.length - 1;
  let totalProfit = 0;
  let avgPriceVariance = 0;
  let avgProfitVariance = 0;

  const actualProfitCol = headers.indexOf('Actual Profit');
  const priceVarCol = headers.indexOf('Price Variance');
  const profitVarCol = headers.indexOf('Profit Variance');

  for (let i = 1; i < data.length; i++) {
    totalProfit += parseFloat(data[i][actualProfitCol]) || 0;
    avgPriceVariance += parseFloat(data[i][priceVarCol]) || 0;
    avgProfitVariance += parseFloat(data[i][profitVarCol]) || 0;
  }

  return {
    totalClosed: totalClosed,
    totalProfit: totalProfit,
    avgProfit: totalClosed > 0 ? totalProfit / totalClosed : 0,
    avgPriceVariance: totalClosed > 0 ? (avgPriceVariance / totalClosed).toFixed(1) + '%' : 'N/A',
    avgProfitVariance: totalClosed > 0 ? (avgProfitVariance / totalClosed).toFixed(1) + '%' : 'N/A'
  };
}
