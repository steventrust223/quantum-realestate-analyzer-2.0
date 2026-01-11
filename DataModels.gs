/**
 * Quantum Real Estate Analyzer v2.0
 * Data Models & Column Definitions
 *
 * Defines column structures for all sheets
 * All 18+ key columns with AI/psychology data
 */

// ============================================
// IMPORT HUB SHEET
// ============================================

function initializeImportHubHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.IMPORT_HUB);
  if (!sheet) return;

  const headers = [
    'Import Date',
    'Source',  // Browse.AI, Ohmylead, Manual, etc.
    'Source URL',
    'Lead ID',
    'Property Address',
    'City',
    'State',
    'ZIP',
    'County',
    'Asking Price',
    'Bedrooms',
    'Bathrooms',
    'Square Feet',
    'Lot Size',
    'Year Built',
    'Property Type',  // SFR, Multi-family, Condo, etc.
    'Listing Status',
    'Days on Market',
    'Seller Name',
    'Seller Phone',
    'Seller Email',
    'MLS Number',
    'Photos URL',
    'Description',
    'Raw Data (JSON)',  // Full JSON from API
    'Processed?',  // Yes/No
    'Import Status',  // Pending, Validated, Error
    'Error Notes',
    'Processed Date'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Set column widths
  sheet.setColumnWidth(5, 250);  // Property Address
  sheet.setColumnWidth(24, 300); // Description
  sheet.setColumnWidth(25, 200); // Raw Data
}

// ============================================
// MASTER DATABASE SHEET
// ============================================

function initializeMasterDatabaseHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MASTER_DATABASE);
  if (!sheet) return;

  const headers = [
    // Property Identification
    'Property ID',
    'Import Date',
    'Lead Source',
    'Property Address',
    'City',
    'State',
    'ZIP',
    'County',
    'Latitude',
    'Longitude',

    // Property Details
    'Property Type',
    'Asking Price',
    'Bedrooms',
    'Bathrooms',
    'Square Feet',
    'Lot Size (Acres)',
    'Year Built',
    'Stories',
    'Garage',
    'Pool',

    // Financial Data
    'Estimated ARV',
    'ARV Source',  // Zillow, PropStream, Manual, AI
    'Estimated Repairs',
    'Repair Detail',
    'Comparable Sales (JSON)',

    // MAO Calculations (Dynamic per Strategy)
    'MAO - Wholesale',
    'MAO - Sub2',
    'MAO - Wraparound',
    'MAO - Rental',
    'MAO - JV',
    'Recommended MAO',

    // Scoring & Analytics
    'Equity %',
    'Market Volume Score',  // 1-10
    'Sales Velocity Score',  // 1-10
    'Exit Risk Score',  // 1-10 (10 = high risk)
    'Overall Deal Score',  // 1-100

    // Deal Classification
    'Deal Classifier',  // 🔥 HOT DEAL, 🧱 PORTFOLIO FOUNDATION, ✅ SOLID DEAL, ❌ PASS
    'Flip Strategy Recommendation',  // Assignment, Sub2, Wrap, Rental, JV, Virtual

    // Seller Information
    'Seller Name',
    'Seller Phone',
    'Seller Email',
    'Seller Motivation Score',  // 1-10
    'Seller Urgency',  // Low, Medium, High, URGENT
    'Hot Seller?',  // Yes/No (behavioral detection)
    'Seller Situation',  // Divorce, Probate, Job Loss, Inherited, etc.

    // Market Intelligence
    'Days on Market',
    'Market Trend',  // Rising, Stable, Declining
    'Location Heat',  // 1-10 (10 = hottest market)
    'Neighborhood Grade',  // A, B, C, D
    'School Rating',
    'Crime Index',
    'Walk Score',

    // AI Analysis
    'AI Notes',  // Human-readable insights
    'AI Confidence',  // 1-100%
    'Risk Warnings',  // Red flags identified by AI
    'Opportunity Notes',  // Upsides identified by AI
    'Last AI Analysis Date',

    // Psychology Layer
    'Seller Message',  // Psychologically optimized message
    'Recommended Approach',  // Consultative, Urgent, Educational, etc.
    'Follow-up Strategy',  // Timing and messaging cadence
    'Psychology Profile',  // Analytical, Emotional, Driver, etc.

    // Status & Tracking
    'Status',  // New, Analyzing, Contacted, Offer Made, Under Contract, Closed, Dead
    'Assigned To',  // Team member
    'Last Contact Date',
    'Next Follow-up Date',
    'Notes',

    // CRM Integration
    'CompanyHub ID',
    'SMS-iT Contact ID',
    'Ohmylead Lead ID',
    'Last CRM Sync',

    // Metadata
    'Created Date',
    'Last Updated',
    'Updated By'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Set column widths for readability
  sheet.setColumnWidth(4, 250);   // Property Address
  sheet.setColumnWidth(38, 300);  // Deal Classifier
  sheet.setColumnWidth(54, 400);  // AI Notes
  sheet.setColumnWidth(58, 300);  // Seller Message
  sheet.setColumnWidth(68, 200);  // Notes
}

