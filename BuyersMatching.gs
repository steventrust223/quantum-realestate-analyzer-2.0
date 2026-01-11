/**
 * Quantum Real Estate Analyzer v2.0
 * Buyers Matching Engine
 *
 * Intelligence matching system:
 * - ZIP code preferences
 * - Strategy alignment (fix-flip, rental, etc.)
 * - Price band matching
 * - Exit speed preferences
 * - Buyer history & reliability
 */

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

/**
 * Match buyers to a specific property
 * @param {string} propertyId - Property ID to match buyers for
 * @return {Array} Array of matched buyers with scores
 */
function matchBuyersToProperty(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);
  const buyersSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DATABASE);
  const matchingSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_MATCHING);

  if (!masterSheet || !buyersSheet || !matchingSheet) {
    throw new Error('Required sheets not found');
  }

  // Get property data
  const property = getPropertyById(propertyId);
  if (!property) {
    throw new Error('Property not found: ' + propertyId);
  }

  // Get all active buyers
  const buyers = getAllActiveBuyers();

  // Score each buyer against this property
  const matches = [];

  buyers.forEach(function(buyer) {
    const matchScore = calculateBuyerMatchScore(property, buyer);

    if (matchScore.totalScore >= getMatchThreshold()) {
      matches.push({
        buyer: buyer,
        property: property,
        scores: matchScore,
        matchQuality: classifyMatchQuality(matchScore.totalScore),
        recommendation: getMatchRecommendation(matchScore.totalScore)
      });
    }
  });

  // Sort by total score (descending)
  matches.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  // Limit to top N buyers
  const maxBuyers = parseInt(getSetting('MAX_BUYERS_TO_SHOW') || 10);
  const topMatches = matches.slice(0, maxBuyers);

  // Save matches to Buyers Matching sheet
  topMatches.forEach(function(match) {
    saveBuyerMatch(match);
  });

  return topMatches;
}

// ============================================
// MATCHING ALGORITHM
// ============================================

/**
 * Calculate comprehensive match score
 * @return {Object} Score breakdown
 */
function calculateBuyerMatchScore(property, buyer) {
  const scores = {
    zipScore: calculateZIPScore(property, buyer),
    strategyScore: calculateStrategyScore(property, buyer),
    priceScore: calculatePriceScore(property, buyer),
    exitSpeedScore: calculateExitSpeedScore(property, buyer),
    historyScore: calculateHistoryScore(buyer),
    reliabilityBonus: buyer.reliabilityScore || 0
  };

  // Weighted total (out of 100)
  const totalScore = Math.round(
    (scores.zipScore * 0.25) +         // 25% weight - Location matters
    (scores.strategyScore * 0.30) +    // 30% weight - Strategy alignment critical
    (scores.priceScore * 0.20) +       // 20% weight - Price fit important
    (scores.exitSpeedScore * 0.15) +   // 15% weight - Timeline alignment
    (scores.historyScore * 0.05) +     // 5% weight - Track record
    (scores.reliabilityBonus * 0.05)   // 5% weight - Reliability bonus
  );

  return {
    ...scores,
    totalScore: Math.min(totalScore, 100)
  };
}

/**
 * Calculate ZIP code match score (1-10)
 */
function calculateZIPScore(property, buyer) {
  const propertyZIP = property.zip || '';
  const buyerPreferredZIPs = buyer.preferredZIPs || '';

  if (!propertyZIP || !buyerPreferredZIPs) return 5;  // Neutral

  // Parse preferred ZIPs (comma-separated list)
  const preferredZIPs = buyerPreferredZIPs.split(',').map(z => z.trim());

  // Exact match
  if (preferredZIPs.includes(propertyZIP)) {
    return 10;
  }

  // Check for ZIP prefix match (same first 3 digits = nearby area)
  const propertyZIPPrefix = propertyZIP.substring(0, 3);
  const hasNearbyMatch = preferredZIPs.some(z => z.substring(0, 3) === propertyZIPPrefix);

  if (hasNearbyMatch) {
    return 7;  // Nearby area, decent match
  }

  // Same state/county match (would need additional logic)
  if (property.city === buyer.preferredCity) {
    return 6;
  }

  return 3;  // No match
}

