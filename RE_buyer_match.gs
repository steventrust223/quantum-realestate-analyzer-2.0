/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RE_buyer_match.gs - Buyer Matching Engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Matches properties to buyers based on:
 * - Geographic preferences (ZIP, City)
 * - Price range
 * - Strategy preference
 * - Property type
 * - Repair level tolerance
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BUYER MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Matches buyers for all properties
 */
function RE_matchAllBuyers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PROPERTIES);
  const buyerMatchSheet = ss.getSheetByName(SHEET_NAMES.BUYER_MATCH);

  if (!masterSheet || !buyerMatchSheet) return;

  RE_logInfo('RE_matchAllBuyers', 'Matching buyers to properties');

  const data = masterSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  let matched = 0;

  for (let i = 1; i < data.length; i++) {
    const propertyId = RE_getValueByHeader(data[i], 'Property ID', headerMap);
    const address = RE_getValueByHeader(data[i], 'Address', headerMap);
    const zip = RE_getValueByHeader(data[i], 'ZIP', headerMap);
    const arv = RE_toNumber(RE_getValueByHeader(data[i], 'Estimated ARV', headerMap));
    const exitStrategy = RE_getValueByHeader(data[i], 'Exit Strategy', headerMap);
    const repairEstimate = RE_toNumber(RE_getValueByHeader(data[i], 'Chosen Repair Budget', headerMap));

    const matchResult = RE_findBuyersForProperty({
      propertyId: propertyId,
      address: address,
      zip: zip,
      arv: arv,
      exitStrategy: exitStrategy,
      repairEstimate: repairEstimate
    });

    // Write to BUYER_MATCH
    RE_writeToBuyerMatch(matchResult);

    matched++;
  }

  RE_logSuccess('RE_matchAllBuyers', `Matched ${matched} properties to buyers`);
}

/**
 * Finds matching buyers for a property
 *
 * @param {Object} params - Property parameters
 * @returns {Object} Buyer match result
 */
function RE_findBuyersForProperty(params) {
  const {
    propertyId,
    address,
    zip,
    arv,
    exitStrategy,
    repairEstimate,
    propertyType = 'SFR'
  } = params;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyersSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DB);

  if (!buyersSheet || buyersSheet.getLastRow() <= 1) {
    return {
      propertyId: propertyId,
      address: address,
      zip: zip,
      areaType: 'Unknown',
      arv: arv,
      arvRange: RE_getARVRange(arv),
      exitStrategy: exitStrategy,
      matchedBuyerIds: '',
      bestBuyerId: '',
      bestBuyerName: 'No buyers in database',
      matchScore: 0,
      criteriaMet: 'N/A',
      notes: 'Add buyers to BUYERS_DB sheet',
      lastMatched: new Date()
    };
  }

  const buyersData = buyersSheet.getDataRange().getValues();
  const buyersHeaderMap = RE_createHeaderMap(buyersData[0]);

  const matches = [];
  const minMatchScore = RE_getSetting('buyer.match.minScore', 60);

  // Evaluate each buyer
  for (let i = 1; i < buyersData.length; i++) {
    const buyerId = RE_getValueByHeader(buyersData[i], 'Buyer ID', buyersHeaderMap);
    const buyerName = RE_getValueByHeader(buyersData[i], 'Name', buyersHeaderMap);
    const buyerStatus = RE_getValueByHeader(buyersData[i], 'Status', buyersHeaderMap);

    // Skip inactive buyers
    if (buyerStatus !== 'Active') continue;

    const matchScore = RE_calculateBuyerMatchScore({
      buyerRow: buyersData[i],
      buyerHeaderMap: buyersHeaderMap,
      zip: zip,
      arv: arv,
      exitStrategy: exitStrategy,
      repairEstimate: repairEstimate,
      propertyType: propertyType
    });

    if (matchScore.score >= minMatchScore) {
      matches.push({
        buyerId: buyerId,
        buyerName: buyerName,
        score: matchScore.score,
        criteriaMet: matchScore.criteriaMet
      });
    }
  }

  // Sort matches by score
  matches.sort((a, b) => b.score - a.score);

  // Prepare result
  let bestBuyerId = '';
  let bestBuyerName = 'No match found';
  let matchScore = 0;
  let criteriaMet = '';
  let matchedBuyerIds = '';

  if (matches.length > 0) {
    bestBuyerId = matches[0].buyerId;
    bestBuyerName = matches[0].buyerName;
    matchScore = matches[0].score;
    criteriaMet = matches[0].criteriaMet;
    matchedBuyerIds = matches.map(m => m.buyerId).join(', ');
  }

  return {
    propertyId: propertyId,
    address: address,
    zip: zip,
    areaType: 'Urban', // Could be enhanced
    arv: arv,
    arvRange: RE_getARVRange(arv),
    exitStrategy: exitStrategy,
    matchedBuyerIds: matchedBuyerIds,
    bestBuyerId: bestBuyerId,
    bestBuyerName: bestBuyerName,
    matchScore: matchScore,
    criteriaMet: criteriaMet,
    notes: matches.length > 1 ? `${matches.length} buyers matched` : '',
    lastMatched: new Date()
  };
}

