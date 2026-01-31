/**
 * Quantum Real Estate Analyzer - Messaging AI Module
 * Generates seller messages, follow-ups, and psychology profiles
 */

// ============================================================
// MAIN MESSAGING FUNCTIONS
// ============================================================

/**
 * Generates seller messages for all deals
 */
function generateSellerMessages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  logEvent('MESSAGING', 'Generating seller messages');

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dealId = row[colMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Build deal object
    const deal = {};
    headers.forEach((h, j) => deal[h] = row[j]);

    // Generate message components
    const sellerMessage = generateFirstTouchMessage(deal);
    const followUpTag = determineFollowUpSequence(deal);
    const deniabilityAngle = assessDeniabilityAngle(deal);
    const psychologyProfile = generatePsychologyProfile(deal);

    // Update Master DB
    if (colMap['Seller Message']) {
      masterSheet.getRange(i + 1, colMap['Seller Message']).setValue(sellerMessage);
    }
    if (colMap['Follow-Up Tag']) {
      masterSheet.getRange(i + 1, colMap['Follow-Up Tag']).setValue(followUpTag);
    }
    if (colMap['Deniability Angle']) {
      masterSheet.getRange(i + 1, colMap['Deniability Angle']).setValue(deniabilityAngle);
    }
    if (colMap['Seller Psychology Profile']) {
      masterSheet.getRange(i + 1, colMap['Seller Psychology Profile']).setValue(psychologyProfile);
    }
  }

  logEvent('MESSAGING', 'Seller messages generated');
}

// ============================================================
// FIRST TOUCH MESSAGE GENERATION
// ============================================================

/**
 * Generates first touch message for seller
 * @param {Object} deal - Deal object
 * @returns {string} First touch message
 */
function generateFirstTouchMessage(deal) {
  const address = deal['Address'] || 'your property';
  const city = deal['City'] || '';
  const sellerType = deal['Seller Type'] || 'Unknown';
  const motivationSignals = String(deal['Motivation Signals'] || '').toLowerCase();
  const verdict = deal['Verdict'] || '';

  // Determine tone based on signals
  const tone = determineTone(motivationSignals, sellerType);

  // Select template based on tone
  let message = '';

  if (tone === 'empathetic') {
    message = generateEmpatheticMessage(address, city, motivationSignals);
  } else if (tone === 'professional') {
    message = generateProfessionalMessage(address, city);
  } else if (tone === 'investor') {
    message = generateInvestorMessage(address, city);
  } else {
    message = generateStandardMessage(address, city);
  }

  return message;
}

/**
 * Determines appropriate tone based on signals
 */
function determineTone(signals, sellerType) {
  const distressSignals = ['foreclosure', 'pre-foreclosure', 'divorce', 'death', 'estate',
    'probate', 'behind on payments', 'desperate', 'must sell'];

  if (distressSignals.some(s => signals.includes(s))) {
    return 'empathetic';
  }

  if (sellerType === 'Investor' || signals.includes('investor')) {
    return 'investor';
  }

  if (sellerType === 'Agent' || signals.includes('agent')) {
    return 'professional';
  }

  return 'standard';
}

/**
 * Generates empathetic message for distressed sellers
 */
function generateEmpatheticMessage(address, city, signals) {
  let opener = "Hi, I hope this message finds you well.";

  if (signals.includes('foreclosure') || signals.includes('pre-foreclosure')) {
    opener = "Hi, I understand you may be going through a difficult time.";
  } else if (signals.includes('divorce')) {
    opener = "Hi, I know life transitions can be challenging.";
  } else if (signals.includes('estate') || signals.includes('probate')) {
    opener = "Hi, I hope you're doing okay during what must be a difficult time.";
  }

  return `${opener}

I came across ${address}${city ? ' in ' + city : ''} and wanted to reach out personally. I'm a local investor who specializes in helping homeowners find solutions, especially when traditional selling isn't the best fit.

If you're open to exploring options, I'd love to have a quick, no-pressure conversation. I can work on your timeline and handle things like repairs, closing costs, and even back payments if needed.

Would a brief call work for you this week?

Best regards`;
}

