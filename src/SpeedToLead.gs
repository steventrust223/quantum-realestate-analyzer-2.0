/**
 * Quantum Real Estate Analyzer - Speed-to-Lead Module
 * Handles lead timing, SLA management, and escalation
 */

// ============================================================
// SPEED-TO-LEAD CORE FUNCTIONS
// ============================================================

/**
 * Computes speed-to-lead scores and SLA status for all leads
 */
function computeSpeedToLeadScores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  logEvent('STL', 'Computing speed-to-lead scores');

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    // Get lead arrival timestamp
    const arrivalTimestamp = row[colMap['Lead Arrival Timestamp'] - 1];
    if (!arrivalTimestamp) continue;

    const arrivalDate = new Date(arrivalTimestamp);
    const lastContactedAt = row[colMap['Last Contacted At'] - 1];

    // Calculate response time
    let responseTime = null;
    if (lastContactedAt) {
      const contactDate = new Date(lastContactedAt);
      responseTime = (contactDate - arrivalDate) / (1000 * 60); // minutes
    } else {
      responseTime = (now - arrivalDate) / (1000 * 60); // minutes since arrival
    }

    // Determine SLA tier
    const slaTier = getSLATier(responseTime);

    // Update SLA Tier
    if (colMap['SLA Tier']) {
      masterSheet.getRange(rowNum, colMap['SLA Tier']).setValue(
        `TIER_${slaTier.maxMinutes <= 5 ? '1' : slaTier.maxMinutes <= 15 ? '2' : slaTier.maxMinutes <= 60 ? '3' : 'BREACH'}`
      );
    }

    // Update SLA Status
    if (colMap['SLA Status']) {
      masterSheet.getRange(rowNum, colMap['SLA Status']).setValue(slaTier.status);
    }

    // Apply conditional formatting based on status
    if (colMap['SLA Status']) {
      const statusCell = masterSheet.getRange(rowNum, colMap['SLA Status']);
      if (slaTier.status === 'BREACH') {
        statusCell.setBackground('#FFCDD2').setFontWeight('bold');
      } else if (slaTier.status === 'SLOW') {
        statusCell.setBackground('#FFE0B2');
      } else if (slaTier.status === 'ACCEPTABLE') {
        statusCell.setBackground('#BBDEFB');
      } else {
        statusCell.setBackground('#C8E6C9');
      }
    }
  }

  logEvent('STL', 'Speed-to-lead scores computed');
}

/**
 * Checks SLA status and triggers escalations
 * Called by time-based trigger every 5 minutes
 */
function checkSpeedToLeadSLA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return;

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();
  const now = new Date();

  const escalations = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dealId = row[colMap['Deal ID'] - 1];
    if (!dealId) continue;

    // Skip if already contacted
    const lastContactedAt = row[colMap['Last Contacted At'] - 1];
    if (lastContactedAt) continue;

    // Skip if status is not actionable
    const statusStage = row[colMap['Status Stage'] - 1];
    if (statusStage && !['New Lead', 'Contacted'].includes(statusStage)) continue;

    // Check arrival time
    const arrivalTimestamp = row[colMap['Lead Arrival Timestamp'] - 1];
    if (!arrivalTimestamp) continue;

    const arrivalDate = new Date(arrivalTimestamp);
    const minutesSinceArrival = (now - arrivalDate) / (1000 * 60);

    // Check if needs escalation
    const slaTier = getSLATier(minutesSinceArrival);
    if (slaTier.escalation) {
      escalations.push({
        dealId: dealId,
        address: row[colMap['Address'] - 1],
        minutesWaiting: Math.round(minutesSinceArrival),
        slaStatus: slaTier.status,
        verdict: row[colMap['Verdict'] - 1] || 'TBD'
      });
    }
  }

  // Process escalations
  if (escalations.length > 0) {
    processSTLEscalations(escalations);
  }

  return escalations;
}

/**
 * Processes speed-to-lead escalations
 * P4 FIX: Complete escalation processing with all steps
 * @param {Array} escalations - List of escalation objects
 */
