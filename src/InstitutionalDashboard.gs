/**
 * Quantum Real Estate Analyzer - Institutional Dashboard
 * KPI visibility, metrics, charts data, and dashboard refresh
 */

// ============================================================
// MAIN DASHBOARD REFRESH
// ============================================================

/**
 * Refreshes the Institutional Dashboard with current metrics
 */
function refreshInstitutionalDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName(CONFIG.SHEETS.INST_DASHBOARD);
  if (!dashSheet) return;

  logEvent('INST', 'Refreshing institutional dashboard');

  // Gather all metrics
  const metrics = gatherInstitutionalMetrics_();

  // Clear existing data
  if (dashSheet.getLastRow() > 1) {
    dashSheet.getRange(2, 1, dashSheet.getLastRow() - 1, 5).clearContent();
  }

  // Build dashboard data rows
  const now = new Date();
  const dashData = [
    // ── DEAL INVENTORY ──
    ['DEAL INVENTORY', '', '', '', ''],
    ['', 'Total Deals Analyzed', metrics.totalDeals, '', now],
    ['', 'Institutional Prime', metrics.instPrime, `${metrics.instPrimePercent}% of total`, ''],
    ['', 'Institutional Fit', metrics.instFit, `${metrics.instFitPercent}% of total`, ''],
    ['', 'Local Landlord Fit', metrics.localLandlord, '', ''],
    ['', 'Portfolio Only', metrics.portfolioOnly, '', ''],
    ['', 'Not Institutional', metrics.notInstitutional, '', ''],
    ['', 'Portfolio-Eligible Deals', metrics.portfolioEligible, '', ''],
    ['', 'Avg Institutional Score', metrics.avgInstScore, `out of 100`, ''],
    ['', 'Avg Cap Rate (Inst Inventory)', metrics.avgCapRate, '', ''],
    ['', '', '', '', ''],

    // ── BUYER METRICS ──
    ['BUYER METRICS', '', '', '', ''],
    ['', 'Total Active Buyers', metrics.activeBuyers, '', now],
    ['', 'Hot Buyers', metrics.hotBuyers, '', ''],
    ['', 'Platinum Tier Buyers', metrics.platinumBuyers, '', ''],
    ['', 'Gold Tier Buyers', metrics.goldBuyers, '', ''],
    ['', 'Bulk Buyers', metrics.bulkBuyers, '', ''],
    ['', '', '', '', ''],

    // ── MATCHING METRICS ──
    ['MATCHING & DISPOSITION', '', '', '', ''],
    ['', 'Total Matches Generated', metrics.totalMatches, '', now],
    ['', 'Matches This Week', metrics.matchesThisWeek, '', ''],
    ['', 'Avg Match Score', metrics.avgMatchScore, `out of 100`, ''],
    ['', 'Packages Ready', metrics.packagesReady, '', ''],
    ['', 'Incomplete Packages', metrics.incompletePackages, '', ''],
    ['', '', '', '', ''],

    // ── DISPOSITION FUNNEL ──
    ['DISPOSITION FUNNEL', '', '', '', ''],
    ['', 'Packages Sent', metrics.dispo.sent, '', now],
    ['', 'Awaiting Response', metrics.dispo.awaiting, '', ''],
    ['', 'Interested Buyers', metrics.dispo.interested, '', ''],
    ['', 'In Negotiation', metrics.dispo.negotiating, '', ''],
    ['', 'Closed Dispositions', metrics.dispo.closed, '', ''],
    ['', 'Buyer Passed', metrics.dispo.passed, '', ''],
    ['', 'Response Rate', `${metrics.dispo.responseRate}%`, '', ''],
    ['', 'Close Rate', `${metrics.dispo.closeRate}%`, '', ''],
    ['', 'Follow-Ups Due', metrics.dispo.followUpsDue, metrics.dispo.followUpsDue > 0 ? 'ACTION NEEDED' : 'None', ''],
    ['', '', '', '', ''],

    // ── PORTFOLIO OPPORTUNITIES ──
    ['PORTFOLIO OPPORTUNITIES', '', '', '', ''],
    ['', 'Active Portfolios', metrics.activePortfolios, '', now],
    ['', 'Avg Portfolio Appeal Score', metrics.avgPortfolioAppeal, `out of 100`, ''],
    ['', 'Bulk Ready Portfolios', metrics.bulkReadyPortfolios, '', ''],
    ['', 'Total Portfolio Value', `$${metrics.totalPortfolioValue.toLocaleString()}`, '', ''],
    ['', '', '', '', ''],

    // ── MARKET CONCENTRATION ──
    ['MARKET CONCENTRATION', '', '', '', ''],
    ['', 'ZIPs with 3+ Deals', metrics.concentratedZips, '', now],
    ['', 'Top Concentrated ZIP', metrics.topConcentratedZip, `${metrics.topConcentratedCount} deals`, '']
  ];

  dashSheet.getRange(2, 1, dashData.length, 5).setValues(dashData);

  // Apply dashboard formatting
  formatInstitutionalDashboard_(dashSheet, dashData.length);

  logEvent('INST', 'Institutional dashboard refreshed');
}

