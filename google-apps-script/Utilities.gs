/**
 * Utility Functions
 * Helper functions used across the application
 */

/**
 * Format number with commas
 */
function formatNumber(num) {
  if (typeof num !== 'number') {
    num = Number(num) || 0;
  }
  return num.toLocaleString('en-US');
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    amount = Number(amount) || 0;
  }
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format date
 */
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy');
}

/**
 * Format date and time
 */
function formatDateTime(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
}

/**
 * Validate email address
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
}

/**
 * Clean phone number
 */
function cleanPhone(phone) {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Get setting value
 */
function getSetting(settingName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === settingName) {
      return data[i][1];
    }
  }

  return null;
}

/**
 * Update setting value
 */
function updateSetting(settingName, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');

  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === settingName) {
      sheet.getRange(i + 1, 2).setValue(value);
      return true;
    }
  }

  return false;
}

/**
 * Send email notification
 */
function sendEmailNotification(recipient, subject, body) {
  const emailEnabled = getSetting('Email Notifications');

  if (emailEnabled !== 'Yes') {
    Logger.log('Email notifications are disabled');
    return false;
  }

  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body
    });
    return true;
  } catch (error) {
    Logger.log('Error sending email: ' + error.message);
    return false;
  }
}

/**
 * Log activity
 */
function logActivity(activity, details) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('Activity Log');

  // Create log sheet if it doesn't exist
  if (!logSheet) {
    logSheet = ss.insertSheet('Activity Log');
    logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'User', 'Activity', 'Details']]);
    logSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  const user = Session.getActiveUser().getEmail();
  logSheet.appendRow([new Date(), user, activity, details]);
}

/**
 * Export data to CSV
 */
function exportSheetToCSV(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const data = sheet.getDataRange().getValues();
  let csv = '';

  data.forEach(row => {
    csv += row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    }).join(',') + '\n';
  });

  return csv;
}

/**
 * Calculate days between dates
 */
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

/**
 * Generate random color
 */
function getRandomColor() {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Sanitize input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove potentially dangerous characters
  return input.replace(/[<>]/g, '');
}

/**
 * Calculate percentage
 */
function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Sort array of objects by property
 */
function sortByProperty(arr, property, ascending = true) {
  return arr.sort((a, b) => {
    if (a[property] < b[property]) return ascending ? -1 : 1;
    if (a[property] > b[property]) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Get current user email
 */
function getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

/**
 * Check if user has permission
 */
function hasPermission(requiredRole) {
  const userEmail = getCurrentUserEmail();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teamSheet = ss.getSheetByName('Team Members');

  if (!teamSheet) return false;

  const data = teamSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === userEmail) {
      const userRole = data[i][2];

      if (userRole === 'Admin') return true;
      if (userRole === requiredRole) return true;
    }
  }

  return false;
}

/**
 * Create backup of sheet
 */
function createBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
  const backupName = ss.getName() + ' - Backup ' + timestamp;

  ss.copy(backupName);

  SpreadsheetApp.getUi().alert('Backup Created',
    'Backup created successfully: ' + backupName,
    SpreadsheetApp.getUi().ButtonSet.OK);
}
