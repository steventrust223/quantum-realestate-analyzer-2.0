/**
 * Quantum Real Estate Analyzer - Repair Engine Module
 * Handles repair estimation, complexity analysis, and risk scoring
 */

// ============================================================
// REPAIR ANALYSIS MAIN FUNCTIONS
// ============================================================

/**
 * Runs repair analysis on all deals in Master Database
 */
function runRepairAnalysis() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const repairSheet = ss.getSheetByName(CONFIG.SHEETS.REPAIR_ESTIMATOR);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  logEvent('REPAIR', 'Running repair analysis');

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  const masterColMap = {};
  masterHeaders.forEach((h, i) => masterColMap[h] = i + 1);

  const repairHeaders = CONFIG.COLUMNS.REPAIR_ESTIMATOR;
  const repairResults = [];

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[masterColMap['Deal ID'] - 1];
    if (!dealId) continue;

    const repairAnalysis = analyzeRepairs({
      dealId: dealId,
      address: row[masterColMap['Address'] - 1],
      yearBuilt: row[masterColMap['Year Built'] - 1],
      sqft: row[masterColMap['Sqft'] - 1],
      propertyType: row[masterColMap['Property Type'] - 1],
      motivationSignals: row[masterColMap['Motivation Signals'] - 1],
      description: row[masterColMap['Seller Psychology Profile'] - 1] || ''
    });

    repairResults.push(repairAnalysis.row);

    // Update Master DB with repair data
    if (masterColMap['Repair Complexity Tier']) {
      masterSheet.getRange(i + 1, masterColMap['Repair Complexity Tier']).setValue(repairAnalysis.tier);
    }
    if (masterColMap['Est Rehab Low']) {
      masterSheet.getRange(i + 1, masterColMap['Est Rehab Low']).setValue(repairAnalysis.rehabLow);
    }
    if (masterColMap['Est Rehab High']) {
      masterSheet.getRange(i + 1, masterColMap['Est Rehab High']).setValue(repairAnalysis.rehabHigh);
    }
    if (masterColMap['Repair Risk Score']) {
      masterSheet.getRange(i + 1, masterColMap['Repair Risk Score']).setValue(repairAnalysis.riskScore);
    }
  }

  // Write to Repair Estimator sheet
  if (repairSheet) {
    if (repairSheet.getLastRow() > 1) {
      repairSheet.getRange(2, 1, repairSheet.getLastRow() - 1, repairHeaders.length).clearContent();
    }
    if (repairResults.length > 0) {
      repairSheet.getRange(2, 1, repairResults.length, repairHeaders.length).setValues(repairResults);
    }
  }

  logEvent('REPAIR', `Repair analysis completed: ${repairResults.length} properties analyzed`);
}

/**
 * Analyzes repairs for a single property
 * @param {Object} property - Property details
 * @returns {Object} Repair analysis result
 */
function analyzeRepairs(property) {
  const sqft = parseFloat(property.sqft) || 1500;
  const yearBuilt = parseFloat(property.yearBuilt) || 1980;
  const propertyType = property.propertyType || 'SFR';
  const signals = String(property.motivationSignals || '').toLowerCase();
  const description = String(property.description || '').toLowerCase();

  // Determine complexity tier
  const complexityTier = determineComplexityTier(yearBuilt, signals, description);

  // Get repair config for tier
  const repairConfig = CONFIG.REPAIR[complexityTier] || CONFIG.REPAIR.MODERATE;

  // Calculate rehab estimates
  const rehabLow = Math.round(sqft * repairConfig.lowMultiplier);
  const rehabHigh = Math.round(sqft * repairConfig.highMultiplier);
  const rehabMid = Math.round((rehabLow + rehabHigh) / 2);

  // Calculate risk score
  const riskScore = calculateRepairRisk(complexityTier, yearBuilt, propertyType);

  // Estimate individual repair categories
  const categoryEstimates = estimateRepairCategories(sqft, complexityTier, yearBuilt);

  // Build result row
  const row = [
    property.dealId,
    property.address,
    yearBuilt,
    sqft,
    propertyType,
    extractConditionNotes(signals, description),
    categoryEstimates.roof,
    categoryEstimates.hvac,
    categoryEstimates.plumbing,
    categoryEstimates.electrical,
    categoryEstimates.foundation,
    categoryEstimates.kitchen,
    categoryEstimates.bathrooms,
    categoryEstimates.flooring,
    categoryEstimates.paint,
    categoryEstimates.windowsDoors,
    categoryEstimates.exterior,
    categoryEstimates.landscaping,
    categoryEstimates.other,
    complexityTier,
    rehabLow,
    rehabHigh,
    rehabMid,
    riskScore,
    getRepairNotes(complexityTier, yearBuilt)
  ];

  return {
    row: row,
    tier: complexityTier,
    rehabLow: rehabLow,
    rehabHigh: rehabHigh,
    rehabMid: rehabMid,
    riskScore: riskScore
  };
}

