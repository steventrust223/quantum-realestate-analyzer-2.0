/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_analysis.gs - Deal Classification & Analysis
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles:
 * - Deal classification (HOT/SOLID/PORTFOLIO/PASS)
 * - Risk scoring
 * - Exit strategy recommendations
 * - Market volume & velocity scoring
 * - Hazard flag identification
 */

// ═══════════════════════════════════════════════════════════════════════════
 // FULL ANALYSIS ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Runs complete analysis pipeline for all properties
 */
function RE_runFullAnalysis() {
  const ui = SpreadsheetApp.getUi();

  try {
    ui.alert('📊 Running Full Analysis',
             'This will:\n' +
             '1. Calculate MAO for all properties\n' +
             '2. Score market velocity\n' +
             '3. Calculate risk scores\n' +
             '4. Classify deals\n' +
             '5. Recommend exit strategies\n' +
             '6. Match buyers\n\n' +
             'This may take a moment...',
             ui.ButtonSet.OK);

    RE_logInfo('RE_runFullAnalysis', 'Starting full analysis pipeline');

    // Step 1: Calculate MAO
    RE_calculateAllMAO();

    // Step 2: Calculate market velocity
    RE_calculateAllVelocity();

    // Step 3: Calculate risk scores
    RE_calculateAllRisk();

    // Step 4: Classify all deals
    RE_classifyAllDeals();

    // Step 5: Recommend exit strategies
    RE_recommendAllExitStrategies();

    // Step 6: Match buyers
    RE_matchAllBuyers();

    // Step 7: Update dashboard
    RE_updateDashboard();

    RE_logSuccess('RE_runFullAnalysis', 'Full analysis complete');

    ui.alert('✅ Analysis Complete',
             'All properties have been analyzed!\n\n' +
             'Check the Control Center or Deal Review panel to see results.',
             ui.ButtonSet.OK);

  } catch (error) {
    RE_logError('RE_runFullAnalysis', 'Analysis failed', error.message);
    ui.alert('❌ Analysis Error', `An error occurred: ${error.message}`, ui.ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK SCORING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates risk score for all properties
 */
function RE_calculateAllRisk() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);

  if (!masterSheet) return;

  RE_logInfo('RE_calculateAllRisk', 'Calculating risk scores');

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let calculated = 0;

  for (let i = 1; i < data.length; i++) {
    const propertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);
    const repairEstimate = RE_toNumber(RE_getValueByHeader(data[i], 'Chosen Repair Budget', headerMap));
    const equity = RE_toNumber(RE_getValueByHeader(data[i], 'Equity %', headerMap));
    const marketVolumeScore = RE_toNumber(RE_getValueByHeader(data[i], 'Market Volume Score', headerMap));
    const velocityScore = RE_toNumber(RE_getValueByHeader(data[i], 'Sales Velocity Score', headerMap));

    const riskResult = RE_calculateRiskScore({
      propertyId: propertyId,
      repairEstimate: repairEstimate,
      equity: equity,
      marketVolumeScore: marketVolumeScore,
      velocityScore: velocityScore
    });

    // Update MASTER_PROPERTIES
    masterSheet.getRange(i + 1, headerMap['Risk Score'] + 1).setValue(riskResult.riskScore);
    masterSheet.getRange(i + 1, headerMap['Hazard Flags'] + 1).setValue(riskResult.hazardFlags.join(', '));

    calculated++;
  }

  RE_logSuccess('RE_calculateAllRisk', `Calculated risk for ${calculated} properties`);
}

/**
 * Calculates risk score for a single property
 * Risk score is 0-100 (0 = no risk, 100 = maximum risk)
 *
 * @param {Object} params - Property parameters
 * @returns {Object} Risk analysis result
 */
