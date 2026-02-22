// google-apps-script.js
// ============================================================
// EE 492 Jury App – Google Apps Script (Full)
// ============================================================
//
// Sheet: "Evaluations"  columns A–M (13 cols)
//   A  Juror Name          H  Delivery (30)
//   B  Department          I  Teamwork (10)
//   C  Timestamp           J  Total (100)
//   D  Group No            K  Comments
//   E  Group Name          L  Status
//   F  Design (20)         M  EditingFlag   ← NEW (col 13)
//   G  Technical (40)
//
// Sheet: "Drafts"  columns A–D
//   A  DraftKey (juryName__juryDept, lowercase)
//   B  DraftJSON
//   C  UpdatedAt
//   D  PIN (4-digit, stored plain — not sensitive data)
//
// Sheet: "Info"  columns A–D
//   A  Group No   B  Group Name   C  Group Desc   D  Students
//
// PropertiesService keys:
//   ADMIN_PASSWORD               → admin password
//   PIN__{key}                   → 4-digit PIN for juror
//   LOCKED__{key}                → "1" when brute-forced
//   ATTEMPTS__{key}              → failed attempt count (string)
//   RESET_UNLOCK__{key}          → ms timestamp of last resetJuror
//
// Status values (Evaluations col L):
//   "in_progress"      – started, not fully scored
//   "group_submitted"  – group fully scored
//   "all_submitted"    – final submit pressed
//
// EditingFlag values (Evaluations col M):
//   "editing"  – resetJuror was called, juror is currently editing
//   ""         – normal (cleared on all_submitted)
//
// ── GET endpoints ──────────────────────────────────────────
//   ?action=export&pass=X
//   ?action=initInfo&pass=X
//   ?action=loadDraft&juryName=X&juryDept=Y
//   ?action=verify&juryName=X&juryDept=Y
//   ?action=myscores&juryName=X&juryDept=Y
//   ?action=checkPin&juryName=X&juryDept=Y
//   ?action=createPin&juryName=X&juryDept=Y
//   ?action=verifyPin&juryName=X&juryDept=Y&pin=XXXX
//   ?action=resetPin&juryName=X&juryDept=Y&pass=ADMINPASS
//
// ── POST endpoints ──────────────────────────────────────────
//   { action:"saveDraft",       juryName, juryDept, draft }
//   { action:"deleteDraft",     juryName, juryDept }
//   { action:"deleteJurorData", juryName, juryDept }
//   { action:"resetJuror",      juryName, juryDept }
//   { rows: [...] }  → upsert evaluation rows
// ============================================================

var EVAL_SHEET  = "Evaluations";
var DRAFT_SHEET = "Drafts";
var INFO_SHEET  = "Info";
var NUM_COLS    = 13; // Updated: now includes EditingFlag column

// How long resetJuror's "unlock window" stays open (allows
// downgrading all_submitted rows during an edit session).
var RESET_UNLOCK_MINUTES = 20;

// Maximum PIN attempts before account is locked
var MAX_PIN_ATTEMPTS = 3;

// ── Project data: copy from config.js each semester ──────────
var PROJECTS_DATA = [
  { id: 1, name: "Group 1", desc: "Göksiper Hava Savunma Sistemi",                                                  students: ["Mustafa Yusuf Ünal", "Ayça Naz Dedeoğlu", "Onur Mesci", "Çağan Erdoğan"] },
  { id: 2, name: "Group 2", desc: "Radome and Radar-Absorbing Material Electromagnetic Design Software (REMDET)",   students: ["Niyazi Atilla Özer", "Bertan Ünver", "Ada Tatlı", "Nesibe Aydın"] },
  { id: 3, name: "Group 3", desc: "Smart Crosswalk",                                                                students: ["Sami Eren Germeç"] },
  { id: 4, name: "Group 4", desc: "Radar Cross Section (RCS) Analysis – Supporting Multi-Purpose Ray Tracing Algorithm", students: ["Ahmet Melih Yavuz", "Yasemin Erciyas"] },
  { id: 5, name: "Group 5", desc: "Monitoring Pilots' Health Status and Cognitive Abilities During Flight",          students: ["Aysel Mine Çaylan", "Selimhan Kaynar", "Abdulkadir Sazlı", "Alp Efe İpek"] },
  { id: 6, name: "Group 6", desc: "AKKE, Smart Command and Control Glove",                                          students: ["Şevval Kurtulmuş", "Abdullah Esin", "Berk Çakmak", "Ömer Efe Dikici"] },
];

