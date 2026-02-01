/**
 * Quantum Real Estate Analyzer - Market Data Provider Module
 *
 * P2 FIX: Central market data provider with optional live API support
 * Falls back to estimation logic when API keys not configured.
 * Logs whether API or estimate was used for each data point.
 */

// ============================================================
// MARKET DATA PROVIDER - MAIN INTERFACE
// ============================================================

/**
 * Gets market rent for a property
 * Uses live API if configured, otherwise falls back to estimation
 * @param {Object} deal - Deal object with property details
 * @returns {Object} {value: number, source: 'API'|'ESTIMATE', confidence: number}
 */
function getMarketRent(deal) {
  const apiKey = getSetting('market_data_api_key', '');
  const apiProvider = getSetting('market_data_provider', ''); // 'rentometer', 'zillow', etc.

  // Try API first if configured
  if (apiKey && apiProvider) {
    try {
      const apiResult = fetchMarketRentFromAPI_(deal, apiProvider, apiKey);
      if (apiResult.success) {
        logEvent('MARKET_DATA', `Rent API (${apiProvider}): $${apiResult.value} for ${deal['Address']}`);
        return {
          value: apiResult.value,
          source: 'API',
          provider: apiProvider,
          confidence: apiResult.confidence || 85
        };
      }
    } catch (error) {
      logEvent('MARKET_DATA', `Rent API failed, using estimate: ${error.message}`);
    }
  }

  // Fallback to estimation
  const estimatedRent = estimateMarketRentInternal_(deal);
  logEvent('MARKET_DATA', `Rent ESTIMATE: $${estimatedRent} for ${deal['Address'] || 'unknown'}`);

  return {
    value: estimatedRent,
    source: 'ESTIMATE',
    provider: 'internal',
    confidence: 60
  };
}

/**
 * Gets property taxes for a property
 * Uses live API if configured, otherwise falls back to estimation
 * @param {Object} deal - Deal object
 * @returns {Object} {value: number, source: 'API'|'ESTIMATE', confidence: number}
 */
function getPropertyTaxes(deal) {
  const apiKey = getSetting('market_data_api_key', '');
  const apiProvider = getSetting('market_data_provider', '');

  // Try API first if configured
  if (apiKey && apiProvider) {
    try {
      const apiResult = fetchPropertyTaxesFromAPI_(deal, apiProvider, apiKey);
      if (apiResult.success) {
        logEvent('MARKET_DATA', `Tax API (${apiProvider}): $${apiResult.value}/mo for ${deal['Address']}`);
        return {
          value: apiResult.value,
          source: 'API',
          provider: apiProvider,
          confidence: apiResult.confidence || 90
        };
      }
    } catch (error) {
      logEvent('MARKET_DATA', `Tax API failed, using estimate: ${error.message}`);
    }
  }

  // Fallback to estimation
  const estimatedTax = estimatePropertyTaxesInternal_(deal);
  logEvent('MARKET_DATA', `Tax ESTIMATE: $${estimatedTax}/mo for ${deal['Address'] || 'unknown'}`);

  return {
    value: estimatedTax,
    source: 'ESTIMATE',
    provider: 'internal',
    confidence: 50
  };
}

/**
 * Gets ADR (Average Daily Rate) for STR analysis
 * @param {Object} deal - Deal object
 * @param {number} beds - Number of bedrooms
 * @param {number} baths - Number of bathrooms
 * @returns {Object} {value: number, source: 'API'|'ESTIMATE', confidence: number}
 */
function getADR(deal, beds, baths) {
  const apiKey = getSetting('str_data_api_key', '');
  const apiProvider = getSetting('str_data_provider', ''); // 'airdna', 'mashvisor', etc.

  // Try API first if configured
  if (apiKey && apiProvider) {
    try {
      const apiResult = fetchADRFromAPI_(deal, beds, baths, apiProvider, apiKey);
      if (apiResult.success) {
        logEvent('MARKET_DATA', `ADR API (${apiProvider}): $${apiResult.value} for ${deal['Address']}`);
        return {
          value: apiResult.value,
          source: 'API',
          provider: apiProvider,
          confidence: apiResult.confidence || 80,
          occupancy: apiResult.occupancy || 0.65
        };
      }
    } catch (error) {
      logEvent('MARKET_DATA', `ADR API failed, using estimate: ${error.message}`);
    }
  }

  // Fallback to estimation
  const estimatedADR = estimateADRInternal_(deal, beds, baths);
  logEvent('MARKET_DATA', `ADR ESTIMATE: $${estimatedADR} for ${deal['Address'] || 'unknown'}`);

  return {
    value: estimatedADR,
    source: 'ESTIMATE',
    provider: 'internal',
    confidence: 55
  };
}

/**
 * Gets market data summary for a ZIP code
 * @param {string} zip - ZIP code
 * @param {string} state - State code
 * @returns {Object} Market data summary
 */
