/**
 * Quantum Real Estate Analyzer - Portfolio Builder Engine
 * Groups properties into institutional bundles by geography, strategy, and quality
 */

// ============================================================
// MAIN PORTFOLIO BUILDER
// ============================================================

/**
 * Builds portfolio groupings from qualifying deals
 */
function updatePortfolioBuilder() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const portfolioSheet = ss.getSheetByName(CONFIG.SHEETS.INST_PORTFOLIO_BUILDER);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;
  if (!portfolioSheet) return;

  const enabled = getSetting('inst_auto_portfolio_suggestion', 'true') === 'true';
  if (!enabled) {
    logEvent('INST', 'Portfolio suggestion disabled');
    return;
  }

  logEvent('INST', 'Building portfolio groupings');

  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);

  // Collect qualifying deals
  const deals = [];
  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[colMap['Deal ID']];
    if (!dealId) continue;

    const instScore = parseFloat(row[colMap['Institutional Grade Score']]) || 0;
    const portfolioEligible = row[colMap['Portfolio Eligible']];

    // Include deals that are at least moderately institutional
    if (instScore >= 35 || portfolioEligible === 'Yes') {
      const deal = {};
      headers.forEach((h, j) => deal[h] = row[j]);
      deals.push(deal);
    }
  }

  if (deals.length < 2) {
    logEvent('INST', 'Not enough qualifying deals for portfolio grouping');
    return;
  }

  // Group deals into portfolios
  const portfolios = buildPortfolioGroups_(deals);

  // Write to Portfolio Builder sheet
  const portfolioHeaders = CONFIG.COLUMNS.INST_PORTFOLIO_BUILDER;
  const portfolioRows = portfolios.map(p => [
    p.groupId,
    p.name,
    p.dealCount,
    p.state,
    p.city,
    p.zipCluster,
    p.assetTypeMix,
    p.strategyMix,
    p.avgAskingPrice,
    p.avgOfferPrice,
    p.avgRent,
    p.avgCapRate,
    p.avgCashOnCash,
    p.avgRehab,
    p.avgSqFt,
    p.totalCost,
    p.totalAnnualRent,
    p.totalProfit,
    p.riskRating,
    p.strengthRating,
    p.appealScore,
    p.bulkBuyerFit,
    p.geoConsistency,
    p.occupancyMix,
    p.neighborhoodConsistency,
    p.packageStatus,
    p.assignedTargets,
    p.notes
  ]);

  if (portfolioSheet.getLastRow() > 1) {
    portfolioSheet.getRange(2, 1, portfolioSheet.getLastRow() - 1, portfolioHeaders.length).clearContent();
  }
  if (portfolioRows.length > 0) {
    portfolioSheet.getRange(2, 1, portfolioRows.length, portfolioHeaders.length).setValues(portfolioRows);
  }

  logEvent('INST', `Portfolio builder updated: ${portfolios.length} portfolio groups created`);
}

// ============================================================
// PORTFOLIO GROUPING LOGIC
// ============================================================

/**
 * Groups deals into portfolios by ZIP, strategy, price band, and quality
 */
function buildPortfolioGroups_(deals) {
  const portfolios = [];
  const minSize = parseInt(getSetting('inst_min_portfolio_size', '3')) || 3;

  // Strategy 1: Group by exact ZIP
  const zipGroups = groupDealsBy_(deals, 'ZIP');
  Object.entries(zipGroups).forEach(([zip, groupDeals]) => {
    if (groupDeals.length >= minSize) {
      portfolios.push(buildPortfolioFromGroup_(groupDeals, `ZIP-${zip}`, 'ZIP'));
    }
  });

  // Strategy 2: Group by city (only if not already captured by ZIP)
  const usedDealIds = new Set();
  portfolios.forEach(p => p._dealIds.forEach(id => usedDealIds.add(id)));

  const remainingDeals = deals.filter(d => !usedDealIds.has(d['Deal ID']));
  const cityGroups = groupDealsBy_(remainingDeals, 'City');
  Object.entries(cityGroups).forEach(([city, groupDeals]) => {
    if (groupDeals.length >= minSize && city) {
      portfolios.push(buildPortfolioFromGroup_(groupDeals, `City-${city}`, 'City'));
    }
  });

  // Strategy 3: Group by ZIP prefix (first 3 digits) for nearby ZIPs
  const stillRemaining = remainingDeals.filter(d => !usedDealIds.has(d['Deal ID']));
  const zipPrefixGroups = {};
  stillRemaining.forEach(deal => {
    const zip = String(deal['ZIP'] || '');
    if (zip.length >= 3) {
      const prefix = zip.substring(0, 3);
      if (!zipPrefixGroups[prefix]) zipPrefixGroups[prefix] = [];
      zipPrefixGroups[prefix].push(deal);
    }
  });

  Object.entries(zipPrefixGroups).forEach(([prefix, groupDeals]) => {
    if (groupDeals.length >= minSize) {
      portfolios.push(buildPortfolioFromGroup_(groupDeals, `Area-${prefix}xx`, 'ZIP Prefix'));
    }
  });

  // Strategy 4: Group by strategy + price band for remaining
  const priceStrategyGroups = groupByStrategyAndPriceBand_(
    deals.filter(d => !usedDealIds.has(d['Deal ID']))
  );
  priceStrategyGroups.forEach(group => {
    if (group.deals.length >= minSize) {
      portfolios.push(buildPortfolioFromGroup_(group.deals, group.name, 'Strategy-Price'));
    }
  });

  // Assign sequential IDs
  portfolios.forEach((p, idx) => {
    p.groupId = 'PG' + String(idx + 1).padStart(4, '0');
  });

  return portfolios;
}

