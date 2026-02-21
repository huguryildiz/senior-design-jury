// ============================================================
// EE 492 Jury App – Google Apps Script
// Handles:
//   - POST: Writes/updates jury evaluations to Google Sheets
//   - GET (action=export): Returns secure JSON export for AdminPanel
// ============================================================

const SHEET_NAME = "Evaluations";

function doGet(e) {
  try {
    const action = (e.parameter.action || "").toLowerCase();

    if (action === "export") {
      const pass = e.parameter.pass || "";
      const ADMIN_PASSWORD =
        PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";

      if (!ADMIN_PASSWORD || pass !== ADMIN_PASSWORD) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "unauthorized" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);

      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "ok", rows: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const values = sheet.getDataRange().getValues();
      const headers = values.shift();

      const rows = values.map((r) => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[String(h)] = r[i];
        });
        return obj;
      });

      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", rows }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // health check
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

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

    // Build index of existing rows by (jurorName + groupNo) for overwrite logic
    const lastRow = sheet.getLastRow();
    const existingValues = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, 11).getValues()
      : [];

    const keyOf = (name, groupNo) =>
      `${String(name || "").trim().toLowerCase()}__${String(groupNo || "").trim()}`;

    const index = new Map();
    existingValues.forEach((r, i) => {
      const key = keyOf(r[0], r[3]); // col A = juror name, col D = group no
      if (key) index.set(key, i + 2); // +2: 1-indexed + header row
    });

    // Dedupe payload: if same juror submits same group twice, last one wins
    const latestByKey = new Map();
    (data.rows || []).forEach((row) => {
      const key = keyOf(row.juryName, row.projectId);
      if (key) latestByKey.set(key, row);
    });

    let updated = 0, added = 0;

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
        sheet.getRange(existingRow, 1, 1, 11).setValues([values]);
        updated++;
      } else {
        sheet.appendRow(values);
        index.set(key, sheet.getLastRow());
        added++;
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", updated, added }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}