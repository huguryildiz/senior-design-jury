// ============================================================
// EE 492 Jury App – Google Apps Script
// ============================================================
// Sheet: "Evaluations"  columns A–L (12 cols)
//   A  Juror Name          G  Technical (40)
//   B  Department          H  Delivery (30)
//   C  Timestamp           I  Teamwork (10)
//   D  Group No            J  Total (100)
//   E  Group Name          K  Comments
//   F  Design (20)         L  Status
//
// Sheet: "Drafts"  columns A–C
//   A  DraftKey (juryName__juryDept, lowercase)
//   B  DraftJSON
//   C  UpdatedAt
//
// Status values used in Evaluations:
//   "in_progress"     – juror started, group not fully scored
//   "group_submitted" – this group fully scored, not final-submitted yet
//   "all_submitted"   – final submit clicked, all groups locked
//
// Endpoints:
//   GET  ?action=export&pass=X          → authenticated JSON dump
//   GET  ?action=loadDraft&juryName=X&juryDept=Y → load cloud draft
//   GET  ?action=verify&juryName=X      → count all_submitted rows for juror
//   POST body { action:"saveDraft",   juryName, juryDept, draft }
//   POST body { action:"deleteDraft", juryName, juryDept }
//   POST body { rows: [...] }           → upsert evaluation rows (default)
// ============================================================

var EVAL_SHEET  = "Evaluations";
var DRAFT_SHEET = "Drafts";
var NUM_COLS    = 12;

// ── Authorization ─────────────────────────────────────────────
function isAuthorized(pass) {
  var stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";
  return stored.length > 0 && pass === stored;
}

// ── JSON response helper ──────────────────────────────────────
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET handler ───────────────────────────────────────────────
function doGet(e) {
  try {
    var action = (e.parameter.action || "").toLowerCase();

    // ── Export: authenticated full data dump ──────────────────
    if (action === "export") {
      if (!isAuthorized(e.parameter.pass || "")) {
        return respond({ status: "unauthorized" });
      }
      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", rows: [] });

      var values  = sheet.getDataRange().getValues();
      var headers = values.shift();
      var rows = values.map(function(r) {
        var obj = {};
        headers.forEach(function(h, i) { obj[String(h)] = r[i]; });
        return obj;
      });
      return respond({ status: "ok", rows: rows });
    }

    // ── Load draft: returns draft JSON for a juror ────────────
    if (action === "loaddraft") {
      var juryName = (e.parameter.juryName || "").trim();
      var juryDept = (e.parameter.juryDept || "").trim();
      if (!juryName) return respond({ status: "error", message: "juryName required" });

      var draftSheet = getOrCreateDraftSheet();
      var key        = makeDraftKey(juryName, juryDept);
      var row        = findDraftRow(draftSheet, key);

      if (!row) return respond({ status: "not_found" });

      var draftJson = row[1];
      try {
        var draft = JSON.parse(draftJson);
        return respond({ status: "ok", draft: draft });
      } catch (parseErr) {
        return respond({ status: "error", message: "Invalid draft JSON" });
      }
    }

    // ── Verify: count all_submitted rows for a juror ──────────
    if (action === "verify") {
      var juryName = (e.parameter.juryName || "").trim().toLowerCase();
      if (!juryName) return respond({ status: "error", message: "juryName required" });

      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", submittedCount: 0 });

      var values  = sheet.getDataRange().getValues();
      values.shift(); // remove header

      var count = values.filter(function(r) {
        var rowName   = String(r[0] || "").trim().toLowerCase();
        var rowStatus = String(r[11] || "").trim();
        return rowName === juryName && rowStatus === "all_submitted";
      }).length;

      return respond({ status: "ok", submittedCount: count });
    }

    // ── Health check ──────────────────────────────────────────
    return respond({ status: "ok" });

  } catch (err) {
    return respond({ status: "error", message: String(err) });
  }
}

