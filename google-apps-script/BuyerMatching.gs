/**
 * Buyer Matching System
 * Intelligent matching of properties to buyers based on criteria
 */

/**
 * Find matching buyers for a property
 */
function findMatchingBuyers(propertyAddress, propertyDetails) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyersSheet = ss.getSheetByName('Buyers');

  if (!buyersSheet) {
    throw new Error('Buyers sheet not found');
  }

  const buyersData = buyersSheet.getDataRange().getValues();
  const matches = [];

  // Property details needed for matching
  const price = propertyDetails.price || propertyDetails.maxOffer || 0;
  const dealType = propertyDetails.dealType || 'Wholesaling';
  const address = propertyAddress.toLowerCase();

  // Extract location info (city, zip, etc.)
  const locationInfo = extractLocationInfo(address);

  // Score and match each buyer
  for (let i = 1; i < buyersData.length; i++) {
    const buyer = {
      id: buyersData[i][0],
      dateAdded: buyersData[i][1],
      name: buyersData[i][2],
      phone: buyersData[i][3],
      email: buyersData[i][4],
      investmentType: buyersData[i][5],
      maxBudget: buyersData[i][6],
      preferredAreas: buyersData[i][7],
      cashVerified: buyersData[i][8],
      active: buyersData[i][9]
    };

    // Only match active buyers
    if (buyer.active !== true && buyer.active !== 'Yes') {
      continue;
    }

    // Calculate match score
    const matchScore = calculateBuyerMatchScore(buyer, price, dealType, locationInfo);

    if (matchScore.totalScore >= 50) { // Minimum 50% match
      matches.push({
        buyer: buyer,
        matchScore: matchScore.totalScore,
        matchReasons: matchScore.reasons,
        confidence: matchScore.confidence
      });
    }
  }

  // Sort by match score (highest first)
  matches.sort((a, b) => b.matchScore - a.matchScore);

  // Log the matching
  logActivity('Buyer Matching', `Found ${matches.length} matches for ${propertyAddress}`);

  return matches;
}

/**
 * Calculate buyer match score
 */
function calculateBuyerMatchScore(buyer, price, dealType, locationInfo) {
  let score = 0;
  const reasons = [];
  const maxScore = 100;

  // 1. Budget Match (30 points)
  if (buyer.maxBudget > 0) {
    if (price <= buyer.maxBudget) {
      const budgetFit = ((buyer.maxBudget - price) / buyer.maxBudget) * 30;
      score += Math.min(30, budgetFit);
      reasons.push(`Budget fits: $${formatNumber(price)} within $${formatNumber(buyer.maxBudget)} max`);
    } else {
      const overBudget = ((price - buyer.maxBudget) / buyer.maxBudget) * 100;
      if (overBudget <= 10) { // Within 10% over budget
        score += 15;
        reasons.push(`Slightly over budget (${Math.round(overBudget)}%)`);
      }
    }
  } else {
    score += 15; // No budget specified, give partial credit
  }

  // 2. Investment Type Match (25 points)
  if (buyer.investmentType) {
    if (dealType.toLowerCase().includes(buyer.investmentType.toLowerCase()) ||
        buyer.investmentType.toLowerCase().includes(dealType.toLowerCase())) {
      score += 25;
      reasons.push(`Investment type matches: ${buyer.investmentType}`);
    } else if (buyer.investmentType === 'Wholesale' && dealType === 'Wholesaling') {
      score += 25;
      reasons.push('Wholesale buyer - perfect match');
    }
  } else {
    score += 10; // No type specified, give partial credit
  }

  // 3. Location Match (25 points)
  if (buyer.preferredAreas && buyer.preferredAreas.trim() !== '') {
    const areaMatch = checkLocationMatch(buyer.preferredAreas, locationInfo);
    if (areaMatch.isMatch) {
      score += 25;
      reasons.push(`Location match: ${areaMatch.matchedArea}`);
    } else if (areaMatch.isPartialMatch) {
      score += 12;
      reasons.push(`Partial location match: ${areaMatch.matchedArea}`);
    }
  } else {
    score += 12; // No preference specified, give partial credit
  }

  // 4. Cash Verified Bonus (10 points)
  if (buyer.cashVerified === 'Yes' || buyer.cashVerified === true) {
    score += 10;
    reasons.push('Cash verified - ready to close');
  }

  // 5. Recency Bonus (10 points)
  const daysSinceAdded = daysBetween(new Date(), new Date(buyer.dateAdded));
  if (daysSinceAdded <= 30) {
    score += 10;
    reasons.push('Recently added buyer (active)');
  } else if (daysSinceAdded <= 90) {
    score += 5;
    reasons.push('Added within last 90 days');
  }

  // Calculate confidence level
  let confidence = 'Medium';
  if (score >= 80) confidence = 'Very High';
  else if (score >= 70) confidence = 'High';
  else if (score >= 50) confidence = 'Medium';
  else confidence = 'Low';

  return {
    totalScore: Math.round(score),
    maxScore: maxScore,
    reasons: reasons,
    confidence: confidence
  };
}

/**
 * Extract location information from address
 */
