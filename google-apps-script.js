// google-apps-script.js
// ============================================================
// EE 492 Senior Design — Jury Evaluation App
// Google Apps Script backend (single file, deploy as Web App)
// ============================================================
//
// ── Sheets layout ────────────────────────────────────────────
//
// "Evaluations" (13 columns A–M):
//   A  Juror Name          H  Oral (30)
//   B  Department          I  Teamwork (10)
//   C  Timestamp (ISO)     J  Total (100)
//   D  Group No            K  Comments
//   E  Group Name          L  Status
//   F  Written (30)        M  EditingFlag
//   G  Technical (30)
//
// "Drafts" (3 columns A–C):
//   A  DraftKey (juryName__juryDept, lowercase)
//   B  DraftJSON
//   C  UpdatedAt (ISO)
//
// "Info" (4 columns A–D):
//   A  Group No   B  Group Name   C  Group Desc   D  Students
//
// ── PropertiesService keys ───────────────────────────────────
//   ADMIN_PASSWORD          → plaintext admin password
//   PIN__{key}              → 4-digit PIN for a juror
//   LOCKED__{key}           → "1" when account is brute-force locked
//   ATTEMPTS__{key}         → failed attempt count (string integer)
//   RESET_UNLOCK__{key}     → ms timestamp of last resetJuror call
//
// ── Status values (Evaluations col L) ───────────────────────
//   "in_progress"      — juror has started but not finished a group
//   "group_submitted"  — all criteria for a group are filled
//   "all_submitted"    — juror pressed Submit Final
//
// ── EditingFlag values (Evaluations col M) ──────────────────
//   "editing"  — resetJuror was called; juror is actively editing
//   ""         — normal; cleared when all_submitted is written
//
// ── GET endpoints ────────────────────────────────────────────
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
// ── POST body shapes ─────────────────────────────────────────
//   { action: "saveDraft",       juryName, juryDept, draft }
//   { action: "deleteDraft",     juryName, juryDept }
//   { action: "deleteJurorData", juryName, juryDept }
//   { action: "resetJuror",      juryName, juryDept }
//   { rows: [ ...rowObjects ] }   → upsert evaluation rows
// ============================================================

var EVAL_SHEET  = "Evaluations";
var DRAFT_SHEET = "Drafts";
var INFO_SHEET  = "Info";
var NUM_COLS    = 13; // A–M including EditingFlag

// Unlock window after resetJuror: allows all_submitted → in_progress
// downgrades for this many minutes.
var RESET_UNLOCK_MINUTES = 20;

// Maximum wrong PIN attempts before an account is locked.
var MAX_PIN_ATTEMPTS = 3;

// ── Group definitions (mirror of src/config.js PROJECTS) ─────
// Update name / desc / students each semester.
// Keep `id` values stable — they are the Sheets primary key.
var PROJECTS_DATA = [
  { id: 1, name: "Group 1", desc: "Göksiper Hava Savunma Sistemi",
    students: ["Mustafa Yusuf Ünal", "Ayça Naz Dedeoğlu", "Onur Mesci", "Çağan Erdoğan"] },
  { id: 2, name: "Group 2", desc: "Radome and Radar-Absorbing Material Electromagnetic Design Software (REMDET)",
    students: ["Niyazi Atilla Özer", "Bertan Ünver", "Ada Tatlı", "Nesibe Aydın"] },
  { id: 3, name: "Group 3", desc: "Smart Crosswalk",
    students: ["Sami Eren Germeç"] },
  { id: 4, name: "Group 4", desc: "Radar Cross Section (RCS) Analysis — Supporting Multi-Purpose Ray Tracing Algorithm",
    students: ["Ahmet Melih Yavuz", "Yasemin Erciyas"] },
  { id: 5, name: "Group 5", desc: "Monitoring Pilots' Health Status and Cognitive Abilities During Flight",
    students: ["Aysel Mine Çaylan", "Selimhan Kaynar", "Abdulkadir Sazlı", "Alp Efe İpek"] },
  { id: 6, name: "Group 6", desc: "AKKE — Smart Command and Control Glove",
    students: ["Şevval Kurtulmuş", "Abdullah Esin", "Berk Çakmak", "Ömer Efe Dikici"] },
];

