/**
 * Quantum Real Estate Analyzer - Buyer Matching Engine Module
 * Matches deals to buyers based on criteria
 */

// ============================================================
// MAIN BUYER MATCHING
// ============================================================

/**
 * Runs buyer matching for all deals
 */
function runBuyerMatching() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const buyerDBSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);
  const matchingSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_MATCHING);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;
  if (!buyerDBSheet || buyerDBSheet.getLastRow() <= 1) {
    logEvent('BUYER', 'No buyers in database');
    return;
  }
  if (!matchingSheet) return;

  logEvent('BUYER', 'Running buyer matching engine');

  // Load buyers
  const buyers = loadBuyerDatabase(buyerDBSheet);
  if (buyers.length === 0) {
    logEvent('BUYER', 'No active buyers found');
    return;
  }

  // Load deals
  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  const masterColMap = {};
  masterHeaders.forEach((h, i) => masterColMap[h] = i + 1);

  const matchingHeaders = CONFIG.COLUMNS.BUYER_MATCHING;
  const matchResults = [];

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[masterColMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Build deal object
    const deal = {};
    masterHeaders.forEach((h, j) => deal[h] = row[j]);

    // Find matches
    const matches = matchBuyersToDeal(deal, buyers);

    // Build match row
    matchResults.push([
      deal['Deal ID'],
      deal['Address'],
      deal['Best Strategy'] || 'TBD',
      deal['Asking Price'],
      deal['ARV'],
      deal['ZIP'],
      deal['Property Type'],
      matches[0] ? matches[0].buyerName : '',
      matches[0] ? matches[0].matchScore : '',
      matches[1] ? matches[1].buyerName : '',
      matches[1] ? matches[1].matchScore : '',
      matches[2] ? matches[2].buyerName : '',
      matches[2] ? matches[2].matchScore : '',
      suggestDispoAction(deal, matches),
      new Date(),
      '' // Dispo Status
    ]);
  }

  // Write to matching sheet
  if (matchingSheet.getLastRow() > 1) {
    matchingSheet.getRange(2, 1, matchingSheet.getLastRow() - 1, matchingHeaders.length).clearContent();
  }
  if (matchResults.length > 0) {
    matchingSheet.getRange(2, 1, matchResults.length, matchingHeaders.length).setValues(matchResults);
  }

  logEvent('BUYER', `Buyer matching completed: ${matchResults.length} deals processed`);
}

/**
 * Loads buyer database
 * @param {Sheet} sheet - Buyer database sheet
 * @returns {Array} Array of buyer objects
 */
function loadBuyerDatabase(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const buyers = [];

  for (let i = 1; i < data.length; i++) {
    const buyer = {};
    headers.forEach((h, j) => buyer[h] = data[i][j]);

    // Only include active buyers
    if (buyer['Active'] === 'Yes' || buyer['Active'] === true) {
      buyers.push(buyer);
    }
  }

  return buyers;
}

/**
 * Matches buyers to a deal
 * @param {Object} deal - Deal object
 * @param {Array} buyers - Array of buyer objects
 * @returns {Array} Sorted array of matches with scores
 */
function matchBuyersToDeal(deal, buyers) {
  const matches = [];

  buyers.forEach(buyer => {
    const matchScore = calculateMatchScore(deal, buyer);
    if (matchScore > 0) {
      matches.push({
        buyerId: buyer['Buyer ID'],
        buyerName: buyer['Buyer Name'],
        company: buyer['Company'],
        matchScore: matchScore,
        matchReasons: getMatchReasons(deal, buyer)
      });
    }
  });

  // Sort by match score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return matches.slice(0, 5); // Return top 5 matches
}

/**
 * Calculates match score between deal and buyer
 * @param {Object} deal - Deal object
 * @param {Object} buyer - Buyer object
 * @returns {number} Match score (0-100)
 */