/**
 * Generates professional message for agent-listed properties
 */
function generateProfessionalMessage(address, city) {
  return `Good afternoon,

I'm reaching out regarding ${address}${city ? ' in ' + city : ''}. I'm an active investor in the area and this property fits my buying criteria.

I wanted to express my interest and learn more about your seller's situation and flexibility. I'm a cash buyer who can close quickly and am familiar with working with agents on both sides of the transaction.

Would you have a few minutes to discuss the property and any terms that might work for your client?

Looking forward to connecting.

Best regards`;
}

/**
 * Generates investor-to-investor message
 */
function generateInvestorMessage(address, city) {
  return `Hey there,

I noticed ${address}${city ? ' in ' + city : ''} and wanted to connect - looks like it could be a good fit for my portfolio.

Curious what your exit strategy is and if you'd be open to discussing terms. I'm looking to add properties in this area and am flexible on structure (cash, terms, JV, etc.).

Let me know if you want to chat.

Cheers`;
}

/**
 * Generates standard message
 */
function generateStandardMessage(address, city) {
  return `Hi there,

I'm reaching out about ${address}${city ? ' in ' + city : ''}. I'm a local real estate investor and I'm interested in learning more about this property.

I buy homes in any condition and can offer a fair cash price with a quick, hassle-free closing. No repairs needed, no agent commissions, and I cover most closing costs.

Would you be open to a brief conversation to see if we might be a good fit?

Thanks for your time`;
}

// ============================================================
// FOLLOW-UP SEQUENCE
// ============================================================

/**
 * Determines follow-up sequence tag
 * @param {Object} deal - Deal object
 * @returns {string} Follow-up sequence tag
 */
function determineFollowUpSequence(deal) {
  const verdict = deal['Verdict'] || '';
  const motivationSignals = String(deal['Motivation Signals'] || '').toLowerCase();
  const sellerType = deal['Seller Type'] || '';

  // High urgency - aggressive follow-up
  if (verdict === 'HOT' || motivationSignals.includes('foreclosure') ||
    motivationSignals.includes('pre-foreclosure')) {
    return 'URGENT-7D';  // 7 touches in 7 days
  }

  // Medium urgency
  if (verdict === 'SOLID' || motivationSignals.includes('motivated') ||
    motivationSignals.includes('price drop')) {
    return 'ACTIVE-14D';  // 5 touches in 14 days
  }

  // Professional/agent - measured approach
  if (sellerType === 'Agent') {
    return 'AGENT-NURTURE';
  }

  // Investor properties
  if (sellerType === 'Investor') {
    return 'INVESTOR-CONNECT';
  }

  // Standard nurture
  if (verdict === 'HOLD') {
    return 'NURTURE-30D';  // 3 touches over 30 days
  }

  // Long-term drip
  return 'DRIP-90D';
}

/**
 * Gets follow-up sequence details
 * @param {string} sequenceTag - Sequence tag
 * @returns {Object} Sequence details
 */
function getFollowUpSequence(sequenceTag) {
  const sequences = {
    'URGENT-7D': {
      touches: 7,
      days: 7,
      schedule: [0, 1, 2, 3, 4, 5, 7],
      channels: ['SMS', 'Call', 'SMS', 'Call', 'SMS', 'Email', 'Call']
    },
    'ACTIVE-14D': {
      touches: 5,
      days: 14,
      schedule: [0, 2, 5, 9, 14],
      channels: ['SMS', 'Call', 'Email', 'SMS', 'Call']
    },
    'AGENT-NURTURE': {
      touches: 4,
      days: 21,
      schedule: [0, 5, 12, 21],
      channels: ['Email', 'Call', 'Email', 'Call']
    },
    'INVESTOR-CONNECT': {
      touches: 3,
      days: 14,
      schedule: [0, 5, 14],
      channels: ['SMS', 'Call', 'Email']
    },
    'NURTURE-30D': {
      touches: 3,
      days: 30,
      schedule: [0, 10, 30],
      channels: ['SMS', 'Email', 'Call']
    },
    'DRIP-90D': {
      touches: 4,
      days: 90,
      schedule: [0, 21, 45, 90],
      channels: ['Email', 'SMS', 'Email', 'Call']
    }
  };

  return sequences[sequenceTag] || sequences['DRIP-90D'];
}

