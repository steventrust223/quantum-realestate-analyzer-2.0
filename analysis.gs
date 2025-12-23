/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Analysis Engine (analysis.gs)
 * ============================================================================
 *
 * Core deal analysis engine that processes leads, calculates estimates,
 * and populates the Deal Analyzer sheet with all computed values.
 */

// =============================================================================
// MAIN ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyzes all new/unanalyzed leads
 * @returns {Object} Analysis result summary
 */
function analyzeNewLeads() {
  try {
    logInfo('Analysis', 'Starting lead analysis...');
    showToast('Analyzing leads...', 'Analysis', 60);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leadsSheet = ss.getSheetByName(SHEETS.LEADS_DATABASE);
    const analyzerSheet = ss.getSheetByName(SHEETS.DEAL_ANALYZER);

    if (!leadsSheet || !analyzerSheet) {
      throw new Error('Required sheets not found');
    }

    // Get leads that need analysis
    const leads = getLeadsForAnalysis();

    if (leads.length === 0) {
      logInfo('Analysis', 'No new leads to analyze');
      showToast('No new leads to analyze');
      return { analyzed: 0, errors: 0 };
    }

    let analyzed = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < leads.length; i++) {
      try {
        const lead = leads[i];

        // Run full analysis on this lead
        const analysisResult = analyzeIndividualLead(lead);

        // Add/update in Deal Analyzer
        addToAnalyzerSheet(analyzerSheet, analysisResult);

        // Update status in Leads Database
        updateRowByLeadId(SHEETS.LEADS_DATABASE, lead['Lead ID'], {
          'Status': 'Analyzed'
        });

        analyzed++;

        // Rate limiting for AI calls
        if (analyzed % 5 === 0) {
          Utilities.sleep(AUTOMATION.TIMING.API_RATE_LIMIT_MS);
        }

        // Progress update
        if (analyzed % 10 === 0) {
          showToast(`Analyzed ${analyzed} of ${leads.length} leads...`, 'Progress');
        }
      } catch (leadError) {
        logError('Analysis', leadError, `Error analyzing lead: ${leads[i]['Lead ID']}`);
        errors++;
      }
    }

    const result = { analyzed, errors };
    logSuccess('Analysis', `Analysis complete: ${analyzed} analyzed, ${errors} errors`);
    showToast(`Analyzed ${analyzed} leads`, 'Complete');

    return result;
  } catch (e) {
    logError('Analysis', e, 'Analysis process failed');
    throw e;
  }
}

/**
 * Gets leads that need analysis
 * @returns {Array} Leads to analyze
 */
function getLeadsForAnalysis() {
  const leads = getSheetDataAsObjects(SHEETS.LEADS_DATABASE);
  const analyzedIds = getAnalyzedLeadIds();

  return leads.filter(lead =>
    lead['Status'] !== 'Analyzed' && !analyzedIds.has(lead['Lead ID'])
  );
}

/**
 * Gets set of already analyzed lead IDs
 * @returns {Set} Set of analyzed lead IDs
 */
function getAnalyzedLeadIds() {
  const analyzedData = getSheetDataAsObjects(SHEETS.DEAL_ANALYZER);
  return new Set(analyzedData.map(row => row['Lead ID']));
}

/**
 * Analyzes a single lead comprehensively
 * @param {Object} lead - Lead data object
 * @returns {Object} Complete analysis result
 */
