/**
 * ================================================================
 * QUANTUM REAL ESTATE ANALYZER v2.0 - Analysis Engine
 * ================================================================
 * Handles property analysis, MAO calculation, risk assessment
 */

/**
 * Run full analysis on all properties in MASTER_PROPERTIES
 * Updates VERDICT sheet with results
 */
function RE_runFullAnalysis() {
  try {
    logEvent('INFO', 'Analysis', 'Starting full property analysis...');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = getOrCreateSheet(SHEET_NAMES.MASTER_PROPERTIES, MASTER_HEADERS);
    const verdictSheet = getOrCreateSheet(SHEET_NAMES.VERDICT, VERDICT_HEADERS);

    if (masterSheet.getLastRow() < 2) {
      logEvent('WARNING', 'Analysis', 'No properties to analyze in MASTER_PROPERTIES');
      return 0;
    }

    // Get all properties from master
    const properties = getSheetData(masterSheet);
    const analyzedResults = [];
    let successCount = 0;
    let errorCount = 0;

    // Analyze each property
    properties.forEach((property, index) => {
      try {
        const result = analyzeProperty(property);
        analyzedResults.push(result);
        successCount++;
      } catch (error) {
        logEvent('ERROR', 'Analysis', `Failed to analyze property at row ${index + 2}`, error.toString());
        errorCount++;
      }
    });

    // Sort by Deal Score (descending) and Classification
    analyzedResults.sort((a, b) => {
      // First sort by classification priority
      const classOrder = { 'HOT': 1, 'SOLID': 2, 'MARGINAL': 3, 'PASS': 4 };
      const classA = classOrder[a.classification] || 5;
      const classB = classOrder[b.classification] || 5;

      if (classA !== classB) {
        return classA - classB;
      }

      // Then by deal score
      return b.dealScore - a.dealScore;
    });

    // Clear verdict sheet (except headers) and write new results
    if (verdictSheet.getLastRow() > 1) {
      verdictSheet.deleteRows(2, verdictSheet.getLastRow() - 1);
    }

    // Write analyzed results to VERDICT
    analyzedResults.forEach(result => {
      verdictSheet.appendRow([
        result.propertyId,
        result.address,
        result.city,
        result.state,
        result.classification,
        result.dealScore,
        result.mao,
        result.askingPrice,
        result.spread,
        result.arv,
        result.repairEstimate,
        result.profitPotential,
        result.riskScore,
        result.underContract || '',
        result.contractDate || '',
        result.buyer || '',
        result.actionItems,
        new Date(),
        result.priority
      ]);
    });

    // Apply formatting to VERDICT sheet
    formatVerdictSheet(verdictSheet);

    logEvent('SUCCESS', 'Analysis', `Analysis completed: ${successCount} properties analyzed, ${errorCount} errors`);
    return successCount;

  } catch (error) {
    logEvent('ERROR', 'Analysis', 'Full analysis failed', error.toString());
    throw error;
  }
}

/**
 * Analyze a single property
 * @param {Object} property - Property data object
 * @return {Object} Analysis result
 */
function analyzeProperty(property) {
  try {
    const propertyId = safeString(property['Property ID']);
    const address = safeString(property['Address']);
    const city = safeString(property['City']);
    const state = safeString(property['State']);
    const askingPrice = safeNumber(property['Price'], 0);
    const sqft = safeNumber(property['Sqft'], 0);
    const yearBuilt = safeNumber(property['Year Built'], 0);
    const notes = safeString(property['Notes']);

    // Get ARV (use provided or estimate)
    let arv = safeNumber(property['ARV'], 0);
    if (arv === 0 && askingPrice > 0) {
      // Estimate ARV as asking price * 1.2 (assuming potential)
      arv = Math.round(askingPrice * 1.2);
    }

    // Get repair estimate (use provided or estimate)
    let repairEstimate = safeNumber(property['Estimated Repairs'], 0);
    if (repairEstimate === 0 && sqft > 0) {
      // Estimate repairs based on sqft
      repairEstimate = Math.round(sqft * ANALYSIS_CONFIG.REPAIR_ESTIMATE_SQF);
    }

    // Calculate MAO
    const mao = calculateMAO(arv, repairEstimate);

    // Calculate spread (difference between MAO and asking price)
    const spread = mao - askingPrice;

    // Calculate profit potential
    const profitPotential = calculateProfitPotential(arv, askingPrice, repairEstimate);

    // Calculate risk score
    const riskScore = calculateRiskScore(property);

    // Classify the deal
    const classification = classifyDeal(spread, profitPotential, askingPrice, riskScore);

    // Calculate deal score (0-100)
    const dealScore = calculateDealScore(spread, profitPotential, askingPrice, riskScore, arv);

    // Determine priority
    const priority = determinePriority(classification, dealScore, riskScore);

    // Generate action items
    const actionItems = generateActionItems(classification, spread, riskScore, notes);

    return {
      propertyId,
      address,
      city,
      state,
      classification,
      dealScore,
      mao,
      askingPrice,
      spread,
      arv,
      repairEstimate,
      profitPotential,
      riskScore,
      priority,
      actionItems,
      underContract: safeString(property['Status']).toUpperCase() === 'UNDER CONTRACT' ? 'YES' : '',
      contractDate: '',
      buyer: ''
    };

  } catch (error) {
    logEvent('ERROR', 'Analysis', `Failed to analyze property: ${property['Address']}`, error.toString());
    throw error;
  }
}