function processSTLEscalations(escalations) {
  logEvent('STL', `Processing ${escalations.length} SLA escalations`);

  // Sort by priority (HOT/SOLID verdicts first, then by time waiting)
  escalations.sort((a, b) => {
    const priorityOrder = { 'HOT': 0, 'SOLID': 1, 'HOLD': 2, 'PASS': 3, 'TBD': 4 };
    const aPriority = priorityOrder[a.verdict] ?? 4;
    const bPriority = priorityOrder[b.verdict] ?? 4;

    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.minutesWaiting - a.minutesWaiting;
  });

  // P4 FIX: Execute full escalation for each overdue lead
  const escalationResults = [];
  escalations.forEach(esc => {
    // Only execute full escalation for BREACH status
    if (esc.slaStatus === 'BREACH') {
      const result = executeEscalation(esc);
      escalationResults.push(result);
    } else {
      // For SLOW status, just queue for attention
      queueCRMEscalation(esc);
    }
  });

  // Log high-priority escalations
  const highPriority = escalations.filter(e => e.verdict === 'HOT' || e.verdict === 'SOLID');
  if (highPriority.length > 0) {
    logEvent('STL', `HIGH PRIORITY: ${highPriority.length} hot/solid leads awaiting contact`);

    // P4 FIX: Send notification for high-priority leads
    sendSTLNotification(highPriority);
  }

  // Log summary
  const successCount = escalationResults.filter(r => r.success).length;
  logEvent('STL', `Escalation processing complete: ${successCount}/${escalationResults.length} successful`);
}

/**
 * Queues an escalation for CRM sync
 */
function queueCRMEscalation(escalation) {
  logSync('QUEUE', 'ESCALATION', escalation.dealId, 'PENDING',
    `${escalation.slaStatus}: ${escalation.minutesWaiting}min waiting`);
}

// ============================================================
// SLA PROCESSING
// ============================================================

/**
 * Processes speed-to-lead queue and triggers actions
 */
function processSpeedToLeadQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  logEvent('STL', 'Processing speed-to-lead queue');

  // Check SLA status
  const escalations = checkSpeedToLeadSLA();

  // Update scores
  computeSpeedToLeadScores();

  // Report summary
  if (escalations.length > 0) {
    ss.toast(`${escalations.length} leads need attention!`, 'SLA Alert', 10);
  } else {
    ss.toast('All leads within SLA', 'STL Status', 3);
  }

  return escalations;
}

/**
 * Runs SLA escalations (menu action)
 */
function runSLAEscalations() {
  const escalations = processSpeedToLeadQueue();

  if (escalations.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('No escalations needed', 'SLA Check', 3);
    return;
  }

  // Show escalation summary
  let message = `${escalations.length} leads need attention:\n`;
  escalations.slice(0, 5).forEach(e => {
    message += `- ${e.address}: ${e.slaStatus} (${e.minutesWaiting}min)\n`;
  });
  if (escalations.length > 5) {
    message += `... and ${escalations.length - 5} more`;
  }

  SpreadsheetApp.getUi().alert('SLA Escalations', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ============================================================
// LEAD TIMING FUNCTIONS
// ============================================================

/**
 * Records first contact time for a lead
 * @param {string} dealId - Deal ID
 */
function recordFirstContact(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet) return { error: 'Master sheet not found' };

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  for (let i = 1; i < data.length; i++) {
    if (data[i][colMap['Deal ID'] - 1] === dealId) {
      const rowNum = i + 1;

      // Only set if not already set
      if (!data[i][colMap['Last Contacted At'] - 1]) {
        masterSheet.getRange(rowNum, colMap['Last Contacted At']).setValue(new Date());

        // Update SLA status
        const arrivalTimestamp = data[i][colMap['Lead Arrival Timestamp'] - 1];
        if (arrivalTimestamp) {
          const responseTime = (new Date() - new Date(arrivalTimestamp)) / (1000 * 60);
          const slaTier = getSLATier(responseTime);

          if (colMap['SLA Status']) {
            masterSheet.getRange(rowNum, colMap['SLA Status']).setValue(slaTier.status);
          }
        }

        logEvent('STL', `First contact recorded for ${dealId}`);
        return { success: true, dealId: dealId };
      } else {
        return { info: 'Already contacted', dealId: dealId };
      }
    }
  }

  return { error: 'Deal not found' };
}

/**
 * Gets speed-to-lead statistics
 * @returns {Object} STL statistics
 */
function getSTLStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { error: 'No data available' };
  }

  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();

  const stats = {
    total: 0,
    contacted: 0,
    awaiting: 0,
    optimal: 0,
    acceptable: 0,
    slow: 0,
    breach: 0,
    avgResponseTime: 0,
    responseTimes: []
  };

  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[colMap['Deal ID'] - 1]) continue;

    stats.total++;

    const arrivalTimestamp = row[colMap['Lead Arrival Timestamp'] - 1];
    const lastContactedAt = row[colMap['Last Contacted At'] - 1];

    if (lastContactedAt) {
      stats.contacted++;

      if (arrivalTimestamp) {
        const responseTime = (new Date(lastContactedAt) - new Date(arrivalTimestamp)) / (1000 * 60);
        stats.responseTimes.push(responseTime);
      }
    } else {
      stats.awaiting++;
    }

    // Count by SLA status
    const slaStatus = row[colMap['SLA Status'] - 1] || '';
    if (slaStatus === 'OPTIMAL') stats.optimal++;
    else if (slaStatus === 'ACCEPTABLE') stats.acceptable++;
    else if (slaStatus === 'SLOW') stats.slow++;
    else if (slaStatus === 'BREACH') stats.breach++;
  }

  // Calculate average response time
  if (stats.responseTimes.length > 0) {
    const sum = stats.responseTimes.reduce((a, b) => a + b, 0);
    stats.avgResponseTime = Math.round(sum / stats.responseTimes.length);
  }

  // Calculate percentages
  stats.contactedPercent = stats.total > 0 ? Math.round(stats.contacted / stats.total * 100) : 0;
  stats.optimalPercent = stats.total > 0 ? Math.round(stats.optimal / stats.total * 100) : 0;

  return stats;
}