// ════════════════════════════════════════════════════════════
// Shared helpers
// ════════════════════════════════════════════════════════════

// Wrap any object in a JSON text output (required return type).
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Check admin password against the stored property.
function isAuthorized(pass) {
  var stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";
  return stored.length > 0 && pass === stored;
}

// Normalise a string for case-insensitive comparison / key building.
function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// Build a stable key from juryName + juryDept.
// Used as a namespace prefix for PropertiesService keys.
function jurorKey(juryName, juryDept) {
  return norm(juryName) + "__" + norm(juryDept);
}

// ── Reset-unlock helpers ──────────────────────────────────────
// After resetJuror is called, the upsert handler allows
// all_submitted rows to be downgraded for RESET_UNLOCK_MINUTES.

function markResetUnlock(juryName, juryDept) {
  PropertiesService.getScriptProperties()
    .setProperty("RESET_UNLOCK__" + jurorKey(juryName, juryDept), String(Date.now()));
}

function isResetUnlockActive(juryName, juryDept) {
  var v = PropertiesService.getScriptProperties()
    .getProperty("RESET_UNLOCK__" + jurorKey(juryName, juryDept));
  if (!v) return false;
  var ts = parseInt(v, 10);
  return Number.isFinite(ts) && (Date.now() - ts) <= RESET_UNLOCK_MINUTES * 60 * 1000;
}

// ── PIN helpers ───────────────────────────────────────────────

function pinKey(juryName, juryDept)      { return "PIN__"      + jurorKey(juryName, juryDept); }
function lockedKey(juryName, juryDept)   { return "LOCKED__"   + jurorKey(juryName, juryDept); }
function attemptsKey(juryName, juryDept) { return "ATTEMPTS__" + jurorKey(juryName, juryDept); }

function getPin(n, d)       { return PropertiesService.getScriptProperties().getProperty(pinKey(n, d)); }
function setPin(n, d, pin)  { PropertiesService.getScriptProperties().setProperty(pinKey(n, d), pin); }
function isLocked(n, d)     { return PropertiesService.getScriptProperties().getProperty(lockedKey(n, d)) === "1"; }
function lockAccount(n, d)  { PropertiesService.getScriptProperties().setProperty(lockedKey(n, d), "1"); }

function getAttempts(n, d) {
  return parseInt(PropertiesService.getScriptProperties().getProperty(attemptsKey(n, d)) || "0", 10);
}
function setAttempts(n, d, count) {
  PropertiesService.getScriptProperties().setProperty(attemptsKey(n, d), String(count));
}
function clearLock(n, d) {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(lockedKey(n, d));
  props.deleteProperty(attemptsKey(n, d));
}

// Generate a random 4-digit PIN string ("0000"–"9999").
function generatePin() {
  var pin = "";
  for (var i = 0; i < 4; i++) pin += String(Math.floor(Math.random() * 10));
  return pin;
}

