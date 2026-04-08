/**
 * Quantum Real Estate Analyzer - Institutional Screening & Scoring Engine
 * Determines institutional suitability, grades deals, and classifies disposition priority
 */

// ============================================================
// MAIN INSTITUTIONAL SCORING
// ============================================================

/**
 * Calculates institutional scores for all deals in Master DB
 */
function calculateInstitutionalScores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  const enabled = getSetting('inst_screening_enabled', 'true') === 'true';
  if (!enabled) {
    logEvent('INST', 'Institutional screening disabled');
    return;
  }

  logEvent('INST', 'Calculating institutional scores');

  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  // Ensure institutional columns exist
  const instCols = CONFIG.COLUMNS.MASTER_DB_INSTITUTIONAL;
  instCols.forEach(colName => {
    if (!colMap[colName]) {
      const nextCol = masterSheet.getLastColumn() + 1;
      masterSheet.getRange(1, nextCol).setValue(colName);
      colMap[colName] = nextCol;
      // Refresh headers for subsequent columns
      headers.push(colName);
    }
  });

  let scored = 0;

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[(colMap['Deal ID'] || 1) - 1];
    if (!dealId) continue;

    // Build deal object
    const deal = {};
    headers.forEach((h, j) => deal[h] = row[j]);

    // Compute institutional score
    const result = computeInstitutionalScore(deal);

    // Write results to Master DB
    setIfCol_(masterSheet, i + 1, colMap, 'Institutional Grade Score', result.score);
    setIfCol_(masterSheet, i + 1, colMap, 'Institutional Grade', result.grade);
    setIfCol_(masterSheet, i + 1, colMap, 'Portfolio Eligible', result.portfolioEligible ? 'Yes' : 'No');
    setIfCol_(masterSheet, i + 1, colMap, 'Cap Rate', result.capRate);
    setIfCol_(masterSheet, i + 1, colMap, 'Cash-on-Cash Return', result.cashOnCash);
    setIfCol_(masterSheet, i + 1, colMap, 'Estimated Annual Rent', result.annualRent);
    setIfCol_(masterSheet, i + 1, colMap, 'Neighborhood Grade', result.neighborhoodGrade);
    setIfCol_(masterSheet, i + 1, colMap, 'Landlord Friendly Score', result.landlordFriendlyScore);
    setIfCol_(masterSheet, i + 1, colMap, 'Institutional Buyer Fit', result.buyerFit);
    setIfCol_(masterSheet, i + 1, colMap, 'Best Buyer Type', result.bestBuyerType);
    setIfCol_(masterSheet, i + 1, colMap, 'Disposition Priority', result.dispositionPriority);
    setIfCol_(masterSheet, i + 1, colMap, 'Package Ready?', result.packageReady ? 'Yes' : 'No');
    setIfCol_(masterSheet, i + 1, colMap, 'Portfolio Group Suggestion', result.portfolioGroupSuggestion);

    scored++;
  }

  logEvent('INST', `Institutional scoring completed: ${scored} deals scored`);
}

/**
 * Helper to set cell value if column exists
 */
function setIfCol_(sheet, row, colMap, colName, value) {
  if (colMap[colName]) {
    sheet.getRange(row, colMap[colName]).setValue(value);
  }
}

// ============================================================
// INSTITUTIONAL SCORE COMPUTATION
// ============================================================

/**
 * Computes institutional score for a single deal
 * @param {Object} deal - Deal object from Master DB
 * @returns {Object} Institutional scoring result
 */