function analyzeIndividualLead(lead) {
  // Get market data for this ZIP
  const marketData = getMarketDataForZip(lead['ZIP']);

  // Calculate ARV estimate
  const arvEstimate = calculateARV(lead, marketData);

  // Calculate rent estimates
  const rentEstimates = calculateRentEstimates(lead, marketData);

  // Calculate repair estimate
  const repairData = calculateRepairEstimate(lead);

  // Calculate holding costs
  const holdingCost = calculateHoldingCost(lead);

  // Calculate MAO for different strategies
  const maoCalcs = calculateMAOValues(lead, arvEstimate, repairData.estimate, holdingCost);

  // Calculate fit scores for creative finance strategies
  const fitScores = calculateFitScores(lead, marketData, rentEstimates);

  // Calculate cashflow for rental strategies
  const cashflowCalcs = calculateCashflow(lead, rentEstimates, holdingCost);

  // Calculate equity estimate
  const equityEstimate = arvEstimate - safeParseNumber(lead['Asking Price'], 0) - repairData.estimate;

  // Get AI-powered insights if enabled
  let aiInsights = null;
  if (isFeatureEnabled('AI Strategy Recommendations')) {
    aiInsights = getAIStrategyRecommendation(lead, {
      arv: arvEstimate,
      repairs: repairData,
      rents: rentEstimates,
      market: marketData
    });
  }

  // Calculate scores
  const scores = calculateAllScores(lead, {
    arv: arvEstimate,
    repairs: repairData,
    market: marketData,
    equity: equityEstimate,
    cashflow: cashflowCalcs
  });

  // Determine best strategy
  const strategyResult = determineStrategy(lead, {
    mao: maoCalcs,
    fitScores: fitScores,
    scores: scores,
    cashflow: cashflowCalcs,
    aiInsights: aiInsights
  });

  // Calculate spread estimate (for wholesaling)
  const spreadEstimate = maoCalcs.wholesale > 0 ?
    maoCalcs.wholesale - safeParseNumber(lead['Asking Price'], 0) : 0;

  // Get buyer matches
  const buyerMatches = matchBuyers(lead, strategyResult.strategy);

  // Generate negotiation angle and seller message
  const negotiation = generateNegotiationStrategy(lead, strategyResult, aiInsights);

  // Determine CRM route
  const crmRoute = determineCrmRoute(strategyResult.dealClassifier);

  return {
    leadId: lead['Lead ID'],
    address: lead['Address'],
    city: lead['City'],
    state: lead['State'],
    zip: lead['ZIP'],
    askingPrice: safeParseNumber(lead['Asking Price'], 0),
    beds: lead['Beds'],
    baths: lead['Baths'],
    sqft: lead['SqFt'],
    yearBuilt: lead['Year Built'],
    propertyType: lead['Property Type'],
    condition: lead['Condition'],

    // Estimates
    arvEstimate: arvEstimate,
    rentLtr: rentEstimates.ltr,
    rentStr: rentEstimates.str,
    rentMtr: rentEstimates.mtr,
    repairEstimate: repairData.estimate,
    repairComplexity: repairData.complexity,
    holdingCost: holdingCost,

    // MAO Values
    maoWholesale: maoCalcs.wholesale,
    maoFlip: maoCalcs.flip,
    maoBrrrr: maoCalcs.brrrr,
    offerTarget: maoCalcs.recommended,

    // Spread and Cashflow
    spreadEstimate: spreadEstimate,
    cashflowLtr: cashflowCalcs.ltr,
    cashflowMtr: cashflowCalcs.mtr,
    cashflowStr: cashflowCalcs.str,
    equityEstimate: equityEstimate,

    // Fit Scores
    sub2FitScore: fitScores.sub2,
    wrapFitScore: fitScores.wrap,
    sellerFinanceFitScore: fitScores.sellerFinance,

    // Strategy
    strategyRecommendation: strategyResult.strategy,
    strategyConfidence: strategyResult.confidence,
    dealClassifier: strategyResult.dealClassifier,

    // Scores
    riskScore: scores.risk,
    velocityScore: scores.velocity,
    marketHeatScore: scores.marketHeat,
    motivationScore: scores.motivation,
    sellerPsychologyScore: scores.sellerPsychology,

    // Actions
    negotiationAngle: negotiation.angle,
    nextBestAction: negotiation.action,
    sellerMessage: negotiation.message,

    // Buyer matching
    buyerMatchCount: buyerMatches.count,
    buyerMatchTop3: buyerMatches.top3,

    // CRM
    crmRouteTarget: crmRoute,
    synced: false,
    lastAnalyzedTimestamp: new Date()
  };
}