// ============================================
// VERDICT SHEET (COMMAND CENTER)
// ============================================

function initializeVerdictSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.VERDICT_SHEET);
  if (!sheet) return;

  const headers = [
    'Rank',  // 1, 2, 3... (auto-sorted by Deal Score)
    'Deal Classifier',  // 🔥 HOT DEAL, 🧱 PORTFOLIO, ✅ SOLID, ❌ PASS
    'Property ID',
    'Property Address',
    'City/ZIP',

    // Key Metrics (Visible at a Glance)
    'Asking Price',
    'ARV',
    'Equity %',
    'Deal Score',
    'Strategy',  // Recommended flip strategy

    // Action Items
    'Hot Seller?',
    'Days on Market',
    'Status',
    'Assigned To',

    // AI Verdict
    'AI Verdict',  // 2-3 sentence summary
    'Risk Level',  // Low, Medium, High
    'Opportunity Level',  // Low, Medium, High, EXCEPTIONAL

    // Quick Actions (Buttons via script)
    'View Details',  // Link to Master Database row
    'Contact Seller',  // Opens messaging dialog
    'Make Offer',  // Opens offer calculator
    'Match Buyers',  // Runs buyer matching
    'Send to CRM',  // Syncs to CompanyHub

    // Seller Contact
    'Seller Name',
    'Seller Phone',
    'Seller Email',

    // Last Updated
    'Last Analysis',
    'Next Action Date'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Set column widths
  sheet.setColumnWidth(4, 250);   // Property Address
  sheet.setColumnWidth(16, 400);  // AI Verdict
}

// ============================================
// LEAD SCORING & RISK ASSESSMENT SHEET
// ============================================

function initializeLeadScoringHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LEAD_SCORING);
  if (!sheet) return;

  const headers = [
    'Property ID',
    'Property Address',

    // Equity Scoring
    'Asking Price',
    'ARV',
    'Equity $',
    'Equity %',
    'Equity Score',  // 1-10

    // Motivation Scoring
    'Seller Motivation',  // 1-10
    'Urgency Level',
    'Situation Type',
    'Days on Market',
    'Motivation Score',  // 1-10

    // Seller Behavior Analysis
    'Response Time (Hours)',
    'Communication Style',  // Quick, Detailed, Hesitant, etc.
    'Decision Maker?',  // Yes, No, Multiple
    'Price Flexibility',  // Firm, Negotiable, Desperate
    'Hot Seller?',
    'Behavior Score',  // 1-10

    // Location Heat
    'ZIP Code',
    'Market Trend',
    'Sales Velocity',
    'Inventory Level',
    'Appreciation Rate %',
    'Location Score',  // 1-10

    // Deal Structure Fit
    'Best Strategy',
    'Strategy Confidence',  // 1-100%
    'Alternate Strategies',
    'Structure Score',  // 1-10

    // Risk Assessment
    'Title Risk',  // Low, Medium, High
    'Market Risk',
    'Financial Risk',
    'Seller Risk',
    'Exit Risk',
    'Overall Risk Score',  // 1-10 (10 = highest risk)

    // Opportunity Assessment
    'Equity Opportunity',  // Low, Medium, High
    'Speed Opportunity',  // How fast can we move?
    'Creative Finance Fit',
    'Portfolio Fit',
    'Overall Opportunity Score',  // 1-10

    // Final Composite Score
    'Total Lead Score',  // 1-100 (weighted formula)
    'Recommendation',  // PURSUE AGGRESSIVELY, Contact, Monitor, Pass

    // AI Analysis
    'AI Confidence',
    'Key Insights',
    'Red Flags',

    // Metadata
    'Last Scored',
    'Score Version'  // Track scoring model version
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.setColumnWidth(2, 250);   // Property Address
  sheet.setColumnWidth(47, 400);  // Key Insights
}

// ============================================
// FLIP STRATEGY ENGINE SHEET
// ============================================

function initializeFlipStrategyHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.FLIP_STRATEGY);
  if (!sheet) return;

  const headers = [
    'Property ID',
    'Property Address',
    'ARV',
    'Asking Price',
    'Repairs',

    // Strategy 1: Wholesaling (Assignment)
    'Assignment - MAO',
    'Assignment - Estimated Fee',
    'Assignment - Profit Potential',
    'Assignment - Speed to Exit',  // Days
    'Assignment - Difficulty',  // Easy, Medium, Hard
    'Assignment - Score',  // 1-10

    // Strategy 2: Sub-To (Subject-To)
    'Sub2 - MAO',
    'Sub2 - Monthly Spread',
    'Sub2 - Existing Mortgage Balance',
    'Sub2 - Mortgage Payment',
    'Sub2 - Estimated Rent',
    'Sub2 - Monthly Cash Flow',
    'Sub2 - Score',  // 1-10

    // Strategy 3: Wraparound
    'Wrap - MAO',
    'Wrap - Wrap Note Amount',
    'Wrap - Interest Rate Spread',
    'Wrap - Monthly Spread',
    'Wrap - Balloon in Years',
    'Wrap - Total Profit Potential',
    'Wrap - Score',  // 1-10

    // Strategy 4: Rental (Buy & Hold)
    'Rental - MAO',
    'Rental - Estimated Rent',
    'Rental - Monthly Cash Flow',
    'Rental - Cash on Cash Return %',
    'Rental - Cap Rate %',
    'Rental - Equity Build (5yr)',
    'Rental - Score',  // 1-10

    // Strategy 5: JV / Partnership
    'JV - Structure Type',  // Equity split, Profit split, etc.
    'JV - Partner Needed',  // Capital, Credit, Expertise
    'JV - Estimated Joint Profit',
    'JV - Risk Level',
    'JV - Score',  // 1-10

    // Strategy 6: STR (Short-term Rental)
    'STR - Estimated Daily Rate',
    'STR - Occupancy Rate %',
    'STR - Monthly Gross Income',
    'STR - Monthly Net Income',
    'STR - Zoning Allowed?',
    'STR - Score',  // 1-10

    // Strategy 7: Virtual Wholesaling
    'Virtual - Local Market Knowledge',
    'Virtual - Title Company Contact',
    'Virtual - Buyer Network',
    'Virtual - Risk Level',
    'Virtual - Score',  // 1-10

    // Recommendation
    'Primary Strategy',
    'Primary Strategy Score',
    'Secondary Strategy',
    'Secondary Strategy Score',
    'Creative Combination?',  // e.g., "Sub2 then Wrap"

    // AI Reasoning
    'Why Primary Strategy?',  // AI explanation
    'Risks to Consider',
    'Opportunity Highlights',

    // Metadata
    'Last Analyzed',
    'Confidence Level'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.setColumnWidth(2, 250);   // Property Address
  sheet.setColumnWidth(61, 400);  // Why Primary Strategy?
}

// ============================================
// OFFERS & DISPOSITION SHEET
// ============================================

function initializeOffersDispositionHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.OFFERS_DISPOSITION);
  if (!sheet) return;

  const headers = [
    'Property ID',
    'Property Address',
    'Strategy',

    // Offer Details
    'Offer Date',
    'Offer Amount',
    'Offer Terms',  // Cash, Financing, Creative
    'Contingencies',
    'Closing Timeline',
    'Earnest Money',

    // Offer Status
    'Status',  // Pending, Accepted, Countered, Rejected, Expired
    'Seller Response',
    'Counter Offer Amount',
    'Counter Terms',
    'Response Date',

    // Negotiation Tracking
    'Initial Offer',
    'Counter #1',
    'Counter #2',
    'Counter #3',
    'Final Agreed Price',
    'Final Terms',

    // Contract Details
    'Contract Date',
    'Contract Sent via SignWell?',
    'SignWell Document ID',
    'Seller Signed Date',
    'Buyer Signed Date',
    'Contract Status',

    // Disposition (for wholesaling)
    'Assignment Fee',
    'End Buyer Name',
    'End Buyer Contact',
    'Assignment Date',
    'Assignment Contract Status',

    // Financial Tracking
    'Purchase Price',
    'Selling Price (if flip)',
    'Assignment Fee (if wholesale)',
    'Total Profit',
    'ROI %',

    // Closing Information
    'Title Company',
    'Closing Date',
    'Closing Attorney',
    'Wire Instructions Sent?',
    'Funds Received Date',

    // Notes & Psychology
    'Negotiation Notes',
    'Seller Hot Buttons',  // What motivated acceptance
    'Lessons Learned',

    // CRM Integration
    'CompanyHub Deal ID',
    'SMS-iT Campaign ID',
    'Last Synced',

    // Metadata
    'Created By',
    'Last Updated',
    'Deal Closed?'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.setColumnWidth(2, 250);   // Property Address
  sheet.setColumnWidth(43, 300);  // Negotiation Notes
}

