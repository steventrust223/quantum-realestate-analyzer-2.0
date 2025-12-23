/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Scoring Module (scoring.gs)
 * ============================================================================
 *
 * Calculates all scoring metrics:
 * - Risk Score
 * - Sales Velocity Score
 * - Market Heat Score
 * - Motivation Score
 * - Seller Psychology Score
 * - Deal Classifier Score
 */

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Calculates all scores for a lead
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Pre-calculated values (ARV, repairs, market, etc.)
 * @returns {Object} All calculated scores
 */
function calculateAllScores(lead, calculations) {
  const riskScore = calculateRiskScore(lead, calculations);
  const velocityScore = calculateVelocityScore(lead, calculations);
  const marketHeatScore = calculateMarketHeatScore(lead, calculations);
  const motivationScore = calculateMotivationScore(lead);
  const sellerPsychologyScore = calculateSellerPsychologyScore(lead);

  return {
    risk: riskScore,
    velocity: velocityScore,
    marketHeat: marketHeatScore,
    motivation: motivationScore,
    sellerPsychology: sellerPsychologyScore
  };
}

// =============================================================================
// RISK SCORE
// =============================================================================

/**
 * Calculates risk score (0-100, lower is better/less risky)
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Calculated values
 * @returns {number} Risk score
 */
function calculateRiskScore(lead, calculations) {
  let score = 0;
  const weights = SCORING_WEIGHTS.RISK_FACTORS;

  // Condition Risk (0-25 points)
  const conditionRisk = calculateConditionRisk(lead['Condition']);
  score += conditionRisk * weights.conditionWeight * 100;

  // Market Risk (0-20 points)
  const marketRisk = calculateMarketRisk(calculations.market);
  score += marketRisk * weights.marketWeight * 100;

  // Price Risk (0-20 points)
  const priceRisk = calculatePriceRisk(lead, calculations);
  score += priceRisk * weights.priceWeight * 100;

  // Age Risk (0-15 points)
  const ageRisk = calculateAgeRisk(lead['Year Built']);
  score += ageRisk * weights.ageWeight * 100;

  // Location Risk (0-10 points)
  const locationRisk = calculateLocationRisk(lead);
  score += locationRisk * weights.locationWeight * 100;

  // Time Risk (0-10 points)
  const timeRisk = calculateTimeRisk(lead, calculations);
  score += timeRisk * weights.timeWeight * 100;

  return Math.min(Math.round(score), 100);
}

/**
 * Calculates condition risk component
 * @param {string} condition - Property condition
 * @returns {number} Risk factor (0-1)
 */
function calculateConditionRisk(condition) {
  const conditionData = normalizeCondition(condition);
  // Invert score - lower condition score = higher risk
  return 1 - (conditionData.score / 100);
}

/**
 * Calculates market risk component
 * @param {Object} marketData - Market data
 * @returns {number} Risk factor (0-1)
 */
function calculateMarketRisk(marketData) {
  if (!marketData) return 0.5; // Unknown = medium risk

  const heat = marketData.marketHeatScore || 50;
  const velocity = marketData.salesVelocity || 50;

  // Cold market = higher risk
  const marketRisk = 1 - (heat / 100);
  const velocityRisk = 1 - (velocity / 100);

  return (marketRisk + velocityRisk) / 2;
}

/**
 * Calculates price risk component
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Calculations
 * @returns {number} Risk factor (0-1)
 */
function calculatePriceRisk(lead, calculations) {
  const askingPrice = safeParseNumber(lead['Asking Price'], 0);
  const arv = calculations.arv || 0;

  if (askingPrice <= 0 || arv <= 0) return 0.5;

  const priceToArv = askingPrice / arv;

  // If asking > 90% of ARV, high risk
  if (priceToArv > 0.90) return 0.9;
  if (priceToArv > 0.80) return 0.7;
  if (priceToArv > 0.70) return 0.5;
  if (priceToArv > 0.60) return 0.3;
  return 0.1;
}

/**
 * Calculates age risk component
 * @param {number} yearBuilt - Year built
 * @returns {number} Risk factor (0-1)
 */
function calculateAgeRisk(yearBuilt) {
  const year = safeParseNumber(yearBuilt, 1970);
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age > 80) return 0.9;
  if (age > 60) return 0.7;
  if (age > 40) return 0.5;
  if (age > 25) return 0.3;
  return 0.1;
}

/**
 * Calculates location risk component
 * @param {Object} lead - Lead data
 * @returns {number} Risk factor (0-1)
 */