function extractLocationInfo(address) {
  const info = {
    full: address,
    city: '',
    state: '',
    zip: '',
    keywords: []
  };

  // Extract ZIP code (5 digits)
  const zipMatch = address.match(/\b\d{5}\b/);
  if (zipMatch) {
    info.zip = zipMatch[0];
  }

  // Extract state abbreviation (2 capital letters)
  const stateMatch = address.match(/\b[A-Z]{2}\b/);
  if (stateMatch) {
    info.state = stateMatch[0];
  }

  // Extract city (word before state/zip)
  const cityMatch = address.match(/,\s*([^,]+)\s*,?\s*[A-Z]{2}/i);
  if (cityMatch) {
    info.city = cityMatch[1].trim().toLowerCase();
  }

  // Create keywords for matching
  info.keywords = address.toLowerCase().split(/[\s,]+/).filter(k => k.length > 2);

  return info;
}

/**
 * Check if location matches buyer preferences
 */
function checkLocationMatch(preferredAreas, locationInfo) {
  const preferences = preferredAreas.toLowerCase();
  const result = {
    isMatch: false,
    isPartialMatch: false,
    matchedArea: ''
  };

  // Check ZIP code match
  if (locationInfo.zip && preferences.includes(locationInfo.zip)) {
    result.isMatch = true;
    result.matchedArea = `ZIP ${locationInfo.zip}`;
    return result;
  }

  // Check city match
  if (locationInfo.city && preferences.includes(locationInfo.city)) {
    result.isMatch = true;
    result.matchedArea = locationInfo.city;
    return result;
  }

  // Check state match (partial)
  if (locationInfo.state && preferences.includes(locationInfo.state.toLowerCase())) {
    result.isPartialMatch = true;
    result.matchedArea = locationInfo.state;
    return result;
  }

  // Check keyword matches
  for (let keyword of locationInfo.keywords) {
    if (preferences.includes(keyword)) {
      result.isPartialMatch = true;
      result.matchedArea = keyword;
      return result;
    }
  }

  return result;
}

/**
 * Auto-match and notify buyers when new property added
 */
function autoMatchAndNotifyBuyers(propertyAddress, propertyDetails) {
  const matches = findMatchingBuyers(propertyAddress, propertyDetails);

  if (matches.length === 0) {
    Logger.log('No matching buyers found for: ' + propertyAddress);
    return {
      matchCount: 0,
      notificationsSent: 0
    };
  }

  // Notify top matches
  const topMatches = matches.slice(0, 10); // Top 10 matches
  let notificationsSent = 0;

  topMatches.forEach(match => {
    const success = sendBuyerMatchNotification(match.buyer, propertyDetails, match.matchScore, match.matchReasons);
    if (success) {
      notificationsSent++;
    }
  });

  // Log to buyer matching history
  logBuyerMatches(propertyAddress, matches);

  return {
    matchCount: matches.length,
    notificationsSent: notificationsSent,
    topMatches: topMatches
  };
}

/**
 * Send match notification to buyer
 */
function sendBuyerMatchNotification(buyer, propertyDetails, matchScore, matchReasons) {
  const companyName = getSetting('Company Name') || 'Quantum RE Analyzer';

  const subject = `🎯 Perfect Match: ${propertyDetails.address}`;

  let reasonsText = '';
  matchReasons.forEach((reason, index) => {
    reasonsText += `   ${index + 1}. ${reason}\n`;
  });

  const body = `Hi ${buyer.name},

Great news! We have a property that's a ${matchScore}% match for your criteria!

📍 Property Address: ${propertyDetails.address}
💰 Price: $${formatNumber(propertyDetails.price || propertyDetails.maxOffer)}
📊 Deal Type: ${propertyDetails.dealType || 'Wholesaling'}
${propertyDetails.arv ? `🏠 ARV: $${formatNumber(propertyDetails.arv)}` : ''}
${propertyDetails.repairCosts ? `🔧 Repairs: $${formatNumber(propertyDetails.repairCosts)}` : ''}
${propertyDetails.profitPotential ? `💵 Profit Potential: $${formatNumber(propertyDetails.profitPotential)}` : ''}

Why this is a match for you:
${reasonsText}

⭐ Match Score: ${matchScore}% - This property fits your criteria perfectly!

This is a fresh opportunity and won't last long. Interested buyers are already looking at it.

📞 Call us NOW to get full details and schedule a showing!
📧 Or reply to this email

Best regards,
${companyName} Team

---
Property ID: ${propertyDetails.propertyId || 'TBD'}
Your Buyer ID: ${buyer.id}
`;

  try {
    MailApp.sendEmail({
      to: buyer.email,
      subject: subject,
      body: body
    });

    logActivity('Match Notification Sent', `${buyer.name} - ${propertyDetails.address} (${matchScore}%)`);
    return true;
  } catch (error) {
    Logger.log(`Error sending match notification to ${buyer.email}: ` + error.message);
    return false;
  }
}

/**
 * Log buyer matches to history
 */