// =============================================================================
// ESTIMATION FUNCTIONS
// =============================================================================

/**
 * Calculates ARV (After Repair Value) estimate
 * @param {Object} lead - Lead data
 * @param {Object} marketData - Market data for ZIP
 * @returns {number} ARV estimate
 */
function calculateARV(lead, marketData) {
  const sqft = safeParseNumber(lead['SqFt'], 0);
  const askingPrice = safeParseNumber(lead['Asking Price'], 0);

  // If we have market data with median price
  if (marketData && marketData.medianPrice && sqft > 0) {
    // Use price per sqft from market data
    const pricePerSqft = marketData.medianPrice / 1500; // Assume avg 1500 sqft
    const baseArv = sqft * pricePerSqft;

    // Adjust for condition
    const conditionMultiplier = getConditionArvMultiplier(lead['Condition']);
    return Math.round(baseArv * conditionMultiplier);
  }

  // Fallback: Use asking price with markup based on condition
  if (askingPrice > 0) {
    const conditionData = normalizeCondition(lead['Condition']);
    const markup = 1 + (1 - conditionData.score / 100) * 0.3;
    return Math.round(askingPrice * markup);
  }

  return 0;
}

/**
 * Gets ARV multiplier based on condition
 * @param {string} condition - Property condition
 * @returns {number} Multiplier
 */
function getConditionArvMultiplier(condition) {
  const conditionData = normalizeCondition(condition);
  // Better condition = higher ARV relative to comps
  return 0.85 + (conditionData.score / 100) * 0.25;
}

/**
 * Calculates rent estimates for LTR, MTR, and STR
 * @param {Object} lead - Lead data
 * @param {Object} marketData - Market data
 * @returns {Object} Rent estimates
 */
function calculateRentEstimates(lead, marketData) {
  const beds = safeParseNumber(lead['Beds'], 2);
  const sqft = safeParseNumber(lead['SqFt'], 1200);

  // Base LTR rent calculation
  let ltrRent = 0;

  if (marketData && marketData.avgRentLtr) {
    ltrRent = marketData.avgRentLtr;
  } else {
    // Fallback formula: $1 per sqft base + bedroom adjustment
    ltrRent = sqft * 1 + (beds - 2) * 200;
    ltrRent = Math.max(ltrRent, 800); // Minimum
  }

  // MTR is typically 25-50% premium
  const mtrRent = Math.round(ltrRent * THRESHOLDS.RENTALS.MTR_PREMIUM);

  // STR is typically 2-3x LTR (accounts for vacancy)
  const strRent = Math.round(ltrRent * THRESHOLDS.RENTALS.STR_PREMIUM);

  return {
    ltr: Math.round(ltrRent),
    mtr: mtrRent,
    str: strRent
  };
}

/**
 * Calculates repair estimate based on condition
 * @param {Object} lead - Lead data
 * @returns {Object} Repair estimate and complexity
 */
function calculateRepairEstimate(lead) {
  const sqft = safeParseNumber(lead['SqFt'], 1500);
  const yearBuilt = safeParseNumber(lead['Year Built'], 1970);
  const conditionData = normalizeCondition(lead['Condition']);

  // Base per sqft cost based on condition
  let perSqft = REPAIR_DEFAULTS.perSqFt.light;
  let complexity = 'Light';

  if (conditionData.score <= 20) {
    perSqft = REPAIR_DEFAULTS.perSqFt.gutRehab;
    complexity = 'Gut Rehab';
  } else if (conditionData.score <= 40) {
    perSqft = REPAIR_DEFAULTS.perSqFt.heavy;
    complexity = 'Heavy';
  } else if (conditionData.score <= 60) {
    perSqft = REPAIR_DEFAULTS.perSqFt.medium;
    complexity = 'Medium';
  }

  // Age adjustment
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearBuilt;
  let ageMultiplier = 1;
  if (age > 50) ageMultiplier = 1.3;
  else if (age > 30) ageMultiplier = 1.15;
  else if (age > 20) ageMultiplier = 1.05;

  const estimate = Math.round(sqft * perSqft * ageMultiplier);

  return {
    estimate: estimate,
    complexity: complexity,
    perSqft: perSqft
  };
}

