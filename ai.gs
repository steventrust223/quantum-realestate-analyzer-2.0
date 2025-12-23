/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * AI Integration Module (ai.gs) - PRODUCTION PATCHED
 * ============================================================================
 *
 * Handles all AI-powered features using OpenAI API:
 * - Strategy recommendations
 * - Repair inference
 * - Seller psychology analysis
 * - Personalized seller messaging
 *
 * PATCH NOTES v2.0.1:
 * - Added circuit breaker pattern for AI resilience
 * - Enhanced JSON parsing with safeParseJSON
 * - Added timeout handling
 * - Better fallback mechanisms
 * - Response schema validation
 */

// =============================================================================
// CORE AI FUNCTIONS
// =============================================================================

/**
 * Makes a request to OpenAI API with circuit breaker protection
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System instructions
 * @returns {Object} API response or null
 */
function callOpenAI(prompt, systemPrompt = 'You are a real estate investment expert.') {
  // Check circuit breaker
  if (CircuitBreakerState.isOpen('AI')) {
    logWarning('AI', 'Circuit breaker OPEN - skipping AI call');
    return null;
  }

  const apiKey = CONFIG.API_KEYS.OPENAI_API_KEY || getConfigProperty('OPENAI_API_KEY');

  if (!apiKey) {
    logWarning('AI', 'OpenAI API key not configured');
    return null;
  }

  if (isStagingMode()) {
    Logger.log('[STAGING] Would call OpenAI API');
    return null;
  }

  try {
    incrementApiCounter();

    const payload = {
      model: CONFIG.OPENAI.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: CONFIG.OPENAI.MAX_TOKENS,
      temperature: CONFIG.OPENAI.TEMPERATURE,
      response_format: { type: 'json_object' }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(CONFIG.API_ENDPOINTS.OPENAI, options);
    const code = response.getResponseCode();

    if (code !== 200) {
      CircuitBreakerState.recordFailure('AI');
      logError('AI', new Error(`API returned ${code}`), response.getContentText());
      return null;
    }

    // Success - record it
    CircuitBreakerState.recordSuccess('AI');

    const data = safeParseJSON(response.getContentText(), null);
    if (!data || !data.choices || !data.choices[0]) {
      logWarning('AI', 'Invalid OpenAI response structure');
      return null;
    }

    const content = data.choices[0].message.content;
    logInfo('AI', 'OpenAI request successful');

    // Parse the JSON content
    const parsed = safeParseJSON(content, null);
    if (parsed) {
      return parsed;
    }

    logWarning('AI', 'Failed to parse AI JSON response');
    return { raw: content };

  } catch (e) {
    CircuitBreakerState.recordFailure('AI');
    logError('AI', e, 'OpenAI API call failed');
    return null;
  }
}

/**
 * Tests the AI connection
 * @returns {Object} Test result
 */
function testAIConnection() {
  try {
    // Reset circuit breaker for test
    CircuitBreakerState.reset('AI');

    const result = callOpenAI(
      'Return a simple JSON: {"status": "ok", "message": "AI connection successful"}',
      'Return only valid JSON.'
    );

    if (result && result.status === 'ok') {
      showToast('AI connection successful!', 'AI Test');
      return { success: true, message: 'Connected' };
    } else {
      showToast('AI connection failed', 'AI Test');
      return { success: false, message: 'Invalid response' };
    }
  } catch (e) {
    showToast('AI connection failed: ' + e.message, 'Error');
    return { success: false, message: e.message };
  }
}

// =============================================================================
// STRATEGY RECOMMENDATION
// =============================================================================

/**
 * Gets AI-powered strategy recommendation for a lead
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Pre-calculated values (ARV, repairs, etc.)
 * @returns {Object} AI recommendation or default fallback
 */
function getAIStrategyRecommendation(lead, calculations) {
  if (!isFeatureEnabled('AI Strategy Recommendations')) {
    return getDefaultStrategyRecommendation(lead, calculations);
  }

  // Check cache first
  const cached = getCachedAIResult(lead['Lead ID'], 'strategy');
  if (cached) {
    return cached;
  }

  // Build property data string
  const propertyData = formatPropertyDataForAI(lead, calculations);

  // Replace placeholder in prompt template
  const prompt = AI_PROMPTS.STRATEGY_RECOMMENDATION
    .replace('{{PROPERTY_DATA}}', propertyData);

  const result = callOpenAI(prompt);

  if (!result) {
    return getDefaultStrategyRecommendation(lead, calculations);
  }

  // Validate response schema
  const requiredFields = ['strategy', 'confidence', 'dealClassifier'];
  if (!validateJsonSchema(result, requiredFields)) {
    logWarning('AI', 'Invalid strategy recommendation schema');
    return getDefaultStrategyRecommendation(lead, calculations);
  }

  const recommendation = {
    strategy: sanitizeStrategy(result.strategy),
    confidence: Math.min(100, Math.max(0, safeParseNumber(result.confidence, 50))),
    reasoning: truncateText(result.reasoning || '', 500),
    alternateStrategies: Array.isArray(result.alternateStrategies) ?
      result.alternateStrategies.slice(0, 3).map(sanitizeStrategy) : [],
    riskFactors: Array.isArray(result.riskFactors) ?
      result.riskFactors.slice(0, 5) : [],
    dealClassifier: sanitizeDealClassifier(result.dealClassifier)
  };

  // Cache the result
  cacheAIResult(lead['Lead ID'], 'strategy', recommendation);

  return recommendation;
}

/**
 * Sanitizes strategy name to match known strategies
 * @param {string} strategy - Raw strategy name
 * @returns {string} Sanitized strategy name
 */
function sanitizeStrategy(strategy) {
  if (!strategy) return 'Wholesaling (Local)';

  const strategyLower = strategy.toLowerCase();
  const knownStrategies = Object.values(STRATEGIES).map(s => s.name);

  // Try exact match first
  for (const known of knownStrategies) {
    if (known.toLowerCase() === strategyLower) {
      return known;
    }
  }

  // Try partial match
  for (const known of knownStrategies) {
    if (strategyLower.includes(known.toLowerCase().split(' ')[0])) {
      return known;
    }
  }

  return 'Wholesaling (Local)';
}

/**
 * Sanitizes deal classifier to valid values
 * @param {string} classifier - Raw classifier
 * @returns {string} Valid classifier
 */
function sanitizeDealClassifier(classifier) {
  if (!classifier) return 'SOLID DEAL';

  const classifierUpper = classifier.toUpperCase();

  if (classifierUpper.includes('HOT')) return 'HOT DEAL';
  if (classifierUpper.includes('PORTFOLIO')) return 'PORTFOLIO FOUNDATION';
  if (classifierUpper.includes('SOLID')) return 'SOLID DEAL';
  if (classifierUpper.includes('PASS')) return 'PASS';

  return 'SOLID DEAL';
}

/**
 * Formats property data for AI prompt
 */
function formatPropertyDataForAI(lead, calculations) {
  calculations = calculations || {};

  return `
Address: ${lead['Address'] || 'Unknown'}, ${lead['City'] || ''}, ${lead['State'] || ''} ${lead['ZIP'] || ''}
Asking Price: ${formatCurrency(lead['Asking Price'])}
Beds/Baths: ${lead['Beds'] || 'N/A'}/${lead['Baths'] || 'N/A'}
Square Feet: ${lead['SqFt'] || 'Unknown'}
Year Built: ${lead['Year Built'] || 'Unknown'}
Property Type: ${lead['Property Type'] || 'Single Family'}
Condition: ${lead['Condition'] || 'Unknown'}
Occupancy: ${lead['Occupancy'] || 'Unknown'}

Motivation Signals: ${lead['Motivation Signals'] || 'None specified'}
Description: ${truncateText(lead['Description'] || 'None', 300)}
Notes: ${truncateText(lead['Notes'] || 'None', 200)}

Calculated Values:
- ARV Estimate: ${formatCurrency(calculations.arv || 0)}
- Repair Estimate: ${formatCurrency(calculations.repairs?.estimate || 0)} (${calculations.repairs?.complexity || 'Unknown'})
- LTR Rent Estimate: ${formatCurrency(calculations.rents?.ltr || 0)}/month
- STR Revenue Estimate: ${formatCurrency(calculations.rents?.str || 0)}/month
- Market Heat Score: ${calculations.market?.marketHeatScore || 'Unknown'}
`.trim();
}

/**
 * Returns default strategy recommendation when AI is unavailable
 */
function getDefaultStrategyRecommendation(lead, calculations) {
  calculations = calculations || {};

  // Intelligent default based on available data
  const askingPrice = safeParseNumber(lead['Asking Price'], 0);
  const arv = calculations.arv || askingPrice * 1.2;
  const condition = normalizeCondition(lead['Condition']);
  const motivation = (lead['Motivation Signals'] || '').toLowerCase();

  let strategy = 'Wholesaling (Local)';
  let classifier = 'SOLID DEAL';
  let confidence = 50;

  // Check for creative finance opportunities
  if (motivation.includes('behind on payments') || motivation.includes('foreclosure')) {
    strategy = 'Subject-To (Sub2)';
    classifier = 'HOT DEAL';
    confidence = 70;
  } else if (motivation.includes('inherit') || motivation.includes('probate')) {
    strategy = 'Inherited / Probate';
    classifier = 'PORTFOLIO FOUNDATION';
    confidence = 65;
  } else if (condition.score < 40 && arv > askingPrice * 1.4) {
    strategy = 'Fix & Flip';
    classifier = 'PORTFOLIO FOUNDATION';
    confidence = 60;
  } else if (askingPrice < arv * 0.7) {
    classifier = 'HOT DEAL';
    confidence = 65;
  }

  return {
    strategy: strategy,
    confidence: confidence,
    reasoning: 'Algorithmic recommendation - AI unavailable',
    alternateStrategies: ['Fix & Flip', 'Long-Term Rental (LTR)'],
    riskFactors: ['Limited data available', 'AI analysis not performed'],
    dealClassifier: classifier
  };
}

// =============================================================================
// REPAIR INFERENCE
// =============================================================================

/**
 * Uses AI to infer repairs from property description
 */
function getAIRepairInference(lead) {
  if (!isFeatureEnabled('AI Repair Inference')) {
    return getDefaultRepairInference(lead);
  }

  // Check cache
  const cached = getCachedAIResult(lead['Lead ID'], 'repair');
  if (cached) return cached;

  const prompt = AI_PROMPTS.REPAIR_INFERENCE
    .replace('{{DESCRIPTION}}', truncateText(lead['Description'] || lead['Notes'] || 'No description available', 500))
    .replace('{{CONDITION}}', lead['Condition'] || 'Unknown')
    .replace('{{YEAR_BUILT}}', lead['Year Built'] || 'Unknown')
    .replace('{{SQFT}}', lead['SqFt'] || '1500');

  const result = callOpenAI(prompt);

  if (!result) {
    return getDefaultRepairInference(lead);
  }

  // Validate response
  if (!validateJsonSchema(result, ['estimatedTotal', 'complexityRating'])) {
    logWarning('AI', 'Invalid repair inference schema');
    return getDefaultRepairInference(lead);
  }

  const inference = {
    estimatedTotal: Math.max(0, safeParseNumber(result.estimatedTotal, 0)),
    complexityRating: sanitizeComplexity(result.complexityRating),
    majorItems: Array.isArray(result.majorItems) ? result.majorItems.slice(0, 10) : [],
    concerns: Array.isArray(result.concerns) ? result.concerns.slice(0, 5) : [],
    confidence: Math.min(100, Math.max(0, safeParseNumber(result.confidence, 50)))
  };

  cacheAIResult(lead['Lead ID'], 'repair', inference);
  return inference;
}

/**
 * Sanitizes complexity rating
 */
function sanitizeComplexity(complexity) {
  if (!complexity) return 'Medium';
  const lower = complexity.toLowerCase();
  if (lower.includes('light')) return 'Light';
  if (lower.includes('heavy') || lower.includes('gut')) return 'Heavy';
  if (lower.includes('gut')) return 'Gut Rehab';
  return 'Medium';
}

/**
 * Returns default repair inference when AI is unavailable
 */
function getDefaultRepairInference(lead) {
  const conditionData = normalizeCondition(lead['Condition']);
  const sqft = safeParseNumber(lead['SqFt'], 1500);
  const yearBuilt = safeParseNumber(lead['Year Built'], 1970);
  const age = new Date().getFullYear() - yearBuilt;

  let perSqft = 25;
  let complexity = 'Medium';

  // Adjust for condition
  if (conditionData.score < 20) {
    perSqft = 80;
    complexity = 'Gut Rehab';
  } else if (conditionData.score < 40) {
    perSqft = 55;
    complexity = 'Heavy';
  } else if (conditionData.score < 60) {
    perSqft = 35;
    complexity = 'Medium';
  } else {
    perSqft = 15;
    complexity = 'Light';
  }

  // Adjust for age
  if (age > 50) perSqft *= 1.2;
  else if (age > 30) perSqft *= 1.1;

  return {
    estimatedTotal: Math.round(sqft * perSqft),
    complexityRating: complexity,
    majorItems: [],
    concerns: age > 40 ? ['Property age may require system updates'] : [],
    confidence: 40
  };
}

// =============================================================================
// SELLER PSYCHOLOGY ANALYSIS
// =============================================================================

/**
 * Analyzes seller psychology using AI
 */
function getAISellerPsychology(lead) {
  if (!isFeatureEnabled('AI Seller Messaging')) {
    return getDefaultSellerPsychology(lead);
  }

  const cached = getCachedAIResult(lead['Lead ID'], 'psychology');
  if (cached) return cached;

  const prompt = AI_PROMPTS.SELLER_PSYCHOLOGY
    .replace('{{MOTIVATION_SIGNALS}}', lead['Motivation Signals'] || 'None specified')
    .replace('{{CONDITION}}', lead['Condition'] || 'Unknown')
    .replace('{{OCCUPANCY}}', lead['Occupancy'] || 'Unknown')
    .replace('{{NOTES}}', truncateText(lead['Notes'] || lead['Description'] || 'No notes', 300));

  const result = callOpenAI(prompt);

  if (!result) {
    return getDefaultSellerPsychology(lead);
  }

  if (!validateJsonSchema(result, ['motivationScore', 'negotiationAngle'])) {
    logWarning('AI', 'Invalid seller psychology schema');
    return getDefaultSellerPsychology(lead);
  }

  const psychology = {
    motivationScore: Math.min(100, Math.max(0, safeParseNumber(result.motivationScore, 50))),
    psychologyProfile: result.psychologyProfile || 'Standard',
    painPoints: Array.isArray(result.painPoints) ? result.painPoints.slice(0, 5) : [],
    negotiationAngle: truncateText(result.negotiationAngle || '', 200),
    urgencyLevel: sanitizeUrgency(result.urgencyLevel)
  };

  cacheAIResult(lead['Lead ID'], 'psychology', psychology);
  return psychology;
}

/**
 * Sanitizes urgency level
 */
function sanitizeUrgency(urgency) {
  if (!urgency) return 'Medium';
  const lower = urgency.toLowerCase();
  if (lower.includes('urgent') || lower.includes('immediate')) return 'Urgent';
  if (lower.includes('high')) return 'High';
  if (lower.includes('low')) return 'Low';
  return 'Medium';
}

/**
 * Returns default seller psychology when AI is unavailable
 */
function getDefaultSellerPsychology(lead) {
  const motivation = (lead['Motivation Signals'] || '').toLowerCase();
  let score = 50;
  let urgency = 'Medium';
  let angle = 'Fair cash offer with quick close';

  if (motivation.includes('must sell') || motivation.includes('urgent') || motivation.includes('foreclosure')) {
    score = 90;
    urgency = 'Urgent';
    angle = 'Fast solution to avoid foreclosure/deadline';
  } else if (motivation.includes('relocat') || motivation.includes('job')) {
    score = 75;
    urgency = 'High';
    angle = 'Flexibility on timeline to match their move';
  } else if (motivation.includes('divorc')) {
    score = 80;
    urgency = 'High';
    angle = 'Clean break - no showings, quick process';
  } else if (motivation.includes('inherit') || motivation.includes('estate')) {
    score = 65;
    urgency = 'Medium';
    angle = 'Compassionate approach - ease burden of estate';
  } else if (motivation.includes('vacant') || motivation.includes('tired')) {
    score = 70;
    urgency = 'Medium';
    angle = 'Take property as-is, no repairs needed';
  }

  return {
    motivationScore: score,
    psychologyProfile: 'Standard',
    painPoints: [],
    negotiationAngle: angle,
    urgencyLevel: urgency
  };
}

// =============================================================================
// SELLER MESSAGE GENERATION
// =============================================================================

/**
 * Generates a personalized seller message using AI
 */
function getAISellerMessage(lead, strategy, negotiationAngle) {
  if (!isFeatureEnabled('AI Seller Messaging')) {
    return getDefaultSellerMessage(lead);
  }

  const prompt = AI_PROMPTS.SELLER_MESSAGE
    .replace('{{STRATEGY}}', strategy || 'Cash Purchase')
    .replace('{{NEGOTIATION_ANGLE}}', negotiationAngle || 'Fair offer')
    .replace('{{ADDRESS}}', lead['Address'] || 'your property');

  const result = callOpenAI(prompt);

  if (!result) {
    return getDefaultSellerMessage(lead);
  }

  if (!validateJsonSchema(result, ['message'])) {
    logWarning('AI', 'Invalid seller message schema');
    return getDefaultSellerMessage(lead);
  }

  return {
    message: truncateText(result.message || '', 160),
    tone: result.tone || 'Friendly',
    callToAction: result.callToAction || 'Schedule call'
  };
}

/**
 * Returns default seller message when AI is unavailable
 * (Also exported to utils.gs but defined here as primary)
 */
function getDefaultSellerMessage(lead) {
  const address = lead['Address'] ? lead['Address'].split(',')[0] : 'your property';

  return {
    message: `Hi! I noticed ${address} and I'm interested in making a fair cash offer. Quick close possible. Can we chat?`,
    tone: 'Friendly',
    callToAction: 'Reply or call'
  };
}

// =============================================================================
// BATCH AI PROCESSING
// =============================================================================

/**
 * Processes multiple leads with AI in batch (with rate limiting)
 */
function batchAIProcess(leads, operation) {
  const results = [];

  for (let i = 0; i < leads.length; i++) {
    // Check circuit breaker before each call
    if (CircuitBreakerState.isOpen('AI')) {
      logWarning('AI', 'Circuit breaker open during batch - stopping');
      break;
    }

    try {
      let result;

      switch (operation) {
        case 'strategy':
          result = getAIStrategyRecommendation(leads[i], {});
          break;
        case 'repair':
          result = getAIRepairInference(leads[i]);
          break;
        case 'psychology':
          result = getAISellerPsychology(leads[i]);
          break;
        case 'message':
          result = getAISellerMessage(leads[i], '', '');
          break;
        default:
          result = null;
      }

      results.push({
        leadId: leads[i]['Lead ID'],
        result: result,
        success: result !== null
      });

      // Rate limiting
      if (i < leads.length - 1) {
        Utilities.sleep(AUTOMATION.TIMING.API_RATE_LIMIT_MS);
      }
    } catch (e) {
      results.push({
        leadId: leads[i]['Lead ID'],
        result: null,
        success: false,
        error: e.message
      });
    }
  }

  return results;
}

// =============================================================================
// AI PROMPT MANAGEMENT
// =============================================================================

function getAIPrompts() {
  return AI_PROMPTS;
}

function setCustomPrompt(promptKey, promptText) {
  if (isStagingMode()) {
    Logger.log('[STAGING] Would set custom prompt: ' + promptKey);
    return true;
  }

  try {
    PropertiesService.getScriptProperties().setProperty(
      'CUSTOM_PROMPT_' + promptKey,
      promptText
    );
    return true;
  } catch (e) {
    logError('AI', e, 'Failed to save custom prompt');
    return false;
  }
}

function getCustomPrompt(promptKey) {
  const custom = PropertiesService.getScriptProperties()
    .getProperty('CUSTOM_PROMPT_' + promptKey);
  return custom || AI_PROMPTS[promptKey] || '';
}

// =============================================================================
// AI USAGE TRACKING
// =============================================================================

function getAIUsageStats() {
  const quota = getQuotaInfo();

  return {
    dailyCalls: quota.dailyCalls,
    lastReset: quota.lastReset,
    estimatedRemaining: quota.estimatedRemaining,
    openAIConfigured: !isEmpty(CONFIG.API_KEYS.OPENAI_API_KEY || getConfigProperty('OPENAI_API_KEY')),
    circuitBreakerStatus: CircuitBreakerState.getState('AI').state
  };
}

function resetAIQuotaCounter() {
  PropertiesService.getScriptProperties().setProperty('DAILY_API_CALLS', '0');
  PropertiesService.getScriptProperties().setProperty('LAST_QUOTA_RESET', '');
  CircuitBreakerState.reset('AI');
  logInfo('AI', 'Quota counter and circuit breaker reset');
}

// =============================================================================
// AI CACHING
// =============================================================================

function getCachedAIResult(leadId, operation) {
  const cacheKey = `${CACHE_CONFIG.PREFIX}AI_${operation}_${leadId}`;
  return getCached(cacheKey);
}

function cacheAIResult(leadId, operation, result) {
  const cacheKey = `${CACHE_CONFIG.PREFIX}AI_${operation}_${leadId}`;
  setCached(cacheKey, result, CACHE_CONFIG.AI_RESPONSE_TTL);
}

function clearAICache() {
  logInfo('AI', 'AI cache clear requested - individual caches will expire');
}

// =============================================================================
// FALLBACK AND ERROR HANDLING
// =============================================================================

function withAIFallback(aiFunction, fallbackFunction, ...args) {
  try {
    if (CircuitBreakerState.isOpen('AI')) {
      return fallbackFunction(...args);
    }

    const result = aiFunction(...args);
    if (result && !result.error) {
      return result;
    }
    return fallbackFunction(...args);
  } catch (e) {
    logWarning('AI', `AI call failed, using fallback: ${e.message}`);
    return fallbackFunction(...args);
  }
}

function isAIAvailable() {
  const apiKey = CONFIG.API_KEYS.OPENAI_API_KEY || getConfigProperty('OPENAI_API_KEY');
  return !isEmpty(apiKey) && !CircuitBreakerState.isOpen('AI');
}

function getAIStatus() {
  const available = isAIAvailable();
  const usage = getAIUsageStats();
  const circuitState = CircuitBreakerState.getState('AI');

  return {
    available: available,
    configured: usage.openAIConfigured,
    circuitOpen: circuitState.state === 'OPEN',
    circuitState: circuitState.state,
    dailyCalls: usage.dailyCalls,
    features: {
      strategyRecommendations: isFeatureEnabled('AI Strategy Recommendations'),
      repairInference: isFeatureEnabled('AI Repair Inference'),
      sellerMessaging: isFeatureEnabled('AI Seller Messaging')
    }
  };
}

// =============================================================================
// COMPREHENSIVE AI ANALYSIS
// =============================================================================

/**
 * Runs full AI analysis on a single lead
 */
function runFullAIAnalysis(lead, calculations) {
  if (!isAIAvailable()) {
    logWarning('AI', 'AI not available for full analysis');
    return {
      leadId: lead['Lead ID'],
      strategy: getDefaultStrategyRecommendation(lead, calculations).strategy,
      confidence: 40,
      dealClassifier: 'SOLID DEAL',
      repairEstimate: getDefaultRepairInference(lead).estimatedTotal,
      repairComplexity: getDefaultRepairInference(lead).complexityRating,
      motivationScore: getDefaultSellerPsychology(lead).motivationScore,
      negotiationAngle: getDefaultSellerPsychology(lead).negotiationAngle,
      urgencyLevel: getDefaultSellerPsychology(lead).urgencyLevel,
      sellerMessage: getDefaultSellerMessage(lead).message,
      aiProcessed: false,
      timestamp: new Date()
    };
  }

  const results = {};

  // Strategy recommendation
  results.strategy = getAIStrategyRecommendation(lead, calculations);
  Utilities.sleep(500);

  // Repair inference
  results.repairs = getAIRepairInference(lead);
  Utilities.sleep(500);

  // Seller psychology
  results.psychology = getAISellerPsychology(lead);
  Utilities.sleep(500);

  // Seller message
  const negotiationAngle = results.psychology?.negotiationAngle ||
    results.strategy?.reasoning || '';
  results.message = getAISellerMessage(
    lead,
    results.strategy?.strategy || '',
    negotiationAngle
  );

  return {
    leadId: lead['Lead ID'],
    strategy: results.strategy?.strategy,
    confidence: results.strategy?.confidence,
    dealClassifier: results.strategy?.dealClassifier,
    repairEstimate: results.repairs?.estimatedTotal,
    repairComplexity: results.repairs?.complexityRating,
    motivationScore: results.psychology?.motivationScore,
    negotiationAngle: results.psychology?.negotiationAngle,
    urgencyLevel: results.psychology?.urgencyLevel,
    sellerMessage: results.message?.message,
    aiProcessed: true,
    timestamp: new Date()
  };
}
