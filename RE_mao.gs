/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_mao.gs - MAO & Repair Calculations
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles Maximum Allowable Offer calculations for different strategies:
 * - Wholesale
 * - Sub2 / Seller Financing
 * - Wraparound
 * - Fix & Flip
 *
 * Formula: MAO = (ARV × MaxOfferPercent) – Repairs – Costs – Profit – Fee
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MAO CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Runs MAO calculations for all properties in MASTER_PROPERTIES
 * Updates both MAO_ENGINE and MASTER_PROPERTIES sheets
 */
function RE_calculateAllMAO() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const maoSheet = ss.getSheetByName(SHEET_NAMES.MAO_ENGINE);

  if (!masterSheet || !maoSheet) {
    RE_logError('RE_calculateAllMAO', 'Required sheets not found');
    return;
  }

  RE_logInfo('RE_calculateAllMAO', 'Starting MAO calculations');

  // First, ensure ARV and repair estimates exist
  RE_estimateARVs();
  RE_estimateRepairCosts();

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaderMap = RE_createHeaderMap(masterData[0]);

  let calculated = 0;

  for (let i = 1; i < masterData.length; i++) {
    const propertyId = RE_getValueByHeader(masterData[i], 'Property ID', masterHeaderMap);
    const address = RE_getValueByHeader(masterData[i], 'Address', masterHeaderMap);
    const arv = RE_toNumber(RE_getValueByHeader(masterData[i], 'Estimated ARV', masterHeaderMap));
    const lightRepair = RE_toNumber(RE_getValueByHeader(masterData[i], 'Repair Estimate (Light)', masterHeaderMap));
    const fullRepair = RE_toNumber(RE_getValueByHeader(masterData[i], 'Repair Estimate (Full)', masterHeaderMap));
    const askingPrice = RE_toNumber(RE_getValueByHeader(masterData[i], 'Asking Price', masterHeaderMap));

    if (arv === 0) {
      continue; // Skip if no ARV
    }

    // Calculate MAO for both light and full repair scenarios
    // We'll use light repair as default
    const maoResult = RE_calculateMAOForProperty({
      propertyId: propertyId,
      address: address,
      arv: arv,
      repairType: REPAIR_TYPES.LIGHT,
      repairEstimate: lightRepair,
      strategy: 'wholesale'
    });

    // Write to MAO_ENGINE
    RE_writeToMAOEngine(maoResult);

    // Update MASTER_PROPERTIES
    RE_updateMasterWithMAO(propertyId, maoResult, askingPrice, arv);

    calculated++;
  }

  RE_logSuccess('RE_calculateAllMAO', `Calculated MAO for ${calculated} properties`);
}

/**
 * Calculates MAO for a single property
 *
 * @param {Object} params - Property parameters
 * @returns {Object} MAO calculation results
 */
function RE_calculateMAOForProperty(params) {
  const {
    propertyId,
    address,
    arv,
    repairType = REPAIR_TYPES.LIGHT,
    repairEstimate = 0,
    strategy = 'wholesale',
    holdingMonths = 3
  } = params;

  // Load settings based on strategy
  let maxOfferPercent, targetProfit, assignmentFee;

  if (strategy === 'wholesale') {
    maxOfferPercent = RE_getSetting('mao.wholesale.maxOfferPercent', 70);
    targetProfit = RE_getSetting('mao.wholesale.targetProfit', 15000);
    assignmentFee = RE_getSetting('mao.wholesale.assignmentFee', 10000);
  } else if (strategy === 'sub2') {
    maxOfferPercent = RE_getSetting('mao.sub2.maxOfferPercent', 85);
    targetProfit = RE_getSetting('mao.wholesale.targetProfit', 15000);
    assignmentFee = 0; // No assignment fee for Sub2
  } else if (strategy === 'wrap') {
    maxOfferPercent = RE_getSetting('mao.wrap.maxOfferPercent', 80);
    targetProfit = RE_getSetting('mao.wholesale.targetProfit', 15000);
    assignmentFee = 0;
  } else {
    // Default to wholesale
    maxOfferPercent = RE_getSetting('mao.wholesale.maxOfferPercent', 70);
    targetProfit = RE_getSetting('mao.wholesale.targetProfit', 15000);
    assignmentFee = RE_getSetting('mao.wholesale.assignmentFee', 10000);
  }

  // Calculate costs
  const closingCostPercent = RE_getSetting('mao.closingCostPercent', 3);
  const holdingCostsPerMonth = RE_getSetting('mao.holdingCostsPerMonth', 1000);

  const totalHoldingCosts = holdingMonths * holdingCostsPerMonth;

  // MAO Formula:
  // MAO = (ARV × MaxOfferPercent%) – Repairs – Holding – Target Profit – Assignment Fee
  const maxARVPrice = arv * (maxOfferPercent / 100);
  const totalCosts = repairEstimate + totalHoldingCosts + targetProfit + assignmentFee;

  let mao = maxARVPrice - totalCosts;

  // Don't allow negative MAO
  if (mao < 0) mao = 0;

  // Calculate closing costs (based on MAO)
  const closingCost = mao * (closingCostPercent / 100);

  // Adjust MAO for closing costs
  mao = mao - closingCost;

  // Suggested initial offer (typically 85-90% of MAO)
  const suggestedOffer = Math.round(mao * 0.87);

  // Counter offer range
  const counterLow = Math.round(mao * 0.90);
  const counterHigh = Math.round(mao * 0.98);

  // Strategy notes
  let strategyNotes = `${strategy.toUpperCase()} | `;
  strategyNotes += `Max ${maxOfferPercent}% ARV | `;
  strategyNotes += `Target Profit: ${RE_formatDollar(targetProfit)}`;

  return {
    propertyId: propertyId,
    address: address,
    arv: arv,
    repairType: repairType,
    repairEstimate: repairEstimate,
    holdingMonths: holdingMonths,
    holdingCostsPerMonth: holdingCostsPerMonth,
    totalHoldingCosts: totalHoldingCosts,
    closingCostPercent: closingCostPercent,
    closingCost: Math.round(closingCost),
    assignmentFee: assignmentFee,
    targetProfit: targetProfit,
    totalCosts: Math.round(totalCosts),
    mao: Math.round(mao),
    suggestedOffer: suggestedOffer,
    counterLow: counterLow,
    counterHigh: counterHigh,
    maxOfferPercent: maxOfferPercent,
    strategyNotes: strategyNotes,
    lastCalculated: new Date()
  };
}

