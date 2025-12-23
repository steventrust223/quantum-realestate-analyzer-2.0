/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * Verdict Module (verdict.gs)
 * ============================================================================
 *
 * Generates ranked verdict list from analyzed deals.
 * Produces actionable rankings for quick decision making.
 */

// =============================================================================
// MAIN VERDICT FUNCTIONS
// =============================================================================

/**
 * Rebuilds the Verdict sheet with ranked deals
 * @returns {Object} Rebuild result
 */
function rebuildVerdict() {
  try {
    logInfo('Verdict', 'Rebuilding verdict rankings...');
    showToast('Building verdict...', 'Verdict', 30);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const verdictSheet = ss.getSheetByName(SHEETS.VERDICT);

    if (!verdictSheet) {
      throw new Error('Verdict sheet not found');
    }

    // Get analyzed deals
    const analyzedDeals = getSheetDataAsObjects(SHEETS.DEAL_ANALYZER);

    if (analyzedDeals.length === 0) {
      logInfo('Verdict', 'No analyzed deals to rank');
      showToast('No deals to rank');
      return { count: 0 };
    }

    // Score and rank deals
    const rankedDeals = rankDeals(analyzedDeals);

    // Clear existing verdict data
    clearSheetData(SHEETS.VERDICT);

    // Write ranked deals to verdict sheet
    writeVerdictData(verdictSheet, rankedDeals);

    // Apply formatting
    applyVerdictFormatting(verdictSheet);

    const result = { count: rankedDeals.length };
    logSuccess('Verdict', `Verdict rebuilt with ${rankedDeals.length} deals`);
    showToast(`Ranked ${rankedDeals.length} deals`, 'Verdict Complete');

    return result;
  } catch (e) {
    logError('Verdict', e, 'Verdict rebuild failed');
    throw e;
  }
}

/**
 * Ranks deals by composite score
 * @param {Array} deals - Analyzed deals
 * @returns {Array} Ranked deals
 */
function rankDeals(deals) {
  // Calculate composite score for each deal
  const scoredDeals = deals.map(deal => {
    const compositeScore = calculateCompositeVerdictScore(deal);
    return {
      ...deal,
      compositeScore: compositeScore
    };
  });

  // Sort by composite score descending
  scoredDeals.sort((a, b) => b.compositeScore - a.compositeScore);

  // Add rank
  return scoredDeals.map((deal, index) => ({
    ...deal,
    rank: index + 1
  }));
}

/**
 * Calculates composite score for verdict ranking
 * @param {Object} deal - Deal data from analyzer
 * @returns {number} Composite score
 */
function calculateCompositeVerdictScore(deal) {
  let score = 0;

  // Deal classifier weight (40%)
  switch (deal['Deal Classifier']) {
    case 'HOT DEAL':
      score += 40;
      break;
    case 'PORTFOLIO FOUNDATION':
      score += 30;
      break;
    case 'SOLID DEAL':
      score += 20;
      break;
    default:
      score += 5;
  }

  // Strategy confidence (20%)
  const confidence = safeParseNumber(deal['Strategy Confidence'], 50);
  score += (confidence / 100) * 20;

  // Inverted risk score (15%) - lower risk is better
  const risk = safeParseNumber(deal['Risk Score'], 50);
  score += ((100 - risk) / 100) * 15;

  // Velocity score (10%)
  const velocity = safeParseNumber(deal['Sales Velocity Score'], 50);
  score += (velocity / 100) * 10;

  // Market heat (10%)
  const heat = safeParseNumber(deal['Market Heat Score'], 50);
  score += (heat / 100) * 10;

  // Profit potential (5%)
  const spread = safeParseNumber(deal['Spread Estimate'], 0);
  const spreadScore = Math.min(spread / 25000, 1); // Max at $25k spread
  score += spreadScore * 5;

  return Math.round(score);
}

/**
 * Writes ranked deals to verdict sheet
 * @param {Sheet} sheet - Verdict sheet
 * @param {Array} rankedDeals - Ranked deals array
 */