/**
 * Calculate strategy match score (1-10)
 */
function calculateStrategyScore(property, buyer) {
  const propertyStrategy = property.recommendedStrategy || '';
  const buyerPreferredStrategy = buyer.preferredStrategy || '';

  if (!propertyStrategy || !buyerPreferredStrategy) return 5;

  // Normalize strategy names for comparison
  const normalizedPropertyStrategy = normalizeStrategyName(propertyStrategy);
  const normalizedBuyerStrategy = normalizeStrategyName(buyerPreferredStrategy);

  // Exact match
  if (normalizedPropertyStrategy === normalizedBuyerStrategy) {
    return 10;
  }

  // Compatible strategies
  const compatibilityMap = {
    'wholesale': ['assignment', 'fix-flip', 'rehab'],
    'sub2': ['creative', 'owner-finance', 'rental'],
    'rental': ['buy-hold', 'sub2', 'brrrr'],
    'fix-flip': ['wholesale', 'assignment', 'rehab']
  };

  const compatibleStrategies = compatibilityMap[normalizedPropertyStrategy] || [];

  if (compatibleStrategies.some(s => normalizedBuyerStrategy.includes(s))) {
    return 7;  // Compatible but not exact
  }

  return 4;  // Not a good fit
}

/**
 * Calculate price match score (1-10)
 */
function calculatePriceScore(property, buyer) {
  const propertyPrice = property.recommendedMAO || property.askingPrice || 0;
  const buyerMinPrice = buyer.minPrice || 0;
  const buyerMaxPrice = buyer.maxPrice || Infinity;

  if (propertyPrice === 0) return 5;

  // Within buyer's price range
  if (propertyPrice >= buyerMinPrice && propertyPrice <= buyerMaxPrice) {
    // Calculate position within range
    const range = buyerMaxPrice - buyerMinPrice;
    const position = (propertyPrice - buyerMinPrice) / range;

    // Sweet spot: 40-70% of their max budget
    if (position >= 0.4 && position <= 0.7) {
      return 10;  // Perfect price point
    } else if (position >= 0.2 && position <= 0.9) {
      return 8;  // Good price point
    } else {
      return 6;  // Within range but at extremes
    }
  }

  // Apply tolerance (15% by default)
  const tolerance = parseFloat(getSetting('PRICE_BAND_TOLERANCE') || 15) / 100;
  const toleranceRange = buyerMaxPrice * tolerance;

  if (propertyPrice <= buyerMaxPrice + toleranceRange &&
      propertyPrice >= buyerMinPrice - toleranceRange) {
    return 5;  // Close enough with tolerance
  }

  return 2;  // Outside range
}

/**
 * Calculate exit speed match score (1-10)
 */
function calculateExitSpeedScore(property, buyer) {
  const propertyExitSpeed = estimatePropertyExitSpeed(property);
  const buyerExitPreference = buyer.exitSpeedPreference || 'Medium';

  // Normalize
  const propertySpeed = normalizeExitSpeed(propertyExitSpeed);
  const buyerSpeed = normalizeExitSpeed(buyerExitPreference);

  // Exact match
  if (propertySpeed === buyerSpeed) {
    return 10;
  }

  // Adjacent speeds (e.g., Medium-Fast or Fast-Quick)
  const speedOrder = ['long-hold', 'medium', 'quick-flip'];
  const propIndex = speedOrder.indexOf(propertySpeed);
  const buyerIndex = speedOrder.indexOf(buyerSpeed);

  if (Math.abs(propIndex - buyerIndex) === 1) {
    return 7;  // Adjacent = compatible
  }

  return 4;  // Mismatch
}

/**
 * Calculate buyer history score (1-10)
 */
