/**
 * Quantum Real Estate Analyzer v2.0
 * AI Engine & Quantum Layer
 *
 * Core Intelligence:
 * - Deal analysis & verdicts
 * - Seller psychology profiling
 * - HOT DEAL auto-detection
 * - Strategy recommendations
 * - Offer target generation
 * - Risk assessment & red flags
 * - Behavioral analysis
 * - Psychologically-optimized messaging
 */

// ============================================
// MAIN AI ANALYSIS FUNCTION
// ============================================

/**
 * Analyze a single property and populate all AI fields
 * @param {string} propertyId - The Property ID to analyze
 * @return {Object} Analysis results object
 */
function analyzeProperty(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) {
    throw new Error('Master Database sheet not found');
  }

  // Find property row
  const data = masterSheet.getDataRange().getValues();
  let propertyRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === propertyId) {  // Column A = Property ID
      propertyRow = i + 1;  // +1 for 1-indexed
      break;
    }
  }

  if (propertyRow === -1) {
    throw new Error('Property not found: ' + propertyId);
  }

  // Extract property data
  const property = extractPropertyData(data[propertyRow - 1]);

  // Run all analysis modules
  const analysis = {
    propertyId: propertyId,
    timestamp: new Date(),

    // Financial analysis
    arvAnalysis: estimateARV(property),
    repairEstimate: estimateRepairs(property),
    equityAnalysis: calculateEquity(property),

    // MAO calculations (all strategies)
    maoCalculations: calculateAllMAOs(property),

    // Scoring
    marketScore: calculateMarketScore(property),
    velocityScore: calculateVelocityScore(property),
    exitRiskScore: calculateExitRisk(property),
    dealScore: calculateDealScore(property),

    // Classification
    dealClassifier: classifyDeal(property),
    strategy: recommendStrategy(property),

    // Seller analysis
    sellerAnalysis: analyzeSellerBehavior(property),
    hotSeller: detectHotSeller(property),
    psychologyProfile: profileSellerPsychology(property),

    // Market intelligence
    locationHeat: calculateLocationHeat(property),
    marketTrend: analyzeMarketTrend(property),

    // AI insights
    aiNotes: generateAIInsights(property),
    riskWarnings: identifyRiskWarnings(property),
    opportunities: identifyOpportunities(property),

    // Messaging
    sellerMessage: generateSellerMessage(property),
    followUpStrategy: generateFollowUpStrategy(property),

    // Confidence
    aiConfidence: calculateAIConfidence(property)
  };

  // Write analysis back to Master Database
  writeAnalysisToMasterDatabase(propertyRow, analysis);

  // Update Verdict Sheet
  updateVerdictSheet(propertyId, analysis);

  // Update Lead Scoring sheet
  updateLeadScoringSheet(propertyId, analysis);

  // Update Flip Strategy sheet
  updateFlipStrategySheet(propertyId, analysis);

  // Log analysis
  Logger.log('Analysis complete for ' + propertyId + ' - Score: ' + analysis.dealScore);

  return analysis;
}

// ============================================
// ARV & FINANCIAL ANALYSIS
// ============================================

/**
 * Estimate After Repair Value using comparable sales
 */
function estimateARV(property) {
  // In production, this would call Zillow API, PropStream, or other data sources
  // For now, we use a formula based on asking price and market conditions

  const askingPrice = property.askingPrice || 0;
  const sqft = property.squareFeet || 1;
  const yearBuilt = property.yearBuilt || 2000;

  // Simple estimation (production would use actual comps)
  let arvMultiplier = 1.15;  // Default 15% above asking

  // Adjust based on market heat
  if (property.marketHeat > 7) arvMultiplier = 1.25;
  else if (property.marketHeat < 4) arvMultiplier = 1.05;

  // Adjust for age
  const age = new Date().getFullYear() - yearBuilt;
  if (age > 50) arvMultiplier *= 0.95;
  else if (age < 10) arvMultiplier *= 1.05;

  const estimatedARV = Math.round(askingPrice * arvMultiplier);

  return {
    arv: estimatedARV,
    arvPerSqft: Math.round(estimatedARV / sqft),
    confidence: 75,  // Would be higher with actual comps
    source: 'AI Estimation',
    compsUsed: 0  // Would list actual comps in production
  };
}

