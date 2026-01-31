/**
 * Quantum Real Estate Analyzer - Market Intelligence Module
 * Handles DOM, Sales Velocity, SOM, and Market Heat calculations
 */

// ============================================================
// MARKET INTELLIGENCE COMPUTATION
// ============================================================

/**
 * Computes all market intelligence metrics for Master Database
 */
function computeMarketIntelligence() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  logEvent('MARKET', 'Computing market intelligence metrics');

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    // Get property details
    const zip = String(row[colMap['ZIP'] - 1] || '');
    const dom = parseFloat(row[colMap['DOM'] - 1]) || 0;
    const askingPrice = parseFloat(row[colMap['Asking Price'] - 1]) || 0;
    const state = row[colMap['State'] - 1] || '';

    // Calculate Sales Velocity Score
    const velocityData = calculateSalesVelocity(zip, dom, state);
    if (colMap['Sales Velocity Score']) {
      masterSheet.getRange(rowNum, colMap['Sales Velocity Score']).setValue(velocityData.score);
    }
    if (colMap['Exit Speed Tier']) {
      masterSheet.getRange(rowNum, colMap['Exit Speed Tier']).setValue(velocityData.tier);
    }

    // Calculate Exit Risk Tier
    const exitRisk = calculateExitRisk(velocityData, row, colMap);
    if (colMap['Exit Risk Tier']) {
      masterSheet.getRange(rowNum, colMap['Exit Risk Tier']).setValue(exitRisk.tier);
    }

    // Calculate SOM Score
    const somScore = calculateSOMScore(zip, state, askingPrice);
    if (colMap['SOM Score']) {
      masterSheet.getRange(rowNum, colMap['SOM Score']).setValue(somScore);
    }

    // Calculate Market Heat Score
    const marketHeat = calculateMarketHeat(velocityData.score, somScore, dom);
    if (colMap['Market Heat Score']) {
      masterSheet.getRange(rowNum, colMap['Market Heat Score']).setValue(marketHeat);
    }
  }

  logEvent('MARKET', 'Market intelligence computation completed');
}

// ============================================================
// SALES VELOCITY
// ============================================================

/**
 * Calculates sales velocity score based on DOM and market data
 * @param {string} zip - ZIP code
 * @param {number} dom - Days on market
 * @param {string} state - State code
 * @returns {Object} Velocity data with score and tier
 */
function calculateSalesVelocity(zip, dom, state) {
  // Get base velocity tier from DOM
  const velocityTier = getVelocityTier(dom);

  // Adjust for market conditions (proxy-based)
  let adjustedScore = velocityTier.score;

  // Hot markets get a boost
  const hotMarkets = ['TX', 'FL', 'AZ', 'NC', 'TN', 'GA'];
  if (hotMarkets.includes(state)) {
    adjustedScore += 10;
  }

  // Slow markets get a penalty
  const slowMarkets = ['IL', 'OH', 'MI', 'WV', 'CT'];
  if (slowMarkets.includes(state)) {
    adjustedScore -= 10;
  }

  // ZIP-specific adjustments (would use real data in production)
  const zipVelocityBonus = getZIPVelocityBonus(zip);
  adjustedScore += zipVelocityBonus;

  adjustedScore = Math.min(100, Math.max(0, adjustedScore));

  return {
    score: adjustedScore,
    tier: velocityTier.tier,
    description: velocityTier.description,
    dom: dom
  };
}

/**
 * Gets ZIP-specific velocity bonus (proxy-based)
 * In production, this would query market data APIs
 */
function getZIPVelocityBonus(zip) {
  // Cache ZIP data for performance
  const cached = CacheManager.get('zipVelocity_' + zip);
  if (cached !== null) {
    return cached;
  }

  // Default: no adjustment
  let bonus = 0;

  // Known hot ZIPs (simplified - would use real data)
  const hotZips = ['75001', '33101', '85001', '28201', '37201'];
  if (hotZips.some(hz => zip.startsWith(hz.substring(0, 3)))) {
    bonus = 5;
  }

  // Cache for 1 hour
  CacheManager.set('zipVelocity_' + zip, bonus, 3600);

  return bonus;
}

/**
 * Computes DOM (Days on Market) if not provided
 * Uses listing history signals
 */
function computeDOM(deal) {
  // If DOM is provided, use it
  const existingDOM = parseFloat(deal['DOM']);
  if (existingDOM > 0) return existingDOM;

  // Check motivation signals for clues
  const signals = String(deal['Motivation Signals'] || '').toLowerCase();

  // Price drops suggest longer DOM
  if (signals.includes('price drop') || signals.includes('reduced')) {
    return 45; // Assume 45 days if price dropped
  }

  // New listing
  if (signals.includes('new listing') || signals.includes('just listed')) {
    return 7;
  }

  // Default assumption
  return 30;
}