function writeVerdictData(sheet, rankedDeals) {
  if (rankedDeals.length === 0) return;

  const rows = rankedDeals.map(deal => [
    deal.rank,
    deal['Lead ID'],
    deal['Address'],
    deal['City'],
    deal['State'],
    deal['Strategy Recommendation'],
    deal['Deal Classifier'],
    safeParseNumber(deal['Offer Target'], 0),
    safeParseNumber(deal['Spread Estimate'], 0),
    safeParseNumber(deal['Risk Score'], 0),
    safeParseNumber(deal['Sales Velocity Score'], 0),
    safeParseNumber(deal['Market Heat Score'], 0),
    safeParseNumber(deal['Strategy Confidence'], 0),
    getRecommendedAction(deal),
    deal['Listing URL'] || '',
    new Date()
  ]);

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Gets recommended action based on deal classifier
 * @param {Object} deal - Deal data
 * @returns {string} Recommended action
 */
function getRecommendedAction(deal) {
  const classifier = deal['Deal Classifier'];
  const strategy = deal['Strategy Recommendation'] || '';

  switch (classifier) {
    case 'HOT DEAL':
      if (strategy.toLowerCase().includes('wholesale')) {
        return 'MAKE OFFER NOW - Call seller immediately';
      } else if (strategy.toLowerCase().includes('flip')) {
        return 'SCHEDULE WALKTHROUGH - High priority';
      } else {
        return 'ACT FAST - Lock up this deal';
      }

    case 'PORTFOLIO FOUNDATION':
      if (strategy.toLowerCase().includes('rental') || strategy.toLowerCase().includes('ltr')) {
        return 'ANALYZE CASHFLOW - Strong hold candidate';
      } else if (strategy.toLowerCase().includes('brrrr')) {
        return 'RUN BRRRR NUMBERS - Refinance potential';
      } else {
        return 'EVALUATE - Good long-term opportunity';
      }

    case 'SOLID DEAL':
      return 'FOLLOW UP - Worth pursuing with right terms';

    default:
      return 'MONITOR - May improve with negotiation';
  }
}

/**
 * Applies formatting to verdict sheet
 * @param {Sheet} sheet - Verdict sheet
 */
function applyVerdictFormatting(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Apply banding
  applyBanding(sheet);

  // Format currency columns
  const offerTargetCol = COLUMNS.VERDICT.indexOf('Offer Target') + 1;
  const profitCol = COLUMNS.VERDICT.indexOf('Profit/Spread') + 1;

  if (offerTargetCol > 0) {
    sheet.getRange(2, offerTargetCol, lastRow - 1, 1).setNumberFormat('$#,##0');
  }
  if (profitCol > 0) {
    sheet.getRange(2, profitCol, lastRow - 1, 1).setNumberFormat('$#,##0');
  }

  // Apply deal classifier conditional formatting
  const classifierCol = COLUMNS.VERDICT.indexOf('Deal Classifier') + 1;
  if (classifierCol > 0) {
    applyDealClassifierFormatting(sheet, classifierCol);
  }

  // Make URLs clickable
  const urlCol = COLUMNS.VERDICT.indexOf('Listing URL') + 1;
  if (urlCol > 0 && lastRow > 1) {
    const urlRange = sheet.getRange(2, urlCol, lastRow - 1, 1);
    const urls = urlRange.getValues();
    const formulas = urls.map(row => {
      const url = row[0];
      if (url && url.toString().startsWith('http')) {
        return [`=HYPERLINK("${url}", "View")`];
      }
      return [url];
    });
    urlRange.setValues(formulas);
  }

  // Highlight top 5 deals
  if (lastRow >= 6) {
    sheet.getRange(2, 1, 5, sheet.getLastColumn())
      .setBackground('#fff9c4'); // Light yellow
  }
}

// =============================================================================
// VERDICT QUERIES
// =============================================================================

/**
 * Gets top N deals from verdict
 * @param {number} n - Number of deals to get
 * @returns {Array} Top deals
 */
function getTopDeals(n = 10) {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  return verdictData.slice(0, n);
}

/**
 * Gets HOT DEAL leads from verdict
 * @returns {Array} Hot deals
 */
function getHotDeals() {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  return verdictData.filter(deal => deal['Deal Classifier'] === 'HOT DEAL');
}

/**
 * Gets deals by strategy
 * @param {string} strategy - Strategy name
 * @returns {Array} Matching deals
 */
function getDealsByStrategy(strategy) {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  return verdictData.filter(deal =>
    (deal['Strategy'] || '').toLowerCase().includes(strategy.toLowerCase())
  );
}

/**
 * Gets deals by deal classifier
 * @param {string} classifier - Classifier (HOT DEAL, PORTFOLIO FOUNDATION, etc.)
 * @returns {Array} Matching deals
 */
function getDealsByClassifier(classifier) {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  return verdictData.filter(deal => deal['Deal Classifier'] === classifier);
}

/**
 * Gets deals in a price range
 * @param {number} minPrice - Minimum offer target
 * @param {number} maxPrice - Maximum offer target
 * @returns {Array} Matching deals
 */
function getDealsInPriceRange(minPrice, maxPrice) {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  return verdictData.filter(deal => {
    const price = safeParseNumber(deal['Offer Target'], 0);
    return price >= minPrice && price <= maxPrice;
  });
}

/**
 * Gets deals in specific markets (states)
 * @param {Array} states - Array of state codes
 * @returns {Array} Matching deals
 */
function getDealsInMarkets(states) {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  const statesUpper = states.map(s => s.toUpperCase());
  return verdictData.filter(deal =>
    statesUpper.includes((deal['State'] || '').toUpperCase())
  );
}

// =============================================================================
// VERDICT STATISTICS
// =============================================================================

/**
 * Gets verdict statistics summary
 * @returns {Object} Statistics
 */
function getVerdictStats() {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);

  if (verdictData.length === 0) {
    return {
      totalDeals: 0,
      hotDeals: 0,
      portfolioFoundation: 0,
      solidDeals: 0,
      pass: 0,
      avgSpread: 0,
      avgRisk: 0,
      avgVelocity: 0,
      byStrategy: {}
    };
  }

  // Count by classifier
  const byClassifier = {
    'HOT DEAL': 0,
    'PORTFOLIO FOUNDATION': 0,
    'SOLID DEAL': 0,
    'PASS': 0
  };

  // Count by strategy
  const byStrategy = {};

  // Accumulate for averages
  let totalSpread = 0;
  let totalRisk = 0;
  let totalVelocity = 0;

  verdictData.forEach(deal => {
    // Classifier count
    const classifier = deal['Deal Classifier'] || 'PASS';
    byClassifier[classifier] = (byClassifier[classifier] || 0) + 1;

    // Strategy count
    const strategy = deal['Strategy'] || 'Unknown';
    byStrategy[strategy] = (byStrategy[strategy] || 0) + 1;

    // Totals
    totalSpread += safeParseNumber(deal['Profit/Spread'], 0);
    totalRisk += safeParseNumber(deal['Risk Score'], 50);
    totalVelocity += safeParseNumber(deal['Velocity Score'], 50);
  });

  const count = verdictData.length;

  return {
    totalDeals: count,
    hotDeals: byClassifier['HOT DEAL'],
    portfolioFoundation: byClassifier['PORTFOLIO FOUNDATION'],
    solidDeals: byClassifier['SOLID DEAL'],
    pass: byClassifier['PASS'],
    avgSpread: Math.round(totalSpread / count),
    avgRisk: Math.round(totalRisk / count),
    avgVelocity: Math.round(totalVelocity / count),
    byStrategy: byStrategy,
    byClassifier: byClassifier
  };
}