// ════════════════════════════════════════════════════════════
// GET handler
// ════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    var action   = norm(e.parameter.action || "");
    var juryName = (e.parameter.juryName || "").trim();
    var juryDept = (e.parameter.juryDept || "").trim();

    // ── export ────────────────────────────────────────────
    // Returns all rows from the Evaluations sheet.
    // Used exclusively by the admin panel.
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

    // ── initInfo ──────────────────────────────────────────
    // Creates / refreshes the Info sheet from PROJECTS_DATA.
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
    // Returns a previously saved draft for a juror.
    if (action === "loaddraft") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet = getOrCreateDraftSheet();
      var row        = findDraftRow(draftSheet, makeDraftKey(juryName, juryDept));
      if (!row) return respond({ status: "not_found" });

      try {
        return respond({ status: "ok", draft: JSON.parse(row[1]) });
      } catch (_) {
        return respond({ status: "error", message: "Corrupt draft JSON." });
      }
    }

    // ── verify ────────────────────────────────────────────
    // Returns how many groups a juror has all_submitted.
    if (action === "verify") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", submittedCount: 0 });

      var values = sheet.getDataRange().getValues();
      values.shift(); // remove header

      var count = values.filter(function(r) {
        return norm(r[0]) === norm(juryName)
            && norm(r[1]) === norm(juryDept)
            && String(r[11] || "").trim() === "all_submitted";
      }).length;

      return respond({ status: "ok", submittedCount: count });
    }

    // ── myscores ──────────────────────────────────────────
    // Returns the best row per group for a juror.
    if (action === "myscores") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", rows: [] });

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return respond({ status: "ok", rows: [] });

      var values      = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      var pri         = { all_submitted: 3, group_submitted: 2, in_progress: 1 };
      var bestByGroup = {};

      values.forEach(function(r) {
        if (norm(r[0]) !== norm(juryName) || norm(r[1]) !== norm(juryDept)) return;
        var groupNo = String(r[3] || "").trim();
        if (!groupNo) return;
        var prev = bestByGroup[groupNo];
        if (!prev) { bestByGroup[groupNo] = r; return; }
        var newStatus  = String(r[11]    || "").trim();
        var prevStatus = String(prev[11] || "").trim();
        if ((pri[newStatus] || 0) > (pri[prevStatus] || 0)) { bestByGroup[groupNo] = r; return; }
        if ((pri[newStatus] || 0) === (pri[prevStatus] || 0) && String(r[2]) > String(prev[2])) {
          bestByGroup[groupNo] = r;
        }
      });

      var out = Object.keys(bestByGroup).map(function(g) {
        var r = bestByGroup[g];
        return {
          juryName:    r[0],  juryDept:    r[1],  timestamp:   r[2],
          projectId:   Number(r[3]),  projectName: r[4],
          design:      r[5],  technical:   r[6],  delivery:    r[7],
          teamwork:    r[8],  total:       r[9],  comments:    r[10],
          status:      r[11], editingFlag: r[12] || "",
        };
      }).sort(function(a, b) { return (a.projectId || 0) - (b.projectId || 0); });

      return respond({ status: "ok", rows: out });
    }

    // ── checkPin ──────────────────────────────────────────
    // Returns { exists: true|false } — does a PIN exist for this juror?
    if (action === "checkpin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      return respond({ status: "ok", exists: getPin(juryName, juryDept) !== null });
    }

    // ── createPin ─────────────────────────────────────────
    // Generates and stores a new PIN for a first-time juror.
    // Idempotent: if a PIN already exists it is returned unchanged.
    if (action === "createpin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      var existing = getPin(juryName, juryDept);
      if (existing) return respond({ status: "ok", pin: existing });
      var pin = generatePin();
      setPin(juryName, juryDept, pin);
      return respond({ status: "ok", pin: pin });
    }

    // ── verifyPin ─────────────────────────────────────────
    // Checks the entered PIN. Tracks failed attempts and locks
    // the account after MAX_PIN_ATTEMPTS consecutive failures.
    if (action === "verifypin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      var enteredPin = String(e.parameter.pin || "").trim();

      if (isLocked(juryName, juryDept)) {
        return respond({ status: "ok", valid: false, locked: true, attemptsLeft: 0 });
      }

      var storedPin = getPin(juryName, juryDept);
      if (!storedPin) {
        // No PIN on record — let them through (graceful degradation).
        return respond({ status: "ok", valid: true, locked: false, attemptsLeft: MAX_PIN_ATTEMPTS });
      }

      if (enteredPin === storedPin) {
        setAttempts(juryName, juryDept, 0); // reset counter on success
        return respond({ status: "ok", valid: true, locked: false, attemptsLeft: MAX_PIN_ATTEMPTS });
      }

      // Wrong PIN — increment counter.
      var attempts = getAttempts(juryName, juryDept) + 1;
      setAttempts(juryName, juryDept, attempts);
      var left = Math.max(0, MAX_PIN_ATTEMPTS - attempts);
      if (left === 0) lockAccount(juryName, juryDept);
      return respond({ status: "ok", valid: false, locked: left === 0, attemptsLeft: left });
    }

    // ── resetPin ──────────────────────────────────────────
    // Admin-only: clears the PIN, lock, and attempt counter for
    // a juror. They will receive a new PIN on their next login.
    if (action === "resetpin") {
      if (!isAuthorized(e.parameter.pass || "")) return respond({ status: "unauthorized" });
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      PropertiesService.getScriptProperties().deleteProperty(pinKey(juryName, juryDept));
      clearLock(juryName, juryDept);
      return respond({ status: "ok", message: "PIN cleared for " + juryName });
    }

    return respond({ status: "ok" });

  } catch (err) {
    return respond({ status: "error", message: String(err) });
  }
}