// ============================================================
// COMPLEXITY DETERMINATION
// ============================================================

/**
 * Determines repair complexity tier
 * @param {number} yearBuilt - Year property was built
 * @param {string} signals - Motivation signals
 * @param {string} description - Property description
 * @returns {string} Complexity tier
 */
function determineComplexityTier(yearBuilt, signals, description) {
  const combinedText = (signals + ' ' + description).toLowerCase();
  const age = new Date().getFullYear() - yearBuilt;

  // Check for teardown indicators
  const teardownKeywords = ['teardown', 'tear down', 'demolition', 'condemned', 'uninhabitable',
    'fire damage', 'total loss', 'bulldoze'];
  if (teardownKeywords.some(k => combinedText.includes(k))) {
    return 'TEARDOWN';
  }

  // Check for full gut indicators
  const gutKeywords = ['gut rehab', 'full rehab', 'complete renovation', 'down to studs',
    'major renovation', 'structural issues', 'foundation problems', 'extensive damage'];
  if (gutKeywords.some(k => combinedText.includes(k)) || age > 80) {
    return 'FULL_GUT';
  }

  // Check for heavy rehab indicators
  const heavyKeywords = ['needs work', 'fixer upper', 'fixer-upper', 'investor special',
    'handyman special', 'as-is', 'as is', 'needs renovation', 'significant repairs',
    'roof replacement', 'new roof needed', 'foundation repair'];
  if (heavyKeywords.some(k => combinedText.includes(k)) || age > 50) {
    return 'HEAVY';
  }

  // Check for cosmetic indicators
  const cosmeticKeywords = ['cosmetic', 'paint', 'carpet', 'minor updates', 'refresh',
    'move-in ready', 'light rehab', 'turnkey'];
  if (cosmeticKeywords.some(k => combinedText.includes(k)) || age < 15) {
    return 'COSMETIC';
  }

  // Default to moderate based on age
  if (age <= 25) return 'COSMETIC';
  if (age <= 40) return 'MODERATE';
  if (age <= 60) return 'HEAVY';
  return 'FULL_GUT';
}

/**
 * Calculates repair risk score
 * @param {string} tier - Complexity tier
 * @param {number} yearBuilt - Year built
 * @param {string} propertyType - Property type
 * @returns {number} Risk score (0-100)
 */
function calculateRepairRisk(tier, yearBuilt, propertyType) {
  const repairConfig = CONFIG.REPAIR[tier] || CONFIG.REPAIR.MODERATE;
  let riskScore = repairConfig.riskScore;

  const age = new Date().getFullYear() - yearBuilt;

  // Age adjustments
  if (age > 60) riskScore += 10;
  if (age > 80) riskScore += 10;
  if (age < 20) riskScore -= 10;

  // Property type adjustments
  if (propertyType === 'Mobile Home') riskScore += 15;
  if (propertyType === 'Multi-Family') riskScore += 5;
  if (propertyType === 'Condo') riskScore -= 5;

  return Math.min(100, Math.max(0, riskScore));
}

// ============================================================
// CATEGORY-LEVEL ESTIMATES
// ============================================================

/**
 * Estimates repairs by category
 * @param {number} sqft - Square footage
 * @param {string} tier - Complexity tier
 * @param {number} yearBuilt - Year built
 * @returns {Object} Category estimates
 */
