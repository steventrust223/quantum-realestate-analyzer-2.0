/**
 * Extended Data Management Functions
 * Additional CRUD operations for forms and UI
 */

/**
 * Add seller to sheet from form
 */
function addSellerToSheet(sellerData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Sellers');

  if (!sheet) {
    throw new Error('Sellers sheet not found. Please initialize the spreadsheet first.');
  }

  const sellerId = 'SELLER-' + generateId();
  const row = [
    sellerId,
    new Date(),
    sellerData.name,
    sellerData.phone,
    sellerData.email || '',
    sellerData.propertyAddress,
    sellerData.motivation,
    sellerData.leadSource || 'Direct',
    sellerData.status || 'New Lead',
    sellerData.notes || ''
  ];

  sheet.appendRow(row);

  logActivity('Seller Added', `${sellerData.name} - ${sellerData.propertyAddress}`);

  return sellerId;
}

/**
 * Add buyer to sheet from form
 */
function addBuyerToSheet(buyerData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Buyers');

  if (!sheet) {
    throw new Error('Buyers sheet not found. Please initialize the spreadsheet first.');
  }

  const buyerId = 'BUYER-' + generateId();
  const row = [
    buyerId,
    new Date(),
    buyerData.name,
    buyerData.phone,
    buyerData.email,
    buyerData.investmentType,
    buyerData.maxBudget || 0,
    buyerData.preferredAreas || '',
    buyerData.cashVerified ? 'Yes' : 'No',
    buyerData.active ? 'Yes' : 'No'
  ];

  sheet.appendRow(row);

  logActivity('Buyer Added', `${buyerData.name} - ${buyerData.investmentType}`);

  return buyerId;
}

/**
 * Get company overview data for CompanyHub
 */
function getCompanyOverview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get company name from settings
  const companyName = getSetting('Company Name');

  // Count total deals
  const dealsSheet = ss.getSheetByName('Active Deals');
  const totalDeals = dealsSheet ? Math.max(0, dealsSheet.getLastRow() - 1) : 0;

  // Count team members
  const teamSheet = ss.getSheetByName('Team Members');
  let teamCount = 0;
  if (teamSheet) {
    const teamData = teamSheet.getDataRange().getValues();
    for (let i = 1; i < teamData.length; i++) {
      if (teamData[i][6] === true || teamData[i][6] === 'Yes') {
        teamCount++;
      }
    }
  }

  // Calculate YTD revenue
  const financialSheet = ss.getSheetByName('Financial Tracking');
  let ytdRevenue = 0;
  if (financialSheet) {
    const financialData = financialSheet.getDataRange().getValues();
    const currentYear = new Date().getFullYear();

    for (let i = 1; i < financialData.length; i++) {
      const transDate = new Date(financialData[i][0]);
      if (transDate.getFullYear() === currentYear && financialData[i][2] === 'Income') {
        ytdRevenue += Number(financialData[i][4]) || 0;
      }
    }
  }

  // Count deals by type
  const wholesalingCount = countDealsByType('Wholesaling');
  const sub2Count = countDealsByType('Sub2');

  // Count active buyers and sellers
  const activeBuyers = getActiveBuyersCount();

  const sellersSheet = ss.getSheetByName('Sellers');
  let activeSellers = 0;
  if (sellersSheet) {
    const sellersData = sellersSheet.getDataRange().getValues();
    for (let i = 1; i < sellersData.length; i++) {
      if (sellersData[i][8] === 'Qualified' || sellersData[i][8] === 'Under Contract') {
        activeSellers++;
      }
    }
  }

  return {
    companyName: companyName || 'Not set',
    totalDeals: totalDeals,
    teamCount: teamCount,
    ytdRevenue: ytdRevenue,
    wholesalingCount: wholesalingCount,
    sub2Count: sub2Count,
    activeBuyers: activeBuyers,
    activeSellers: activeSellers
  };
}

/**
 * Get team members for CompanyHub
 */
function getTeamMembers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Team Members');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const team = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === true || data[i][6] === 'Yes') { // Active only
      team.push({
        id: data[i][0],
        name: data[i][1],
        role: data[i][2],
        email: data[i][3],
        phone: data[i][4],
        accessLevel: data[i][5]
      });
    }
  }

  return team;
}

/**
 * Get all active deals with details
 */
function getActiveDealsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Active Deals');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const deals = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][4] !== 'Closed' && data[i][4] !== 'Dead') {
      deals.push({
        dealId: data[i][0],
        dateAdded: data[i][1],
        address: data[i][2],
        dealType: data[i][3],
        status: data[i][4],
        seller: data[i][5],
        offerAmount: data[i][6],
        fee: data[i][7],
        closeDate: data[i][8],
        assignedTo: data[i][9],
        notes: data[i][10]
      });
    }
  }

  return deals;
}

/**
 * Get all contacts (sellers and buyers)
 */
function getAllContacts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const contacts = {
    sellers: [],
    buyers: []
  };

  // Get sellers
  const sellersSheet = ss.getSheetByName('Sellers');
  if (sellersSheet) {
    const sellersData = sellersSheet.getDataRange().getValues();
    for (let i = 1; i < sellersData.length; i++) {
      contacts.sellers.push({
        id: sellersData[i][0],
        name: sellersData[i][2],
        phone: sellersData[i][3],
        email: sellersData[i][4],
        property: sellersData[i][5],
        status: sellersData[i][8]
      });
    }
  }

  // Get buyers
  const buyersSheet = ss.getSheetByName('Buyers');
  if (buyersSheet) {
    const buyersData = buyersSheet.getDataRange().getValues();
    for (let i = 1; i < buyersData.length; i++) {
      if (buyersData[i][9] === true || buyersData[i][9] === 'Yes') {
        contacts.buyers.push({
          id: buyersData[i][0],
          name: buyersData[i][2],
          phone: buyersData[i][3],
          email: buyersData[i][4],
          investmentType: buyersData[i][5],
          maxBudget: buyersData[i][6]
        });
      }
    }
  }

  return contacts;
}

/**
 * Search deals by criteria
 */
function searchDeals(searchTerm) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Active Deals');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const results = [];
  const term = searchTerm.toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const address = String(data[i][2]).toLowerCase();
    const dealId = String(data[i][0]).toLowerCase();
    const seller = String(data[i][5]).toLowerCase();

    if (address.includes(term) || dealId.includes(term) || seller.includes(term)) {
      results.push({
        dealId: data[i][0],
        address: data[i][2],
        dealType: data[i][3],
        status: data[i][4],
        seller: data[i][5]
      });
    }
  }

  return results;
}

/**
 * Update deal field
 */
function updateDealField(dealId, fieldName, newValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Active Deals');

  if (!sheet) {
    throw new Error('Active Deals sheet not found');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fieldIndex = headers.indexOf(fieldName);

  if (fieldIndex === -1) {
    throw new Error(`Field not found: ${fieldName}`);
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dealId) {
      sheet.getRange(i + 1, fieldIndex + 1).setValue(newValue);

      logActivity('Deal Updated', `${dealId} - ${fieldName} changed to ${newValue}`);

      // Trigger automated tasks if status changed
      if (fieldName === 'Status') {
        createAutomatedTask(dealId, newValue);
      }

      return true;
    }
  }

  throw new Error('Deal not found: ' + dealId);
}

/**
 * Delete deal
 */
function deleteDeal(dealId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Active Deals');

  if (!sheet) {
    throw new Error('Active Deals sheet not found');
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dealId) {
      sheet.deleteRow(i + 1);
      logActivity('Deal Deleted', dealId);
      return true;
    }
  }

  throw new Error('Deal not found: ' + dealId);
}

/**
 * Get property analysis history
 */
function getPropertyAnalysisHistory(limit = 20) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Properties');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const history = [];

  // Get most recent analyses (skip header)
  const startRow = Math.max(1, data.length - limit);

  for (let i = data.length - 1; i >= startRow && i >= 1; i--) {
    history.push({
      propertyId: data[i][0],
      dateAnalyzed: data[i][1],
      address: data[i][2],
      estimatedValue: data[i][3],
      arv: data[i][5],
      dealScore: data[i][7],
      recommended: data[i][9]
    });
  }

  return history;
}

/**
 * Export deals to CSV format
 */
function exportDealsToCSV(filterType = 'all') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Active Deals');

  if (!sheet) {
    throw new Error('Active Deals sheet not found');
  }

  const data = sheet.getDataRange().getValues();
  let csv = '';

  // Add headers
  csv += data[0].join(',') + '\n';

  // Add filtered data
  for (let i = 1; i < data.length; i++) {
    if (filterType === 'all' || data[i][3] === filterType) {
      const row = data[i].map(cell => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      });
      csv += row.join(',') + '\n';
    }
  }

  return csv;
}
