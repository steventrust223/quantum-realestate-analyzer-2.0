/**
 * Quantum Real Estate Analyzer - Deduplication Module
 * Handles identifying and merging duplicate records
 */

// ============================================================
// MAIN DEDUPLICATION
// ============================================================

/**
 * Runs deduplication on Master Database
 */
function runDeduplication() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    logEvent('DEDUP', 'No data to deduplicate');
    return { duplicates: 0, merged: 0 };
  }

  logEvent('DEDUP', 'Starting deduplication process');

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];

  // Get column indices
  const colMap = getColumnMap(masterSheet);

  // Build duplicate detection map
  const duplicateGroups = findDuplicateGroups(data, headers, colMap);

  // Process duplicates
  const result = processDuplicates(masterSheet, data, duplicateGroups, colMap);

  logEvent('DEDUP', `Found ${result.duplicates} duplicates, merged ${result.merged}`);
  ss.toast(`Dedup complete: ${result.duplicates} duplicates found, ${result.merged} merged`, 'Success', 5);

  return result;
}

/**
 * Finds groups of duplicate records
 * @param {Array} data - Sheet data
 * @param {Array} headers - Header row
 * @param {Object} colMap - Column index map
 * @returns {Object} Groups of duplicate row indices
 */
function findDuplicateGroups(data, headers, colMap) {
  const groups = {};

  // Create composite keys for duplicate detection
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Primary key: Normalized Address + ZIP
    const address = normalizeForDedup(row[colMap['Address'] - 1] || '');
    const zip = String(row[colMap['ZIP'] - 1] || '').trim();
    const primaryKey = `${address}|${zip}`;

    // Secondary key: Listing URL (if available)
    const url = String(row[colMap['Listing URL'] - 1] || '').trim().toLowerCase();
    const urlKey = url ? `url:${url}` : null;

    // Group by primary key
    if (primaryKey && primaryKey !== '|') {
      if (!groups[primaryKey]) {
        groups[primaryKey] = [];
      }
      groups[primaryKey].push(i);
    }

    // Also group by URL if present
    if (urlKey) {
      if (!groups[urlKey]) {
        groups[urlKey] = [];
      }
      if (!groups[urlKey].includes(i)) {
        groups[urlKey].push(i);
      }
    }
  }

  // Filter to only groups with duplicates
  const duplicateGroups = {};
  Object.entries(groups).forEach(([key, indices]) => {
    if (indices.length > 1) {
      duplicateGroups[key] = indices;
    }
  });

  return duplicateGroups;
}

/**
 * Normalizes a string for deduplication comparison
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
function normalizeForDedup(str) {
  if (!str) return '';

  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')  // Remove non-alphanumeric
    .replace(/\s+/g, '');       // Remove all whitespace
}

/**
 * Processes duplicate groups - merges or marks them
 * @param {Sheet} sheet - Master sheet
 * @param {Array} data - Sheet data
 * @param {Object} duplicateGroups - Groups of duplicates
 * @param {Object} colMap - Column index map
 * @returns {Object} Processing results
 */
function processDuplicates(sheet, data, duplicateGroups, colMap) {
  const result = { duplicates: 0, merged: 0 };
  const rowsToDelete = new Set();

  // Process each duplicate group
  Object.entries(duplicateGroups).forEach(([key, indices]) => {
    result.duplicates += indices.length - 1;  // Count duplicates (not including original)

    // Sort indices by data quality (keep the best one)
    const sortedIndices = indices.sort((a, b) => {
      const scoreA = calculateDataQualityScore(data[a], colMap);
      const scoreB = calculateDataQualityScore(data[b], colMap);
      return scoreB - scoreA;  // Higher quality first
    });

    // Keep the first (best quality), merge others into it, then mark for deletion
    const keepIndex = sortedIndices[0];
    const mergeIndices = sortedIndices.slice(1);

    // Merge data from duplicates into the keeper
    mergeIndices.forEach(mergeIndex => {
      mergeRowData(sheet, data, keepIndex, mergeIndex, colMap);
      rowsToDelete.add(mergeIndex);
      result.merged++;
    });
  });

  // Delete duplicate rows (from bottom to top to preserve indices)
  const sortedDeletions = Array.from(rowsToDelete).sort((a, b) => b - a);
  sortedDeletions.forEach(rowIndex => {
    sheet.deleteRow(rowIndex + 1);  // +1 because data index is 0-based
  });

  return result;
}

/**
 * Calculates a data quality score for a row
 * Higher score = better quality data
 * @param {Array} row - Row data
 * @param {Object} colMap - Column index map
 * @returns {number} Quality score
 */