/**
 * Writes MAO calculation to MAO_ENGINE sheet
 *
 * @param {Object} maoResult - MAO calculation result
 */
function RE_writeToMAOEngine(maoResult) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maoSheet = ss.getSheetByName(SHEET_NAMES.MAO_ENGINE);

  if (!maoSheet) return;

  // Check if property already exists in MAO_ENGINE
  const existingRow = RE_findRowByValue(maoSheet, 'Property ID', maoResult.propertyId);

  const rowData = [
    maoResult.propertyId,
    maoResult.address,
    maoResult.arv,
    maoResult.repairType,
    maoResult.repairEstimate,
    maoResult.holdingMonths,
    maoResult.holdingCostsPerMonth,
    maoResult.totalHoldingCosts,
    maoResult.closingCostPercent,
    maoResult.closingCost,
    maoResult.assignmentFee,
    maoResult.targetProfit,
    maoResult.totalCosts,
    maoResult.mao,
    maoResult.suggestedOffer,
    maoResult.counterLow,
    maoResult.counterHigh,
    maoResult.maxOfferPercent,
    maoResult.strategyNotes,
    maoResult.lastCalculated
  ];

  if (existingRow > 0) {
    // Update existing row
    maoSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Append new row
    maoSheet.appendRow(rowData);
  }
}

/**
 * Updates MASTER_PROPERTIES with MAO results
 *
 * @param {string} propertyId - Property ID
 * @param {Object} maoResult - MAO calculation result
 * @param {number} askingPrice - Seller's asking price
 * @param {number} arv - After Repair Value
 */
