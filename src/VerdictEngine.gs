/**
 * Quantum Real Estate Analyzer - Verdict Engine Module
 * Computes deal scores, risk scores, verdicts, and rankings
 */

// ============================================================
// MAIN VERDICT GENERATION
// ============================================================

/**
 * Generates verdict rankings for all deals
 */
function generateVerdictRankings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const verdictSheet = ss.getSheetByName(CONFIG.SHEETS.VERDICT);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;
  if (!verdictSheet) return;

  logEvent('VERDICT', 'Generating verdict rankings');

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  const masterColMap = {};
  masterHeaders.forEach((h, i) => masterColMap[h] = i + 1);

  const verdictResults = [];

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[masterColMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Build deal object
    const deal = {};
    masterHeaders.forEach((h, j) => deal[h] = row[j]);

    // Compute scores
    const dealScore = computeDealScore(deal);
    const riskScore = computeRiskScore(deal);
    const verdict = assignVerdict(dealScore, riskScore, deal);
    const nextAction = determineNextAction(verdict, deal);

    // Update Master DB
    if (masterColMap['Deal Score']) {
      masterSheet.getRange(i + 1, masterColMap['Deal Score']).setValue(dealScore);
    }
    if (masterColMap['Risk Score']) {
      masterSheet.getRange(i + 1, masterColMap['Risk Score']).setValue(riskScore);
    }
    if (masterColMap['Verdict']) {
      masterSheet.getRange(i + 1, masterColMap['Verdict']).setValue(verdict.label);
    }
    if (masterColMap['Next Action']) {
      masterSheet.getRange(i + 1, masterColMap['Next Action']).setValue(nextAction);
    }

    // Build verdict row
    verdictResults.push({
      dealId: dealId,
      address: deal['Address'],
      city: deal['City'],
      zip: deal['ZIP'],
      askingPrice: deal['Asking Price'],
      arv: deal['ARV'],
      dealScore: dealScore,
      riskScore: riskScore,
      verdict: verdict.label,
      bestStrategy: deal['Best Strategy'] || 'TBD',
      offerType: deal['Offer Type Recommended'] || 'Cash',
      offerTarget: deal['Offer Price Target'] || '',
      exitSpeedTier: deal['Exit Speed Tier'] || 'MOD',
      somScore: deal['SOM Score'] || 50,
      slaStatus: deal['SLA Status'] || 'N/A',
      nextAction: nextAction,
      sellerMessage: (deal['Seller Message'] || '').substring(0, 100),
      actionLink: deal['Listing URL'] || ''
    });
  }

  // Sort by deal score (descending)
  verdictResults.sort((a, b) => b.dealScore - a.dealScore);

  // Add rank and build final rows
  const verdictHeaders = CONFIG.COLUMNS.VERDICT;
  const verdictRows = verdictResults.map((v, idx) => [
    idx + 1, // Rank
    v.dealId,
    v.address,
    v.city,
    v.zip,
    v.askingPrice,
    v.arv,
    v.dealScore,
    v.riskScore,
    v.verdict,
    v.bestStrategy,
    v.offerType,
    v.offerTarget,
    v.exitSpeedTier,
    v.somScore,
    v.slaStatus,
    v.nextAction,
    v.sellerMessage,
    v.actionLink ? `=HYPERLINK("${v.actionLink}", "View")` : ''
  ]);

  // Update Priority Rank in Master DB
  verdictResults.forEach((v, idx) => {
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][masterColMap['Deal ID'] - 1] === v.dealId) {
        if (masterColMap['Priority Rank']) {
          masterSheet.getRange(i + 1, masterColMap['Priority Rank']).setValue(idx + 1);
        }
        break;
      }
    }
  });

  // Write to Verdict sheet
  if (verdictSheet.getLastRow() > 1) {
    verdictSheet.getRange(2, 1, verdictSheet.getLastRow() - 1, verdictHeaders.length).clearContent();
  }
  if (verdictRows.length > 0) {
    verdictSheet.getRange(2, 1, verdictRows.length, verdictHeaders.length).setValues(verdictRows);
  }

  // Apply verdict formatting
  applyVerdictConditionalFormatting(ss);

  logEvent('VERDICT', `Verdict rankings generated: ${verdictRows.length} deals ranked`);
}

// ============================================================
// DEAL SCORE COMPUTATION
// ============================================================

/**
 * Computes overall deal score (0-100)
 * @param {Object} deal - Deal object
 * @returns {number} Deal score
 */