function computeInstitutionalScore(deal) {
  const weights = CONFIG.INSTITUTIONAL.WEIGHTS;
  let totalScore = 0;
  const flags = [];
  const riskFlags = [];

  // ── 1. Rent Readiness (15 pts) ──
  const rentScore = scoreRentReadiness_(deal);
  totalScore += rentScore.score * (weights.rentReadiness / 100);
  if (rentScore.flags.length) flags.push(...rentScore.flags);

  // ── 2. Cap Rate (15 pts) ──
  const capRateResult = scoreCapRate_(deal);
  totalScore += capRateResult.score * (weights.capRate / 100);
  if (capRateResult.flags.length) flags.push(...capRateResult.flags);

  // ── 3. Rehab Burden (12 pts) ──
  const rehabScore = scoreRehabBurden_(deal);
  totalScore += rehabScore.score * (weights.rehabBurden / 100);
  if (rehabScore.riskFlags.length) riskFlags.push(...rehabScore.riskFlags);

  // ── 4. Neighborhood Quality (12 pts) ──
  const neighborhoodResult = scoreNeighborhoodQuality_(deal);
  totalScore += neighborhoodResult.score * (weights.neighborhoodQuality / 100);

  // ── 5. Occupancy Condition (10 pts) ──
  const occupancyScore = scoreOccupancy_(deal);
  totalScore += occupancyScore.score * (weights.occupancyCondition / 100);

  // ── 6. Landlord Friendliness (8 pts) ──
  const landlordScore = scoreLandlordFriendliness_(deal);
  totalScore += landlordScore.score * (weights.landlordFriendliness / 100);

  // ── 7. Asset Simplicity (8 pts) ──
  const assetScore = scoreAssetSimplicity_(deal);
  totalScore += assetScore.score * (weights.assetSimplicity / 100);

  // ── 8. Pricing Fit (8 pts) ──
  const pricingScore = scorePricingFit_(deal);
  totalScore += pricingScore.score * (weights.pricingFit / 100);

  // ── 9. Geographic Consistency (6 pts) ──
  const geoScore = scoreGeographicConsistency_(deal);
  totalScore += geoScore.score * (weights.geographicConsistency / 100);

  // ── 10. Portfolio Compatibility (6 pts) ──
  const portfolioScore = scorePortfolioCompatibility_(deal);
  totalScore += portfolioScore.score * (weights.portfolioCompatibility / 100);

  // Normalize to 0-100
  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // Grade assignment
  const grade = getInstitutionalGrade(finalScore);

  // Derived metrics
  const annualRent = estimateAnnualRent_(deal);
  const capRate = capRateResult.capRate;
  const cashOnCash = capRateResult.cashOnCash;

  // Disposition Priority Engine
  const dispositionPriority = determineDispositionPriority_(finalScore, capRate, deal);

  // Best buyer type
  const bestBuyerType = determineBestBuyerType_(deal, finalScore, grade);
  const buyerFit = determineBuyerFit_(deal, finalScore, grade);

  // Portfolio eligibility
  const portfolioEligible = finalScore >= 40 && capRate >= 0.04;
  const portfolioGroupSuggestion = deal['ZIP'] || '';

  // Package readiness
  const packageReady = finalScore >= parseFloat(getSetting('inst_min_score', '60')) &&
    capRate >= parseFloat(getSetting('inst_min_cap_rate', '0.06'));

  return {
    score: finalScore,
    grade: grade,
    capRate: capRate,
    cashOnCash: cashOnCash,
    annualRent: annualRent,
    neighborhoodGrade: neighborhoodResult.grade,
    landlordFriendlyScore: landlordScore.score,
    buyerFit: buyerFit,
    bestBuyerType: bestBuyerType,
    dispositionPriority: dispositionPriority,
    packageReady: packageReady,
    portfolioEligible: portfolioEligible,
    portfolioGroupSuggestion: portfolioGroupSuggestion,
    valueDrivers: flags.slice(0, 3).join('; '),
    riskFlags: riskFlags.slice(0, 3).join('; ')
  };
}

// ============================================================
// INDIVIDUAL SCORING COMPONENTS
// ============================================================