// ============================================================
// PSYCHOLOGY PROFILE
// ============================================================

/**
 * Generates seller psychology profile
 * @param {Object} deal - Deal object
 * @returns {string} Psychology profile summary
 */
function generatePsychologyProfile(deal) {
  const motivationSignals = String(deal['Motivation Signals'] || '').toLowerCase();
  const sellerType = deal['Seller Type'] || 'Unknown';
  const dom = parseFloat(deal['DOM']) || 30;

  const traits = [];
  const approach = [];

  // Analyze motivation signals
  if (motivationSignals.includes('foreclosure') || motivationSignals.includes('pre-foreclosure')) {
    traits.push('Distressed');
    traits.push('Time-sensitive');
    approach.push('Lead with empathy');
    approach.push('Emphasize speed and certainty');
  }

  if (motivationSignals.includes('divorce')) {
    traits.push('Emotionally charged');
    traits.push('May have dual decision makers');
    approach.push('Neutral tone');
    approach.push('Clear communication');
  }

  if (motivationSignals.includes('estate') || motivationSignals.includes('probate')) {
    traits.push('Inherited situation');
    traits.push('May lack property knowledge');
    approach.push('Educational approach');
    approach.push('Patience with process');
  }

  if (motivationSignals.includes('price drop') || motivationSignals.includes('reduced')) {
    traits.push('Reality-adjusting');
    traits.push('May be frustrated');
    approach.push('Offer certainty');
    approach.push('Quick timeline appeal');
  }

  if (motivationSignals.includes('vacant')) {
    traits.push('Carrying costs burden');
    traits.push('Liability concerns');
    approach.push('Highlight cost savings');
    approach.push('Quick solution pitch');
  }

  // DOM-based insights
  if (dom > 90) {
    traits.push('Market-fatigued');
    approach.push('Fresh perspective');
    approach.push('Different approach than agents');
  } else if (dom < 14) {
    traits.push('Recently listed');
    traits.push('May have high expectations');
    approach.push('Differentiate from retail');
    approach.push('Build rapport first');
  }

  // Seller type insights
  if (sellerType === 'Agent') {
    traits.push('Professional');
    traits.push('Commission-focused');
    approach.push('Speak their language');
    approach.push('Respect their process');
  } else if (sellerType === 'Investor') {
    traits.push('Numbers-driven');
    traits.push('Experienced');
    approach.push('Lead with data');
    approach.push('Direct negotiation');
  }

  // Build summary
  let profile = '';
  if (traits.length > 0) {
    profile += 'Traits: ' + traits.join(', ') + '. ';
  }
  if (approach.length > 0) {
    profile += 'Approach: ' + approach.join('; ') + '.';
  }

  return profile || 'Standard seller - build rapport and assess motivation.';
}

// ============================================================
// DENIABILITY ANGLE
// ============================================================

/**
 * Assesses deniability angle for creative offers
 * @param {Object} deal - Deal object
 * @returns {string} Deniability assessment
 */
function assessDeniabilityAngle(deal) {
  const sellerType = deal['Seller Type'] || '';
  const bestStrategy = deal['Best Strategy'] || '';
  const offerType = deal['Offer Type Recommended'] || '';

  // Check if creative structure suggested
  const creativeOffers = ['Sub2', 'Wrap', 'Seller Carry', 'Lease Option', 'Hybrid'];
  const isCreative = creativeOffers.some(c => offerType.includes(c)) || bestStrategy === 'Creative';

  if (!isCreative) {
    return 'N/A - Cash offer';
  }

  // Assess deniability factors
  const factors = [];

  // Seller type considerations
  if (sellerType === 'Agent') {
    factors.push('Agent involved - may need disclosure');
    return 'Limited - ' + factors.join('; ');
  }

  if (sellerType === 'Investor') {
    factors.push('Investor seller - likely understands structure');
    return 'Good - ' + factors.join('; ');
  }

  // Check motivation
  const motivationSignals = String(deal['Motivation Signals'] || '').toLowerCase();

  if (motivationSignals.includes('foreclosure') || motivationSignals.includes('pre-foreclosure')) {
    factors.push('Distress creates openness to alternatives');
    return 'Strong - ' + factors.join('; ');
  }

  if (motivationSignals.includes('vacant') || motivationSignals.includes('tired landlord')) {
    factors.push('Carrying costs create motivation');
    return 'Good - ' + factors.join('; ');
  }

  return 'Moderate - standard creative pitch positioning';
}