// ============================================================
// EXIT RISK
// ============================================================

/**
 * Calculates exit risk based on multiple factors
 * @param {Object} velocityData - Velocity calculation result
 * @param {Array} row - Data row
 * @param {Object} colMap - Column index map
 * @returns {Object} Exit risk data
 */
function calculateExitRisk(velocityData, row, colMap) {
  let riskScore = 30; // Base risk

  // DOM-based risk
  if (velocityData.tier === 'SLOW') riskScore += 20;
  if (velocityData.tier === 'STALE') riskScore += 35;
  if (velocityData.tier === 'MOD') riskScore += 5;

  // Price point risk
  const askingPrice = parseFloat(row[colMap['Asking Price'] - 1]) || 0;
  const arv = parseFloat(row[colMap['ARV'] - 1]) || askingPrice;

  if (arv > 500000) riskScore += 10; // Higher price points take longer
  if (arv > 750000) riskScore += 10;

  // Repair complexity risk
  const repairTier = row[colMap['Repair Complexity Tier'] - 1] || 'MODERATE';
  if (repairTier === 'HEAVY') riskScore += 10;
  if (repairTier === 'FULL_GUT') riskScore += 20;
  if (repairTier === 'TEARDOWN') riskScore += 30;

  // Property type risk
  const propType = row[colMap['Property Type'] - 1] || '';
  if (propType === 'Mobile Home') riskScore += 15;
  if (propType === 'Land') riskScore += 20;
  if (propType === 'Multi-Family') riskScore += 5;

  // Cap at 100
  riskScore = Math.min(100, Math.max(0, riskScore));

  // Get tier
  const riskTier = getExitRiskTier(riskScore);

  return {
    score: riskScore,
    tier: riskTier.tier,
    maoMultiplier: riskTier.maoMultiplier
  };
}

// ============================================================
// SOM (SHARE OF MARKET / SATURATION)
// ============================================================

/**
 * Calculates SOM (market saturation) score
 * Higher score = more saturated/competitive market
 * @param {string} zip - ZIP code
 * @param {string} state - State code
 * @param {number} askingPrice - Asking price
 * @returns {number} SOM score (0-100)
 */
function calculateSOMScore(zip, state, askingPrice) {
  let somScore = 50; // Base saturation

  // State-level saturation (proxy for investor activity)
  const highSaturationStates = ['FL', 'TX', 'AZ', 'NV', 'GA'];
  const lowSaturationStates = ['WV', 'ME', 'VT', 'MT', 'WY'];

  if (highSaturationStates.includes(state)) {
    somScore += 15;
  } else if (lowSaturationStates.includes(state)) {
    somScore -= 15;
  }

  // Price point saturation
  // Very low prices attract more investor competition
  if (askingPrice < 100000) {
    somScore += 20;
  } else if (askingPrice < 200000) {
    somScore += 10;
  } else if (askingPrice > 500000) {
    somScore -= 10;
  }

  // ZIP-specific saturation (would use real inventory data)
  const zipSaturation = getZIPSaturation(zip);
  somScore += zipSaturation;

  return Math.min(100, Math.max(0, somScore));
}

/**
 * Gets ZIP-specific saturation adjustment
 * In production, this would query inventory/listing count APIs
 */
function getZIPSaturation(zip) {
  // Cached check
  const cached = CacheManager.get('zipSOM_' + zip);
  if (cached !== null) {
    return cached;
  }

  // Default: no adjustment
  // In production: query inventory levels, investor activity metrics
  let saturation = 0;

  // Cache for 1 hour
  CacheManager.set('zipSOM_' + zip, saturation, 3600);

  return saturation;
}

/**
 * Applies SOM impact to verdict/score
 * @param {number} baseScore - Base deal score
 * @param {number} somScore - SOM score
 * @returns {number} Adjusted score
 */
function applySOMImpact(baseScore, somScore) {
  const somTier = getSOMTier(somScore);
  return baseScore + somTier.verdictBoost;
}

// ============================================================
// MARKET HEAT
// ============================================================

/**
 * Calculates overall market heat score
 * @param {number} velocityScore - Sales velocity score
 * @param {number} somScore - SOM score
 * @param {number} dom - Days on market
 * @returns {number} Market heat score
 */
