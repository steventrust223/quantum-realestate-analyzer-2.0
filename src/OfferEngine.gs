/**
 * Quantum Real Estate Analyzer - Offer Engine Module
 * Generates offers: Cash, Sub2, Wrap, Seller Carry, Lease Option, Hybrid
 */

// ============================================================
// MAIN OFFER GENERATION
// ============================================================

/**
 * Generates offer pack for all deals
 */
function generateOfferPack() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);
  const offersSheet = ss.getSheetByName(CONFIG.SHEETS.OFFERS);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;
  if (!offersSheet) return;

  logEvent('OFFER', 'Generating offer packs');

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  const masterColMap = {};
  masterHeaders.forEach((h, i) => masterColMap[h] = i + 1);

  const offerHeaders = CONFIG.COLUMNS.OFFERS;
  const offerResults = [];

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const dealId = row[masterColMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Build deal object
    const deal = {};
    masterHeaders.forEach((h, j) => deal[h] = row[j]);

    // Generate offer pack
    const offerPack = generateDealOfferPack(deal);
    offerResults.push(offerPack.row);

    // Update Master DB with offer recommendation
    if (masterColMap['Offer Type Recommended']) {
      masterSheet.getRange(i + 1, masterColMap['Offer Type Recommended']).setValue(offerPack.recommended.type);
    }
    if (masterColMap['Offer Price Target']) {
      masterSheet.getRange(i + 1, masterColMap['Offer Price Target']).setValue(offerPack.recommended.price);
    }
    if (masterColMap['Offer Terms Summary']) {
      masterSheet.getRange(i + 1, masterColMap['Offer Terms Summary']).setValue(offerPack.recommended.summary);
    }
    if (masterColMap['Offer Risk Notes']) {
      masterSheet.getRange(i + 1, masterColMap['Offer Risk Notes']).setValue(offerPack.recommended.riskNotes);
    }
  }

  // Write to Offers sheet
  if (offersSheet.getLastRow() > 1) {
    offersSheet.getRange(2, 1, offersSheet.getLastRow() - 1, offerHeaders.length).clearContent();
  }
  if (offerResults.length > 0) {
    offersSheet.getRange(2, 1, offerResults.length, offerHeaders.length).setValues(offerResults);
  }

  logEvent('OFFER', `Offer packs generated: ${offerResults.length} deals`);
}

/**
 * Generates complete offer pack for a single deal
 * @param {Object} deal - Deal object
 * @returns {Object} Offer pack with all offer types
 */
function generateDealOfferPack(deal) {
  const askingPrice = parseFloat(deal['Asking Price']) || 0;
  const arv = parseFloat(deal['ARV']) || askingPrice * 1.2;
  const rehabMid = (parseFloat(deal['Est Rehab Low']) + parseFloat(deal['Est Rehab High'])) / 2 || 20000;
  const bestStrategy = deal['Best Strategy'] || 'Flip';
  const exitRiskTier = deal['Exit Risk Tier'] || 'MOD';

  // Generate each offer type
  const cashOffer = generateCashOffer(deal, askingPrice, arv, rehabMid, exitRiskTier);
  const sub2Offer = generateSub2Offer(deal, askingPrice, arv);
  const wrapOffer = generateWrapOffer(deal, askingPrice, arv);
  const sellerCarryOffer = generateSellerCarryOffer(deal, askingPrice);
  const leaseOptionOffer = generateLeaseOptionOffer(deal, askingPrice, arv);
  const hybridOffer = generateHybridOffer(deal, sub2Offer, wrapOffer, sellerCarryOffer, leaseOptionOffer);

  // Determine best offer based on strategy
  const recommended = determineBestOffer(bestStrategy, cashOffer, sub2Offer, wrapOffer,
    sellerCarryOffer, leaseOptionOffer, hybridOffer);

  // Build row for Offers sheet
  const row = [
    deal['Deal ID'],
    deal['Address'],
    recommended.type,
    recommended.price,
    recommended.summary,
    cashOffer.formatted,
    sub2Offer.formatted,
    wrapOffer.formatted,
    sellerCarryOffer.formatted,
    leaseOptionOffer.formatted,
    hybridOffer.formatted,
    recommended.riskNotes,
    '', // Sent Date
    '', // Response
    '', // Counter Terms
    'Draft', // Status
    '', // Notes
    '', // Contract Sent
    ''  // Buyer Assigned
  ];

  return {
    row: row,
    recommended: recommended,
    cashOffer: cashOffer,
    sub2Offer: sub2Offer,
    wrapOffer: wrapOffer,
    sellerCarryOffer: sellerCarryOffer,
    leaseOptionOffer: leaseOptionOffer,
    hybridOffer: hybridOffer
  };
}