function estimateRepairCategories(sqft, tier, yearBuilt) {
  const age = new Date().getFullYear() - yearBuilt;

  // Base multipliers by tier
  const tierMultipliers = {
    'COSMETIC': 0.3,
    'MODERATE': 1.0,
    'HEAVY': 2.0,
    'FULL_GUT': 3.5,
    'TEARDOWN': 5.0
  };
  const multiplier = tierMultipliers[tier] || 1.0;

  // Category base costs (per sqft where applicable)
  const estimates = {
    roof: 0,
    hvac: 0,
    plumbing: 0,
    electrical: 0,
    foundation: 0,
    kitchen: 0,
    bathrooms: 0,
    flooring: 0,
    paint: 0,
    windowsDoors: 0,
    exterior: 0,
    landscaping: 0,
    other: 0
  };

  // Roof (age-dependent)
  if (age > 20 || tier === 'FULL_GUT' || tier === 'TEARDOWN') {
    estimates.roof = Math.round(sqft * 5 * multiplier);
  }

  // HVAC (age-dependent)
  if (age > 15 || tier === 'HEAVY' || tier === 'FULL_GUT') {
    estimates.hvac = Math.round(6000 * multiplier);
  }

  // Plumbing
  if (tier === 'FULL_GUT' || tier === 'TEARDOWN') {
    estimates.plumbing = Math.round(sqft * 8 * multiplier * 0.5);
  } else if (tier === 'HEAVY') {
    estimates.plumbing = Math.round(3000 * multiplier);
  }

  // Electrical
  if (age > 40 || tier === 'FULL_GUT' || tier === 'TEARDOWN') {
    estimates.electrical = Math.round(sqft * 6 * multiplier * 0.5);
  }

  // Foundation
  if (tier === 'FULL_GUT' || tier === 'TEARDOWN') {
    estimates.foundation = Math.round(sqft * 10 * multiplier * 0.3);
  }

  // Kitchen (always some work)
  const kitchenBase = tier === 'COSMETIC' ? 2000 : tier === 'MODERATE' ? 8000 :
    tier === 'HEAVY' ? 15000 : 25000;
  estimates.kitchen = Math.round(kitchenBase * multiplier * 0.7);

  // Bathrooms (estimate 2 bathrooms average)
  const bathBase = tier === 'COSMETIC' ? 1000 : tier === 'MODERATE' ? 4000 :
    tier === 'HEAVY' ? 8000 : 15000;
  estimates.bathrooms = Math.round(bathBase * 2 * multiplier * 0.7);

  // Flooring
  estimates.flooring = Math.round(sqft * (tier === 'COSMETIC' ? 2 : tier === 'MODERATE' ? 4 :
    tier === 'HEAVY' ? 6 : 8) * multiplier * 0.8);

  // Paint
  estimates.paint = Math.round(sqft * (tier === 'COSMETIC' ? 1.5 : 2.5) * multiplier * 0.6);

  // Windows/Doors
  if (age > 25 || tier === 'HEAVY' || tier === 'FULL_GUT') {
    estimates.windowsDoors = Math.round(5000 * multiplier);
  }

  // Exterior
  estimates.exterior = Math.round(sqft * 2 * multiplier * 0.5);

  // Landscaping
  estimates.landscaping = Math.round(2000 * multiplier * 0.5);

  // Other/contingency
  const subtotal = Object.values(estimates).reduce((a, b) => a + b, 0);
  estimates.other = Math.round(subtotal * 0.1);

  return estimates;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Extracts condition notes from signals and description
 */
function extractConditionNotes(signals, description) {
  const combinedText = (signals + ' ' + description).toLowerCase();
  const notes = [];

  const conditions = [
    { keyword: 'roof', note: 'Roof concerns' },
    { keyword: 'hvac', note: 'HVAC needs attention' },
    { keyword: 'foundation', note: 'Foundation issues' },
    { keyword: 'mold', note: 'Potential mold' },
    { keyword: 'water damage', note: 'Water damage' },
    { keyword: 'fire', note: 'Fire damage' },
    { keyword: 'termite', note: 'Termite concerns' },
    { keyword: 'pest', note: 'Pest issues' },
    { keyword: 'electrical', note: 'Electrical work needed' },
    { keyword: 'plumbing', note: 'Plumbing issues' }
  ];

  conditions.forEach(c => {
    if (combinedText.includes(c.keyword)) {
      notes.push(c.note);
    }
  });

  return notes.join('; ') || 'No specific concerns noted';
}

/**
 * Gets repair notes based on tier and age
 */
function getRepairNotes(tier, yearBuilt) {
  const age = new Date().getFullYear() - yearBuilt;

  const tierNotes = {
    'COSMETIC': 'Light updates needed - paint, carpet, fixtures',
    'MODERATE': 'Standard rehab - some mechanical and cosmetic updates',
    'HEAVY': 'Major rehab required - significant systems and cosmetic work',
    'FULL_GUT': 'Complete renovation needed - down to studs',
    'TEARDOWN': 'Teardown candidate - land value focus'
  };

  let notes = tierNotes[tier] || 'Standard rehab estimate';

  if (age > 50) {
    notes += '. Property age suggests potential hidden issues.';
  }

  return notes;
}

// ============================================================
// REPAIR ESTIMATOR UI FUNCTIONS
// ============================================================

/**
 * Gets repair estimate for a specific property (for UI)
 * @param {string} dealId - Deal ID
 * @returns {Object} Repair estimate details
 */
function getRepairEstimate(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const repairSheet = ss.getSheetByName(CONFIG.SHEETS.REPAIR_ESTIMATOR);

  if (!repairSheet || repairSheet.getLastRow() <= 1) {
    return { error: 'No repair data available' };
  }

  const data = repairSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dealId) {
      const estimate = {};
      headers.forEach((h, j) => {
        estimate[h] = data[i][j];
      });
      return estimate;
    }
  }

  return { error: 'Deal not found' };
}

