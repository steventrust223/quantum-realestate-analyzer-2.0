/**
 * Quantum Real Estate Analyzer - Institutional Buyer Buy Box Matching Engine
 * Advanced matching of deals against institutional buyer criteria
 */

// ============================================================
// MAIN BUY BOX MATCHING
// ============================================================

/**
 * Generates buy box matches for all qualifying deals
 */
function generateBuyerMatches() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUYERS);
  const matcherSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUY_BOX_MATCHER);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;
  if (!buyerSheet || buyerSheet.getLastRow() <= 1) {
    logEvent('INST', 'No institutional buyers in database');
    return;
  }
  if (!matcherSheet) return;

  const enabled = getSetting('inst_buyer_matching_enabled', 'true') === 'true';
  if (!enabled) {
    logEvent('INST', 'Buyer matching disabled');
    return;
  }

  logEvent('INST', 'Running institutional buy box matching');

  // Load buyers
  const buyers = loadInstitutionalBuyers_(buyerSheet);

  // Load deals
  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  const masterColMap = {};
  masterHeaders.forEach((h, i) => masterColMap[h] = i);

  const matchResults = [];
  let matchId = 1;

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[masterColMap['Deal ID']];
    if (!dealId) continue;

    // Build deal object
    const deal = {};
    masterHeaders.forEach((h, j) => deal[h] = row[j]);

    // Skip deals that aren't institutional grade at all
    const instScore = parseFloat(deal['Institutional Grade Score']) || 0;
    if (instScore < 25) continue;

    // Match against each buyer
    buyers.forEach(buyer => {
      const matchResult = computeBuyBoxMatch_(deal, buyer);

      if (matchResult.score > 0) {
        const instGrade = deal['Institutional Grade'] || 'NOT INSTITUTIONAL';
        const portfolioEligible = deal['Portfolio Eligible'] || 'No';
        const dispositionPriority = deal['Disposition Priority'] || 'REVIEW MANUALLY';
        const rent = estimateMonthlyRent_(deal);
        const rehabMid = ((parseFloat(deal['Est Rehab Low']) || 0) + (parseFloat(deal['Est Rehab High']) || 0)) / 2;

        matchResults.push([
          'M' + String(matchId++).padStart(5, '0'),
          dealId,
          deal['Address'] || '',
          deal['City'] || '',
          deal['State'] || '',
          deal['ZIP'] || '',
          buyer.buyerId,
          buyer.buyerName,
          buyer.buyerType,
          deal['Best Strategy'] || 'TBD',
          deal['Asking Price'] || '',
          deal['Offer Price Target'] || deal['MAO Final'] || '',
          rent,
          deal['Cap Rate'] || '',
          deal['Cash-on-Cash Return'] || '',
          deal['Beds'] || '',
          deal['Baths'] || '',
          deal['Sqft'] || '',
          deal['Year Built'] || '',
          deal['Repair Complexity Tier'] || '',
          '', // Occupancy
          deal['Neighborhood Grade'] || '',
          rehabMid,
          deal['Verdict'] || '',
          instGrade,
          portfolioEligible,
          matchResult.score,
          matchResult.reason,
          matchResult.matchFlags.join(', '),
          matchResult.disqualFlags.join(', '),
          dispositionPriority,
          matchResult.recommendedAction,
          matchResult.score >= 60 ? 'Yes' : 'No',
          'No', // Sent?
          '', // Sent Date
          'Not Sent', // Response Status
          '' // Notes
        ]);
      }
    });
  }

  // Sort by match score descending
  matchResults.sort((a, b) => b[26] - a[26]);

  // Write to matcher sheet
  const matcherHeaders = CONFIG.COLUMNS.INST_BUY_BOX_MATCHER;
  if (matcherSheet.getLastRow() > 1) {
    matcherSheet.getRange(2, 1, matcherSheet.getLastRow() - 1, matcherHeaders.length).clearContent();
  }
  if (matchResults.length > 0) {
    matcherSheet.getRange(2, 1, matchResults.length, matcherHeaders.length).setValues(matchResults);
  }

  // Update best match buyer in Master DB
  updateBestMatchBuyers_(masterSheet, matchResults);

  logEvent('INST', `Buy box matching completed: ${matchResults.length} matches generated`);
}

// ============================================================
// BUY BOX MATCH SCORING
// ============================================================

/**
 * Computes buy box match score between a deal and buyer
 * @returns {Object} { score, reason, matchFlags, disqualFlags, recommendedAction }
 */
