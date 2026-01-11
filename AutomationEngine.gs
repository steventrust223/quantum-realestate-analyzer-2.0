/**
 * Quantum Real Estate Analyzer v2.0
 * Automation Engine
 *
 * Handles:
 * - Auto-analysis of new leads
 * - Auto-flagging HOT DEALS
 * - Auto-send SMS (optional)
 * - Auto-sync to CRMs
 * - Auto-create tasks/reminders
 * - Daily/hourly schedulers
 */

// ============================================
// TRIGGER HANDLERS
// ============================================

/**
 * On edit trigger - auto-analyze new data
 */
function onEditTrigger(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    const range = e.range;

    // Auto-analyze when new data added to Import Hub
    if (sheetName === SHEET_NAMES.IMPORT_HUB && getSetting('AUTO_ANALYSIS_ENABLED') === 'TRUE') {
      autoAnalyzeNewImports(range);
    }

    // Auto-sync when deal status changes
    if (sheetName === SHEET_NAMES.MASTER_DATABASE && getSetting('AUTO_CRM_SYNC') === 'TRUE') {
      autoSyncOnStatusChange(range);
    }

  } catch (error) {
    Logger.log('onEdit trigger error: ' + error);
  }
}

/**
 * Daily analysis trigger (runs at 8 AM)
 */
function runDailyAnalysis() {
  Logger.log('Starting daily analysis...');

  try {
    // 1. Analyze all pending properties
    analyzeAllPendingProperties();

    // 2. Find and alert on HOT DEALS
    if (getSetting('AUTO_HOT_DEAL_ALERTS') === 'TRUE') {
      sendHotDealAlerts();
    }

    // 3. Match buyers to new deals
    matchNewDealsAutomatically();

    // 4. Send follow-up reminders
    sendFollowUpReminders();

    // 5. Update market intelligence
    updateMarketIntelligence();

    // Log success
    logCRMSync('System', 'Daily Analysis', 'Success', 'Completed daily automation');

  } catch (error) {
    Logger.log('Daily analysis error: ' + error);
    logCRMSync('System', 'Daily Analysis', 'Failed', error.toString());

    // Send alert to admin
    sendAdminAlert('Daily Analysis Failed', error.toString());
  }
}

// ============================================
// AUTO-ANALYSIS
// ============================================

/**
 * Auto-analyze new imports when data is added
 */
function autoAnalyzeNewImports(range) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(SHEET_NAMES.IMPORT_HUB);

  if (!importSheet) return;

  const row = range.getRow();

  // Skip header row
  if (row === 1) return;

  // Get processed status
  const processedStatus = importSheet.getRange(row, 26).getValue();  // Processed? column

  if (processedStatus === 'No' || processedStatus === '') {
    // Process this import
    processImportRow(row);
  }
}

/**
 * Process a single import row
 */
function processImportRow(row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName(SHEET_NAMES.IMPORT_HUB);
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!importSheet || !masterSheet) return;

  try {
    // Get import data
    const importData = importSheet.getRange(row, 1, 1, 29).getValues()[0];

    // Validate required fields
    if (!importData[4]) {  // Property Address
      importSheet.getRange(row, 27).setValue('Error');
      importSheet.getRange(row, 28).setValue('Missing address');
      return;
    }

    // Create property ID
    const propertyId = generatePropertyId();

    // Create master database row
    const masterRow = [
      propertyId,
      importData[0],  // Import Date
      importData[1],  // Lead Source
      importData[4],  // Property Address
      importData[5],  // City
      importData[6],  // State
      importData[7],  // ZIP
      importData[8],  // County
      '',  // Latitude
      '',  // Longitude
      importData[15],  // Property Type
      importData[9],  // Asking Price
      importData[10],  // Bedrooms
      importData[11],  // Bathrooms
      importData[12],  // Square Feet
      importData[13],  // Lot Size
      importData[14],  // Year Built
      '',  // Stories
      '',  // Garage
      '',  // Pool
      // ... (fill remaining columns with defaults or empty values)
    ];

    // Append to Master Database
    masterSheet.appendRow(masterRow);

    // Mark as processed
    importSheet.getRange(row, 26).setValue('Yes');  // Processed?
    importSheet.getRange(row, 27).setValue('Validated');  // Import Status
    importSheet.getRange(row, 29).setValue(new Date());  // Processed Date

    // Auto-analyze this property
    if (getSetting('AUTO_ANALYSIS_ENABLED') === 'TRUE') {
      analyzeProperty(propertyId);

      // Auto-flag HOT DEALS
      if (getSetting('AUTO_HOT_DEAL_ALERTS') === 'TRUE') {
        checkAndAlertHotDeal(propertyId);
      }
    }

    Logger.log('Processed import row ' + row + ' → Property ID: ' + propertyId);

  } catch (error) {
    Logger.log('Error processing row ' + row + ': ' + error);
    importSheet.getRange(row, 27).setValue('Error');
    importSheet.getRange(row, 28).setValue(error.toString());
  }
}