/**
 * Gets pipeline value from verdict
 * @returns {Object} Pipeline values
 */
function getPipelineValue() {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);

  let hotPipeline = 0;
  let portfolioPipeline = 0;
  let solidPipeline = 0;
  let totalPipeline = 0;

  verdictData.forEach(deal => {
    const spread = safeParseNumber(deal['Profit/Spread'], 0);

    switch (deal['Deal Classifier']) {
      case 'HOT DEAL':
        hotPipeline += spread;
        break;
      case 'PORTFOLIO FOUNDATION':
        portfolioPipeline += spread;
        break;
      case 'SOLID DEAL':
        solidPipeline += spread;
        break;
    }
    totalPipeline += spread;
  });

  return {
    hot: hotPipeline,
    portfolio: portfolioPipeline,
    solid: solidPipeline,
    total: totalPipeline
  };
}

// =============================================================================
// VERDICT EXPORT
// =============================================================================

/**
 * Exports verdict data to JSON
 * @returns {string} JSON string
 */
function exportVerdictToJson() {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  return JSON.stringify(verdictData, null, 2);
}

/**
 * Exports verdict summary for reporting
 * @returns {Object} Summary for reports
 */
function exportVerdictSummary() {
  const stats = getVerdictStats();
  const pipeline = getPipelineValue();
  const topDeals = getTopDeals(5);

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalDeals: stats.totalDeals,
      hotDeals: stats.hotDeals,
      avgSpread: formatCurrency(stats.avgSpread),
      totalPipelineValue: formatCurrency(pipeline.total)
    },
    breakdown: {
      byClassifier: stats.byClassifier,
      byStrategy: stats.byStrategy
    },
    topDeals: topDeals.map(deal => ({
      rank: deal['Rank'],
      address: `${deal['Address']}, ${deal['City']}, ${deal['State']}`,
      strategy: deal['Strategy'],
      classifier: deal['Deal Classifier'],
      offerTarget: formatCurrency(deal['Offer Target']),
      spread: formatCurrency(deal['Profit/Spread']),
      action: deal['Action']
    })),
    pipelineValue: {
      hot: formatCurrency(pipeline.hot),
      portfolio: formatCurrency(pipeline.portfolio),
      solid: formatCurrency(pipeline.solid),
      total: formatCurrency(pipeline.total)
    }
  };
}

// =============================================================================
// VERDICT NOTIFICATIONS
// =============================================================================

/**
 * Generates verdict change notification
 * @param {Object} previousStats - Previous statistics
 * @param {Object} currentStats - Current statistics
 * @returns {Object} Change notification
 */
