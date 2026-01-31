/**
 * Quantum Real Estate Analyzer - Strategy Engines Module
 * Contains all strategy analysis engines: Flip, STR, MTR, LTR, Creative
 */

// ============================================================
// MAIN STRATEGY ORCHESTRATION
// ============================================================

/**
 * Runs all strategy engines on Master Database
 */
function runAllStrategyEngines() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  logEvent('STRATEGY', 'Running all strategy engines');

  ss.toast('Running strategy engines...', 'Analysis', 10);

  try {
    runFlipEngine();
    runSTREngine();
    runMTREngine();
    runLTREngine();
    runCreativeEngine();
    runMultiExitComparison();

    logEvent('STRATEGY', 'All strategy engines completed');
    ss.toast('All strategy engines completed!', 'Success', 5);
  } catch (error) {
    logError('STRATEGY', error.message, error.stack);
    ss.toast('Strategy engine error: ' + error.message, 'Error', 10);
    throw error;
  }
}

/**
 * Gets deals from Master DB for analysis
 * @returns {Array} Array of deal objects
 */
function getDealsForAnalysis() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return [];

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];

  const deals = [];
  for (let i = 1; i < data.length; i++) {
    const deal = {};
    headers.forEach((header, j) => {
      deal[header] = data[i][j];
    });
    deal._rowIndex = i + 1;
    deals.push(deal);
  }

  return deals;
}

// ============================================================
// FLIP ENGINE
// ============================================================

/**
 * Runs the Flip strategy engine
 */