function logBuyerMatches(propertyAddress, matches) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let matchHistorySheet = ss.getSheetByName('Buyer Match History');

  if (!matchHistorySheet) {
    matchHistorySheet = ss.insertSheet('Buyer Match History');
    const headers = [
      'Date', 'Property Address', 'Total Matches', 'Top Match Buyer',
      'Top Match Score', 'Notified', 'Match Details'
    ];
    matchHistorySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    matchHistorySheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  const topMatch = matches.length > 0 ? matches[0] : null;

  matchHistorySheet.appendRow([
    new Date(),
    propertyAddress,
    matches.length,
    topMatch ? topMatch.buyer.name : 'None',
    topMatch ? topMatch.matchScore + '%' : 'N/A',
    Math.min(matches.length, 10), // Number notified
    topMatch ? topMatch.matchReasons.join('; ') : 'No matches'
  ]);
}

/**
 * Show buyer matching results in UI
 */
function showBuyerMatches(propertyAddress, propertyDetails) {
  const matches = findMatchingBuyers(propertyAddress, propertyDetails);

  if (matches.length === 0) {
    SpreadsheetApp.getUi().alert('Buyer Matching',
      'No matching buyers found for this property.\n\nTry adjusting the price or property details.',
      SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  let message = `
BUYER MATCHING RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Property: ${propertyAddress}
Price: $${formatNumber(propertyDetails.price || propertyDetails.maxOffer)}

Found ${matches.length} matching buyers!

TOP 5 MATCHES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const topFive = matches.slice(0, 5);

  topFive.forEach((match, index) => {
    message += `
${index + 1}. ${match.buyer.name} - ${match.matchScore}% Match (${match.confidence})
   📧 ${match.buyer.email}
   📱 ${match.buyer.phone}
   💰 Max Budget: $${formatNumber(match.buyer.maxBudget)}
   🎯 Type: ${match.buyer.investmentType}
   ✅ Verified: ${match.buyer.cashVerified}

   Match Reasons:
`;
    match.matchReasons.forEach(reason => {
      message += `      • ${reason}\n`;
    });
  });

  message += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Would you like to notify these buyers?
  `;

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Buyer Matching Results', message, ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    const result = autoMatchAndNotifyBuyers(propertyAddress, propertyDetails);
    ui.alert('Notifications Sent',
      `✅ Sent notifications to ${result.notificationsSent} buyers!\n\nCheck your email sent folder to confirm.`,
      ui.ButtonSet.OK);
  }
}

/**
 * Match property from analysis
 */
function matchPropertyToBuyers(analysisResult) {
  showBuyerMatches(analysisResult.address, {
    address: analysisResult.address,
    price: analysisResult.maxOffer,
    arv: analysisResult.arv,
    repairCosts: analysisResult.repairCosts,
    profitPotential: analysisResult.profitPotential,
    dealType: 'Wholesaling',
    propertyId: 'PROP-' + generateId()
  });
}

/**
 * Bulk match all active deals to buyers
 */
function bulkMatchActiveDeals() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Bulk Match Active Deals',
    'This will match all active deals to your buyer database.\n\nContinue?',
    ui.ButtonSet.YES_NO);

  if (response !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dealsSheet = ss.getSheetByName('Active Deals');

  if (!dealsSheet) {
    ui.alert('Error', 'Active Deals sheet not found.', ui.ButtonSet.OK);
    return;
  }

  const dealsData = dealsSheet.getDataRange().getValues();
  let totalMatches = 0;
  let dealsProcessed = 0;

  for (let i = 1; i < dealsData.length; i++) {
    const dealStatus = dealsData[i][4];

    // Only match available deals
    if (dealStatus === 'Marketed' || dealStatus === 'New' || dealStatus === 'Under Contract') {
      const propertyDetails = {
        address: dealsData[i][2],
        dealType: dealsData[i][3],
        price: dealsData[i][6],
        maxOffer: dealsData[i][6]
      };

      const matches = findMatchingBuyers(propertyDetails.address, propertyDetails);
      totalMatches += matches.length;
      dealsProcessed++;
    }
  }

  ui.alert('Bulk Matching Complete',
    `Processed ${dealsProcessed} deals\nFound ${totalMatches} total buyer matches\n\nCheck Buyer Match History sheet for details.`,
    ui.ButtonSet.OK);
}

/**
 * Get buyer matching statistics
 */
function getBuyerMatchingStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const historySheet = ss.getSheetByName('Buyer Match History');

  if (!historySheet) {
    return {
      totalMatches: 0,
      averageMatchesPerProperty: 0,
      totalNotifications: 0
    };
  }

  const data = historySheet.getDataRange().getValues();
  let totalMatches = 0;
  let totalNotifications = 0;
  const propertiesMatched = data.length - 1; // Exclude header

  for (let i = 1; i < data.length; i++) {
    totalMatches += Number(data[i][2]) || 0;
    totalNotifications += Number(data[i][5]) || 0;
  }

  return {
    totalMatches: totalMatches,
    propertiesMatched: propertiesMatched,
    averageMatchesPerProperty: propertiesMatched > 0 ? Math.round(totalMatches / propertiesMatched) : 0,
    totalNotifications: totalNotifications
  };
}