function computeBuyBoxMatch_(deal, buyer) {
  let score = 0;
  const matchFlags = [];
  const disqualFlags = [];
  let disqualified = false;

  // ── ZIP Match (25 pts) ──
  const dealZip = String(deal['ZIP'] || '').trim();
  const buyerZips = String(buyer.preferredZIPs || '').split(',').map(z => z.trim()).filter(z => z);

  if (buyerZips.length === 0 || buyerZips.includes(dealZip)) {
    score += 25;
    if (buyerZips.includes(dealZip)) matchFlags.push('ZIP match');
  } else if (buyerZips.some(z => dealZip.substring(0, 3) === z.substring(0, 3))) {
    score += 12;
    matchFlags.push('Nearby ZIP');
  } else {
    disqualFlags.push('Outside preferred ZIP');
  }

  // ── Price Range (20 pts) ──
  const dealPrice = parseFloat(deal['Asking Price']) || 0;
  const minPrice = parseFloat(buyer.minPrice) || 0;
  const maxPrice = parseFloat(buyer.maxPrice) || 999999999;

  if (dealPrice >= minPrice && dealPrice <= maxPrice) {
    score += 20;
    matchFlags.push('Price fit');
  } else if (dealPrice >= minPrice * 0.85 && dealPrice <= maxPrice * 1.15) {
    score += 10;
    matchFlags.push('Near price range');
  } else {
    disqualFlags.push('Outside price range');
    disqualified = true;
  }

  // ── Cap Rate (15 pts) ──
  const dealCapRate = parseFloat(deal['Cap Rate']) || 0;
  const minCapRate = parseFloat(buyer.minCapRate) || 0;

  if (minCapRate <= 0 || dealCapRate >= minCapRate) {
    score += 15;
    if (dealCapRate >= minCapRate + 0.02) matchFlags.push('Excellent cap rate fit');
    else matchFlags.push('Cap rate acceptable');
  } else if (dealCapRate >= minCapRate * 0.85) {
    score += 7;
    matchFlags.push('Slightly below target cap rate');
  } else {
    disqualFlags.push('Low cap rate');
  }

  // ── Strategy Match (10 pts) ──
  const dealStrategy = deal['Best Strategy'] || '';
  const buyerStrategy = buyer.preferredStrategy || 'Any';

  if (buyerStrategy === 'Any' || buyerStrategy === dealStrategy) {
    score += 10;
    matchFlags.push('Strategy match');
  } else if (['LTR', 'MTR', 'STR'].includes(dealStrategy) && ['LTR', 'MTR', 'STR', 'Turnkey'].includes(buyerStrategy)) {
    score += 6;
    matchFlags.push('Related rental strategy');
  }

  // ── Rehab Tolerance (8 pts) ──
  const rehabMid = ((parseFloat(deal['Est Rehab Low']) || 0) + (parseFloat(deal['Est Rehab High']) || 0)) / 2;
  const maxRehab = parseFloat(buyer.maxRehab) || 999999;
  const conditionPref = buyer.conditionPreference || 'Any';

  if (rehabMid <= maxRehab) {
    score += 8;
    if (rehabMid <= 10000) matchFlags.push('Minimal rehab');
  } else {
    disqualFlags.push('Exceeds rehab tolerance');
    if (rehabMid > maxRehab * 1.5) disqualified = true;
  }

  // ── Beds/Baths Match (5 pts) ──
  const dealBeds = parseFloat(deal['Beds']) || 0;
  const minBeds = parseFloat(buyer.minBeds) || 0;
  const maxBeds = parseFloat(buyer.maxBeds) || 99;

  if (dealBeds >= minBeds && dealBeds <= maxBeds) {
    score += 5;
  }

  // ── Asset Type Match (5 pts) ──
  const dealPropType = deal['Property Type'] || '';
  const buyerAssetType = buyer.assetType || 'Any';

  if (buyerAssetType === 'Any' || buyerAssetType === 'Mixed' || buyerAssetType === dealPropType) {
    score += 5;
  }

  // ── Occupancy Preference (4 pts) ──
  const occupancyPref = buyer.occupancyPreference || 'Either';
  if (occupancyPref === 'Either') {
    score += 4;
  } else {
    score += 2; // partial credit
  }

  // ── Neighborhood Grade Match (4 pts) ──
  const dealNeighborhood = deal['Neighborhood Grade'] || 'C';
  const buyerNeighborhood = buyer.preferredNeighborhoodGrade || 'Any';

  if (buyerNeighborhood === 'Any' || buyerNeighborhood.includes(dealNeighborhood)) {
    score += 4;
    matchFlags.push('Neighborhood fit');
  }

  // ── Bulk Buyer Bonus (4 pts) ──
  if (buyer.bulkBuyer === 'Yes' && deal['Portfolio Eligible'] === 'Yes') {
    score += 4;
    matchFlags.push('Bulk package fit');
  }

  // Cap score and check disqualification
  if (disqualified) score = Math.min(score, 30);
  score = Math.min(100, Math.max(0, score));

  // Generate human-readable reason
  const reason = generateMatchReason_(score, matchFlags, disqualFlags);

  // Recommended action
  const recommendedAction = determineMatchAction_(score, deal, buyer);

  return { score, reason, matchFlags, disqualFlags, recommendedAction };
}

