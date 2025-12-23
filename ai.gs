/**
 * ============================================================================
 * QUANTUM REAL ESTATE ANALYZER - ULTIMATE EDITION v2.0
 * AI Integration Module (ai.gs)
 * ============================================================================
 *
 * Handles all AI-powered features using OpenAI API:
 * - Strategy recommendations
 * - Repair inference
 * - Seller psychology analysis
 * - Personalized seller messaging
 */

// =============================================================================
// CORE AI FUNCTIONS
// =============================================================================

/**
 * Makes a request to OpenAI API
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System instructions
 * @returns {Object} API response or null
 */
function callOpenAI(prompt, systemPrompt = 'You are a real estate investment expert.') {
  const apiKey = CONFIG.API_KEYS.OPENAI_API_KEY || getConfigProperty('OPENAI_API_KEY');

  if (!apiKey) {
    logWarning('AI', 'OpenAI API key not configured');
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
      logError('AI', new Error(`API returned ${code}`), response.getContentText());
      return null;
    }

    const data = JSON.parse(response.getContentText());
    const content = data.choices[0].message.content;

    logInfo('AI', 'OpenAI request successful');

    try {
      return JSON.parse(content);
    } catch (e) {
      logWarning('AI', 'Failed to parse JSON response, returning raw content');
      return { raw: content };
    }
  } catch (e) {
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
 * @returns {Object} AI recommendation or null
 */
function getAIStrategyRecommendation(lead, calculations) {
  if (!isFeatureEnabled('AI Strategy Recommendations')) {
    return null;
  }

  // Build property data string
  const propertyData = formatPropertyDataForAI(lead, calculations);

  // Replace placeholder in prompt template
  const prompt = AI_PROMPTS.STRATEGY_RECOMMENDATION
    .replace('{{PROPERTY_DATA}}', propertyData);

  const result = callOpenAI(prompt);

  if (!result) {
    return getDefaultStrategyRecommendation();
  }

  // Validate response
  if (!validateJsonSchema(result, ['strategy', 'confidence', 'dealClassifier'])) {
    logWarning('AI', 'Invalid strategy recommendation schema');
    return getDefaultStrategyRecommendation();
  }

  return {
    strategy: result.strategy,
    confidence: result.confidence,
    reasoning: result.reasoning || '',
    alternateStrategies: result.alternateStrategies || [],
    riskFactors: result.riskFactors || [],
    dealClassifier: result.dealClassifier
  };
}

/**
 * Formats property data for AI prompt
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Calculated values
 * @returns {string} Formatted data string
 */
function formatPropertyDataForAI(lead, calculations) {
  return `
Address: ${lead['Address']}, ${lead['City']}, ${lead['State']} ${lead['ZIP']}
Asking Price: ${formatCurrency(lead['Asking Price'])}
Beds/Baths: ${lead['Beds']}/${lead['Baths']}
Square Feet: ${lead['SqFt']}
Year Built: ${lead['Year Built']}
Property Type: ${lead['Property Type']}
Condition: ${lead['Condition']}
Occupancy: ${lead['Occupancy']}

Motivation Signals: ${lead['Motivation Signals'] || 'None specified'}
Description: ${lead['Description'] || 'None'}
Notes: ${lead['Notes'] || 'None'}

Calculated Values:
- ARV Estimate: ${formatCurrency(calculations.arv)}
- Repair Estimate: ${formatCurrency(calculations.repairs?.estimate || 0)} (${calculations.repairs?.complexity || 'Unknown'})
- LTR Rent Estimate: ${formatCurrency(calculations.rents?.ltr || 0)}/month
- STR Revenue Estimate: ${formatCurrency(calculations.rents?.str || 0)}/month
- Market Heat Score: ${calculations.market?.marketHeatScore || 'Unknown'}
`.trim();
}

/**
 * Returns default strategy recommendation when AI is unavailable
 * @returns {Object} Default recommendation
 */
function getDefaultStrategyRecommendation() {
  return {
    strategy: 'Wholesaling (Local)',
    confidence: 50,
    reasoning: 'Default recommendation - AI unavailable',
    alternateStrategies: ['Fix & Flip', 'Long-Term Rental (LTR)'],
    riskFactors: ['Limited data available'],
    dealClassifier: 'SOLID DEAL'
  };
}

// =============================================================================
// REPAIR INFERENCE
// =============================================================================

/**
 * Uses AI to infer repairs from property description
 * @param {Object} lead - Lead data
 * @returns {Object} Repair inference or null
 */
function getAIRepairInference(lead) {
  if (!isFeatureEnabled('AI Repair Inference')) {
    return null;
  }

  const prompt = AI_PROMPTS.REPAIR_INFERENCE
    .replace('{{DESCRIPTION}}', lead['Description'] || lead['Notes'] || 'No description available')
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

  return {
    estimatedTotal: safeParseNumber(result.estimatedTotal, 0),
    complexityRating: result.complexityRating || 'Medium',
    majorItems: result.majorItems || [],
    concerns: result.concerns || [],
    confidence: result.confidence || 50
  };
}

/**
 * Returns default repair inference when AI is unavailable
 * @param {Object} lead - Lead data
 * @returns {Object} Default repair inference
 */
function getDefaultRepairInference(lead) {
  const conditionData = normalizeCondition(lead['Condition']);
  const sqft = safeParseNumber(lead['SqFt'], 1500);

  let perSqft = 25;
  let complexity = 'Medium';

  if (conditionData.score < 30) {
    perSqft = 60;
    complexity = 'Heavy';
  } else if (conditionData.score < 60) {
    perSqft = 35;
    complexity = 'Medium';
  } else {
    perSqft = 15;
    complexity = 'Light';
  }

  return {
    estimatedTotal: Math.round(sqft * perSqft),
    complexityRating: complexity,
    majorItems: [],
    concerns: [],
    confidence: 40
  };
}

// =============================================================================
// SELLER PSYCHOLOGY ANALYSIS
// =============================================================================

/**
 * Analyzes seller psychology using AI
 * @param {Object} lead - Lead data
 * @returns {Object} Psychology analysis or null
 */
function getAISellerPsychology(lead) {
  if (!isFeatureEnabled('AI Seller Messaging')) {
    return null;
  }

  const prompt = AI_PROMPTS.SELLER_PSYCHOLOGY
    .replace('{{MOTIVATION_SIGNALS}}', lead['Motivation Signals'] || 'None specified')
    .replace('{{CONDITION}}', lead['Condition'] || 'Unknown')
    .replace('{{OCCUPANCY}}', lead['Occupancy'] || 'Unknown')
    .replace('{{NOTES}}', lead['Notes'] || lead['Description'] || 'No notes');

  const result = callOpenAI(prompt);

  if (!result) {
    return getDefaultSellerPsychology(lead);
  }

  // Validate response
  if (!validateJsonSchema(result, ['motivationScore', 'negotiationAngle'])) {
    logWarning('AI', 'Invalid seller psychology schema');
    return getDefaultSellerPsychology(lead);
  }

  return {
    motivationScore: safeParseNumber(result.motivationScore, 50),
    psychologyProfile: result.psychologyProfile || 'Standard',
    painPoints: result.painPoints || [],
    negotiationAngle: result.negotiationAngle || '',
    urgencyLevel: result.urgencyLevel || 'Medium'
  };
}

/**
 * Returns default seller psychology when AI is unavailable
 * @param {Object} lead - Lead data
 * @returns {Object} Default psychology analysis
 */
function getDefaultSellerPsychology(lead) {
  const motivation = (lead['Motivation Signals'] || '').toLowerCase();
  let score = 50;
  let urgency = 'Medium';

  if (motivation.includes('must sell') || motivation.includes('urgent')) {
    score = 85;
    urgency = 'Urgent';
  } else if (motivation.includes('relocat') || motivation.includes('divorc')) {
    score = 75;
    urgency = 'High';
  } else if (motivation.includes('inherit') || motivation.includes('vacant')) {
    score = 65;
    urgency = 'Medium';
  }

  return {
    motivationScore: score,
    psychologyProfile: 'Standard',
    painPoints: [],
    negotiationAngle: 'Fair cash offer with quick close',
    urgencyLevel: urgency
  };
}

// =============================================================================
// SELLER MESSAGE GENERATION
// =============================================================================

/**
 * Generates a personalized seller message using AI
 * @param {Object} lead - Lead data
 * @param {string} strategy - Recommended strategy
 * @param {string} negotiationAngle - Negotiation angle
 * @returns {Object} Generated message or null
 */
function getAISellerMessage(lead, strategy, negotiationAngle) {
  if (!isFeatureEnabled('AI Seller Messaging')) {
    return null;
  }

  const prompt = AI_PROMPTS.SELLER_MESSAGE
    .replace('{{STRATEGY}}', strategy || 'Cash Purchase')
    .replace('{{NEGOTIATION_ANGLE}}', negotiationAngle || 'Fair offer')
    .replace('{{ADDRESS}}', lead['Address'] || 'your property');

  const result = callOpenAI(prompt);

  if (!result) {
    return getDefaultSellerMessage(lead);
  }

  // Validate response
  if (!validateJsonSchema(result, ['message'])) {
    logWarning('AI', 'Invalid seller message schema');
    return getDefaultSellerMessage(lead);
  }

  return {
    message: truncateText(result.message, 160),
    tone: result.tone || 'Friendly',
    callToAction: result.callToAction || 'Schedule call'
  };
}

/**
 * Returns default seller message when AI is unavailable
 * @param {Object} lead - Lead data
 * @returns {Object} Default message
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
 * @param {Array} leads - Array of leads to process
 * @param {string} operation - Operation type (strategy, repair, psychology, message)
 * @returns {Array} Results array
 */
function batchAIProcess(leads, operation) {
  const results = [];

  for (let i = 0; i < leads.length; i++) {
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

/**
 * Gets all AI prompts (for debugging/customization)
 * @returns {Object} All prompt templates
 */
function getAIPrompts() {
  return AI_PROMPTS;
}

/**
 * Updates a custom prompt (saved to script properties)
 * @param {string} promptKey - Prompt key name
 * @param {string} promptText - New prompt text
 * @returns {boolean} Success status
 */
function setCustomPrompt(promptKey, promptText) {
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

/**
 * Gets a custom prompt or falls back to default
 * @param {string} promptKey - Prompt key name
 * @returns {string} Prompt text
 */
function getCustomPrompt(promptKey) {
  const custom = PropertiesService.getScriptProperties()
    .getProperty('CUSTOM_PROMPT_' + promptKey);

  return custom || AI_PROMPTS[promptKey] || '';
}

// =============================================================================
// AI USAGE TRACKING
// =============================================================================

/**
 * Gets AI usage statistics
 * @returns {Object} Usage stats
 */
function getAIUsageStats() {
  const quota = getQuotaInfo();

  return {
    dailyCalls: quota.dailyCalls,
    lastReset: quota.lastReset,
    estimatedRemaining: quota.estimatedRemaining,
    openAIConfigured: !isEmpty(CONFIG.API_KEYS.OPENAI_API_KEY || getConfigProperty('OPENAI_API_KEY'))
  };
}

/**
 * Resets AI quota counter (for testing)
 */
function resetAIQuotaCounter() {
  PropertiesService.getScriptProperties().setProperty('DAILY_API_CALLS', '0');
  PropertiesService.getScriptProperties().setProperty('LAST_QUOTA_RESET', '');
  logInfo('AI', 'Quota counter reset');
}

// =============================================================================
// AI CACHING
// =============================================================================

/**
 * Gets cached AI result for a lead
 * @param {string} leadId - Lead ID
 * @param {string} operation - Operation type
 * @returns {Object|null} Cached result or null
 */
function getCachedAIResult(leadId, operation) {
  const cacheKey = `AI_${operation}_${leadId}`;
  return getCached(cacheKey);
}

/**
 * Caches an AI result for a lead
 * @param {string} leadId - Lead ID
 * @param {string} operation - Operation type
 * @param {Object} result - Result to cache
 */
function cacheAIResult(leadId, operation, result) {
  const cacheKey = `AI_${operation}_${leadId}`;
  setCached(cacheKey, result, 3600); // 1 hour cache
}

/**
 * Clears all AI caches
 */
function clearAICache() {
  // Note: Google Apps Script doesn't have cache.getAll(), so we just log
  logInfo('AI', 'AI cache clear requested - individual caches will expire');
}

// =============================================================================
// FALLBACK AND ERROR HANDLING
// =============================================================================

/**
 * Wraps AI call with fallback logic
 * @param {Function} aiFunction - AI function to call
 * @param {Function} fallbackFunction - Fallback function
 * @param {...*} args - Arguments to pass
 * @returns {Object} Result from AI or fallback
 */
function withAIFallback(aiFunction, fallbackFunction, ...args) {
  try {
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

/**
 * Validates AI is available before processing
 * @returns {boolean} True if AI is available
 */
function isAIAvailable() {
  const apiKey = CONFIG.API_KEYS.OPENAI_API_KEY || getConfigProperty('OPENAI_API_KEY');
  return !isEmpty(apiKey);
}

/**
 * Gets AI status summary
 * @returns {Object} Status summary
 */
function getAIStatus() {
  const available = isAIAvailable();
  const usage = getAIUsageStats();

  return {
    available: available,
    configured: usage.openAIConfigured,
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
 * Combines all AI features for comprehensive insights
 * @param {Object} lead - Lead data
 * @param {Object} calculations - Pre-calculated values
 * @returns {Object} Comprehensive AI analysis
 */
function runFullAIAnalysis(lead, calculations) {
  if (!isAIAvailable()) {
    logWarning('AI', 'AI not available for full analysis');
    return null;
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

  // Combine into comprehensive result
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