function calculateDataQualityScore(row, colMap) {
  let score = 0;

  // Points for having key fields populated
  const fieldsToCheck = [
    { name: 'Asking Price', weight: 10 },
    { name: 'ARV', weight: 15 },
    { name: 'Beds', weight: 5 },
    { name: 'Baths', weight: 5 },
    { name: 'Sqft', weight: 10 },
    { name: 'Year Built', weight: 5 },
    { name: 'DOM', weight: 8 },
    { name: 'Listing URL', weight: 5 },
    { name: 'Seller Type', weight: 5 },
    { name: 'Deal Score', weight: 20 },
    { name: 'Verdict', weight: 15 }
  ];

  fieldsToCheck.forEach(field => {
    const colIndex = colMap[field.name];
    if (colIndex && row[colIndex - 1]) {
      score += field.weight;
    }
  });

  // Bonus for more recent import
  const importedAtIndex = colMap['Imported At'];
  if (importedAtIndex && row[importedAtIndex - 1]) {
    const importDate = new Date(row[importedAtIndex - 1]);
    const now = new Date();
    const daysDiff = (now - importDate) / (1000 * 60 * 60 * 24);
    if (daysDiff < 1) score += 10;
    else if (daysDiff < 7) score += 5;
  }

  return score;
}

/**
 * Merges data from one row into another (fills in gaps)
 * @param {Sheet} sheet - Master sheet
 * @param {Array} data - Sheet data
 * @param {number} keepIndex - Index of row to keep
 * @param {number} mergeIndex - Index of row to merge from
 * @param {Object} colMap - Column index map
 */
function mergeRowData(sheet, data, keepIndex, mergeIndex, colMap) {
  const keepRow = data[keepIndex];
  const mergeRow = data[mergeIndex];

  // Fields that can be merged (fill gaps only)
  const mergeableFields = [
    'ARV', 'Beds', 'Baths', 'Sqft', 'Year Built', 'Lot Size',
    'DOM', 'Seller Type', 'Motivation Signals', 'Property Type',
    'Zestimate', 'County'
  ];

  mergeableFields.forEach(field => {
    const colIndex = colMap[field];
    if (!colIndex) return;

    const keepValue = keepRow[colIndex - 1];
    const mergeValue = mergeRow[colIndex - 1];

    // If keeper is empty but merge source has data, copy it
    if (!keepValue && mergeValue) {
      sheet.getRange(keepIndex + 1, colIndex).setValue(mergeValue);
      data[keepIndex][colIndex - 1] = mergeValue;
    }
  });

  // Combine motivation signals if both exist
  const motivationCol = colMap['Motivation Signals'];
  if (motivationCol) {
    const keepMotivation = String(keepRow[motivationCol - 1] || '');
    const mergeMotivation = String(mergeRow[motivationCol - 1] || '');

    if (keepMotivation && mergeMotivation && keepMotivation !== mergeMotivation) {
      const combined = keepMotivation + '; ' + mergeMotivation;
      sheet.getRange(keepIndex + 1, motivationCol).setValue(combined);
    }
  }
}

// ============================================================
// DUPLICATE DETECTION HELPERS
// ============================================================

/**
 * Checks if two addresses are likely the same property
 * @param {string} addr1 - First address
 * @param {string} addr2 - Second address
 * @returns {boolean} True if likely same property
 */
function areAddressesSimilar(addr1, addr2) {
  const norm1 = normalizeForDedup(addr1);
  const norm2 = normalizeForDedup(addr2);

  if (!norm1 || !norm2) return false;

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // Check Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  const similarity = 1 - (distance / maxLength);

  // Consider similar if > 85% match
  return similarity > 0.85;
}

/**
 * Calculates Levenshtein distance between two strings
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;

  // Create distance matrix
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// ============================================================
// DUPLICATE REPORTING
// ============================================================

/**
 * Generates a duplicate report without merging
 * @returns {Array} List of potential duplicates
 */
function generateDuplicateReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return [];
  }

  const data = masterSheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = getColumnMap(masterSheet);

  const duplicateGroups = findDuplicateGroups(data, headers, colMap);

  // Format report
  const report = [];
  Object.entries(duplicateGroups).forEach(([key, indices]) => {
    const groupInfo = {
      key: key,
      count: indices.length,
      records: indices.map(i => ({
        row: i + 1,
        dealId: data[i][colMap['Deal ID'] - 1] || '',
        address: data[i][colMap['Address'] - 1] || '',
        city: data[i][colMap['City'] - 1] || '',
        zip: data[i][colMap['ZIP'] - 1] || '',
        price: data[i][colMap['Asking Price'] - 1] || '',
        source: data[i][colMap['Source Platform'] - 1] || '',
        imported: data[i][colMap['Imported At'] - 1] || ''
      }))
    };
    report.push(groupInfo);
  });

  return report;
}

