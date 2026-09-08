/**
 * Quantum Real Estate Analyzer - Master Database Column Registry & Validator
 *
 * PURPOSE
 * -------
 * Every module in this system reads the Master Database by header name
 * (`headers.indexOf('X')` or a locally-built `colMap`). That is safer than
 * CarHawk's positional reads, but it fails silently in one specific way:
 *
 *   const colMap = {};
 *   headers.forEach((h, i) => colMap[h] = i + 1);
 *   const verdict = row[colMap['Verdict'] - 1];
 *
 * If the live header row has drifted and 'Verdict' is absent, `colMap['Verdict']`
 * is `undefined`, `undefined - 1` is `NaN`, and `row[NaN]` is `undefined`. No
 * throw, no log — the deal is synced to the CRM with an empty field. That is the
 * same failure class as reading the wrong column: a successful-looking write of
 * garbage.
 *
 * This file exists so that never happens without someone being told. It does two
 * things:
 *
 *   1. validateQuantumDbColumns()  - compares the LIVE header row against
 *      CONFIG.COLUMNS.MASTER_DB position by position and returns a structured
 *      report.
 *   2. buildQuantumDbColMap_()     - a colMap whose lookups throw on an unknown
 *      column name instead of returning undefined.
 *
 * SOURCE OF TRUTH
 * ---------------
 * CONFIG.COLUMNS.MASTER_DB in Config.gs. This file deliberately does NOT restate
 * the 69 column names. A second copy of the schema would be a second thing to
 * drift, which is the defect this file exists to catch.
 *
 * Verified 2026-09-08: CONFIG.COLUMNS.MASTER_DB (69 entries) is identical in
 * order and spelling to the SPEC_PACK.md Section C1 table (69 rows). Only the
 * C1 heading's "(60 columns)" was stale; it has been corrected.
 */

// ============================================================
// REGISTRY
// ============================================================

/**
 * Returns the canonical Master Database header list.
 * @returns {string[]} 69 column headers in canonical order
 */
function quantumDbColumns() {
  return CONFIG.COLUMNS.MASTER_DB;
}

/**
 * Returns the canonical 1-based column number for a Master DB header.
 * Throws if the name is not a canonical column — a typo'd header name is a bug,
 * not a runtime condition to be defaulted away.
 * @param {string} headerName - Canonical column header
 * @returns {number} 1-based column number
 */
function quantumDbColumnNumber(headerName) {
  const index = CONFIG.COLUMNS.MASTER_DB.indexOf(headerName);
  if (index < 0) {
    throw new Error(
      `Master DB column "${headerName}" is not in CONFIG.COLUMNS.MASTER_DB. ` +
      `If this column is real, add it to Config.gs; do not read it by literal index.`
    );
  }
  return index + 1;
}

// ============================================================
// VALIDATOR
// ============================================================

/**
 * Validates the live Master Database header row against CONFIG.COLUMNS.MASTER_DB.
 *
 * Severity model:
 *   - A canonical column at the wrong position, or missing entirely, is an ERROR.
 *     Both produce silent-undefined or wrong-value reads.
 *   - Extra columns appended AFTER the canonical block are a WARNING. A user
 *     adding a scratch column at column 70 breaks nothing.
 *   - Duplicate header names are an ERROR. `indexOf` silently binds to the first,
 *     so the second column is unreachable and its writer overwrites the wrong cell.
 *
 * @param {Sheet} [sheet] - Master DB sheet; defaults to the active spreadsheet's
 * @returns {Object} {ok, checkedAt, expectedCount, actualCount, errors[], warnings[], mismatches[], missing[], extra[], duplicates[]}
 */