function calculateMatchScore(deal, buyer) {
  let score = 0;
  let factors = 0;

  // 1. ZIP match (40 points)
  const dealZip = String(deal['ZIP'] || '');
  const buyerZips = String(buyer['ZIPs'] || '').split(',').map(z => z.trim());

  if (buyerZips.includes(dealZip)) {
    score += 40;
    factors++;
  } else if (buyerZips.some(z => dealZip.startsWith(z.substring(0, 3)))) {
    score += 20; // Partial match (same area)
    factors++;
  }

  // 2. Strategy match (25 points)
  const dealStrategy = deal['Best Strategy'] || '';
  const buyerStrategy = buyer['Strategy Preference'] || 'Any';

  if (buyerStrategy === 'Any' || buyerStrategy === dealStrategy) {
    score += 25;
    factors++;
  } else if (buyerStrategy === 'Wholesale' && ['Flip', 'Creative'].includes(dealStrategy)) {
    score += 15; // Related strategy
    factors++;
  }

  // 3. Budget match (20 points)
  const dealPrice = parseFloat(deal['Asking Price']) || 0;
  const budgetMin = parseFloat(buyer['Budget Min']) || 0;
  const budgetMax = parseFloat(buyer['Budget Max']) || 9999999;

  if (dealPrice >= budgetMin && dealPrice <= budgetMax) {
    score += 20;
    factors++;
  } else if (dealPrice >= budgetMin * 0.8 && dealPrice <= budgetMax * 1.2) {
    score += 10; // Close to budget
    factors++;
  }

  // 4. Property type match (10 points)
  const dealPropType = deal['Property Type'] || '';
  const buyerPropTypes = String(buyer['Preferred Property Types'] || '').split(',').map(t => t.trim());

  if (buyerPropTypes.length === 0 || buyerPropTypes.includes(dealPropType) || buyerPropTypes.includes('Any')) {
    score += 10;
    factors++;
  }

  // 5. Risk tolerance match (5 points)
  const dealRisk = parseFloat(deal['Risk Score']) || 50;
  const buyerRiskTolerance = buyer['Risk Tolerance'] || 'Moderate';

  if (buyerRiskTolerance === 'Aggressive' || (buyerRiskTolerance === 'Moderate' && dealRisk < 60) ||
    (buyerRiskTolerance === 'Conservative' && dealRisk < 40)) {
    score += 5;
    factors++;
  }

  // Normalize score if no matches
  if (factors === 0) return 0;

  return Math.min(100, score);
}

/**
 * Gets reasons for match
 */
function getMatchReasons(deal, buyer) {
  const reasons = [];

  const dealZip = String(deal['ZIP'] || '');
  const buyerZips = String(buyer['ZIPs'] || '').split(',').map(z => z.trim());
  if (buyerZips.includes(dealZip)) {
    reasons.push('ZIP match');
  }

  const dealStrategy = deal['Best Strategy'] || '';
  const buyerStrategy = buyer['Strategy Preference'] || 'Any';
  if (buyerStrategy === 'Any' || buyerStrategy === dealStrategy) {
    reasons.push('Strategy match');
  }

  const dealPrice = parseFloat(deal['Asking Price']) || 0;
  const budgetMin = parseFloat(buyer['Budget Min']) || 0;
  const budgetMax = parseFloat(buyer['Budget Max']) || 9999999;
  if (dealPrice >= budgetMin && dealPrice <= budgetMax) {
    reasons.push('Budget match');
  }

  return reasons.join(', ');
}

/**
 * Suggests disposition action based on matches
 */
function suggestDispoAction(deal, matches) {
  if (matches.length === 0) {
    return 'No matches - expand buyer network';
  }

  const topMatch = matches[0];
  const verdict = deal['Verdict'] || '';

  if (topMatch.matchScore >= 80) {
    return `Send to ${topMatch.buyerName} immediately`;
  } else if (topMatch.matchScore >= 60) {
    return `Contact ${topMatch.buyerName} with details`;
  } else if (topMatch.matchScore >= 40) {
    return `Blast to ${matches.length} potential buyers`;
  } else {
    return 'Hold for better buyer match';
  }
}

// ============================================================
// BUYER DATABASE MANAGEMENT
// ============================================================

/**
 * Adds a new buyer to the database
 * @param {Object} buyerData - Buyer information
 */
function addBuyer(buyerData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);

  if (!buyerSheet) {
    return { error: 'Buyer database sheet not found' };
  }

  // Generate buyer ID
  const buyerId = 'B' + Date.now().toString(36).toUpperCase();

  const newRow = [
    buyerId,
    buyerData.name || '',
    buyerData.company || '',
    buyerData.email || '',
    buyerData.phone || '',
    buyerData.zips || '',
    buyerData.strategy || 'Any',
    buyerData.budgetMin || 0,
    buyerData.budgetMax || 500000,
    buyerData.minDSCR || '',
    buyerData.yieldPref || '',
    buyerData.riskTolerance || 'Moderate',
    buyerData.propTypes || 'SFR',
    'Yes', // Active
    '', // Last Deal Date
    0,  // Total Deals Closed
    buyerData.notes || ''
  ];

  const lastRow = buyerSheet.getLastRow();
  buyerSheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

  logEvent('BUYER', `Added buyer: ${buyerData.name} (${buyerId})`);
  return { success: true, buyerId: buyerId };
}

/**
 * Updates a buyer's information
 * @param {string} buyerId - Buyer ID
 * @param {Object} updates - Fields to update
 */