/**
 * Calculates match score between a buyer and property
 *
 * @param {Object} params - Match parameters
 * @returns {Object} Match score and criteria
 */
function RE_calculateBuyerMatchScore(params) {
  const {
    buyerRow,
    buyerHeaderMap,
    zip,
    arv,
    exitStrategy,
    repairEstimate,
    propertyType
  } = params;

  let score = 0;
  const criteriaMet = [];

  // Factor 1: Geographic match (0-40 points)
  const buyerZips = RE_getValueByHeader(buyerRow, 'Markets (ZIPs)', buyerHeaderMap) || '';
  const buyerCities = RE_getValueByHeader(buyerRow, 'Markets (Cities)', buyerHeaderMap) || '';

  if (buyerZips.includes(zip)) {
    score += 40;
    criteriaMet.push('ZIP match');
  } else if (buyerZips !== '') {
    // Check if buyer has other ZIPs in same area (partial match)
    score += 10;
  }

  // Factor 2: Price range match (0-30 points)
  const buyerPriceLow = RE_toNumber(RE_getValueByHeader(buyerRow, 'Price Range Low', buyerHeaderMap));
  const buyerPriceHigh = RE_toNumber(RE_getValueByHeader(buyerRow, 'Price Range High', buyerHeaderMap));

  if (arv >= buyerPriceLow && arv <= buyerPriceHigh) {
    score += 30;
    criteriaMet.push('Price range');
  } else if (arv >= buyerPriceLow * 0.8 && arv <= buyerPriceHigh * 1.2) {
    score += 15; // Close to range
  }

  // Factor 3: Strategy match (0-20 points)
  const buyerStrategy = RE_getValueByHeader(buyerRow, 'Strategy Preference', buyerHeaderMap) || '';

  if (buyerStrategy.toLowerCase().includes(exitStrategy.toLowerCase())) {
    score += 20;
    criteriaMet.push('Strategy match');
  }

  // Factor 4: Property type match (0-10 points)
  const buyerPropertyTypes = RE_getValueByHeader(buyerRow, 'Property Types', buyerHeaderMap) || '';

  if (buyerPropertyTypes.toLowerCase().includes(propertyType.toLowerCase())) {
    score += 10;
    criteriaMet.push('Property type');
  }

  // Factor 5: Repair level tolerance (0-10 points)
  const buyerMaxRepair = RE_getValueByHeader(buyerRow, 'Max Repair Level', buyerHeaderMap) || 'Full';

  if (repairEstimate < 15000 && buyerMaxRepair === 'Light') {
    score += 10;
    criteriaMet.push('Repair level OK');
  } else if (repairEstimate < 40000 && (buyerMaxRepair === 'Full' || buyerMaxRepair === 'Light')) {
    score += 10;
    criteriaMet.push('Repair level OK');
  } else if (buyerMaxRepair === 'Full') {
    score += 5;
  }

  // Bonus: Buyer rating (0-10 points)
  const buyerRating = RE_getValueByHeader(buyerRow, 'Rating', buyerHeaderMap) || 'B';
  if (buyerRating === 'A') {
    score += 10;
  } else if (buyerRating === 'B') {
    score += 5;
  }

  return {
    score: Math.min(score, 100), // Cap at 100
    criteriaMet: criteriaMet.join(', ')
  };
}

/**
 * Writes buyer match to BUYER_MATCH sheet
 *
 * @param {Object} matchResult - Match result
 */