// ============================================
// BUYERS MATCHING ENGINE SHEET
// ============================================

function initializeBuyersMatchingHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.BUYERS_MATCHING);
  if (!sheet) return;

  const headers = [
    'Match ID',
    'Generated Date',

    // Property Info
    'Property ID',
    'Property Address',
    'ZIP Code',
    'Property Type',
    'Asking Price',
    'Strategy',

    // Buyer Info
    'Buyer ID',
    'Buyer Name',
    'Buyer Email',
    'Buyer Phone',

    // Match Criteria
    'ZIP Match?',  // Yes/No
    'Strategy Match?',
    'Price Band Match?',
    'Exit Speed Match?',

    // Match Scoring
    'ZIP Score',  // 1-10 (10 = perfect match)
    'Strategy Score',
    'Price Score',
    'Exit Speed Score',
    'Total Match Score',  // 1-100

    // Buyer Preferences
    'Buyer Preferred ZIPs',
    'Buyer Preferred Strategy',
    'Buyer Price Range',
    'Buyer Exit Speed',  // Quick Flip, Medium, Long Hold

    // Match Quality
    'Match Quality',  // PERFECT, STRONG, GOOD, WEAK
    'Recommendation',  // SEND IMMEDIATELY, Send, Monitor, Don't Send

    // Communication Tracking
    'Sent to Buyer?',
    'Sent Date',
    'Sent Via',  // Email, SMS, Both
    'Buyer Response',  // Interested, Not Interested, No Response
    'Response Date',
    'Viewing Scheduled?',

    // Deal Progress
    'Buyer Offer Amount',
    'Negotiation Status',
    'Contract Status',

    // AI Insights
    'Why Good Match?',  // AI explanation
    'Buyer History',  // Past purchases, preferences

    // Metadata
    'Match Algorithm Version',
    'Last Updated'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.setColumnWidth(4, 250);   // Property Address
  sheet.setColumnWidth(38, 300);  // Why Good Match?
}

// ============================================
// CRM SYNC LOG SHEET
// ============================================

function initializeCRMSyncLogHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CRM_SYNC_LOG);
  if (!sheet) return;

  const headers = [
    'Timestamp',
    'CRM System',  // CompanyHub, SMS-iT, Ohmylead
    'Action',  // Push, Pull, Update, Delete
    'Status',  // Success, Failed, Partial
    'Records Affected',
    'Details',  // Error message or success details
    'Property ID',  // If applicable
    'Contact ID',  // If applicable
    'Triggered By',  // Auto, Manual, User Name
    'Duration (seconds)',
    'API Response Code',
    'Next Sync Scheduled'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

// ============================================
// DASHBOARD & ANALYTICS SHEET
// ============================================

function initializeDashboardHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD);
  if (!sheet) return;

  // Dashboard uses a custom layout, not a standard table
  // We'll set up metric cards and KPI sections

  const layout = [
    ['🔮 QUANTUM REAL ESTATE ANALYZER DASHBOARD', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['📊 KEY METRICS', '', '🔥 HOT DEALS', '', '💰 FINANCIAL', ''],
    ['Active Leads:', '', 'HOT DEALS Found:', '', 'Total Pipeline Value:', ''],
    ['Analyzed This Week:', '', 'Contacted Today:', '', 'Avg Deal Profit:', ''],
    ['Hot Sellers:', '', 'Under Contract:', '', 'YTD Revenue:', ''],
    ['', '', '', '', '', '', ''],
    ['📈 DEAL VELOCITY', '', '🌍 MARKET HEAT', '', '🎯 CONVERSION', ''],
    ['Leads/Day:', '', 'Hottest ZIP:', '', 'Contact Rate:', ''],
    ['Analysis Speed:', '', 'Market Trend:', '', 'Offer Accept Rate:', ''],
    ['Avg Days to Close:', '', 'Inventory Level:', '', 'Close Rate:', ''],
    ['', '', '', '', '', '', ''],
    ['🤝 BUYERS', '', '⚙️ SYSTEM HEALTH', '', '👥 TEAM', ''],
    ['Active Buyers:', '', 'Auto-Analysis:', '', 'Active Users:', ''],
    ['New This Week:', '', 'CRM Sync Status:', '', 'Deals Per User:', ''],
    ['Matched This Week:', '', 'Last Sync:', '', 'Top Performer:', '']
  ];

  sheet.getRange(1, 1, layout.length, 7).setValues(layout);

  // Merge title cell
  sheet.getRange(1, 1, 1, 7).merge();
  sheet.getRange(1, 1).setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');

  // Format section headers
  const sectionHeaders = [3, 8, 13];
  sectionHeaders.forEach(function(row) {
    sheet.getRange(row, 1, 1, 7).setBackground('#7b1fa2').setFontColor('#ffffff').setFontWeight('bold');
  });
}