/**
 * Generates human-readable match reason
 */
function generateMatchReason_(score, matchFlags, disqualFlags) {
  if (score >= 80) {
    return 'Excellent fit: ' + matchFlags.slice(0, 3).join(' + ');
  } else if (score >= 60) {
    const base = 'Strong: ' + matchFlags.slice(0, 2).join(' + ');
    return disqualFlags.length ? base + ' (minor: ' + disqualFlags[0] + ')' : base;
  } else if (score >= 40) {
    return 'Moderate fit: ' + (matchFlags[0] || 'partial alignment') +
      (disqualFlags.length ? ', but ' + disqualFlags[0] : '');
  } else if (score >= 20) {
    return 'Weak fit: ' + (disqualFlags[0] || 'limited alignment');
  } else {
    return 'Not recommended for this buyer';
  }
}

/**
 * Determines recommended action for a match
 */
function determineMatchAction_(score, deal, buyer) {
  const instGrade = deal['Institutional Grade'] || '';

  if (score >= 80 && instGrade.includes('INSTITUTIONAL')) {
    return 'SEND NOW';
  } else if (score >= 60) {
    return 'REVIEW MANUALLY';
  } else if (score >= 40 && deal['Portfolio Eligible'] === 'Yes') {
    return 'HOLD FOR PORTFOLIO';
  } else {
    return 'NOT A FIT';
  }
}

// ============================================================
// BUYER DATA LOADING
// ============================================================

/**
 * Loads institutional buyers from the Institutional Buyers sheet
 */
function loadInstitutionalBuyers_(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const buyers = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const buyerObj = {};
    headers.forEach((h, j) => buyerObj[h] = row[j]);

    // Only include active buyers
    if (buyerObj['Buyer Status'] === 'Inactive' || buyerObj['Buyer Status'] === 'Blacklisted') continue;

    buyers.push({
      buyerId: buyerObj['Buyer ID'] || '',
      buyerName: buyerObj['Buyer Name'] || '',
      buyerType: buyerObj['Buyer Type'] || '',
      company: buyerObj['Company'] || '',
      email: buyerObj['Email'] || '',
      phone: buyerObj['Phone'] || '',
      preferredZIPs: buyerObj['Preferred ZIP Codes'] || '',
      targetState: buyerObj['Target Market State'] || '',
      targetCity: buyerObj['Target Market City'] || '',
      assetType: buyerObj['Asset Type'] || 'Any',
      preferredStrategy: buyerObj['Preferred Strategy'] || 'Any',
      minPrice: buyerObj['Min Price'] || 0,
      maxPrice: buyerObj['Max Price'] || 999999999,
      minBeds: buyerObj['Min Beds'] || 0,
      maxBeds: buyerObj['Max Beds'] || 99,
      minBaths: buyerObj['Min Baths'] || 0,
      maxBaths: buyerObj['Max Baths'] || 99,
      minSqFt: buyerObj['Min Sq Ft'] || 0,
      maxSqFt: buyerObj['Max Sq Ft'] || 999999,
      yearBuiltMin: buyerObj['Year Built Minimum'] || 0,
      conditionPreference: buyerObj['Condition Preference'] || 'Any',
      occupancyPreference: buyerObj['Occupancy Preference'] || 'Either',
      minRent: buyerObj['Min Rent'] || 0,
      minCapRate: buyerObj['Min Cap Rate'] || 0,
      minCashOnCash: buyerObj['Min Cash-on-Cash Return'] || 0,
      maxRehab: buyerObj['Max Rehab Budget'] || 999999,
      preferredNeighborhoodGrade: buyerObj['Preferred Neighborhood Grade'] || 'Any',
      landlordFriendlyOnly: buyerObj['Landlord Friendly Only?'] || 'No',
      wantsTenantOccupied: buyerObj['Wants Tenant Occupied?'] || 'Either',
      wantsVacant: buyerObj['Wants Vacant?'] || 'Either',
      bulkBuyer: buyerObj['Bulk Buyer?'] || 'No',
      minPortfolioSize: buyerObj['Minimum Portfolio Size'] || 0,
      maxPortfolioSize: buyerObj['Maximum Portfolio Size'] || 999,
      acceptsOffMarket: buyerObj['Accepts Off-Market?'] || 'Yes',
      acceptsAssigned: buyerObj['Accepts Assigned Contracts?'] || 'Yes',
      cashBuyer: buyerObj['Cash Buyer?'] || 'Flexible',
      priorityScore: parseFloat(buyerObj['Priority Score']) || 50,
      warmthStatus: buyerObj['Warmth Status'] || 'New',
      reliabilityTier: buyerObj['Buyer Reliability Tier'] || 'NEW'
    });
  }

  return buyers;
}

