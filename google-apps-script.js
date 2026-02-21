// ============================================================
// EE 492 Jury App – Google Apps Script
// ============================================================
// Handles two endpoints:
//   POST  → Write / update jury evaluation rows
//   GET   → action=export: Authenticated JSON dump for AdminPanel
//
// Sheet columns (A–L):
//   A: Juror Name
//   B: Department / Institution
//   C: Timestamp
//   D: Group No
//   E: Group Name
//   F: Design (20)
//   G: Technical (40)
//   H: Delivery (30)
//   I: Teamwork (10)
//   J: Total (100)
//   K: Comments
//   L: Status  ← NEW ("in_progress" or "submitted")
//
// Dedup key: lowercase(jurorName) + "__" + groupNo
// Last write wins; "submitted" always overwrites "in_progress".
// ============================================================

const SHEET_NAME = "Evaluations";
const NUM_COLS   = 12; // A through L

// ── Authorization helper ──────────────────────────────────────
function isAuthorized(pass) {
  const stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";
  return stored.length > 0 && pass === stored;
}

// ── GET handler: health-check + authenticated export ──────────
function doGet(e) {
  try {
    const action = (e.parameter.action || "").toLowerCase();

    if (action === "export") {
      const pass = e.parameter.pass || "";
      if (!isAuthorized(pass)) {
        return json({ status: "unauthorized" });
      }

      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);

      if (!sheet) return json({ status: "ok", rows: [] });

      const values  = sheet.getDataRange().getValues();
      const headers = values.shift(); // first row = headers

      const rows = values.map((r) => {
        const obj = {};
        headers.forEach((h, i) => { obj[String(h)] = r[i]; });
        return obj;
      });

      return json({ status: "ok", rows });
    }

    // Default health-check response
    return json({ status: "ok" });

  } catch (err) {
    return json({ status: "error", message: String(err) });
  }
}

// ── POST handler: upsert jury evaluation rows ─────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet with header row if it does not exist yet
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No",   "Group Name",
        "Design (20)", "Technical (40)", "Delivery (30)", "Teamwork (10)",
        "Total (100)", "Comments", "Status"
      ]);
      sheet.getRange(1, 1, 1, NUM_COLS)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    // Build index: dedup-key → sheet row number (1-indexed)
    const lastRow = sheet.getLastRow();
    const existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    // Normalize a (name, groupNo) pair into a stable dedup key
    const keyOf = (name, groupNo) =>
      String(name  || "").trim().toLowerCase() + "__" +
      String(groupNo || "").trim();

    const index = new Map(); // key → row number
    existing.forEach((r, i) => {
      const key = keyOf(r[0], r[3]); // col A = juror, col D = group no
      if (key !== "__") index.set(key, i + 2); // +2: 1-indexed + header
    });

    // Dedupe the incoming payload (last entry for a key wins)
    const latestByKey = new Map();
    (data.rows || []).forEach((row) => {
      const key = keyOf(row.juryName, row.projectId);
      if (key !== "__") latestByKey.set(key, row);
    });

    let updated = 0;
    let added   = 0;

    latestByKey.forEach((row, key) => {
      // Determine effective status: never downgrade "submitted" → "in_progress"
      let newStatus = String(row.status || "submitted");
      const existingRowNum = index.get(key);

      if (existingRowNum) {
        // Read current status from col L (index 11, 0-based)
        const currentStatus = String(existing[existingRowNum - 2][11] || "");
        if (currentStatus === "submitted" && newStatus === "in_progress") {
          newStatus = "submitted"; // protect submitted rows from in_progress overwrites
        }
      }

      const values = [
        row.juryName,   row.juryDept,    row.timestamp,
        row.projectId,  row.projectName,
        row.design,     row.technical,   row.delivery, row.teamwork,
        row.total,      row.comments,    newStatus
      ];

      if (existingRowNum) {
        sheet.getRange(existingRowNum, 1, 1, NUM_COLS).setValues([values]);
        updated++;
      } else {
        sheet.appendRow(values);
        index.set(key, sheet.getLastRow());
        added++;
      }
    });

    return json({ status: "ok", updated, added });

  } catch (err) {
    return json({ status: "error", message: String(err) });
  }
}

// ── JSON response helper ──────────────────────────────────────
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