// ============================================================
// CASH OFFER
// ============================================================

/**
 * Generates cash offer
 */
function generateCashOffer(deal, askingPrice, arv, rehabMid, exitRiskTier) {
  const config = CONFIG.STRATEGIES.FLIP;

  // Calculate MAO for flip
  const holdingCost = askingPrice * config.holdingCostMonthly * 4;
  const agentFees = arv * config.agentFees;
  const closingCosts = askingPrice * config.closingCosts;
  const targetProfit = arv * config.targetProfitMargin;

  let mao = arv - rehabMid - holdingCost - agentFees - closingCosts - targetProfit;

  // Adjust for exit risk
  const riskMultiplier = getExitRiskTier(exitRiskTier === 'CRIT' ? 85 :
    exitRiskTier === 'HIGH' ? 65 : exitRiskTier === 'MOD' ? 45 : 25).maoMultiplier;
  mao = mao * riskMultiplier;

  // Round to nearest $1000
  const offerPrice = Math.round(mao / 1000) * 1000;

  // Calculate discount from asking
  const discount = askingPrice > 0 ? ((askingPrice - offerPrice) / askingPrice * 100).toFixed(1) : 0;

  // Risk notes
  const riskNotes = [];
  if (discount > 30) riskNotes.push('Deep discount may be hard to negotiate');
  if (rehabMid > 50000) riskNotes.push('High rehab increases execution risk');
  if (exitRiskTier === 'CRIT' || exitRiskTier === 'HIGH') riskNotes.push('Exit risk elevated');

  return {
    price: offerPrice,
    type: 'Cash',
    terms: 'All cash, quick close',
    discount: discount,
    mao: mao,
    formatted: `$${offerPrice.toLocaleString()} cash (${discount}% below asking)`,
    riskNotes: riskNotes.join('; ') || 'Standard cash offer risk',
    viable: offerPrice > 0 && discount <= 40
  };
}

// ============================================================
// SUB2 OFFER
// ============================================================

/**
 * Generates Subject-To offer
 */
function generateSub2Offer(deal, askingPrice, arv) {
  // Estimate existing mortgage
  const estimatedMortgage = askingPrice * 0.6;
  const monthlyPayment = calculateMortgagePayment(estimatedMortgage, 0.045, 25);

  // Entry cost (back payments + cash to seller)
  const equity = askingPrice - estimatedMortgage;
  const entryCost = Math.max(5000, equity * 0.15);

  // Effective price
  const effectivePrice = entryCost + estimatedMortgage;

  // Monthly cash flow estimate
  const estimatedRent = estimateMarketRent(deal);
  const monthlyCashFlow = estimatedRent - monthlyPayment - (estimatedRent * 0.15);

  // Risk assessment
  const riskNotes = [];
  if (equity / askingPrice < 0.15) riskNotes.push('Low equity position');
  if (monthlyCashFlow < 200) riskNotes.push('Tight cash flow');
  if (equity / askingPrice > 0.50) riskNotes.push('High equity - seller may want cash');

  const viable = equity / askingPrice >= 0.10 && equity / askingPrice <= 0.50 && monthlyCashFlow >= 100;

  return {
    price: entryCost,
    type: 'Sub2',
    terms: `Take over payments of $${monthlyPayment.toFixed(0)}/mo, $${entryCost.toFixed(0)} to seller`,
    formatted: `Sub2: $${entryCost.toLocaleString()} entry + assume $${estimatedMortgage.toLocaleString()} mortgage`,
    mortgageBalance: estimatedMortgage,
    monthlyPayment: monthlyPayment,
    equity: equity,
    cashFlow: monthlyCashFlow,
    riskNotes: riskNotes.join('; ') || 'Standard Sub2 risk - due on sale clause',
    viable: viable
  };
}

// ============================================================
// WRAP OFFER
// ============================================================

/**
 * Generates Wrap mortgage offer
 */
function generateWrapOffer(deal, askingPrice, arv) {
  const estimatedMortgage = askingPrice * 0.6;
  const existingRate = 0.045;
  const existingPayment = calculateMortgagePayment(estimatedMortgage, existingRate, 25);

  // Wrap at higher rate to end buyer
  const wrapRate = existingRate + 0.02;
  const wrapPrice = askingPrice * 1.02; // Small markup
  const wrapDownPayment = wrapPrice * 0.05;
  const wrapLoanAmount = wrapPrice - wrapDownPayment;
  const wrapPayment = calculateMortgagePayment(wrapLoanAmount, wrapRate, 30);

  // Monthly spread
  const monthlySpread = wrapPayment - existingPayment;

  // Risk notes
  const riskNotes = [];
  if (monthlySpread < 200) riskNotes.push('Thin spread');
  if (wrapRate > 0.08) riskNotes.push('High wrap rate may limit buyer pool');

  const viable = monthlySpread >= 200;

  return {
    price: wrapPrice,
    type: 'Wrap',
    terms: `Wrap at ${(wrapRate * 100).toFixed(1)}%, $${wrapDownPayment.toFixed(0)} down from end buyer`,
    formatted: `Wrap: Sell for $${wrapPrice.toLocaleString()} @ ${(wrapRate * 100).toFixed(1)}%, $${monthlySpread.toFixed(0)}/mo spread`,
    wrapRate: wrapRate,
    spread: monthlySpread,
    downPayment: wrapDownPayment,
    riskNotes: riskNotes.join('; ') || 'Wrap requires qualified end buyer',
    viable: viable
  };
}