/**
 * Updates the Best Match Buyer column in Master DB based on match results
 */
function updateBestMatchBuyers_(masterSheet, matchResults) {
  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];
  const dealIdCol = headers.indexOf('Deal ID');
  const bestMatchCol = headers.indexOf('Best Match Buyer');

  if (bestMatchCol < 0 || dealIdCol < 0) return;

  // Group best match per deal
  const bestMatches = {};
  matchResults.forEach(match => {
    const dealId = match[1]; // Deal ID column
    const buyerName = match[7]; // Buyer Name column
    const score = match[26]; // Buy Box Match Score column
    if (!bestMatches[dealId] || score > bestMatches[dealId].score) {
      bestMatches[dealId] = { buyerName, score };
    }
  });

  // Write to Master DB
  for (let i = 1; i < data.length; i++) {
    const dealId = data[i][dealIdCol];
    if (bestMatches[dealId]) {
      masterSheet.getRange(i + 1, bestMatchCol + 1)
        .setValue(`${bestMatches[dealId].buyerName} (${bestMatches[dealId].score})`);
    }
  }
}

// ============================================================
// BUYER RELATIONSHIP INTELLIGENCE
// ============================================================

/**
 * Updates buyer relationship intelligence metrics
 * Calculates Response Rate, Close Rate, Avg Response Time, Reliability Tier
 */
function updateBuyerRelationshipMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyerSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUYERS);
  const dispoSheet = ss.getSheetByName(CONFIG.SHEETS.INST_DISPOSITION_TRACKER);

  if (!buyerSheet || buyerSheet.getLastRow() <= 1) return;
  if (!dispoSheet || dispoSheet.getLastRow() <= 1) return;

  logEvent('INST', 'Updating buyer relationship metrics');

  const buyerData = buyerSheet.getDataRange().getValues();
  const buyerHeaders = buyerData[0];
  const bColMap = {};
  buyerHeaders.forEach((h, i) => bColMap[h] = i + 1);

  const dispoData = dispoSheet.getDataRange().getValues();
  const dispoHeaders = dispoData[0];
  const dColMap = {};
  dispoHeaders.forEach((h, i) => dColMap[h] = i);

  // Aggregate stats per buyer
  const buyerStats = {};
  for (let i = 1; i < dispoData.length; i++) {
    const buyerId = dispoData[i][dColMap['Buyer ID']];
    if (!buyerId) continue;

    if (!buyerStats[buyerId]) {
      buyerStats[buyerId] = { sent: 0, responded: 0, closed: 0, responseTimes: [] };
    }

    const stats = buyerStats[buyerId];
    if (dispoData[i][dColMap['Sent Package?']] === 'Yes') stats.sent++;

    const responseStatus = dispoData[i][dColMap['Response Status']] || '';
    if (['Responded', 'Interested', 'Negotiating', 'Closed'].some(s => responseStatus.includes(s))) {
      stats.responded++;
    }

    if (dispoData[i][dColMap['Closed?']] === 'Yes') stats.closed++;

    // Approximate response time from sent date to last follow-up
    const sentDate = dispoData[i][dColMap['Sent Date']];
    const lastFollowUp = dispoData[i][dColMap['Last Follow-Up']];
    if (sentDate && lastFollowUp && responseStatus !== 'No Contact') {
      const hours = (new Date(lastFollowUp) - new Date(sentDate)) / (1000 * 60 * 60);
      if (hours > 0 && hours < 720) stats.responseTimes.push(hours); // Cap at 30 days
    }
  }

  // Write metrics to buyer sheet
  for (let i = 1; i < buyerData.length; i++) {
    const buyerId = buyerData[i][0];
    const stats = buyerStats[buyerId] || { sent: 0, responded: 0, closed: 0, responseTimes: [] };

    const responseRate = stats.sent > 0 ? stats.responded / stats.sent : 0;
    const closeRate = stats.sent > 0 ? stats.closed / stats.sent : 0;
    const avgResponseTime = stats.responseTimes.length > 0 ?
      stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length : 0;

    // Determine reliability tier
    const tier = determineBuyerReliabilityTier_(responseRate, closeRate);

    if (bColMap['Deals Sent']) buyerSheet.getRange(i + 1, bColMap['Deals Sent']).setValue(stats.sent);
    if (bColMap['Deals Responded']) buyerSheet.getRange(i + 1, bColMap['Deals Responded']).setValue(stats.responded);
    if (bColMap['Deals Closed']) buyerSheet.getRange(i + 1, bColMap['Deals Closed']).setValue(stats.closed);
    if (bColMap['Response Rate']) buyerSheet.getRange(i + 1, bColMap['Response Rate']).setValue(Math.round(responseRate * 100) + '%');
    if (bColMap['Close Rate']) buyerSheet.getRange(i + 1, bColMap['Close Rate']).setValue(Math.round(closeRate * 100) + '%');
    if (bColMap['Avg Response Time (hrs)']) buyerSheet.getRange(i + 1, bColMap['Avg Response Time (hrs)']).setValue(Math.round(avgResponseTime * 10) / 10);
    if (bColMap['Buyer Reliability Tier']) buyerSheet.getRange(i + 1, bColMap['Buyer Reliability Tier']).setValue(tier);
  }

  logEvent('INST', 'Buyer relationship metrics updated');
}

