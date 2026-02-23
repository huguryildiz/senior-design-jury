// google-apps-script.js
// ============================================================
// EE 492 Senior Design — Jury Evaluation App
// Google Apps Script backend (single file, deploy as Web App)
// ============================================================
//
// ── Sheets layout ────────────────────────────────────────────
//
// "Evaluations" (15 columns A–O):
//   A  Juror Name
//   B  Department / Institution
//   C  Juror ID          ← deterministic hash (8 hex chars)
//   D  Timestamp (ISO)
//   E  Group No
//   F  Group Name
//   G  Technical (30)
//   H  Written (30)
//   I  Oral (30)
//   J  Teamwork (10)
//   K  Total (100)
//   L  Comments
//   M  Status
//   N  EditingFlag
//   O  Secret
//
// "Drafts" (3 columns A–C):
//   A  DraftKey (jurorId)
//   B  DraftJSON
//   C  UpdatedAt (ISO)
//
// "Info" (4 columns A–D):
//   A  Group No   B  Group Name   C  Group Desc   D  Students
//
// ── PropertiesService keys ───────────────────────────────────
//   ADMIN_PASSWORD          → plaintext admin password
//   API_SECRET              → shared secret checked on every request
//   PIN__{key}              → 4-digit PIN for a juror
//   LOCKED__{key}           → "1" when account is brute-force locked
//   ATTEMPTS__{key}         → failed attempt count (string integer)
//   RESET_UNLOCK__{key}     → ms timestamp of last resetJuror call
//   SECRET__{key}           → per-juror token secret
//
// ── Token format ─────────────────────────────────────────────
//   token = base64( jurorId + "__" + perJurorSecret )
//
// ── Status values (col M) ───────────────────────────────────
//   "in_progress"      — started but not finished
//   "group_submitted"  — all criteria for a group filled
//   "all_submitted"    — juror pressed Submit Final
//
// ── EditingFlag values (col N) ──────────────────────────────
//   "editing"  — resetJuror called; juror is actively re-editing
//   ""         — normal
//
// ── GET endpoints ────────────────────────────────────────────
//   ?action=export&pass=X
//   ?action=initInfo&pass=X
//   ?action=checkPin&jurorId=X                    (public)
//   ?action=createPin&jurorId=X&juryName=X&juryDept=X
//   ?action=verifyPin&jurorId=X&pin=X
//   ?action=resetPin&jurorId=X&pass=X
//   — token-gated —
//   ?action=loadDraft&token=X
//   ?action=verify&token=X
//   ?action=myscores&token=X
//
// ── POST body shapes ─────────────────────────────────────────
//   { action:"saveDraft",       token, draft }
//   { action:"deleteDraft",     token }
//   { action:"deleteJurorData", token }
//   { action:"resetJuror",      token }
//   { rows:[...], token }
// ============================================================

var EVAL_SHEET  = "Evaluations";
var DRAFT_SHEET = "Drafts";
var INFO_SHEET  = "Info";
var NUM_COLS    = 15; // A–O

var RESET_UNLOCK_MINUTES = 20;
var MAX_PIN_ATTEMPTS     = 3;

// ── Group definitions ─────────────────────────────────────────
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

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// ── API secret guard ──────────────────────────────────────────
// Every public endpoint (non-admin) must pass the shared secret.
// Set the "API_SECRET" script property in GAS project settings.
function checkApiSecret(secret) {
  var stored = PropertiesService.getScriptProperties().getProperty("API_SECRET") || "";
  return stored.length > 0 && secret === stored;
}

function isAuthorized(pass) {
  var stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";
  return stored.length > 0 && pass === stored;
}

// ── Token helpers ─────────────────────────────────────────────

function secretPropKey(jurorId) { return "SECRET__" + jurorId; }

