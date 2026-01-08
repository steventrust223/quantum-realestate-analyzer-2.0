/**
 * Buyer Matching Menu Functions
 * UI functions called from menu items
 */

/**
 * Prompt user to match a property to buyers
 */
function matchPropertyPrompt() {
  const ui = SpreadsheetApp.getUi();

  // Get property address
  const addressResponse = ui.prompt(
    'Match Property to Buyers',
    'Enter property address:',
    ui.ButtonSet.OK_CANCEL
  );

  if (addressResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const address = addressResponse.getResponseText();

  if (!address) {
    ui.alert('Error', 'Please enter a valid address.', ui.ButtonSet.OK);
    return;
  }

  // Get price
  const priceResponse = ui.prompt(
    'Match Property to Buyers',
    'Enter asking price:',
    ui.ButtonSet.OK_CANCEL
  );

  if (priceResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const price = parseFloat(priceResponse.getResponseText());

  if (!price || price <= 0) {
    ui.alert('Error', 'Please enter a valid price.', ui.ButtonSet.OK);
    return;
  }

  // Get deal type
  const dealTypeResponse = ui.prompt(
    'Match Property to Buyers',
    'Enter deal type (Wholesaling/Sub2/Fix & Flip):',
    ui.ButtonSet.OK_CANCEL
  );

  if (dealTypeResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const dealType = dealTypeResponse.getResponseText() || 'Wholesaling';

  // Perform matching
  const propertyDetails = {
    address: address,
    price: price,
    dealType: dealType,
    maxOffer: price
  };

  showBuyerMatches(address, propertyDetails);
}

/**
 * View buyer match history
 */
function viewMatchHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const historySheet = ss.getSheetByName('Buyer Match History');

  if (!historySheet) {
    SpreadsheetApp.getUi().alert('No Match History',
      'No buyer matching history found.\n\nStart matching properties to buyers to build history.',
      SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Get statistics
  const stats = getBuyerMatchingStats();

  const ui = SpreadsheetApp.getUi();
  const message = `
BUYER MATCHING STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Total Properties Matched: ${stats.propertiesMatched}
🎯 Total Buyer Matches Found: ${stats.totalMatches}
📈 Average Matches Per Property: ${stats.averageMatchesPerProperty}
📧 Total Notifications Sent: ${stats.totalNotifications}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View the "Buyer Match History" sheet for detailed records.
  `;

  ui.alert('Match History', message, ui.ButtonSet.OK);

  // Activate the sheet
  historySheet.activate();
}

/**
 * Open buyer matching UI
 */
function openBuyerMatchingUI(propertyAddress, propertyDetails) {
  const html = HtmlService.createTemplateFromFile('BuyerMatchingUI');

  // Pass data to template
  html.address = propertyAddress;
  html.details = JSON.stringify(propertyDetails);

  const htmlOutput = html.evaluate()
    .setWidth(900)
    .setHeight(700)
    .setTitle('🎯 Buyer Matching Results');

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Buyer Matching');

  // Initialize the UI with data
  const script = `<script>loadMatches('${propertyAddress}', ${JSON.stringify(propertyDetails)});</script>`;
}

/**
 * Test buyer matching with sample data
 */
function testBuyerMatching() {
  const sampleProperty = {
    address: '123 Main St, Anytown, CA 90210',
    price: 180000,
    dealType: 'Wholesaling',
    arv: 250000,
    repairCosts: 40000,
    profitPotential: 30000,
    maxOffer: 180000
  };

  showBuyerMatches(sampleProperty.address, sampleProperty);
}

/**
 * Quick match active deal to buyers
 */
function quickMatchDeal() {
  const ui = SpreadsheetApp.getUi();

  // Prompt for deal ID
  const response = ui.prompt(
    'Quick Match Deal',
    'Enter Deal ID to match to buyers:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const dealId = response.getResponseText();

  if (!dealId) {
    ui.alert('Error', 'Please enter a valid Deal ID.', ui.ButtonSet.OK);
    return;
  }

  // Find deal
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dealsSheet = ss.getSheetByName('Active Deals');

  if (!dealsSheet) {
    ui.alert('Error', 'Active Deals sheet not found.', ui.ButtonSet.OK);
    return;
  }

  const dealsData = dealsSheet.getDataRange().getValues();
  let dealInfo = null;

  for (let i = 1; i < dealsData.length; i++) {
    if (dealsData[i][0] === dealId) {
      dealInfo = {
        address: dealsData[i][2],
        dealType: dealsData[i][3],
        price: dealsData[i][6],
        maxOffer: dealsData[i][6]
      };
      break;
    }
  }

  if (!dealInfo) {
    ui.alert('Error', `Deal ID "${dealId}" not found.`, ui.ButtonSet.OK);
    return;
  }

  // Match the deal
  showBuyerMatches(dealInfo.address, dealInfo);
}

/**
 * Export matching results
 */
function exportMatchingResults() {
  const csv = exportSheetToCSV('Buyer Match History');

  SpreadsheetApp.getUi().alert('Export Match History',
    'Copy the data from "Buyer Match History" sheet and save as CSV file.',
    SpreadsheetApp.getUi().ButtonSet.OK);

  return csv;
}

/**
 * Configure buyer matching settings
 */
function configureBuyerMatching() {
  const ui = SpreadsheetApp.getUi();

  const message = `
BUYER MATCHING CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Matching Criteria:
✓ Budget Match (30 points)
✓ Investment Type (25 points)
✓ Location Match (25 points)
✓ Cash Verified Bonus (10 points)
✓ Recency Bonus (10 points)

Minimum Match Score: 50%
Notifications: Top 10 matches

To adjust settings, update the
calculateBuyerMatchScore() function
in BuyerMatching.gs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;

  ui.alert('Matching Configuration', message, ui.ButtonSet.OK);
}