// ── Helpers ───────────────────────────────────────────────────

function isAuthorized(pass) {
  var stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";
  return stored.length > 0 && pass === stored;
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Normalise to lowercase trim for key matching
function norm(s) { return String(s || "").trim().toLowerCase(); }

// Build a stable PropertiesService key from juryName + juryDept
function jurorKey(juryName, juryDept) {
  return norm(juryName) + "__" + norm(juryDept);
}

// ── Reset-unlock helpers ──────────────────────────────────────
// After resetJuror is called, the juror has RESET_UNLOCK_MINUTES
// to re-POST their rows (allowing all_submitted → in_progress downgrade).

function markResetUnlock(juryName, juryDept) {
  var key = "RESET_UNLOCK__" + jurorKey(juryName, juryDept);
  PropertiesService.getScriptProperties().setProperty(key, String(Date.now()));
}

function isResetUnlockActive(juryName, juryDept) {
  var key = "RESET_UNLOCK__" + jurorKey(juryName, juryDept);
  var v   = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) return false;
  var ts  = parseInt(v, 10);
  if (!isFinite(ts)) return false;
  return (Date.now() - ts) <= RESET_UNLOCK_MINUTES * 60 * 1000;
}

// ── PIN helpers ───────────────────────────────────────────────

function pinPropertyKey(juryName, juryDept) {
  return "PIN__" + jurorKey(juryName, juryDept);
}

function lockedPropertyKey(juryName, juryDept) {
  return "LOCKED__" + jurorKey(juryName, juryDept);
}

function attemptsPropertyKey(juryName, juryDept) {
  return "ATTEMPTS__" + jurorKey(juryName, juryDept);
}

// Generate a cryptographically-reasonable 4-digit PIN
function generatePin() {
  // Apps Script doesn't have crypto.getRandomValues; use Math.random
  // seeded by multiple calls for sufficient randomness in this context.
  var digits = "";
  for (var i = 0; i < 4; i++) {
    digits += String(Math.floor(Math.random() * 10));
  }
  return digits;
}

function getPin(juryName, juryDept) {
  return PropertiesService.getScriptProperties().getProperty(pinPropertyKey(juryName, juryDept));
}

function setPin(juryName, juryDept, pin) {
  PropertiesService.getScriptProperties().setProperty(pinPropertyKey(juryName, juryDept), pin);
}

function isLocked(juryName, juryDept) {
  return PropertiesService.getScriptProperties().getProperty(lockedPropertyKey(juryName, juryDept)) === "1";
}

function lockAccount(juryName, juryDept) {
  PropertiesService.getScriptProperties().setProperty(lockedPropertyKey(juryName, juryDept), "1");
}

function getAttempts(juryName, juryDept) {
  return parseInt(PropertiesService.getScriptProperties().getProperty(attemptsPropertyKey(juryName, juryDept)) || "0", 10);
}

function setAttempts(juryName, juryDept, n) {
  PropertiesService.getScriptProperties().setProperty(attemptsPropertyKey(juryName, juryDept), String(n));
}

function clearLock(juryName, juryDept) {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(lockedPropertyKey(juryName, juryDept));
  props.deleteProperty(attemptsPropertyKey(juryName, juryDept));
}

// ── GET handler ───────────────────────────────────────────────