function RE_calculateRiskScore(params) {
  const {
    propertyId,
    repairEstimate = 0,
    equity = 0,
    marketVolumeScore = 50,
    velocityScore = 50,
    areaType = 'Suburban',
    propertyType = 'SFR'
  } = params;

  let riskScore = 0;
  const hazardFlags = [];

  // Factor 1: Repair complexity (0-30 points)
  const highRepairThreshold = RE_getSetting('risk.highRepair.threshold', 50000);
  if (repairEstimate > highRepairThreshold) {
    riskScore += 30;
    hazardFlags.push(HAZARD_FLAGS.HIGH_REHAB);
  } else if (repairEstimate > highRepairThreshold * 0.6) {
    riskScore += 20;
  } else if (repairEstimate > highRepairThreshold * 0.3) {
    riskScore += 10;
  }

  // Factor 2: Equity cushion (0-25 points)
  const lowEquityThreshold = RE_getSetting('risk.lowEquity.threshold', 15);
  if (equity < lowEquityThreshold) {
    riskScore += 25;
    hazardFlags.push(HAZARD_FLAGS.LOW_EQUITY);
  } else if (equity < 25) {
    riskScore += 15;
  } else if (equity < 35) {
    riskScore += 5;
  }

  // Factor 3: Market liquidity (0-25 points)
  if (marketVolumeScore < 30) {
    riskScore += 25;
    hazardFlags.push(HAZARD_FLAGS.LOW_LIQUIDITY);
  } else if (marketVolumeScore < 50) {
    riskScore += 15;
  } else if (marketVolumeScore < 70) {
    riskScore += 5;
  }

  // Factor 4: Sales velocity (0-20 points)
  if (velocityScore < 30) {
    riskScore += 20;
  } else if (velocityScore < 50) {
    riskScore += 12;
  } else if (velocityScore < 70) {
    riskScore += 5;
  }

  // Factor 5: Area type (0-10 points)
  if (areaType === AREA_TYPES.WAR_ZONE) {
    riskScore += 10;
    hazardFlags.push(HAZARD_FLAGS.WAR_ZONE);
  } else if (areaType === AREA_TYPES.RURAL) {
    riskScore += 5;
  }

  // Cap at 100
  if (riskScore > 100) riskScore = 100;

  // Determine risk level
  let riskLevel = 'Low';
  if (riskScore > 70) {
    riskLevel = 'High';
  } else if (riskScore > 40) {
    riskLevel = 'Medium';
  }

  return {
    propertyId: propertyId,
    riskScore: Math.round(riskScore),
    riskLevel: riskLevel,
    hazardFlags: hazardFlags
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classifies all deals in MASTER_PROPERTIES
 */
function RE_classifyAllDeals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const classifierSheet = ss.getSheetByName(SHEET_NAMES.DEAL_CLASSIFIER);

  if (!masterSheet || !classifierSheet) return;

  RE_logInfo('RE_classifyAllDeals', 'Classifying all deals');

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let classified = 0;

  for (let i = 1; i < data.length; i++) {
    const propertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);
    const address = RE_getValueByHeader(data[i], 'Address', headerMap);
    const profitPotential = RE_toNumber(RE_getValueByHeader(data[i], 'Profit Potential', headerMap));
    const profitMargin = RE_toNumber(RE_getValueByHeader(data[i], 'Profit Margin %', headerMap));
    const riskScore = RE_toNumber(RE_getValueByHeader(data[i], 'Risk Score', headerMap));
    const marketVolumeScore = RE_toNumber(RE_getValueByHeader(data[i], 'Market Volume Score', headerMap));
    const velocityScore = RE_toNumber(RE_getValueByHeader(data[i], 'Sales Velocity Score', headerMap));
    const equity = RE_toNumber(RE_getValueByHeader(data[i], 'Equity %', headerMap));
    const hazardFlags = RE_getValueByHeader(data[i], 'Hazard Flags', headerMap) || '';

    const classification = RE_classifyDeal({
      propertyId: propertyId,
      address: address,
      profitPotential: profitPotential,
      profitMargin: profitMargin,
      riskScore: riskScore,
      marketVolumeScore: marketVolumeScore,
      velocityScore: velocityScore,
      equity: equity,
      hazardFlags: hazardFlags
    });

    // Write to DEAL_CLASSIFIER
    RE_writeToDealClassifier(classification);

    // Update MASTER_PROPERTIES
    masterSheet.getRange(i + 1, headerMap['Deal Class'] + 1).setValue(classification.dealClass);

    classified++;
  }

  RE_logSuccess('RE_classifyAllDeals', `Classified ${classified} deals`);
}

/**
 * Classifies a single deal
 *
 * @param {Object} params - Deal parameters
 * @returns {Object} Classification result
 */