/**
 * Determines buyer reliability tier from metrics
 */
function determineBuyerReliabilityTier_(responseRate, closeRate) {
  const tiers = CONFIG.INSTITUTIONAL.BUYER_RELIABILITY;
  if (closeRate >= tiers.PLATINUM.minCloseRate && responseRate >= tiers.PLATINUM.minResponseRate) return tiers.PLATINUM.label;
  if (closeRate >= tiers.GOLD.minCloseRate && responseRate >= tiers.GOLD.minResponseRate) return tiers.GOLD.label;
  if (closeRate >= tiers.SILVER.minCloseRate && responseRate >= tiers.SILVER.minResponseRate) return tiers.SILVER.label;
  return tiers.BRONZE.label;
}

// ============================================================
// BUYER-SPECIFIC PACKAGING VIEWS
// ============================================================

/**
 * Gets matches filtered for a specific buyer (for UI)
 * @param {string} buyerId - Buyer ID
 * @returns {Array} Array of matched deals for this buyer
 */
function getMatchesForBuyer(buyerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matcherSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUY_BOX_MATCHER);
  if (!matcherSheet || matcherSheet.getLastRow() <= 1) return [];

  const data = matcherSheet.getDataRange().getValues();
  const headers = data[0];
  const buyerIdCol = headers.indexOf('Buyer ID');
  const matches = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][buyerIdCol] === buyerId) {
      const match = {};
      headers.forEach((h, j) => match[h] = data[i][j]);
      matches.push(match);
    }
  }

  return matches.sort((a, b) => (b['Buy Box Match Score'] || 0) - (a['Buy Box Match Score'] || 0));
}

/**
 * Gets top N buyers for a specific deal (for UI)
 */
function getTopBuyersForDeal(dealId, limit) {
  limit = limit || 5;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matcherSheet = ss.getSheetByName(CONFIG.SHEETS.INST_BUY_BOX_MATCHER);
  if (!matcherSheet || matcherSheet.getLastRow() <= 1) return [];

  const data = matcherSheet.getDataRange().getValues();
  const headers = data[0];
  const dealIdCol = headers.indexOf('Deal ID');
  const matches = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][dealIdCol] === dealId) {
      const match = {};
      headers.forEach((h, j) => match[h] = data[i][j]);
      matches.push(match);
    }
  }

  return matches
    .sort((a, b) => (b['Buy Box Match Score'] || 0) - (a['Buy Box Match Score'] || 0))
    .slice(0, limit);
}