/**
 * Calculates estimated monthly holding cost
 * @param {Object} lead - Lead data
 * @returns {number} Monthly holding cost
 */
function calculateHoldingCost(lead) {
  const askingPrice = safeParseNumber(lead['Asking Price'], 100000);

  // Estimate monthly holding cost as percentage of price
  // Includes taxes, insurance, utilities, maintenance
  return Math.round(askingPrice * THRESHOLDS.MAO.HOLDING_COST_MONTHLY);
}

// =============================================================================
// MAO CALCULATIONS
// =============================================================================

/**
 * Calculates MAO values for different strategies
 * @param {Object} lead - Lead data
 * @param {number} arv - ARV estimate
 * @param {number} repairs - Repair estimate
 * @param {number} holdingCost - Monthly holding cost
 * @returns {Object} MAO values
 */
function calculateMAOValues(lead, arv, repairs, holdingCost) {
  if (arv <= 0) {
    return { wholesale: 0, flip: 0, brrrr: 0, recommended: 0 };
  }

  // Wholesale MAO: ARV * 70% - Repairs - Assignment Fee
  const wholesaleMao = Math.round(
    arv * THRESHOLDS.MAO.WHOLESALE_DISCOUNT -
    repairs -
    THRESHOLDS.MAO.ASSIGNMENT_FEE
  );

  // Flip MAO: ARV * 70% - Repairs - Holding (4 months)
  const flipMao = Math.round(
    arv * THRESHOLDS.MAO.FLIP_DISCOUNT -
    repairs -
    (holdingCost * 4)
  );

  // BRRRR MAO: ARV * 75% - Repairs (refinance at 75% LTV)
  const brrrrMao = Math.round(
    arv * THRESHOLDS.MAO.BRRRR_DISCOUNT -
    repairs
  );

  // Recommended is the most conservative (highest we'd pay)
  const recommended = Math.max(wholesaleMao, flipMao, brrrrMao);

  return {
    wholesale: Math.max(wholesaleMao, 0),
    flip: Math.max(flipMao, 0),
    brrrr: Math.max(brrrrMao, 0),
    recommended: Math.max(recommended, 0)
  };
}

// =============================================================================
// FIT SCORES FOR CREATIVE FINANCE
// =============================================================================

/**
 * Calculates fit scores for creative finance strategies
 * @param {Object} lead - Lead data
 * @param {Object} marketData - Market data
 * @param {Object} rentEstimates - Rent estimates
 * @returns {Object} Fit scores
 */
function calculateFitScores(lead, marketData, rentEstimates) {
  const askingPrice = safeParseNumber(lead['Asking Price'], 0);
  const motivationSignals = (lead['Motivation Signals'] || '').toLowerCase();
  const occupancy = (lead['Occupancy'] || '').toLowerCase();

  // Sub2 Fit Score
  let sub2Score = 50; // Base score

  // Higher for motivated sellers
  if (motivationSignals.includes('relocat') || motivationSignals.includes('divorc')) {
    sub2Score += 20;
  }
  if (motivationSignals.includes('behind') || motivationSignals.includes('foreclosure')) {
    sub2Score += 25;
  }
  // Better for occupied (can take over payments)
  if (occupancy.includes('occupied')) {
    sub2Score += 10;
  }
  // Good rental income helps
  if (rentEstimates.ltr > askingPrice * 0.008) {
    sub2Score += 15;
  }

  // Wrap Fit Score
  let wrapScore = 50;

  // Good for properties with equity
  if (askingPrice > 0 && marketData && marketData.medianPrice) {
    const equity = marketData.medianPrice - askingPrice;
    if (equity > askingPrice * 0.2) wrapScore += 20;
  }
  // Motivated seller helps
  if (motivationSignals.includes('flexib') || motivationSignals.includes('seller financ')) {
    wrapScore += 25;
  }

  // Seller Finance Fit Score
  let sellerFinanceScore = 50;

  // Look for explicit seller finance mentions
  if (motivationSignals.includes('owner financ') || motivationSignals.includes('seller financ')) {
    sellerFinanceScore += 30;
  }
  // Inherited properties often more flexible
  if (motivationSignals.includes('inherit') || motivationSignals.includes('probate')) {
    sellerFinanceScore += 20;
  }
  // Free and clear properties are ideal
  if (motivationSignals.includes('free and clear') || motivationSignals.includes('paid off')) {
    sellerFinanceScore += 25;
  }

  return {
    sub2: Math.min(sub2Score, 100),
    wrap: Math.min(wrapScore, 100),
    sellerFinance: Math.min(sellerFinanceScore, 100)
  };
}