/**
 * Groups deals by a specific field
 */
function groupDealsBy_(deals, fieldName) {
  const groups = {};
  deals.forEach(deal => {
    const key = String(deal[fieldName] || '').trim();
    if (key) {
      if (!groups[key]) groups[key] = [];
      groups[key].push(deal);
    }
  });
  return groups;
}

/**
 * Groups remaining deals by strategy + price band
 */
function groupByStrategyAndPriceBand_(deals) {
  const groups = [];
  const bands = [
    { min: 0, max: 100000, label: 'Under-100K' },
    { min: 100000, max: 200000, label: '100K-200K' },
    { min: 200000, max: 350000, label: '200K-350K' },
    { min: 350000, max: 999999999, label: '350K+' }
  ];

  const strategies = ['LTR', 'MTR', 'STR', 'Flip', 'Creative'];

  strategies.forEach(strategy => {
    bands.forEach(band => {
      const matching = deals.filter(d => {
        const price = parseFloat(d['Asking Price']) || 0;
        const dealStrategy = d['Best Strategy'] || '';
        return dealStrategy === strategy && price >= band.min && price < band.max;
      });

      if (matching.length >= 2) {
        groups.push({
          name: `${strategy}-${band.label}`,
          deals: matching
        });
      }
    });
  });

  return groups;
}

// ============================================================
// PORTFOLIO ANALYTICS
// ============================================================

/**
 * Builds a portfolio summary object from a group of deals
 */
function buildPortfolioFromGroup_(deals, name, groupType) {
  const dealCount = deals.length;
  const dealIds = deals.map(d => d['Deal ID']);

  // Aggregate metrics
  const askingPrices = deals.map(d => parseFloat(d['Asking Price']) || 0).filter(p => p > 0);
  const offerPrices = deals.map(d => parseFloat(d['Offer Price Target'] || d['MAO Final']) || 0).filter(p => p > 0);
  const rents = deals.map(d => estimateMonthlyRent_(d));
  const capRates = deals.map(d => parseFloat(d['Cap Rate']) || 0).filter(c => c > 0);
  const cashOnCash = deals.map(d => parseFloat(d['Cash-on-Cash Return']) || 0).filter(c => c > 0);
  const rehabs = deals.map(d => ((parseFloat(d['Est Rehab Low']) || 0) + (parseFloat(d['Est Rehab High']) || 0)) / 2);
  const sqfts = deals.map(d => parseFloat(d['Sqft']) || 0).filter(s => s > 0);
  const instScores = deals.map(d => parseFloat(d['Institutional Grade Score']) || 0);

  const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

  // Unique values
  const states = [...new Set(deals.map(d => d['State']).filter(s => s))];
  const cities = [...new Set(deals.map(d => d['City']).filter(c => c))];
  const zips = [...new Set(deals.map(d => String(d['ZIP'] || '')).filter(z => z))];
  const assetTypes = [...new Set(deals.map(d => d['Property Type']).filter(t => t))];
  const strategies = [...new Set(deals.map(d => d['Best Strategy']).filter(s => s))];
  const neighborhoods = deals.map(d => d['Neighborhood Grade'] || 'C');

  // Portfolio appeal scoring
  const avgInstScore = avg(instScores);
  const avgCapRate = avg(capRates);
  const geoConsistency = zips.length <= 2 ? 'High' : zips.length <= 5 ? 'Medium' : 'Low';
  const neighborhoodConsistency = [...new Set(neighborhoods)].length <= 2 ? 'Consistent' : 'Mixed';

  const appealScore = computePortfolioAppealScore_(avgInstScore, avgCapRate, dealCount, geoConsistency, avg(rehabs));
  const appealTier = getPortfolioAppealTier_(appealScore);

  // Risk and strength
  const avgRisk = avg(deals.map(d => parseFloat(d['Risk Score']) || 50));
  const riskRating = avgRisk >= 60 ? 'High' : avgRisk >= 40 ? 'Moderate' : 'Low';
  const strengthRating = avgInstScore >= 75 ? 'Strong' : avgInstScore >= 55 ? 'Moderate' : 'Developing';

  // Total estimated profit
  const totalProfit = deals.reduce((total, d) => {
    const arv = parseFloat(d['ARV']) || 0;
    const offer = parseFloat(d['Offer Price Target'] || d['MAO Final']) || 0;
    const rehab = ((parseFloat(d['Est Rehab Low']) || 0) + (parseFloat(d['Est Rehab High']) || 0)) / 2;
    return total + Math.max(0, arv - offer - rehab - (arv * 0.10));
  }, 0);

  return {
    groupId: '', // Assigned later
    name: name,
    dealCount: dealCount,
    state: states.join(', '),
    city: cities.join(', '),
    zipCluster: zips.join(', '),
    assetTypeMix: assetTypes.join(', '),
    strategyMix: strategies.join(', '),
    avgAskingPrice: Math.round(avg(askingPrices)),
    avgOfferPrice: Math.round(avg(offerPrices)),
    avgRent: Math.round(avg(rents)),
    avgCapRate: Math.round(avg(capRates) * 1000) / 1000,
    avgCashOnCash: Math.round(avg(cashOnCash) * 1000) / 1000,
    avgRehab: Math.round(avg(rehabs)),
    avgSqFt: Math.round(avg(sqfts)),
    totalCost: Math.round(sum(offerPrices.length ? offerPrices : askingPrices)),
    totalAnnualRent: Math.round(sum(rents) * 12),
    totalProfit: Math.round(totalProfit),
    riskRating: riskRating,
    strengthRating: strengthRating,
    appealScore: appealScore,
    bulkBuyerFit: appealTier,
    geoConsistency: geoConsistency,
    occupancyMix: 'Mixed', // Would need occupancy data
    neighborhoodConsistency: neighborhoodConsistency,
    packageStatus: appealScore >= 70 ? 'Ready to Package' : 'Needs Review',
    assignedTargets: '',
    notes: `${dealCount} deals in ${groupType} group. Appeal: ${appealTier}.`,
    _dealIds: dealIds // Internal reference
  };
}

