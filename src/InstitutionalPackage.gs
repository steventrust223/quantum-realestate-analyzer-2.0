/**
 * Quantum Real Estate Analyzer - Institutional Deal Package Generator
 * Creates investor-ready deal packages with completeness scoring and AI summaries
 */

// ============================================================
// MAIN PACKAGE BUILDER
// ============================================================

/**
 * Builds institutional deal packages for qualifying deals
 */
function buildInstitutionalPackages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const packageSheet = ss.getSheetByName(CONFIG.SHEETS.INST_DEAL_PACKAGE);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;
  if (!packageSheet) return;

  const enabled = getSetting('inst_auto_package_creation', 'true') === 'true';
  if (!enabled) {
    logEvent('INST', 'Auto package creation disabled');
    return;
  }

  logEvent('INST', 'Building institutional deal packages');

  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);

  const packageHeaders = CONFIG.COLUMNS.INST_DEAL_PACKAGE;
  const packageRows = [];
  let packageId = 1;

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[colMap['Deal ID']];
    if (!dealId) continue;

    const deal = {};
    headers.forEach((h, j) => deal[h] = row[j]);

    const instScore = parseFloat(deal['Institutional Grade Score']) || 0;
    const instGrade = deal['Institutional Grade'] || 'NOT INSTITUTIONAL';

    // Package deals with at least minimal institutional interest
    if (instScore < 30 && instGrade === 'NOT INSTITUTIONAL') continue;

    const pkg = buildDealPackage_(deal, packageId++);
    packageRows.push(pkg);
  }

  // Write to package sheet
  if (packageSheet.getLastRow() > 1) {
    packageSheet.getRange(2, 1, packageSheet.getLastRow() - 1, packageHeaders.length).clearContent();
  }
  if (packageRows.length > 0) {
    packageSheet.getRange(2, 1, packageRows.length, packageHeaders.length).setValues(packageRows);
  }

  logEvent('INST', `Deal packages built: ${packageRows.length} packages`);
}

// ============================================================
// INDIVIDUAL PACKAGE BUILDER
// ============================================================

/**
 * Builds a single deal package row
 */