// ============================================================
// METRICS GATHERING
// ============================================================

function gatherInstitutionalMetrics_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Deal inventory metrics
  const dealMetrics = gatherDealInventoryMetrics_(ss);
  // Buyer metrics
  const buyerMetrics = gatherBuyerMetrics_(ss);
  // Match metrics
  const matchMetrics = gatherMatchMetrics_(ss);
  // Disposition metrics
  const dispoMetrics = getDispositionStatistics();
  // Portfolio metrics
  const portfolioMetrics = gatherPortfolioMetrics_(ss);
  // Market concentration
  const concentrationMetrics = gatherConcentrationMetrics_();

  return {
    ...dealMetrics,
    ...buyerMetrics,
    ...matchMetrics,
    dispo: dispoMetrics,
    ...portfolioMetrics,
    ...concentrationMetrics
  };
}

function gatherDealInventoryMetrics_(ss) {
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return {
      totalDeals: 0, instPrime: 0, instFit: 0, localLandlord: 0,
      portfolioOnly: 0, notInstitutional: 0, portfolioEligible: 0,
      avgInstScore: 0, avgCapRate: '0%',
      instPrimePercent: 0, instFitPercent: 0
    };
  }

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];
  const gradeCol = headers.indexOf('Institutional Grade');
  const scoreCol = headers.indexOf('Institutional Grade Score');
  const portfolioCol = headers.indexOf('Portfolio Eligible');
  const capRateCol = headers.indexOf('Cap Rate');

  let totalDeals = 0, instPrime = 0, instFit = 0, localLandlord = 0;
  let portfolioOnly = 0, notInstitutional = 0, portfolioEligible = 0;
  let scoreSum = 0, scoreCount = 0;
  let capRateSum = 0, capRateCount = 0;

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    totalDeals++;

    const grade = data[i][gradeCol] || '';
    if (grade === 'INSTITUTIONAL PRIME') instPrime++;
    else if (grade === 'INSTITUTIONAL FIT') instFit++;
    else if (grade === 'LOCAL LANDLORD FIT') localLandlord++;
    else if (grade === 'PORTFOLIO ONLY') portfolioOnly++;
    else notInstitutional++;

    if (data[i][portfolioCol] === 'Yes') portfolioEligible++;

    const score = parseFloat(data[i][scoreCol]);
    if (score > 0) { scoreSum += score; scoreCount++; }

    const capRate = parseFloat(data[i][capRateCol]);
    if (capRate > 0) { capRateSum += capRate; capRateCount++; }
  }

  const avgInstScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
  const avgCapRate = capRateCount > 0 ? (Math.round(capRateSum / capRateCount * 1000) / 10) + '%' : '0%';

  return {
    totalDeals, instPrime, instFit, localLandlord, portfolioOnly, notInstitutional,
    portfolioEligible, avgInstScore, avgCapRate,
    instPrimePercent: totalDeals > 0 ? Math.round(instPrime / totalDeals * 100) : 0,
    instFitPercent: totalDeals > 0 ? Math.round(instFit / totalDeals * 100) : 0
  };
}

