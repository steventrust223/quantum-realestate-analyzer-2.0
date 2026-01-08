/**
 * Reports and Analytics Functions
 * Generate various reports for business analysis
 */

/**
 * Generate monthly report
 */
function generateMonthlyReport() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Calculate report data
  const reportData = calculateMonthlyMetrics();

  // Create or get report sheet
  let reportSheet = ss.getSheetByName('Monthly Reports');
  if (!reportSheet) {
    reportSheet = ss.insertSheet('Monthly Reports');
    setupMonthlyReportHeaders(reportSheet);
  }

  // Add report data
  const row = [
    new Date(),
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM yyyy'),
    reportData.dealsStarted,
    reportData.dealsClosed,
    reportData.totalRevenue,
    reportData.totalExpenses,
    reportData.netProfit,
    reportData.averageDealProfit,
    reportData.conversionRate,
    reportData.newBuyers,
    reportData.newSellers
  ];

  reportSheet.appendRow(row);

  ui.alert('Monthly Report Generated',
    'Report for ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM yyyy') + ' has been created!',
    ui.ButtonSet.OK);
}

/**
 * Setup monthly report headers
 */
function setupMonthlyReportHeaders(sheet) {
  const headers = [
    'Report Date', 'Period', 'Deals Started', 'Deals Closed',
    'Total Revenue', 'Total Expenses', 'Net Profit', 'Avg Deal Profit',
    'Conversion Rate %', 'New Buyers', 'New Sellers'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Calculate monthly metrics
 */
function calculateMonthlyMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dealsSheet = ss.getSheetByName('Active Deals');
  const financialSheet = ss.getSheetByName('Financial Tracking');
  const buyersSheet = ss.getSheetByName('Buyers');
  const sellersSheet = ss.getSheetByName('Sellers');

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  let dealsStarted = 0;
  let dealsClosed = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;
  let dealProfits = [];

  // Analyze deals
  if (dealsSheet) {
    const dealsData = dealsSheet.getDataRange().getValues();
    for (let i = 1; i < dealsData.length; i++) {
      const dealDate = new Date(dealsData[i][1]);

      if (dealDate >= firstDayOfMonth) {
        dealsStarted++;

        if (dealsData[i][4] === 'Closed') {
          dealsClosed++;
          const profit = Number(dealsData[i][7]) || 0;
          dealProfits.push(profit);
        }
      }
    }
  }

  // Analyze financial data
  if (financialSheet) {
    const financialData = financialSheet.getDataRange().getValues();
    for (let i = 1; i < financialData.length; i++) {
      const transDate = new Date(financialData[i][0]);

      if (transDate >= firstDayOfMonth) {
        const amount = Number(financialData[i][4]) || 0;

        if (financialData[i][2] === 'Income') {
          totalRevenue += amount;
        } else if (financialData[i][2] === 'Expense') {
          totalExpenses += amount;
        }
      }
    }
  }

  // Count new buyers
  let newBuyers = 0;
  if (buyersSheet) {
    const buyersData = buyersSheet.getDataRange().getValues();
    for (let i = 1; i < buyersData.length; i++) {
      const buyerDate = new Date(buyersData[i][1]);
      if (buyerDate >= firstDayOfMonth) {
        newBuyers++;
      }
    }
  }

  // Count new sellers
  let newSellers = 0;
  if (sellersSheet) {
    const sellersData = sellersSheet.getDataRange().getValues();
    for (let i = 1; i < sellersData.length; i++) {
      const sellerDate = new Date(sellersData[i][1]);
      if (sellerDate >= firstDayOfMonth) {
        newSellers++;
      }
    }
  }

  const avgDealProfit = dealProfits.length > 0
    ? dealProfits.reduce((a, b) => a + b, 0) / dealProfits.length
    : 0;

  const conversionRate = dealsStarted > 0
    ? Math.round((dealsClosed / dealsStarted) * 100)
    : 0;

  return {
    dealsStarted,
    dealsClosed,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    averageDealProfit: avgDealProfit,
    conversionRate,
    newBuyers,
    newSellers
  };
}

/**
 * Financial summary report
 */
function financialSummary() {
  const ui = SpreadsheetApp.getUi();
  const metrics = calculateMonthlyMetrics();

  const message = `
FINANCIAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM yyyy')}

💰 REVENUE
   Total Revenue: ${formatCurrency(metrics.totalRevenue)}
   Total Expenses: ${formatCurrency(metrics.totalExpenses)}
   Net Profit: ${formatCurrency(metrics.netProfit)}

📊 DEALS
   Deals Started: ${metrics.dealsStarted}
   Deals Closed: ${metrics.dealsClosed}
   Conversion Rate: ${metrics.conversionRate}%
   Avg Deal Profit: ${formatCurrency(metrics.averageDealProfit)}

👥 GROWTH
   New Buyers: ${metrics.newBuyers}
   New Sellers: ${metrics.newSellers}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;

  ui.alert('Financial Summary', message, ui.ButtonSet.OK);
}

/**
 * Pipeline analysis
 */
function pipelineAnalysis() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const wholesalingSheet = ss.getSheetByName('Wholesaling Pipeline');
  const sub2Sheet = ss.getSheetByName('Sub2 Pipeline');

  let wholesalingByStage = {};
  let sub2ByStage = {};

  // Analyze wholesaling pipeline
  if (wholesalingSheet) {
    const data = wholesalingSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const stage = data[i][1];
      wholesalingByStage[stage] = (wholesalingByStage[stage] || 0) + 1;
    }
  }

  // Analyze Sub2 pipeline
  if (sub2Sheet) {
    const data = sub2Sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const stage = data[i][1];
      sub2ByStage[stage] = (sub2ByStage[stage] || 0) + 1;
    }
  }

  let message = `
PIPELINE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 WHOLESALING PIPELINE:
`;

  for (let stage in wholesalingByStage) {
    message += `   ${stage}: ${wholesalingByStage[stage]}\n`;
  }

  message += `\n🏠 SUB2 PIPELINE:\n`;

  for (let stage in sub2ByStage) {
    message += `   ${stage}: ${sub2ByStage[stage]}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  ui.alert('Pipeline Analysis', message, ui.ButtonSet.OK);
}

/**
 * Export report to PDF
 */
function exportReportToPDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    'Export Report',
    'Enter sheet name to export:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const sheetName = response.getResponseText();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      ui.alert('Error', 'Sheet not found: ' + sheetName, ui.ButtonSet.OK);
      return;
    }

    const url = ss.getUrl().replace(/edit$/, '') +
                'export?format=pdf&gid=' + sheet.getSheetId();

    ui.alert('Export Link',
      'Open this link to download PDF:\n\n' + url,
      ui.ButtonSet.OK);
  }
}