function buildDealPackage_(deal, seqId) {
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  const arv = parseFloat(deal['ARV']) || askingPrice * 1.2;
  const offerPrice = parseFloat(deal['Offer Price Target'] || deal['MAO Final']) || askingPrice * 0.85;
  const rehabMid = ((parseFloat(deal['Est Rehab Low']) || 0) + (parseFloat(deal['Est Rehab High']) || 0)) / 2;
  const monthlyRent = estimateMonthlyRent_(deal);
  const annualRent = monthlyRent * 12;
  const totalInvestment = offerPrice + rehabMid;

  // Financial metrics
  const operatingExpenses = annualRent * 0.40;
  const noi = annualRent - operatingExpenses;
  const capRate = totalInvestment > 0 ? noi / totalInvestment : 0;
  const cashOnCash = (totalInvestment * 0.25) > 0 ? noi / (totalInvestment * 0.25) : 0;
  const equitySpread = arv - totalInvestment;
  const projectedProfit = arv - totalInvestment - (arv * 0.08); // Rough sell costs

  // Scores from existing data
  const instGrade = deal['Institutional Grade'] || 'NOT INSTITUTIONAL';
  const instScore = parseFloat(deal['Institutional Grade Score']) || 0;
  const neighborhoodGrade = deal['Neighborhood Grade'] || 'C';
  const landlordFriendlyScore = parseFloat(deal['Landlord Friendly Score']) || 50;
  const velocityScore = parseFloat(deal['Sales Velocity Score']) || 50;
  const marketHeat = parseFloat(deal['Market Heat Score']) || 50;
  const riskScore = parseFloat(deal['Risk Score']) || 50;

  // Risk rating
  let riskRating = 'Moderate';
  if (riskScore >= 70) riskRating = 'High';
  else if (riskScore >= 50) riskRating = 'Moderate';
  else riskRating = 'Low';

  // Compute AI summary
  const instResult = {
    grade: instGrade,
    capRate: capRate,
    neighborhoodGrade: neighborhoodGrade
  };
  const aiSummary = generateInvestorSummary(deal, instResult);

  // Value drivers and risk flags
  const valueDrivers = buildValueDrivers_(deal, capRate, rehabMid, neighborhoodGrade);
  const riskFlags = buildRiskFlags_(deal, riskScore, rehabMid, capRate);

  // Package completeness score
  const completeness = computePackageCompleteness_(deal);
  const packageReady = completeness >= (CONFIG.INSTITUTIONAL.DEFAULTS.packageCompletenessThreshold * 100)
    ? 'Yes' : 'Incomplete';

  // Listing URL
  const listingUrl = deal['Listing URL'] || '';

  return [
    'PKG' + String(seqId).padStart(5, '0'),
    deal['Deal ID'] || '',
    deal['Address'] || '',
    deal['City'] || '',
    deal['State'] || '',
    deal['ZIP'] || '',
    deal['Property Type'] || 'SFR',
    deal['Best Strategy'] || 'TBD',
    deal['Beds'] || '',
    deal['Baths'] || '',
    deal['Sqft'] || '',
    deal['Lot Size'] || '',
    deal['Year Built'] || '',
    '', // Occupancy
    '', // Lease Status
    monthlyRent,
    annualRent,
    askingPrice,
    offerPrice,
    rehabMid,
    totalInvestment,
    arv,
    arv, // Estimated Exit Value
    Math.round(capRate * 1000) / 1000,
    Math.round(cashOnCash * 1000) / 1000,
    Math.round(equitySpread),
    Math.round(projectedProfit),
    neighborhoodGrade,
    '', // School Rating
    '', // Crime Indicator
    landlordFriendlyScore,
    marketHeat,
    velocityScore,
    instGrade,
    deal['Portfolio Group Suggestion'] || '',
    deal['Portfolio Eligible'] || 'No',
    deal['Verdict'] || '',
    riskRating,
    valueDrivers,
    riskFlags,
    listingUrl,
    '', // Photo Link
    '', // Map Link
    '', // Analyst Notes
    aiSummary,
    completeness,
    packageReady,
    deal['Disposition Status'] || 'Draft'
  ];
}

// ============================================================
// PACKAGE COMPLETENESS SCORING
// ============================================================

/**
 * Computes package completeness as a percentage
 * Checks how many required data points are present
 */
function computePackageCompleteness_(deal) {
  const requiredFields = [
    { field: 'Address', weight: 10 },
    { field: 'City', weight: 5 },
    { field: 'State', weight: 5 },
    { field: 'ZIP', weight: 5 },
    { field: 'Asking Price', weight: 10, numeric: true },
    { field: 'ARV', weight: 10, numeric: true },
    { field: 'Beds', weight: 5, numeric: true },
    { field: 'Baths', weight: 5, numeric: true },
    { field: 'Sqft', weight: 5, numeric: true },
    { field: 'Year Built', weight: 5, numeric: true },
    { field: 'Property Type', weight: 5 },
    { field: 'Best Strategy', weight: 5 },
    { field: 'Est Rehab Low', weight: 5, numeric: true },
    { field: 'Offer Price Target', weight: 5, numeric: true },
    { field: 'Listing URL', weight: 5 },
    { field: 'Institutional Grade', weight: 5 },
    { field: 'Verdict', weight: 5 }
  ];

  let totalWeight = 0;
  let earnedWeight = 0;

  requiredFields.forEach(f => {
    totalWeight += f.weight;
    const val = deal[f.field];
    if (val !== undefined && val !== null && val !== '') {
      if (f.numeric) {
        if (parseFloat(val) > 0) earnedWeight += f.weight;
      } else {
        if (String(val).trim().length > 0 && val !== 'TBD') earnedWeight += f.weight;
      }
    }
  });

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}

// ============================================================
// VALUE DRIVERS & RISK FLAGS
// ============================================================