// =============================================================================
// CASHFLOW CALCULATIONS
// =============================================================================

/**
 * Calculates cashflow for rental strategies
 * @param {Object} lead - Lead data
 * @param {Object} rentEstimates - Rent estimates
 * @param {number} holdingCost - Monthly holding cost
 * @returns {Object} Cashflow estimates
 */
function calculateCashflow(lead, rentEstimates, holdingCost) {
  // Expenses as percentage of rent
  const expenseRatio = THRESHOLDS.RENTALS.EXPENSE_RATIO;
  const vacancyRate = THRESHOLDS.RENTALS.VACANCY_RATE;

  // LTR cashflow
  const ltrNet = rentEstimates.ltr * (1 - expenseRatio) * (1 - vacancyRate);
  const ltrCashflow = Math.round(ltrNet - holdingCost);

  // MTR cashflow (lower expenses, slightly higher vacancy)
  const mtrNet = rentEstimates.mtr * (1 - expenseRatio * 0.8) * (1 - vacancyRate * 3);
  const mtrCashflow = Math.round(mtrNet - holdingCost);

  // STR cashflow (higher expenses, more vacancy)
  const strOccupancy = STRATEGIES.STR.occupancyRate;
  const strNet = rentEstimates.str * strOccupancy * (1 - expenseRatio * 1.2);
  const strCashflow = Math.round(strNet - holdingCost);

  return {
    ltr: ltrCashflow,
    mtr: mtrCashflow,
    str: strCashflow
  };
}

// =============================================================================
// STRATEGY DETERMINATION
// =============================================================================

/**
 * Determines the best strategy for a lead
 * @param {Object} lead - Lead data
 * @param {Object} data - Calculated data (MAO, scores, etc.)
 * @returns {Object} Strategy recommendation
 */