/**
 * Calculate Maximum Allowable Offer (MAO)
 * Formula: (ARV × Multiplier) - Repairs - Holding Costs - Closing Costs
 * @param {number} arv - After Repair Value
 * @param {number} repairs - Estimated repair costs
 * @return {number} MAO
 */
function calculateMAO(arv, repairs) {
  const multiplier = getConfig('ARV_MULTIPLIER', ANALYSIS_CONFIG.DEFAULT_ARV_MULTIPLIER);
  const holdingCosts = ANALYSIS_CONFIG.HOLDING_COSTS_MONTHLY * ANALYSIS_CONFIG.AVG_HOLDING_MONTHS;
  const closingCosts = arv * ANALYSIS_CONFIG.CLOSING_COSTS_PERCENT;

  const mao = (arv * multiplier) - repairs - holdingCosts - closingCosts;
  return Math.round(Math.max(0, mao));
}

/**
 * Calculate profit potential
 * @param {number} arv - After Repair Value
 * @param {number} askingPrice - Current asking price
 * @param {number} repairs - Repair estimate
 * @return {number} Estimated profit
 */
function calculateProfitPotential(arv, askingPrice, repairs) {
  const holdingCosts = ANALYSIS_CONFIG.HOLDING_COSTS_MONTHLY * ANALYSIS_CONFIG.AVG_HOLDING_MONTHS;
  const closingCosts = arv * ANALYSIS_CONFIG.CLOSING_COSTS_PERCENT;
  const sellingCosts = arv * 0.06; // Assume 6% selling costs

  const totalCosts = askingPrice + repairs + holdingCosts + closingCosts + sellingCosts;
  const profit = arv - totalCosts;

  return Math.round(profit);
}

/**
 * Calculate risk score (0-10, lower is better)
 * @param {Object} property - Property data
 * @return {number} Risk score
 */
function calculateRiskScore(property) {
  let score = 0;
  const repairs = safeNumber(property['Estimated Repairs'], 0);
  const yearBuilt = safeNumber(property['Year Built'], 0);
  const notes = safeString(property['Notes']).toLowerCase();

  // High repair costs add risk
  if (repairs > RISK_FACTORS.HIGH_REPAIR.threshold) {
    score += RISK_FACTORS.HIGH_REPAIR.points;
  }

  // Foundation/structural issues
  RISK_FACTORS.FOUNDATION_ISSUES.keywords.forEach(keyword => {
    if (notes.includes(keyword)) {
      score += RISK_FACTORS.FOUNDATION_ISSUES.points;
    }
  });

  // Legal issues
  RISK_FACTORS.LEGAL_ISSUES.keywords.forEach(keyword => {
    if (notes.includes(keyword)) {
      score += RISK_FACTORS.LEGAL_ISSUES.points;
    }
  });

  // Location issues
  RISK_FACTORS.LOCATION.keywords.forEach(keyword => {
    if (notes.includes(keyword)) {
      score += RISK_FACTORS.LOCATION.points;
    }
  });

  // Age of property
  if (yearBuilt > 0 && yearBuilt < RISK_FACTORS.AGE.threshold) {
    score += RISK_FACTORS.AGE.points;
  }

  return Math.min(10, score);
}

/**
 * Classify deal based on spread, profit, and risk
 * @param {number} spread - MAO minus asking price
 * @param {number} profit - Profit potential
 * @param {number} askingPrice - Asking price
 * @param {number} riskScore - Risk score
 * @return {string} Classification (HOT, SOLID, MARGINAL, PASS)
 */
function classifyDeal(spread, profit, askingPrice, riskScore) {
  const profitPercent = askingPrice > 0 ? (profit / askingPrice) * 100 : 0;

  // HOT: Great spread, good profit, low risk
  if (spread >= DEAL_THRESHOLDS.HOT.minSpread &&
      profitPercent >= DEAL_THRESHOLDS.HOT.minProfitPercent &&
      riskScore <= DEAL_THRESHOLDS.HOT.maxRiskScore) {
    return 'HOT';
  }

  // SOLID: Good spread, decent profit, acceptable risk
  if (spread >= DEAL_THRESHOLDS.SOLID.minSpread &&
      profitPercent >= DEAL_THRESHOLDS.SOLID.minProfitPercent &&
      riskScore <= DEAL_THRESHOLDS.SOLID.maxRiskScore) {
    return 'SOLID';
  }

  // MARGINAL: Minimal spread/profit, or higher risk
  if (spread >= DEAL_THRESHOLDS.MARGINAL.minSpread &&
      profitPercent >= DEAL_THRESHOLDS.MARGINAL.minProfitPercent &&
      riskScore <= DEAL_THRESHOLDS.MARGINAL.maxRiskScore) {
    return 'MARGINAL';
  }

  // PASS: Does not meet minimum thresholds
  return 'PASS';
}