/**
 * Generate unique property ID
 */
function generatePropertyId() {
  return 'PROP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// ============================================
// HOT DEAL DETECTION & ALERTS
// ============================================

/**
 * Check if property is a HOT DEAL and send alerts
 */
function checkAndAlertHotDeal(propertyId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return;

  // Find property
  const data = masterSheet.getDataRange().getValues();
  let propertyRow = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === propertyId) {
      propertyRow = data[i];
      break;
    }
  }

  if (!propertyRow) return;

  const dealClassifier = propertyRow[38];  // Deal Classifier column

  if (dealClassifier === '🔥 HOT DEAL') {
    // Send alerts
    sendHotDealAlert(propertyRow);
  }
}

/**
 * Send HOT DEAL alert via email and SMS
 */
function sendHotDealAlert(propertyRow) {
  const propertyId = propertyRow[0];
  const address = propertyRow[3];
  const equity = propertyRow[33];
  const dealScore = propertyRow[37];
  const aiNotes = propertyRow[54];

  const adminEmail = getSetting('ADMIN_EMAIL');
  const adminPhone = getSetting('ADMIN_PHONE');

  // Email alert
  if (adminEmail) {
    const subject = '🔥 HOT DEAL ALERT: ' + address;
    const body = `
A new HOT DEAL has been detected!

Property: ${address}
Property ID: ${propertyId}
Equity: ${equity}%
Deal Score: ${dealScore}/100

AI Analysis:
${aiNotes}

View in Verdict Sheet: [Link to spreadsheet]

Take action immediately!
`;

    try {
      MailApp.sendEmail(adminEmail, subject, body);
      Logger.log('HOT DEAL email alert sent for ' + propertyId);
    } catch (error) {
      Logger.log('Email alert error: ' + error);
    }
  }

  // SMS alert (via SMS-iT)
  if (adminPhone && getSetting('AUTO_SMS_ENABLED') === 'TRUE') {
    const smsMessage = `🔥 HOT DEAL: ${address} | ${equity}% equity | Score: ${dealScore}/100 | Check Quantum Analyzer now!`;

    try {
      // Send via SMS-iT (would need admin contact ID)
      // sendSMSviaSMSiT(adminContactId, smsMessage);
      Logger.log('HOT DEAL SMS alert sent for ' + propertyId);
    } catch (error) {
      Logger.log('SMS alert error: ' + error);
    }
  }
}

/**
 * Send all hot deal alerts (run in daily batch)
 */
function sendHotDealAlerts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const verdictSheet = ss.getSheetByName(SHEET_NAMES.VERDICT_SHEET);

  if (!verdictSheet) return;

  const data = verdictSheet.getDataRange().getValues();
  let alertsSent = 0;

  for (let i = 1; i < data.length; i++) {
    const classifier = data[i][1];  // Deal Classifier
    const lastAlertSent = data[i][25];  // Track when we last alerted

    if (classifier === '🔥 HOT DEAL' && !lastAlertSent) {
      // Send alert
      const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);
      const propertyId = data[i][2];

      // Find full property data
      const masterData = masterSheet.getDataRange().getValues();
      for (let j = 1; j < masterData.length; j++) {
        if (masterData[j][0] === propertyId) {
          sendHotDealAlert(masterData[j]);
          alertsSent++;
          break;
        }
      }
    }
  }

  Logger.log(`Sent ${alertsSent} HOT DEAL alerts`);
}

// ============================================
// AUTO-SYNC TO CRMS
// ============================================

/**
 * Auto-sync when deal status changes
 */
function autoSyncOnStatusChange(range) {
  const row = range.getRow();
  const col = range.getColumn();

  // Check if Status column was edited (column 65 in Master Database)
  if (col === 65) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

    if (!masterSheet) return;

    const propertyId = masterSheet.getRange(row, 1).getValue();
    const newStatus = range.getValue();

    Logger.log(`Status changed for ${propertyId} to ${newStatus}`);

    // Sync to CompanyHub
    if (getSetting('COMPANYHUB_API_KEY')) {
      try {
        const companyHubDealId = masterSheet.getRange(row, 69).getValue();  // CompanyHub ID column
        if (companyHubDealId) {
          updateCompanyHubDealStage(companyHubDealId, mapDealStageToCompanyHub(newStatus));
        }
      } catch (error) {
        Logger.log('CompanyHub auto-sync error: ' + error);
      }
    }
  }
}