function scoreRentReadiness_(deal) {
  const flags = [];
  const rent = estimateMonthlyRent_(deal);
  const askingPrice = parseFloat(deal['Asking Price']) || 0;

  if (rent <= 0 || askingPrice <= 0) return { score: 30, flags: [] };

  const rentToPrice = (rent * 12) / askingPrice;
  let score = 50;

  if (rentToPrice >= 0.12) { score = 100; flags.push('Strong rent-to-price ratio'); }
  else if (rentToPrice >= 0.10) { score = 85; flags.push('Good rental yield'); }
  else if (rentToPrice >= 0.08) { score = 70; flags.push('Acceptable rental profile'); }
  else if (rentToPrice >= 0.06) { score = 50; }
  else { score = 25; }

  return { score, flags };
}

function scoreCapRate_(deal) {
  const flags = [];
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  const rent = estimateMonthlyRent_(deal);
  const annualRent = rent * 12;
  const operatingExpenses = annualRent * 0.40; // 40% expense ratio assumption
  const noi = annualRent - operatingExpenses;
  const offerTarget = parseFloat(deal['Offer Price Target'] || deal['MAO Final']) || askingPrice * 0.85;

  const capRate = offerTarget > 0 ? noi / offerTarget : 0;
  const cashOnCash = offerTarget > 0 ? (noi / (offerTarget * 0.25)) : 0; // assuming 25% down

  let score = 50;
  if (capRate >= 0.10) { score = 100; flags.push('Excellent cap rate'); }
  else if (capRate >= 0.08) { score = 85; flags.push('Strong cap rate'); }
  else if (capRate >= 0.06) { score = 70; flags.push('Solid cap rate'); }
  else if (capRate >= 0.05) { score = 50; }
  else { score = 25; }

  return { score, capRate: Math.round(capRate * 1000) / 1000, cashOnCash: Math.round(cashOnCash * 1000) / 1000, flags };
}

function scoreRehabBurden_(deal) {
  const riskFlags = [];
  const rehabLow = parseFloat(deal['Est Rehab Low']) || 0;
  const rehabHigh = parseFloat(deal['Est Rehab High']) || 0;
  const rehabMid = (rehabLow + rehabHigh) / 2 || 0;
  const repairTier = deal['Repair Complexity Tier'] || 'MODERATE';

  let score = 50;
  if (rehabMid <= 5000 || repairTier === 'COSMETIC') { score = 100; }
  else if (rehabMid <= 15000) { score = 85; }
  else if (rehabMid <= 30000) { score = 65; }
  else if (rehabMid <= 50000) { score = 40; riskFlags.push('Moderate rehab burden'); }
  else { score = 15; riskFlags.push('Heavy rehab - institutional risk'); }

  if (repairTier === 'FULL_GUT' || repairTier === 'TEARDOWN') {
    score = Math.min(score, 10);
    riskFlags.push('Full gut/teardown - not institutional');
  }

  return { score, riskFlags };
}

function scoreNeighborhoodQuality_(deal) {
  // Derive neighborhood grade from available signals
  const somScore = parseFloat(deal['SOM Score']) || 50;
  const marketHeat = parseFloat(deal['Market Heat Score']) || 50;
  const velocityScore = parseFloat(deal['Sales Velocity Score']) || 50;
  const combinedMarket = (somScore + marketHeat + velocityScore) / 3;

  let grade = 'C';
  let score = 50;

  if (combinedMarket >= 75) { grade = 'A'; score = 95; }
  else if (combinedMarket >= 60) { grade = 'B'; score = 75; }
  else if (combinedMarket >= 45) { grade = 'C'; score = 55; }
  else { grade = 'D'; score = 30; }

  return { score, grade };
}

function scoreOccupancy_(deal) {
  const statusStage = String(deal['Status Stage'] || '').toLowerCase();
  let score = 60; // neutral default

  if (statusStage.includes('tenant') || statusStage.includes('occupied')) { score = 80; }
  else if (statusStage.includes('vacant')) { score = 70; } // vacant = fast possession
  return { score };
}

