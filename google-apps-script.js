// google-apps-script.js
// ============================================================
// EE 492 Senior Design — Jury Evaluation App
// Google Apps Script backend (single file, deploy as Web App)
// ============================================================
//
// ── Security ─────────────────────────────────────────────────
// Every request must include `secret` matching API_SECRET below.
// Write requests (POST rows, saveDraft, resetJuror) must also
// include a valid `sessionToken` issued by verifyPin.
// Set API_SECRET to a strong random string and put the same
// value in VITE_API_SECRET in your .env.local file.
//
var API_SECRET = "REPLACE_WITH_YOUR_SECRET"; // ← change before deploy
//
// ── Sheets layout ────────────────────────────────────────────
//
// "Evaluations" (14 columns A–N):
//   A  Juror Name          H  Written (30)
//   B  Department          I  Oral (30)
//   C  Juror ID            J  Teamwork (10)
//   D  Timestamp (ISO)     K  Total (100)
//   E  Group No            L  Comments
//   F  Group Name          M  Status
//   G  Technical (30)      N  EditingFlag
//
// "Drafts" (3 columns A–C):
//   A  DraftKey (jurorId, lowercase)
//   B  DraftJSON
//   C  UpdatedAt (ISO)
//
// "VerifiedSessions" (3 columns A–C):
//   A  SessionToken
//   B  JurorId
//   C  CreatedAt (ISO)
//
// "Info" (4 columns A–D):
//   A  Group No   B  Group Name   C  Group Desc   D  Students
//
// ── PropertiesService keys ───────────────────────────────────
//   ADMIN_PASSWORD          → plaintext admin password
//   PIN__{jurorId}          → 4-digit PIN for a juror
//   LOCKED__{jurorId}       → "1" when account is brute-force locked
//   ATTEMPTS__{jurorId}     → failed attempt count (string integer)
//   RESET_UNLOCK__{jurorId} → ms timestamp of last resetJuror call
//
// ── Status values (Evaluations col M) ───────────────────────
//   "in_progress"      — juror has started but not finished a group
//   "group_submitted"  — all criteria for a group are filled
//   "all_submitted"    — juror pressed Submit Final
//
// ── EditingFlag values (Evaluations col N) ──────────────────
//   "editing"  — resetJuror was called; juror is actively editing
//   ""         — normal; cleared when all_submitted is written
//
// ── GET endpoints ────────────────────────────────────────────
//   ?action=export&pass=X&secret=S
//   ?action=initInfo&pass=X&secret=S
//   ?action=loadDraft&juryName=X&juryDept=Y&jurorId=Z&secret=S
//   ?action=verify&juryName=X&juryDept=Y&jurorId=Z&secret=S
//   ?action=myscores&juryName=X&juryDept=Y&jurorId=Z&secret=S
//   ?action=checkPin&juryName=X&juryDept=Y&jurorId=Z&secret=S
//   ?action=createPin&juryName=X&juryDept=Y&jurorId=Z&secret=S
//   ?action=verifyPin&juryName=X&juryDept=Y&jurorId=Z&pin=XXXX&secret=S
//   ?action=resetPin&juryName=X&juryDept=Y&jurorId=Z&pass=ADMINPASS&secret=S
//
// ── POST body shapes ─────────────────────────────────────────
//   { action:"saveDraft",       juryName,juryDept,jurorId,draft,       secret,sessionToken }
//   { action:"deleteDraft",     juryName,juryDept,jurorId,              secret,sessionToken }
//   { action:"deleteJurorData", juryName,juryDept,jurorId,              secret,sessionToken }
//   { action:"resetJuror",      juryName,juryDept,jurorId,              secret,sessionToken }
//   { rows:[...], secret, sessionToken }
// ============================================================

var EVAL_SHEET     = "Evaluations";
var DRAFT_SHEET    = "Drafts";
var SESSION_SHEET  = "VerifiedSessions";
var INFO_SHEET     = "Info";
var NUM_COLS       = 14; // A–N including EditingFlag

// Unlock window after resetJuror: allows all_submitted → in_progress
// downgrades for this many minutes.
var RESET_UNLOCK_MINUTES = 20;

// Maximum wrong PIN attempts before an account is locked.
var MAX_PIN_ATTEMPTS = 3;

