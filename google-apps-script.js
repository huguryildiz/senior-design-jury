// ============================================================
// EE 492 Jury App – Google Apps Script
// ============================================================
// POST → upsert jury evaluation rows (in_progress or submitted)
// GET  → action=export: authenticated JSON dump for AdminPanel
//
// Sheet columns A–L:
//   A  Juror Name
//   B  Department / Institution
//   C  Timestamp
//   D  Group No
//   E  Group Name
//   F  Design (20)
//   G  Technical (40)
//   H  Delivery (30)
//   I  Teamwork (10)
//   J  Total (100)
//   K  Comments
//   L  Status   ("in_progress" | "submitted")
//
// Dedup key: lowercase(jurorName) + "__" + groupNo
// "submitted" rows are never overwritten by "in_progress" updates.
// ============================================================

const SHEET_NAME = "Evaluations";
const NUM_COLS   = 12; // columns A–L

// ── Check admin password against Script Properties ────────────
function isAuthorized(pass) {
  const stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";
  return stored.length > 0 && pass === stored;
}

// ── GET: health-check + authenticated export ──────────────────
function doGet(e) {
  try {
    const action = (e.parameter.action || "").toLowerCase();

    if (action === "export") {
      if (!isAuthorized(e.parameter.pass || "")) {
        return respond({ status: "unauthorized" });
      }

      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) return respond({ status: "ok", rows: [] });

      const values  = sheet.getDataRange().getValues();
      const headers = values.shift(); // remove header row

      const rows = values.map((r) => {
        const obj = {};
        headers.forEach((h, i) => { obj[String(h)] = r[i]; });
        return obj;
      });

      return respond({ status: "ok", rows });
    }

    return respond({ status: "ok" }); // health-check
  } catch (err) {
    return respond({ status: "error", message: String(err) });
  }
}

// ── POST: upsert evaluation rows ──────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet with styled header row if it does not exist yet
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No", "Group Name",
        "Design (20)", "Technical (40)", "Delivery (30)", "Teamwork (10)",
        "Total (100)", "Comments", "Status"
      ]);
      // Style all 12 header columns consistently
      sheet.getRange(1, 1, 1, NUM_COLS)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    // Build an index: dedup-key → sheet row number (1-based, skipping header)
    const lastRow  = sheet.getLastRow();
    const existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    // Normalize (jurorName, groupNo) into a stable lowercase dedup key
    const keyOf = (name, groupNo) =>
      String(name   || "").trim().toLowerCase() + "__" +
      String(groupNo || "").trim();

    const index = new Map(); // key → row number
    existing.forEach((r, i) => {
      const key = keyOf(r[0], r[3]); // col A = juror, col D = group no
      if (key !== "__") index.set(key, i + 2); // +2: 1-indexed + header
    });

    // Dedupe incoming payload (last row per key wins inside the payload)
    const latestByKey = new Map();
    (data.rows || []).forEach((row) => {
      const key = keyOf(row.juryName, row.projectId);
      if (key !== "__") latestByKey.set(key, row);
    });

    let updated = 0, added = 0;

    latestByKey.forEach((row, key) => {
      let newStatus = String(row.status || "submitted");

      // Protect submitted rows: never downgrade to in_progress
      const existingRowNum = index.get(key);
      if (existingRowNum) {
        // col L is index 11 (0-based) in the existing values array
        const currentStatus = String(existing[existingRowNum - 2][11] || "");
        if (currentStatus === "submitted" && newStatus === "in_progress") {
          newStatus = "submitted";
        }
      }

      const values = [
        row.juryName, row.juryDept,  row.timestamp,
        row.projectId, row.projectName,
        row.design,   row.technical, row.delivery, row.teamwork,
        row.total,    row.comments,  newStatus
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

    return respond({ status: "ok", updated, added });

  } catch (err) {
    return respond({ status: "error", message: String(err) });
  }
}

// ── JSON response helper ──────────────────────────────────────
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