function computeDealScore(deal) {
  let score = 50; // Base score

  // 1. Profit potential (up to 25 points)
  const profitScore = computeProfitScore(deal);
  score += profitScore;

  // 2. Market conditions (up to 15 points)
  const marketScore = computeMarketConditionScore(deal);
  score += marketScore;

  // 3. Motivation signals (up to 15 points)
  const motivationScore = computeMotivationScore(deal);
  score += motivationScore;

  // 4. Property quality (up to 10 points)
  const qualityScore = computePropertyQualityScore(deal);
  score += qualityScore;

  // 5. Speed-to-lead bonus/penalty (up to +/- 10 points)
  const stlScore = computeSTLScore(deal);
  score += stlScore;

  // 6. SOM impact (up to +/- 15 points)
  const somImpact = computeSOMImpact(deal);
  score += somImpact;

  // 7. Strategy alignment bonus
  const strategyBonus = computeStrategyBonus(deal);
  score += strategyBonus;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Computes profit potential score
 */
function computeProfitScore(deal) {
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  const arv = parseFloat(deal['ARV']) || askingPrice;
  const rehabLow = parseFloat(deal['Est Rehab Low']) || 0;
  const rehabHigh = parseFloat(deal['Est Rehab High']) || 0;
  const rehabMid = (rehabLow + rehabHigh) / 2 || 20000;

  // Potential profit margin
  const potentialProfit = arv - askingPrice - rehabMid - (arv * 0.10); // Rough costs
  const profitMargin = arv > 0 ? potentialProfit / arv : 0;

  if (profitMargin >= 0.25) return 25;
  if (profitMargin >= 0.20) return 20;
  if (profitMargin >= 0.15) return 15;
  if (profitMargin >= 0.10) return 10;
  if (profitMargin >= 0.05) return 5;
  if (profitMargin < 0) return -10;
  return 0;
}

/**
 * Computes market condition score
 */
function computeMarketConditionScore(deal) {
  let score = 0;

  // Sales velocity
  const velocityScore = parseFloat(deal['Sales Velocity Score']) || 50;
  score += (velocityScore - 50) / 5; // +/- 10 points

  // Market heat
  const marketHeat = parseFloat(deal['Market Heat Score']) || 50;
  score += (marketHeat - 50) / 10; // +/- 5 points

  return Math.min(15, Math.max(-10, score));
}

/**
 * Computes motivation score based on signals
 */
function computeMotivationScore(deal) {
  const signals = String(deal['Motivation Signals'] || '').toLowerCase();
  let score = 0;

  // High motivation indicators
  const highMotivation = ['foreclosure', 'pre-foreclosure', 'divorce', 'estate', 'probate',
    'job relocation', 'motivated seller', 'must sell', 'urgent', 'desperate'];
  highMotivation.forEach(term => {
    if (signals.includes(term)) score += 5;
  });

  // Medium motivation indicators
  const mediumMotivation = ['price drop', 'price reduced', 'relist', 'back on market',
    'vacant', 'tired landlord', 'inherited'];
  mediumMotivation.forEach(term => {
    if (signals.includes(term)) score += 3;
  });

  // Low motivation indicators
  const lowMotivation = ['investor owned', 'agent listed', 'retail'];
  lowMotivation.forEach(term => {
    if (signals.includes(term)) score -= 2;
  });

  return Math.min(15, Math.max(-5, score));
}

/**
 * Computes property quality score
 */
function computePropertyQualityScore(deal) {
  let score = 0;

  // Property type preferences
  const propType = deal['Property Type'] || '';
  if (propType === 'SFR') score += 3;
  if (propType === 'Duplex' || propType === 'Triplex' || propType === 'Fourplex') score += 4;
  if (propType === 'Mobile Home') score -= 3;

  // Age factor
  const yearBuilt = parseFloat(deal['Year Built']) || 1980;
  const age = new Date().getFullYear() - yearBuilt;
  if (age < 20) score += 3;
  else if (age < 40) score += 1;
  else if (age > 60) score -= 2;

  // Repair complexity
  const repairTier = deal['Repair Complexity Tier'] || 'MODERATE';
  if (repairTier === 'COSMETIC') score += 3;
  if (repairTier === 'HEAVY') score -= 2;
  if (repairTier === 'FULL_GUT') score -= 4;
  if (repairTier === 'TEARDOWN') score -= 5;

  return Math.min(10, Math.max(-5, score));
}

/**
 * Computes speed-to-lead score impact
 */
function computeSTLScore(deal) {
  const slaStatus = deal['SLA Status'] || '';
  const slaTier = deal['SLA Tier'] || '';

  if (slaStatus === 'OPTIMAL' || slaTier.includes('TIER_1')) return 5;
  if (slaStatus === 'ACCEPTABLE' || slaTier.includes('TIER_2')) return 0;
  if (slaStatus === 'SLOW' || slaTier.includes('TIER_3')) return -5;
  if (slaStatus === 'BREACH') return -15;

  return 0;
}

/**
 * Computes SOM (saturation) impact
 */
function computeSOMImpact(deal) {
  const somScore = parseFloat(deal['SOM Score']) || 50;
  const somTier = getSOMTier(somScore);
  return somTier.verdictBoost;
}

/**
 * Computes strategy alignment bonus
 */
function computeStrategyBonus(deal) {
  const bestStrategy = deal['Best Strategy'] || '';

  // Load strategy scores
  // This would normally cross-reference strategy engine results
  // Simplified: give bonus if best strategy identified
  if (bestStrategy && bestStrategy !== 'TBD' && bestStrategy !== 'None') {
    return 5;
  }

  return 0;
}

// ============================================================
// RISK SCORE COMPUTATION
// ============================================================

/**
 * Computes risk score (0-100, higher = more risky)
 * @param {Object} deal - Deal object
 * @returns {number} Risk score
 */
function computeRiskScore(deal) {
  let risk = 30; // Base risk

  // 1. Exit risk (from market data)
  const exitRiskTier = deal['Exit Risk Tier'] || 'MOD';
  if (exitRiskTier === 'CRIT') risk += 25;
  else if (exitRiskTier === 'HIGH') risk += 15;
  else if (exitRiskTier === 'MOD') risk += 5;
  else if (exitRiskTier === 'LOW') risk -= 5;

  // 2. Repair risk
  const repairRiskScore = parseFloat(deal['Repair Risk Score']) || 30;
  risk += (repairRiskScore - 30) / 3;

  // 3. SOM risk (saturation)
  const somScore = parseFloat(deal['SOM Score']) || 50;
  if (somScore >= 70) risk += 15;
  else if (somScore >= 50) risk += 5;
  else if (somScore <= 30) risk -= 5;

  // 4. Property type risk
  const propType = deal['Property Type'] || '';
  if (propType === 'Mobile Home') risk += 15;
  if (propType === 'Land') risk += 20;
  if (propType === 'Condo') risk += 5;

  // 5. Price point risk
  const arv = parseFloat(deal['ARV']) || 0;
  if (arv > 750000) risk += 10;
  if (arv > 500000) risk += 5;
  if (arv < 100000 && arv > 0) risk += 5; // Very low price can be risky

  // 6. Comp confidence risk
  const compConfidence = parseFloat(deal['Comp Confidence Score']) || 50;
  if (compConfidence < 40) risk += 10;
  else if (compConfidence < 60) risk += 5;

  // 7. DOM/velocity risk
  const dom = parseFloat(deal['DOM']) || 30;
  if (dom > 90) risk += 10;
  else if (dom > 60) risk += 5;
  else if (dom < 14) risk -= 5;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

// ============================================================
// VERDICT ASSIGNMENT
// ============================================================

/**
 * Assigns verdict based on deal and risk scores
 * @param {number} dealScore - Deal score
 * @param {number} riskScore - Risk score
 * @param {Object} deal - Deal object
 * @returns {Object} Verdict object
 */
function assignVerdict(dealScore, riskScore, deal) {
  // Risk-adjusted score
  const adjustedScore = dealScore - (riskScore * 0.3);

  // Get base verdict
  let verdict = getVerdict(adjustedScore);

  // Override rules
  // If risk is too high, cap at HOLD
  if (riskScore >= 75 && verdict.verdict === 'HOT') {
    verdict = { ...getVerdict(55), overrideReason: 'High risk override' };
  }

  // If SLA breach, penalize verdict
  const slaStatus = deal['SLA Status'] || '';
  if (slaStatus === 'BREACH' && verdict.verdict === 'HOT') {
    verdict = { ...getVerdict(65), overrideReason: 'SLA breach penalty' };
  }

  // If no profit potential, cap at PASS
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  const arv = parseFloat(deal['ARV']) || askingPrice;
  if (arv > 0 && arv <= askingPrice) {
    verdict = { ...getVerdict(25), overrideReason: 'No equity' };
  }

  return {
    label: verdict.verdict,
    color: verdict.color,
    action: verdict.action,
    adjustedScore: adjustedScore,
    overrideReason: verdict.overrideReason || null
  };
}

/**
 * Determines next action based on verdict
 */
function determineNextAction(verdict, deal) {
  const slaStatus = deal['SLA Status'] || '';

  // Urgent SLA handling
  if (slaStatus === 'BREACH' || slaStatus === 'SLOW') {
    if (verdict.label === 'HOT' || verdict.label === 'SOLID') {
      return 'CALL NOW - SLA';
    }
  }

  // Standard action mapping
  const actionMap = {
    'HOT': 'CALL NOW',
    'SOLID': 'MAKE OFFER',
    'HOLD': 'WATCH',
    'PASS': 'SKIP'
  };

  return actionMap[verdict.label] || verdict.action || 'REVIEW';
}

// ============================================================
// SCORING HELPER FUNCTIONS
// ============================================================

/**
 * Computes all scores for Master Database
 */
function computeAllScores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  logEvent('SCORING', 'Computing all scores');

  // First, compute market intelligence
  computeMarketIntelligence();

  // Then run repair analysis
  runRepairAnalysis();

  // Speed-to-lead scoring is done in SpeedToLead module
  computeSpeedToLeadScores();

  logEvent('SCORING', 'All scores computed');
}

// ============================================================
// LEAD SCORING SHEET
// ============================================================

/**
 * Updates Lead Scoring sheet with detailed breakdown
 */
function updateLeadScoringSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const scoringSheet = ss.getSheetByName(CONFIG.SHEETS.LEAD_SCORING);

  if (!masterSheet || !scoringSheet) return;
  if (masterSheet.getLastRow() <= 1) return;

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];

  const scoringRows = [];

  for (let i = 1; i < masterData.length; i++) {
    const deal = {};
    masterHeaders.forEach((h, j) => deal[h] = masterData[i][j]);

    if (!deal['Deal ID']) continue;

    // Compute component scores
    const motivationScore = computeMotivationScore(deal);
    const equityScore = computeProfitScore(deal);
    const marketScore = computeMarketConditionScore(deal);
    const conditionScore = computePropertyQualityScore(deal);
    const sellerResponseScore = 50; // Placeholder - would track actual responses
    const stlScore = computeSTLScore(deal);
    const somImpact = computeSOMImpact(deal);
    const totalScore = computeDealScore(deal);
    const riskScore = computeRiskScore(deal);

    // Combined grade
    const grade = totalScore >= 80 ? 'A' : totalScore >= 65 ? 'B' :
      totalScore >= 50 ? 'C' : totalScore >= 35 ? 'D' : 'F';

    scoringRows.push([
      deal['Deal ID'],
      deal['Address'],
      motivationScore,
      equityScore,
      marketScore,
      conditionScore,
      sellerResponseScore,
      stlScore,
      somImpact,
      totalScore,
      riskScore,
      grade,
      '', // Scoring notes
      new Date()
    ]);
  }

  // Write to scoring sheet
  const headers = CONFIG.COLUMNS.LEAD_SCORING || [];
  if (scoringSheet.getLastRow() > 1) {
    scoringSheet.getRange(2, 1, scoringSheet.getLastRow() - 1, 14).clearContent();
  }
  if (scoringRows.length > 0) {
    scoringSheet.getRange(2, 1, scoringRows.length, scoringRows[0].length).setValues(scoringRows);
  }

  logEvent('SCORING', 'Lead scoring sheet updated');
}