function updateBuyer(buyerId, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);

  if (!buyerSheet) {
    return { error: 'Buyer database sheet not found' };
  }

  const data = buyerSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === buyerId) {
      Object.entries(updates).forEach(([key, value]) => {
        const colIndex = headers.indexOf(key);
        if (colIndex >= 0) {
          buyerSheet.getRange(i + 1, colIndex + 1).setValue(value);
        }
      });
      logEvent('BUYER', `Updated buyer: ${buyerId}`);
      return { success: true };
    }
  }

  return { error: 'Buyer not found' };
}

/**
 * Gets buyer by ID
 * @param {string} buyerId - Buyer ID
 * @returns {Object} Buyer data
 */
function getBuyer(buyerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);

  if (!buyerSheet || buyerSheet.getLastRow() <= 1) {
    return { error: 'No buyers found' };
  }

  const data = buyerSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === buyerId) {
      const buyer = {};
      headers.forEach((h, j) => buyer[h] = data[i][j]);
      return buyer;
    }
  }

  return { error: 'Buyer not found' };
}

/**
 * Gets all active buyers
 * @returns {Array} Array of active buyers
 */
function getActiveBuyers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);

  if (!buyerSheet || buyerSheet.getLastRow() <= 1) {
    return [];
  }

  return loadBuyerDatabase(buyerSheet);
}

// ============================================================
// MATCH RETRIEVAL (FOR UI)
// ============================================================

/**
 * Gets matches for a specific deal (for HTML UI)
 */
function getMatchesForDeal(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matchingSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_MATCHING);

  if (!matchingSheet || matchingSheet.getLastRow() <= 1) {
    return { error: 'No matching data' };
  }

  const data = matchingSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dealId) {
      const match = {};
      headers.forEach((h, j) => match[h] = data[i][j]);
      return match;
    }
  }

  return { error: 'Deal not found in matches' };
}

/**
 * Gets buyer statistics
 * @returns {Object} Buyer statistics
 */
function getBuyerStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);

  if (!buyerSheet || buyerSheet.getLastRow() <= 1) {
    return { totalBuyers: 0, activeBuyers: 0 };
  }

  const data = buyerSheet.getDataRange().getValues();
  const headers = data[0];
  const activeCol = headers.indexOf('Active');

  let totalBuyers = data.length - 1;
  let activeBuyers = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][activeCol] === 'Yes' || data[i][activeCol] === true) {
      activeBuyers++;
    }
  }

  // Strategy breakdown
  const strategyCol = headers.indexOf('Strategy Preference');
  const strategies = {};
  for (let i = 1; i < data.length; i++) {
    const strategy = data[i][strategyCol] || 'Unknown';
    strategies[strategy] = (strategies[strategy] || 0) + 1;
  }

  return {
    totalBuyers: totalBuyers,
    activeBuyers: activeBuyers,
    byStrategy: strategies
  };
}

/**
 * Records a deal assignment to buyer
 */
function assignDealToBuyer(dealId, buyerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const offersSheet = ss.getSheetByName(CONFIG.SHEETS.OFFERS);
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.BUYER_DATABASE);

  if (!offersSheet) return { error: 'Offers sheet not found' };

  // Update offers sheet
  const offersData = offersSheet.getDataRange().getValues();
  const offersHeaders = offersData[0];
  const buyerAssignedCol = offersHeaders.indexOf('Buyer Assigned') + 1;

  for (let i = 1; i < offersData.length; i++) {
    if (offersData[i][0] === dealId) {
      if (buyerAssignedCol > 0) {
        offersSheet.getRange(i + 1, buyerAssignedCol).setValue(buyerId);
      }
      break;
    }
  }

  // Update buyer's deal count
  if (buyerSheet) {
    const buyerData = buyerSheet.getDataRange().getValues();
    const buyerHeaders = buyerData[0];
    const dealsCol = buyerHeaders.indexOf('Total Deals Closed') + 1;
    const lastDealCol = buyerHeaders.indexOf('Last Deal Date') + 1;

    for (let i = 1; i < buyerData.length; i++) {
      if (buyerData[i][0] === buyerId) {
        if (dealsCol > 0) {
          const currentDeals = parseInt(buyerData[i][dealsCol - 1]) || 0;
          buyerSheet.getRange(i + 1, dealsCol).setValue(currentDeals + 1);
        }
        if (lastDealCol > 0) {
          buyerSheet.getRange(i + 1, lastDealCol).setValue(new Date());
        }
        break;
      }
    }
  }

  logEvent('BUYER', `Deal ${dealId} assigned to buyer ${buyerId}`);
  return { success: true };
}