function getPerJurorSecret(jurorId) {
  return PropertiesService.getScriptProperties().getProperty(secretPropKey(jurorId));
}
function setPerJurorSecret(jurorId, secret) {
  PropertiesService.getScriptProperties().setProperty(secretPropKey(jurorId), secret);
}

function generateSecret() {
  var bytes = "";
  for (var i = 0; i < 16; i++) bytes += ("0" + Math.floor(Math.random() * 256).toString(16)).slice(-2);
  return bytes;
}

// token = base64( jurorId + "__" + perJurorSecret )
function buildToken(jurorId, secret) {
  return Utilities.base64Encode(jurorId + "__" + secret);
}

// Returns { jurorId } or null.
function verifyToken(token) {
  if (!token) return null;
  try {
    var payload = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var sep     = payload.indexOf("__");
    if (sep < 0) return null;
    var jurorId = payload.slice(0, sep);
    var secret  = payload.slice(sep + 2);
    var stored  = getPerJurorSecret(jurorId);
    if (!stored || stored !== secret) return null;
    return { jurorId: jurorId };
  } catch (_) {
    return null;
  }
}

// ── Reset-unlock helpers ──────────────────────────────────────

function markResetUnlock(jurorId) {
  PropertiesService.getScriptProperties()
    .setProperty("RESET_UNLOCK__" + jurorId, String(Date.now()));
}

function isResetUnlockActive(jurorId) {
  var v = PropertiesService.getScriptProperties()
    .getProperty("RESET_UNLOCK__" + jurorId);
  if (!v) return false;
  var ts = parseInt(v, 10);
  return Number.isFinite(ts) && (Date.now() - ts) <= RESET_UNLOCK_MINUTES * 60 * 1000;
}

// ── PIN helpers ───────────────────────────────────────────────

function pinKey(jurorId)      { return "PIN__"      + jurorId; }
function lockedKey(jurorId)   { return "LOCKED__"   + jurorId; }
function attemptsKey(jurorId) { return "ATTEMPTS__" + jurorId; }

function getPin(id)       { return PropertiesService.getScriptProperties().getProperty(pinKey(id)); }
function setPin(id, pin)  { PropertiesService.getScriptProperties().setProperty(pinKey(id), pin); }
function isLocked(id)     { return PropertiesService.getScriptProperties().getProperty(lockedKey(id)) === "1"; }
function lockAccount(id)  { PropertiesService.getScriptProperties().setProperty(lockedKey(id), "1"); }

function getAttempts(id) {
  return parseInt(PropertiesService.getScriptProperties().getProperty(attemptsKey(id)) || "0", 10);
}
function setAttempts(id, count) {
  PropertiesService.getScriptProperties().setProperty(attemptsKey(id), String(count));
}
function clearLock(id) {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(lockedKey(id));
  props.deleteProperty(attemptsKey(id));
}

function generatePin() {
  var pin = "";
  for (var i = 0; i < 4; i++) pin += String(Math.floor(Math.random() * 10));
  return pin;
}

// ── jurorId → juryName / juryDept lookup ─────────────────────
// We store name+dept at createPin time so myscores etc. can
// filter the sheet without the client re-sending them.

function jurorMetaKey(jurorId) { return "META__" + jurorId; }

function setJurorMeta(jurorId, juryName, juryDept) {
  PropertiesService.getScriptProperties()
    .setProperty(jurorMetaKey(jurorId), juryName + "||" + juryDept);
}

function getJurorMeta(jurorId) {
  var v = PropertiesService.getScriptProperties().getProperty(jurorMetaKey(jurorId));
  if (!v) return null;
  var parts = v.split("||");
  return { juryName: parts[0] || "", juryDept: parts[1] || "" };
}