// ============================================================
// SELLER CARRY OFFER
// ============================================================

/**
 * Generates Seller Carry offer
 */
function generateSellerCarryOffer(deal, askingPrice) {
  const config = CONFIG.STRATEGIES.CREATIVE.sellerCarry;

  const downPayment = askingPrice * 0.10;
  const loanAmount = askingPrice - downPayment;
  const monthlyPayment = calculateMortgagePayment(loanAmount, config.interestRate, config.termYears);

  // Balloon payment after X years
  const balloonBalance = calculateBalloonBalance(loanAmount, config.interestRate,
    config.termYears, config.balloonYears);

  // Cash flow estimate
  const estimatedRent = estimateMarketRent(deal);
  const monthlyCashFlow = estimatedRent - monthlyPayment - (estimatedRent * 0.15);

  // Risk notes
  const riskNotes = [];
  if (monthlyCashFlow < 0) riskNotes.push('Negative cash flow');
  riskNotes.push(`Balloon of $${balloonBalance.toLocaleString()} due in ${config.balloonYears} years`);

  const viable = monthlyCashFlow >= 0;

  return {
    price: askingPrice,
    type: 'Seller Carry',
    terms: `${(config.interestRate * 100)}% for ${config.termYears}yr, ${config.balloonYears}yr balloon, $${downPayment.toFixed(0)} down`,
    formatted: `Seller Carry: $${downPayment.toLocaleString()} down, $${monthlyPayment.toFixed(0)}/mo @ ${(config.interestRate * 100)}%`,
    downPayment: downPayment,
    monthlyPayment: monthlyPayment,
    balloonBalance: balloonBalance,
    cashFlow: monthlyCashFlow,
    riskNotes: riskNotes.join('; '),
    viable: viable
  };
}

/**
 * Calculates balloon balance after X years
 */
function calculateBalloonBalance(principal, annualRate, totalYears, balloonYears) {
  const monthlyRate = annualRate / 12;
  const payment = calculateMortgagePayment(principal, annualRate, totalYears);
  const numPayments = balloonYears * 12;

  let balance = principal;
  for (let i = 0; i < numPayments; i++) {
    const interest = balance * monthlyRate;
    const principalPaid = payment - interest;
    balance -= principalPaid;
  }

  return Math.max(0, balance);
}

// ============================================================
// LEASE OPTION OFFER
// ============================================================

/**
 * Generates Lease Option offer
 */
function generateLeaseOptionOffer(deal, askingPrice, arv) {
  const config = CONFIG.STRATEGIES.CREATIVE.leaseOption;

  const optionFee = askingPrice * config.optionFee;
  const monthlyRent = estimateMarketRent(deal) * 1.10; // Premium for option
  const rentCredit = monthlyRent * config.rentCredit;
  const strikePrice = askingPrice * 1.03; // 3% appreciation
  const termMonths = config.termMonths;

  // Total rent credit accumulated
  const totalRentCredit = rentCredit * termMonths;

  // Potential profit if exercised
  const potentialProfit = arv - strikePrice;

  // Risk notes
  const riskNotes = [];
  if (potentialProfit < 20000) riskNotes.push('Limited upside at exercise');
  riskNotes.push('Tenant-buyer may not qualify to purchase');

  const viable = potentialProfit >= 15000;

  return {
    price: optionFee,
    type: 'Lease Option',
    terms: `$${optionFee.toFixed(0)} option fee, $${monthlyRent.toFixed(0)}/mo rent, $${rentCredit.toFixed(0)}/mo credit, $${strikePrice.toFixed(0)} strike`,
    formatted: `Lease Option: $${optionFee.toLocaleString()} option + $${monthlyRent.toFixed(0)}/mo (${termMonths}mo term)`,
    optionFee: optionFee,
    monthlyRent: monthlyRent,
    rentCredit: rentCredit,
    strikePrice: strikePrice,
    termMonths: termMonths,
    potentialProfit: potentialProfit,
    riskNotes: riskNotes.join('; '),
    viable: viable
  };
}