function calculateMarketHeat(velocityScore, somScore, dom) {
  // Market heat combines velocity (positive) with inverse of saturation
  let heatScore = 50;

  // Velocity contribution (hot markets have high velocity)
  heatScore += (velocityScore - 50) * 0.5;

  // Saturation inverse (saturated markets are harder)
  heatScore -= (somScore - 50) * 0.3;

  // DOM adjustment
  if (dom <= 14) heatScore += 10;
  else if (dom <= 30) heatScore += 5;
  else if (dom >= 90) heatScore -= 15;
  else if (dom >= 60) heatScore -= 5;

  return Math.min(100, Math.max(0, Math.round(heatScore)));
}

/**
 * Gets market heat description
 * @param {number} heatScore - Market heat score
 * @returns {string} Description
 */
function getMarketHeatDescription(heatScore) {
  if (heatScore >= 80) return 'Very Hot - Fast moving market';
  if (heatScore >= 65) return 'Hot - Active buyer demand';
  if (heatScore >= 50) return 'Warm - Normal activity';
  if (heatScore >= 35) return 'Cool - Slower than average';
  return 'Cold - Low activity market';
}

// ============================================================
// COMP CONFIDENCE
// ============================================================

/**
 * Calculates ARV/comp confidence score
 * @param {Object} deal - Deal object
 * @returns {number} Confidence score (0-100)
 */
function calculateCompConfidence(deal) {
  let confidence = 50; // Base confidence

  // ARV present
  const arv = parseFloat(deal['ARV']) || 0;
  if (arv > 0) confidence += 20;

  // Zestimate present and close to ARV
  const zestimate = parseFloat(deal['Zestimate']) || 0;
  if (zestimate > 0) {
    confidence += 10;

    // Check variance
    if (arv > 0) {
      const variance = Math.abs(arv - zestimate) / arv;
      if (variance <= 0.05) confidence += 15; // Within 5%
      else if (variance <= 0.10) confidence += 10; // Within 10%
      else if (variance >= 0.20) confidence -= 10; // More than 20% variance
    }
  }

  // Property details complete
  if (deal['Beds'] && deal['Baths'] && deal['Sqft']) {
    confidence += 10;
  }

  // Year built helps comp selection
  if (deal['Year Built']) {
    confidence += 5;
  }

  return Math.min(100, Math.max(0, confidence));
}

// ============================================================
// BULK MARKET DATA UPDATE
// ============================================================

/**
 * Updates market data for all records
 */
function updateAllMarketData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Updating market intelligence...', 'Processing', 30);

  try {
    computeMarketIntelligence();
    ss.toast('Market intelligence updated!', 'Success', 5);
    logEvent('MARKET', 'Bulk market data update completed');
  } catch (error) {
    logError('MARKET', error.message, error.stack);
    ss.toast('Update failed: ' + error.message, 'Error', 10);
  }
}

// ============================================================
// ABSORPTION RATE CALCULATION
// ============================================================

/**
 * Calculates absorption rate for a market
 * Absorption = Sales / Inventory
 * @param {string} zip - ZIP code
 * @param {string} state - State code
 * @returns {Object} Absorption data
 */
function calculateAbsorptionRate(zip, state) {
  // In production, this would query MLS/market data
  // Using proxy estimates based on state

  const absorptionRates = {
    'TX': { rate: 3.5, trend: 'increasing', inventory: 'low' },
    'FL': { rate: 3.0, trend: 'stable', inventory: 'moderate' },
    'AZ': { rate: 3.2, trend: 'increasing', inventory: 'low' },
    'CA': { rate: 4.5, trend: 'stable', inventory: 'moderate' },
    'NY': { rate: 5.0, trend: 'decreasing', inventory: 'high' },
    'OH': { rate: 4.0, trend: 'stable', inventory: 'moderate' },
    'GA': { rate: 2.8, trend: 'increasing', inventory: 'low' },
    'NC': { rate: 2.5, trend: 'increasing', inventory: 'very low' },
    'TN': { rate: 2.3, trend: 'increasing', inventory: 'very low' }
  };

  return absorptionRates[state] || {
    rate: 4.0,
    trend: 'stable',
    inventory: 'moderate'
  };
}

/**
 * Gets months of inventory interpretation
 * @param {number} months - Months of inventory
 * @returns {string} Market interpretation
 */
function getInventoryInterpretation(months) {
  if (months <= 2) return 'Extreme Seller\'s Market';
  if (months <= 4) return 'Seller\'s Market';
  if (months <= 6) return 'Balanced Market';
  if (months <= 8) return 'Buyer\'s Market';
  return 'Extreme Buyer\'s Market';
}