function calculateHistoryScore(buyer) {
  const dealsCompleted = buyer.dealsCompleted || 0;
  const avgCloseTime = buyer.avgCloseTime || 999;  // Days

  let score = 5;  // Baseline

  // Experience bonus
  if (dealsCompleted >= 10) score += 3;
  else if (dealsCompleted >= 5) score += 2;
  else if (dealsCompleted >= 1) score += 1;

  // Speed bonus
  if (avgCloseTime <= 30) score += 2;
  else if (avgCloseTime <= 45) score += 1;

  return Math.min(score, 10);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get property by ID from Master Database
 */
function getPropertyById(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return null;

  const data = masterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === propertyId) {
      return {
        propertyId: data[i][0],
        address: data[i][3],
        city: data[i][4],
        state: data[i][5],
        zip: data[i][6],
        propertyType: data[i][10],
        askingPrice: data[i][11],
        arv: data[i][20],
        recommendedStrategy: data[i][39],
        recommendedMAO: data[i][31],
        dealClassifier: data[i][38],
        equity: data[i][33],
        velocityScore: data[i][35]
      };
    }
  }

  return null;
}

/**
 * Get all active buyers from Buyers Database
 */
function getAllActiveBuyers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyersSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DATABASE);

  if (!buyersSheet) return [];

  const data = buyersSheet.getDataRange().getValues();
  const buyers = [];

  for (let i = 1; i < data.length; i++) {
    const isActive = data[i][22];  // Active? column

    if (isActive === 'Yes' || isActive === true || isActive === 'TRUE') {
      buyers.push({
        buyerId: data[i][0],
        name: data[i][1],
        company: data[i][2],
        phone: data[i][3],
        email: data[i][4],
        buyerType: data[i][5],
        cashBuyer: data[i][6],
        maxPrice: data[i][7],
        minPrice: data[i][8],
        preferredZIPs: data[i][9],
        preferredStrategy: data[i][10],
        propertyTypePreference: data[i][11],
        exitSpeedPreference: data[i][12],
        rehabLevel: data[i][13],
        proofOfFunds: data[i][14],
        dealsCompleted: data[i][17],
        avgCloseTime: data[i][18],
        reliabilityScore: data[i][19]
      });
    }
  }

  return buyers;
}

/**
 * Estimate property exit speed based on market conditions
 */
function estimatePropertyExitSpeed(property) {
  const velocityScore = property.velocityScore || 5;
  const dealClassifier = property.dealClassifier || '';

  // HOT DEALS exit fast
  if (dealClassifier === '🔥 HOT DEAL') return 'Quick Flip';

  // Use velocity score
  if (velocityScore >= 8) return 'Quick Flip';
  else if (velocityScore >= 5) return 'Medium';
  else return 'Long Hold';
}

/**
 * Normalize strategy names for comparison
 */
function normalizeStrategyName(strategy) {
  const normalized = strategy.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('assignment', 'wholesale')
    .replace('subto', 'sub2')
    .replace('subjectto', 'sub2')
    .replace('wraparound', 'wrap')
    .replace('buyhold', 'rental')
    .replace('fixflip', 'fixflip')
    .replace('str', 'shorttermrental')
    .replace('mtr', 'mediumtermrental')
    .replace('ltr', 'rental');

  return normalized;
}

/**
 * Normalize exit speed
 */
function normalizeExitSpeed(speed) {
  const normalized = speed.toLowerCase();

  if (normalized.includes('quick') || normalized.includes('fast')) return 'quick-flip';
  if (normalized.includes('long') || normalized.includes('hold')) return 'long-hold';
  return 'medium';
}

/**
 * Get match threshold from settings
 */
function getMatchThreshold() {
  return parseInt(getSetting('MATCH_SCORE_THRESHOLD') || 70);
}

/**
 * Classify match quality based on score
 */
function classifyMatchQuality(score) {
  if (score >= 90) return 'PERFECT';
  if (score >= 75) return 'STRONG';
  if (score >= 60) return 'GOOD';
  return 'WEAK';
}

/**
 * Get match recommendation
 */
function getMatchRecommendation(score) {
  if (score >= 90) return 'SEND IMMEDIATELY';
  if (score >= 75) return 'Send';
  if (score >= 60) return 'Monitor';
  return "Don't Send";
}