// ============================================================
// AI MESSAGE GENERATION (OPENAI)
// ============================================================

/**
 * Generates AI-powered message using OpenAI
 * Requires API key in settings
 * @param {Object} deal - Deal object
 * @param {string} messageType - Type of message to generate
 * @returns {string} AI-generated message
 */
function generateAIMessage(deal, messageType) {
  const aiEnabled = getSetting('ai_openai_enabled', 'false') === 'true';
  const apiKey = getSetting('ai_openai_api_key', '');

  if (!aiEnabled || !apiKey) {
    return generateFirstTouchMessage(deal); // Fallback to template
  }

  const prompt = buildAIPrompt(deal, messageType);

  try {
    const response = callOpenAI(apiKey, prompt);
    logEvent('AI', `AI message generated for ${deal['Deal ID']}`);
    return response;
  } catch (error) {
    logError('AI', 'OpenAI call failed: ' + error.message, error.stack);
    return generateFirstTouchMessage(deal); // Fallback
  }
}

/**
 * Builds prompt for AI message generation
 */
function buildAIPrompt(deal, messageType) {
  return `Generate a ${messageType} message for a real estate investor reaching out to a property owner.

Property Details:
- Address: ${deal['Address']}
- City: ${deal['City']}, ${deal['State']}
- Asking Price: $${deal['Asking Price']}
- Seller Type: ${deal['Seller Type'] || 'Unknown'}
- Motivation Signals: ${deal['Motivation Signals'] || 'None specified'}
- Days on Market: ${deal['DOM'] || 'Unknown'}

Requirements:
- Keep it under 150 words
- Sound genuine and personal, not salesy
- If distress signals present, lead with empathy
- Include a soft call-to-action
- Do not mention specific numbers or make promises

Generate only the message text, no subject lines or signatures.`;
}

/**
 * Calls OpenAI API
 */
function callOpenAI(apiKey, prompt) {
  const model = getSetting('ai_model', 'gpt-4o-mini');
  const maxTokens = parseInt(getSetting('ai_max_tokens', '500'));

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant that generates professional, empathetic real estate outreach messages.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.7
  };

  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error(json.error.message);
  }

  return json.choices[0].message.content.trim();
}

// ============================================================
// MESSAGE RETRIEVAL (FOR UI)
// ============================================================

/**
 * Gets message for a specific deal
 */
function getMessageForDeal(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet) return { error: 'Master sheet not found' };

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('Deal ID')] === dealId) {
      return {
        sellerMessage: data[i][headers.indexOf('Seller Message')] || '',
        followUpTag: data[i][headers.indexOf('Follow-Up Tag')] || '',
        psychologyProfile: data[i][headers.indexOf('Seller Psychology Profile')] || '',
        deniabilityAngle: data[i][headers.indexOf('Deniability Angle')] || ''
      };
    }
  }

  return { error: 'Deal not found' };
}

/**
 * Regenerates message for a specific deal
 */
function regenerateMessage(dealId, useAI) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet) return { error: 'Master sheet not found' };

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('Deal ID')] === dealId) {
      const deal = {};
      headers.forEach((h, j) => deal[h] = data[i][j]);

      let message;
      if (useAI) {
        message = generateAIMessage(deal, 'first-touch');
      } else {
        message = generateFirstTouchMessage(deal);
      }

      masterSheet.getRange(i + 1, colMap['Seller Message']).setValue(message);
      return { success: true, message: message };
    }
  }

  return { error: 'Deal not found' };
}