function scoreLandlordFriendliness_(deal) {
  const state = String(deal['State'] || '').toUpperCase();
  // Landlord-friendly states score higher
  const landlordFriendly = ['TX', 'FL', 'GA', 'NC', 'SC', 'TN', 'IN', 'OH', 'AL', 'AZ', 'MS', 'AR', 'MO', 'OK', 'KY', 'ID', 'UT', 'WY', 'MT', 'SD', 'ND', 'NE', 'KS', 'IA', 'WV', 'LA', 'NV'];
  const tenantFriendly = ['CA', 'NY', 'NJ', 'IL', 'MA', 'CT', 'OR', 'WA', 'DC', 'MN', 'VT'];

  let score = 60;
  if (landlordFriendly.includes(state)) { score = 90; }
  else if (tenantFriendly.includes(state)) { score = 30; }

  return { score };
}

function scoreAssetSimplicity_(deal) {
  const propType = deal['Property Type'] || 'SFR';
  let score = 70;

  if (propType === 'SFR') { score = 95; }
  else if (['Duplex', 'Triplex', 'Fourplex'].includes(propType)) { score = 85; }
  else if (propType === 'Townhouse' || propType === 'Condo') { score = 60; }
  else if (propType === 'Multi-Family') { score = 70; }
  else if (propType === 'Mobile Home') { score = 25; }
  else if (propType === 'Land') { score = 10; }

  return { score };
}

function scorePricingFit_(deal) {
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  let score = 50;

  // Institutional sweet spot: $80k-$350k
  if (askingPrice >= 80000 && askingPrice <= 350000) { score = 95; }
  else if (askingPrice >= 50000 && askingPrice <= 500000) { score = 75; }
  else if (askingPrice > 500000) { score = 40; }
  else if (askingPrice < 50000 && askingPrice > 0) { score = 30; }

  return { score };
}

function scoreGeographicConsistency_(deal) {
  // This score gets boosted when multiple deals are in the same ZIP
  // Basic scoring based on market data availability
  const zip = deal['ZIP'] || '';
  let score = 50;
  if (zip && zip.length >= 5) { score = 70; }
  return { score };
}

function scorePortfolioCompatibility_(deal) {
  const bestStrategy = deal['Best Strategy'] || '';
  let score = 50;

  // Rental strategies are more portfolio-compatible
  if (['LTR', 'MTR', 'STR'].includes(bestStrategy)) { score = 85; }
  else if (bestStrategy === 'Creative') { score = 60; }
  else if (bestStrategy === 'Flip') { score = 40; }

  return { score };
}

// ============================================================
// GRADE & CLASSIFICATION HELPERS
// ============================================================

/**
 * Gets institutional grade label from score
 */
function getInstitutionalGrade(score) {
  const grades = CONFIG.INSTITUTIONAL.GRADES;
  if (score >= grades.INSTITUTIONAL_PRIME.minScore) return grades.INSTITUTIONAL_PRIME.label;
  if (score >= grades.INSTITUTIONAL_FIT.minScore) return grades.INSTITUTIONAL_FIT.label;
  if (score >= grades.LOCAL_LANDLORD_FIT.minScore) return grades.LOCAL_LANDLORD_FIT.label;
  if (score >= grades.PORTFOLIO_ONLY.minScore) return grades.PORTFOLIO_ONLY.label;
  return grades.NOT_INSTITUTIONAL.label;
}

/**
 * Disposition Priority Engine
 */