// ============================================
// SETTINGS & CONTROLS SHEET
// ============================================

function initializeSettingsHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet) return;

  const headers = [
    'Setting Key',
    'Value',
    'Description'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Settings populated by initializeSettings() in Code.gs
}

// ============================================
// SUPPORTING SHEETS
// ============================================

function initializeSellersCRMHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SELLERS_CRM);
  if (!sheet) return;

  const headers = [
    'Seller ID', 'Full Name', 'Phone', 'Email', 'Preferred Contact',
    'Address', 'City', 'State', 'ZIP',
    'Lead Source', 'First Contact Date', 'Last Contact Date', 'Total Contacts',
    'Motivation Score', 'Urgency', 'Situation', 'Hot Seller?',
    'Properties Owned', 'Decision Maker', 'Psychology Profile',
    'Notes', 'CompanyHub ID', 'SMS-iT ID', 'Status', 'Assigned To'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function initializeBuyersDatabaseHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.BUYERS_DATABASE);
  if (!sheet) return;

  const headers = [
    'Buyer ID', 'Full Name', 'Company', 'Phone', 'Email',
    'Buyer Type', 'Cash Buyer?', 'Max Purchase Price', 'Min Purchase Price',
    'Preferred ZIPs', 'Preferred Strategy', 'Property Type Preference',
    'Exit Speed Preference', 'Rehab Level Acceptable',
    'Proof of Funds?', 'Credit Score', 'Financing Pre-Approved?',
    'Deals Completed', 'Avg Close Time', 'Reliability Score',
    'Notes', 'CompanyHub ID', 'Active?', 'Last Purchase Date'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function initializeMarketingLeadsHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MARKETING_LEADS);
  if (!sheet) return;

  const headers = [
    'Lead ID', 'Source', 'Campaign', 'Ad Set', 'Date Generated',
    'Name', 'Phone', 'Email', 'Address', 'ZIP',
    'Lead Type', 'Quality Score', 'Cost Per Lead',
    'Status', 'Contacted?', 'Converted?', 'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function initializeDealPipelinesHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DEAL_PIPELINES);
  if (!sheet) return;

  const headers = [
    'Property ID', 'Address', 'Deal Type', 'Pipeline Stage', 'Stage Entry Date',
    'Days in Stage', 'Probability %', 'Est Value', 'Assigned To',
    'Next Action', 'Next Action Date', 'Blocker', 'Notes', 'Last Updated'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function initializeFinancialTrackingHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.FINANCIAL_TRACKING);
  if (!sheet) return;

  const headers = [
    'Date', 'Property ID', 'Transaction Type', 'Category',
    'Amount', 'Payment Method', 'Payee/Payer',
    'Deal Stage', 'Notes', 'Receipt', 'Tax Deductible?'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function initializeTeamManagementHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TEAM_MANAGEMENT);
  if (!sheet) return;

  const headers = [
    'User ID', 'Full Name', 'Email', 'Phone', 'Role',
    'Access Level', 'Deals Assigned', 'Deals Closed', 'Total Revenue Generated',
    'Avg Deal Time', 'Performance Score', 'Active?', 'Hire Date'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function initializeDocumentsHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DOCUMENTS);
  if (!sheet) return;

  const headers = [
    'Document ID', 'Document Name', 'Type', 'Property ID',
    'Upload Date', 'Uploaded By', 'File URL', 'SignWell ID',
    'Status', 'Signed Date', 'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function initializeMarketIntelligenceHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MARKET_INTELLIGENCE);
  if (!sheet) return;

  const headers = [
    'ZIP Code', 'City', 'County', 'State',
    'Median Home Price', 'Median Rent', 'Price Trend', 'Rent Trend',
    'Days on Market Avg', 'Sales Volume', 'Inventory Level',
    'Appreciation Rate %', 'Market Heat Score', 'Competition Level',
    'Best Strategy', 'Last Updated'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}