// ============================================================
// VERDICT RETRIEVAL (FOR UI)
// ============================================================

/**
 * Gets verdict details for a specific deal
 */
function getVerdictForDeal(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const verdictSheet = ss.getSheetByName(CONFIG.SHEETS.VERDICT);

  if (!verdictSheet || verdictSheet.getLastRow() <= 1) {
    return { error: 'No verdict data' };
  }

  const data = verdictSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    const dealIdCol = headers.indexOf('Deal ID');
    if (data[i][dealIdCol] === dealId) {
      const verdict = {};
      headers.forEach((h, j) => verdict[h] = data[i][j]);
      return verdict;
    }
  }

  return { error: 'Deal not found' };
}

/**
 * Gets top deals by verdict
 */
function getTopDeals(limit = 10) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const verdictSheet = ss.getSheetByName(CONFIG.SHEETS.VERDICT);

  if (!verdictSheet || verdictSheet.getLastRow() <= 1) {
    return [];
  }

  const data = verdictSheet.getDataRange().getValues();
  const headers = data[0];

  const deals = [];
  for (let i = 1; i < Math.min(data.length, limit + 1); i++) {
    const deal = {};
    headers.forEach((h, j) => deal[h] = data[i][j]);
    deals.push(deal);
  }

  return deals;
}

/**
 * Gets deals by verdict category
 */
function getDealsByVerdict(verdictLabel) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const verdictSheet = ss.getSheetByName(CONFIG.SHEETS.VERDICT);

  if (!verdictSheet || verdictSheet.getLastRow() <= 1) {
    return [];
  }

  const data = verdictSheet.getDataRange().getValues();
  const headers = data[0];
  const verdictCol = headers.indexOf('Verdict');

  const deals = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][verdictCol] === verdictLabel) {
      const deal = {};
      headers.forEach((h, j) => deal[h] = data[i][j]);
      deals.push(deal);
    }
  }

  return deals;
}