function RE_writeToBuyerMatch(matchResult) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matchSheet = ss.getSheetByName(SHEET_NAMES.BUYER_MATCH);

  if (!matchSheet) return;

  const existingRow = RE_findRowByValue(matchSheet, 'Property ID', matchResult.propertyId);

  const rowData = [
    matchResult.propertyId,
    matchResult.address,
    matchResult.zip,
    matchResult.areaType,
    matchResult.arv,
    matchResult.arvRange,
    matchResult.exitStrategy,
    matchResult.matchedBuyerIds,
    matchResult.bestBuyerId,
    matchResult.bestBuyerName,
    matchResult.matchScore,
    matchResult.criteriaMet,
    matchResult.notes,
    matchResult.lastMatched
  ];

  if (existingRow > 0) {
    matchSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    matchSheet.appendRow(rowData);
  }
}

/**
 * Gets ARV range label
 *
 * @param {number} arv - ARV value
 * @returns {string} Range label
 */
function RE_getARVRange(arv) {
  if (arv < 150000) return 'Under 150K';
  if (arv < 250000) return '150K-250K';
  if (arv < 400000) return '250K-400K';
  if (arv < 600000) return '400K-600K';
  return 'Over 600K';
}

/**
 * Gets all matched buyers for a property
 *
 * @param {string} propertyId - Property ID
 * @returns {Array} Array of buyer objects
 */
function RE_getMatchedBuyers(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matchSheet = ss.getSheetByName(SHEET_NAMES.BUYER_MATCH);

  if (!matchSheet) return [];

  const data = matchSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);

  for (let i = 1; i < data.length; i++) {
    if (RE_getValueByHeader(data[i], 'Property ID', headerMap) === propertyId) {
      const buyerIdsStr = RE_getValueByHeader(data[i], 'Matched Buyer IDs', headerMap);
      const buyerIds = buyerIdsStr ? buyerIdsStr.split(',').map(id => id.trim()) : [];

      // Get buyer details
      return RE_getBuyerDetails(buyerIds);
    }
  }

  return [];
}

/**
 * Gets buyer details for an array of buyer IDs
 *
 * @param {Array} buyerIds - Array of buyer IDs
 * @returns {Array} Array of buyer detail objects
 */
function RE_getBuyerDetails(buyerIds) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyersSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DB);

  if (!buyersSheet || buyerIds.length === 0) return [];

  const data = buyersSheet.getDataRange().getValues();
  const headerMap = RE_createHeaderMap(data[0]);
  const buyers = [];

  for (let i = 1; i < data.length; i++) {
    const buyerId = RE_getValueByHeader(data[i], 'Buyer ID', headerMap);

    if (buyerIds.includes(buyerId)) {
      buyers.push({
        id: buyerId,
        name: RE_getValueByHeader(data[i], 'Name', headerMap),
        company: RE_getValueByHeader(data[i], 'Company', headerMap),
        phone: RE_getValueByHeader(data[i], 'Phone', headerMap),
        email: RE_getValueByHeader(data[i], 'Email', headerMap),
        rating: RE_getValueByHeader(data[i], 'Rating', headerMap)
      });
    }
  }

  return buyers;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUYER MANAGEMENT (STUB FUNCTIONS FOR CRM INTEGRATION)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends property to buyer (STUB - would integrate with email/CRM)
 *
 * @param {string} propertyId - Property ID
 * @param {string} buyerId - Buyer ID
 * @returns {boolean} Success status
 */
function RE_sendPropertyToBuyer(propertyId, buyerId) {
  // STUB: In production, this would:
  // 1. Get property details
  // 2. Get buyer contact info
  // 3. Send via email/SMS using MailApp or external API
  // 4. Log the activity

  RE_logInfo('RE_sendPropertyToBuyer',
    `STUB: Would send property ${propertyId} to buyer ${buyerId}`);

  // For now, just return true
  return true;
}

/**
 * Sends blast email to all matched buyers (STUB)
 *
 * @param {string} propertyId - Property ID
 * @returns {number} Number of buyers notified
 */
function RE_blastToMatchedBuyers(propertyId) {
  // STUB: Would send to all matched buyers

  const buyers = RE_getMatchedBuyers(propertyId);

  RE_logInfo('RE_blastToMatchedBuyers',
    `STUB: Would send to ${buyers.length} buyers for property ${propertyId}`);

  return buyers.length;
}