function getMarketDataSummary(zip, state) {
  const apiKey = getSetting('market_data_api_key', '');

  if (apiKey) {
    try {
      const apiResult = fetchMarketSummaryFromAPI_(zip, state, apiKey);
      if (apiResult.success) {
        return {
          ...apiResult.data,
          source: 'API'
        };
      }
    } catch (error) {
      logEvent('MARKET_DATA', `Market summary API failed: ${error.message}`);
    }
  }

  // Fallback to proxy estimates
  return {
    medianPrice: getMedianPriceEstimate_(state),
    priceGrowthYoY: getPriceGrowthEstimate_(state),
    daysOnMarket: getDOMEstimate_(state),
    inventoryMonths: getInventoryEstimate_(state),
    source: 'ESTIMATE'
  };
}

// ============================================================
// API FETCH FUNCTIONS (Real implementations)
// ============================================================

/**
 * Fetches market rent from configured API
 * @private
 */
function fetchMarketRentFromAPI_(deal, provider, apiKey) {
  const address = deal['Address'] || '';
  const city = deal['City'] || '';
  const state = deal['State'] || '';
  const zip = deal['ZIP'] || '';
  const beds = parseFloat(deal['Beds']) || 3;
  const baths = parseFloat(deal['Baths']) || 2;

  let url, options;

  if (provider === 'rentometer') {
    url = `https://www.rentometer.com/api/v1/summary?address=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}&state=${state}&zip=${zip}&beds=${beds}&baths=${baths}`;
    options = {
      method: 'get',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      muteHttpExceptions: true
    };
  } else if (provider === 'zillow') {
    // Zillow uses different endpoint structure
    url = `https://api.bridgedataoutput.com/api/v2/zestimates?access_token=${apiKey}&address=${encodeURIComponent(address + ', ' + city + ', ' + state + ' ' + zip)}`;
    options = { method: 'get', muteHttpExceptions: true };
  } else {
    return { success: false, error: 'Unknown provider' };
  }

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    return { success: false, error: `HTTP ${responseCode}` };
  }

  const data = JSON.parse(response.getContentText());

  if (provider === 'rentometer' && data.mean) {
    return { success: true, value: Math.round(data.mean), confidence: data.confidence || 80 };
  }

  if (provider === 'zillow' && data.bundle && data.bundle[0]) {
    const rentZestimate = data.bundle[0].rentZestimate;
    if (rentZestimate) {
      return { success: true, value: Math.round(rentZestimate), confidence: 75 };
    }
  }

  return { success: false, error: 'No rent data in response' };
}

/**
 * Fetches property taxes from configured API
 * @private
 */
function fetchPropertyTaxesFromAPI_(deal, provider, apiKey) {
  // Most providers return annual taxes; we convert to monthly
  const address = deal['Address'] || '';
  const zip = deal['ZIP'] || '';

  // Generic property data API call
  const url = `https://api.bridgedataoutput.com/api/v2/pub/assessments?access_token=${apiKey}&address=${encodeURIComponent(address)}&postalCode=${zip}`;

  const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    return { success: false };
  }

  const data = JSON.parse(response.getContentText());

  if (data.bundle && data.bundle[0] && data.bundle[0].taxAmount) {
    const annualTax = data.bundle[0].taxAmount;
    return { success: true, value: Math.round(annualTax / 12), confidence: 90 };
  }

  return { success: false };
}

/**
 * Fetches ADR from STR data provider
 * @private
 */
function fetchADRFromAPI_(deal, beds, baths, provider, apiKey) {
  const zip = deal['ZIP'] || '';
  const state = deal['State'] || '';

  if (provider === 'airdna') {
    const url = `https://api.airdna.co/v1/market/zipcode/${zip}?access_token=${apiKey}`;

    const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data.adr) {
        return {
          success: true,
          value: Math.round(data.adr),
          confidence: 80,
          occupancy: data.occupancy || 0.65
        };
      }
    }
  }

  return { success: false };
}

/**
 * Fetches market summary from API
 * @private
 */
function fetchMarketSummaryFromAPI_(zip, state, apiKey) {
  // Generic market data endpoint
  const url = `https://api.bridgedataoutput.com/api/v2/pub/markets?access_token=${apiKey}&postalCode=${zip}`;

  try {
    const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data.bundle && data.bundle[0]) {
        return {
          success: true,
          data: {
            medianPrice: data.bundle[0].medianListPrice || 0,
            priceGrowthYoY: data.bundle[0].priceChangeYoY || 0,
            daysOnMarket: data.bundle[0].medianDom || 30,
            inventoryMonths: data.bundle[0].monthsOfSupply || 4
          }
        };
      }
    }
  } catch (e) {
    // Fall through to return failure
  }

  return { success: false };
}

// ============================================================
// ESTIMATION FUNCTIONS (Fallback logic)
// ============================================================

/**
 * Internal market rent estimation
 * @private
 */
