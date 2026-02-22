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
// Sheet: "Info"  columns A–D
//   A  Group No   B  Group Name   C  Group Desc   D  Students
//   (Students: comma-separated names in one cell)
//   Created/refreshed via GET ?action=initInfo&pass=X
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
//   GET  ?action=initInfo&pass=X        → create/refresh Info sheet from PROJECTS_DATA
//   GET  ?action=loadDraft&juryName=X&juryDept=Y → load cloud draft
//   GET  ?action=verify&juryName=X      → count all_submitted rows for juror
//   POST body { action:"saveDraft",   juryName, juryDept, draft }
//   POST body { action:"deleteDraft", juryName, juryDept }
//   POST body { rows: [...] }           → upsert evaluation rows (default)
// ============================================================

var EVAL_SHEET  = "Evaluations";
var DRAFT_SHEET = "Drafts";
var INFO_SHEET  = "Info";
var NUM_COLS    = 12;

// ── PROJECTS_DATA: copy from config.js and update each semester ──
// This is the server-side source of truth for the Info sheet.
var PROJECTS_DATA = [
  { id: 1, name: "Group 1", desc: "Göksiper Hava Savunma Sistemi",           students: ["Mustafa Yusuf Ünal", "Ayça Naz Dedeoğlu", "Onur Mesci", "Çağan Erdoğan"] },
  { id: 2, name: "Group 2", desc: "Radome and Radar-Absorbing Material Electromagnetic Design Software (REMDET)", students: ["Niyazi Atilla Özer", "Bertan Ünver", "Ada Tatlı", "Nesibe Aydın"] },
  { id: 3, name: "Group 3", desc: "Smart Crosswalk",                          students: ["Sami Eren Germeç"] },
  { id: 4, name: "Group 4", desc: "Radar Cross Section (RCS) Analysis – Supporting Multi-Purpose Ray Tracing Algorithm", students: ["Ahmet Melih Yavuz", "Yasemin Erciyas"] },
  { id: 5, name: "Group 5", desc: "Monitoring Pilots' Health Status and Cognitive Abilities During Flight", students: ["Aysel Mine Çaylan", "Selimhan Kaynar", "Abdulkadir Sazlı", "Alp Efe İpek"] },
  { id: 6, name: "Group 6", desc: "AKKE, Smart Command and Control Glove",   students: ["Şevval Kurtulmuş", "Abdullah Esin", "Berk Çakmak", "Ömer Efe Dikici"] }
];

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

    // ── initInfo: create/refresh the Info sheet ───────────────
    if (action === "initinfo") {
      if (!isAuthorized(e.parameter.pass || "")) {
        return respond({ status: "unauthorized" });
      }
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var infoSheet = ss.getSheetByName(INFO_SHEET);

      // Create if not exists
      if (!infoSheet) {
        infoSheet = ss.insertSheet(INFO_SHEET);
      } else {
        infoSheet.clear(); // clears both content and formatting
      }

      // Header row
      infoSheet.appendRow(["Group No", "Group Name", "Group Desc", "Students"]);
      infoSheet.getRange(1, 1, 1, 4)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      infoSheet.setFrozenRows(1);

      // Data rows
      PROJECTS_DATA.forEach(function(p) {
        infoSheet.appendRow([
          p.id,
          p.name,
          p.desc,
          (p.students || []).join(", ")
        ]);
      });

      // Auto-resize columns
      infoSheet.autoResizeColumns(1, 4);

      return respond({ status: "ok", message: "Info sheet created/refreshed with " + PROJECTS_DATA.length + " groups." });
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
    // Matches on juryName + juryDept (both required for uniqueness)
    if (action === "verify") {
      var juryName = (e.parameter.juryName || "").trim().toLowerCase();
      var juryDept = (e.parameter.juryDept || "").trim().toLowerCase();
      if (!juryName) return respond({ status: "error", message: "juryName required" });

      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", submittedCount: 0 });

      var values  = sheet.getDataRange().getValues();
      values.shift();

      var count = values.filter(function(r) {
        var rowName   = String(r[0] || "").trim().toLowerCase();
        var rowDept   = String(r[1] || "").trim().toLowerCase();
        var rowStatus = String(r[11] || "").trim();
        // If juryDept provided, match both; otherwise match name only
        var nameMatch = rowName === juryName;
        var deptMatch = !juryDept || rowDept === juryDept;
        return nameMatch && deptMatch && rowStatus === "all_submitted";
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
        draftSheet.getRange(existingRow, 2, 1, 2).setValues([[draftValue, now]]);
      } else {
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

    if (!sheet) {
      sheet = ss.insertSheet(EVAL_SHEET);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No", "Group Name",
        "Design (20)", "Technical (40)", "Delivery (30)", "Teamwork (10)",
        "Total (100)", "Comments", "Status"
      ]);
      sheet.getRange(1, 1, 1, NUM_COLS)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    var lastRow  = sheet.getLastRow();
    var existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    function keyOf(name, groupNo) {
      return String(name || "").trim().toLowerCase() + "__" + String(groupNo || "").trim();
    }

    var index = {};
    existing.forEach(function(r, i) {
      var key = keyOf(r[0], r[3]);
      if (key !== "__") index[key] = i + 2;
    });

    var latestByKey = {};
    (data.rows || []).forEach(function(row) {
      var key = keyOf(row.juryName, row.projectId);
      if (key !== "__") latestByKey[key] = row;
    });

    var updated = 0, added = 0;

    Object.keys(latestByKey).forEach(function(key) {
      var row       = latestByKey[key];
      var newStatus = String(row.status || "all_submitted");

      var existingRowNum = index[key];
      if (existingRowNum) {
        var currentStatus = String(existing[existingRowNum - 2][11] || "");
        var priority = { "all_submitted": 3, "group_submitted": 2, "in_progress": 1 };
        var curPri   = priority[currentStatus] || 0;
        var newPri   = priority[newStatus]     || 0;
        if (curPri > newPri) newStatus = currentStatus;
      }

      // Color-code row by status
      var bgColor = newStatus === "in_progress"     ? "#fef9c3"  // yellow
                  : newStatus === "group_submitted"  ? "#dcfce7"  // green
                  : newStatus === "all_submitted"    ? "#dcfce7"  // green
                  : "#ffffff";

      var values = [
        row.juryName,    row.juryDept,    row.timestamp,
        row.projectId,   row.projectName,
        row.design,      row.technical,   row.delivery, row.teamwork,
        row.total,       row.comments,    newStatus
      ];

      if (existingRowNum) {
        var range = sheet.getRange(existingRowNum, 1, 1, NUM_COLS);
        range.setValues([values]);
        range.setBackground(bgColor);
        updated++;
      } else {
        sheet.appendRow(values);
        var newRow = sheet.getLastRow();
        sheet.getRange(newRow, 1, 1, NUM_COLS).setBackground(bgColor);
        index[key] = newRow;
        added++;
      }
    });

    return respond({ status: "ok", updated: updated, added: added });

  } catch (err) {
    return respond({ status: "error", message: String(err) });
  }
}

// ── Draft sheet helpers ───────────────────────────────────────

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
    sheet.setColumnWidth(2, 400);
  }
  return sheet;
}

function makeDraftKey(juryName, juryDept) {
  return String(juryName || "").trim().toLowerCase() +
    "__" + String(juryDept || "").trim().toLowerCase();
}

function findDraftRow(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) return values[i];
  }
  return null;
}

function findDraftRowIndex(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) return i + 2;
  }
  return 0;
}