/**
 * Save buyer match to Buyers Matching sheet
 */
function saveBuyerMatch(match) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matchingSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_MATCHING);

  if (!matchingSheet) return;

  const matchId = generateMatchId();
  const row = [
    matchId,
    new Date(),
    match.property.propertyId,
    match.property.address,
    match.property.zip,
    match.property.propertyType,
    match.property.askingPrice,
    match.property.recommendedStrategy,
    match.buyer.buyerId,
    match.buyer.name,
    match.buyer.email,
    match.buyer.phone,
    match.scores.zipScore >= 7 ? 'Yes' : 'No',
    match.scores.strategyScore >= 7 ? 'Yes' : 'No',
    match.scores.priceScore >= 7 ? 'Yes' : 'No',
    match.scores.exitSpeedScore >= 7 ? 'Yes' : 'No',
    match.scores.zipScore,
    match.scores.strategyScore,
    match.scores.priceScore,
    match.scores.exitSpeedScore,
    match.scores.totalScore,
    match.buyer.preferredZIPs,
    match.buyer.preferredStrategy,
    `$${match.buyer.minPrice} - $${match.buyer.maxPrice}`,
    match.buyer.exitSpeedPreference,
    match.matchQuality,
    match.recommendation,
    'No',  // Sent to Buyer?
    '',  // Sent Date
    '',  // Sent Via
    '',  // Buyer Response
    '',  // Response Date
    '',  // Viewing Scheduled?
    '',  // Buyer Offer Amount
    '',  // Negotiation Status
    '',  // Contract Status
    generateWhyGoodMatch(match),
    `${match.buyer.dealsCompleted || 0} deals, ${match.buyer.avgCloseTime || 'N/A'} day avg close`,
    '1.0',  // Match Algorithm Version
    new Date()
  ];

  matchingSheet.appendRow(row);
}

/**
 * Generate "Why Good Match?" explanation
 */
function generateWhyGoodMatch(match) {
  const reasons = [];

  if (match.scores.zipScore >= 9) {
    reasons.push('Perfect ZIP match');
  } else if (match.scores.zipScore >= 7) {
    reasons.push('Nearby area match');
  }

  if (match.scores.strategyScore >= 9) {
    reasons.push('Strategy perfectly aligned');
  } else if (match.scores.strategyScore >= 7) {
    reasons.push('Compatible strategy');
  }

  if (match.scores.priceScore >= 9) {
    reasons.push('Ideal price point for buyer');
  } else if (match.scores.priceScore >= 7) {
    reasons.push('Within price range');
  }

  if (match.scores.exitSpeedScore >= 9) {
    reasons.push('Exit timeline matches perfectly');
  }

  if (match.buyer.reliabilityScore >= 8) {
    reasons.push('Highly reliable buyer');
  }

  if (match.buyer.dealsCompleted >= 5) {
    reasons.push('Experienced buyer');
  }

  return reasons.join(', ') || 'Good overall match';
}

/**
 * Generate unique match ID
 */
function generateMatchId() {
  return 'MATCH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Match all properties to buyers (run from menu)
 */
function matchAllPropertiesToBuyers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return;

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '🤝 Match All Properties',
    'This will match all active properties to your buyer database.\n\n' +
    'This may take several minutes for large databases.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const data = masterSheet.getDataRange().getValues();
  let matched = 0;
  let totalMatches = 0;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][64];  // Status column
    const classifier = data[i][38];  // Deal Classifier

    // Only match active deals (not Dead)
    if (status !== 'Dead' && classifier !== '❌ PASS') {
      try {
        const propertyId = data[i][0];
        const matches = matchBuyersToProperty(propertyId);
        matched++;
        totalMatches += matches.length;
      } catch (error) {
        Logger.log('Match error for property ' + data[i][0] + ': ' + error);
      }
    }
  }

  ui.alert(
    '✅ Matching Complete',
    `Processed ${matched} properties.\n` +
    `Found ${totalMatches} buyer matches.\n\n` +
    'Check Buyers Matching Engine sheet for results.',
    ui.ButtonSet.OK
  );
}