function validateQuantumDbColumns(sheet) {
  const expected = CONFIG.COLUMNS.MASTER_DB;
  const report = {
    ok: false,
    checkedAt: new Date(),
    sheetName: CONFIG.SHEETS.MASTER_DB,
    expectedCount: expected.length,
    actualCount: 0,
    errors: [],
    warnings: [],
    mismatches: [],
    missing: [],
    extra: [],
    duplicates: []
  };

  const target = sheet || SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEETS.MASTER_DB);

  if (!target) {
    report.errors.push(`Sheet "${CONFIG.SHEETS.MASTER_DB}" not found.`);
    return report;
  }

  const lastColumn = target.getLastColumn();
  if (lastColumn < 1) {
    report.errors.push(`Sheet "${CONFIG.SHEETS.MASTER_DB}" has no header row.`);
    return report;
  }

  const actual = target.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(h => String(h).trim());
  report.actualCount = actual.length;

  // Duplicates anywhere in the live row
  const seen = {};
  actual.forEach((header, i) => {
    if (!header) return;
    if (seen[header] !== undefined) {
      report.duplicates.push({ header: header, columns: [seen[header] + 1, i + 1] });
    } else {
      seen[header] = i;
    }
  });

  // Positional comparison across the canonical block
  expected.forEach((expectedHeader, i) => {
    const actualHeader = i < actual.length ? actual[i] : null;
    if (actualHeader === expectedHeader) return;

    const foundAt = actual.indexOf(expectedHeader);
    if (foundAt < 0) {
      report.missing.push({ column: i + 1, expected: expectedHeader, found: actualHeader });
    } else {
      report.mismatches.push({
        column: i + 1,
        expected: expectedHeader,
        found: actualHeader,
        expectedFoundAtColumn: foundAt + 1
      });
    }
  });

  // Anything past the canonical block
  for (let i = expected.length; i < actual.length; i++) {
    if (actual[i]) report.extra.push({ column: i + 1, header: actual[i] });
  }

  report.missing.forEach(m => {
    report.errors.push(
      `Column ${m.column} should be "${m.expected}" but that header is absent from the sheet ` +
      `(found "${m.found === null ? '<past end of row>' : m.found}"). Reads of "${m.expected}" ` +
      `resolve to undefined and sync blank.`
    );
  });

  report.mismatches.forEach(m => {
    report.errors.push(
      `Column ${m.column} should be "${m.expected}" but holds "${m.found}". ` +
      `"${m.expected}" is at column ${m.expectedFoundAtColumn} — the row order has drifted.`
    );
  });

  report.duplicates.forEach(d => {
    report.errors.push(
      `Header "${d.header}" appears twice (columns ${d.columns.join(' and ')}). ` +
      `Name-based lookups bind to column ${d.columns[0]} only.`
    );
  });

  if (report.extra.length) {
    report.warnings.push(
      `${report.extra.length} column(s) beyond the canonical ${expected.length}: ` +
      report.extra.map(e => `${e.column}="${e.header}"`).join(', ') +
      `. Harmless to reads, but not written by any module.`
    );
  }

  report.ok = report.errors.length === 0;
  return report;
}

/**
 * Validates and throws on any error. Call this before any operation that writes
 * Master DB values outward (CRM sync, export) so a drifted header row fails loud
 * and before the first write rather than silently shipping blanks.
 * @param {string} context - Caller name, for the error message
 * @param {Sheet} [sheet] - Master DB sheet
 * @returns {Object} The validation report (only returned when ok)
 */
function assertQuantumDbColumns(context, sheet) {
  const report = validateQuantumDbColumns(sheet);

  if (report.warnings.length) {
    report.warnings.forEach(w => logEvent('DB-COLUMNS', `${context}: ${w}`));
  }

  if (!report.ok) {
    const message =
      `Master Database column audit FAILED (${report.errors.length} error(s)); ` +
      `${context} aborted before writing.\n` +
      report.errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');
    logError('DB-COLUMNS', message);
    throw new Error(message);
  }

  return report;
}

/**
 * Builds a Master DB column map that throws on unknown names.
 *
 * Returned object exposes:
 *   num(header)   -> 1-based column number (for getRange)
 *   idx(header)   -> 0-based array index  (for row[])
 *   value(row, header) -> the cell value
 *   has(header)   -> boolean, for genuinely optional columns
 *
 * Unlike `colMap[name] - 1`, a missing column raises rather than yielding NaN.
 *
 * @param {Array} headers - The live header row
 * @returns {Object} Column accessor
 */
function buildQuantumDbColMap_(headers) {
  const index = {};
  headers.forEach((h, i) => {
    const key = String(h).trim();
    if (key && index[key] === undefined) index[key] = i;
  });

  function idx(header) {
    const i = index[header];
    if (i === undefined) {
      throw new Error(
        `Master DB column "${header}" not present in the live header row. ` +
        `Run the Master DB column audit (Quantum menu) before syncing.`
      );
    }
    return i;
  }

  return {
    has: function (header) { return index[header] !== undefined; },
    idx: idx,
    num: function (header) { return idx(header) + 1; },
    value: function (row, header) { return row[idx(header)]; }
  };
}

// ============================================================
// MENU ENTRY POINT
// ============================================================

/**
 * Runs the column audit and reports the result in a dialog.
 * Safe to run any time; reads only.
 * @returns {Object} The validation report
 */
function runQuantumDbColumnAudit() {
  const report = validateQuantumDbColumns();

  const lines = [
    `Sheet: ${report.sheetName}`,
    `Expected columns: ${report.expectedCount}`,
    `Found columns: ${report.actualCount}`,
    ''
  ];

  if (report.ok) {
    lines.push('PASS - live header row matches CONFIG.COLUMNS.MASTER_DB exactly.');
  } else {
    lines.push(`FAIL - ${report.errors.length} error(s):`);
    report.errors.forEach((e, i) => lines.push(`${i + 1}. ${e}`));
  }

  if (report.warnings.length) {
    lines.push('');
    lines.push('Warnings:');
    report.warnings.forEach(w => lines.push(`- ${w}`));
  }

  const text = lines.join('\n');
  logEvent('DB-COLUMNS', report.ok ? 'Column audit passed' : 'Column audit FAILED');

  try {
    SpreadsheetApp.getUi().alert('Master DB Column Audit', text, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // No UI context (trigger/headless run) - the log is the record.
    Logger.log(text);
  }

  return report;
}
