// ============================================================
// EE 492 Jury App – Google Apps Script (FULL)
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
//
// Sheet: "Drafts"  columns A–C
//   A  DraftKey (juryName__juryDept, lowercase)
//   B  DraftJSON
//   C  UpdatedAt
//
// Status values used in Evaluations:
//   "in_progress"
//   "group_submitted"
//   "all_submitted"
//
// Endpoints:
//   GET  ?action=export&pass=X
//   GET  ?action=initInfo&pass=X
//   GET  ?action=loadDraft&juryName=X&juryDept=Y
//   GET  ?action=verify&juryName=X&juryDept=Y
//   GET  ?action=myscores&juryName=X&juryDept=Y
//
//   POST body { action:"saveDraft", juryName, juryDept, draft }
//   POST body { action:"deleteDraft", juryName, juryDept }
//   POST body { action:"deleteJurorData", juryName, juryDept }
//   POST body { action:"resetJuror", juryName, juryDept }
//   POST body { rows: [...] }  → upsert evaluation rows
// ============================================================

var EVAL_SHEET  = "Evaluations";
var DRAFT_SHEET = "Drafts";
var INFO_SHEET  = "Info";
var NUM_COLS    = 12;

// ✅ resetJuror sonrası downgrade’e izin vermek için "unlock window"
var RESET_UNLOCK_MINUTES = 20; // istersen 5-10 da yapabilirsin