// ════════════════════════════════════════════════════════════
// POST handler
// ════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── saveDraft ─────────────────────────────────────────
    if (data.action === "saveDraft") {
      var juryName  = (data.juryName || "").trim();
      var juryDept  = (data.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet = getOrCreateDraftSheet();
      var key        = makeDraftKey(juryName, juryDept);
      var json       = JSON.stringify(data.draft || {});
      var now        = new Date().toISOString();
      var rowIdx     = findDraftRowIndex(draftSheet, key);

      if (rowIdx > 0) {
        draftSheet.getRange(rowIdx, 2, 1, 2).setValues([[json, now]]);
      } else {
        draftSheet.appendRow([key, json, now]);
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

    // ── deleteJurorData ───────────────────────────────────
    // Removes the draft AND all evaluation rows for a juror.
    // Called when the user discards their draft from the home page.
    if (data.action === "deleteJurorData") {
      var juryName = (data.juryName || "").trim();
      var juryDept = (data.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      // Remove draft
      var draftSheet = getOrCreateDraftSheet();
      var draftIdx   = findDraftRowIndex(draftSheet, makeDraftKey(juryName, juryDept));
      if (draftIdx > 0) draftSheet.deleteRow(draftIdx);

      // Remove evaluation rows (iterate backwards to preserve row indices)
      var ss        = SpreadsheetApp.getActiveSpreadsheet();
      var evalSheet = ss.getSheetByName(EVAL_SHEET);
      var deleted   = 0;
      if (evalSheet) {
        var lastRow = evalSheet.getLastRow();
        if (lastRow >= 2) {
          var values = evalSheet.getRange(2, 1, lastRow - 1, 2).getValues();
          for (var i = values.length - 1; i >= 0; i--) {
            if (norm(values[i][0]) === norm(juryName) && norm(values[i][1]) === norm(juryDept)) {
              evalSheet.deleteRow(i + 2);
              deleted++;
            }
          }
        }
      }
      return respond({ status: "ok", deleted: deleted });
    }

    // ── resetJuror ────────────────────────────────────────
    // Sets all rows for a juror → in_progress and writes
    // EditingFlag = "editing". Also opens the downgrade unlock
    // window so subsequent POSTs can downgrade all_submitted rows.
    if (data.action === "resetJuror") {
      var juryName = (data.juryName || "").trim();
      var juryDept = (data.juryDept || "").trim();
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      markResetUnlock(juryName, juryDept);

      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", reset: 0 });

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return respond({ status: "ok", reset: 0 });

      var values = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      var reset  = 0;

      values.forEach(function(r, i) {
        if (norm(r[0]) !== norm(juryName) || norm(r[1]) !== norm(juryDept)) return;
        var rowNum = i + 2;
        sheet.getRange(rowNum, 12).setValue("in_progress"); // Status column
        sheet.getRange(rowNum, 13).setValue("editing");     // EditingFlag column
        sheet.getRange(rowNum, 1, 1, NUM_COLS).setBackground("#fef9c3"); // yellow
        reset++;
      });

      return respond({ status: "ok", reset: reset });
    }

    // ── Default: upsert evaluation rows ──────────────────
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(EVAL_SHEET);

    if (!sheet) {
      sheet = ss.insertSheet(EVAL_SHEET);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No", "Group Name",
        "Written (30)", "Technical (30)", "Oral (30)", "Teamwork (10)",
        "Total (100)", "Comments", "Status", "EditingFlag",
      ]);
      sheet.getRange(1, 1, 1, NUM_COLS)
        .setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
      sheet.setFrozenRows(1);
    }

    var lastRow  = sheet.getLastRow();
    var existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    // Build a row-index lookup: composite key → 1-based row number
    function compositeKey(name, dept, groupNo) {
      return norm(name) + "__" + norm(dept) + "__" + String(groupNo || "").trim();
    }
    var index = {};
    existing.forEach(function(r, i) {
      var k = compositeKey(r[0], r[1], r[3]);
      if (k !== "____") index[k] = i + 2;
    });

    // Deduplicate incoming rows — keep the last one per key
    // (the frontend may send the same group twice in one flush).
    var latestByKey = {};
    (data.rows || []).forEach(function(row) {
      var k = compositeKey(row.juryName, row.juryDept, row.projectId);
      if (k !== "____") latestByKey[k] = row;
    });

    var updated = 0, added = 0;

    Object.keys(latestByKey).forEach(function(k) {
      var row       = latestByKey[k];
      var newStatus = String(row.status || "all_submitted");
      var newFlag   = "";
      var existingRowNum = index[k];

      if (existingRowNum) {
        var currentStatus = String(existing[existingRowNum - 2][11] || "");

        // Reject stale writes: if the incoming timestamp is older than what's
        // already in the sheet, skip this row entirely. This prevents a juror
        // resuming from a stale localStorage draft from overwriting newer data
        // they entered on another device. ISO 8601 strings are lexicographically
        // comparable, so a simple string comparison works correctly.
        var existingTs = String(existing[existingRowNum - 2][2] || "");
        var incomingTs = String(row.timestamp || "");
        if (existingTs && incomingTs && incomingTs < existingTs) {
          // Incoming data is older — skip silently.
          return;
        }

        // Block all_submitted → anything else unless the unlock window is open.
        if (currentStatus === "all_submitted" && newStatus !== "all_submitted") {
          if (!isResetUnlockActive(row.juryName, row.juryDept)) {
            newStatus = "all_submitted";
          }
        }

        // EditingFlag carry-over:
        //   all_submitted  → always clear the flag (editing session ended)
        //   unlock active  → force "editing" (handles race condition where
        //                     the rows POST arrives before resetJuror writes
        //                     the flag into the sheet)
        //   otherwise      → carry over whatever is in the sheet
        if (newStatus === "all_submitted") {
          newFlag = "";
        } else if (isResetUnlockActive(row.juryName, row.juryDept)) {
          newFlag = "editing";
        } else {
          newFlag = String(existing[existingRowNum - 2][12] || "");
        }
      }

      // Background colour by status
      var bgColor =
        newStatus === "in_progress"     ? "#fef9c3" :  // amber
        newStatus === "group_submitted" ? "#dcfce7" :  // light green
        newStatus === "all_submitted"   ? "#bbf7d0" :  // medium green
        "#ffffff";

      var rowValues = [
        row.juryName,  row.juryDept,    row.timestamp,
        row.projectId, row.projectName,
        row.design,    row.technical,   row.delivery,  row.teamwork,
        row.total,     row.comments,    newStatus,     newFlag,
      ];

      if (existingRowNum) {
        var range = sheet.getRange(existingRowNum, 1, 1, NUM_COLS);
        range.setValues([rowValues]);
        range.setBackground(bgColor);
        updated++;
      } else {
        sheet.appendRow(rowValues);
        var newRowNum = sheet.getLastRow();
        sheet.getRange(newRowNum, 1, 1, NUM_COLS).setBackground(bgColor);
        index[k] = newRowNum; // update index for any subsequent rows in this batch
        added++;
      }
    });

    return respond({ status: "ok", updated: updated, added: added });

  } catch (err) {
    return respond({ status: "error", message: String(err) });
  }
}

// ════════════════════════════════════════════════════════════
// Draft sheet helpers
// ════════════════════════════════════════════════════════════

function getOrCreateDraftSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DRAFT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DRAFT_SHEET);
    sheet.appendRow(["DraftKey", "DraftJSON", "UpdatedAt"]);
    sheet.getRange(1, 1, 1, 3)
      .setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 420);
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