// ============================================================
// SLA CONFIGURATION
// ============================================================

/**
 * Gets current SLA configuration
 * @returns {Object} SLA thresholds
 */
function getSLAConfig() {
  return {
    tier1: {
      minutes: parseFloat(getSetting('stl_tier1_minutes', '5')),
      penalty: parseFloat(getSetting('stl_tier1_penalty', '0')),
      status: 'OPTIMAL',
      escalation: false
    },
    tier2: {
      minutes: parseFloat(getSetting('stl_tier2_minutes', '15')),
      penalty: parseFloat(getSetting('stl_tier2_penalty', '-5')),
      status: 'ACCEPTABLE',
      escalation: false
    },
    tier3: {
      minutes: parseFloat(getSetting('stl_tier3_minutes', '60')),
      penalty: parseFloat(getSetting('stl_tier3_penalty', '-15')),
      status: 'SLOW',
      escalation: true
    },
    breach: {
      minutes: 9999,
      penalty: parseFloat(getSetting('stl_breach_penalty', '-25')),
      status: 'BREACH',
      escalation: true
    }
  };
}

/**
 * Updates SLA thresholds
 * @param {Object} config - New SLA configuration
 */
function updateSLAConfig(config) {
  if (config.tier1Minutes) setSetting('stl_tier1_minutes', config.tier1Minutes);
  if (config.tier2Minutes) setSetting('stl_tier2_minutes', config.tier2Minutes);
  if (config.tier3Minutes) setSetting('stl_tier3_minutes', config.tier3Minutes);
  if (config.tier1Penalty !== undefined) setSetting('stl_tier1_penalty', config.tier1Penalty);
  if (config.tier2Penalty !== undefined) setSetting('stl_tier2_penalty', config.tier2Penalty);
  if (config.tier3Penalty !== undefined) setSetting('stl_tier3_penalty', config.tier3Penalty);
  if (config.breachPenalty !== undefined) setSetting('stl_breach_penalty', config.breachPenalty);

  logEvent('STL', 'SLA configuration updated');
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

/**
 * P4 FIX: Complete escalation logic for overdue leads
 * Marks lead as overdue, assigns fallback owner, sends notification, creates CRM task
 * @param {Object} escalation - Escalation data object
 * @returns {Object} Result of escalation actions
 */
function executeEscalation(escalation) {
  const result = {
    dealId: escalation.dealId,
    actions: [],
    success: true
  };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet) {
    result.success = false;
    result.error = 'Master sheet not found';
    return result;
  }

  // Find the deal row
  const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);

  const data = masterSheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][colMap['Deal ID'] - 1] === escalation.dealId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    result.success = false;
    result.error = 'Deal not found';
    return result;
  }

  // P4 FIX Step 1: Mark lead as overdue
  if (colMap['SLA Status']) {
    masterSheet.getRange(rowIndex, colMap['SLA Status']).setValue('OVERDUE');
    masterSheet.getRange(rowIndex, colMap['SLA Status']).setBackground('#FFCDD2').setFontWeight('bold');
    result.actions.push('Marked as OVERDUE');
    logEvent('STL', `Deal ${escalation.dealId} marked as OVERDUE`);
  }

  // P4 FIX Step 2: Assign fallback owner
  const fallbackOwner = getSetting('stl_fallback_owner', '');
  const currentOwner = data[rowIndex - 1][colMap['Assigned To'] - 1] || '';

  if (fallbackOwner && !currentOwner && colMap['Assigned To']) {
    masterSheet.getRange(rowIndex, colMap['Assigned To']).setValue(fallbackOwner);
    result.actions.push(`Assigned to fallback owner: ${fallbackOwner}`);
    logEvent('STL', `Deal ${escalation.dealId} assigned to fallback owner: ${fallbackOwner}`);
  } else if (!currentOwner && colMap['Assigned To']) {
    // No fallback configured, assign to default
    masterSheet.getRange(rowIndex, colMap['Assigned To']).setValue('UNASSIGNED - NEEDS ATTENTION');
    result.actions.push('Marked as UNASSIGNED');
  }

  // P4 FIX Step 3: Send internal email notification
  const notificationResult = sendSTLNotification([escalation]);
  if (notificationResult && notificationResult.sent) {
    result.actions.push(`Email notification sent to ${notificationResult.recipient}`);
  }

  // P4 FIX Step 4: Create CRM task if enabled
  const crmTaskEnabled = getSetting('stl_create_crm_task', 'false') === 'true';
  if (crmTaskEnabled) {
    try {
      const taskResult = createCRMEscalationTask(escalation);
      if (taskResult.created) {
        result.actions.push(`CRM task created in ${taskResult.service}: ${taskResult.taskId}`);
        logEvent('STL', `CRM task created for ${escalation.dealId}`);
      }
    } catch (error) {
      logEvent('STL', `Failed to create CRM task: ${error.message}`);
    }
  }

  // P4 FIX Step 5: Log the escalation
  logSync('STL', 'ESCALATION', escalation.dealId, 'EXECUTED', result.actions.join('; '));

  return result;
}

