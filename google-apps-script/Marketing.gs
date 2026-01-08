/**
 * Marketing Center Functions
 * Manage marketing campaigns, buyer lists, and lead generation
 */

/**
 * Open Marketing Center
 */
function openMarketingCenter() {
  const html = HtmlService.createHtmlOutputFromFile('MarketingCenter')
    .setWidth(900)
    .setHeight(650)
    .setTitle('📢 Marketing Center');

  SpreadsheetApp.getUi().showModalDialog(html, 'Marketing Center');
}

/**
 * Blast deal to buyers list
 */
function blastDealToBuyers(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dealsSheet = ss.getSheetByName('Active Deals');
  const buyersSheet = ss.getSheetByName('Buyers');

  if (!dealsSheet || !buyersSheet) {
    throw new Error('Required sheets not found');
  }

  // Get deal details
  const dealsData = dealsSheet.getDataRange().getValues();
  let dealInfo = null;

  for (let i = 1; i < dealsData.length; i++) {
    if (dealsData[i][0] === dealId) {
      dealInfo = {
        dealId: dealsData[i][0],
        address: dealsData[i][2],
        dealType: dealsData[i][3],
        price: dealsData[i][6],
        fee: dealsData[i][7]
      };
      break;
    }
  }

  if (!dealInfo) {
    throw new Error('Deal not found');
  }

  // Get active buyers
  const buyersData = buyersSheet.getDataRange().getValues();
  let sentCount = 0;

  for (let i = 1; i < buyersData.length; i++) {
    const buyerActive = buyersData[i][9];
    const buyerEmail = buyersData[i][2];
    const buyerName = buyersData[i][1];

    if (buyerActive === true || buyerActive === 'Yes') {
      sendDealNotification(buyerEmail, buyerName, dealInfo);
      sentCount++;
    }
  }

  // Log the blast
  logMarketingActivity('Buyer Blast', dealId, sentCount);

  return sentCount;
}

/**
 * Send deal notification to buyer
 */
function sendDealNotification(buyerEmail, buyerName, dealInfo) {
  const companyName = getSetting('Company Name') || 'Quantum RE Analyzer';

  const subject = `New Deal Alert: ${dealInfo.address}`;

  const body = `Hi ${buyerName},

We have a new ${dealInfo.dealType} opportunity that might interest you:

📍 Property Address: ${dealInfo.address}
💰 Price: $${formatNumber(dealInfo.price)}
📊 Deal Type: ${dealInfo.dealType}
🎯 Assignment Fee: $${formatNumber(dealInfo.fee)}

This is a fresh opportunity and won't last long!

Interested? Reply to this email or call us to get more details.

Best regards,
${companyName} Team

---
Deal ID: ${dealInfo.dealId}
`;

  try {
    MailApp.sendEmail({
      to: buyerEmail,
      subject: subject,
      body: body
    });
    return true;
  } catch (error) {
    Logger.log(`Error sending to ${buyerEmail}: ` + error.message);
    return false;
  }
}

/**
 * Create marketing campaign
 */