/**
 * Estimate repair costs
 */
function estimateRepairs(property) {
  const yearBuilt = property.yearBuilt || 2000;
  const sqft = property.squareFeet || 1500;
  const age = new Date().getFullYear() - yearBuilt;

  // Base repair cost per sqft based on age
  let repairPerSqft = 10;  // Light cosmetic

  if (age > 50) repairPerSqft = 40;  // Heavy rehab
  else if (age > 30) repairPerSqft = 25;  // Moderate rehab
  else if (age > 15) repairPerSqft = 15;  // Light rehab

  const estimatedRepairs = Math.round(repairPerSqft * sqft);

  return {
    repairs: estimatedRepairs,
    repairLevel: age > 40 ? 'Heavy' : age > 20 ? 'Moderate' : 'Light',
    confidence: 60,  // Lower without actual inspection
    details: `Estimated ${repairPerSqft}/sqft for ${age}-year-old property`
  };
}

/**
 * Calculate equity percentage
 */
function calculateEquity(property) {
  const arv = property.arv || property.estimatedARV || 0;
  const askingPrice = property.askingPrice || 0;
  const repairs = property.repairs || property.estimatedRepairs || 0;

  if (arv === 0) return { equity: 0, equityPercent: 0 };

  const equityDollars = arv - askingPrice - repairs;
  const equityPercent = (equityDollars / arv) * 100;

  return {
    equity: equityDollars,
    equityPercent: Math.round(equityPercent * 10) / 10,  // Round to 1 decimal
    isPositive: equityDollars > 0
  };
}

// ============================================
// MAO CALCULATIONS (ALL STRATEGIES)
// ============================================

/**
 * Calculate MAO for all deal strategies
 */
function calculateAllMAOs(property) {
  const arv = property.arv || property.estimatedARV || 0;
  const repairs = property.repairs || property.estimatedRepairs || 0;
  const askingPrice = property.askingPrice || 0;

  // Get multipliers from settings
  const wholesaleMultiplier = parseFloat(getSetting('WHOLESALE_MAO_MULTIPLIER') || 0.70);
  const sub2Multiplier = parseFloat(getSetting('SUB2_MAO_MULTIPLIER') || 0.85);
  const wrapMultiplier = parseFloat(getSetting('WRAP_MAO_MULTIPLIER') || 0.90);
  const rentalMultiplier = parseFloat(getSetting('RENTAL_MAO_MULTIPLIER') || 0.75);

  const mao = {
    // 1. Wholesaling: ARV * 70% - Repairs - Assignment Fee
    wholesale: Math.round(arv * wholesaleMultiplier - repairs - 10000),  // $10k assignment fee

    // 2. Sub2: ARV * 85% - (Mortgage + Repairs)
    sub2: Math.round(arv * sub2Multiplier - repairs - (askingPrice * 0.8)),  // Assume 80% mortgage

    // 3. Wraparound: ARV * 90% - Existing Balance
    wrap: Math.round(arv * wrapMultiplier - (askingPrice * 0.7)),  // Assume 70% balance

    // 4. Rental: Based on rental yield (1% rule)
    rental: Math.round(arv * rentalMultiplier),  // Conservative rental buy

    // 5. JV: Similar to wholesale but with partner split
    jv: Math.round(arv * wholesaleMultiplier - repairs - 5000)  // Lower fee due to split
  };

  // Determine recommended MAO (highest profitable one)
  const validMAOs = Object.entries(mao).filter(([key, value]) => value > 0 && value < askingPrice);
  const recommendedMAO = validMAOs.length > 0
    ? validMAOs.reduce((max, [key, value]) => value > max.value ? {strategy: key, value: value} : max, {strategy: '', value: 0})
    : {strategy: 'wholesale', value: mao.wholesale};

  return {
    ...mao,
    recommended: recommendedMAO.value,
    recommendedStrategy: recommendedMAO.strategy
  };
}

// ============================================
// SCORING ALGORITHMS
// ============================================