// ── PROJECTS_DATA: copy from config.js and update each semester ──
var PROJECTS_DATA = [
  { id: 1, name: "Group 1", desc: "Göksiper Hava Savunma Sistemi", students: ["Mustafa Yusuf Ünal", "Ayça Naz Dedeoğlu", "Onur Mesci", "Çağan Erdoğan"] },
  { id: 2, name: "Group 2", desc: "Radome and Radar-Absorbing Material Electromagnetic Design Software (REMDET)", students: ["Niyazi Atilla Özer", "Bertan Ünver", "Ada Tatlı", "Nesibe Aydın"] },
  { id: 3, name: "Group 3", desc: "Smart Crosswalk", students: ["Sami Eren Germeç"] },
  { id: 4, name: "Group 4", desc: "Radar Cross Section (RCS) Analysis – Supporting Multi-Purpose Ray Tracing Algorithm", students: ["Ahmet Melih Yavuz", "Yasemin Erciyas"] },
  { id: 5, name: "Group 5", desc: "Monitoring Pilots' Health Status and Cognitive Abilities During Flight", students: ["Aysel Mine Çaylan", "Selimhan Kaynar", "Abdulkadir Sazlı", "Alp Efe İpek"] },
  { id: 6, name: "Group 6", desc: "AKKE, Smart Command and Control Glove", students: ["Şevval Kurtulmuş", "Abdullah Esin", "Berk Çakmak", "Ömer Efe Dikici"] }
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

// ✅ reset unlock helpers
function norm_(s) { return String(s || "").trim().toLowerCase(); }

function resetUnlockKey_(juryName, juryDept) {
  return "RESET_UNLOCK__" + norm_(juryName) + "__" + norm_(juryDept);
}

function markResetUnlock_(juryName, juryDept) {
  var key = resetUnlockKey_(juryName, juryDept);
  PropertiesService.getScriptProperties().setProperty(key, String(Date.now()));
}

function isResetUnlockActive_(juryName, juryDept) {
  var key = resetUnlockKey_(juryName, juryDept);
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) return false;
  var ts = parseInt(v, 10);
  if (!isFinite(ts)) return false;
  var ageMs = Date.now() - ts;
  return ageMs <= RESET_UNLOCK_MINUTES * 60 * 1000;
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

      if (!infoSheet) {
        infoSheet = ss.insertSheet(INFO_SHEET);
      } else {
        infoSheet.clear();
      }

      infoSheet.appendRow(["Group No", "Group Name", "Group Desc", "Students"]);
      infoSheet.getRange(1, 1, 1, 4)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      infoSheet.setFrozenRows(1);

      PROJECTS_DATA.forEach(function(p) {
        infoSheet.appendRow([ p.id, p.name, p.desc, (p.students || []).join(", ") ]);
      });

      infoSheet.autoResizeColumns(1, 4);
      return respond({ status: "ok", message: "Info sheet created/refreshed with " + PROJECTS_DATA.length + " groups." });
    }

    // ── Load draft ────────────────────────────────────────────
    if (action === "loaddraft") {
      var juryName = (e.parameter.juryName || "").trim();
      var juryDept = (e.parameter.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" }); // ✅ require BOTH

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
      var juryNameV = (e.parameter.juryName || "").trim().toLowerCase();
      var juryDeptV = (e.parameter.juryDept || "").trim().toLowerCase();
      if (!juryNameV || !juryDeptV) return respond({ status: "error", message: "juryName and juryDept required" }); // ✅ require BOTH

      var ssV    = SpreadsheetApp.getActiveSpreadsheet();
      var sheetV = ssV.getSheetByName(EVAL_SHEET);
      if (!sheetV) return respond({ status: "ok", submittedCount: 0 });

      var valuesV = sheetV.getDataRange().getValues();
      valuesV.shift();

      var count = valuesV.filter(function(r) {
        var rowName   = String(r[0] || "").trim().toLowerCase();
        var rowDept   = String(r[1] || "").trim().toLowerCase();
        var rowStatus = String(r[11] || "").trim();
        return (rowName === juryNameV) && (rowDept === juryDeptV) && (rowStatus === "all_submitted"); // ✅ exact match
      }).length;

      return respond({ status: "ok", submittedCount: count });
    }

    // ── myscores → latest rows for juror (one per group) ──────
    if (action === "myscores") {
      var juryNameM = (e.parameter.juryName || "").trim().toLowerCase();
      var juryDeptM = (e.parameter.juryDept || "").trim().toLowerCase();
      if (!juryNameM || !juryDeptM) return respond({ status: "error", message: "juryName and juryDept required" }); // ✅ require BOTH

      var ssM    = SpreadsheetApp.getActiveSpreadsheet();
      var sheetM = ssM.getSheetByName(EVAL_SHEET);
      if (!sheetM) return respond({ status: "ok", rows: [] });

      var lastRowM = sheetM.getLastRow();
      if (lastRowM < 2) return respond({ status: "ok", rows: [] });

      var valuesM = sheetM.getRange(2, 1, lastRowM - 1, NUM_COLS).getValues();

      var bestByGroup = {};
      var pri = { "all_submitted": 3, "group_submitted": 2, "in_progress": 1 };

      valuesM.forEach(function(r) {
        var rowName = String(r[0] || "").trim().toLowerCase();
        var rowDept = String(r[1] || "").trim().toLowerCase();
        var groupNo = String(r[3] || "").trim();
        if (!groupNo) return;

        // ✅ exact match
        if (rowName !== juryNameM) return;
        if (rowDept !== juryDeptM) return;

        var status = String(r[11] || "").trim();
        var cur = bestByGroup[groupNo];

        if (!cur) { bestByGroup[groupNo] = r; return; }

        var curStatus = String(cur[11] || "").trim();
        if ((pri[status] || 0) > (pri[curStatus] || 0)) {
          bestByGroup[groupNo] = r;
          return;
        }

        var curTs = String(cur[2] || "");
        var newTs = String(r[2] || "");
        if ((pri[status] || 0) === (pri[curStatus] || 0) && newTs > curTs) {
          bestByGroup[groupNo] = r;
        }
      });

      var rowsOut = Object.keys(bestByGroup)
        .map(function(g) {
          var r = bestByGroup[g];
          return {
            juryName: r[0],
            juryDept: r[1],
            timestamp: r[2],
            projectId: Number(r[3]),
            projectName: r[4],
            design: r[5],
            technical: r[6],
            delivery: r[7],
            teamwork: r[8],
            total: r[9],
            comments: r[10],
            status: r[11]
          };
        })
        .sort(function(a, b) { return (a.projectId || 0) - (b.projectId || 0); });

      return respond({ status: "ok", rows: rowsOut });
    }

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
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" }); // ✅ require BOTH

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

    // ── Delete juror data (draft + ALL evaluations) ───────────
    if (data.action === "deleteJurorData") {
      var juryNameD = (data.juryName || "").trim();
      var juryDeptD = (data.juryDept || "").trim();
      if (!juryNameD || !juryDeptD) return respond({ status: "error", message: "juryName and juryDept required" }); // ✅ require BOTH

      var draftDeleted = 0;
      var draftSheetD = getOrCreateDraftSheet();
      var keyD = makeDraftKey(juryNameD, juryDeptD);
      var rowIndexD = findDraftRowIndex(draftSheetD, keyD);
      if (rowIndexD > 0) {
        draftSheetD.deleteRow(rowIndexD);
        draftDeleted = 1;
      }

      var evalDeleted = 0;
      var ssD = SpreadsheetApp.getActiveSpreadsheet();
      var evalSheetD = ssD.getSheetByName(EVAL_SHEET);

      if (evalSheetD) {
        var lastRowD = evalSheetD.getLastRow();
        if (lastRowD >= 2) {
          var valuesD = evalSheetD.getRange(2, 1, lastRowD - 1, NUM_COLS).getValues();
          var targetName = juryNameD.trim().toLowerCase();
          var targetDept = juryDeptD.trim().toLowerCase();

          for (var i = valuesD.length - 1; i >= 0; i--) {
            var rowName = String(valuesD[i][0] || "").trim().toLowerCase();
            var rowDept = String(valuesD[i][1] || "").trim().toLowerCase();
            if (rowName === targetName && rowDept === targetDept) {
              evalSheetD.deleteRow(i + 2);
              evalDeleted++;
            }
          }
        }
      }

      return respond({ status: "ok", draftDeleted: draftDeleted, evalDeleted: evalDeleted });
    }

    // ── Delete draft ──────────────────────────────────────────
    if (data.action === "deleteDraft") {
      var juryNameX = (data.juryName || "").trim();
      var juryDeptX = (data.juryDept || "").trim();
      if (!juryNameX || !juryDeptX) return respond({ status: "error", message: "juryName and juryDept required" }); // ✅ require BOTH

      var draftSheetX = getOrCreateDraftSheet();
      var keyX = makeDraftKey(juryNameX, juryDeptX);
      var rowIndexX = findDraftRowIndex(draftSheetX, keyX);
      if (rowIndexX > 0) draftSheetX.deleteRow(rowIndexX);
      return respond({ status: "ok" });
    }

    // ── Reset juror: force all rows back to in_progress ───────
    if (data.action === "resetJuror") {
      var juryNameR = (data.juryName || "").trim().toLowerCase();
      var juryDeptR = (data.juryDept || "").trim().toLowerCase();
      if (!juryNameR || !juryDeptR) return respond({ status: "error", message: "juryName and juryDept required" }); // ✅ require BOTH

      // ✅ mark unlock so upsert can downgrade from all_submitted
      markResetUnlock_(juryNameR, juryDeptR);

      var ssR = SpreadsheetApp.getActiveSpreadsheet();
      var sheetR = ssR.getSheetByName(EVAL_SHEET);
      if (!sheetR) return respond({ status: "ok", reset: 0 });

      var lastRowR = sheetR.getLastRow();
      if (lastRowR < 2) return respond({ status: "ok", reset: 0 });

      var valuesR = sheetR.getRange(2, 1, lastRowR - 1, NUM_COLS).getValues();
      var reset = 0;

      valuesR.forEach(function(r, i) {
        var rowName = String(r[0] || "").trim().toLowerCase();
        var rowDept = String(r[1] || "").trim().toLowerCase();

        if (rowName === juryNameR && rowDept === juryDeptR) {
          sheetR.getRange(i + 2, 12).setValue("in_progress");
          sheetR.getRange(i + 2, 1, 1, NUM_COLS).setBackground("#fef9c3"); // yellow
          reset++;
        }
      });

      return respond({ status: "ok", reset: reset });
    }

    // ── Upsert evaluation rows (default POST action) ──────────
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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

    var lastRow = sheet.getLastRow();
    var existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    // ✅ include dept in key to avoid collisions
    function keyOf(name, dept, groupNo) {
      return String(name || "").trim().toLowerCase()
        + "__" + String(dept || "").trim().toLowerCase()
        + "__" + String(groupNo || "").trim();
    }

    var index = {};
    existing.forEach(function(r, i) {
      var k = keyOf(r[0], r[1], r[3]);
      if (k !== "____") index[k] = i + 2;
    });

    // keep latest payload per key
    var latestByKey = {};
    (data.rows || []).forEach(function(row) {
      var k = keyOf(row.juryName, row.juryDept, row.projectId);
      if (k !== "____") latestByKey[k] = row;
    });

    var updated = 0, added = 0;

    Object.keys(latestByKey).forEach(function(k) {
      var row = latestByKey[k];
      var newStatus = String(row.status || "all_submitted");

      var existingRowNum = index[k];
      if (existingRowNum) {
        var currentStatus = String(existing[existingRowNum - 2][11] || "");

        // ✅ Default: lock all_submitted
        // ✅ BUT: if resetJuror was called recently for this juror+dept, allow downgrade
        if (currentStatus === "all_submitted" && newStatus !== "all_submitted") {
          var allowDowngrade = isResetUnlockActive_(row.juryName, row.juryDept);
          if (!allowDowngrade) {
            newStatus = "all_submitted";
          }
        }
      }

      // Color-code row by status (distinct greens)
      var bgColor =
        newStatus === "in_progress"     ? "#fef9c3" :  // yellow
        newStatus === "group_submitted" ? "#dcfce7" :  // light green
        newStatus === "all_submitted"   ? "#bbf7d0" :  // slightly darker green (final)
        "#ffffff";

      var values = [
        row.juryName, row.juryDept, row.timestamp,
        row.projectId, row.projectName,
        row.design, row.technical, row.delivery, row.teamwork,
        row.total, row.comments, newStatus
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
        index[k] = newRow;
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  return String(juryName || "").trim().toLowerCase()
    + "__" + String(juryDept || "").trim().toLowerCase();
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