/**
 * Updates repair estimate for a specific property
 * @param {string} dealId - Deal ID
 * @param {Object} updates - Updated values
 */
function updateRepairEstimate(dealId, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const repairSheet = ss.getSheetByName(CONFIG.SHEETS.REPAIR_ESTIMATOR);
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!repairSheet || !masterSheet) return { error: 'Sheets not found' };

  const repairData = repairSheet.getDataRange().getValues();
  const repairHeaders = repairData[0];

  // Find the row
  let repairRowIndex = -1;
  for (let i = 1; i < repairData.length; i++) {
    if (repairData[i][0] === dealId) {
      repairRowIndex = i + 1;
      break;
    }
  }

  if (repairRowIndex === -1) return { error: 'Deal not found' };

  // Update repair sheet
  Object.entries(updates).forEach(([key, value]) => {
    const colIndex = repairHeaders.indexOf(key);
    if (colIndex >= 0) {
      repairSheet.getRange(repairRowIndex, colIndex + 1).setValue(value);
    }
  });

  // Recalculate totals if needed
  if (updates['Rehab Low'] || updates['Rehab High']) {
    // Update Master DB
    const masterData = masterSheet.getDataRange().getValues();
    const masterHeaders = masterData[0];

    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][masterHeaders.indexOf('Deal ID')] === dealId) {
        const rowNum = i + 1;
        if (updates['Rehab Low']) {
          const colIdx = masterHeaders.indexOf('Est Rehab Low');
          if (colIdx >= 0) masterSheet.getRange(rowNum, colIdx + 1).setValue(updates['Rehab Low']);
        }
        if (updates['Rehab High']) {
          const colIdx = masterHeaders.indexOf('Est Rehab High');
          if (colIdx >= 0) masterSheet.getRange(rowNum, colIdx + 1).setValue(updates['Rehab High']);
        }
        break;
      }
    }
  }

  logEvent('REPAIR', `Repair estimate updated for ${dealId}`);
  return { success: true };
}

// ============================================================
// QUICK REPAIR CALCULATOR
// ============================================================

/**
 * Quick repair calculation without full analysis
 * @param {number} sqft - Square footage
 * @param {string} condition - Condition level (cosmetic/moderate/heavy/full_gut)
 * @param {number} yearBuilt - Year built
 * @returns {Object} Quick estimate
 */
function quickRepairCalc(sqft, condition, yearBuilt) {
  const tier = condition.toUpperCase().replace(' ', '_');
  const repairConfig = CONFIG.REPAIR[tier] || CONFIG.REPAIR.MODERATE;

  const rehabLow = Math.round(sqft * repairConfig.lowMultiplier);
  const rehabHigh = Math.round(sqft * repairConfig.highMultiplier);

  return {
    tier: tier,
    low: rehabLow,
    high: rehabHigh,
    mid: Math.round((rehabLow + rehabHigh) / 2),
    risk: repairConfig.riskScore,
    perSqftLow: repairConfig.lowMultiplier,
    perSqftHigh: repairConfig.highMultiplier
  };
}