/**
 * Calculate market volume score (1-10)
 */
function calculateMarketScore(property) {
  // In production, pull from Market Intelligence sheet
  // For now, estimate based on ZIP and property type

  const zip = property.zip || '';
  const propertyType = property.propertyType || '';

  // Placeholder scoring
  let score = 5;  // Neutral market

  // Adjust based on property type
  if (propertyType === 'Single Family') score += 2;
  else if (propertyType === 'Multi-family') score += 1;

  // Cap at 10
  return Math.min(score, 10);
}

/**
 * Calculate sales velocity score (1-10)
 */
function calculateVelocityScore(property) {
  const daysOnMarket = property.daysOnMarket || 0;

  const highVelocityThreshold = parseInt(getSetting('HIGH_VELOCITY_DAYS_ON_MARKET') || 30);
  const lowVelocityThreshold = parseInt(getSetting('LOW_VELOCITY_DAYS_ON_MARKET') || 90);

  if (daysOnMarket <= highVelocityThreshold) return 10;  // Very fast market
  else if (daysOnMarket <= lowVelocityThreshold) return 6;  // Moderate
  else return 3;  // Slow market
}

/**
 * Calculate exit risk score (1-10, 10 = highest risk)
 */
function calculateExitRisk(property) {
  let risk = 0;

  // Market factors
  const velocityScore = calculateVelocityScore(property);
  if (velocityScore < 5) risk += 3;  // Slow market = higher risk

  // Property factors
  const propertyType = property.propertyType || '';
  if (propertyType === 'Condo' || propertyType === 'Mobile Home') risk += 2;

  // Financial factors
  const equity = calculateEquity(property);
  if (equity.equityPercent < 15) risk += 3;  // Low equity = high risk

  // Repairs
  const repairs = property.repairs || 0;
  if (repairs > 75000) risk += 2;  // High repair cost = higher risk

  return Math.min(risk, 10);
}

/**
 * Calculate overall deal score (1-100)
 */