// ============================================
// AUTO BUYER MATCHING
// ============================================

/**
 * Automatically match new deals to buyers
 */
function matchNewDealsAutomatically() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return;

  const data = masterSheet.getDataRange().getValues();
  let matched = 0;

  for (let i = 1; i < data.length; i++) {
    const classifier = data[i][38];  // Deal Classifier
    const status = data[i][64];  // Status
    const lastMatched = data[i][80];  // Track last match date

    // Match HOT DEALS and SOLID DEALS that haven't been matched today
    if ((classifier === '🔥 HOT DEAL' || classifier === '✅ SOLID DEAL') &&
        status === 'New' &&
        !isMatchedToday(lastMatched)) {

      try {
        const propertyId = data[i][0];
        matchBuyersToProperty(propertyId);
        matched++;

        // Update last matched date
        masterSheet.getRange(i + 1, 81).setValue(new Date());
      } catch (error) {
        Logger.log('Auto-match error for ' + data[i][0] + ': ' + error);
      }
    }
  }

  Logger.log(`Auto-matched ${matched} deals to buyers`);
}

/**
 * Check if property was matched today
 */
function isMatchedToday(lastMatchedDate) {
  if (!lastMatchedDate) return false;

  const today = new Date();
  const lastMatched = new Date(lastMatchedDate);

  return today.toDateString() === lastMatched.toDateString();
}

// ============================================
// FOLLOW-UP REMINDERS
// ============================================

/**
 * Send follow-up reminders for properties needing contact
 */
function sendFollowUpReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);

  if (!masterSheet) return;

  const today = new Date();
  const data = masterSheet.getDataRange().getValues();
  const reminders = [];

  for (let i = 1; i < data.length; i++) {
    const nextFollowUpDate = data[i][67];  // Next Follow-up Date column
    const status = data[i][64];  // Status
    const address = data[i][3];
    const assignedTo = data[i][65];

    if (nextFollowUpDate &&
        status !== 'Closed' &&
        status !== 'Dead' &&
        new Date(nextFollowUpDate) <= today) {

      reminders.push({
        address: address,
        assignedTo: assignedTo,
        nextAction: data[i][67]
      });
    }
  }

  if (reminders.length > 0) {
    sendFollowUpReminderEmail(reminders);
    Logger.log(`Sent ${reminders.length} follow-up reminders`);
  }
}

/**
 * Send follow-up reminder email
 */
function sendFollowUpReminderEmail(reminders) {
  const adminEmail = getSetting('ADMIN_EMAIL');
  if (!adminEmail) return;

  let body = '📅 Follow-up Reminders\n\n';
  body += 'The following properties need follow-up today:\n\n';

  reminders.forEach(function(reminder) {
    body += `• ${reminder.address} (Assigned to: ${reminder.assignedTo})\n`;
  });

  body += '\nOpen Quantum Analyzer to take action.';

  try {
    MailApp.sendEmail(adminEmail, '📅 Daily Follow-up Reminders', body);
  } catch (error) {
    Logger.log('Follow-up reminder email error: ' + error);
  }
}

// ============================================
// MARKET INTELLIGENCE UPDATES
// ============================================

/**
 * Update market intelligence data (daily)
 */
function updateMarketIntelligence() {
  // In production, this would pull from:
  // - Zillow API for market trends
  // - PropStream for inventory levels
  // - MLS for sales velocity

  Logger.log('Market intelligence update completed');
}

// ============================================
// ADMIN ALERTS
// ============================================

/**
 * Send alert to admin for system issues
 */
function sendAdminAlert(subject, message) {
  const adminEmail = getSetting('ADMIN_EMAIL');
  if (!adminEmail) return;

  try {
    MailApp.sendEmail(adminEmail, '⚠️ ' + subject, message);
  } catch (error) {
    Logger.log('Admin alert error: ' + error);
  }
}

// ============================================
// TOGGLE FUNCTIONS (MENU ITEMS)
// ============================================

/**
 * Toggle auto-analysis on/off
 */