function buildValueDrivers_(deal, capRate, rehabMid, neighborhoodGrade) {
  const drivers = [];
  if (capRate >= 0.08) drivers.push('Strong yield');
  if (capRate >= 0.06 && capRate < 0.08) drivers.push('Solid cap rate');
  if (rehabMid <= 10000) drivers.push('Turnkey/minimal rehab');
  if (neighborhoodGrade === 'A') drivers.push('Premium location');
  if (neighborhoodGrade === 'B') drivers.push('Stable neighborhood');

  const propType = deal['Property Type'] || '';
  if (['Duplex', 'Triplex', 'Fourplex'].includes(propType)) drivers.push('Multi-unit upside');
  if (propType === 'SFR') drivers.push('Simple asset class');

  const velocity = parseFloat(deal['Sales Velocity Score']) || 0;
  if (velocity >= 70) drivers.push('Fast market');

  return drivers.slice(0, 3).join('; ') || 'Standard profile';
}

function buildRiskFlags_(deal, riskScore, rehabMid, capRate) {
  const flags = [];
  if (riskScore >= 70) flags.push('Elevated exit risk');
  if (rehabMid > 40000) flags.push('Heavy rehab');
  if (capRate < 0.05 && capRate > 0) flags.push('Thin cap rate');

  const propType = deal['Property Type'] || '';
  if (propType === 'Mobile Home') flags.push('Asset type risk');
  if (propType === 'Land') flags.push('Non-standard asset');

  const dom = parseFloat(deal['DOM']) || 0;
  if (dom > 90) flags.push('Stale listing');

  return flags.slice(0, 3).join('; ') || 'Standard risk profile';
}

// ============================================================
// PACKAGE QUERIES (FOR UI)
// ============================================================

/**
 * Gets all packages with summary (for HTML UI)
 */
function getInstitutionalPackages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INST_DEAL_PACKAGE);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const packages = [];

  for (let i = 1; i < data.length; i++) {
    const pkg = {};
    headers.forEach((h, j) => pkg[h] = data[i][j]);
    packages.push(pkg);
  }

  return packages;
}

/**
 * Gets a single package by Deal ID
 */
function getPackageByDealId(dealId) {
  const packages = getInstitutionalPackages();
  return packages.find(p => p['Deal ID'] === dealId) || null;
}

/**
 * Gets packages filtered by buyer preferences
 * @param {Object} buyerPrefs - Buyer preference filters
 */
function getPackagesForBuyer(buyerPrefs) {
  const packages = getInstitutionalPackages();

  return packages.filter(pkg => {
    // Price filter
    if (buyerPrefs.minPrice && parseFloat(pkg['Asking Price']) < buyerPrefs.minPrice) return false;
    if (buyerPrefs.maxPrice && parseFloat(pkg['Asking Price']) > buyerPrefs.maxPrice) return false;

    // ZIP filter
    if (buyerPrefs.zips && buyerPrefs.zips.length > 0) {
      if (!buyerPrefs.zips.includes(String(pkg['ZIP']))) return false;
    }

    // Cap rate filter
    if (buyerPrefs.minCapRate && parseFloat(pkg['Cap Rate']) < buyerPrefs.minCapRate) return false;

    // Institutional grade filter
    if (buyerPrefs.minGrade) {
      const gradeOrder = ['INSTITUTIONAL PRIME', 'INSTITUTIONAL FIT', 'LOCAL LANDLORD FIT', 'PORTFOLIO ONLY', 'NOT INSTITUTIONAL'];
      const pkgGradeIdx = gradeOrder.indexOf(pkg['Institutional Grade']);
      const minGradeIdx = gradeOrder.indexOf(buyerPrefs.minGrade);
      if (pkgGradeIdx > minGradeIdx) return false;
    }

    // Package readiness filter
    if (buyerPrefs.readyOnly && pkg['Package Ready?'] !== 'Yes') return false;

    return true;
  });
}

/**
 * Gets incomplete packages that need attention
 */
function getIncompletePackages() {
  return getInstitutionalPackages().filter(pkg => {
    const completeness = parseFloat(pkg['Package Completeness Score']) || 0;
    return completeness < (CONFIG.INSTITUTIONAL.DEFAULTS.packageCompletenessThreshold * 100);
  });
}
