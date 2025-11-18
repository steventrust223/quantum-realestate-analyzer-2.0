/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_exit_strategy.gs - Exit Strategy Recommendations
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Recommends optimal exit strategies for each property:
 * - Wholesale
 * - Wholetail
 * - Sub2
 * - Wraparound
 * - STR (Short-term Rental)
 * - MTR (Mid-term Rental)
 * - LTR (Long-term Rental)
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXIT STRATEGY ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recommends exit strategies for all properties
 */
function RE_recommendAllExitStrategies() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const exitSheet = ss.getSheetByName(SHEET_NAMES.EXIT_STRATEGY);

  if (!masterSheet || !exitSheet) return;

  RE_logInfo('RE_recommendAllExitStrategies', 'Recommending exit strategies');

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let processed = 0;

  for (let i = 1; i < data.length; i++) {
    const propertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);
    const address = RE_getValueByHeader(data[i], 'Address', headerMap);
    const arv = RE_toNumber(RE_getValueByHeader(data[i], 'Estimated ARV', headerMap));
    const repairEstimate = RE_toNumber(RE_getValueByHeader(data[i], 'Chosen Repair Budget', headerMap));
    const equity = RE_toNumber(RE_getValueByHeader(data[i], 'Equity %', headerMap));
    const marketVolumeScore = RE_toNumber(RE_getValueByHeader(data[i], 'Market Volume Score', headerMap));
    const velocityScore = RE_toNumber(RE_getValueByHeader(data[i], 'Sales Velocity Score', headerMap));
    const profitPotential = RE_toNumber(RE_getValueByHeader(data[i], 'Profit Potential', headerMap));
    const askingPrice = RE_toNumber(RE_getValueByHeader(data[i], 'Asking Price', headerMap));
    const sqft = RE_toNumber(RE_getValueByHeader(data[i], 'Sqft', headerMap));

    const strategyResult = RE_recommendExitStrategy({
      propertyId: propertyId,
      address: address,
      arv: arv,
      repairEstimate: repairEstimate,
      equity: equity,
      marketVolumeScore: marketVolumeScore,
      velocityScore: velocityScore,
      profitPotential: profitPotential,
      askingPrice: askingPrice,
      sqft: sqft
    });

    // Write to EXIT_STRATEGY
    RE_writeToExitStrategy(strategyResult);

    // Update MASTER_PROPERTIES
    masterSheet.getRange(i + 1, headerMap['Exit Strategy'] + 1).setValue(strategyResult.primaryStrategy);

    processed++;
  }

  RE_logSuccess('RE_recommendAllExitStrategies', `Recommended strategies for ${processed} properties`);
}

/**
 * Recommends exit strategy for a single property
 *
 * @param {Object} params - Property parameters
 * @returns {Object} Strategy recommendation
 */