// ============================================================
// HYBRID OFFER
// ============================================================

/**
 * Generates Hybrid offer combining strategies
 */
function generateHybridOffer(deal, sub2, wrap, sellerCarry, leaseOption) {
  // Try Sub2 + Wrap combination
  if (sub2.viable && wrap.viable) {
    const combinedCashFlow = wrap.spread;
    const entryCost = sub2.price;

    return {
      price: entryCost,
      type: 'Hybrid (Sub2 + Wrap)',
      terms: `Take subject-to, then wrap to end buyer`,
      formatted: `Hybrid: $${entryCost.toLocaleString()} entry, wrap for $${wrap.spread.toFixed(0)}/mo spread`,
      structure: 'Sub2 acquisition + Wrap exit',
      components: ['Sub2', 'Wrap'],
      cashFlow: combinedCashFlow,
      riskNotes: 'Double due-on-sale risk; requires end buyer qualification',
      viable: true
    };
  }

  // Try Seller Carry + Lease Option
  if (sellerCarry.viable && leaseOption.viable) {
    const netCashFlow = leaseOption.monthlyRent - sellerCarry.monthlyPayment;

    return {
      price: sellerCarry.downPayment + leaseOption.optionFee,
      type: 'Hybrid (Carry + LO)',
      terms: `Seller carry purchase, lease option exit`,
      formatted: `Hybrid: Seller Carry + Lease Option, $${netCashFlow.toFixed(0)}/mo net`,
      structure: 'Seller Carry acquisition + Lease Option exit',
      components: ['Seller Carry', 'Lease Option'],
      cashFlow: netCashFlow,
      riskNotes: 'Balloon payment timing risk; tenant-buyer qualification',
      viable: true
    };
  }

  return {
    price: 0,
    type: 'Hybrid',
    terms: 'No strong hybrid combination',
    formatted: 'No viable hybrid structure',
    viable: false,
    riskNotes: 'Individual strategies may be preferable'
  };
}

// ============================================================
// BEST OFFER DETERMINATION
// ============================================================

/**
 * Determines best offer based on strategy and deal characteristics
 */
function determineBestOffer(bestStrategy, cash, sub2, wrap, sellerCarry, leaseOption, hybrid) {
  const offers = [
    { ...cash, score: cash.viable ? 70 : 0 },
    { ...sub2, score: sub2.viable ? 75 : 0 },
    { ...wrap, score: wrap.viable ? 65 : 0 },
    { ...sellerCarry, score: sellerCarry.viable ? 60 : 0 },
    { ...leaseOption, score: leaseOption.viable ? 55 : 0 },
    { ...hybrid, score: hybrid.viable ? 80 : 0 }
  ];

  // Boost score based on best strategy
  if (bestStrategy === 'Flip') {
    offers[0].score += 20; // Cash for flip
  } else if (bestStrategy === 'Creative') {
    offers[1].score += 15; // Sub2
    offers[5].score += 15; // Hybrid
  } else if (bestStrategy === 'LTR' || bestStrategy === 'MTR') {
    offers[1].score += 10; // Sub2 for hold
    offers[3].score += 10; // Seller carry
  }

  // Sort by score
  offers.sort((a, b) => b.score - a.score);

  const best = offers[0];

  return {
    type: best.type,
    price: best.price,
    terms: best.terms,
    summary: best.formatted,
    riskNotes: best.riskNotes,
    score: best.score
  };
}

// ============================================================
// OFFER PACK RETRIEVAL (FOR UI)
// ============================================================

/**
 * Gets offer pack for a specific deal (for HTML UI)
 */
function getOfferPackForDeal(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet) return { error: 'Master sheet not found' };

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('Deal ID')] === dealId) {
      const deal = {};
      headers.forEach((h, j) => deal[h] = data[i][j]);
      return generateDealOfferPack(deal);
    }
  }

  return { error: 'Deal not found' };
}

/**
 * Updates offer status
 */
function updateOfferStatus(dealId, status, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const offersSheet = ss.getSheetByName(CONFIG.SHEETS.OFFERS);

  if (!offersSheet) return { error: 'Offers sheet not found' };

  const data = offersSheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('Status') + 1;
  const notesCol = headers.indexOf('Notes') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dealId) {
      if (statusCol > 0) offersSheet.getRange(i + 1, statusCol).setValue(status);
      if (notesCol > 0 && notes) offersSheet.getRange(i + 1, notesCol).setValue(notes);
      logEvent('OFFER', `Offer status updated: ${dealId} -> ${status}`);
      return { success: true };
    }
  }

  return { error: 'Deal not found in offers' };
}