// ── POST handler ──────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── Save draft ────────────────────────────────────────────
    if (data.action === "saveDraft") {
      var juryName   = (data.juryName || "").trim();
      var juryDept   = (data.juryDept || "").trim();
      var draftValue = JSON.stringify(data.draft || {});
      if (!juryName) return respond({ status: "error", message: "juryName required" });

      var draftSheet = getOrCreateDraftSheet();
      var key        = makeDraftKey(juryName, juryDept);
      var existingRow = findDraftRowIndex(draftSheet, key);
      var now         = new Date().toLocaleString("en-GB");

      if (existingRow > 0) {
        // Update existing draft row
        draftSheet.getRange(existingRow, 2, 1, 2).setValues([[draftValue, now]]);
      } else {
        // Append new draft row
        draftSheet.appendRow([key, draftValue, now]);
      }
      return respond({ status: "ok" });
    }

    // ── Delete draft ──────────────────────────────────────────
    if (data.action === "deleteDraft") {
      var juryName = (data.juryName || "").trim();
      var juryDept = (data.juryDept || "").trim();
      if (!juryName) return respond({ status: "error", message: "juryName required" });

      var draftSheet  = getOrCreateDraftSheet();
      var key         = makeDraftKey(juryName, juryDept);
      var rowIndex    = findDraftRowIndex(draftSheet, key);
      if (rowIndex > 0) draftSheet.deleteRow(rowIndex);
      return respond({ status: "ok" });
    }

    // ── Upsert evaluation rows (default POST action) ──────────
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(EVAL_SHEET);

    // Create sheet with styled header if it does not exist yet
    if (!sheet) {
      sheet = ss.insertSheet(EVAL_SHEET);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No", "Group Name",
        "Design (20)", "Technical (40)", "Delivery (30)", "Teamwork (10)",
        "Total (100)", "Comments", "Status"
      ]);
      // Style all 12 header columns with the same theme
      sheet.getRange(1, 1, 1, NUM_COLS)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    // Build index: dedup-key → sheet row number (1-based, after header)
    var lastRow  = sheet.getLastRow();
    var existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    // Stable lowercase dedup key: jurorName + "__" + groupNo
    function keyOf(name, groupNo) {
      return String(name || "").trim().toLowerCase() + "__" + String(groupNo || "").trim();
    }

    var index = {};
    existing.forEach(function(r, i) {
      var key = keyOf(r[0], r[3]);
      if (key !== "__") index[key] = i + 2; // +2: 1-indexed + header row
    });

    // Dedupe incoming payload: last entry per key wins
    var latestByKey = {};
    (data.rows || []).forEach(function(row) {
      var key = keyOf(row.juryName, row.projectId);
      if (key !== "__") latestByKey[key] = row;
    });

    var updated = 0, added = 0;

    Object.keys(latestByKey).forEach(function(key) {
      var row       = latestByKey[key];
      var newStatus = String(row.status || "all_submitted");

      // Status promotion rules — never downgrade a more complete status
      var existingRowNum = index[key];
      if (existingRowNum) {
        var currentStatus = String(existing[existingRowNum - 2][11] || "");
        // Priority: all_submitted > group_submitted > in_progress
        var priority = { "all_submitted": 3, "group_submitted": 2, "in_progress": 1 };
        var curPri   = priority[currentStatus] || 0;
        var newPri   = priority[newStatus]     || 0;
        if (curPri > newPri) newStatus = currentStatus; // keep the higher status
      }

      var values = [
        row.juryName,    row.juryDept,    row.timestamp,
        row.projectId,   row.projectName,
        row.design,      row.technical,   row.delivery, row.teamwork,
        row.total,       row.comments,    newStatus
      ];

      if (existingRowNum) {
        sheet.getRange(existingRowNum, 1, 1, NUM_COLS).setValues([values]);
        updated++;
      } else {
        sheet.appendRow(values);
        index[key] = sheet.getLastRow();
        added++;
      }
    });

    return respond({ status: "ok", updated: updated, added: added });

  } catch (err) {
    return respond({ status: "error", message: String(err) });
  }
}

// ── Draft sheet helpers ───────────────────────────────────────

// Returns or creates the Drafts sheet with a styled header
function getOrCreateDraftSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DRAFT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DRAFT_SHEET);
    sheet.appendRow(["DraftKey", "DraftJSON", "UpdatedAt"]);
    sheet.getRange(1, 1, 1, 3)
      .setFontWeight("bold")
      .setBackground("#1d4ed8")
      .setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 400); // DraftJSON column wider for readability
  }
  return sheet;
}

// Creates a stable lowercase key from juryName + juryDept
function makeDraftKey(juryName, juryDept) {
  return String(juryName || "").trim().toLowerCase() +
    "__" + String(juryDept || "").trim().toLowerCase();
}

// Returns the values array [key, json, updatedAt] for a key, or null
function findDraftRow(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) return values[i];
  }
  return null;
}

// Returns the 1-based row number for a key, or 0 if not found
function findDraftRowIndex(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) return i + 2; // +2: 1-indexed + header
  }
  return 0;
}