/**
 * Exports duplicate report to a new sheet
 */
function exportDuplicateReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = generateDuplicateReport();

  if (report.length === 0) {
    ss.toast('No duplicates found!', 'Info', 3);
    return;
  }

  // Create or get report sheet
  let reportSheet = ss.getSheetByName('Duplicate Report');
  if (!reportSheet) {
    reportSheet = ss.insertSheet('Duplicate Report');
  }
  reportSheet.clear();

  // Headers
  reportSheet.getRange(1, 1, 1, 8).setValues([[
    'Group', 'Row #', 'Deal ID', 'Address', 'City', 'ZIP', 'Price', 'Source'
  ]]);
  reportSheet.getRange(1, 1, 1, 8)
    .setBackground('#424242')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Data
  let row = 2;
  let groupNum = 1;
  report.forEach(group => {
    group.records.forEach((record, idx) => {
      reportSheet.getRange(row, 1, 1, 8).setValues([[
        idx === 0 ? `Group ${groupNum}` : '',
        record.row,
        record.dealId,
        record.address,
        record.city,
        record.zip,
        record.price,
        record.source
      ]]);

      // Alternate colors for groups
      if (groupNum % 2 === 0) {
        reportSheet.getRange(row, 1, 1, 8).setBackground('#FFF3E0');
      }

      row++;
    });
    groupNum++;
  });

  reportSheet.autoResizeColumns(1, 8);

  ss.toast(`Duplicate report created with ${report.length} groups`, 'Success', 5);
  logEvent('DEDUP', `Duplicate report generated: ${report.length} groups`);
}

// ============================================================
// DEDUP BY CRITERIA
// ============================================================

/**
 * Deduplicates by URL only
 */
function deduplicateByURL() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return 0;

  logEvent('DEDUP', 'Starting URL-based deduplication');

  const data = masterSheet.getDataRange().getValues();
  const colMap = getColumnMap(masterSheet);
  const urlCol = colMap['Listing URL'];

  if (!urlCol) return 0;

  const urlMap = {};
  const rowsToDelete = [];

  // Build URL map
  for (let i = 1; i < data.length; i++) {
    const url = String(data[i][urlCol - 1] || '').trim().toLowerCase();
    if (!url) continue;

    if (urlMap[url]) {
      // Duplicate URL found
      const existingRow = urlMap[url];
      const existingScore = calculateDataQualityScore(data[existingRow], colMap);
      const newScore = calculateDataQualityScore(data[i], colMap);

      if (newScore > existingScore) {
        // New row is better, delete existing
        rowsToDelete.push(existingRow);
        urlMap[url] = i;
      } else {
        // Existing is better, delete new
        rowsToDelete.push(i);
      }
    } else {
      urlMap[url] = i;
    }
  }

  // Delete duplicates (from bottom to top)
  const sortedDeletions = [...new Set(rowsToDelete)].sort((a, b) => b - a);
  sortedDeletions.forEach(rowIndex => {
    masterSheet.deleteRow(rowIndex + 1);
  });

  logEvent('DEDUP', `URL dedup: removed ${sortedDeletions.length} duplicates`);
  ss.toast(`Removed ${sortedDeletions.length} URL duplicates`, 'Success', 5);

  return sortedDeletions.length;
}

/**
 * Deduplicates within a time window (recent imports only)
 * @param {number} hoursWindow - Hours to look back
 */
function deduplicateRecentImports(hoursWindow = 24) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!masterSheet || masterSheet.getLastRow() <= 1) return 0;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursWindow);

  const data = masterSheet.getDataRange().getValues();
  const colMap = getColumnMap(masterSheet);
  const importedCol = colMap['Imported At'];

  // Filter to only recent rows
  const recentIndices = [];
  for (let i = 1; i < data.length; i++) {
    const importDate = new Date(data[i][importedCol - 1]);
    if (importDate >= cutoffDate) {
      recentIndices.push(i);
    }
  }

  if (recentIndices.length <= 1) {
    logEvent('DEDUP', 'No recent imports to deduplicate');
    return 0;
  }

  logEvent('DEDUP', `Checking ${recentIndices.length} recent imports for duplicates`);

  // Run dedup on recent imports
  return runDeduplication();
}