function determineDispositionPriority_(score, capRate, deal) {
  const rehabMid = ((parseFloat(deal['Est Rehab Low']) || 0) + (parseFloat(deal['Est Rehab High']) || 0)) / 2;
  const dp = CONFIG.INSTITUTIONAL.DISPOSITION_PRIORITY;

  if (score >= dp.SEND_NOW.minScore && capRate >= dp.SEND_NOW.minCapRate && rehabMid <= dp.SEND_NOW.maxRehab) {
    return dp.SEND_NOW.label;
  }
  if (score >= dp.HOLD_FOR_PORTFOLIO.minScore) {
    // Check for market concentration opportunity
    return dp.HOLD_FOR_PORTFOLIO.label;
  }
  if (score >= dp.LOCAL_LANDLORD_FIRST.minScore) {
    return dp.LOCAL_LANDLORD_FIRST.label;
  }
  if (score >= dp.REVIEW_MANUALLY.minScore) {
    return dp.REVIEW_MANUALLY.label;
  }
  return dp.NOT_A_FIT.label;
}

/**
 * Determines best buyer type for a deal
 */
function determineBestBuyerType_(deal, score, grade) {
  if (grade === 'INSTITUTIONAL PRIME') return 'Hedge Fund / REIT';
  if (grade === 'INSTITUTIONAL FIT') return 'Institutional Landlord';
  if (grade === 'LOCAL LANDLORD FIT') return 'Local Private Landlord';
  if (grade === 'PORTFOLIO ONLY') return 'Bulk Package Buyer';
  return 'Strategy-Specific Buyer';
}

/**
 * Determines buyer fit description
 */
function determineBuyerFit_(deal, score, grade) {
  if (score >= 85) return 'Strong institutional fit - ready for top-tier buyers';
  if (score >= 70) return 'Good institutional candidate - suitable for portfolio buyers';
  if (score >= 55) return 'Local landlord opportunity - target smaller investors';
  if (score >= 40) return 'Portfolio-only value - bundle before outreach';
  return 'Not institutional - consider wholesale or strategy-specific exit';
}

// ============================================================
// RENT & FINANCIAL ESTIMATION HELPERS
// ============================================================

function estimateMonthlyRent_(deal) {
  // Try existing data first
  const marketRent = parseFloat(deal['Market Rent']) || 0;
  if (marketRent > 0) return marketRent;

  // Estimate from property characteristics
  const sqft = parseFloat(deal['Sqft']) || 1200;
  const beds = parseFloat(deal['Beds']) || 3;
  const askingPrice = parseFloat(deal['Asking Price']) || 0;

  // Use 1% rule as rough estimate, then adjust
  let rent = askingPrice * 0.008; // Conservative 0.8% rule

  // Adjust for beds
  if (beds >= 4) rent *= 1.15;
  if (beds <= 2) rent *= 0.90;

  // Floor and ceiling
  rent = Math.max(600, Math.min(rent, 4000));

  return Math.round(rent);
}

function estimateAnnualRent_(deal) {
  return estimateMonthlyRent_(deal) * 12;
}

/**
 * Estimates market rent for a deal (used by OfferEngine as well)
 */
function estimateMarketRent(deal) {
  return estimateMonthlyRent_(deal);
}

/**
 * Calculates monthly mortgage payment
 */
function calculateMortgagePayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Comp confidence calculator
 */
function calculateCompConfidence(deal) {
  let confidence = 50;
  if (deal['ARV'] && parseFloat(deal['ARV']) > 0) confidence += 15;
  if (deal['Zestimate'] && parseFloat(deal['Zestimate']) > 0) confidence += 10;
  if (deal['DOM'] && parseFloat(deal['DOM']) > 0) confidence += 5;
  if (deal['Sales Velocity Score'] && parseFloat(deal['Sales Velocity Score']) > 0) confidence += 10;
  return Math.min(100, confidence);
}

// ============================================================
// MARKET CONCENTRATION DETECTION
// ============================================================

/**
 * Detects ZIP-level market concentration for portfolio opportunities
 * Returns map of ZIP -> deal count for qualifying deals
 */
