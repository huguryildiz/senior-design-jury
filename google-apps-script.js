// ============================================================
// EE 492 Poster Presentation Evaluation – Google Apps Script
// Paste this code into Google Apps Script and deploy as Web App.
// ============================================================

const SHEET_NAME = "Evaluations";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet with headers if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No", "Group Name",
        "Design (20)", "Technical (40)", "Delivery (30)", "Teamwork (10)",
        "Total (100)", "Comments"
      ]);
      sheet.getRange(1, 1, 1, 11)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    // Build an index of existing submissions by (jurorName + groupNo)
    // We treat this pair as the unique key for overwrite behavior.
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // Header is row 1
    const existingValues = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, Math.max(11, lastCol)).getValues()
      : [];

    const keyOf = (name, groupNo) => {
      const n = String(name || "").trim().toLowerCase();
      const g = String(groupNo || "").trim();
      return `${n}__${g}`;
    };

    // Map key -> absolute sheet row number
    const index = new Map();
    existingValues.forEach((r, i) => {
      const juror = r[0];      // col A
      const groupNo = r[3];    // col D
      const key = keyOf(juror, groupNo);
      if (key) index.set(key, i + 2); // +2 because data starts at row 2
    });

    // If payload contains duplicates, last one wins
    const latestByKey = new Map();
    (data.rows || []).forEach((row) => {
      const key = keyOf(row.juryName, row.projectId);
      if (key) latestByKey.set(key, row);
    });

    let updated = 0;
    let added = 0;

    // Overwrite-or-append one row per (juror, group)
    latestByKey.forEach((row, key) => {
      const values = [
        row.juryName,
        row.juryDept,
        row.timestamp,
        row.projectId,
        row.projectName,
        row.design,
        row.technical,
        row.delivery,
        row.teamwork,
        row.total,
        row.comments
      ];

      const existingRow = index.get(key);
      if (existingRow) {
        // Update the entire row (A..K)
        sheet.getRange(existingRow, 1, 1, 11).setValues([values]);
        updated += 1;
      } else {
        sheet.appendRow(values);
        index.set(key, sheet.getLastRow());
        added += 1;
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", updated, added }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