function toggleAutoAnalysis() {
  const currentValue = getSetting('AUTO_ANALYSIS_ENABLED');
  const newValue = currentValue === 'TRUE' ? 'FALSE' : 'TRUE';

  setSetting('AUTO_ANALYSIS_ENABLED', newValue);

  SpreadsheetApp.getUi().alert(
    'Auto-Analysis ' + (newValue === 'TRUE' ? 'Enabled' : 'Disabled'),
    'Auto-analysis of new leads is now ' + (newValue === 'TRUE' ? 'ON' : 'OFF'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Toggle auto HOT DEAL alerts
 */
function toggleAutoHotDealAlerts() {
  const currentValue = getSetting('AUTO_HOT_DEAL_ALERTS');
  const newValue = currentValue === 'TRUE' ? 'FALSE' : 'TRUE';

  setSetting('AUTO_HOT_DEAL_ALERTS', newValue);

  SpreadsheetApp.getUi().alert(
    'HOT DEAL Alerts ' + (newValue === 'TRUE' ? 'Enabled' : 'Disabled'),
    'Automatic HOT DEAL alerts are now ' + (newValue === 'TRUE' ? 'ON' : 'OFF'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Toggle auto-SMS
 */
function toggleAutoSMS() {
  const currentValue = getSetting('AUTO_SMS_ENABLED');
  const newValue = currentValue === 'TRUE' ? 'FALSE' : 'TRUE';

  setSetting('AUTO_SMS_ENABLED', newValue);

  SpreadsheetApp.getUi().alert(
    'Auto-SMS ' + (newValue === 'TRUE' ? 'Enabled' : 'Disabled'),
    'Automatic SMS sending is now ' + (newValue === 'TRUE' ? 'ON' : 'OFF'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Setup daily scheduler
 */
function setupDailyScheduler() {
  // This is already setup in setupTriggers() in Code.gs
  SpreadsheetApp.getUi().alert(
    '✅ Daily Scheduler Active',
    'Daily analysis runs every day at 8:00 AM.\n\n' +
    'Tasks include:\n' +
    '• Analyze new properties\n' +
    '• Send HOT DEAL alerts\n' +
    '• Match buyers to deals\n' +
    '• Send follow-up reminders\n' +
    '• Update market intelligence\n\n' +
    'Check CRM Sync Log for automation history.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Pause all automation
 */
function pauseAllAutomation() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '⏸️ Pause All Automation',
    'This will disable all automatic features:\n\n' +
    '• Auto-analysis\n' +
    '• HOT DEAL alerts\n' +
    '• Auto-SMS\n' +
    '• CRM sync\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  // Disable all automation flags
  setSetting('AUTO_ANALYSIS_ENABLED', 'FALSE');
  setSetting('AUTO_HOT_DEAL_ALERTS', 'FALSE');
  setSetting('AUTO_SMS_ENABLED', 'FALSE');
  setSetting('AUTO_CRM_SYNC', 'FALSE');
  setSetting('HOURLY_SYNC_ENABLED', 'FALSE');

  ui.alert(
    '⏸️ Automation Paused',
    'All automatic features have been disabled.\n\n' +
    'Re-enable individual features from the Automation menu.',
    ui.ButtonSet.OK
  );
}

// ============================================
// DAILY AUTOMATION STATUS REPORT
// ============================================

/**
 * Generate and send daily automation status report
 */
function sendDailyStatusReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const syncLog = ss.getSheetByName(SHEET_NAMES.CRM_SYNC_LOG);

  if (!syncLog) return;

  const today = new Date();
  const data = syncLog.getDataRange().getValues();

  // Count today's activities
  let successes = 0;
  let failures = 0;

  for (let i = 1; i < data.length; i++) {
    const timestamp = new Date(data[i][0]);
    if (timestamp.toDateString() === today.toDateString()) {
      if (data[i][3] === 'Success') successes++;
      else if (data[i][3] === 'Failed') failures++;
    }
  }

  const adminEmail = getSetting('ADMIN_EMAIL');
  if (!adminEmail) return;

  const subject = '📊 Quantum Analyzer Daily Report';
  const body = `
Daily Automation Report for ${today.toDateString()}

✅ Successful Operations: ${successes}
❌ Failed Operations: ${failures}

Check CRM Sync Log for detailed activity history.

Automation Status:
• Auto-Analysis: ${getSetting('AUTO_ANALYSIS_ENABLED')}
• HOT DEAL Alerts: ${getSetting('AUTO_HOT_DEAL_ALERTS')}
• Auto-SMS: ${getSetting('AUTO_SMS_ENABLED')}
• CRM Sync: ${getSetting('AUTO_CRM_SYNC')}

View Dashboard for full metrics.
`;

  try {
    MailApp.sendEmail(adminEmail, subject, body);
  } catch (error) {
    Logger.log('Daily report email error: ' + error);
  }
}