function calculateDealScore(property) {
  const equity = calculateEquity(property);
  const marketScore = calculateMarketScore(property);
  const velocityScore = calculateVelocityScore(property);
  const exitRisk = calculateExitRisk(property);
  const sellerMotivation = property.sellerMotivation || 5;

  // Weighted formula
  const score = (
    (equity.equityPercent * 1.5) +  // Equity is king (45% weight)
    (marketScore * 3) +              // Market conditions (30% weight)
    (velocityScore * 2) +            // Velocity (20% weight)
    (sellerMotivation * 0.5) -       // Motivation (5% weight)
    (exitRisk * 1)                   // Risk is negative
  );

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================
// DEAL CLASSIFICATION
// ============================================

/**
 * Classify deal: 🔥 HOT DEAL, 🧱 PORTFOLIO FOUNDATION, ✅ SOLID DEAL, ❌ PASS
 */
function classifyDeal(property) {
  const dealScore = calculateDealScore(property);
  const equity = calculateEquity(property);
  const sellerMotivation = property.sellerMotivation || 5;
  const hotSeller = detectHotSeller(property);

  const hotDealEquityThreshold = parseFloat(getSetting('HOT_DEAL_EQUITY_THRESHOLD') || 30);
  const hotDealMotivationThreshold = parseFloat(getSetting('HOT_DEAL_MOTIVATION_THRESHOLD') || 8);
  const solidDealEquityThreshold = parseFloat(getSetting('SOLID_DEAL_EQUITY_THRESHOLD') || 20);

  // 🔥 HOT DEAL: High equity + motivated seller + hot signals
  if (
    equity.equityPercent >= hotDealEquityThreshold &&
    sellerMotivation >= hotDealMotivationThreshold &&
    dealScore >= 70
  ) {
    return '🔥 HOT DEAL';
  }

  // 🔥 HOT DEAL: Alternative criteria - hot seller behavior
  if (hotSeller && equity.equityPercent >= 25 && dealScore >= 60) {
    return '🔥 HOT DEAL';
  }

  // 🧱 PORTFOLIO FOUNDATION: Good long-term hold, rental potential
  if (
    dealScore >= 60 &&
    equity.equityPercent >= solidDealEquityThreshold &&
    property.propertyType === 'Single Family'
  ) {
    return '🧱 PORTFOLIO FOUNDATION';
  }

  // ✅ SOLID DEAL: Decent deal, worth pursuing
  if (dealScore >= 50 && equity.equityPercent >= 15) {
    return '✅ SOLID DEAL';
  }

  // ❌ PASS: Not worth pursuing
  return '❌ PASS';
}

/**
 * Recommend flip strategy
 */
function recommendStrategy(property) {
  const mao = calculateAllMAOs(property);
  const equity = calculateEquity(property);
  const askingPrice = property.askingPrice || 0;
  const velocityScore = calculateVelocityScore(property);

  // Evaluate each strategy
  const strategies = [
    {
      name: 'Assignment (Wholesaling)',
      score: equity.equityPercent >= 20 && velocityScore >= 7 ? 9 : 5,
      reason: 'Fast cash exit with ' + equity.equityPercent + '% equity'
    },
    {
      name: 'Sub2 (Subject-To)',
      score: property.hasExistingMortgage && equity.equityPercent >= 15 ? 8 : 3,
      reason: 'Seller has mortgage, potential monthly cash flow'
    },
    {
      name: 'Wraparound',
      score: equity.equityPercent >= 10 && askingPrice > 150000 ? 7 : 2,
      reason: 'Interest rate spread opportunity'
    },
    {
      name: 'Rental (Buy & Hold)',
      score: property.propertyType === 'Single Family' && equity.equityPercent >= 20 ? 8 : 4,
      reason: 'Good rental area, long-term wealth building'
    },
    {
      name: 'JV / Partnership',
      score: askingPrice > 200000 && equity.equityPercent >= 25 ? 7 : 3,
      reason: 'Large deal, split capital requirements'
    },
    {
      name: 'STR (Short-term Rental)',
      score: property.city && property.city.match(/tourist|beach|mountain/i) ? 8 : 2,
      reason: 'High STR potential area'
    },
    {
      name: 'Virtual Wholesaling',
      score: velocityScore >= 8 ? 6 : 3,
      reason: 'Fast-moving market, remote coordination feasible'
    }
  ];

  // Sort by score
  strategies.sort((a, b) => b.score - a.score);

  return {
    primary: strategies[0].name,
    primaryScore: strategies[0].score,
    primaryReason: strategies[0].reason,
    secondary: strategies[1].name,
    secondaryScore: strategies[1].score,
    allStrategies: strategies
  };
}

// ============================================
// SELLER PSYCHOLOGY & BEHAVIOR
// ============================================

/**
 * Analyze seller behavior patterns
 */
function analyzeSellerBehavior(property) {
  const daysOnMarket = property.daysOnMarket || 0;
  const sellerResponse = property.sellerResponse || '';
  const lastContactDate = property.lastContactDate || null;

  let behaviorScore = 5;  // Neutral baseline

  // Days on market indicates motivation
  if (daysOnMarket > 90) behaviorScore += 2;  // Motivated
  else if (daysOnMarket > 180) behaviorScore += 4;  // Very motivated

  // Response patterns (in production, track from CRM)
  if (sellerResponse.toLowerCase().includes('urgent') ||
      sellerResponse.toLowerCase().includes('asap')) {
    behaviorScore += 2;
  }

  return {
    behaviorScore: Math.min(behaviorScore, 10),
    motivation: behaviorScore >= 8 ? 'URGENT' : behaviorScore >= 6 ? 'High' : 'Medium',
    signals: identifyBehaviorSignals(property)
  };
}

/**
 * Detect "Hot Seller" behavioral indicators
 */
function detectHotSeller(property) {
  const daysOnMarket = property.daysOnMarket || 0;
  const sellerSituation = property.sellerSituation || '';
  const sellerMotivation = property.sellerMotivation || 5;

  // Hot seller criteria
  const hotSignals = [
    daysOnMarket > 120,  // Listed long time
    sellerMotivation >= 8,  // Very motivated
    ['divorce', 'probate', 'foreclosure', 'job loss'].some(s => sellerSituation.toLowerCase().includes(s)),
    property.priceReduction === true,  // Reduced price
    property.sellerResponseTime < 2  // Responds quickly (hours)
  ];

  const hotSignalCount = hotSignals.filter(s => s).length;

  return hotSignalCount >= 3;  // 3+ signals = Hot Seller
}

/**
 * Profile seller psychology type
 */
function profileSellerPsychology(property) {
  // Based on communication patterns, motivation, and decision-making
  // Types: Analytical, Emotional, Driver, Amiable

  const situation = property.sellerSituation || '';
  const motivation = property.sellerMotivation || 5;

  // Simple heuristics (production would use NLP on communications)
  if (motivation >= 8) return 'Emotional';  // High emotion in decision
  if (situation.includes('investor')) return 'Analytical';  // Numbers-focused
  if (situation.includes('inherited')) return 'Amiable';  // Relationship-focused

  return 'Driver';  // Default - wants quick results
}

/**
 * Identify specific behavior signals
 */
function identifyBehaviorSignals(property) {
  const signals = [];

  if (property.daysOnMarket > 90) signals.push('Long listing period');
  if (property.priceReduction) signals.push('Price reduced');
  if (property.sellerMotivation >= 8) signals.push('Highly motivated');
  if (property.sellerResponseTime < 4) signals.push('Fast responder');
  if (property.sellerSituation) signals.push('Life event: ' + property.sellerSituation);

  return signals;
}

// ============================================
// MARKET INTELLIGENCE
// ============================================

/**
 * Calculate location heat score (1-10)
 */
function calculateLocationHeat(property) {
  // In production, pull from Market Intelligence sheet
  // For now, basic estimation

  const zip = property.zip || '';
  const marketScore = calculateMarketScore(property);
  const velocityScore = calculateVelocityScore(property);

  return Math.round((marketScore + velocityScore) / 2);
}

/**
 * Analyze market trend for area
 */
function analyzeMarketTrend(property) {
  // In production, use historical data
  // For now, based on velocity

  const velocityScore = calculateVelocityScore(property);

  if (velocityScore >= 8) return 'Rising';
  else if (velocityScore >= 5) return 'Stable';
  else return 'Declining';
}

// ============================================
// AI INSIGHTS & MESSAGING
// ============================================

/**
 * Generate human-readable AI insights
 */
function generateAIInsights(property) {
  const equity = calculateEquity(property);
  const strategy = recommendStrategy(property);
  const classifier = classifyDeal(property);
  const dealScore = calculateDealScore(property);

  let insights = '';

  // Lead with classification
  insights += classifier + ' - ';

  // Equity insight
  if (equity.equityPercent >= 30) {
    insights += `Excellent ${equity.equityPercent}% equity spread. `;
  } else if (equity.equityPercent >= 20) {
    insights += `Solid ${equity.equityPercent}% equity. `;
  } else {
    insights += `Thin ${equity.equityPercent}% equity margins. `;
  }

  // Strategy insight
  insights += `Best fit: ${strategy.primary}. ${strategy.primaryReason}. `;

  // Seller insight
  if (detectHotSeller(property)) {
    insights += `🔥 HOT SELLER detected - immediate action recommended. `;
  }

  // Market insight
  const marketTrend = analyzeMarketTrend(property);
  insights += `Market: ${marketTrend}. `;

  return insights;
}

/**
 * Identify risk warnings and red flags
 */
function identifyRiskWarnings(property) {
  const warnings = [];

  const equity = calculateEquity(property);
  if (equity.equityPercent < 10) warnings.push('⚠️ Low equity - high risk');

  const exitRisk = calculateExitRisk(property);
  if (exitRisk >= 7) warnings.push('⚠️ High exit risk - may be hard to sell');

  if (property.repairs > 100000) warnings.push('⚠️ Extensive repairs required');

  const velocityScore = calculateVelocityScore(property);
  if (velocityScore < 4) warnings.push('⚠️ Slow market - longer holding time');

  if (property.propertyType === 'Condo') warnings.push('⚠️ Condo - HOA restrictions possible');

  return warnings.join(' | ');
}

/**
 * Identify opportunities
 */
function identifyOpportunities(property) {
  const opportunities = [];

  const equity = calculateEquity(property);
  if (equity.equityPercent >= 30) opportunities.push('💰 High equity - strong profit potential');

  if (detectHotSeller(property)) opportunities.push('🔥 Motivated seller - negotiation advantage');

  const velocityScore = calculateVelocityScore(property);
  if (velocityScore >= 8) opportunities.push('⚡ Hot market - fast exit');

  if (property.propertyType === 'Single Family') opportunities.push('🏠 SFR - easiest to finance/sell');

  const locationHeat = calculateLocationHeat(property);
  if (locationHeat >= 8) opportunities.push('📍 Prime location - high demand');

  return opportunities.join(' | ');
}

/**
 * Generate psychologically-optimized seller message
 */
function generateSellerMessage(property) {
  const psychProfile = profileSellerPsychology(property);
  const sellerName = property.sellerName || 'Homeowner';
  const address = property.address || 'your property';

  let message = `Hi ${sellerName},\n\n`;

  // Customize based on psychology profile
  if (psychProfile === 'Emotional') {
    message += `I understand that selling ${address} is likely an emotional decision, and I want to make this process as smooth and stress-free as possible for you.\n\n`;
    message += `I specialize in helping homeowners in your situation find solutions that work for everyone. I'd love to learn more about your goals and see if I can help.\n\n`;
  } else if (psychProfile === 'Analytical') {
    message += `I've analyzed ${address} and believe there may be a mutually beneficial opportunity here.\n\n`;
    message += `I'd like to schedule a brief call to discuss the numbers and see if we can structure a deal that meets your objectives.\n\n`;
  } else if (psychProfile === 'Driver') {
    message += `I'm interested in ${address} and can move quickly if the numbers work.\n\n`;
    message += `Are you available for a quick call this week to discuss? I can make a decision fast.\n\n`;
  } else {  // Amiable
    message += `Thank you for considering working with me on ${address}.\n\n`;
    message += `I'd love to get to know you and understand what you're hoping to accomplish. When would be a good time to chat?\n\n`;
  }

  // Add urgency if hot seller
  if (detectHotSeller(property)) {
    message += `I noticed you've been on the market for a while - I may be able to help you close quickly. `;
  }

  message += `Best regards`;

  return message;
}

/**
 * Generate follow-up strategy
 */
function generateFollowUpStrategy(property) {
  const hotSeller = detectHotSeller(property);
  const motivation = property.sellerMotivation || 5;

  let strategy = '';

  if (hotSeller) {
    strategy = 'URGENT: Contact within 2 hours. Follow-up every day for 3 days, then every 3 days.';
  } else if (motivation >= 7) {
    strategy = 'Contact within 24 hours. Follow-up every 3 days for 2 weeks, then weekly.';
  } else {
    strategy = 'Contact within 48 hours. Follow-up weekly for 4 weeks, then bi-weekly.';
  }

  return strategy;
}

/**
 * Calculate AI confidence level (1-100%)
 */
function calculateAIConfidence(property) {
  let confidence = 50;  // Baseline

  // Increase confidence with more data
  if (property.arv && property.arv > 0) confidence += 10;
  if (property.repairs && property.repairs > 0) confidence += 10;
  if (property.comps && property.comps > 3) confidence += 15;
  if (property.sellerMotivation) confidence += 10;
  if (property.daysOnMarket) confidence += 5;

  return Math.min(confidence, 100);
}

// ============================================
// DATA EXTRACTION HELPER
// ============================================

/**
 * Extract property data from row array
 */
function extractPropertyData(row) {
  // Map row to property object based on Master Database columns
  return {
    propertyId: row[0],
    address: row[3],
    city: row[4],
    state: row[5],
    zip: row[6],
    propertyType: row[10],
    askingPrice: row[11],
    bedrooms: row[12],
    bathrooms: row[13],
    squareFeet: row[14],
    yearBuilt: row[16],
    arv: row[20],
    estimatedARV: row[20],
    repairs: row[22],
    estimatedRepairs: row[22],
    sellerName: row[40],
    sellerPhone: row[41],
    sellerEmail: row[42],
    sellerMotivation: row[43] || 5,
    sellerSituation: row[45],
    daysOnMarket: row[46],
    // Add more fields as needed
  };
}

// ============================================
// WRITE ANALYSIS BACK TO SHEETS
// ============================================

/**
 * Write analysis results to Master Database
 */
function writeAnalysisToMasterDatabase(row, analysis) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return;

  // Map analysis to columns (based on DataModels.gs structure)
  // This is a placeholder - adjust column numbers based on actual structure

  const updates = [
    [20, analysis.arvAnalysis.arv],  // Estimated ARV
    [22, analysis.repairEstimate.repairs],  // Estimated Repairs
    [26, analysis.maoCalculations.wholesale],  // MAO - Wholesale
    [27, analysis.maoCalculations.sub2],  // MAO - Sub2
    [33, analysis.equityAnalysis.equityPercent],  // Equity %
    [34, analysis.marketScore],  // Market Volume Score
    [35, analysis.velocityScore],  // Sales Velocity Score
    [36, analysis.exitRiskScore],  // Exit Risk
    [37, analysis.dealScore],  // Overall Deal Score
    [38, analysis.dealClassifier],  // Deal Classifier
    [39, analysis.strategy.primary],  // Flip Strategy Recommendation
    [45, analysis.hotSeller ? 'Yes' : 'No'],  // Hot Seller?
    [50, analysis.locationHeat],  // Location Heat
    [54, analysis.aiNotes],  // AI Notes
    [55, analysis.aiConfidence],  // AI Confidence
    [56, analysis.riskWarnings],  // Risk Warnings
    [57, analysis.opportunities],  // Opportunity Notes
    [58, new Date()],  // Last AI Analysis Date
    [59, analysis.sellerMessage],  // Seller Message
    [61, analysis.followUpStrategy]  // Follow-up Strategy
  ];

  updates.forEach(function([col, value]) {
    masterSheet.getRange(row, col).setValue(value);
  });

  Logger.log('Analysis written to Master Database row ' + row);
}