/**
 * Sends STL notification for urgent leads
 * P4 FIX: Complete implementation with actual email sending
 * @param {Array} urgentLeads - List of urgent leads
 * @returns {Object} Notification result
 */
function sendSTLNotification(urgentLeads) {
  const emailEnabled = getSetting('notification_email_enabled', 'false') === 'true';
  if (!emailEnabled) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  const recipientEmail = getSetting('notification_email', '');
  if (!recipientEmail) {
    return { sent: false, reason: 'No recipient email configured' };
  }

  let subject = `[Quantum] ${urgentLeads.length} Hot Leads Need Attention`;
  let body = 'The following high-priority leads need immediate contact:\n\n';

  urgentLeads.forEach(lead => {
    body += `- ${lead.address}\n`;
    body += `  Deal ID: ${lead.dealId}\n`;
    body += `  Verdict: ${lead.verdict}\n`;
    body += `  Waiting: ${lead.minutesWaiting} minutes\n`;
    body += `  Status: ${lead.slaStatus}\n\n`;
  });

  body += '\n---\n';
  body += 'Actions Required:\n';
  body += '1. Contact these leads immediately\n';
  body += '2. Update status in Master Database\n';
  body += '3. Record contact in system\n';
  body += '\nLogin to your Quantum dashboard to take action.';
  body += '\n\nThis is an automated message from Quantum Real Estate Analyzer.';

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      body: body
    });
    logEvent('STL', `Escalation notification sent to ${recipientEmail} for ${urgentLeads.length} leads`);
    return { sent: true, recipient: recipientEmail };
  } catch (error) {
    logError('STL', 'Failed to send notification: ' + error.message, error.stack);
    return { sent: false, reason: error.message };
  }
}

// ============================================================
// DASHBOARD DATA
// ============================================================

/**
 * Gets STL data for dashboard display
 * @returns {Object} Dashboard-ready STL data
 */
function getSTLDashboardData() {
  const stats = getSTLStatistics();
  const escalations = checkSpeedToLeadSLA();

  return {
    statistics: stats,
    pendingEscalations: escalations.length,
    escalationList: escalations.slice(0, 10),
    slaConfig: getSLAConfig(),
    healthStatus: stats.breach > 0 ? 'WARNING' : stats.slow > 0 ? 'CAUTION' : 'HEALTHY'
  };
}