function gatherBuyerMetrics_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUYERS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { activeBuyers: 0, hotBuyers: 0, platinumBuyers: 0, goldBuyers: 0, bulkBuyers: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('Buyer Status');
  const warmthCol = headers.indexOf('Warmth Status');
  const tierCol = headers.indexOf('Buyer Reliability Tier');
  const bulkCol = headers.indexOf('Bulk Buyer?');

  let activeBuyers = 0, hotBuyers = 0, platinumBuyers = 0, goldBuyers = 0, bulkBuyers = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][statusCol] === 'Active') activeBuyers++;
    if (data[i][warmthCol] === 'Hot') hotBuyers++;
    if (data[i][tierCol] === 'PLATINUM') platinumBuyers++;
    if (data[i][tierCol] === 'GOLD') goldBuyers++;
    if (data[i][bulkCol] === 'Yes') bulkBuyers++;
  }

  return { activeBuyers, hotBuyers, platinumBuyers, goldBuyers, bulkBuyers };
}

function gatherMatchMetrics_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUY_BOX_MATCHER);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { totalMatches: 0, matchesThisWeek: 0, avgMatchScore: 0, packagesReady: 0, incompletePackages: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const scoreCol = headers.indexOf('Buy Box Match Score');

  let totalMatches = 0, scoreSum = 0;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let matchesThisWeek = 0;

  for (let i = 1; i < data.length; i++) {
    if (!data[i][1]) continue; // Skip empty rows
    totalMatches++;
    const score = parseFloat(data[i][scoreCol]) || 0;
    scoreSum += score;
  }

  // Package stats
  const packageSheet = ss.getSheetByName(CONFIG.SHEETS.INST_DEAL_PACKAGE);
  let packagesReady = 0, incompletePackages = 0;
  if (packageSheet && packageSheet.getLastRow() > 1) {
    const pkgData = packageSheet.getDataRange().getValues();
    const pkgHeaders = pkgData[0];
    const readyCol = pkgHeaders.indexOf('Package Ready?');

    for (let i = 1; i < pkgData.length; i++) {
      if (pkgData[i][readyCol] === 'Yes') packagesReady++;
      else if (pkgData[i][readyCol] === 'Incomplete') incompletePackages++;
    }
  }

  return {
    totalMatches,
    matchesThisWeek,
    avgMatchScore: totalMatches > 0 ? Math.round(scoreSum / totalMatches) : 0,
    packagesReady,
    incompletePackages
  };
}

function gatherPortfolioMetrics_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_PORTFOLIO_BUILDER);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { activePortfolios: 0, avgPortfolioAppeal: 0, bulkReadyPortfolios: 0, totalPortfolioValue: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const appealCol = headers.indexOf('Institutional Appeal Score');
  const bulkCol = headers.indexOf('Bulk Buyer Fit');
  const totalCostCol = headers.indexOf('Total Estimated Portfolio Cost');

  let activePortfolios = 0, appealSum = 0, bulkReady = 0, totalValue = 0;

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    activePortfolios++;
    appealSum += parseFloat(data[i][appealCol]) || 0;
    if (data[i][bulkCol] === 'BULK READY') bulkReady++;
    totalValue += parseFloat(data[i][totalCostCol]) || 0;
  }

  return {
    activePortfolios,
    avgPortfolioAppeal: activePortfolios > 0 ? Math.round(appealSum / activePortfolios) : 0,
    bulkReadyPortfolios: bulkReady,
    totalPortfolioValue: totalValue
  };
}

function gatherConcentrationMetrics_() {
  const concentrations = detectMarketConcentration();
  const zips = Object.entries(concentrations);
  const concentratedZips = zips.filter(([, count]) => count >= 3).length;

  let topZip = '';
  let topCount = 0;
  zips.forEach(([zip, count]) => {
    if (count > topCount) { topZip = zip; topCount = count; }
  });

  return {
    concentratedZips,
    topConcentratedZip: topZip || 'None',
    topConcentratedCount: topCount
  };
}