function RE_recommendExitStrategy(params) {
  const {
    propertyId,
    address,
    arv,
    repairEstimate,
    equity,
    marketVolumeScore,
    velocityScore,
    profitPotential,
    askingPrice,
    sqft
  } = params;

  // Estimate monthly rent (simple heuristic)
  const rentMultiplier = RE_getSetting('exit.rentEstimate.multiplier', 0.008);
  const estimatedRent = Math.round(arv * rentMultiplier);

  // Estimate expenses (40% of rent)
  const estimatedExpenses = Math.round(estimatedRent * 0.4);

  // Estimate monthly payment (if financed at asking price)
  const estimatedPayment = askingPrice > 0 ? Math.round(askingPrice * 0.005) : 0; // ~6% rate, 30yr

  // Calculate potential cash flow
  const cashFlowPotential = estimatedRent - estimatedPayment - estimatedExpenses;

  // Decision logic
  const strategies = [];

  // WHOLESALE - Fast exit, high equity, good profit
  const wholesaleMinEquity = RE_getSetting('exit.wholesale.minEquity', 20);
  if (equity >= wholesaleMinEquity && profitPotential > 8000) {
    strategies.push({
      name: EXIT_STRATEGIES.WHOLESALE,
      score: 90 + (profitPotential / 1000),
      reason: `High equity (${equity.toFixed(1)}%), good profit (${RE_formatDollar(profitPotential)})`
    });
  }

  // WHOLETAIL - Good condition, minimal repairs
  if (repairEstimate < 15000 && equity >= 15 && velocityScore > 60) {
    strategies.push({
      name: EXIT_STRATEGIES.WHOLETAIL,
      score: 75 + velocityScore / 4,
      reason: `Light repairs (${RE_formatDollar(repairEstimate)}), fast market`
    });
  }

  // SUB2 - Low equity, good cash flow potential
  const sub2MinEquity = RE_getSetting('exit.sub2.minEquity', 10);
  if (equity >= sub2MinEquity && equity < 30 && cashFlowPotential > 0) {
    strategies.push({
      name: EXIT_STRATEGIES.SUB2,
      score: 70 + (cashFlowPotential / 10),
      reason: `Moderate equity (${equity.toFixed(1)}%), positive cash flow potential`
    });
  }

  // WRAP - Similar to Sub2 but higher equity
  if (equity >= 15 && equity < 40 && cashFlowPotential > 100) {
    strategies.push({
      name: EXIT_STRATEGIES.WRAP,
      score: 65 + (cashFlowPotential / 10),
      reason: `Good for seller financing, cash flow: ${RE_formatDollar(cashFlowPotential)}/mo`
    });
  }

  // STR - High rent potential areas
  const strMinCashFlow = RE_getSetting('exit.str.minCashflow', 500);
  if (cashFlowPotential > strMinCashFlow && marketVolumeScore > 60) {
    const strMultiplier = 2.5; // STR typically 2-3x LTR rents
    const strCashFlow = cashFlowPotential * strMultiplier;
    strategies.push({
      name: EXIT_STRATEGIES.STR,
      score: 80 + (strCashFlow / 50),
      reason: `High STR potential, est. ${RE_formatDollar(strCashFlow)}/mo cash flow`
    });
  }

  // MTR - Medium-term rental (travel nurses, corporate housing)
  const mtrMinCashFlow = RE_getSetting('exit.mtr.minCashflow', 300);
  if (cashFlowPotential > mtrMinCashFlow) {
    const mtrMultiplier = 1.5; // MTR typically 1.5x LTR rents
    const mtrCashFlow = cashFlowPotential * mtrMultiplier;
    strategies.push({
      name: EXIT_STRATEGIES.MTR,
      score: 70 + (mtrCashFlow / 30),
      reason: `MTR potential, est. ${RE_formatDollar(mtrCashFlow)}/mo cash flow`
    });
  }

  // LTR - Traditional rental
  const ltrMinCashFlow = RE_getSetting('exit.ltr.minCashflow', 200);
  if (cashFlowPotential > ltrMinCashFlow) {
    strategies.push({
      name: EXIT_STRATEGIES.LTR,
      score: 60 + (cashFlowPotential / 20),
      reason: `Stable LTR, ${RE_formatDollar(cashFlowPotential)}/mo cash flow`
    });
  }

  // Sort strategies by score
  strategies.sort((a, b) => b.score - a.score);

  // Determine primary and secondary
  let primaryStrategy = EXIT_STRATEGIES.TRASH;
  let secondaryStrategy = '';
  let strategyReason = 'No viable strategy found';
  let expectedTimeline = 'N/A';
  let expectedProfit = 0;

  if (strategies.length > 0) {
    primaryStrategy = strategies[0].name;
    strategyReason = strategies[0].reason;

    if (strategies.length > 1) {
      secondaryStrategy = strategies[1].name;
    }

    // Set timeline and profit based on strategy
    switch (primaryStrategy) {
      case EXIT_STRATEGIES.WHOLESALE:
        expectedTimeline = '2-4 weeks';
        expectedProfit = profitPotential;
        break;
      case EXIT_STRATEGIES.WHOLETAIL:
        expectedTimeline = '4-8 weeks';
        expectedProfit = profitPotential * 1.3;
        break;
      case EXIT_STRATEGIES.SUB2:
        expectedTimeline = '5+ years';
        expectedProfit = cashFlowPotential * 60; // 5 years of cash flow
        break;
      case EXIT_STRATEGIES.WRAP:
        expectedTimeline = '3-7 years';
        expectedProfit = cashFlowPotential * 48;
        break;
      case EXIT_STRATEGIES.STR:
        expectedTimeline = '1+ years';
        expectedProfit = cashFlowPotential * 2.5 * 12;
        break;
      case EXIT_STRATEGIES.MTR:
        expectedTimeline = '1+ years';
        expectedProfit = cashFlowPotential * 1.5 * 12;
        break;
      case EXIT_STRATEGIES.LTR:
        expectedTimeline = '5+ years';
        expectedProfit = cashFlowPotential * 12;
        break;
    }
  }

  return {
    propertyId: propertyId,
    address: address,
    arv: arv,
    repairEstimate: repairEstimate,
    equity: equity,
    marketVolumeScore: marketVolumeScore,
    velocityScore: velocityScore,
    estimatedRent: estimatedRent,
    cashFlowPotential: cashFlowPotential,
    condition: repairEstimate < 15000 ? 'Good' : (repairEstimate < 40000 ? 'Fair' : 'Poor'),
    primaryStrategy: primaryStrategy,
    secondaryStrategy: secondaryStrategy,
    strategyReason: strategyReason,
    expectedTimeline: expectedTimeline,
    expectedProfit: Math.round(expectedProfit),
    notes: `All strategies evaluated: ${strategies.map(s => s.name).join(', ')}`,
    lastAnalyzed: new Date()
  };
}

/**
 * Writes exit strategy to EXIT_STRATEGY sheet
 *
 * @param {Object} strategyResult - Strategy recommendation
 */
function RE_writeToExitStrategy(strategyResult) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const exitSheet = ss.getSheetByName(SHEET_NAMES.EXIT_STRATEGY);

  if (!exitSheet) return;

  const existingRow = RE_findRowByValue(exitSheet, 'Property ID', strategyResult.propertyId);

  const rowData = [
    strategyResult.propertyId,
    strategyResult.address,
    strategyResult.arv,
    strategyResult.repairEstimate,
    strategyResult.equity,
    strategyResult.marketVolumeScore,
    strategyResult.velocityScore,
    strategyResult.estimatedRent,
    strategyResult.cashFlowPotential,
    strategyResult.condition,
    strategyResult.primaryStrategy,
    strategyResult.secondaryStrategy,
    strategyResult.strategyReason,
    strategyResult.expectedTimeline,
    strategyResult.expectedProfit,
    strategyResult.notes,
    strategyResult.lastAnalyzed
  ];

  if (existingRow > 0) {
    exitSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    exitSheet.appendRow(rowData);
  }
}

/**
 * Gets recommended strategy for a property
 *
 * @param {string} propertyId - Property ID
 * @returns {string} Recommended strategy
 */
function RE_getRecommendedStrategy(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const exitSheet = ss.getSheetByName(SHEET_NAMES.EXIT_STRATEGY);

  if (!exitSheet) return 'Unknown';

  const data = exitSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    if (RE_getValueByHeader(data[i], 'Property ID', headerMap) === propertyId) {
      return RE_getValueByHeader(data[i], 'Primary Exit Strategy', headerMap);
    }
  }

  return 'Not Analyzed';
}