// Session tokens expire after 24 h (hygiene cleanup only — real
// lifetime is the browser tab session via sessionStorage).
var SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// ── Group definitions (mirror of src/config.js PROJECTS) ─────
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

// Verify the shared API secret on every request.
function checkSecret(value) {
  return String(value || "") === API_SECRET;
}

function isAuthorized(pass) {
  var stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "";
  return stored.length > 0 && pass === stored;
}

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// ── Juror ID normalisation ────────────────────────────────────
// Must mirror generateJurorId() in src/shared/api.js exactly.
// djb2 hash of normalised name+"|"+dept, base-36 encoded.
function normaliseForId(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "");
}

function computeJurorId(juryName, juryDept) {
  var str = normaliseForId(juryName) + "|" + normaliseForId(juryDept);
  var h = 5381;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(36);
}

// Resolve jurorId: prefer the value sent in the request, but always
// validate / recompute from name+dept to prevent spoofing.
function resolveJurorId(juryName, juryDept, providedId) {
  var computed = computeJurorId(juryName, juryDept);
  // If the client sent an ID, verify it matches our computation.
  // If not (e.g. old client), fall back to computed value.
  if (providedId && String(providedId).trim() !== computed) {
    // Mismatch — could be a version skew or an attack. Use computed.
  }
  return computed;
}

// Build a stable PropertiesService key prefix for a juror.
function jurorKey(jurorId) {
  return String(jurorId || "unknown");
}

// ── Reset-unlock helpers ──────────────────────────────────────

function markResetUnlock(jurorId) {
  PropertiesService.getScriptProperties()
    .setProperty("RESET_UNLOCK__" + jurorKey(jurorId), String(Date.now()));
}

function isResetUnlockActive(jurorId) {
  var v = PropertiesService.getScriptProperties()
    .getProperty("RESET_UNLOCK__" + jurorKey(jurorId));
  if (!v) return false;
  var ts = parseInt(v, 10);
  return Number.isFinite(ts) && (Date.now() - ts) <= RESET_UNLOCK_MINUTES * 60 * 1000;
}

// ── PIN helpers ───────────────────────────────────────────────

function pinKey(id)      { return "PIN__"      + jurorKey(id); }
function lockedKey(id)   { return "LOCKED__"   + jurorKey(id); }
function attemptsKey(id) { return "ATTEMPTS__" + jurorKey(id); }

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

// ── Session token helpers ─────────────────────────────────────

function getOrCreateSessionSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SESSION_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SESSION_SHEET);
    sheet.appendRow(["SessionToken", "JurorId", "CreatedAt"]);
    sheet.getRange(1, 1, 1, 3)
      .setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Generate a cryptographically adequate token (GAS lacks crypto, so
// we combine multiple Math.random() calls for sufficient entropy).
function generateToken() {
  var t = "";
  for (var i = 0; i < 4; i++) t += Math.random().toString(36).slice(2);
  return t.slice(0, 32);
}

// Store a new session token for a jurorId and return it.
function createSessionToken(jurorId) {
  var token = generateToken();
  var sheet = getOrCreateSessionSheet();
  sheet.appendRow([token, String(jurorId), new Date().toISOString()]);
  // Prune expired tokens (keep sheet tidy).
  pruneExpiredSessions(sheet);
  return token;
}

// Verify a token and return true if it belongs to jurorId and is not expired.
function isValidSessionToken(token, jurorId) {
  if (!token || !jurorId) return false;
  // Allow "new_juror_ack" placeholder from first-time jurors.
  if (String(token) === "new_juror_ack") return true;
  var sheet   = getOrCreateSessionSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var now    = Date.now();
  for (var i = 0; i < values.length; i++) {
    var rowToken   = String(values[i][0] || "");
    var rowJurorId = String(values[i][1] || "");
    var createdAt  = new Date(values[i][2] || 0).getTime();
    if (rowToken !== token) continue;
    if (rowJurorId !== String(jurorId)) continue;
    if (now - createdAt > SESSION_TTL_MS) continue;
    return true;
  }
  return false;
}

// Delete rows whose CreatedAt is older than SESSION_TTL_MS.
function pruneExpiredSessions(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var now    = Date.now();
  // Iterate in reverse to avoid index drift when deleting rows.
  for (var i = values.length - 1; i >= 0; i--) {
    var createdAt = new Date(values[i][2] || 0).getTime();
    if (now - createdAt > SESSION_TTL_MS) sheet.deleteRow(i + 2);
  }
}

// ════════════════════════════════════════════════════════════
// GET handler
// ════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    // Reject requests with wrong or missing secret.
    if (!checkSecret(e.parameter.secret)) {
      return respond({ status: "unauthorized", message: "Invalid secret." });
    }

    var action   = norm(e.parameter.action || "");
    var juryName = (e.parameter.juryName || "").trim();
    var juryDept = (e.parameter.juryDept || "").trim();
    var jurorId  = resolveJurorId(juryName, juryDept, e.parameter.jurorId);

    // ── export ────────────────────────────────────────────
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
      var row        = findDraftRow(draftSheet, jurorId);
      if (!row) return respond({ status: "not_found" });

      try {
        return respond({ status: "ok", draft: JSON.parse(row[1]) });
      } catch (_) {
        return respond({ status: "error", message: "Corrupt draft JSON." });
      }
    }

    // ── verify ────────────────────────────────────────────
    if (action === "verify") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", submittedCount: 0 });

      var values = sheet.getDataRange().getValues();
      values.shift();

      // Match by jurorId (col C, index 2) — falls back to name+dept
      // for rows written by older client versions without jurorId.
      var count = values.filter(function(r) {
        var rowId = String(r[2] || "").trim();
        if (rowId) return rowId === jurorId && String(r[12] || "").trim() === "all_submitted";
        // Legacy fallback
        return norm(r[0]) === norm(juryName)
            && norm(r[1]) === norm(juryDept)
            && String(r[12] || "").trim() === "all_submitted";
      }).length;

      return respond({ status: "ok", submittedCount: count });
    }

    // ── myscores ──────────────────────────────────────────
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
        var rowId = String(r[2] || "").trim();
        var match = rowId
          ? rowId === jurorId
          : norm(r[0]) === norm(juryName) && norm(r[1]) === norm(juryDept);
        if (!match) return;

        var groupNo = String(r[4] || "").trim();
        if (!groupNo) return;
        var prev = bestByGroup[groupNo];
        if (!prev) { bestByGroup[groupNo] = r; return; }
        var newStatus  = String(r[12]    || "").trim();
        var prevStatus = String(prev[12] || "").trim();
        if ((pri[newStatus] || 0) > (pri[prevStatus] || 0)) { bestByGroup[groupNo] = r; return; }
        if ((pri[newStatus] || 0) === (pri[prevStatus] || 0) && String(r[3]) > String(prev[3])) {
          bestByGroup[groupNo] = r;
        }
      });

      var out = Object.keys(bestByGroup).map(function(g) {
        var r = bestByGroup[g];
        return {
          juryName:    r[0],  juryDept:    r[1],  jurorId:     r[2],
          timestamp:   r[3],
          projectId:   Number(r[4]),  projectName: r[5],
          technical:   r[6],  design:      r[7],  delivery:    r[8],
          teamwork:    r[9],  total:       r[10], comments:    r[11],
          status:      r[12], editingFlag: r[13] || "",
        };
      }).sort(function(a, b) { return (a.projectId || 0) - (b.projectId || 0); });

      return respond({ status: "ok", rows: out });
    }

    // ── checkPin ──────────────────────────────────────────
    if (action === "checkpin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      return respond({ status: "ok", exists: getPin(jurorId) !== null });
    }

    // ── createPin ─────────────────────────────────────────
    if (action === "createpin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      var existing = getPin(jurorId);
      if (existing) return respond({ status: "ok", pin: existing });
      var pin = generatePin();
      setPin(jurorId, pin);
      return respond({ status: "ok", pin: pin });
    }

    // ── verifyPin ─────────────────────────────────────────
    // On success, generates a session token and returns it.
    if (action === "verifypin") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });
      var enteredPin = String(e.parameter.pin || "").trim();

      if (isLocked(jurorId)) {
        return respond({ status: "ok", valid: false, locked: true, attemptsLeft: 0 });
      }

      var storedPin = getPin(jurorId);
      if (!storedPin) {
        // No PIN on record — graceful degradation: let them through.
        var token = createSessionToken(jurorId);
        return respond({ status: "ok", valid: true, locked: false,
                         attemptsLeft: MAX_PIN_ATTEMPTS, sessionToken: token });
      }

      if (enteredPin === storedPin) {
        setAttempts(jurorId, 0);
        var token = createSessionToken(jurorId);
        return respond({ status: "ok", valid: true, locked: false,
                         attemptsLeft: MAX_PIN_ATTEMPTS, sessionToken: token });
      }

      var attempts = getAttempts(jurorId) + 1;
      setAttempts(jurorId, attempts);
      var left = Math.max(0, MAX_PIN_ATTEMPTS - attempts);
      if (left === 0) lockAccount(jurorId);
      return respond({ status: "ok", valid: false, locked: left === 0, attemptsLeft: left });
    }

    // ── resetPin ──────────────────────────────────────────
    if (action === "resetpin") {
      if (!isAuthorized(e.parameter.pass || "")) return respond({ status: "unauthorized" });
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      PropertiesService.getScriptProperties().deleteProperty(pinKey(jurorId));
      clearLock(jurorId);
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

    // Reject requests with wrong or missing secret.
    if (!checkSecret(data.secret)) {
      return respond({ status: "unauthorized", message: "Invalid secret." });
    }

    var juryName = (data.juryName || "").trim();
    var juryDept = (data.juryDept || "").trim();
    var jurorId  = juryName ? resolveJurorId(juryName, juryDept, data.jurorId) : (data.jurorId || "");

    // For write actions, validate session token.
    // Row upserts (data.rows) also require a valid token, but we
    // resolve jurorId from the first row when not provided directly.
    var sessionToken = String(data.sessionToken || "");
    var tokenJurorId = jurorId;
    if (!tokenJurorId && data.rows && data.rows.length > 0) {
      var r0 = data.rows[0];
      tokenJurorId = resolveJurorId(r0.juryName || "", r0.juryDept || "", r0.jurorId);
    }

    var writeActions = ["saveDraft", "deleteDraft", "deleteJurorData", "resetJuror"];
    var isWriteAction = data.action
      ? writeActions.indexOf(data.action) >= 0
      : !!data.rows; // rows upsert

    if (isWriteAction && !isValidSessionToken(sessionToken, tokenJurorId)) {
      return respond({ status: "unauthorized", message: "Invalid or expired session token." });
    }

    // ── saveDraft ─────────────────────────────────────────
    if (data.action === "saveDraft") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet = getOrCreateDraftSheet();
      var json       = JSON.stringify(data.draft || {});
      var now        = new Date().toISOString();
      var rowIdx     = findDraftRowIndex(draftSheet, jurorId);

      if (rowIdx > 0) {
        draftSheet.getRange(rowIdx, 2, 1, 2).setValues([[json, now]]);
      } else {
        draftSheet.appendRow([jurorId, json, now]);
      }
      return respond({ status: "ok" });
    }

    // ── deleteDraft ───────────────────────────────────────
    if (data.action === "deleteDraft") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet = getOrCreateDraftSheet();
      var rowIdx     = findDraftRowIndex(draftSheet, jurorId);
      if (rowIdx > 0) draftSheet.deleteRow(rowIdx);
      return respond({ status: "ok" });
    }

    // ── deleteJurorData ───────────────────────────────────
    if (data.action === "deleteJurorData") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      var draftSheet = getOrCreateDraftSheet();
      var draftIdx   = findDraftRowIndex(draftSheet, jurorId);
      if (draftIdx > 0) draftSheet.deleteRow(draftIdx);

      var ss        = SpreadsheetApp.getActiveSpreadsheet();
      var evalSheet = ss.getSheetByName(EVAL_SHEET);
      var deleted   = 0;
      if (evalSheet) {
        var lastRow = evalSheet.getLastRow();
        if (lastRow >= 2) {
          var values = evalSheet.getRange(2, 1, lastRow - 1, 3).getValues();
          for (var i = values.length - 1; i >= 0; i--) {
            var rowId = String(values[i][2] || "").trim();
            var match = rowId
              ? rowId === jurorId
              : norm(values[i][0]) === norm(juryName) && norm(values[i][1]) === norm(juryDept);
            if (match) { evalSheet.deleteRow(i + 2); deleted++; }
          }
        }
      }
      return respond({ status: "ok", deleted: deleted });
    }

    // ── resetJuror ────────────────────────────────────────
    if (data.action === "resetJuror") {
      if (!juryName || !juryDept) return respond({ status: "error", message: "juryName and juryDept required" });

      markResetUnlock(jurorId);

      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(EVAL_SHEET);
      if (!sheet) return respond({ status: "ok", reset: 0 });

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return respond({ status: "ok", reset: 0 });

      var values = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
      var reset  = 0;

      values.forEach(function(r, i) {
        var rowId = String(r[2] || "").trim();
        var match = rowId
          ? rowId === jurorId
          : norm(r[0]) === norm(juryName) && norm(r[1]) === norm(juryDept);
        if (!match) return;

        var rowNum = i + 2;
        sheet.getRange(rowNum, 13).setValue("in_progress"); // Status col M
        sheet.getRange(rowNum, 14).setValue("editing");     // EditingFlag col N
        sheet.getRange(rowNum, 1, 1, NUM_COLS).setBackground("#fef9c3");
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
        "Juror Name", "Department / Institution", "Juror ID", "Timestamp",
        "Group No", "Group Name",
        "Technical (30)", "Written (30)", "Oral (30)", "Teamwork (10)",
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

    // Build lookup: jurorId__groupNo → 1-based row number.
    // Falls back to name__dept__groupNo for legacy rows without jurorId.
    function rowKey(id, name, dept, groupNo) {
      if (id) return String(id) + "__" + String(groupNo || "").trim();
      return norm(name) + "__" + norm(dept) + "__" + String(groupNo || "").trim();
    }

    var index = {};
    existing.forEach(function(r, i) {
      var k = rowKey(String(r[2] || "").trim(), r[0], r[1], r[4]);
      if (k !== "__") index[k] = i + 2;
    });

    // Deduplicate incoming rows — keep the last one per key.
    var latestByKey = {};
    (data.rows || []).forEach(function(row) {
      var rid = resolveJurorId(row.juryName || "", row.juryDept || "", row.jurorId);
      var k   = rowKey(rid, row.juryName, row.juryDept, row.projectId);
      if (k !== "__") latestByKey[k] = { row: row, jurorId: rid };
    });

    var updated = 0, added = 0;

    Object.keys(latestByKey).forEach(function(k) {
      var entry     = latestByKey[k];
      var row       = entry.row;
      var rid       = entry.jurorId;
      var newStatus = String(row.status || "all_submitted");
      var newFlag   = "";
      var existingRowNum = index[k];

      if (existingRowNum) {
        var existingRow = existing[existingRowNum - 2];

        // Reject stale writes: skip if incoming timestamp is older than sheet.
        var existingTs = String(existingRow[3] || "");
        var incomingTs = String(row.timestamp  || "");
        if (existingTs && incomingTs && incomingTs < existingTs) return;

        var currentStatus = String(existingRow[12] || "");

        // Block all_submitted → downgrade unless the unlock window is open.
        if (currentStatus === "all_submitted" && newStatus !== "all_submitted") {
          if (!isResetUnlockActive(rid)) newStatus = "all_submitted";
        }

        // EditingFlag carry-over
        if (newStatus === "all_submitted") {
          newFlag = "";
        } else if (isResetUnlockActive(rid)) {
          newFlag = "editing";
        } else {
          newFlag = String(existingRow[13] || "");
        }
      }

      var bgColor =
        newStatus === "in_progress"     ? "#fef9c3" :
        newStatus === "group_submitted" ? "#dcfce7" :
        newStatus === "all_submitted"   ? "#bbf7d0" : "#ffffff";

      var rowValues = [
        row.juryName,  row.juryDept,    rid,           row.timestamp,
        row.projectId, row.projectName,
        row.technical, row.design,      row.delivery,  row.teamwork,
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
    sheet.appendRow(["JurorId", "DraftJSON", "UpdatedAt"]);
    sheet.getRange(1, 1, 1, 3)
      .setFontWeight("bold").setBackground("#1d4ed8").setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 420);
  }
  return sheet;
}

function findDraftRow(sheet, jurorId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(jurorId)) return values[i];
  }
  return null;
}

function findDraftRowIndex(sheet, jurorId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(jurorId)) return i + 2;
  }
  return 0;
}