/**
 * Send deal to matched buyers (via email)
 */
function sendDealToMatchedBuyers(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matchingSheet = ss.getSheetByName(SHEET_NAMES.BUYERS_MATCHING);

  if (!matchingSheet) return;

  const data = matchingSheet.getDataRange().getValues();
  let sent = 0;

  for (let i = 1; i < data.length; i++) {
    const matchPropertyId = data[i][2];  // Property ID
    const recommendation = data[i][26];  // Recommendation
    const alreadySent = data[i][27];  // Sent to Buyer?
    const buyerEmail = data[i][10];

    if (matchPropertyId === propertyId &&
        recommendation === 'SEND IMMEDIATELY' &&
        alreadySent !== 'Yes' &&
        buyerEmail) {

      // Send email to buyer
      const emailSent = sendDealEmailToBuyer(data[i]);

      if (emailSent) {
        matchingSheet.getRange(i + 1, 28).setValue('Yes');  // Mark as sent
        matchingSheet.getRange(i + 1, 29).setValue(new Date());  // Sent date
        matchingSheet.getRange(i + 1, 30).setValue('Email');  // Sent via
        sent++;
      }
    }
  }

  SpreadsheetApp.getUi().alert(
    '📧 Deal Sent',
    `Deal sent to ${sent} matched buyers.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Send email to buyer with deal details
 */
function sendDealEmailToBuyer(matchRow) {
  const buyerEmail = matchRow[10];
  const buyerName = matchRow[9];
  const propertyAddress = matchRow[3];
  const askingPrice = matchRow[6];
  const matchScore = matchRow[20];

  const subject = `🏠 New Deal Match: ${propertyAddress} (${matchScore}% Match)`;
  const body = `
Hi ${buyerName},

We have a new property that matches your buying criteria with a ${matchScore}% match score!

Property: ${propertyAddress}
Price: $${askingPrice}
Match Quality: ${matchRow[25]}

This property matches your:
✓ ${matchRow[12] === 'Yes' ? 'ZIP code preferences' : ''}
✓ ${matchRow[13] === 'Yes' ? 'Investment strategy' : ''}
✓ ${matchRow[14] === 'Yes' ? 'Price range' : ''}
✓ ${matchRow[15] === 'Yes' ? 'Exit speed preferences' : ''}

Interested? Reply to this email or call us to schedule a viewing.

Best regards,
Your Quantum Real Estate Team
`;

  try {
    MailApp.sendEmail(buyerEmail, subject, body);
    return true;
  } catch (error) {
    Logger.log('Email send error: ' + error);
    return false;
  }
}

// ============================================
// UI FUNCTIONS
// ============================================

/**
 * Show buyer preferences manager
 */
function showBuyerPreferences() {
  const html = HtmlService.createHtmlOutput(`
    <h2>Buyer Preferences Manager</h2>
    <p>Edit buyer preferences in the Buyers Database sheet.</p>
    <p>Each buyer should have:</p>
    <ul>
      <li>Preferred ZIP codes (comma-separated)</li>
      <li>Preferred strategy (Wholesale, Rental, Fix-Flip, etc.)</li>
      <li>Price range (Min and Max)</li>
      <li>Exit speed preference (Quick Flip, Medium, Long Hold)</li>
    </ul>
  `)
  .setWidth(500)
  .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(html, 'Buyer Preferences');
}

/**
 * Show add buyer dialog
 */
function showAddBuyerDialog() {
  const html = HtmlService.createHtmlOutput(`
    <h2>Add New Buyer</h2>
    <p>Use the Buyers Database sheet to add a new buyer manually.</p>
    <p>Or import buyers from:</p>
    <ul>
      <li>CompanyHub CRM</li>
      <li>SMS-iT contacts</li>
      <li>CSV file</li>
    </ul>
  `)
  .setWidth(500)
  .setHeight(250);

  SpreadsheetApp.getUi().showModalDialog(html, 'Add Buyer');
}