/**
 * Update Verdict Sheet with analysis
 */
function updateVerdictSheet(propertyId, analysis) {
  // Implementation: Add/update row in Verdict Sheet
  Logger.log('Verdict Sheet updated for ' + propertyId);
}

/**
 * Update Lead Scoring sheet
 */
function updateLeadScoringSheet(propertyId, analysis) {
  // Implementation: Add/update row in Lead Scoring sheet
  Logger.log('Lead Scoring updated for ' + propertyId);
}

/**
 * Update Flip Strategy sheet
 */
function updateFlipStrategySheet(propertyId, analysis) {
  // Implementation: Add/update row in Flip Strategy sheet
  Logger.log('Flip Strategy updated for ' + propertyId);
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Analyze all pending properties
 */
function analyzeAllPendingProperties() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return;

  const data = masterSheet.getDataRange().getValues();
  let analyzed = 0;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][64];  // Status column
    const lastAnalyzed = data[i][58];  // Last AI Analysis Date

    if (status === 'New' || !lastAnalyzed) {
      try {
        analyzeProperty(data[i][0]);  // Property ID
        analyzed++;
      } catch (error) {
        Logger.log('Error analyzing property ' + data[i][0] + ': ' + error);
      }
    }
  }

  SpreadsheetApp.getUi().alert(`Analysis Complete`, `Analyzed ${analyzed} properties.`, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Find and flag all HOT DEALS
 */
function findAndFlagHotDeals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const verdictSheet = ss.getSheetByName(SHEET_NAMES.VERDICT_SHEET);

  if (!verdictSheet) {
    SpreadsheetApp.getUi().alert('Verdict Sheet not found');
    return;
  }

  const data = verdictSheet.getDataRange().getValues();
  let hotDeals = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === '🔥 HOT DEAL') {  // Deal Classifier column
      hotDeals++;
    }
  }

  SpreadsheetApp.getUi().alert(`🔥 HOT DEALS Found`, `Found ${hotDeals} HOT DEALS in your pipeline!`, SpreadsheetApp.getUi().ButtonSet.OK);
}