/**
 * Calculate deal score (0-100)
 * Higher is better
 * @param {number} spread - Spread amount
 * @param {number} profit - Profit potential
 * @param {number} askingPrice - Asking price
 * @param {number} riskScore - Risk score (0-10)
 * @param {number} arv - After Repair Value
 * @return {number} Deal score
 */
function calculateDealScore(spread, profit, askingPrice, riskScore, arv) {
  // Normalize metrics to 0-100 scale
  const spreadScore = Math.min(100, (spread / 50000) * 100);
  const profitScore = Math.min(100, (profit / 50000) * 100);
  const riskPenalty = riskScore * 5; // Max 50 point penalty
  const roiScore = askingPrice > 0 ? Math.min(100, ((profit / askingPrice) * 100) * 2) : 0;

  // Weighted average
  const score = (
    (spreadScore * 0.3) +
    (profitScore * 0.3) +
    (roiScore * 0.2) +
    ((100 - riskPenalty) * 0.2)
  );

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Determine priority level
 * @param {string} classification - Deal classification
 * @param {number} dealScore - Deal score
 * @param {number} riskScore - Risk score
 * @return {string} Priority (HIGH, MEDIUM, LOW)
 */
function determinePriority(classification, dealScore, riskScore) {
  if (classification === 'HOT' || dealScore >= 80) {
    return 'HIGH';
  }
  if (classification === 'SOLID' || dealScore >= 60) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Generate action items for a property
 * @param {string} classification - Deal classification
 * @param {number} spread - Spread amount
 * @param {number} riskScore - Risk score
 * @param {string} notes - Property notes
 * @return {string} Action items text
 */
function generateActionItems(classification, spread, riskScore, notes) {
  const items = [];

  if (classification === 'HOT') {
    items.push('Contact seller immediately');
    items.push('Schedule property inspection');
  } else if (classification === 'SOLID') {
    items.push('Request seller contact info');
    items.push('Verify comps and ARV');
  }

  if (riskScore >= 7) {
    items.push('Get professional inspection quote');
  }

  if (notes.toLowerCase().includes('probate')) {
    items.push('Consult probate attorney');
  }

  if (notes.toLowerCase().includes('foreclosure')) {
    items.push('Check foreclosure status and timeline');
  }

  return items.length > 0 ? items.join('; ') : '-';
}

/**
 * Format the VERDICT sheet with colors and styles
 * @param {Sheet} sheet - VERDICT sheet
 */
function formatVerdictSheet(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // Get classification column (E)
    const classificationRange = sheet.getRange(2, 5, lastRow - 1, 1);
    const classificationValues = classificationRange.getValues();

    // Apply conditional formatting based on classification
    classificationValues.forEach((row, index) => {
      const rowNum = index + 2;
      const classification = row[0];
      let color = null;

      switch (classification) {
        case 'HOT':
          color = '#c8e6c9'; // Light green
          break;
        case 'SOLID':
          color = '#bbdefb'; // Light blue
          break;
        case 'MARGINAL':
          color = '#fff9c4'; // Light yellow
          break;
        case 'PASS':
          color = '#ffccbc'; // Light red
          break;
      }

      if (color) {
        sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).setBackground(color);
      }
    });

    // Format currency columns
    const currencyColumns = [7, 8, 9, 10, 11, 12]; // MAO, Price, Spread, ARV, Repairs, Profit
    currencyColumns.forEach(col => {
      sheet.getRange(2, col, lastRow - 1, 1).setNumberFormat('$#,##0');
    });

    // Format score columns
    sheet.getRange(2, 6, lastRow - 1, 1).setNumberFormat('0'); // Deal Score
    sheet.getRange(2, 13, lastRow - 1, 1).setNumberFormat('0'); // Risk Score

    logEvent('INFO', 'Analysis', 'VERDICT sheet formatted successfully');

  } catch (error) {
    logEvent('ERROR', 'Analysis', 'Failed to format VERDICT sheet', error.toString());
  }
}

/**
 * Rebuild verdict from existing MASTER_PROPERTIES data
 * Same as RE_runFullAnalysis but with user confirmation
 */
function RE_rebuildVerdict() {
  return RE_runFullAnalysis();
}