function runFlipEngine() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const flipSheet = ss.getSheetByName(CONFIG.SHEETS.FLIP_ENGINE);
  if (!flipSheet) return;

  const deals = getDealsForAnalysis();
  if (deals.length === 0) return;

  logEvent('FLIP', 'Running Flip Engine on ' + deals.length + ' deals');

  const headers = CONFIG.COLUMNS.FLIP_ENGINE;
  const results = [];

  deals.forEach(deal => {
    const flipAnalysis = analyzeFlipDeal(deal);
    results.push(flipAnalysis);
  });

  // Write results
  if (flipSheet.getLastRow() > 1) {
    flipSheet.getRange(2, 1, flipSheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (results.length > 0) {
    flipSheet.getRange(2, 1, results.length, headers.length).setValues(results);
  }

  logEvent('FLIP', 'Flip Engine completed: ' + results.length + ' deals analyzed');
}

/**
 * Analyzes a single deal for flip potential
 * @param {Object} deal - Deal object
 * @returns {Array} Row of flip analysis data
 */
function analyzeFlipDeal(deal) {
  const config = CONFIG.STRATEGIES.FLIP;

  // Get values
  const arv = parseFloat(deal['ARV']) || 0;
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  const rehabLow = parseFloat(deal['Est Rehab Low']) || estimateRehabLow(deal);
  const rehabHigh = parseFloat(deal['Est Rehab High']) || estimateRehabHigh(deal);
  const rehabMid = (rehabLow + rehabHigh) / 2;
  const dom = parseFloat(deal['DOM']) || 30;

  // Calculate holding costs (assume 4 months)
  const holdingMonths = getHoldingMonths(dom);
  const holdingCost = askingPrice * config.holdingCostMonthly * holdingMonths;

  // Calculate fees
  const agentFees = arv * config.agentFees;
  const closingCosts = (askingPrice + arv) * config.closingCosts / 2;
  const totalCosts = holdingCost + agentFees + closingCosts;

  // Calculate profits for each rehab scenario
  const profitLow = arv - askingPrice - rehabLow - totalCosts;
  const profitHigh = arv - askingPrice - rehabHigh - totalCosts;
  const profitMid = arv - askingPrice - rehabMid - totalCosts;

  // Calculate ROI
  const totalInvestmentMid = askingPrice + rehabMid + totalCosts;
  const roiMid = totalInvestmentMid > 0 ? (profitMid / totalInvestmentMid) * 100 : 0;

  // Get velocity score
  const velocityTier = getVelocityTier(dom);
  const velocityScore = velocityTier.score;

  // Calculate exit risk
  const exitRisk = calculateFlipExitRisk(deal, velocityTier, profitMid, arv);

  // Calculate flip score
  const flipScore = calculateFlipScore(profitMid, roiMid, velocityScore, exitRisk);

  // Determine verdict
  const flipVerdict = getFlipVerdict(flipScore, profitMid, roiMid);

  return [
    deal['Deal ID'] || '',
    deal['Address'] || '',
    arv,
    askingPrice,
    rehabLow,
    rehabHigh,
    rehabMid,
    holdingMonths,
    holdingCost,
    agentFees,
    closingCosts,
    totalCosts,
    profitLow,
    profitHigh,
    profitMid,
    roiMid.toFixed(1) + '%',
    dom,
    velocityScore,
    exitRisk,
    flipScore,
    flipVerdict
  ];
}

/**
 * Estimates holding months based on DOM
 */
function getHoldingMonths(dom) {
  if (dom <= 14) return 3;
  if (dom <= 30) return 4;
  if (dom <= 60) return 5;
  if (dom <= 90) return 6;
  return 8;
}

/**
 * Estimates low rehab cost
 */
function estimateRehabLow(deal) {
  const sqft = parseFloat(deal['Sqft']) || 1500;
  const tier = deal['Repair Complexity Tier'] || 'MODERATE';
  const repairConfig = CONFIG.REPAIR[tier] || CONFIG.REPAIR.MODERATE;
  return sqft * repairConfig.lowMultiplier;
}

/**
 * Estimates high rehab cost
 */
function estimateRehabHigh(deal) {
  const sqft = parseFloat(deal['Sqft']) || 1500;
  const tier = deal['Repair Complexity Tier'] || 'MODERATE';
  const repairConfig = CONFIG.REPAIR[tier] || CONFIG.REPAIR.MODERATE;
  return sqft * repairConfig.highMultiplier;
}

/**
 * Calculates flip exit risk
 */
function calculateFlipExitRisk(deal, velocityTier, profitMid, arv) {
  let risk = 30; // Base risk

  // DOM-based risk
  if (velocityTier.tier === 'SLOW') risk += 15;
  if (velocityTier.tier === 'STALE') risk += 30;

  // Profit margin risk
  const profitMargin = arv > 0 ? profitMid / arv : 0;
  if (profitMargin < 0.10) risk += 20;
  else if (profitMargin < 0.15) risk += 10;

  // SOM risk
  const somScore = parseFloat(deal['SOM Score']) || 50;
  if (somScore > 70) risk += 15;
  else if (somScore > 50) risk += 5;

  // Repair complexity risk
  const repairTier = deal['Repair Complexity Tier'] || 'MODERATE';
  if (repairTier === 'HEAVY') risk += 10;
  if (repairTier === 'FULL_GUT') risk += 20;
  if (repairTier === 'TEARDOWN') risk += 35;

  return Math.min(100, Math.max(0, risk));
}

/**
 * Calculates overall flip score
 */
function calculateFlipScore(profitMid, roiMid, velocityScore, exitRisk) {
  let score = 50; // Base score

  // Profit contribution (up to 30 points)
  if (profitMid >= 50000) score += 30;
  else if (profitMid >= 30000) score += 25;
  else if (profitMid >= 20000) score += 20;
  else if (profitMid >= 10000) score += 10;
  else if (profitMid <= 0) score -= 20;

  // ROI contribution (up to 20 points)
  if (roiMid >= 30) score += 20;
  else if (roiMid >= 20) score += 15;
  else if (roiMid >= 15) score += 10;
  else if (roiMid >= 10) score += 5;

  // Velocity bonus/penalty
  score += (velocityScore - 50) / 5;

  // Exit risk penalty
  score -= exitRisk / 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Gets flip verdict
 */
function getFlipVerdict(flipScore, profitMid, roiMid) {
  if (flipScore >= 75 && profitMid >= 20000 && roiMid >= 15) return 'STRONG BUY';
  if (flipScore >= 60 && profitMid >= 15000) return 'BUY';
  if (flipScore >= 45 && profitMid >= 10000) return 'CONSIDER';
  if (flipScore >= 30) return 'HOLD';
  return 'PASS';
}

/**
 * Runs flip engine only (menu action)
 */
function runFlipEngineOnly() {
  runFlipEngine();
  SpreadsheetApp.getActiveSpreadsheet().toast('Flip Engine completed', 'Success', 3);
}

// ============================================================
// STR ENGINE (Short-Term Rental)
// ============================================================

/**
 * Runs the STR strategy engine
 */
function runSTREngine() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const strSheet = ss.getSheetByName(CONFIG.SHEETS.STR_ENGINE);
  if (!strSheet) return;

  const deals = getDealsForAnalysis();
  if (deals.length === 0) return;

  logEvent('STR', 'Running STR Engine on ' + deals.length + ' deals');

  const headers = CONFIG.COLUMNS.STR_ENGINE;
  const results = [];

  deals.forEach(deal => {
    const strAnalysis = analyzeSTRDeal(deal);
    results.push(strAnalysis);
  });

  // Write results
  if (strSheet.getLastRow() > 1) {
    strSheet.getRange(2, 1, strSheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (results.length > 0) {
    strSheet.getRange(2, 1, results.length, headers.length).setValues(results);
  }

  logEvent('STR', 'STR Engine completed: ' + results.length + ' deals analyzed');
}

/**
 * Analyzes a single deal for STR potential
 */
function analyzeSTRDeal(deal) {
  const config = CONFIG.STRATEGIES.STR;

  // Estimate ADR based on beds/baths/location
  const beds = parseFloat(deal['Beds']) || 3;
  const baths = parseFloat(deal['Baths']) || 2;
  const adr = estimateADR(deal, beds, baths);

  // Occupancy with seasonality
  const occupancy = config.occupancyDefault;
  const seasonalityIndex = estimateSeasonality(deal);

  // Regulation risk
  const regulationRisk = estimateRegulationRisk(deal);

  // Setup costs
  const furnishSetupCost = config.furnishingCost + config.setupCost;
  const cleaningPerTurn = config.cleaningPerTurn;

  // Calculate revenue
  const avgStaysPerMonth = occupancy * 30 / 3; // Assume 3-night avg stay
  const monthlyGross = adr * occupancy * 30;
  const platformFees = monthlyGross * config.platformFee;
  const managementFee = monthlyGross * config.managementFee;
  const cleaningCosts = avgStaysPerMonth * cleaningPerTurn;

  const monthlyNet = monthlyGross - platformFees - managementFee - cleaningCosts;
  const annualNet = monthlyNet * 12 * seasonalityIndex;

  // Break-even occupancy
  const fixedMonthlyCosts = managementFee + cleaningCosts;
  const breakEvenOccupancy = fixedMonthlyCosts / (adr * 30 - fixedMonthlyCosts) * 100;

  // Cash-on-cash return
  const purchasePrice = parseFloat(deal['Asking Price']) || 0;
  const totalInvestment = purchasePrice * 0.25 + furnishSetupCost; // Assume 25% down
  const cashOnCash = totalInvestment > 0 ? (annualNet / totalInvestment) * 100 : 0;

  // Calculate STR score
  const strScore = calculateSTRScore(monthlyNet, cashOnCash, regulationRisk, seasonalityIndex);
  const strVerdict = getSTRVerdict(strScore, monthlyNet, regulationRisk);

  return [
    deal['Deal ID'] || '',
    deal['Address'] || '',
    adr,
    (occupancy * 100).toFixed(0) + '%',
    seasonalityIndex.toFixed(2),
    regulationRisk,
    furnishSetupCost,
    cleaningPerTurn,
    (config.managementFee * 100).toFixed(0) + '%',
    (config.platformFee * 100).toFixed(0) + '%',
    monthlyGross.toFixed(0),
    monthlyNet.toFixed(0),
    annualNet.toFixed(0),
    breakEvenOccupancy.toFixed(1) + '%',
    cashOnCash.toFixed(1) + '%',
    strScore,
    strVerdict
  ];
}

/**
 * Estimates ADR based on property characteristics
 */
function estimateADR(deal, beds, baths) {
  // Base ADR by bedroom count
  const baseADR = {
    1: 100, 2: 140, 3: 180, 4: 220, 5: 280, 6: 350
  };

  let adr = baseADR[Math.min(beds, 6)] || 180;

  // Adjust for location (simplified - would use actual market data)
  const state = deal['State'] || '';
  const premiumStates = ['CA', 'FL', 'HI', 'NY', 'CO', 'TN'];
  if (premiumStates.includes(state)) {
    adr *= 1.3;
  }

  // Adjust for property type
  const propType = deal['Property Type'] || '';
  if (propType === 'Condo') adr *= 0.9;
  if (propType === 'SFR') adr *= 1.1;

  return Math.round(adr);
}

/**
 * Estimates seasonality index
 */
function estimateSeasonality(deal) {
  const state = deal['State'] || '';

  // Beach/vacation states have higher seasonality variance
  const highSeasonalityStates = ['FL', 'HI', 'SC', 'NC'];
  if (highSeasonalityStates.includes(state)) {
    return 0.85; // Lower effective yield due to off-season
  }

  // Mountain/ski states
  const skiStates = ['CO', 'UT', 'VT', 'MT'];
  if (skiStates.includes(state)) {
    return 0.80;
  }

  return 0.95; // Stable year-round markets
}

/**
 * Estimates regulation risk
 */
function estimateRegulationRisk(deal) {
  const city = (deal['City'] || '').toLowerCase();
  const state = deal['State'] || '';

  // Known high-regulation cities
  const highRegCities = ['new york', 'los angeles', 'san francisco', 'santa monica', 'nashville'];
  if (highRegCities.some(c => city.includes(c))) {
    return 'HIGH';
  }

  // Known restrictive states
  const highRegStates = ['NY', 'CA'];
  if (highRegStates.includes(state)) {
    return 'MODERATE';
  }

  return 'LOW';
}

/**
 * Calculates STR score
 */
function calculateSTRScore(monthlyNet, cashOnCash, regulationRisk, seasonalityIndex) {
  let score = 50;

  // Cash flow contribution
  if (monthlyNet >= 2000) score += 25;
  else if (monthlyNet >= 1500) score += 20;
  else if (monthlyNet >= 1000) score += 15;
  else if (monthlyNet >= 500) score += 5;
  else if (monthlyNet < 0) score -= 20;

  // Cash-on-cash contribution
  if (cashOnCash >= 20) score += 20;
  else if (cashOnCash >= 15) score += 15;
  else if (cashOnCash >= 10) score += 10;
  else if (cashOnCash >= 5) score += 5;

  // Regulation risk penalty
  if (regulationRisk === 'HIGH') score -= 25;
  else if (regulationRisk === 'MODERATE') score -= 10;

  // Seasonality adjustment
  score += (seasonalityIndex - 0.9) * 50;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Gets STR verdict
 */
function getSTRVerdict(strScore, monthlyNet, regulationRisk) {
  if (regulationRisk === 'HIGH') return 'RISKY';
  if (strScore >= 75 && monthlyNet >= 1500) return 'STRONG';
  if (strScore >= 60 && monthlyNet >= 1000) return 'GOOD';
  if (strScore >= 45) return 'VIABLE';
  if (strScore >= 30) return 'MARGINAL';
  return 'AVOID';
}

/**
 * Runs STR engine only (menu action)
 */
function runSTREngineOnly() {
  runSTREngine();
  SpreadsheetApp.getActiveSpreadsheet().toast('STR Engine completed', 'Success', 3);
}

// ============================================================
// MTR ENGINE (Medium-Term Rental)
// ============================================================

/**
 * Runs the MTR strategy engine
 */
function runMTREngine() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mtrSheet = ss.getSheetByName(CONFIG.SHEETS.MTR_ENGINE);
  if (!mtrSheet) return;

  const deals = getDealsForAnalysis();
  if (deals.length === 0) return;

  logEvent('MTR', 'Running MTR Engine on ' + deals.length + ' deals');

  const headers = CONFIG.COLUMNS.MTR_ENGINE;
  const results = [];

  deals.forEach(deal => {
    const mtrAnalysis = analyzeMTRDeal(deal);
    results.push(mtrAnalysis);
  });

  // Write results
  if (mtrSheet.getLastRow() > 1) {
    mtrSheet.getRange(2, 1, mtrSheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (results.length > 0) {
    mtrSheet.getRange(2, 1, results.length, headers.length).setValues(results);
  }

  logEvent('MTR', 'MTR Engine completed: ' + results.length + ' deals analyzed');
}

/**
 * Analyzes a single deal for MTR potential
 */
function analyzeMTRDeal(deal) {
  const config = CONFIG.STRATEGIES.MTR;

  // Estimate furnished monthly rent
  const ltrRent = estimateMarketRent(deal);
  const furnishedRent = ltrRent * 1.35; // 35% premium for furnished

  // Calculate turns per year
  const avgStayLength = config.avgStayLength;
  const vacancyBetweenStays = config.vacancyBetweenStays / 4; // weeks to months
  const turnsPerYear = 12 / (avgStayLength + vacancyBetweenStays);

  // Vacancy smoothing score
  const vacancySmoothingScore = Math.min(100, turnsPerYear * 25);

  // Costs
  const utilitiesBundle = config.utilitiesBundleMonthly;
  const furnitureAmort = 8000 / config.furnitureAmortization; // Monthly furniture cost

  // Revenue calculation
  const monthlyGross = furnishedRent;
  const managementFee = monthlyGross * config.managementFee;
  const monthlyNet = monthlyGross - utilitiesBundle - furnitureAmort - managementFee;
  const annualNet = monthlyNet * 12 * (1 - (vacancyBetweenStays * turnsPerYear / 12));

  // MTR stability score
  const stabilityScore = calculateMTRStability(avgStayLength, turnsPerYear);

  // MTR advantage index (vs LTR)
  const ltrNet = ltrRent * 0.85; // Approximate LTR net
  const mtrAdvantage = ltrNet > 0 ? ((monthlyNet - ltrNet) / ltrNet * 100) : 0;

  // Calculate MTR score
  const mtrScore = calculateMTRScore(monthlyNet, stabilityScore, mtrAdvantage);
  const mtrVerdict = getMTRVerdict(mtrScore, monthlyNet, mtrAdvantage);

  return [
    deal['Deal ID'] || '',
    deal['Address'] || '',
    furnishedRent.toFixed(0),
    avgStayLength,
    turnsPerYear.toFixed(1),
    vacancySmoothingScore.toFixed(0),
    utilitiesBundle,
    furnitureAmort.toFixed(0),
    (config.managementFee * 100).toFixed(0) + '%',
    monthlyGross.toFixed(0),
    monthlyNet.toFixed(0),
    annualNet.toFixed(0),
    stabilityScore,
    mtrAdvantage.toFixed(1) + '%',
    mtrScore,
    mtrVerdict
  ];
}

/**
 * Calculates MTR stability score
 */
function calculateMTRStability(avgStayLength, turnsPerYear) {
  let score = 70; // Base score

  // Longer stays = more stable
  if (avgStayLength >= 6) score += 20;
  else if (avgStayLength >= 3) score += 10;
  else score -= 10;

  // Fewer turns = more stable
  if (turnsPerYear <= 2) score += 10;
  else if (turnsPerYear >= 6) score -= 15;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculates MTR score
 */
function calculateMTRScore(monthlyNet, stabilityScore, mtrAdvantage) {
  let score = 50;

  // Cash flow contribution
  if (monthlyNet >= 1500) score += 20;
  else if (monthlyNet >= 1000) score += 15;
  else if (monthlyNet >= 500) score += 10;
  else if (monthlyNet < 0) score -= 20;

  // Stability contribution
  score += (stabilityScore - 50) / 5;

  // Advantage over LTR contribution
  if (mtrAdvantage >= 30) score += 15;
  else if (mtrAdvantage >= 20) score += 10;
  else if (mtrAdvantage >= 10) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Gets MTR verdict
 */
function getMTRVerdict(mtrScore, monthlyNet, mtrAdvantage) {
  if (mtrScore >= 75 && monthlyNet >= 1000) return 'EXCELLENT';
  if (mtrScore >= 60 && mtrAdvantage >= 15) return 'GOOD';
  if (mtrScore >= 45) return 'VIABLE';
  if (mtrScore >= 30) return 'MARGINAL';
  return 'PREFER LTR';
}

/**
 * Runs MTR engine only (menu action)
 */
function runMTREngineOnly() {
  runMTREngine();
  SpreadsheetApp.getActiveSpreadsheet().toast('MTR Engine completed', 'Success', 3);
}

// ============================================================
// LTR ENGINE (Long-Term Rental)
// ============================================================

/**
 * Runs the LTR strategy engine
 */
function runLTREngine() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ltrSheet = ss.getSheetByName(CONFIG.SHEETS.LTR_ENGINE);
  if (!ltrSheet) return;

  const deals = getDealsForAnalysis();
  if (deals.length === 0) return;

  logEvent('LTR', 'Running LTR Engine on ' + deals.length + ' deals');

  const headers = CONFIG.COLUMNS.LTR_ENGINE;
  const results = [];

  deals.forEach(deal => {
    const ltrAnalysis = analyzeLTRDeal(deal);
    results.push(ltrAnalysis);
  });

  // Write results
  if (ltrSheet.getLastRow() > 1) {
    ltrSheet.getRange(2, 1, ltrSheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (results.length > 0) {
    ltrSheet.getRange(2, 1, results.length, headers.length).setValues(results);
  }

  logEvent('LTR', 'LTR Engine completed: ' + results.length + ' deals analyzed');
}

/**
 * Analyzes a single deal for LTR potential
 */
function analyzeLTRDeal(deal) {
  const config = CONFIG.STRATEGIES.LTR;

  // Get market rent
  const marketRent = estimateMarketRent(deal);
  const purchasePrice = parseFloat(deal['Asking Price']) || 0;

  // Vacancy adjustment
  const vacancyRate = config.vacancyRate;
  const effectiveGrossIncome = marketRent * (1 - vacancyRate);

  // Operating expenses
  const maintenanceReserve = marketRent * config.maintenanceReserve;
  const taxes = estimatePropertyTaxes(deal);
  const insurance = estimateInsurance(deal);
  const capExReserve = marketRent * config.capExReserve;
  const pmFee = marketRent * config.propertyManagement;

  const totalOperatingExpenses = maintenanceReserve + taxes + insurance + capExReserve + pmFee;

  // NOI
  const noiMonthly = effectiveGrossIncome - totalOperatingExpenses;
  const noiAnnual = noiMonthly * 12;

  // DSCR (assume 75% LTV, 7% rate, 30-year amort)
  const loanAmount = purchasePrice * 0.75;
  const monthlyDebt = calculateMortgagePayment(loanAmount, 0.07, 30);
  const dscr = monthlyDebt > 0 ? noiMonthly / monthlyDebt : 0;

  // Monthly net after debt service
  const monthlyNet = noiMonthly - monthlyDebt;

  // Cash-on-cash (25% down)
  const downPayment = purchasePrice * 0.25;
  const closingCosts = purchasePrice * 0.03;
  const totalCash = downPayment + closingCosts;
  const cashOnCash = totalCash > 0 ? (monthlyNet * 12 / totalCash) * 100 : 0;

  // Hold quality score
  const holdQualityScore = calculateHoldQuality(deal, dscr, cashOnCash);

  // Rent growth potential
  const rentGrowthPotential = estimateRentGrowth(deal);

  // Calculate LTR score
  const ltrScore = calculateLTRScore(monthlyNet, dscr, cashOnCash, holdQualityScore);
  const ltrVerdict = getLTRVerdict(ltrScore, dscr, cashOnCash);

  return [
    deal['Deal ID'] || '',
    deal['Address'] || '',
    marketRent.toFixed(0),
    (vacancyRate * 100).toFixed(0) + '%',
    effectiveGrossIncome.toFixed(0),
    (config.maintenanceReserve * 100).toFixed(0) + '%',
    taxes.toFixed(0),
    insurance.toFixed(0),
    capExReserve.toFixed(0),
    pmFee.toFixed(0),
    totalOperatingExpenses.toFixed(0),
    noiMonthly.toFixed(0),
    noiAnnual.toFixed(0),
    dscr.toFixed(2),
    monthlyNet.toFixed(0),
    cashOnCash.toFixed(1) + '%',
    holdQualityScore,
    rentGrowthPotential,
    ltrScore,
    ltrVerdict
  ];
}

/**
 * Estimates market rent based on property characteristics
 */
function estimateMarketRent(deal) {
  const beds = parseFloat(deal['Beds']) || 3;
  const baths = parseFloat(deal['Baths']) || 2;
  const sqft = parseFloat(deal['Sqft']) || 1500;

  // Base rent by beds
  const baseRent = {
    1: 1000, 2: 1300, 3: 1600, 4: 1900, 5: 2200
  };

  let rent = baseRent[Math.min(beds, 5)] || 1600;

  // Adjust for sqft
  if (sqft > 2000) rent *= 1.15;
  else if (sqft < 1200) rent *= 0.9;

  // Adjust by state (simplified)
  const state = deal['State'] || '';
  const highRentStates = ['CA', 'NY', 'MA', 'WA', 'CO'];
  const lowRentStates = ['OH', 'IN', 'KS', 'OK', 'AR'];

  if (highRentStates.includes(state)) rent *= 1.4;
  if (lowRentStates.includes(state)) rent *= 0.75;

  return Math.round(rent);
}

/**
 * Estimates property taxes
 */
function estimatePropertyTaxes(deal) {
  const price = parseFloat(deal['Asking Price']) || 0;
  const state = deal['State'] || '';

  // Tax rates vary by state
  const taxRates = {
    'NJ': 0.024, 'IL': 0.022, 'TX': 0.018, 'CT': 0.020,
    'NY': 0.017, 'CA': 0.008, 'FL': 0.010, 'OH': 0.016
  };

  const rate = taxRates[state] || 0.012;
  return (price * rate) / 12;
}

/**
 * Estimates insurance cost
 */
function estimateInsurance(deal) {
  const price = parseFloat(deal['Asking Price']) || 0;
  // Roughly 0.5% of home value annually
  return (price * 0.005) / 12;
}

/**
 * Calculates mortgage payment
 */
function calculateMortgagePayment(principal, annualRate, years) {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Calculates hold quality score
 */
function calculateHoldQuality(deal, dscr, cashOnCash) {
  let score = 50;

  // DSCR contribution
  if (dscr >= 1.5) score += 25;
  else if (dscr >= 1.25) score += 15;
  else if (dscr >= 1.0) score += 5;
  else score -= 20;

  // Cash-on-cash contribution
  if (cashOnCash >= 12) score += 20;
  else if (cashOnCash >= 8) score += 10;
  else if (cashOnCash >= 5) score += 5;

  // Property age factor
  const yearBuilt = parseFloat(deal['Year Built']) || 1980;
  const age = new Date().getFullYear() - yearBuilt;
  if (age < 20) score += 10;
  else if (age > 50) score -= 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Estimates rent growth potential
 */
function estimateRentGrowth(deal) {
  const state = deal['State'] || '';

  // High growth states
  const highGrowth = ['TX', 'FL', 'AZ', 'NC', 'TN'];
  if (highGrowth.includes(state)) return 'HIGH';

  // Low growth states
  const lowGrowth = ['IL', 'OH', 'MI', 'WV'];
  if (lowGrowth.includes(state)) return 'LOW';

  return 'MODERATE';
}

/**
 * Calculates LTR score
 */
function calculateLTRScore(monthlyNet, dscr, cashOnCash, holdQualityScore) {
  let score = 50;

  // Cash flow contribution
  if (monthlyNet >= 500) score += 20;
  else if (monthlyNet >= 300) score += 15;
  else if (monthlyNet >= 100) score += 10;
  else if (monthlyNet < 0) score -= 25;

  // DSCR contribution
  if (dscr >= 1.5) score += 15;
  else if (dscr >= 1.25) score += 10;
  else if (dscr < 1.0) score -= 15;

  // Cash-on-cash contribution
  if (cashOnCash >= 10) score += 10;
  else if (cashOnCash >= 6) score += 5;

  // Hold quality contribution
  score += (holdQualityScore - 50) / 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Gets LTR verdict
 */
function getLTRVerdict(ltrScore, dscr, cashOnCash) {
  if (dscr < 1.0) return 'AVOID';
  if (ltrScore >= 75 && dscr >= 1.25) return 'STRONG HOLD';
  if (ltrScore >= 60 && cashOnCash >= 6) return 'GOOD HOLD';
  if (ltrScore >= 45) return 'VIABLE';
  if (ltrScore >= 30) return 'MARGINAL';
  return 'PASS';
}

/**
 * Runs LTR engine only (menu action)
 */
function runLTREngineOnly() {
  runLTREngine();
  SpreadsheetApp.getActiveSpreadsheet().toast('LTR Engine completed', 'Success', 3);
}

// ============================================================
// CREATIVE FINANCE ENGINE
// ============================================================

/**
 * Runs the Creative Finance strategy engine
 */
function runCreativeEngine() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const creativeSheet = ss.getSheetByName(CONFIG.SHEETS.CREATIVE_ENGINE);
  if (!creativeSheet) return;

  const deals = getDealsForAnalysis();
  if (deals.length === 0) return;

  logEvent('CREATIVE', 'Running Creative Engine on ' + deals.length + ' deals');

  const headers = CONFIG.COLUMNS.CREATIVE_ENGINE;
  const results = [];

  deals.forEach(deal => {
    const creativeAnalysis = analyzeCreativeDeal(deal);
    results.push(creativeAnalysis);
  });

  // Write results
  if (creativeSheet.getLastRow() > 1) {
    creativeSheet.getRange(2, 1, creativeSheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (results.length > 0) {
    creativeSheet.getRange(2, 1, results.length, headers.length).setValues(results);
  }

  logEvent('CREATIVE', 'Creative Engine completed: ' + results.length + ' deals analyzed');
}

/**
 * Analyzes a single deal for creative finance options
 */
function analyzeCreativeDeal(deal) {
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  const arv = parseFloat(deal['ARV']) || askingPrice * 1.2;

  // Estimate existing mortgage (simplified)
  const estimatedMortgage = askingPrice * 0.6;
  const estimatedPayment = calculateMortgagePayment(estimatedMortgage, 0.045, 25);
  const existingRate = 0.045;

  // Analyze each creative strategy
  const sub2 = analyzeSub2(deal, askingPrice, estimatedMortgage, estimatedPayment);
  const wrap = analyzeWrap(deal, askingPrice, estimatedMortgage, estimatedPayment, existingRate);
  const sellerCarry = analyzeSellerCarry(deal, askingPrice);
  const leaseOption = analyzeLeaseOption(deal, askingPrice, arv);
  const hybrid = analyzeHybrid(deal, sub2, wrap, sellerCarry, leaseOption);

  // Determine best creative strategy
  const strategies = [
    { name: 'Sub2', viable: sub2.viable, score: sub2.score },
    { name: 'Wrap', viable: wrap.viable, score: wrap.score },
    { name: 'Seller Carry', viable: sellerCarry.viable, score: sellerCarry.score },
    { name: 'Lease Option', viable: leaseOption.viable, score: leaseOption.score },
    { name: 'Hybrid', viable: hybrid.viable, score: hybrid.score }
  ];

  const viableStrategies = strategies.filter(s => s.viable);
  const bestStrategy = viableStrategies.length > 0
    ? viableStrategies.reduce((a, b) => a.score > b.score ? a : b)
    : { name: 'None', score: 0 };

  const creativeScore = bestStrategy.score;
  const creativeVerdict = getCreativeVerdict(viableStrategies.length, creativeScore);

  return [
    deal['Deal ID'] || '',
    deal['Address'] || '',
    askingPrice,
    arv,
    estimatedMortgage.toFixed(0),
    estimatedPayment.toFixed(0),
    (existingRate * 100).toFixed(2) + '%',
    // Sub2
    sub2.viable ? 'Yes' : 'No',
    sub2.entryCost.toFixed(0),
    sub2.monthlyCashFlow.toFixed(0),
    sub2.equityPosition.toFixed(0),
    sub2.score,
    sub2.notes,
    // Wrap
    wrap.viable ? 'Yes' : 'No',
    (wrap.spread * 100).toFixed(2) + '%',
    wrap.monthlyCashFlow.toFixed(0),
    wrap.downPayment.toFixed(0),
    wrap.score,
    wrap.notes,
    // Seller Carry
    sellerCarry.viable ? 'Yes' : 'No',
    sellerCarry.terms,
    sellerCarry.monthlyPayment.toFixed(0),
    sellerCarry.score,
    sellerCarry.notes,
    // Lease Option
    leaseOption.viable ? 'Yes' : 'No',
    leaseOption.optionFee.toFixed(0),
    leaseOption.monthlyRent.toFixed(0),
    leaseOption.rentCredit.toFixed(0),
    leaseOption.strikePrice.toFixed(0),
    leaseOption.score,
    leaseOption.notes,
    // Hybrid
    hybrid.viable ? 'Yes' : 'No',
    hybrid.structure,
    hybrid.notes,
    // Summary
    bestStrategy.name,
    creativeScore,
    creativeVerdict
  ];
}

/**
 * Analyzes Sub2 viability
 */
function analyzeSub2(deal, askingPrice, mortgageBalance, existingPayment) {
  const result = {
    viable: false,
    entryCost: 0,
    monthlyCashFlow: 0,
    equityPosition: 0,
    score: 0,
    notes: ''
  };

  // Sub2 viability depends on equity and payment
  const equity = askingPrice - mortgageBalance;
  const equityPercent = askingPrice > 0 ? equity / askingPrice : 0;

  // Entry cost is typically back payments + some cash to seller
  result.entryCost = Math.max(5000, equity * 0.2);

  // Monthly cash flow (assume rental)
  const estimatedRent = estimateMarketRent(deal);
  result.monthlyCashFlow = estimatedRent - existingPayment - (estimatedRent * 0.15);
  result.equityPosition = equity;

  // Viability check
  if (equityPercent >= 0.15 && equityPercent <= 0.50 && result.monthlyCashFlow >= 200) {
    result.viable = true;
    result.notes = 'Good equity position, positive cash flow';
    result.score = Math.min(100, 50 + result.monthlyCashFlow / 20 + equityPercent * 50);
  } else if (equityPercent > 0.50) {
    result.notes = 'Too much equity - seller unlikely to accept';
    result.score = 20;
  } else if (result.monthlyCashFlow < 0) {
    result.notes = 'Negative cash flow';
    result.score = 10;
  } else {
    result.notes = 'Limited equity position';
    result.score = 30;
  }

  return result;
}

/**
 * Analyzes Wrap mortgage viability
 */
function analyzeWrap(deal, askingPrice, mortgageBalance, existingPayment, existingRate) {
  const result = {
    viable: false,
    spread: 0,
    monthlyCashFlow: 0,
    downPayment: 0,
    score: 0,
    notes: ''
  };

  // Wrap at higher rate
  const wrapRate = existingRate + 0.02;
  result.spread = wrapRate - existingRate;

  // Wrap payment (selling to end buyer)
  const wrapPrice = askingPrice * 1.05;
  const wrapPayment = calculateMortgagePayment(wrapPrice * 0.95, wrapRate, 30);

  result.monthlyCashFlow = wrapPayment - existingPayment;
  result.downPayment = wrapPrice * 0.05;

  // Viability
  if (result.monthlyCashFlow >= 300 && result.spread >= 0.01) {
    result.viable = true;
    result.notes = `${(result.spread * 100).toFixed(1)}% spread, strong cash flow`;
    result.score = Math.min(100, 50 + result.monthlyCashFlow / 10);
  } else if (result.monthlyCashFlow >= 100) {
    result.viable = true;
    result.notes = 'Modest spread opportunity';
    result.score = 50;
  } else {
    result.notes = 'Insufficient spread';
    result.score = 25;
  }

  return result;
}

/**
 * Analyzes Seller Carry viability
 */
function analyzeSellerCarry(deal, askingPrice) {
  const result = {
    viable: false,
    terms: '',
    monthlyPayment: 0,
    score: 0,
    notes: ''
  };

  const config = CONFIG.STRATEGIES.CREATIVE.sellerCarry;
  const loanAmount = askingPrice * 0.90; // 10% down
  const payment = calculateMortgagePayment(loanAmount, config.interestRate, config.termYears);

  result.monthlyPayment = payment;
  result.terms = `${(config.interestRate * 100)}% / ${config.termYears}yr / ${config.balloonYears}yr balloon`;

  // Check cash flow
  const estimatedRent = estimateMarketRent(deal);
  const cashFlow = estimatedRent - payment - (estimatedRent * 0.15);

  if (cashFlow >= 200) {
    result.viable = true;
    result.notes = 'Favorable terms, positive cash flow';
    result.score = Math.min(100, 60 + cashFlow / 20);
  } else if (cashFlow >= 0) {
    result.viable = true;
    result.notes = 'Break-even to slight positive';
    result.score = 45;
  } else {
    result.notes = 'Negative cash flow at these terms';
    result.score = 20;
  }

  return result;
}

/**
 * Analyzes Lease Option viability
 */
function analyzeLeaseOption(deal, askingPrice, arv) {
  const result = {
    viable: false,
    optionFee: 0,
    monthlyRent: 0,
    rentCredit: 0,
    strikePrice: 0,
    score: 0,
    notes: ''
  };

  const config = CONFIG.STRATEGIES.CREATIVE.leaseOption;

  result.optionFee = askingPrice * config.optionFee;
  result.monthlyRent = estimateMarketRent(deal) * 1.1; // Premium for option
  result.rentCredit = result.monthlyRent * config.rentCredit;
  result.strikePrice = askingPrice * 1.05; // 5% above current

  // Potential profit at exercise
  const potentialProfit = arv - result.strikePrice - (result.rentCredit * config.termMonths);

  if (potentialProfit >= 30000 && result.monthlyRent > 0) {
    result.viable = true;
    result.notes = `Strong upside: $${potentialProfit.toFixed(0)} potential`;
    result.score = Math.min(100, 50 + potentialProfit / 1000);
  } else if (potentialProfit >= 15000) {
    result.viable = true;
    result.notes = 'Moderate upside opportunity';
    result.score = 50;
  } else {
    result.notes = 'Limited upside at current values';
    result.score = 25;
  }

  return result;
}

/**
 * Analyzes Hybrid structures
 */
function analyzeHybrid(deal, sub2, wrap, sellerCarry, leaseOption) {
  const result = {
    viable: false,
    structure: '',
    score: 0,
    notes: ''
  };

  // Check for Sub2 + Wrap combination
  if (sub2.viable && wrap.viable) {
    result.viable = true;
    result.structure = 'Sub2 acquisition + Wrap to end buyer';
    result.score = Math.max(sub2.score, wrap.score) + 10;
    result.notes = 'Strong combination: low entry + spread income';
    return result;
  }

  // Check for Seller Carry + Lease Option
  if (sellerCarry.viable && leaseOption.viable) {
    result.viable = true;
    result.structure = 'Seller Carry acquisition + Lease Option exit';
    result.score = Math.max(sellerCarry.score, leaseOption.score) + 5;
    result.notes = 'Creative entry + option premium exit';
    return result;
  }

  result.notes = 'No strong hybrid combinations';
  return result;
}

/**
 * Gets creative finance verdict
 */
function getCreativeVerdict(viableCount, score) {
  if (viableCount === 0) return 'NO OPTIONS';
  if (score >= 75 && viableCount >= 2) return 'MULTIPLE OPTIONS';
  if (score >= 70) return 'STRONG';
  if (score >= 50) return 'VIABLE';
  if (score >= 30) return 'LIMITED';
  return 'MARGINAL';
}

/**
 * Runs Creative engine only (menu action)
 */
function runCreativeEngineOnly() {
  runCreativeEngine();
  SpreadsheetApp.getActiveSpreadsheet().toast('Creative Finance Engine completed', 'Success', 3);
}

// ============================================================
// MULTI-EXIT COMPARISON
// ============================================================

/**
 * Compares all exit strategies and picks the best
 */
function runMultiExitComparison() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  logEvent('MULTI-EXIT', 'Running multi-exit comparison');

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  // Load strategy results
  const flipResults = loadStrategyResults(ss, CONFIG.SHEETS.FLIP_ENGINE, 'Flip Score', 'Flip Verdict');
  const strResults = loadStrategyResults(ss, CONFIG.SHEETS.STR_ENGINE, 'STR Score', 'STR Verdict');
  const mtrResults = loadStrategyResults(ss, CONFIG.SHEETS.MTR_ENGINE, 'MTR Score', 'MTR Verdict');
  const ltrResults = loadStrategyResults(ss, CONFIG.SHEETS.LTR_ENGINE, 'LTR Score', 'LTR Verdict');
  const creativeResults = loadStrategyResults(ss, CONFIG.SHEETS.CREATIVE_ENGINE, 'Creative Score', 'Creative Verdict');

  // Get master data
  const data = masterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const dealId = data[i][colMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Get scores for this deal
    const flip = flipResults[dealId] || { score: 0, verdict: 'N/A' };
    const str = strResults[dealId] || { score: 0, verdict: 'N/A' };
    const mtr = mtrResults[dealId] || { score: 0, verdict: 'N/A' };
    const ltr = ltrResults[dealId] || { score: 0, verdict: 'N/A' };
    const creative = creativeResults[dealId] || { score: 0, verdict: 'N/A' };

    // Compare strategies
    const strategies = [
      { name: 'Flip', score: flip.score, verdict: flip.verdict },
      { name: 'STR', score: str.score, verdict: str.verdict },
      { name: 'MTR', score: mtr.score, verdict: mtr.verdict },
      { name: 'LTR', score: ltr.score, verdict: ltr.verdict },
      { name: 'Creative', score: creative.score, verdict: creative.verdict }
    ];

    // Sort by score
    strategies.sort((a, b) => b.score - a.score);
    const best = strategies[0];

    // Build comparison summary
    const summary = strategies.map(s => `${s.name}:${s.score}`).join(' | ');

    // Update Master DB
    if (colMap['Best Strategy']) {
      masterSheet.getRange(i + 1, colMap['Best Strategy']).setValue(best.name);
    }
    if (colMap['Strategy Rationale']) {
      masterSheet.getRange(i + 1, colMap['Strategy Rationale']).setValue(
        `${best.name} scores highest (${best.score}) with verdict: ${best.verdict}`
      );
    }
    if (colMap['Multi-Exit Summary']) {
      masterSheet.getRange(i + 1, colMap['Multi-Exit Summary']).setValue(summary);
    }
  }

  logEvent('MULTI-EXIT', 'Multi-exit comparison completed');
}

/**
 * Loads strategy results from a strategy sheet
 */
function loadStrategyResults(ss, sheetName, scoreCol, verdictCol) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return {};

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const dealIdCol = headers.indexOf('Deal ID');
  const scoreColIdx = headers.indexOf(scoreCol);
  const verdictColIdx = headers.indexOf(verdictCol);

  const results = {};
  for (let i = 1; i < data.length; i++) {
    const dealId = data[i][dealIdCol];
    if (dealId) {
      results[dealId] = {
        score: parseFloat(data[i][scoreColIdx]) || 0,
        verdict: data[i][verdictColIdx] || 'N/A'
      };
    }
  }

  return results;
}