function createMarketingCampaign(campaignData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let campaignSheet = ss.getSheetByName('Marketing Campaigns');

  if (!campaignSheet) {
    campaignSheet = ss.insertSheet('Marketing Campaigns');
    const headers = [
      'Campaign ID', 'Name', 'Type', 'Start Date', 'End Date',
      'Budget', 'Leads Generated', 'Cost Per Lead', 'Status', 'Notes'
    ];
    campaignSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    campaignSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  const campaignId = 'CAMP-' + generateId();

  campaignSheet.appendRow([
    campaignId,
    campaignData.name,
    campaignData.type,
    campaignData.startDate,
    campaignData.endDate,
    campaignData.budget,
    0, // Leads generated (starts at 0)
    0, // Cost per lead (calculated later)
    'Active',
    campaignData.notes || ''
  ]);

  logMarketingActivity('Campaign Created', campaignId, campaignData.name);

  return campaignId;
}

/**
 * Track marketing lead
 */
function trackMarketingLead(leadSource, contactInfo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let leadsSheet = ss.getSheetByName('Marketing Leads');

  if (!leadsSheet) {
    leadsSheet = ss.insertSheet('Marketing Leads');
    const headers = [
      'Lead ID', 'Date', 'Source', 'Name', 'Phone', 'Email',
      'Property Address', 'Status', 'Campaign ID', 'Notes'
    ];
    leadsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    leadsSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  const leadId = 'LEAD-' + generateId();

  leadsSheet.appendRow([
    leadId,
    new Date(),
    leadSource,
    contactInfo.name,
    contactInfo.phone,
    contactInfo.email || '',
    contactInfo.propertyAddress || '',
    'New',
    contactInfo.campaignId || '',
    contactInfo.notes || ''
  ]);

  // Update campaign stats
  if (contactInfo.campaignId) {
    updateCampaignStats(contactInfo.campaignId);
  }

  logMarketingActivity('Lead Tracked', leadId, leadSource);

  return leadId;
}

/**
 * Update campaign statistics
 */
function updateCampaignStats(campaignId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignSheet = ss.getSheetByName('Marketing Campaigns');
  const leadsSheet = ss.getSheetByName('Marketing Leads');

  if (!campaignSheet || !leadsSheet) return;

  const campaignData = campaignSheet.getDataRange().getValues();
  const leadsData = leadsSheet.getDataRange().getValues();

  // Count leads for this campaign
  let leadCount = 0;
  for (let i = 1; i < leadsData.length; i++) {
    if (leadsData[i][8] === campaignId) {
      leadCount++;
    }
  }

  // Update campaign
  for (let i = 1; i < campaignData.length; i++) {
    if (campaignData[i][0] === campaignId) {
      const budget = campaignData[i][5];
      const costPerLead = leadCount > 0 ? budget / leadCount : 0;

      campaignSheet.getRange(i + 1, 7).setValue(leadCount); // Leads generated
      campaignSheet.getRange(i + 1, 8).setValue(costPerLead); // Cost per lead
      break;
    }
  }
}

/**
 * Generate marketing report
 */
function generateMarketingReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignSheet = ss.getSheetByName('Marketing Campaigns');
  const leadsSheet = ss.getSheetByName('Marketing Leads');

  if (!campaignSheet) {
    SpreadsheetApp.getUi().alert('No marketing data found');
    return;
  }

  const campaignData = campaignSheet.getDataRange().getValues();
  const leadsData = leadsSheet ? leadsSheet.getDataRange().getValues() : [];

  let totalBudget = 0;
  let totalLeads = 0;
  let activeCampaigns = 0;

  for (let i = 1; i < campaignData.length; i++) {
    totalBudget += Number(campaignData[i][5]) || 0;
    totalLeads += Number(campaignData[i][6]) || 0;
    if (campaignData[i][8] === 'Active') {
      activeCampaigns++;
    }
  }

  const avgCostPerLead = totalLeads > 0 ? totalBudget / totalLeads : 0;

  // Lead sources breakdown
  const leadSources = {};
  for (let i = 1; i < leadsData.length; i++) {
    const source = leadsData[i][2];
    leadSources[source] = (leadSources[source] || 0) + 1;
  }

  let message = `
MARKETING REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CAMPAIGN OVERVIEW
   Active Campaigns: ${activeCampaigns}
   Total Budget Spent: ${formatCurrency(totalBudget)}
   Total Leads Generated: ${totalLeads}
   Average Cost Per Lead: ${formatCurrency(avgCostPerLead)}

📈 LEAD SOURCES
`;

  for (let source in leadSources) {
    message += `   ${source}: ${leadSources[source]} leads\n`;
  }

  message += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;

  SpreadsheetApp.getUi().alert('Marketing Report', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Export buyers list to CSV
 */
function exportBuyersList() {
  const csv = exportSheetToCSV('Buyers');

  const ui = SpreadsheetApp.getUi();
  ui.alert('Buyers List Export',
    'Copy the data from the "Buyers" sheet and paste into a text file, then save as .csv',
    ui.ButtonSet.OK);

  return csv;
}

/**
 * Segment buyers by criteria
 */
function segmentBuyers(criteria) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buyersSheet = ss.getSheetByName('Buyers');

  if (!buyersSheet) return [];

  const data = buyersSheet.getDataRange().getValues();
  const segmented = [];

  for (let i = 1; i < data.length; i++) {
    const buyer = {
      id: data[i][0],
      name: data[i][1],
      email: data[i][2],
      investmentType: data[i][5],
      maxBudget: data[i][6],
      active: data[i][9]
    };

    // Apply criteria
    if (criteria.investmentType && buyer.investmentType !== criteria.investmentType) {
      continue;
    }

    if (criteria.minBudget && buyer.maxBudget < criteria.minBudget) {
      continue;
    }

    if (criteria.activeOnly && !buyer.active) {
      continue;
    }

    segmented.push(buyer);
  }

  return segmented;
}

/**
 * Log marketing activity
 */
function logMarketingActivity(activityType, identifier, details) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('Marketing Activity Log');

  if (!logSheet) {
    logSheet = ss.insertSheet('Marketing Activity Log');
    logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Activity Type', 'Identifier', 'Details']]);
    logSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  logSheet.appendRow([new Date(), activityType, identifier, details]);
}

/**
 * Schedule social media posts
 */
function scheduleSocialPost(postData) {
  // This would integrate with social media APIs
  // For now, just log the intent

  logMarketingActivity('Social Post Scheduled',
    postData.platform,
    `${postData.content.substring(0, 50)}... - Scheduled for ${postData.scheduledDate}`);

  return true;
}