function estimateMarketRentInternal_(deal) {
  const beds = parseFloat(deal['Beds']) || 3;
  const baths = parseFloat(deal['Baths']) || 2;
  const sqft = parseFloat(deal['Sqft']) || 1500;

  // Base rent by beds
  const baseRent = { 1: 1000, 2: 1300, 3: 1600, 4: 1900, 5: 2200 };
  let rent = baseRent[Math.min(beds, 5)] || 1600;

  // Adjust for sqft
  if (sqft > 2000) rent *= 1.15;
  else if (sqft < 1200) rent *= 0.9;

  // Adjust by state
  const state = deal['State'] || '';
  const highRentStates = ['CA', 'NY', 'MA', 'WA', 'CO'];
  const lowRentStates = ['OH', 'IN', 'KS', 'OK', 'AR'];

  if (highRentStates.includes(state)) rent *= 1.4;
  if (lowRentStates.includes(state)) rent *= 0.75;

  return Math.round(rent);
}

/**
 * Internal property tax estimation
 * @private
 */
function estimatePropertyTaxesInternal_(deal) {
  const price = parseFloat(deal['Asking Price']) || 0;
  const state = deal['State'] || '';

  // Tax rates vary by state (annual rate)
  const taxRates = {
    'NJ': 0.024, 'IL': 0.022, 'TX': 0.018, 'CT': 0.020,
    'NY': 0.017, 'CA': 0.008, 'FL': 0.010, 'OH': 0.016,
    'PA': 0.015, 'GA': 0.009, 'NC': 0.008, 'AZ': 0.006
  };

  const rate = taxRates[state] || 0.012;
  return Math.round((price * rate) / 12);
}

/**
 * Internal ADR estimation
 * @private
 */
function estimateADRInternal_(deal, beds, baths) {
  // Base ADR by bedroom count
  const baseADR = { 1: 100, 2: 140, 3: 180, 4: 220, 5: 280, 6: 350 };
  let adr = baseADR[Math.min(beds, 6)] || 180;

  // Adjust for location
  const state = deal['State'] || '';
  const premiumStates = ['CA', 'FL', 'HI', 'NY', 'CO', 'TN'];
  if (premiumStates.includes(state)) {
    adr *= 1.3;
  }

  // Adjust for property type
  const propType = deal['Property Type'] || '';
  if (propType === 'Condo') adr *= 0.9;
  if (propType === 'SFR') adr *= 1.1;

  return Math.round(adr);
}

/**
 * Estimates median price for a state
 * @private
 */
function getMedianPriceEstimate_(state) {
  const medianPrices = {
    'CA': 750000, 'NY': 450000, 'TX': 320000, 'FL': 400000,
    'IL': 280000, 'PA': 260000, 'OH': 200000, 'GA': 350000,
    'NC': 340000, 'MI': 220000, 'NJ': 420000, 'VA': 380000,
    'WA': 550000, 'AZ': 420000, 'MA': 520000, 'TN': 340000,
    'IN': 210000, 'MO': 230000, 'MD': 380000, 'CO': 520000
  };
  return medianPrices[state] || 300000;
}

/**
 * Estimates price growth for a state
 * @private
 */
function getPriceGrowthEstimate_(state) {
  const growthRates = {
    'TX': 0.08, 'FL': 0.10, 'AZ': 0.09, 'NC': 0.08, 'TN': 0.09,
    'GA': 0.07, 'ID': 0.12, 'UT': 0.10, 'NV': 0.08,
    'CA': 0.04, 'NY': 0.03, 'IL': 0.02, 'OH': 0.04
  };
  return growthRates[state] || 0.05;
}

/**
 * Estimates DOM for a state
 * @private
 */
function getDOMEstimate_(state) {
  const domEstimates = {
    'TX': 28, 'FL': 32, 'AZ': 30, 'NC': 25, 'TN': 22,
    'CA': 35, 'NY': 45, 'IL': 50, 'OH': 40
  };
  return domEstimates[state] || 35;
}

/**
 * Estimates months of inventory for a state
 * @private
 */
function getInventoryEstimate_(state) {
  const inventoryEstimates = {
    'TX': 2.5, 'FL': 3.0, 'AZ': 2.8, 'NC': 2.2, 'TN': 2.0,
    'CA': 3.5, 'NY': 5.0, 'IL': 4.5, 'OH': 4.0
  };
  return inventoryEstimates[state] || 3.5;
}

// ============================================================
// CONFIGURATION CHECK
// ============================================================

/**
 * Checks if market data APIs are configured
 * @returns {Object} Configuration status
 */
function getMarketDataConfig() {
  return {
    marketDataConfigured: !!getSetting('market_data_api_key', ''),
    marketDataProvider: getSetting('market_data_provider', 'none'),
    strDataConfigured: !!getSetting('str_data_api_key', ''),
    strDataProvider: getSetting('str_data_provider', 'none'),
    usingEstimates: !getSetting('market_data_api_key', '')
  };
}