function RE_classifyDeal(params) {
  const {
    propertyId,
    address,
    profitPotential = 0,
    profitMargin = 0,
    riskScore = 0,
    marketVolumeScore = 50,
    velocityScore = 50,
    equity = 0,
    hazardFlags = ''
  } = params;

  // Load thresholds from settings
  const hotMinProfit = RE_getSetting('classify.hotDeal.minProfit', 25000);
  const hotMinMargin = RE_getSetting('classify.hotDeal.minMargin', 15);
  const hotMaxRisk = RE_getSetting('classify.hotDeal.maxRisk', 60);

  const solidMinProfit = RE_getSetting('classify.solid.minProfit', 15000);
  const solidMinMargin = RE_getSetting('classify.solid.minMargin', 10);
  const solidMaxRisk = RE_getSetting('classify.solid.maxRisk', 70);

  const portfolioMinProfit = RE_getSetting('classify.portfolio.minProfit', 8000);
  const portfolioMinMargin = RE_getSetting('classify.portfolio.minMargin', 5);

  let dealClass = DEAL_CLASSES.PASS;
  let reason = '';

  // Classification logic
  if (profitPotential >= hotMinProfit &&
      profitMargin >= hotMinMargin &&
      riskScore <= hotMaxRisk) {
    dealClass = DEAL_CLASSES.HOT;
    reason = `🔥 High profit (${RE_formatDollar(profitPotential)}), good margin (${profitMargin.toFixed(1)}%), acceptable risk`;
  }
  else if (profitPotential >= solidMinProfit &&
           profitMargin >= solidMinMargin &&
           riskScore <= solidMaxRisk) {
    dealClass = DEAL_CLASSES.SOLID;
    reason = `✅ Solid profit (${RE_formatDollar(profitPotential)}), decent margin (${profitMargin.toFixed(1)}%)`;
  }
  else if (profitPotential >= portfolioMinProfit &&
           profitMargin >= portfolioMinMargin) {
    dealClass = DEAL_CLASSES.PORTFOLIO;
    reason = `💼 Lower profit (${RE_formatDollar(profitPotential)}) but acceptable for portfolio`;
  }
  else {
    dealClass = DEAL_CLASSES.PASS;
    if (profitPotential < portfolioMinProfit) {
      reason = `❌ Profit too low (${RE_formatDollar(profitPotential)})`;
    } else if (profitMargin < portfolioMinMargin) {
      reason = `❌ Margin too low (${profitMargin.toFixed(1)}%)`;
    } else if (riskScore > solidMaxRisk) {
      reason = `⚠️ Risk too high (${riskScore})`;
    }
  }

  return {
    propertyId: propertyId,
    address: address,
    profitPotential: profitPotential,
    profitMargin: profitMargin,
    riskScore: riskScore,
    marketVolumeScore: marketVolumeScore,
    velocityScore: velocityScore,
    equity: equity,
    hazardFlags: hazardFlags,
    dealClass: dealClass,
    reason: reason,
    lastClassified: new Date()
  };
}

/**
 * Writes classification to DEAL_CLASSIFIER sheet
 *
 * @param {Object} classification - Classification result
 */
function RE_writeToDealClassifier(classification) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const classifierSheet = ss.getSheetByName(SHEET_NAMES.DEAL_CLASSIFIER);

  if (!classifierSheet) return;

  const existingRow = RE_findRowByValue(classifierSheet, 'Property ID', classification.propertyId);

  const rowData = [
    classification.propertyId,
    classification.address,
    classification.profitPotential,
    classification.profitMargin,
    classification.riskScore,
    classification.marketVolumeScore,
    classification.velocityScore,
    classification.equity,
    classification.hazardFlags,
    classification.dealClass,
    classification.reason,
    classification.lastClassified
  ];

  if (existingRow > 0) {
    classifierSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    classifierSheet.appendRow(rowData);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET VELOCITY & VOLUME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates market velocity scores for all properties
 */
function RE_calculateAllVelocity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const velocitySheet = ss.getSheetByName(SHEET_NAMES.SALES_VELOCITY);
  const marketDataSheet = ss.getSheetByName(SHEET_NAMES.MARKET_DATA);

  if (!masterSheet || !velocitySheet) return;

  RE_logInfo('RE_calculateAllVelocity', 'Calculating market velocity');

  // Load market data
  const marketData = {};
  if (marketDataSheet && marketDataSheet.getLastRow() > 1) {
    const mData = marketDataSheet.getDataRange().getValues();
    const mHeaderMap = RE_createHeaderMap(mData[0]);

    for (let i = 1; i < mData.length; i++) {
      const zip = RE_getValueByHeader(mData[i], 'ZIP', mHeaderMap);
      marketData[zip] = {
        medianDOM: RE_toNumber(RE_getValueByHeader(mData[i], 'Median DOM', mHeaderMap), 60),
        salesPerMonth: RE_toNumber(RE_getValueByHeader(mData[i], 'Sales Per Month', mHeaderMap), 20),
        marketHeat: RE_getValueByHeader(mData[i], 'Market Heat', mHeaderMap)
      };
    }
  }

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let calculated = 0;

  for (let i = 1; i < data.length; i++) {
    const propertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);
    const address = RE_getValueByHeader(data[i], 'Address', headerMap);
    const zip = RE_getValueByHeader(data[i], 'ZIP', headerMap);
    const arv = RE_toNumber(RE_getValueByHeader(data[i], 'Estimated ARV', headerMap));

    const market = marketData[zip] || { medianDOM: 60, salesPerMonth: 20, marketHeat: 'Warm' };

    const velocityResult = RE_calculateVelocity({
      propertyId: propertyId,
      address: address,
      zip: zip,
      arv: arv,
      medianDOM: market.medianDOM,
      salesPerMonth: market.salesPerMonth
    });

    // Write to SALES_VELOCITY
    RE_writeToVelocitySheet(velocityResult);

    // Update MASTER_PROPERTIES
    masterSheet.getRange(i + 1, headerMap['Market Volume Score'] + 1).setValue(velocityResult.volumeScore);
    masterSheet.getRange(i + 1, headerMap['Sales Velocity Score'] + 1).setValue(velocityResult.velocityScore);

    calculated++;
  }

  RE_logSuccess('RE_calculateAllVelocity', `Calculated velocity for ${calculated} properties`);
}