function generateVerdictChangeNotification(previousStats, currentStats) {
  const changes = [];

  // New hot deals
  const newHotDeals = currentStats.hotDeals - (previousStats?.hotDeals || 0);
  if (newHotDeals > 0) {
    changes.push({
      type: 'new_hot_deals',
      message: `${newHotDeals} new HOT DEAL${newHotDeals > 1 ? 's' : ''} identified!`,
      priority: 'high'
    });
  }

  // Pipeline change
  const currentPipeline = getPipelineValue();
  const pipelineChange = currentPipeline.total - (previousStats?.totalPipeline || 0);
  if (Math.abs(pipelineChange) > 10000) {
    changes.push({
      type: 'pipeline_change',
      message: `Pipeline value ${pipelineChange > 0 ? 'increased' : 'decreased'} by ${formatCurrency(Math.abs(pipelineChange))}`,
      priority: pipelineChange > 0 ? 'info' : 'warning'
    });
  }

  // New deals added
  const newDeals = currentStats.totalDeals - (previousStats?.totalDeals || 0);
  if (newDeals > 0) {
    changes.push({
      type: 'new_deals',
      message: `${newDeals} new deal${newDeals > 1 ? 's' : ''} analyzed and ranked`,
      priority: 'info'
    });
  }

  return {
    hasChanges: changes.length > 0,
    changes: changes,
    timestamp: new Date()
  };
}

// =============================================================================
// QUICK ACTIONS FROM VERDICT
// =============================================================================

/**
 * Gets the next best action for a user
 * @returns {Object} Next action recommendation
 */
function getNextBestAction() {
  const hotDeals = getHotDeals();

  if (hotDeals.length > 0) {
    const topHot = hotDeals[0];
    return {
      action: 'MAKE OFFER',
      deal: {
        address: `${topHot['Address']}, ${topHot['City']}, ${topHot['State']}`,
        strategy: topHot['Strategy'],
        offerTarget: formatCurrency(topHot['Offer Target']),
        spread: formatCurrency(topHot['Profit/Spread'])
      },
      priority: 'URGENT',
      message: 'You have a HOT DEAL waiting. Make contact with seller today!'
    };
  }

  const topDeals = getTopDeals(1);
  if (topDeals.length > 0) {
    const top = topDeals[0];
    return {
      action: 'FOLLOW UP',
      deal: {
        address: `${top['Address']}, ${top['City']}, ${top['State']}`,
        strategy: top['Strategy'],
        offerTarget: formatCurrency(top['Offer Target'])
      },
      priority: 'NORMAL',
      message: 'Review your top ranked deal and consider making an offer.'
    };
  }

  return {
    action: 'IMPORT LEADS',
    deal: null,
    priority: 'LOW',
    message: 'No deals in pipeline. Import new leads to get started.'
  };
}

/**
 * Creates action items from verdict for CRM sync
 * @returns {Array} Action items
 */
function createActionItemsFromVerdict() {
  const hotDeals = getHotDeals();

  return hotDeals.map(deal => ({
    leadId: deal['Lead ID'],
    address: deal['Address'],
    action: 'CONTACT_SELLER',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    notes: `Hot deal identified. Strategy: ${deal['Strategy']}. Offer target: ${formatCurrency(deal['Offer Target'])}`,
    assignTo: 'Default',
    status: 'PENDING'
  }));
}

// =============================================================================
// VERDICT REFRESH
// =============================================================================

/**
 * Quick refresh of verdict (updates only new/changed deals)
 * @returns {Object} Refresh result
 */
function quickRefreshVerdict() {
  try {
    const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
    const analyzerData = getSheetDataAsObjects(SHEETS.DEAL_ANALYZER);

    // Find new deals not in verdict
    const verdictIds = new Set(verdictData.map(d => d['Lead ID']));
    const newDeals = analyzerData.filter(d => !verdictIds.has(d['Lead ID']));

    if (newDeals.length === 0) {
      logInfo('Verdict', 'No new deals to add');
      return { added: 0 };
    }

    // Full rebuild is safer than incremental for ranking
    return rebuildVerdict();
  } catch (e) {
    logError('Verdict', e, 'Quick refresh failed');
    return rebuildVerdict();
  }
}

/**
 * Checks if verdict needs refresh
 * @returns {boolean} True if refresh needed
 */
function verdictNeedsRefresh() {
  const verdictData = getSheetDataAsObjects(SHEETS.VERDICT);
  const analyzerData = getSheetDataAsObjects(SHEETS.DEAL_ANALYZER);

  // Check if counts match
  if (verdictData.length !== analyzerData.length) {
    return true;
  }

  // Check for any unsynced deals
  const verdictIds = new Set(verdictData.map(d => d['Lead ID']));
  const hasNew = analyzerData.some(d => !verdictIds.has(d['Lead ID']));

  return hasNew;
}