function RE_updateMasterWithMAO(propertyId, maoResult, askingPrice, arv) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) return;

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    const rowPropertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);

    if (rowPropertyId === propertyId) {
      const rowNum = i + 1;

      // Calculate equity % and profit potential
      const equity = arv > 0 ? ((arv - askingPrice) / arv * 100) : 0;
      const profitPotential = askingPrice > 0 ? (maoResult.mao - askingPrice) : 0;
      const profitMargin = askingPrice > 0 ? (profitPotential / askingPrice * 100) : 0;

      // Calculate all-in cost
      const allInCost = (askingPrice || 0) + maoResult.repairEstimate + maoResult.closingCost;

      // Update columns
      masterSheet.getRange(rowNum, headerMap['Chosen Repair Budget'] + 1).setValue(maoResult.repairEstimate);
      masterSheet.getRange(rowNum, headerMap['Total All-In Cost'] + 1).setValue(Math.round(allInCost));
      masterSheet.getRange(rowNum, headerMap['MAO'] + 1).setValue(maoResult.mao);
      masterSheet.getRange(rowNum, headerMap['Suggested Initial Offer'] + 1).setValue(maoResult.suggestedOffer);
      masterSheet.getRange(rowNum, headerMap['Max Wholesale Fee'] + 1).setValue(maoResult.assignmentFee);
      masterSheet.getRange(rowNum, headerMap['Equity %'] + 1).setValue(Math.round(equity * 10) / 10);
      masterSheet.getRange(rowNum, headerMap['Profit Potential'] + 1).setValue(Math.round(profitPotential));
      masterSheet.getRange(rowNum, headerMap['Profit Margin %'] + 1).setValue(Math.round(profitMargin * 10) / 10);
      masterSheet.getRange(rowNum, headerMap['Last Updated'] + 1).setValue(new Date());

      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFER ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyzes if a property is worth making an offer
 * Based on MAO vs Asking Price
 *
 * @param {string} propertyId - Property ID to analyze
 * @returns {Object} Analysis result
 */
function RE_analyzeOfferViability(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) return null;

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    const rowPropertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);

    if (rowPropertyId === propertyId) {
      const mao = RE_toNumber(RE_getValueByHeader(data[i], 'MAO', headerMap));
      const askingPrice = RE_toNumber(RE_getValueByHeader(data[i], 'Asking Price', headerMap));
      const profitPotential = RE_toNumber(RE_getValueByHeader(data[i], 'Profit Potential', headerMap));

      let viable = false;
      let recommendation = '';

      if (askingPrice === 0) {
        recommendation = 'No asking price available. Contact seller for details.';
      } else if (mao > askingPrice) {
        viable = true;
        const spread = mao - askingPrice;
        recommendation = `GREAT DEAL! MAO exceeds asking by ${RE_formatDollar(spread)}. Make offer ASAP.`;
      } else if (mao >= askingPrice * 0.85) {
        viable = true;
        recommendation = `Potential deal. MAO is ${RE_formatPercent((mao / askingPrice * 100) - 100)} of asking. Try to negotiate down.`;
      } else {
        recommendation = `PASS. MAO is too low (${RE_formatDollar(mao)} vs asking ${RE_formatDollar(askingPrice)}). Not a viable deal.`;
      }

      return {
        propertyId: propertyId,
        viable: viable,
        mao: mao,
        askingPrice: askingPrice,
        profitPotential: profitPotential,
        recommendation: recommendation
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB2 / CREATIVE FINANCING CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates Sub2 / Seller financing scenarios
 * This is more flexible than traditional wholesale
 *
 * @param {Object} params - Property and loan parameters
 * @returns {Object} Sub2 analysis result
 */
function RE_calculateSub2Scenario(params) {
  const {
    propertyId,
    arv,
    currentLoanBalance = 0,
    monthlyPayment = 0,
    interestRate = 0,
    yearsRemaining = 30,
    estimatedRent = 0
  } = params;

  // Calculate equity available
  const equity = arv - currentLoanBalance;
  const equityPercent = arv > 0 ? (equity / arv * 100) : 0;

  // Calculate monthly cash flow potential
  const estimatedExpenses = estimatedRent * 0.4; // 40% rule for expenses
  const monthlyCashFlow = estimatedRent - monthlyPayment - estimatedExpenses;

  // Calculate payoff timeline
  const totalPayments = yearsRemaining * 12;
  const principalPerPayment = currentLoanBalance / totalPayments; // Simplified

  // Is it a good Sub2 candidate?
  let viable = false;
  let recommendation = '';

  if (equityPercent < 10) {
    recommendation = 'Low equity deal. Good for Sub2 if cash flow is positive.';
  } else if (equityPercent > 30) {
    recommendation = 'High equity. Consider wholesale or traditional purchase instead.';
  } else if (monthlyCashFlow > 200) {
    viable = true;
    recommendation = `GOOD Sub2 candidate. Positive cash flow of ${RE_formatDollar(monthlyCashFlow)}/mo.`;
  } else if (monthlyCashFlow > 0) {
    viable = true;
    recommendation = `Marginal Sub2 deal. Low cash flow (${RE_formatDollar(monthlyCashFlow)}/mo).`;
  } else {
    recommendation = `Negative cash flow (${RE_formatDollar(monthlyCashFlow)}/mo). Not recommended.`;
  }

  return {
    propertyId: propertyId,
    viable: viable,
    currentLoanBalance: currentLoanBalance,
    equity: Math.round(equity),
    equityPercent: Math.round(equityPercent * 10) / 10,
    monthlyPayment: monthlyPayment,
    estimatedRent: estimatedRent,
    monthlyCashFlow: Math.round(monthlyCashFlow),
    yearsRemaining: yearsRemaining,
    recommendation: recommendation
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARATIVE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compares multiple exit strategies for a property
 * Helps determine best strategy
 *
 * @param {string} propertyId - Property ID
 * @returns {Object} Comparison of strategies
 */
function RE_compareStrategies(propertyId) {
  // This is a stub for future implementation
  // Would calculate ROI, timeline, and profit for:
  // - Wholesale
  // - Sub2
  // - Fix & Flip
  // - BRRRR
  // - STR
  // - LTR

  return {
    propertyId: propertyId,
    strategies: [
      { name: 'Wholesale', profit: 0, timeline: '30 days', roi: 0, viable: false },
      { name: 'Sub2', profit: 0, timeline: '5+ years', roi: 0, viable: false },
      { name: 'Fix & Flip', profit: 0, timeline: '4-6 months', roi: 0, viable: false }
    ],
    recommended: 'Wholesale'
  };
}