/**
 * Calculates velocity score for a property
 *
 * @param {Object} params - Property parameters
 * @returns {Object} Velocity analysis result
 */
function RE_calculateVelocity(params) {
  const {
    propertyId,
    address,
    zip,
    arv,
    medianDOM = 60,
    salesPerMonth = 20
  } = params;

  // Calculate volume score (0-100)
  // More sales per month = higher score
  let volumeScore = 0;
  if (salesPerMonth >= 50) {
    volumeScore = 100;
  } else if (salesPerMonth >= 30) {
    volumeScore = 80;
  } else if (salesPerMonth >= 15) {
    volumeScore = 60;
  } else if (salesPerMonth >= 8) {
    volumeScore = 40;
  } else {
    volumeScore = 20;
  }

  // Calculate velocity score (0-100)
  // Lower DOM = higher score
  let velocityScore = 0;
  const tierAMax = RE_getSetting('velocity.tierA.maxDOM', 30);
  const tierBMax = RE_getSetting('velocity.tierB.maxDOM', 60);
  const tierCMax = RE_getSetting('velocity.tierC.maxDOM', 90);

  if (medianDOM <= tierAMax) {
    velocityScore = 90 + Math.round((tierAMax - medianDOM) / tierAMax * 10);
    velocityTier = VELOCITY_TIERS.A;
  } else if (medianDOM <= tierBMax) {
    velocityScore = 60 + Math.round((tierBMax - medianDOM) / tierBMax * 30);
    velocityTier = VELOCITY_TIERS.B;
  } else if (medianDOM <= tierCMax) {
    velocityScore = 30 + Math.round((tierCMax - medianDOM) / tierCMax * 30);
    velocityTier = VELOCITY_TIERS.C;
  } else {
    velocityScore = Math.max(10, 30 - Math.round((medianDOM - tierCMax) / 10));
    velocityTier = VELOCITY_TIERS.D;
  }

  // Determine price point tier
  let pricePointTier = 'Mid-range';
  if (arv < 200000) {
    pricePointTier = 'Affordable';
  } else if (arv > 500000) {
    pricePointTier = 'Premium';
  }

  return {
    propertyId: propertyId,
    address: address,
    zip: zip,
    arv: arv,
    pricePointTier: pricePointTier,
    domEstimate: medianDOM,
    volumeScore: volumeScore,
    velocityScore: velocityScore,
    velocityTier: velocityTier,
    notes: `${salesPerMonth} sales/mo, ${medianDOM} days DOM`,
    lastCalculated: new Date()
  };
}

/**
 * Writes velocity data to SALES_VELOCITY sheet
 *
 * @param {Object} velocityResult - Velocity calculation result
 */
function RE_writeToVelocitySheet(velocityResult) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const velocitySheet = ss.getSheetByName(SHEET_NAMES.SALES_VELOCITY);

  if (!velocitySheet) return;

  const existingRow = RE_findRowByValue(velocitySheet, 'Property ID', velocityResult.propertyId);

  const rowData = [
    velocityResult.propertyId,
    velocityResult.address,
    velocityResult.zip,
    velocityResult.arv,
    velocityResult.pricePointTier,
    velocityResult.domEstimate,
    velocityResult.volumeScore,
    velocityResult.velocityScore,
    velocityResult.velocityTier,
    velocityResult.notes,
    velocityResult.lastCalculated
  ];

  if (existingRow > 0) {
    velocitySheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    velocitySheet.appendRow(rowData);
  }
}

// Continue in next file...