/**
 * Computes portfolio appeal score
 */
function computePortfolioAppealScore_(avgInstScore, avgCapRate, dealCount, geoConsistency, avgRehab) {
  let score = 0;

  // Institutional quality (40%)
  score += (avgInstScore / 100) * 40;

  // Deal count bonus (15%)
  if (dealCount >= 10) score += 15;
  else if (dealCount >= 5) score += 12;
  else if (dealCount >= 3) score += 8;

  // Cap rate (15%)
  if (avgCapRate >= 0.08) score += 15;
  else if (avgCapRate >= 0.06) score += 10;
  else if (avgCapRate >= 0.04) score += 5;

  // Geographic consistency (15%)
  if (geoConsistency === 'High') score += 15;
  else if (geoConsistency === 'Medium') score += 8;
  else score += 3;

  // Rehab burden (15%)
  if (avgRehab <= 10000) score += 15;
  else if (avgRehab <= 25000) score += 10;
  else if (avgRehab <= 40000) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Gets portfolio appeal tier from score
 */
function getPortfolioAppealTier_(score) {
  const tiers = CONFIG.INSTITUTIONAL.PORTFOLIO_APPEAL;
  if (score >= tiers.BULK_READY.minScore) return tiers.BULK_READY.label;
  if (score >= tiers.STRONG_PORTFOLIO.minScore) return tiers.STRONG_PORTFOLIO.label;
  if (score >= tiers.LOCAL_PACKAGE.minScore) return tiers.LOCAL_PACKAGE.label;
  if (score >= tiers.MIXED_QUALITY.minScore) return tiers.MIXED_QUALITY.label;
  return tiers.DO_NOT_BUNDLE.label;
}

// ============================================================
// PORTFOLIO QUERIES (FOR UI)
// ============================================================

/**
 * Gets all portfolio groups with summary data
 */
function getPortfolioGroups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_PORTFOLIO_BUILDER);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const groups = [];

  for (let i = 1; i < data.length; i++) {
    const group = {};
    headers.forEach((h, j) => group[h] = data[i][j]);
    groups.push(group);
  }

  return groups;
}

/**
 * Gets deals in a specific portfolio group
 */
function getDealsInPortfolio(groupId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const portfolioSheet = ss.getSheetByName(CONFIG.SHEETS.INST_PORTFOLIO_BUILDER);

  if (!masterSheet || !portfolioSheet) return [];

  // Get the ZIP cluster for this group
  const pData = portfolioSheet.getDataRange().getValues();
  const pHeaders = pData[0];
  let zipCluster = '';
  for (let i = 1; i < pData.length; i++) {
    if (pData[i][pHeaders.indexOf('Portfolio Group ID')] === groupId) {
      zipCluster = pData[i][pHeaders.indexOf('ZIP Cluster')];
      break;
    }
  }

  if (!zipCluster) return [];

  const targetZips = zipCluster.split(',').map(z => z.trim());
  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];
  const zipCol = headers.indexOf('ZIP');

  const deals = [];
  for (let i = 1; i < masterData.length; i++) {
    const zip = String(masterData[i][zipCol] || '').trim();
    if (targetZips.includes(zip)) {
      const deal = {};
      headers.forEach((h, j) => deal[h] = masterData[i][j]);
      deals.push(deal);
    }
  }

  return deals;
}