// ============================================================
// DASHBOARD FORMATTING
// ============================================================

function formatInstitutionalDashboard_(sheet, dataLength) {
  // Style section headers
  for (let i = 2; i <= dataLength + 1; i++) {
    const sectionVal = sheet.getRange(i, 1).getValue();
    if (sectionVal && String(sectionVal).trim() !== '') {
      // This is a section header row
      const row = sheet.getRange(i, 1, 1, 5);
      row.setBackground('#0D47A1')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(11);
      sheet.setRowHeight(i, 36);
    }
  }

  // Highlight action-needed items
  for (let i = 2; i <= dataLength + 1; i++) {
    const detail = sheet.getRange(i, 4).getValue();
    if (detail === 'ACTION NEEDED') {
      sheet.getRange(i, 4).setBackground('#FFCDD2').setFontColor('#B71C1C').setFontWeight('bold');
    }
  }

  // Column widths
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 140);
}

// ============================================================
// CHART DATA (FOR HTML UI)
// ============================================================

/**
 * Gets chart-ready data for institutional dashboard HTML
 */
function getInstitutionalChartData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  if (!masterSheet || masterSheet.getLastRow() <= 1) return {};

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];

  // Grade distribution
  const gradeCol = headers.indexOf('Institutional Grade');
  const zipCol = headers.indexOf('ZIP');
  const capRateCol = headers.indexOf('Cap Rate');

  const gradeDist = {};
  const zipDist = {};
  const capRateBuckets = { 'Under 4%': 0, '4-6%': 0, '6-8%': 0, '8-10%': 0, 'Over 10%': 0 };

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;

    // Grade distribution
    const grade = data[i][gradeCol] || 'Unknown';
    gradeDist[grade] = (gradeDist[grade] || 0) + 1;

    // ZIP distribution (top 10)
    const zip = String(data[i][zipCol] || '');
    if (zip && grade !== 'NOT INSTITUTIONAL') {
      zipDist[zip] = (zipDist[zip] || 0) + 1;
    }

    // Cap rate distribution
    const capRate = parseFloat(data[i][capRateCol]) || 0;
    if (capRate > 0) {
      if (capRate < 0.04) capRateBuckets['Under 4%']++;
      else if (capRate < 0.06) capRateBuckets['4-6%']++;
      else if (capRate < 0.08) capRateBuckets['6-8%']++;
      else if (capRate < 0.10) capRateBuckets['8-10%']++;
      else capRateBuckets['Over 10%']++;
    }
  }

  // Top ZIPs
  const topZips = Object.entries(zipDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Buyer type distribution
  const buyerTypeDist = {};
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUYERS);
  if (buyerSheet && buyerSheet.getLastRow() > 1) {
    const bData = buyerSheet.getDataRange().getValues();
    const bHeaders = bData[0];
    const typeCol = bHeaders.indexOf('Buyer Type');
    for (let i = 1; i < bData.length; i++) {
      const type = bData[i][typeCol] || 'Other';
      buyerTypeDist[type] = (buyerTypeDist[type] || 0) + 1;
    }
  }

  // Disposition funnel
  const dispoStats = getDispositionStatistics();

  return {
    gradeDistribution: gradeDist,
    topZips: topZips,
    capRateDistribution: capRateBuckets,
    buyerTypeDistribution: buyerTypeDist,
    dispositionFunnel: {
      'Packages Sent': dispoStats.sent,
      'Awaiting Response': dispoStats.awaiting,
      'Interested': dispoStats.interested,
      'Negotiating': dispoStats.negotiating,
      'Closed': dispoStats.closed,
      'Passed': dispoStats.passed
    }
  };
}

/**
 * Gets all institutional metrics for HTML dashboard
 */
function getInstitutionalDashboardData() {
  return {
    metrics: gatherInstitutionalMetrics_(),
    charts: getInstitutionalChartData(),
    followUps: getFollowUpReminders().slice(0, 10),
    incompletePackages: getIncompletePackages().slice(0, 5)
  };
}