function doGet(e) {
  try {
    var action   = norm(e.parameter.action || "");
    var juryName = (e.parameter.juryName || "").trim();
    var juryDept = (e.parameter.juryDept || "").trim();

    // ── Export: full authenticated data dump ──────────────
    if (action === "export") {
      if (!isAuthorized(e.parameter.pass || "")) return respond({ status: "unauthorized" });

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

    // ── initInfo: create/refresh the Info sheet ───────────
    if (action === "initinfo") {
      if (!isAuthorized(e.parameter.pass || "")) return respond({ status: "unauthorized" });

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var infoSheet = ss.getSheetByName(INFO_SHEET) || ss.insertSheet(INFO_SHEET);
      infoSheet.clear();
      infoSheet.appendRow(["Group No", "Group Name", "Group Desc", "Students"]);
      infoSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
      infoSheet.setFrozenRows(1);

      PROJECTS_DATA.forEach(function(p) {
        infoSheet.appendRow([p.id, p.name, p.desc, (p.students || []).join(", ")]);
      });
      infoSheet.autoResizeColumns(1, 4);
      return respond({ status: "ok", message: "Info sheet refreshed with " + PROJECTS_DATA.length + " groups." });
    }

    // ── loadDraft ─────────────────────────────────────────
    if (action === "loaddraft") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet = getOrCreateDraftSheet();
      var key        = makeDraftKey(juryName, juryDept);
      var row        = findDraftRow(draftSheet, key);
      if (!row) return respond({ status: "not_found" });

      try {
        return respond({ status: "ok", draft: JSON.parse(row[1]) });
      } catch (parseErr) {
        return respond({ status: "error", message: "Invalid draft JSON" });
      }
    }

    // ── verify: count all_submitted rows for a juror ──────
    if (action === "verify") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var ssV    = SpreadsheetApp.getActiveSpreadsheet();
      var sheetV = ssV.getSheetByName(EVAL_SHEET);
      if (!sheetV) return respond({ status: "ok", submittedCount: 0 });

      var valuesV = sheetV.getDataRange().getValues();
      valuesV.shift();

      var count = valuesV.filter(function(r) {
        return norm(r[0]) === norm(juryName)
            && norm(r[1]) === norm(juryDept)
            && String(r[11] || "").trim() === "all_submitted";
      }).length;

      return respond({ status: "ok", submittedCount: count });
    }

    // ── myscores: latest row per group for a juror ────────
    if (action === "myscores") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var ssM    = SpreadsheetApp.getActiveSpreadsheet();
      var sheetM = ssM.getSheetByName(EVAL_SHEET);
      if (!sheetM) return respond({ status: "ok", rows: [] });

      var lastRowM = sheetM.getLastRow();
      if (lastRowM < 2) return respond({ status: "ok", rows: [] });

      var valuesM     = sheetM.getRange(2, 1, lastRowM - 1, NUM_COLS).getValues();
      var bestByGroup = {};
      var pri         = { all_submitted: 3, group_submitted: 2, in_progress: 1 };

      valuesM.forEach(function(r) {
        if (norm(r[0]) !== norm(juryName) || norm(r[1]) !== norm(juryDept)) return;
        var groupNo = String(r[3] || "").trim();
        if (!groupNo) return;

        var status = String(r[11] || "").trim();
        var cur    = bestByGroup[groupNo];
        if (!cur) { bestByGroup[groupNo] = r; return; }

        var curStatus = String(cur[11] || "").trim();
        if ((pri[status] || 0) > (pri[curStatus] || 0)) { bestByGroup[groupNo] = r; return; }
        if ((pri[status] || 0) === (pri[curStatus] || 0) && String(r[2]) > String(cur[2])) {
          bestByGroup[groupNo] = r;
        }
      });

      var rowsOut = Object.keys(bestByGroup).map(function(g) {
        var r = bestByGroup[g];
        return {
          juryName:    r[0],  juryDept:    r[1],  timestamp:   r[2],
          projectId:   Number(r[3]),  projectName: r[4],
          design:      r[5],  technical:   r[6],  delivery:    r[7],
          teamwork:    r[8],  total:       r[9],  comments:    r[10],
          status:      r[11], editingFlag: r[12] || "",
        };
      }).sort(function(a, b) { return (a.projectId || 0) - (b.projectId || 0); });

      return respond({ status: "ok", rows: rowsOut });
    }

    // ── checkPin: does a PIN exist for this juror? ────────
    if (action === "checkpin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      var existing = getPin(juryName, juryDept);
      return respond({ status: "ok", exists: existing !== null });
    }

    // ── createPin: generate and store a new PIN ───────────
    // Only creates if one does not already exist (idempotent).
    if (action === "createpin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var existing = getPin(juryName, juryDept);
      if (existing) {
        // PIN already exists — don't overwrite, return it for the session
        // (only possible if somehow createPin is called twice; safe to return)
        return respond({ status: "ok", pin: existing });
      }

      var newPin = generatePin();
      setPin(juryName, juryDept, newPin);
      return respond({ status: "ok", pin: newPin });
    }

    // ── verifyPin: check PIN, track attempts, lock if needed
    if (action === "verifypin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      var enteredPin = String(e.parameter.pin || "").trim();

      if (isLocked(juryName, juryDept)) {
        return respond({ status: "ok", valid: false, locked: true, attemptsLeft: 0 });
      }

      var storedPin = getPin(juryName, juryDept);
      if (!storedPin) {
        // No PIN on record — allow through (graceful degradation)
        return respond({ status: "ok", valid: true, locked: false, attemptsLeft: MAX_PIN_ATTEMPTS });
      }

      if (enteredPin === storedPin) {
        // Correct — reset attempt counter
        setAttempts(juryName, juryDept, 0);
        return respond({ status: "ok", valid: true, locked: false, attemptsLeft: MAX_PIN_ATTEMPTS });
      }

      // Wrong PIN
      var attempts = getAttempts(juryName, juryDept) + 1;
      setAttempts(juryName, juryDept, attempts);
      var left = Math.max(0, MAX_PIN_ATTEMPTS - attempts);

      if (left === 0) {
        lockAccount(juryName, juryDept);
        return respond({ status: "ok", valid: false, locked: true, attemptsLeft: 0 });
      }

      return respond({ status: "ok", valid: false, locked: false, attemptsLeft: left });
    }

    // ── resetPin: admin only — clears PIN + lock ──────────
    if (action === "resetpin") {
      if (!isAuthorized(e.parameter.pass || "")) return respond({ status: "unauthorized" });
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var props = PropertiesService.getScriptProperties();
      props.deleteProperty(pinPropertyKey(juryName, juryDept));
      clearLock(juryName, juryDept);
      return respond({ status: "ok", message: "PIN and lock cleared for " + juryName });
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

    // ── saveDraft ─────────────────────────────────────────
    if (data.action === "saveDraft") {
      var juryName   = (data.juryName || "").trim();
      var juryDept   = (data.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet  = getOrCreateDraftSheet();
      var key         = makeDraftKey(juryName, juryDept);
      var draftValue  = JSON.stringify(data.draft || {});
      var now         = new Date().toISOString();
      var existingRow = findDraftRowIndex(draftSheet, key);

      if (existingRow > 0) {
        draftSheet.getRange(existingRow, 2, 1, 2).setValues([[draftValue, now]]);
      } else {
        draftSheet.appendRow([key, draftValue, now]);
      }
      return respond({ status: "ok" });
    }

    // ── deleteDraft ───────────────────────────────────────
    if (data.action === "deleteDraft") {
      var juryName = (data.juryName || "").trim();
      var juryDept = (data.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet = getOrCreateDraftSheet();
      var rowIdx     = findDraftRowIndex(draftSheet, makeDraftKey(juryName, juryDept));
      if (rowIdx > 0) draftSheet.deleteRow(rowIdx);
      return respond({ status: "ok" });
    }

    // ── deleteJurorData: draft + ALL evaluation rows ──────
    if (data.action === "deleteJurorData") {
      var juryName = (data.juryName || "").trim();
      var juryDept = (data.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      // Delete draft
      var draftSheet  = getOrCreateDraftSheet();
      var draftRowIdx = findDraftRowIndex(draftSheet, makeDraftKey(juryName, juryDept));
      if (draftRowIdx > 0) draftSheet.deleteRow(draftRowIdx);

      // Delete evaluation rows (backwards to preserve indices)
      var evalDeleted = 0;
      var ssD         = SpreadsheetApp.getActiveSpreadsheet();
      var evalSheet   = ssD.getSheetByName(EVAL_SHEET);
      if (evalSheet) {
        var lastRow = evalSheet.getLastRow();
        if (lastRow >= 2) {
          var values = evalSheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
          for (var i = values.length - 1; i >= 0; i--) {
            if (norm(values[i][0]) === norm(juryName) && norm(values[i][1]) === norm(juryDept)) {
              evalSheet.deleteRow(i + 2);
              evalDeleted++;
            }
          }
        }
      }

      return respond({ status: "ok", evalDeleted: evalDeleted });
    }

    // ── resetJuror: set all rows → in_progress, set EditingFlag ─
    if (data.action === "resetJuror") {
      var juryName = (data.juryName || "").trim();
      var juryDept = (data.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      // Open the 20-minute downgrade unlock window
      markResetUnlock(juryName, juryDept);

      var ssR    = SpreadsheetApp.getActiveSpreadsheet();
      var sheetR = ssR.getSheetByName(EVAL_SHEET);
      if (!sheetR) return respond({ status: "ok", reset: 0 });

      var lastRow = sheetR.getLastRow();
      if (lastRow < 2) return respond({ status: "ok", reset: 0 });

      var values = sheetR.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      var reset  = 0;

      values.forEach(function(r, i) {
        if (norm(r[0]) !== norm(juryName) || norm(r[1]) !== norm(juryDept)) return;
        var rowNum = i + 2;
        sheetR.getRange(rowNum, 12).setValue("in_progress");       // Status col
        sheetR.getRange(rowNum, 13).setValue("editing");            // EditingFlag col ← NEW
        sheetR.getRange(rowNum, 1, 1, NUM_COLS).setBackground("#fef9c3"); // Yellow
        reset++;
      });

      return respond({ status: "ok", reset: reset });
    }

    // ── Default POST: upsert evaluation rows ──────────────
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(EVAL_SHEET);

    if (!sheet) {
      sheet = ss.insertSheet(EVAL_SHEET);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No", "Group Name",
        "Design (20)", "Technical (40)", "Delivery (30)", "Teamwork (10)",
        "Total (100)", "Comments", "Status", "EditingFlag",  // col 13
      ]);
      sheet.getRange(1, 1, 1, NUM_COLS).setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
      sheet.setFrozenRows(1);
    }

    var lastRow = sheet.getLastRow();
    var existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    // Composite key: jurorName__juryDept__groupNo
    function keyOf(name, dept, groupNo) {
      return norm(name) + "__" + norm(dept) + "__" + String(groupNo || "").trim();
    }

    var index = {};
    existing.forEach(function(r, i) {
      var k = keyOf(r[0], r[1], r[3]);
      if (k !== "____") index[k] = i + 2;
    });

    // Deduplicate incoming rows (keep latest per key)
    var latestByKey = {};
    (data.rows || []).forEach(function(row) {
      var k = keyOf(row.juryName, row.juryDept, row.projectId);
      if (k !== "____") latestByKey[k] = row;
    });

    var updated = 0, added = 0;

    Object.keys(latestByKey).forEach(function(k) {
      var row       = latestByKey[k];
      var newStatus = String(row.status || "all_submitted");

      var existingRowNum = index[k];
      var newEditingFlag = "";

      if (existingRowNum) {
        var currentStatus = String(existing[existingRowNum - 2][11] || "");

        // Lock all_submitted unless resetJuror's unlock window is active
        if (currentStatus === "all_submitted" && newStatus !== "all_submitted") {
          if (!isResetUnlockActive(row.juryName, row.juryDept)) {
            newStatus = "all_submitted"; // block downgrade
          }
        }

        // Carry over editing flag — clear it only when all_submitted
        var prevEditingFlag = String(existing[existingRowNum - 2][12] || "");
        newEditingFlag = (newStatus === "all_submitted") ? "" : prevEditingFlag;
      }

      // Row background colour by status
      var bgColor =
        newStatus === "in_progress"     ? "#fef9c3" :  // yellow
        newStatus === "group_submitted" ? "#dcfce7" :  // light green
        newStatus === "all_submitted"   ? "#bbf7d0" :  // medium green
        "#ffffff";

      var values = [
        row.juryName,  row.juryDept,    row.timestamp,
        row.projectId, row.projectName,
        row.design,    row.technical,   row.delivery,  row.teamwork,
        row.total,     row.comments,    newStatus,     newEditingFlag,
      ];

      if (existingRowNum) {
        var range = sheet.getRange(existingRowNum, 1, 1, NUM_COLS);
        range.setValues([values]);
        range.setBackground(bgColor);
        updated++;
      } else {
        sheet.appendRow(values);
        var newRowNum = sheet.getLastRow();
        sheet.getRange(newRowNum, 1, 1, NUM_COLS).setBackground(bgColor);
        index[k] = newRowNum;
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
    sheet.appendRow(["DraftKey", "DraftJSON", "UpdatedAt", "PIN"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 400);
  }
  return sheet;
}

function makeDraftKey(juryName, juryDept) {
  return norm(juryName) + "__" + norm(juryDept);
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