// ════════════════════════════════════════════════════════════
// GET handler
// ════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    var action   = norm(e.parameter.action || "");
    var token    = (e.parameter.token    || "").trim();
    var jurorId  = (e.parameter.jurorId  || "").trim();
    var apiSec   = (e.parameter.secret   || "").trim();

    // ── Admin endpoints (password-only, no apiSecret required) ─
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

    if (action === "resetpin") {
      if (!isAuthorized(e.parameter.pass || "")) return respond({ status: "unauthorized" });
      if (!jurorId) return respond({ status: "error", message: "jurorId required" });
      PropertiesService.getScriptProperties().deleteProperty(pinKey(jurorId));
      PropertiesService.getScriptProperties().deleteProperty(secretPropKey(jurorId));
      clearLock(jurorId);
      return respond({ status: "ok", message: "PIN cleared for " + jurorId });
    }

    // ── Public PIN endpoints (apiSecret required) ─────────────

    if (action === "checkpin") {
      if (!checkApiSecret(apiSec)) return respond({ status: "unauthorized" });
      if (!jurorId) return respond({ status: "error", message: "jurorId required" });
      return respond({ status: "ok", exists: getPin(jurorId) !== null });
    }

    if (action === "createpin") {
      if (!checkApiSecret(apiSec)) return respond({ status: "unauthorized" });
      if (!jurorId) return respond({ status: "error", message: "jurorId required" });
      var juryName = (e.parameter.juryName || "").trim();
      var juryDept = (e.parameter.juryDept || "").trim();

      var existingPin = getPin(jurorId);
      var pin, perSecret;
      if (existingPin) {
        pin       = existingPin;
        perSecret = getPerJurorSecret(jurorId) || generateSecret();
        setPerJurorSecret(jurorId, perSecret);
      } else {
        pin       = generatePin();
        perSecret = generateSecret();
        setPin(jurorId, pin);
        setPerJurorSecret(jurorId, perSecret);
      }
      if (juryName) setJurorMeta(jurorId, juryName, juryDept);
      var tok = buildToken(jurorId, perSecret);
      return respond({ status: "ok", pin: pin, token: tok });
    }

    if (action === "verifypin") {
      if (!checkApiSecret(apiSec)) return respond({ status: "unauthorized" });
      if (!jurorId) return respond({ status: "error", message: "jurorId required" });
      var enteredPin = String(e.parameter.pin || "").trim();

      if (isLocked(jurorId)) {
        return respond({ status: "ok", valid: false, locked: true, attemptsLeft: 0 });
      }

      var storedPin = getPin(jurorId);
      if (!storedPin) {
        // No PIN on record — graceful degradation: issue token.
        var sec  = getPerJurorSecret(jurorId) || generateSecret();
        setPerJurorSecret(jurorId, sec);
        return respond({ status: "ok", valid: true, locked: false,
          attemptsLeft: MAX_PIN_ATTEMPTS, token: buildToken(jurorId, sec) });
      }

      if (enteredPin === storedPin) {
        setAttempts(jurorId, 0);
        var sec2 = getPerJurorSecret(jurorId) || generateSecret();
        setPerJurorSecret(jurorId, sec2);
        return respond({ status: "ok", valid: true, locked: false,
          attemptsLeft: MAX_PIN_ATTEMPTS, token: buildToken(jurorId, sec2) });
      }

      var attempts = getAttempts(jurorId) + 1;
      setAttempts(jurorId, attempts);
      var left = Math.max(0, MAX_PIN_ATTEMPTS - attempts);
      if (left === 0) lockAccount(jurorId);
      return respond({ status: "ok", valid: false, locked: left === 0, attemptsLeft: left });
    }

    // ── Token-gated GET endpoints ─────────────────────────────
    var identity = verifyToken(token);
    if (!identity) return respond({ status: "unauthorized", message: "Invalid or missing token." });
    var jid = identity.jurorId;
    var meta = getJurorMeta(jid) || { juryName: "", juryDept: "" };

    if (action === "loaddraft") {
      var draftSheet = getOrCreateDraftSheet();
      var row        = findDraftRow(draftSheet, jid);
      if (!row) return respond({ status: "not_found" });
      try {
        return respond({ status: "ok", draft: JSON.parse(row[1]) });
      } catch (_) {
        return respond({ status: "error", message: "Corrupt draft JSON." });
      }
    }

    if (action === "verify") {
      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", submittedCount: 0 });
      var values = sheet.getDataRange().getValues();
      values.shift();
      var count = values.filter(function(r) {
        // col C (index 2) = jurorId
        return String(r[2]).trim() === jid
            && String(r[12] || "").trim() === "all_submitted"; // col M = index 12
      }).length;
      return respond({ status: "ok", submittedCount: count });
    }

    if (action === "myscores") {
      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", rows: [] });
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return respond({ status: "ok", rows: [] });

      var values      = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      var pri         = { all_submitted: 3, group_submitted: 2, in_progress: 1 };
      var bestByGroup = {};

      values.forEach(function(r) {
        if (String(r[2]).trim() !== jid) return; // col C = jurorId
        var groupNo = String(r[4] || "").trim();  // col E
        if (!groupNo) return;
        var prev = bestByGroup[groupNo];
        if (!prev) { bestByGroup[groupNo] = r; return; }
        var ns = String(r[12]    || "").trim();   // col M = status
        var ps = String(prev[12] || "").trim();
        if ((pri[ns] || 0) > (pri[ps] || 0)) { bestByGroup[groupNo] = r; return; }
        if ((pri[ns] || 0) === (pri[ps] || 0) && String(r[3]) > String(prev[3])) {
          bestByGroup[groupNo] = r; // col D = timestamp
        }
      });

      var out = Object.keys(bestByGroup).map(function(g) {
        var r = bestByGroup[g];
        return {
          juryName:    r[0],  juryDept:    r[1],  jurorId:     r[2],
          timestamp:   r[3],  projectId:   Number(r[4]),  projectName: r[5],
          technical:   r[6],  design:      r[7],  delivery:    r[8],
          teamwork:    r[9],  total:       r[10], comments:    r[11],
          status:      r[12], editingFlag: r[13] || "",
        };
      }).sort(function(a, b) { return (a.projectId || 0) - (b.projectId || 0); });

      return respond({ status: "ok", rows: out });
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

    var identity = verifyToken(data.token || "");
    if (!identity) return respond({ status: "unauthorized", message: "Invalid or missing token." });
    var jid  = identity.jurorId;
    var meta = getJurorMeta(jid) || { juryName: "", juryDept: "" };

    if (data.action === "saveDraft") {
      var draftSheet = getOrCreateDraftSheet();
      var json       = JSON.stringify(data.draft || {});
      var now        = new Date().toISOString();
      var rowIdx     = findDraftRowIndex(draftSheet, jid);
      if (rowIdx > 0) {
        draftSheet.getRange(rowIdx, 2, 1, 2).setValues([[json, now]]);
      } else {
        draftSheet.appendRow([jid, json, now]);
      }
      return respond({ status: "ok" });
    }

    if (data.action === "deleteDraft") {
      var draftSheet = getOrCreateDraftSheet();
      var rowIdx     = findDraftRowIndex(draftSheet, jid);
      if (rowIdx > 0) draftSheet.deleteRow(rowIdx);
      return respond({ status: "ok" });
    }

    if (data.action === "deleteJurorData") {
      var draftSheet = getOrCreateDraftSheet();
      var draftIdx   = findDraftRowIndex(draftSheet, jid);
      if (draftIdx > 0) draftSheet.deleteRow(draftIdx);

      var ss        = SpreadsheetApp.getActiveSpreadsheet();
      var evalSheet = ss.getSheetByName(EVAL_SHEET);
      var deleted   = 0;
      if (evalSheet) {
        var lastRow = evalSheet.getLastRow();
        if (lastRow >= 2) {
          var values = evalSheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
          for (var i = values.length - 1; i >= 0; i--) {
            if (String(values[i][2]).trim() === jid) { // col C
              evalSheet.deleteRow(i + 2);
              deleted++;
            }
          }
        }
      }
      return respond({ status: "ok", deleted: deleted });
    }

    if (data.action === "resetJuror") {
      markResetUnlock(jid);
      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", reset: 0 });
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return respond({ status: "ok", reset: 0 });
      var values = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      var reset  = 0;
      values.forEach(function(r, i) {
        if (String(r[2]).trim() !== jid) return; // col C
        var rowNum = i + 2;
        sheet.getRange(rowNum, 13).setValue("in_progress"); // col M
        sheet.getRange(rowNum, 14).setValue("editing");     // col N
        sheet.getRange(rowNum, 1, 1, NUM_COLS).setBackground("#fef9c3");
        reset++;
      });
      return respond({ status: "ok", reset: reset });
    }

    // ── Default: upsert evaluation rows ──────────────────────
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(EVAL_SHEET);

    if (!sheet) {
      sheet = ss.insertSheet(EVAL_SHEET);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Juror ID", "Timestamp",
        "Group No", "Group Name",
        "Technical (30)", "Written (30)", "Oral (30)", "Teamwork (10)",
        "Total (100)", "Comments", "Status", "EditingFlag", "Secret",
      ]);
      sheet.getRange(1, 1, 1, NUM_COLS)
        .setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
      sheet.setFrozenRows(1);
    }

    var lastRow  = sheet.getLastRow();
    var existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues()
      : [];

    // Upsert key: jurorId + groupNo (cols C + E → indices 2 + 4)
    function compositeKey(jurorId, groupNo) {
      return jurorId + "__" + String(groupNo || "").trim();
    }
    var index = {};
    existing.forEach(function(r, i) {
      var k = compositeKey(String(r[2]).trim(), r[4]);
      if (k !== "__") index[k] = i + 2;
    });

    var latestByKey = {};
    (data.rows || []).forEach(function(row) {
      // Security: only accept rows whose jurorId matches the token.
      if (String(row.jurorId || "").trim() !== jid) return;
      var k = compositeKey(jid, row.projectId);
      latestByKey[k] = row;
    });

    var updated = 0, added = 0;

    Object.keys(latestByKey).forEach(function(k) {
      var row       = latestByKey[k];
      var newStatus = String(row.status || "all_submitted");
      var newFlag   = "";
      var existingRowNum = index[k];

      if (existingRowNum) {
        var currentStatus = String(existing[existingRowNum - 2][12] || ""); // col M
        var existingTs    = String(existing[existingRowNum - 2][3]  || ""); // col D
        var incomingTs    = String(row.timestamp || "");
        if (existingTs && incomingTs && incomingTs < existingTs) return;

        if (currentStatus === "all_submitted" && newStatus !== "all_submitted") {
          if (!isResetUnlockActive(jid)) {
            newStatus = "all_submitted";
          }
        }

        if (newStatus === "all_submitted") {
          newFlag = "";
        } else if (isResetUnlockActive(jid)) {
          newFlag = "editing";
        } else {
          newFlag = String(existing[existingRowNum - 2][13] || ""); // col N
        }
      }

      var bgColor =
        newStatus === "in_progress"     ? "#fef9c3" :
        newStatus === "group_submitted" ? "#dcfce7" :
        newStatus === "all_submitted"   ? "#bbf7d0" :
        "#ffffff";

      var rowSecret = getPerJurorSecret(jid) || "";

      // Column order: A B C D E F G H I J K L M N O
      var rowValues = [
        row.juryName,   row.juryDept,    jid,             row.timestamp,
        row.projectId,  row.projectName,
        row.technical,  row.design,      row.delivery,    row.teamwork,
        row.total,      row.comments,    newStatus,       newFlag,      rowSecret,
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
        index[k] = newRowNum;
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