function calculateLocationRisk(lead) {
  // For now, base on whether we have market data
  // Could be enhanced with crime data, school ratings, etc.
  const hasZip = !isEmpty(lead['ZIP']);
  const hasCounty = !isEmpty(lead['County']);

  if (!hasZip) return 0.7;
  if (!hasCounty) return 0.4;
  return 0.2;
}

/**
 * Calculates time risk component (holding period risk)
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Calculations
 * @returns {number} Risk factor (0-1)
 */
function calculateTimeRisk(lead, calculations) {
  const repairs = calculations.repairs?.estimate || 0;

  // Heavy repairs = longer holding = higher time risk
  if (repairs > 75000) return 0.8;
  if (repairs > 50000) return 0.6;
  if (repairs > 25000) return 0.4;
  if (repairs > 10000) return 0.2;
  return 0.1;
}

/**
 * Gets risk level label from score
 * @param {number} score - Risk score
 * @returns {string} Risk level label
 */
function getRiskLevel(score) {
  if (score >= THRESHOLDS.RISK.CRITICAL) return 'CRITICAL';
  if (score >= THRESHOLDS.RISK.HIGH) return 'HIGH';
  if (score >= THRESHOLDS.RISK.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

// =============================================================================
// SALES VELOCITY SCORE
// =============================================================================

/**
 * Calculates sales velocity score (0-100, higher is better)
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Calculated values
 * @returns {number} Velocity score
 */
function calculateVelocityScore(lead, calculations) {
  let score = 50; // Base score

  // Market velocity from market data
  if (calculations.market && calculations.market.salesVelocity) {
    score = calculations.market.salesVelocity;
  }

  // Adjust for property type
  const propertyType = (lead['Property Type'] || '').toLowerCase();
  if (propertyType.includes('single family')) {
    score += 10; // SFH sells faster
  } else if (propertyType.includes('condo')) {
    score += 5;
  } else if (propertyType.includes('multi')) {
    score -= 5;
  }

  // Adjust for condition
  const conditionData = normalizeCondition(lead['Condition']);
  if (conditionData.score >= 70) {
    score += 10; // Good condition sells faster
  } else if (conditionData.score < 40) {
    score -= 10; // Poor condition sells slower
  }

  // Adjust for price point
  const askingPrice = safeParseNumber(lead['Asking Price'], 0);
  if (askingPrice > 0) {
    if (askingPrice < 150000) score += 10; // Entry level moves fast
    else if (askingPrice < 300000) score += 5;
    else if (askingPrice > 500000) score -= 10; // Luxury is slower
  }

  // Adjust for beds/baths
  const beds = safeParseNumber(lead['Beds'], 3);
  if (beds === 3 || beds === 4) {
    score += 5; // 3-4 beds are most in demand
  }

  return Math.max(0, Math.min(Math.round(score), 100));
}

/**
 * Gets velocity level label from score
 * @param {number} score - Velocity score
 * @returns {string} Velocity level label
 */
function getVelocityLevel(score) {
  if (score >= 80) return 'VERY FAST';
  if (score >= 60) return 'FAST';
  if (score >= 40) return 'MODERATE';
  if (score >= 20) return 'SLOW';
  return 'VERY SLOW';
}

// =============================================================================
// MARKET HEAT SCORE
// =============================================================================

/**
 * Calculates market heat score (0-100, higher is hotter/better)
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Calculated values
 * @returns {number} Market heat score
 */
function calculateMarketHeatScore(lead, calculations) {
  // If we have market data, use it
  if (calculations.market && calculations.market.marketHeatScore) {
    return calculations.market.marketHeatScore;
  }

  // Otherwise, estimate based on available data
  let score = 50; // Base score
  const weights = SCORING_WEIGHTS.MARKET_HEAT;

  // DOM (Days on Market) factor - estimate if not available
  // Lower DOM = hotter market
  score += 10; // Default assumption

  // Price trend factor
  // Would need market data for accurate assessment
  score += 5;

  // Investor activity factor
  const motivationSignals = (lead['Motivation Signals'] || '').toLowerCase();
  if (motivationSignals.includes('investor') || motivationSignals.includes('cash buyer')) {
    score += 10; // Signs of investor activity
  }

  // Population/demand factor based on state
  const state = (lead['State'] || '').toUpperCase();
  const hotStates = ['TX', 'FL', 'AZ', 'NC', 'TN', 'GA', 'SC'];
  const coldStates = ['WV', 'MS', 'LA', 'NM', 'AK'];

  if (hotStates.includes(state)) {
    score += 15;
  } else if (coldStates.includes(state)) {
    score -= 10;
  }

  return Math.max(0, Math.min(Math.round(score), 100));
}

/**
 * Gets market heat level label from score
 * @param {number} score - Market heat score
 * @returns {string} Heat level label
 */
function getMarketHeatLevel(score) {
  if (score >= THRESHOLDS.MARKET_HEAT.ON_FIRE) return 'ON FIRE';
  if (score >= THRESHOLDS.MARKET_HEAT.HOT) return 'HOT';
  if (score >= THRESHOLDS.MARKET_HEAT.WARM) return 'WARM';
  if (score >= THRESHOLDS.MARKET_HEAT.COOL) return 'COOL';
  return 'COLD';
}

// =============================================================================
// MOTIVATION SCORE
// =============================================================================

/**
 * Calculates seller motivation score (0-100, higher is more motivated)
 * @param {Object} lead - Lead data
 * @returns {number} Motivation score
 */
function calculateMotivationScore(lead) {
  let score = 30; // Base score

  const motivationText = (
    (lead['Motivation Signals'] || '') + ' ' +
    (lead['Notes'] || '') + ' ' +
    (lead['Description'] || '')
  ).toLowerCase();

  // High motivation keywords (+20-25 points each)
  const highMotivation = [
    'must sell', 'urgent', 'desperate', 'asap', 'immediately',
    'foreclosure', 'pre-foreclosure', 'behind on payments',
    'divorce', 'estate sale', 'death', 'deceased'
  ];

  // Medium motivation keywords (+10-15 points each)
  const mediumMotivation = [
    'relocating', 'relocation', 'job transfer', 'moving',
    'inherited', 'probate', 'downsizing', 'retiring',
    'health issues', 'medical', 'vacant', 'tired landlord'
  ];

  // Low motivation keywords (+5 points each)
  const lowMotivation = [
    'considering', 'testing', 'flexible', 'motivated',
    'make offer', 'all offers', 'obo', 'negotiable'
  ];

  // Check high motivation
  for (const keyword of highMotivation) {
    if (motivationText.includes(keyword)) {
      score += 25;
      break; // Only count once from high category
    }
  }

  // Check medium motivation (can stack)
  for (const keyword of mediumMotivation) {
    if (motivationText.includes(keyword)) {
      score += 12;
    }
  }

  // Check low motivation
  for (const keyword of lowMotivation) {
    if (motivationText.includes(keyword)) {
      score += 5;
    }
  }

  // Occupancy factor
  const occupancy = (lead['Occupancy'] || '').toLowerCase();
  if (occupancy.includes('vacant')) {
    score += 15; // Vacant = likely more motivated
  }

  // Condition factor
  const conditionData = normalizeCondition(lead['Condition']);
  if (conditionData.score < 40) {
    score += 10; // Poor condition = might be tired of dealing with it
  }

  return Math.max(0, Math.min(Math.round(score), 100));
}

/**
 * Gets motivation level label from score
 * @param {number} score - Motivation score
 * @returns {string} Motivation level label
 */
function getMotivationLevel(score) {
  if (score >= 80) return 'VERY HIGH';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  if (score >= 20) return 'LOW';
  return 'VERY LOW';
}

// =============================================================================
// SELLER PSYCHOLOGY SCORE
// =============================================================================

/**
 * Calculates seller psychology score (0-100, indicates negotiation leverage)
 * @param {Object} lead - Lead data
 * @returns {number} Psychology score
 */
function calculateSellerPsychologyScore(lead) {
  let score = 50; // Base score

  const allText = (
    (lead['Motivation Signals'] || '') + ' ' +
    (lead['Notes'] || '') + ' ' +
    (lead['Description'] || '')
  ).toLowerCase();

  // Emotional triggers that indicate higher psychology score (easier to negotiate)
  const emotionalTriggers = {
    'divorce': 15,
    'death': 15,
    'deceased': 15,
    'estate': 12,
    'inherited': 12,
    'probate': 12,
    'health': 10,
    'medical': 10,
    'tired': 10,
    'exhausted': 10,
    'frustrated': 10,
    'overwhelmed': 10,
    'can\'t afford': 15,
    'behind': 12,
    'foreclosure': 15,
    'bankruptcy': 15,
    'job loss': 12,
    'laid off': 12,
    'relocating': 8,
    'out of state': 8,
    'absentee': 10
  };

  // Check for emotional triggers
  for (const [trigger, points] of Object.entries(emotionalTriggers)) {
    if (allText.includes(trigger)) {
      score += points;
    }
  }

  // Time pressure indicators
  if (allText.includes('quickly') || allText.includes('fast') || allText.includes('asap')) {
    score += 10;
  }
  if (allText.includes('deadline') || allText.includes('must close')) {
    score += 15;
  }

  // Flexibility indicators
  if (allText.includes('flexible') || allText.includes('all offers') || allText.includes('obo')) {
    score += 8;
  }
  if (allText.includes('make offer') || allText.includes('bring offer')) {
    score += 5;
  }

  // Negative indicators (harder to negotiate)
  if (allText.includes('firm') || allText.includes('no lowball')) {
    score -= 15;
  }
  if (allText.includes('investor owned') || allText.includes('llc')) {
    score -= 10; // Experienced sellers are tougher
  }

  return Math.max(0, Math.min(Math.round(score), 100));
}

/**
 * Gets psychology insight label from score
 * @param {number} score - Psychology score
 * @returns {string} Insight label
 */
function getPsychologyInsight(score) {
  if (score >= 80) return 'HIGHLY FLEXIBLE';
  if (score >= 60) return 'OPEN TO NEGOTIATION';
  if (score >= 40) return 'STANDARD NEGOTIATION';
  if (score >= 20) return 'FIRM EXPECTATIONS';
  return 'DIFFICULT NEGOTIATION';
}

// =============================================================================
// DEAL CLASSIFIER SCORE
// =============================================================================

/**
 * Calculates composite deal score for classification
 * @param {Object} scores - All individual scores
 * @param {Object} financials - Financial calculations (spread, cashflow, etc.)
 * @returns {Object} Deal score and classification
 */
function calculateDealScore(scores, financials) {
  const weights = SCORING_WEIGHTS.DEAL_CLASSIFIER;

  // Profit component (inverted risk = profit potential)
  const profitScore = Math.max(0, 100 - scores.risk);

  // Calculate weighted score
  let compositeScore = 0;
  compositeScore += profitScore * weights.profitWeight;
  compositeScore += (100 - scores.risk) * weights.riskWeight;
  compositeScore += scores.velocity * weights.velocityWeight;
  compositeScore += scores.marketHeat * weights.marketHeatWeight;
  compositeScore += scores.motivation * weights.motivationWeight;

  // Boost for good financials
  if (financials) {
    if (financials.spread > STRATEGIES.WHOLESALING_LOCAL.targetSpread) {
      compositeScore += 10;
    }
    if (financials.cashflow && financials.cashflow.ltr > STRATEGIES.LTR.targetCashflow) {
      compositeScore += 5;
    }
  }

  compositeScore = Math.min(Math.round(compositeScore), 100);

  // Determine classification
  let classification = 'PASS';
  if (compositeScore >= THRESHOLDS.DEAL_CLASSIFIER.HOT_DEAL) {
    classification = 'HOT DEAL';
  } else if (compositeScore >= THRESHOLDS.DEAL_CLASSIFIER.PORTFOLIO_FOUNDATION) {
    classification = 'PORTFOLIO FOUNDATION';
  } else if (compositeScore >= THRESHOLDS.DEAL_CLASSIFIER.SOLID_DEAL) {
    classification = 'SOLID DEAL';
  }

  return {
    score: compositeScore,
    classification: classification
  };
}

// =============================================================================
// SCORE SUMMARY
// =============================================================================

/**
 * Generates a complete score summary for a lead
 * @param {Object} lead - Lead data
 * @param {Object} calculations - All calculations
 * @returns {Object} Complete score summary
 */
function generateScoreSummary(lead, calculations) {
  const scores = calculateAllScores(lead, calculations);

  const dealResult = calculateDealScore(scores, {
    spread: calculations.equity || 0,
    cashflow: calculations.cashflow
  });

  return {
    risk: {
      score: scores.risk,
      level: getRiskLevel(scores.risk)
    },
    velocity: {
      score: scores.velocity,
      level: getVelocityLevel(scores.velocity)
    },
    marketHeat: {
      score: scores.marketHeat,
      level: getMarketHeatLevel(scores.marketHeat)
    },
    motivation: {
      score: scores.motivation,
      level: getMotivationLevel(scores.motivation)
    },
    sellerPsychology: {
      score: scores.sellerPsychology,
      insight: getPsychologyInsight(scores.sellerPsychology)
    },
    overall: {
      score: dealResult.score,
      classification: dealResult.classification
    }
  };
}

// =============================================================================
// COMPARATIVE SCORING
// =============================================================================

/**
 * Compares scores between two leads
 * @param {Object} scores1 - First lead scores
 * @param {Object} scores2 - Second lead scores
 * @returns {Object} Comparison result
 */
function compareLeadScores(scores1, scores2) {
  const comparison = {};

  for (const key of Object.keys(scores1)) {
    comparison[key] = {
      lead1: scores1[key],
      lead2: scores2[key],
      difference: scores1[key] - scores2[key],
      winner: scores1[key] > scores2[key] ? 1 : (scores1[key] < scores2[key] ? 2 : 0)
    };
  }

  // Overall winner (more positive differences = lead 1 is better)
  const totalDiff = Object.values(comparison).reduce((sum, c) => {
    // For risk, lower is better, so invert
    if (c === comparison.risk) {
      return sum - c.difference;
    }
    return sum + c.difference;
  }, 0);

  comparison.overallWinner = totalDiff > 0 ? 1 : (totalDiff < 0 ? 2 : 0);

  return comparison;
}

/**
 * Ranks leads by composite score
 * @param {Array} leadsWithScores - Array of {lead, scores} objects
 * @returns {Array} Sorted array with ranks
 */
function rankLeadsByScore(leadsWithScores) {
  // Calculate deal score for each
  const withDealScores = leadsWithScores.map(item => {
    const dealResult = calculateDealScore(item.scores, item.financials);
    return {
      ...item,
      dealScore: dealResult.score,
      classification: dealResult.classification
    };
  });

  // Sort by deal score descending
  withDealScores.sort((a, b) => b.dealScore - a.dealScore);

  // Add ranks
  return withDealScores.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

// =============================================================================
// THRESHOLD CHECKING
// =============================================================================

/**
 * Checks if a lead meets minimum thresholds for a strategy
 * @param {Object} lead - Lead data
 * @param {Object} scores - Lead scores
 * @param {string} strategyId - Strategy ID to check
 * @returns {Object} Threshold check result
 */
function checkStrategyThresholds(lead, scores, strategyId) {
  const strategy = STRATEGIES[strategyId];
  if (!strategy) {
    return { passes: false, reason: 'Unknown strategy' };
  }

  const failures = [];

  // Risk threshold check
  if (scores.risk > THRESHOLDS.RISK.HIGH) {
    failures.push(`Risk too high: ${scores.risk}`);
  }

  // Strategy-specific checks
  switch (strategyId) {
    case 'WHOLESALING_LOCAL':
    case 'WHOLESALING_VIRTUAL':
    case 'WHOLESALING_JV':
      if (scores.velocity < 40) {
        failures.push(`Velocity too low for wholesale: ${scores.velocity}`);
      }
      break;

    case 'FIX_AND_FLIP':
      if (scores.marketHeat < 50) {
        failures.push(`Market not hot enough for flip: ${scores.marketHeat}`);
      }
      break;

    case 'LTR':
    case 'MTR':
    case 'STR':
      // Rental strategies are more forgiving of market conditions
      break;

    case 'SUBJECT_TO':
    case 'WRAPAROUND':
    case 'SELLER_FINANCING':
      if (scores.sellerPsychology < 50) {
        failures.push(`Seller psychology not favorable: ${scores.sellerPsychology}`);
      }
      break;
  }

  return {
    passes: failures.length === 0,
    failures: failures,
    recommendation: failures.length === 0 ? 'Proceed' : 'Consider alternatives'
  };
}

// =============================================================================
// SCORE EXPORT
// =============================================================================

/**
 * Exports all lead scores to a summary format
 * @returns {Array} Array of score summaries
 */
function exportAllLeadScores() {
  const analyzerData = getSheetDataAsObjects(SHEETS.DEAL_ANALYZER);

  return analyzerData.map(lead => ({
    leadId: lead['Lead ID'],
    address: lead['Address'],
    riskScore: lead['Risk Score'],
    velocityScore: lead['Sales Velocity Score'],
    marketHeatScore: lead['Market Heat Score'],
    motivationScore: lead['Motivation Score'],
    dealClassifier: lead['Deal Classifier'],
    strategyConfidence: lead['Strategy Confidence']
  }));
}