function detectMarketConcentration() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  if (!masterSheet || masterSheet.getLastRow() <= 1) return {};

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];
  const zipCol = headers.indexOf('ZIP');
  const instScoreCol = headers.indexOf('Institutional Grade Score');

  const zipCounts = {};
  const minScore = parseFloat(getSetting('inst_min_score', '60'));

  for (let i = 1; i < data.length; i++) {
    const zip = String(data[i][zipCol] || '').trim();
    const score = parseFloat(data[i][instScoreCol]) || 0;

    if (zip && score >= minScore * 0.7) { // 70% of threshold still counts for portfolio
      zipCounts[zip] = (zipCounts[zip] || 0) + 1;
    }
  }

  // Filter to ZIPs with multiple qualifying deals
  const concentrations = {};
  Object.entries(zipCounts).forEach(([zip, count]) => {
    if (count >= 2) {
      concentrations[zip] = count;
    }
  });

  return concentrations;
}

/**
 * Updates portfolio group suggestions based on market concentration
 */
function updatePortfolioGroupSuggestions() {
  const concentrations = detectMarketConcentration();
  if (Object.keys(concentrations).length === 0) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  if (!masterSheet) return;

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];
  const zipCol = headers.indexOf('ZIP');
  const portfolioSugCol = headers.indexOf('Portfolio Group Suggestion');

  if (portfolioSugCol < 0) return;

  for (let i = 1; i < data.length; i++) {
    const zip = String(data[i][zipCol] || '').trim();
    if (concentrations[zip]) {
      masterSheet.getRange(i + 1, portfolioSugCol + 1)
        .setValue(`ZIP-${zip} (${concentrations[zip]} deals)`);
    }
  }

  logEvent('INST', `Portfolio concentration detected in ${Object.keys(concentrations).length} ZIPs`);
}

// ============================================================
// AI SUMMARY GENERATION
// ============================================================

/**
 * Generates investor-focused AI summary for a deal
 * @param {Object} deal - Deal object
 * @param {Object} instResult - Institutional scoring result
 * @returns {string} AI summary text
 */
function generateInvestorSummary(deal, instResult) {
  const parts = [];
  const grade = instResult.grade || 'NOT INSTITUTIONAL';
  const capRate = instResult.capRate || 0;
  const rehabMid = ((parseFloat(deal['Est Rehab Low']) || 0) + (parseFloat(deal['Est Rehab High']) || 0)) / 2;

  // Lead with grade context
  if (grade === 'INSTITUTIONAL PRIME') {
    parts.push('Turnkey rental candidate');
  } else if (grade === 'INSTITUTIONAL FIT') {
    parts.push('Solid institutional candidate');
  } else if (grade === 'LOCAL LANDLORD FIT') {
    parts.push('Local landlord opportunity');
  } else if (grade === 'PORTFOLIO ONLY') {
    parts.push('Value-add portfolio play');
  } else {
    parts.push('Not institutional-grade');
  }

  // Rental profile
  if (capRate >= 0.08) {
    parts.push('with strong yield profile');
  } else if (capRate >= 0.06) {
    parts.push('with acceptable cap rate');
  } else if (capRate > 0) {
    parts.push('but thin yield');
  }

  // Rehab context
  if (rehabMid <= 5000) {
    parts.push('and minimal rehab');
  } else if (rehabMid <= 20000) {
    parts.push('and manageable rehab');
  } else if (rehabMid <= 40000) {
    parts.push('with moderate value-add component');
  } else {
    parts.push('with significant rehab risk');
  }

  // Location context
  const neighborhoodGrade = instResult.neighborhoodGrade || 'C';
  if (neighborhoodGrade === 'A') {
    parts.push('in a premium submarket');
  } else if (neighborhoodGrade === 'B') {
    parts.push('in a stable rental market');
  } else if (neighborhoodGrade === 'D') {
    parts.push('but moderate neighborhood risk');
  }

  // Strategy fit
  const bestStrategy = deal['Best Strategy'] || '';
  if (bestStrategy && bestStrategy !== 'TBD') {
    parts.push(`Best exit: ${bestStrategy}.`);
  }

  return parts.join(' ') + '.';
}