function determineStrategy(lead, data) {
  const strategies = [];
  const askingPrice = safeParseNumber(lead['Asking Price'], 0);
  const motivationSignals = (lead['Motivation Signals'] || '').toLowerCase();
  const occupancy = (lead['Occupancy'] || '').toLowerCase();
  const condition = normalizeCondition(lead['Condition']);

  // Evaluate each strategy

  // Wholesaling strategies
  if (data.mao.wholesale > askingPrice * 0.9) {
    const spread = data.mao.wholesale - askingPrice;
    if (spread >= STRATEGIES.WHOLESALING_LOCAL.minSpread) {
      strategies.push({
        id: 'WHOLESALING_LOCAL',
        name: 'Wholesaling (Local)',
        score: 70 + Math.min(spread / 1000, 20),
        profit: spread
      });
    }
  }

  // Fix & Flip
  const flipProfit = data.mao.flip - askingPrice;
  if (flipProfit >= STRATEGIES.FIX_AND_FLIP.minProfit && condition.score < 70) {
    strategies.push({
      id: 'FIX_AND_FLIP',
      name: 'Fix & Flip',
      score: 60 + Math.min(flipProfit / 2500, 25),
      profit: flipProfit
    });
  }

  // BRRRR
  if (data.mao.brrrr > askingPrice && data.cashflow.ltr >= STRATEGIES.BRRRR.cashflowMin) {
    strategies.push({
      id: 'BRRRR',
      name: 'BRRRR',
      score: 65 + (data.cashflow.ltr / 20),
      profit: data.cashflow.ltr * 12
    });
  }

  // Long-Term Rental
  if (data.cashflow.ltr >= STRATEGIES.LTR.minCashflow) {
    strategies.push({
      id: 'LTR',
      name: 'Long-Term Rental (LTR)',
      score: 55 + (data.cashflow.ltr / 15),
      profit: data.cashflow.ltr * 12
    });
  }

  // Short-Term Rental
  if (data.cashflow.str >= STRATEGIES.STR.minCashflow) {
    strategies.push({
      id: 'STR',
      name: 'Short-Term Rental (STR)',
      score: 55 + (data.cashflow.str / 50),
      profit: data.cashflow.str * 12
    });
  }

  // Mid-Term Rental
  if (data.cashflow.mtr >= STRATEGIES.MTR.minCashflow) {
    strategies.push({
      id: 'MTR',
      name: 'Mid-Term Rental (MTR)',
      score: 55 + (data.cashflow.mtr / 25),
      profit: data.cashflow.mtr * 12
    });
  }

  // Subject-To
  if (data.fitScores.sub2 >= 70) {
    strategies.push({
      id: 'SUBJECT_TO',
      name: 'Subject-To (Sub2)',
      score: data.fitScores.sub2,
      profit: data.cashflow.ltr * 12
    });
  }

  // Seller Financing
  if (data.fitScores.sellerFinance >= 65) {
    strategies.push({
      id: 'SELLER_FINANCING',
      name: 'Seller Financing',
      score: data.fitScores.sellerFinance,
      profit: data.cashflow.ltr * 12
    });
  }

  // Special situations based on motivation signals
  if (motivationSignals.includes('foreclosure') || motivationSignals.includes('pre-foreclosure')) {
    strategies.push({
      id: 'PRE_FORECLOSURE',
      name: 'Pre-Foreclosure',
      score: 75,
      profit: flipProfit
    });
  }

  if (motivationSignals.includes('tax') || motivationSignals.includes('lien')) {
    strategies.push({
      id: 'TAX_DELINQUENT',
      name: 'Tax Delinquent / Liens',
      score: 70,
      profit: flipProfit
    });
  }

  if (occupancy.includes('vacant') && condition.score < 50) {
    strategies.push({
      id: 'VACANT_ABANDONED',
      name: 'Vacant / Abandoned',
      score: 65,
      profit: flipProfit
    });
  }

  if (motivationSignals.includes('inherit') || motivationSignals.includes('probate') ||
      motivationSignals.includes('estate')) {
    strategies.push({
      id: 'INHERITED_PROBATE',
      name: 'Inherited / Probate',
      score: 70,
      profit: data.mao.wholesale - askingPrice
    });
  }

  // Use AI insights if available
  if (data.aiInsights && data.aiInsights.strategy) {
    const aiStrategy = strategies.find(s => s.name === data.aiInsights.strategy);
    if (aiStrategy) {
      aiStrategy.score += 10; // Boost AI-recommended strategy
    }
  }

  // Sort by score and get best
  strategies.sort((a, b) => b.score - a.score);

  if (strategies.length === 0) {
    return {
      strategy: 'PASS',
      confidence: 0,
      dealClassifier: 'PASS'
    };
  }

  const best = strategies[0];
  const confidence = Math.min(Math.round(best.score), 100);

  // Determine deal classifier
  let dealClassifier = 'PASS';
  if (best.score >= THRESHOLDS.DEAL_CLASSIFIER.HOT_DEAL) {
    dealClassifier = 'HOT DEAL';
  } else if (best.score >= THRESHOLDS.DEAL_CLASSIFIER.PORTFOLIO_FOUNDATION) {
    dealClassifier = 'PORTFOLIO FOUNDATION';
  } else if (best.score >= THRESHOLDS.DEAL_CLASSIFIER.SOLID_DEAL) {
    dealClassifier = 'SOLID DEAL';
  }

  return {
    strategy: best.name,
    confidence: confidence,
    dealClassifier: dealClassifier,
    alternates: strategies.slice(1, 3).map(s => s.name)
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets market data for a ZIP code
 * @param {string} zip - ZIP code
 * @returns {Object|null} Market data or null
 */
function getMarketDataForZip(zip) {
  if (!zip) return null;

  try {
    const marketData = getSheetDataAsObjects(SHEETS.MARKET_ZIP_INTEL);
    return marketData.find(row => row['ZIP Code'] === zip) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Matches buyers to a lead
 * @param {Object} lead - Lead data
 * @param {string} strategy - Recommended strategy
 * @returns {Object} Buyer match data
 */
function matchBuyers(lead, strategy) {
  try {
    const buyers = getSheetDataAsObjects(SHEETS.BUYERS_EXIT);
    const activeBuyers = buyers.filter(b => b['Active']);

    const matches = activeBuyers.filter(buyer => {
      // Match by ZIP
      const buyerZips = (buyer['Preferred ZIP Codes'] || '').split(',').map(z => z.trim());
      if (buyerZips.length > 0 && buyerZips[0] !== '' && !buyerZips.includes(lead['ZIP'])) {
        return false;
      }

      // Match by price range
      const minPrice = safeParseNumber(buyer['Min Price'], 0);
      const maxPrice = safeParseNumber(buyer['Max Price'], Infinity);
      const askingPrice = safeParseNumber(lead['Asking Price'], 0);

      if (askingPrice < minPrice || askingPrice > maxPrice) {
        return false;
      }

      // Match by strategy
      const buyerStrategies = (buyer['Preferred Strategies'] || '').toLowerCase();
      if (buyerStrategies && !buyerStrategies.includes(strategy.toLowerCase())) {
        return false;
      }

      return true;
    });

    return {
      count: matches.length,
      top3: matches.slice(0, 3).map(b => b['Buyer Name']).join(', ')
    };
  } catch (e) {
    return { count: 0, top3: '' };
  }
}

/**
 * Generates negotiation strategy and seller message
 * @param {Object} lead - Lead data
 * @param {Object} strategyResult - Strategy recommendation
 * @param {Object} aiInsights - AI insights if available
 * @returns {Object} Negotiation data
 */
function generateNegotiationStrategy(lead, strategyResult, aiInsights) {
  let angle = '';
  let action = '';
  let message = '';

  const motivation = (lead['Motivation Signals'] || '').toLowerCase();

  // Determine negotiation angle based on motivation
  if (motivation.includes('relocat')) {
    angle = 'Quick closing - emphasize speed and certainty';
    action = 'Offer fast 14-day close';
  } else if (motivation.includes('divorc')) {
    angle = 'Discretion and simplicity - one party buyout';
    action = 'Offer cash and quick resolution';
  } else if (motivation.includes('inherit') || motivation.includes('probate')) {
    angle = 'Hassle-free sale - we handle everything';
    action = 'Offer to buy as-is, handle clean-out';
  } else if (motivation.includes('foreclosure')) {
    angle = 'Save credit - we can close before foreclosure';
    action = 'Sub2 or quick cash offer';
  } else if (motivation.includes('vacant')) {
    angle = 'End the carrying costs - monthly savings';
    action = 'Emphasize immediate relief';
  } else {
    angle = 'Fair cash offer - no repairs needed';
    action = 'Standard motivated seller approach';
  }

  // Use AI message if available
  if (aiInsights && aiInsights.message) {
    message = aiInsights.message;
  } else {
    // Generate basic message
    const address = lead['Address'] || 'your property';
    message = `Hi! I saw ${address} and I'm interested. I buy houses as-is for cash. Would you consider a fair offer? Quick close possible.`;
    message = truncateText(message, 160);
  }

  return {
    angle: angle,
    action: action,
    message: message
  };
}

/**
 * Determines CRM route based on deal classifier
 * @param {string} dealClassifier - Deal classification
 * @returns {string} CRM target
 */
function determineCrmRoute(dealClassifier) {
  switch (dealClassifier) {
    case 'HOT DEAL':
      return AUTOMATION.CRM_ROUTING.HOT_DEAL;
    case 'PORTFOLIO FOUNDATION':
      return AUTOMATION.CRM_ROUTING.PORTFOLIO;
    case 'SOLID DEAL':
      return AUTOMATION.CRM_ROUTING.SOLID_DEAL;
    default:
      return AUTOMATION.CRM_ROUTING.DEFAULT;
  }
}

/**
 * Checks if a feature is enabled in Automation Control Center
 * @param {string} featureName - Feature name
 * @returns {boolean} True if enabled
 */
function isFeatureEnabled(featureName) {
  try {
    const controlData = getSheetDataAsObjects(SHEETS.AUTOMATION_CONTROL);
    const feature = controlData.find(row => row['Feature'] === featureName);
    return feature ? feature['Enabled'] === true : true;
  } catch (e) {
    return true; // Default to enabled
  }
}

/**
 * Adds or updates a lead in the Deal Analyzer sheet
 * @param {Sheet} sheet - Deal Analyzer sheet
 * @param {Object} analysis - Analysis result
 */
function addToAnalyzerSheet(sheet, analysis) {
  const row = [
    analysis.leadId,
    analysis.address,
    analysis.city,
    analysis.state,
    analysis.zip,
    analysis.askingPrice,
    analysis.beds,
    analysis.baths,
    analysis.sqft,
    analysis.yearBuilt,
    analysis.propertyType,
    analysis.condition,
    analysis.arvEstimate,
    analysis.rentLtr,
    analysis.rentStr,
    analysis.rentMtr,
    analysis.repairEstimate,
    analysis.repairComplexity,
    analysis.holdingCost,
    analysis.maoWholesale,
    analysis.maoFlip,
    analysis.maoBrrrr,
    analysis.offerTarget,
    analysis.spreadEstimate,
    analysis.cashflowLtr,
    analysis.cashflowMtr,
    analysis.cashflowStr,
    analysis.equityEstimate,
    analysis.sub2FitScore,
    analysis.wrapFitScore,
    analysis.sellerFinanceFitScore,
    analysis.strategyRecommendation,
    analysis.strategyConfidence,
    analysis.dealClassifier,
    analysis.riskScore,
    analysis.velocityScore,
    analysis.marketHeatScore,
    analysis.negotiationAngle,
    analysis.sellerPsychologyScore,
    analysis.motivationScore,
    analysis.nextBestAction,
    analysis.sellerMessage,
    analysis.buyerMatchCount,
    analysis.buyerMatchTop3,
    analysis.crmRouteTarget,
    analysis.synced,
    analysis.lastAnalyzedTimestamp
  ];

  sheet.appendRow(row);
}

/**
 * Re-analyzes a specific lead by ID
 * @param {string} leadId - Lead ID to re-analyze
 * @returns {Object} Analysis result
 */
function reanalyzeLeadById(leadId) {
  const lead = findRowByColumn(SHEETS.LEADS_DATABASE, 'Lead ID', leadId);
  if (!lead) {
    throw new Error('Lead not found: ' + leadId);
  }

  return analyzeIndividualLead(lead);
}

/**
 * Analyzes all leads (including already analyzed ones)
 * Use with caution - will reprocess everything
 */
function reanalyzeAllLeads() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Re-analyze All Leads',
    'This will clear the Deal Analyzer and re-process all leads.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  // Clear Deal Analyzer
  clearSheetData(SHEETS.DEAL_ANALYZER);

  // Reset status in Leads Database
  const leadsSheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEETS.LEADS_DATABASE);
  const lastRow = leadsSheet.getLastRow();

  if (lastRow > 1) {
    const statusCol = COLUMNS.LEADS_DATABASE.indexOf('Status') + 1;
    if (statusCol > 0) {
      leadsSheet.getRange(2, statusCol, lastRow - 1, 1).setValue('New');
    }
  }

  // Run analysis
  analyzeNewLeads();
}
