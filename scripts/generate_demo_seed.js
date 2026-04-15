import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC UTILITIES
// ═══════════════════════════════════════════════════════════════

let _seed = 0.20260402;
function random() {
  const x = Math.sin(_seed++) * 10000;
  return x - Math.floor(x);
}
function randInt(min, max) { return Math.floor(random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(random() * arr.length)]; }

function uuid(seedStr) {
  const hash = crypto.createHash('md5').update(seedStr).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
function sha256(val) { return crypto.createHash('sha256').update(val).digest('hex'); }
function escapeSql(str) { if (!str) return ''; return str.replace(/'/g, "''"); }

// Script run date — used to anchor current-period dates and 90-day audit spread
const TODAY = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

// Dynamic current-period labels — computed from NOW so the seed stays current
const _now = new Date();
const CUR_YEAR  = _now.getFullYear();
const CUR_MONTH = _now.getMonth() + 1; // 1–12
// Spring = Jan–Jun (month < 7), Fall = Jul–Dec (month >= 7)
const CUR_SEMESTER = CUR_MONTH >= 7 ? 'Fall' : 'Spring';
const CUR_SEMESTER_LABEL  = `${CUR_SEMESTER} ${CUR_YEAR}`;          // e.g. "Spring 2026"
const CUR_SEM_SHORT       = `${CUR_SEMESTER[0]}${String(CUR_YEAR).slice(-2)}`; // e.g. "S26"
const CUR_SEASON_LABEL    = `${CUR_YEAR} Season`;                    // e.g. "2026 Season"
const CUR_COMP_LABEL      = `${CUR_YEAR} Competition`;               // e.g. "2026 Competition"
const CUR_CONTEST_LABEL   = `${CUR_YEAR} Contest`;                   // e.g. "2026 Contest"

// Deterministic IP / device helpers — for audit log enrichment
const IP_POOL = ['85.99.12.41', '213.74.55.108', '10.0.3.17', '77.246.118.22', '193.140.8.5', '88.222.147.93', '172.16.0.44'];
function randIp() { return pick(IP_POOL); }
const UA_POOL = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
];
function randUserAgent() { return pick(UA_POOL); }
function randSessionId(salt) { return uuid(`session-${salt}-${randInt(1000, 9999)}`); }

// Period start/end dates ARE the evaluation event window.
// Academic 1-day events: start = end = evalDay.
// Multi-day competitions: start = first eval day, end = last eval day.
// evalDaysOverride: per-org explicit day count (overrides orgType default).
function computeEvalWindow(start, _end, orgType, evalDaysOverride) {
  const evalDays = evalDaysOverride != null ? evalDaysOverride : (orgType === 'competition' ? 3 : 1);
  const evalDay  = start;  // period start IS the first evaluation day
  return { evalDay, evalDays };
}

// SQL timestamp helpers — all dates derive from period event windows, not a global BASE_TIME
function sqlTs(dateStr, offsetHours = 0) {
  if (offsetHours === 0) return `timestamp '${dateStr} 09:00:00'`;
  const sign = offsetHours >= 0 ? '+' : '-';
  const absH = Math.abs(Math.floor(offsetHours));
  const absM = Math.abs(Math.round((offsetHours % 1) * 60));
  return `(timestamp '${dateStr} 09:00:00' ${sign} interval '${absH} hours ${absM} minutes')`;
}
function randSqlTs(dateStr, minH, maxH) {
  return sqlTs(dateStr, randInt(minH, maxH) + randInt(0, 59) / 60);
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PROJECT_COUNTS = { current: 12, prev: 10, older: 8, oldest: 6 };
// Per-org overrides: only specify keys that differ from defaults
const PROJECT_COUNT_OVERRIDES = { 'TEDU-EE': { current: 5 } };
const JUROR_ACTIVE   = { current: 18, prev: 12, older: 8, oldest: 6 };
const JUROR_ACTIVE_OVERRIDES = { 'TEDU-EE': { current: 16 } };
const TOKENS_PER_PERIOD = 4;
const ARCH_DIST_12 = ['star','star','solid','solid','wellrounded','highvar','tech_strong_comm_weak','weak_tech_strong_team','strong_late','borderline','average','partial'];
const ARCH_DIST_10 = ['star','solid','solid','wellrounded','highvar','tech_strong_comm_weak','borderline','average','strong_late','partial'];
const ARCH_DIST_8  = ['star','solid','solid','highvar','borderline','average','wellrounded','partial'];
const ARCH_DIST_6  = ['star','solid','highvar','borderline','average','partial'];
const ARCH_DIST_5  = ['star','solid','wellrounded','borderline','partial'];

function archForCount(count) {
  if (count >= 12) return ARCH_DIST_12;
  if (count >= 10) return ARCH_DIST_10;
  if (count >= 8)  return ARCH_DIST_8;
  if (count >= 6)  return ARCH_DIST_6;
  return ARCH_DIST_5;
}
function projCountForOrgIdx(orgCode, idx) {
  const ov = PROJECT_COUNT_OVERRIDES[orgCode] || {};
  const key = idx === 0 ? 'current' : idx === 1 ? 'prev' : idx === 2 ? 'older' : 'oldest';
  if (ov[key] !== undefined) return ov[key];
  return PROJECT_COUNTS[key];
}
function activeJurorsForIdx(orgCode, idx) {
  const ov = JUROR_ACTIVE_OVERRIDES[orgCode] || {};
  const key = idx === 0 ? 'current' : idx === 1 ? 'prev' : idx === 2 ? 'older' : 'oldest';
  if (ov[key] !== undefined) return ov[key];
  if (idx === 0) return JUROR_ACTIVE.current;
  if (idx === 1) return JUROR_ACTIVE.prev;
  if (idx === 2) return JUROR_ACTIVE.older;
  return JUROR_ACTIVE.oldest;
}

// ═══════════════════════════════════════════════════════════════
// BATCH INSERT HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Collects SQL value tuples and flushes them as multi-row INSERTs.
 * Each call to push() receives a pre-formatted "(val1, val2, ...)" string.
 * flush(out) emits batches of `batchSize` rows — reduces thousands of
 * single-row INSERTs to ~100 statements, cutting psql round-trip overhead.
 */
function makeBatcher(table, columns, conflictClause = 'ON CONFLICT DO NOTHING', batchSize = 100) {
  let rows = [];
  return {
    push(valuesTuple) { rows.push(valuesTuple); },
    flush(buf) {
      while (rows.length > 0) {
        const batch = rows.splice(0, batchSize);
        buf.push(`INSERT INTO ${table} (${columns}) VALUES\n  ${batch.join(',\n  ')}\n${conflictClause};`);
      }
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT BUFFER
// ═══════════════════════════════════════════════════════════════

let out = [];
out.push(`-- VERA Premium Demo Seed`);
out.push(`-- Generated by scripts/generate_demo_seed.js`);
out.push(`-- 6 orgs, 68 jurors, ~174 projects, premium scores & audit logs`);
out.push(`SELECT setseed(0.20260402);`);
out.push(`BEGIN;\n`);

out.push(`-- Pre-seed Cleanup`);
out.push(`TRUNCATE TABLE
  jury_feedback,
  audit_logs,
  entry_tokens,
  score_sheet_items,
  score_sheets,
  juror_period_auth,
  jurors,
  projects,
  period_criterion_outcome_maps,
  period_criteria,
  period_outcomes,
  periods,
  framework_criterion_outcome_maps,
  framework_criteria,
  framework_outcomes,
  frameworks,
  admin_user_sessions,
  memberships,
  org_applications,
  organizations,
  profiles
CASCADE;
`);

// Security policy: demo-specific settings (bmax=3, lockout=5m, qrTtl=24h)
out.push(`UPDATE security_policy SET policy = policy
  || '{"maxPinAttempts":3,"pinLockCooldown":"5m","qrTtl":"24h"}'::jsonb
  WHERE id = 1;`);
out.push('');

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONS
// ═══════════════════════════════════════════════════════════════

const orgs = [
  { p: 1, name: 'Electrical-Electronics Engineering', institution: 'TED University', code: 'TEDU-EE', type: 'academic', evalDays: 1, lang: 'tr', descLang: 'en', commentLang: 'en' },
  { p: 2, name: 'Computer Science', institution: 'Carnegie Mellon University', code: 'CMU-CS', type: 'academic', evalDays: 1, lang: 'en', descLang: 'en' },
  { p: 3, name: 'TEKNOFEST', institution: 'Türkiye Technology Team Foundation', code: 'TEKNOFEST', type: 'competition', evalDays: 3, lang: 'tr', descLang: 'tr' },
  { p: 4, name: 'TÜBİTAK 2204-A', institution: 'Scientific and Technological Research Council of Türkiye', code: 'TUBITAK-2204A', type: 'competition', evalDays: 2, lang: 'tr', descLang: 'tr' },
  { p: 5, name: 'AP-S Student Design Contest', institution: 'IEEE Antennas and Propagation Society', code: 'IEEE-APSSDC', type: 'competition', evalDays: 2, lang: 'en', descLang: 'en' },
  { p: 6, name: 'CanSat Competition', institution: 'American Astronautical Society', code: 'CANSAT', type: 'competition', evalDays: 3, lang: 'en', descLang: 'en' }
];

const orgCreatedDates = {
  'TEDU-EE': '2024-06-01', 'CMU-CS': '2024-06-15', 'TEKNOFEST': '2024-04-01',
  'TUBITAK-2204A': '2024-04-15', 'IEEE-APSSDC': '2024-05-01', 'CANSAT': '2024-04-20',
};

const orgSettings = {
  'TEDU-EE': '{"locale":"tr","notifications":{"email":true,"slack":false},"theme":"default","evaluation_day_reminder":true}',
  'CMU-CS': '{"locale":"en","notifications":{"email":true,"slack":true},"theme":"default","auto_lock_after_hours":48}',
  'TEKNOFEST': '{"locale":"tr","notifications":{"email":true,"slack":false},"theme":"default","multi_day_event":true}',
  'TUBITAK-2204A': '{"locale":"tr","notifications":{"email":false,"slack":false},"theme":"default"}',
  'IEEE-APSSDC': '{"locale":"en","notifications":{"email":true,"slack":false},"theme":"default"}',
  'CANSAT': '{"locale":"en","notifications":{"email":true,"slack":true},"theme":"default","recovery_tracking":true}',
};

const orgContactEmails = {
  'TEDU-EE':       'tedu-ee@vera-eval.app',
  'CMU-CS':        'cmu-cs@vera-eval.app',
  'TEKNOFEST':     'teknofest@vera-eval.app',
  'TUBITAK-2204A': 'tubitak-2204a@vera-eval.app',
  'IEEE-APSSDC':   'ieee-apssdc@vera-eval.app',
  'CANSAT':   'cansat-2025@vera-eval.app',
};

out.push(`-- Organizations`);
orgs.forEach(o => {
  o.id = uuid('org-' + o.code);
  const ts = sqlTs(orgCreatedDates[o.code]);
  const settings = orgSettings[o.code] || '{}';
  const contactEmail = orgContactEmails[o.code] || '';
  out.push(`INSERT INTO organizations (id, institution, name, code, status, settings, contact_email, updated_at) VALUES ('${o.id}', '${escapeSql(o.institution)}', '${escapeSql(o.name)}', '${o.code}', 'active', '${settings}', '${contactEmail}', ${ts}) ON CONFLICT DO NOTHING;`);
});
out.push('');

// ═══════════════════════════════════════════════════════════════
// PROFILES & ADMIN
// ═══════════════════════════════════════════════════════════════

const demoAdminId = '6ea7146f-1331-4828-8b8a-e777c9a35d6a';
out.push(`-- Identities`);
out.push(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '${demoAdminId}', 'authenticated', 'authenticated', 'demo.admin@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;`);
out.push(`INSERT INTO profiles (id, display_name) VALUES ('${demoAdminId}', 'Vera Platform Admin') ON CONFLICT (id) DO UPDATE SET display_name = 'Vera Platform Admin';`);
out.push(`INSERT INTO memberships (user_id, organization_id, role) VALUES ('${demoAdminId}', NULL, 'super_admin') ON CONFLICT DO NOTHING;`);

let orgAdminIds = [];
const orgAdminMap = {};
const orgAdminNames = {
  'TEDU-EE':      ['Prof. Koray Yılmazer', 'Dr. Leyla Şensoy'],
  'CMU-CS':       ['Prof. Marcus Reynolds', 'Dr. Chloe Beckett'],
  'TEKNOFEST':    ['Cemil Bozkurt', 'Bahar Tandoğan'],
  'TUBITAK-2204A':['Prof. Ayşe Karataş'],
  'IEEE-APSSDC':  ['Dr. Gavin Pierce'],
  'CANSAT':  ['Harper Quinn']
};

orgs.forEach(o => {
  const names = orgAdminNames[o.code] || [];
  orgAdminMap[o.code] = [];
  names.forEach((nm, i) => {
    const idx = i + 1;
    let pId = uuid('prof-admin-' + o.code + '-' + idx);
    const emailName = nm.replace(/^(Prof\.|Dr\.|Col\.)\s*/i, '').toLowerCase().replace(/\s+/g, '.').replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u');
    let fakeEmail = `${emailName}@vera-eval.app`;
    out.push(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '${pId}', 'authenticated', 'authenticated', '${fakeEmail}', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;`);
    out.push(`INSERT INTO profiles (id, display_name) VALUES ('${pId}', '${escapeSql(nm)}') ON CONFLICT DO NOTHING;`);
    out.push(`INSERT INTO memberships (user_id, organization_id, role) VALUES ('${pId}', '${o.id}', 'org_admin') ON CONFLICT DO NOTHING;`);
    orgAdminIds.push(pId);
    orgAdminMap[o.code].push(pId);
  });
});
out.push('');

// ═══════════════════════════════════════════════════════════════
// ADMIN USER SESSIONS — realistic device/browser mix per admin
// ═══════════════════════════════════════════════════════════════

out.push(`-- Admin User Sessions`);
{
  // Sessions are always relative to SQL now() — stays current on each daily demo reset
  // lastAct: hours before now; signedIn: hours before lastAct
  const sessionDefs = [
    // ── Vera Platform Admin (super_admin) ────────────────────────
    { uSeed: 'admin-vera', dSeed: 'dev-vera-1', browser:'Chrome 124', os:'macOS',   ip:'185.76.42.101', cc:'TR', method:'google',   lastActH:2,   signedInH:6,  expDays:30 },
    { uSeed: 'admin-vera', dSeed: 'dev-vera-2', browser:'Firefox 125',os:'Windows', ip:'91.93.143.201', cc:'TR', method:'password',  lastActH:52,  signedInH:56, expDays:30 },
    { uSeed: 'admin-vera', dSeed: 'dev-vera-3', browser:'Safari 17',  os:'iOS',     ip:'176.42.18.77',  cc:'TR', method:'google',    lastActH:128, signedInH:131,expDays:30 },
    // ── TEDU-EE — Prof. Koray Yılmazer ───────────────────────────
    { uSeed: 'prof-admin-TEDU-EE-1', dSeed: 'dev-tedu-1', browser:'Chrome 124',  os:'macOS',   ip:'193.255.106.14', cc:'TR', method:'google',   lastActH:4,  signedInH:8,  expDays:30 },
    { uSeed: 'prof-admin-TEDU-EE-1', dSeed: 'dev-tedu-2', browser:'Safari 17',   os:'iPad',    ip:'78.189.44.120',  cc:'TR', method:'google',   lastActH:96, signedInH:99, expDays:30 },
    // ── CMU-CS — Prof. Marcus Reynolds ───────────────────────────
    { uSeed: 'prof-admin-CMU-CS-1',  dSeed: 'dev-cmu-1',  browser:'Chrome 124',  os:'macOS',   ip:'128.2.42.95',    cc:'US', method:'google',   lastActH:1,  signedInH:5,  expDays:30 },
    { uSeed: 'prof-admin-CMU-CS-1',  dSeed: 'dev-cmu-2',  browser:'Edge 124',    os:'Windows', ip:'71.185.22.14',   cc:'US', method:'password',  lastActH:72, signedInH:76, expDays:30 },
    // ── TEKNOFEST — Cemil Bozkurt ─────────────────────────────────
    { uSeed: 'prof-admin-TEKNOFEST-1', dSeed:'dev-tkn-1', browser:'Chrome 124',  os:'Windows', ip:'185.60.101.88',  cc:'TR', method:'password',  lastActH:3,  signedInH:7,  expDays:30 },
    // ── IEEE-APSSDC — Dr. Gavin Pierce ───────────────────────────
    { uSeed: 'prof-admin-IEEE-APSSDC-1', dSeed:'dev-ieee-1', browser:'Safari 17', os:'macOS', ip:'69.171.246.18',   cc:'US', method:'google',   lastActH:8,  signedInH:12, expDays:30 },
  ];

  // Timestamps are now()-relative SQL expressions — always valid on each daily demo reset
  function demoTs(hoursAgo, extraHoursAgo = 0) {
    const totalH = hoursAgo + extraHoursAgo;
    if (totalH === 0) return `now()`;
    return `(now() - interval '${totalH} hours')`;
  }
  function expTs(fromHoursAgo, days) {
    const netH = days * 24 - fromHoursAgo;
    if (netH === 0) return `now()`;
    if (netH > 0) return `(now() + interval '${netH} hours')`;
    return `(now() - interval '${Math.abs(netH)} hours')`;
  }

  sessionDefs.forEach(s => {
    const userId = s.uSeed === 'admin-vera' ? demoAdminId : uuid(s.uSeed);
    const id     = uuid('session-' + s.dSeed);
    const devId  = uuid('devid-' + s.dSeed);
    const lastAct = demoTs(s.lastActH);
    const signedIn = demoTs(s.signedInH);
    const expiresAt = expTs(s.signedInH, s.expDays);
    out.push(`INSERT INTO admin_user_sessions (id, user_id, device_id, browser, os, ip_address, country_code, auth_method, signed_in_at, first_seen_at, last_activity_at, expires_at) VALUES ('${id}', '${userId}', '${devId}', '${s.browser}', '${s.os}', '${s.ip}', '${s.cc}', '${s.method}', ${signedIn}, ${signedIn}, ${lastAct}, ${expiresAt}) ON CONFLICT (user_id, device_id) DO UPDATE SET last_activity_at = EXCLUDED.last_activity_at;`);
  });
}
out.push('');

const applicantNames = ['Prof. Halil Çankaya', 'Dr. Rachel Voss', 'Oğuzhan Demirel', 'Dr. Ayça Gürkan', 'Prof. Arthur Finch', 'Celine Moreau'];
const applicantEmails = [
  'halil.cankaya@vera-eval.app',
  'rachel.voss@vera-eval.app',
  'oguzhan.demirel@vera-eval.app',
  'ayca.gurkan@vera-eval.app',
  'arthur.finch@vera-eval.app',
  'celine.moreau@vera-eval.app',
];
const appStatuses = ['approved', 'approved', 'rejected', 'cancelled', 'pending', 'pending'];
const orgAppIds = [];
orgs.forEach((o, i) => {
  let appUuid = uuid('app-' + o.code);
  out.push(`INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('${appUuid}', '${o.id}', '${escapeSql(applicantNames[i])}', '${applicantEmails[i]}', '${appStatuses[i]}') ON CONFLICT DO NOTHING;`);
  orgAppIds.push({id: appUuid, org: o.code});
});
out.push('');

// ═══════════════════════════════════════════════════════════════
// PLATFORM FRAMEWORK TEMPLATES (organization_id = NULL)
// Mirrors 008_platform.sql — must be re-seeded after TRUNCATE.
// Fixed UUIDs must stay in sync with the migration.
// ═══════════════════════════════════════════════════════════════

out.push(`-- Platform Framework Templates`);

const MUDEK_FW_ID = '3ae7e475-dd51-45e7-a79a-1c159fbf6abc';
const ABET_FW_ID  = '253751a6-09dd-47d7-93b4-7064456e553c';
const VERA_FW_ID  = 'a1b2c3d4-e5f6-4000-a000-000000000001';
const MUDEK_CT_ID = 'fc1a0001-0000-4000-a000-000000000001'; // technical
const MUDEK_CD_ID = 'fc1a0001-0000-4000-a000-000000000002'; // design/written
const MUDEK_CO_ID = 'fc1a0001-0000-4000-a000-000000000003'; // delivery/oral
const MUDEK_CW_ID = 'fc1a0001-0000-4000-a000-000000000004'; // teamwork
const VERA_CT_ID  = 'fc2a0001-0000-4000-a000-000000000001'; // technical
const VERA_CD_ID  = 'fc2a0001-0000-4000-a000-000000000002'; // written
const VERA_CO_ID  = 'fc2a0001-0000-4000-a000-000000000003'; // oral
const VERA_CW_ID  = 'fc2a0001-0000-4000-a000-000000000004'; // teamwork

// ── MÜDEK v3.1 ──────────────────────────────────────────────────────────────
out.push(`INSERT INTO frameworks (id, organization_id, name, description) VALUES ('${MUDEK_FW_ID}', NULL, 'MÜDEK v3.1', 'MÜDEK engineering accreditation framework — 18 programme outcomes (PO 1.1–11)') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;`);

const mudekOutcomes = [
  { code:'PO 1.1',  label:'Foundational Knowledge',            desc:'Knowledge in mathematics, natural sciences, basic engineering, computational methods, and discipline-specific topics',                                                                                                                                                    sort:1  },
  { code:'PO 1.2',  label:'Knowledge Application',             desc:'Ability to apply knowledge in mathematics, natural sciences, basic engineering, computational methods, and discipline-specific topics to solve complex engineering problems',                                                                                            sort:2  },
  { code:'PO 2',    label:'Problem Identification & Analysis',  desc:'Ability to identify, formulate, and analyze complex engineering problems using basic science, mathematics, and engineering knowledge while considering relevant UN Sustainable Development Goals',                                                                        sort:3  },
  { code:'PO 3.1',  label:'Creative Solution Design',           desc:'Ability to design creative solutions to complex engineering problems',                                                                                                                                                                                                   sort:4  },
  { code:'PO 3.2',  label:'Complex System Design',              desc:'Ability to design complex systems, processes, devices, or products that meet current and future requirements while considering realistic constraints and conditions',                                                                                                     sort:5  },
  { code:'PO 4',    label:'Modern Tools & Techniques',          desc:'Ability to select and use appropriate techniques, resources, and modern engineering and IT tools, including estimation and modeling, for analysis and solution of complex engineering problems, with awareness of their limitations',                                    sort:6  },
  { code:'PO 5',    label:'Research Methods',                   desc:'Ability to use research methods including literature review, experiment design, data collection, result analysis, and interpretation for investigation of complex engineering problems',                                                                                   sort:7  },
  { code:'PO 6.1',  label:'Societal & Environmental Impact',    desc:'Knowledge of the impacts of engineering applications on society, health and safety, economy, sustainability, and environment within the scope of UN Sustainable Development Goals',                                                                                     sort:8  },
  { code:'PO 6.2',  label:'Legal Awareness',                    desc:'Awareness of the legal consequences of engineering solutions',                                                                                                                                                                                                          sort:9  },
  { code:'PO 7.1',  label:'Ethics & Professional Conduct',      desc:'Knowledge of acting in accordance with engineering professional principles and ethical responsibility',                                                                                                                                                                  sort:10 },
  { code:'PO 7.2',  label:'Impartiality & Diversity',           desc:'Awareness of acting without discrimination and being inclusive of diversity',                                                                                                                                                                                           sort:11 },
  { code:'PO 8.1',  label:'Intra-disciplinary Teamwork',        desc:'Ability to work effectively as a team member or leader in intra-disciplinary teams (face-to-face, remote, or hybrid)',                                                                                                                                                  sort:12 },
  { code:'PO 8.2',  label:'Multidisciplinary Teamwork',         desc:'Ability to work effectively as a team member or leader in multidisciplinary teams (face-to-face, remote, or hybrid)',                                                                                                                                                   sort:13 },
  { code:'PO 9.1',  label:'Oral Communication',                 desc:'Ability to communicate effectively orally on technical subjects, taking into account the diverse characteristics of the target audience (education, language, profession, etc.)',                                                                                        sort:14 },
  { code:'PO 9.2',  label:'Written Communication',              desc:'Ability to communicate effectively in writing on technical subjects, taking into account the diverse characteristics of the target audience (education, language, profession, etc.)',                                                                                    sort:15 },
  { code:'PO 10.1', label:'Business & Project Management',      desc:'Knowledge of business practices such as project management and economic feasibility analysis',                                                                                                                                                                          sort:16 },
  { code:'PO 10.2', label:'Entrepreneurship & Innovation',      desc:'Awareness of entrepreneurship and innovation',                                                                                                                                                                                                                         sort:17 },
  { code:'PO 11',   label:'Lifelong Learning',                  desc:'Ability to learn independently and continuously, adapt to new and emerging technologies, and think critically about technological changes',                                                                                                                              sort:18 },
];

const mudekPlatOutIdByCode = {};
mudekOutcomes.forEach(o => {
  const oId = uuid(`platform-mudek-outcome-${o.code}`);
  mudekPlatOutIdByCode[o.code] = oId;
  out.push(`INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order) VALUES ('${oId}', '${MUDEK_FW_ID}', '${escapeSql(o.code)}', '${escapeSql(o.label)}', '${escapeSql(o.desc)}', ${o.sort}) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, description=EXCLUDED.description;`);
});

const mudekPlatCriteria = [
  { id:MUDEK_CT_ID, key:'technical', label:'Technical Content',    max:30, weight:30, color:'#F59E0B', sort:1,
    desc:'Evaluates the depth, correctness, and originality of the engineering work itself — independent of how well it is communicated. Assesses whether the team applied appropriate engineering knowledge, justified their design decisions, and demonstrated real technical mastery.',
    rubric:'[{"min":27,"max":30,"label":"Excellent","description":"Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident."},{"min":21,"max":26,"label":"Good","description":"Design is mostly clear and technically justified. Engineering decisions are largely supported."},{"min":13,"max":20,"label":"Developing","description":"Problem is stated but motivation or technical justification is insufficient."},{"min":0,"max":12,"label":"Insufficient","description":"Vague problem definition and unjustified decisions. Superficial technical content."}]' },
  { id:MUDEK_CD_ID, key:'design',    label:'Written Communication', max:30, weight:30, color:'#22C55E', sort:2,
    desc:'Evaluates how effectively the team communicates their project in written and visual form on the poster — including layout, information hierarchy, figure quality, and the clarity of technical content for a mixed audience.',
    rubric:'[{"min":27,"max":30,"label":"Excellent","description":"Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is accessible to both technical and non-technical readers."},{"min":21,"max":26,"label":"Good","description":"Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear."},{"min":13,"max":20,"label":"Developing","description":"Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated."},{"min":0,"max":12,"label":"Insufficient","description":"Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing."}]' },
  { id:MUDEK_CO_ID, key:'delivery',  label:'Oral Communication',    max:30, weight:30, color:'#3B82F6', sort:3,
    desc:"Evaluates the team's ability to present their work verbally and to respond to questions from jurors with varying technical backgrounds. A key factor is conscious audience adaptation.",
    rubric:'[{"min":27,"max":30,"label":"Excellent","description":"Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate."},{"min":21,"max":26,"label":"Good","description":"Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident."},{"min":13,"max":20,"label":"Developing","description":"Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement."},{"min":0,"max":12,"label":"Insufficient","description":"Unclear or disorganised presentation. Most questions answered incorrectly or not at all."}]' },
  { id:MUDEK_CW_ID, key:'teamwork',  label:'Teamwork',              max:10, weight:10, color:'#EF4444', sort:4,
    desc:"Evaluates visible evidence of equal and effective team participation during the poster session, as well as the group's professional and ethical conduct in interacting with jurors.",
    rubric:'[{"min":9,"max":10,"label":"Excellent","description":"All members participate actively and equally. Professional and ethical conduct observed throughout."},{"min":7,"max":8,"label":"Good","description":"Most members contribute. Minor knowledge gaps. Professionalism mostly observed."},{"min":4,"max":6,"label":"Developing","description":"Uneven participation. Some members are passive or unprepared."},{"min":0,"max":3,"label":"Insufficient","description":"Very low participation or dominated by one person. Lack of professionalism observed."}]' },
];

mudekPlatCriteria.forEach(c => {
  const rubricSql = c.rubric.replace(/'/g, "''");
  out.push(`INSERT INTO framework_criteria (id, framework_id, key, label, description, max_score, weight, color, rubric_bands, sort_order) VALUES ('${c.id}', '${MUDEK_FW_ID}', '${c.key}', '${escapeSql(c.label)}', '${escapeSql(c.desc)}', ${c.max}, ${c.weight}, '${c.color}', '${rubricSql}', ${c.sort}) ON CONFLICT (id) DO NOTHING;`);
});

// Criterion → outcome maps (weights mirror 008_platform.sql exactly)
const mudekPlatMaps = [
  { critId:MUDEK_CT_ID, critKey:'technical', outCode:'PO 1.2',  type:'direct',   w:0.34 },
  { critId:MUDEK_CT_ID, critKey:'technical', outCode:'PO 2',    type:'direct',   w:0.33 },
  { critId:MUDEK_CT_ID, critKey:'technical', outCode:'PO 3.1',  type:'direct',   w:0.17 },
  { critId:MUDEK_CT_ID, critKey:'technical', outCode:'PO 3.2',  type:'direct',   w:0.16 },
  { critId:MUDEK_CT_ID, critKey:'technical', outCode:'PO 1.1',  type:'indirect', w:null },
  { critId:MUDEK_CT_ID, critKey:'technical', outCode:'PO 4',    type:'indirect', w:null },
  { critId:MUDEK_CT_ID, critKey:'technical', outCode:'PO 5',    type:'indirect', w:null },
  { critId:MUDEK_CD_ID, critKey:'design',    outCode:'PO 9.2',  type:'direct',   w:1.00 },
  { critId:MUDEK_CD_ID, critKey:'design',    outCode:'PO 6.1',  type:'indirect', w:null },
  { critId:MUDEK_CD_ID, critKey:'design',    outCode:'PO 10.1', type:'indirect', w:null },
  { critId:MUDEK_CO_ID, critKey:'delivery',  outCode:'PO 9.1',  type:'direct',   w:1.00 },
  { critId:MUDEK_CO_ID, critKey:'delivery',  outCode:'PO 6.2',  type:'indirect', w:null },
  { critId:MUDEK_CO_ID, critKey:'delivery',  outCode:'PO 10.2', type:'indirect', w:null },
  { critId:MUDEK_CW_ID, critKey:'teamwork',  outCode:'PO 8.1',  type:'direct',   w:0.50 },
  { critId:MUDEK_CW_ID, critKey:'teamwork',  outCode:'PO 8.2',  type:'direct',   w:0.50 },
  { critId:MUDEK_CW_ID, critKey:'teamwork',  outCode:'PO 7.1',  type:'indirect', w:null },
  { critId:MUDEK_CW_ID, critKey:'teamwork',  outCode:'PO 7.2',  type:'indirect', w:null },
  { critId:MUDEK_CW_ID, critKey:'teamwork',  outCode:'PO 11',   type:'indirect', w:null },
];

mudekPlatMaps.forEach(m => {
  const mapId = uuid(`platform-mudek-map-${m.critKey}-${m.outCode}`);
  const foId  = mudekPlatOutIdByCode[m.outCode];
  const wSql  = m.w != null ? m.w : 'NULL';
  out.push(`INSERT INTO framework_criterion_outcome_maps (id, framework_id, period_id, criterion_id, outcome_id, coverage_type, weight) VALUES ('${mapId}', '${MUDEK_FW_ID}', NULL, '${m.critId}', '${foId}', '${m.type}', ${wSql}) ON CONFLICT (criterion_id, outcome_id) DO NOTHING;`);
});

// ── ABET (2026 – 2027) ───────────────────────────────────────────────────────
out.push(`INSERT INTO frameworks (id, organization_id, name, description) VALUES ('${ABET_FW_ID}', NULL, 'ABET (2026 – 2027)', 'ABET EAC Student Outcomes — SO 1 through SO 7 (2026-2027 Criteria)') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;`);

const abetOutcomes = [
  { code:'SO 1', label:'Complex Problem Solving',              desc:'Ability to identify, formulate, and solve complex engineering problems by applying principles of engineering, science, and mathematics.',                                                                                                                       sort:1 },
  { code:'SO 2', label:'Engineering Design',                   desc:'Ability to apply engineering design to produce solutions that meet specified needs with consideration of public health, safety, and welfare, as well as global, cultural, social, environmental, and economic factors.',                                        sort:2 },
  { code:'SO 3', label:'Effective Communication',              desc:'Ability to communicate effectively with a range of audiences.',                                                                                                                                                                                               sort:3 },
  { code:'SO 4', label:'Ethics & Professional Responsibility', desc:'Ability to recognize ethical and professional responsibilities in engineering situations and make informed judgments, which must consider the impact of engineering solutions in global, economic, environmental, and societal contexts.',                      sort:4 },
  { code:'SO 5', label:'Teamwork & Leadership',                desc:'Ability to function effectively on a team whose members together provide leadership, create a collaborative environment, establish goals, plan tasks, and meet objectives.',                                                                                   sort:5 },
  { code:'SO 6', label:'Experimentation & Analysis',           desc:'Ability to develop and conduct appropriate experimentation, analyze and interpret data, and use engineering judgment to draw conclusions.',                                                                                                                    sort:6 },
  { code:'SO 7', label:'Lifelong Learning',                    desc:'Ability to acquire and apply new knowledge as needed, using appropriate learning strategies.',                                                                                                                                                                sort:7 },
];

abetOutcomes.forEach(o => {
  const oId = uuid(`platform-abet-outcome-${o.code}`);
  out.push(`INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order) VALUES ('${oId}', '${ABET_FW_ID}', '${escapeSql(o.code)}', '${escapeSql(o.label)}', '${escapeSql(o.desc)}', ${o.sort}) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, description=EXCLUDED.description;`);
});

out.push('');

// ── VERA Standard ────────────────────────────────────────────────────────────
out.push(`INSERT INTO frameworks (id, organization_id, name, description) VALUES ('${VERA_FW_ID}', NULL, 'VERA Standard', 'Generic capstone evaluation framework — 6 learning outcomes covering knowledge, design, communication, teamwork, and professional conduct') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;`);

const veraOutcomes = [
  { code:'LO 1', label:'Domain Knowledge',              desc:'Ability to apply discipline-specific knowledge and methods to identify and solve complex real-world problems',                                                         sort:1 },
  { code:'LO 2', label:'Design & Problem Solving',      desc:'Ability to design and implement creative, feasible solutions that address well-defined requirements and constraints',                                                  sort:2 },
  { code:'LO 3', label:'Written Communication',          desc:'Ability to communicate technical content clearly and effectively in written and visual form for audiences with varying levels of expertise',                           sort:3 },
  { code:'LO 4', label:'Oral Communication',             desc:'Ability to present technical work verbally, adapt to the audience, and respond to expert questioning with accuracy and clarity',                                      sort:4 },
  { code:'LO 5', label:'Teamwork & Collaboration',       desc:'Ability to contribute effectively as a member or leader of a project team, demonstrating equal participation and shared responsibility',                             sort:5 },
  { code:'LO 6', label:'Professional & Ethical Conduct', desc:'Awareness of professional responsibilities, ethical obligations, and the broader societal and environmental impact of technical work',                                sort:6 },
];

veraOutcomes.forEach(o => {
  const oId = uuid(`platform-vera-outcome-${o.code}`);
  out.push(`INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order) VALUES ('${oId}', '${VERA_FW_ID}', '${escapeSql(o.code)}', '${escapeSql(o.label)}', '${escapeSql(o.desc)}', ${o.sort}) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, description=EXCLUDED.description;`);
});

const veraCriteria = [
  { id:VERA_CT_ID, key:'technical', label:'Technical Content',    max:30, weight:30, color:'#F59E0B', sort:1,
    desc:'Evaluates the depth, correctness, and originality of the project work — whether the team applied appropriate knowledge, justified their decisions, and demonstrated real mastery of the subject.',
    rubric:[{min:27,max:30,label:'Excellent',description:'Problem is clearly defined with strong motivation. Decisions are well-justified with technical depth. Originality and mastery of relevant methods are evident.'},{min:21,max:26,label:'Good',description:'Work is mostly clear and technically justified. Decisions are largely supported.'},{min:13,max:20,label:'Developing',description:'Problem is stated but motivation or technical justification is insufficient.'},{min:0,max:12,label:'Insufficient',description:'Vague problem definition and unjustified decisions. Superficial technical content.'}] },
  { id:VERA_CD_ID, key:'design',    label:'Written Communication', max:30, weight:30, color:'#22C55E', sort:2,
    desc:'Evaluates how effectively the team communicates their project in written and visual form — including layout, information hierarchy, figure quality, and clarity for a mixed audience.',
    rubric:[{min:27,max:30,label:'Excellent',description:'Layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Content is accessible to both technical and non-technical readers.'},{min:21,max:26,label:'Good',description:'Layout is mostly logical. Visuals are readable with minor gaps. Content is largely clear.'},{min:13,max:20,label:'Developing',description:'Occasional gaps in information flow. Some visuals are missing labels. Content is only partially communicated.'},{min:0,max:12,label:'Insufficient',description:'Confusing layout. Low-quality or unlabelled visuals. Content is unclear or missing.'}] },
  { id:VERA_CO_ID, key:'delivery',  label:'Oral Communication',    max:30, weight:30, color:'#3B82F6', sort:3,
    desc:"Evaluates the team's ability to present their work verbally and respond to questions from evaluators with varying backgrounds. Audience adaptation is a key factor.",
    rubric:[{min:27,max:30,label:'Excellent',description:'Presentation is consciously adapted for both technical and non-technical evaluators. Q&A responses are accurate, clear, and audience-appropriate.'},{min:21,max:26,label:'Good',description:'Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident.'},{min:13,max:20,label:'Developing',description:'Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement.'},{min:0,max:12,label:'Insufficient',description:'Unclear or disorganised presentation. Most questions answered incorrectly or not at all.'}] },
  { id:VERA_CW_ID, key:'teamwork',  label:'Teamwork',               max:10, weight:10, color:'#EF4444', sort:4,
    desc:"Evaluates visible evidence of equal and effective team participation during the evaluation session, as well as the group's professional and ethical conduct.",
    rubric:[{min:9,max:10,label:'Excellent',description:'All members participate actively and equally. Professional and ethical conduct observed throughout.'},{min:7,max:8,label:'Good',description:'Most members contribute. Minor knowledge gaps. Professionalism mostly observed.'},{min:4,max:6,label:'Developing',description:'Uneven participation. Some members are passive or unprepared.'},{min:0,max:3,label:'Insufficient',description:'Very low participation or dominated by one person. Lack of professionalism observed.'}] },
];

veraCriteria.forEach(c => {
  const rubricSql = escapeSql(JSON.stringify(c.rubric));
  out.push(`INSERT INTO framework_criteria (id, framework_id, key, label, description, max_score, weight, color, rubric_bands, sort_order) VALUES ('${c.id}', '${VERA_FW_ID}', '${c.key}', '${escapeSql(c.label)}', '${escapeSql(c.desc)}', ${c.max}, ${c.weight}, '${c.color}', '${rubricSql}', ${c.sort}) ON CONFLICT (id) DO NOTHING;`);
});

const veraMaps = [
  { critId:VERA_CT_ID, outCode:'LO 1', type:'direct',   w:0.50 },
  { critId:VERA_CT_ID, outCode:'LO 2', type:'direct',   w:0.50 },
  { critId:VERA_CT_ID, outCode:'LO 6', type:'indirect', w:null },
  { critId:VERA_CD_ID, outCode:'LO 3', type:'direct',   w:1.00 },
  { critId:VERA_CD_ID, outCode:'LO 2', type:'indirect', w:null },
  { critId:VERA_CO_ID, outCode:'LO 4', type:'direct',   w:1.00 },
  { critId:VERA_CO_ID, outCode:'LO 3', type:'indirect', w:null },
  { critId:VERA_CW_ID, outCode:'LO 5', type:'direct',   w:0.60 },
  { critId:VERA_CW_ID, outCode:'LO 6', type:'direct',   w:0.40 },
];

veraMaps.forEach(m => {
  const mapId = uuid(`platform-vera-map-${m.critId}-${m.outCode}`);
  const foId  = uuid(`platform-vera-outcome-${m.outCode}`);
  const wSql  = m.w === null ? 'NULL' : m.w;
  out.push(`INSERT INTO framework_criterion_outcome_maps (id, framework_id, period_id, criterion_id, outcome_id, coverage_type, weight) VALUES ('${mapId}', '${VERA_FW_ID}', NULL, '${m.critId}', '${foId}', '${m.type}', ${wSql}) ON CONFLICT (criterion_id, outcome_id) DO NOTHING;`);
});

out.push('');

// ═══════════════════════════════════════════════════════════════
// FRAMEWORKS — criteria & outcomes with descriptions
// ═══════════════════════════════════════════════════════════════

function parseRubric(maxScore) {
  let rubric = [];
  if (maxScore >= 25) {
    let b1 = Math.floor(maxScore * 0.88), b2 = Math.floor(maxScore * 0.68), b3 = Math.floor(maxScore * 0.48);
    rubric.push({min: b1, max: maxScore, label: 'Excellent', description: 'Outstanding performance'});
    rubric.push({min: b2, max: b1-1, label: 'Good', description: 'Above average, minor gaps'});
    rubric.push({min: b3, max: b2-1, label: 'Developing', description: 'Meets minimum, needs improvement'});
    rubric.push({min: 0, max: b3-1, label: 'Insufficient', description: 'Below acceptable standard'});
  } else if (maxScore >= 20) {
    rubric = [{min:18,max:20,label:'Excellent',description:'Outstanding performance'},{min:14,max:17,label:'Good',description:'Above average, minor gaps'},{min:10,max:13,label:'Developing',description:'Meets minimum'},{min:0,max:9,label:'Insufficient',description:'Below standard'}];
  } else {
    rubric = [{min:9,max:10,label:'Excellent',description:'Outstanding'},{min:7,max:8,label:'Good',description:'Above average'},{min:5,max:6,label:'Developing',description:'Meets minimum'},{min:0,max:4,label:'Insufficient',description:'Below standard'}];
  }
  return JSON.stringify(rubric).replace(/'/g, "''");
}

function simplifiedRubric(maxScore) {
  const b1 = Math.floor(maxScore * 0.75), b2 = Math.floor(maxScore * 0.45);
  return JSON.stringify([
    {min: b1, max: maxScore, label: 'Proficient', description: 'Meets or exceeds expectations'},
    {min: b2, max: b1-1, label: 'Developing', description: 'Partially meets expectations'},
    {min: 0, max: b2-1, label: 'Below Standard', description: 'Does not meet minimum requirements'}
  ]).replace(/'/g, "''");
}

// outcomes format: [[code, label, description], ...]
// NOTE: This function only collects *template* data on `o`. Per-period
// framework rows (one per period) are materialised in the period loop,
// so that renaming one period's framework doesn't affect siblings.
function processOrgfw(orgCode, fwName, criteria, outcomes, mappings) {
  const o = orgs.find(x => x.code === orgCode);
  o.frameworkName = fwName;
  const fwDescMap = {
    'MÜDEK v3.1':                  'MÜDEK accreditation framework aligned with EUR-ACE standards. Evaluates engineering program outcomes across technical competency, design, communication, and teamwork dimensions.',
    'ABET (2026 – 2027)':          'ABET Computing Accreditation Commission framework. Assesses student outcomes in computing knowledge, problem analysis, solution design, communication, and professional ethics.',
    'Competition Framework':       'TEKNOFEST ulusal teknoloji yarışması değerlendirme çerçevesi. Havacılık ve robotik kategorilerinde teknolojik yenilik, proje fizibilitesi, prototip kalitesi ve takım sunumu esas alınarak değerlendirilir.',
    'Research Competition Framework': 'TÜBİTAK 2204-A ulusal lise öğrencileri araştırma projeleri yarışması değerlendirme çerçevesi. Bilimsel yöntem, araştırma derinliği, özgünlük ve sözlü savunma kalitesi ölçütlerine göre puanlanır.',
    'Design Contest Framework':    'IEEE AP-S Student Design Contest framework. Evaluates antenna design performance, technical documentation quality, oral presentation, and adherence to contest specifications.',
    'Mission Framework':           'CanSat Competition mission evaluation framework. Assesses satellite container design, mission objective completion, telemetry data quality, and post-flight analysis report.',
  };
  o.frameworkDesc = fwDescMap[fwName] || '';
  o.outcomesData = [];
  let outOrder = 1;
  for (const arr of outcomes) {
    const [code, lbl, desc] = arr;
    o.outcomesData.push({ code, label: lbl, desc: desc || null, sortOrder: outOrder++ });
  }
  o.criteriaData = [];
  let critOrder = 1;
  for (const c of criteria) {
    o.criteriaData.push({ ...c, sortOrder: critOrder++ });
  }
  // Template mappings — keyed by critKey/outCode strings, resolved to
  // per-period UUIDs inside the period loop.
  o.mapsData = [];
  for (const m of mappings) {
    for (const mo of m.outs) {
      o.mapsData.push({
        critKey: m.crit,
        outCode: mo.code,
        weight: mo.weight,
        coverType: mo.type || 'direct',
      });
    }
  }
}

// ── TEDU-EE: MÜDEK v3.1 (criteria preserved exactly for Spring 2026 snapshot) ──
processOrgfw('TEDU-EE', 'MÜDEK v3.1',
  [
    { key:'technical', label:'Technical Content', max:30, weight:30, color:'#F59E0B',
      desc:'Evaluates the depth, correctness, and originality of the engineering work itself — independent of how well it is communicated. It assesses whether the team has applied appropriate engineering knowledge, justified their design decisions, and demonstrated real technical mastery.',
      customRubric: [
        { min: 27, max: 30, label: 'Excellent', description: 'Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident.' },
        { min: 21, max: 26, label: 'Good', description: 'Design is mostly clear and technically justified. Engineering decisions are largely supported.' },
        { min: 13, max: 20, label: 'Developing', description: 'Problem is stated but motivation or technical justification is insufficient.' },
        { min: 0, max: 12, label: 'Insufficient', description: 'Vague problem definition and unjustified decisions. Superficial technical content.' },
      ] },
    { key:'design', label:'Written Comms.', max:30, weight:30, color:'#22C55E',
      desc:'Evaluates how effectively the team communicates their project in written and visual form on the poster — including layout, information hierarchy, figure quality, and the clarity of technical content for a mixed audience (engineers and non-engineers alike).',
      customRubric: [
        { min: 27, max: 30, label: 'Excellent', description: 'Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way accessible to both technical and non-technical readers.' },
        { min: 21, max: 26, label: 'Good', description: 'Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement.' },
        { min: 13, max: 20, label: 'Developing', description: 'Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated.' },
        { min: 0, max: 12, label: 'Insufficient', description: 'Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing.' },
      ] },
    { key:'delivery', label:'Oral Communication', max:30, weight:30, color:'#3B82F6',
      desc:'Evaluates the team\'s ability to present their work verbally and to respond to questions from jurors with varying technical backgrounds. A key factor is conscious audience adaptation — adjusting depth and vocabulary based on who is asking.',
      customRubric: [
        { min: 27, max: 30, label: 'Excellent', description: 'Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate.' },
        { min: 21, max: 26, label: 'Good', description: 'Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident.' },
        { min: 13, max: 20, label: 'Developing', description: 'Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement.' },
        { min: 0, max: 12, label: 'Insufficient', description: 'Unclear or disorganised presentation. Most questions answered incorrectly or not at all.' },
      ] },
    { key:'teamwork', label:'Teamwork', max:10, weight:10, color:'#EF4444',
      desc:'Evaluates visible evidence of equal and effective team participation during the poster session, as well as the group\'s professional and ethical conduct in interacting with jurors.',
      customRubric: [
        { min: 9, max: 10, label: 'Excellent', description: 'All members participate actively and equally. Professional and ethical conduct observed throughout.' },
        { min: 7, max: 8, label: 'Good', description: 'Most members contribute. Minor knowledge gaps. Professionalism mostly observed.' },
        { min: 4, max: 6, label: 'Developing', description: 'Uneven participation. Some members are passive or unprepared.' },
        { min: 0, max: 3, label: 'Insufficient', description: 'Very low participation or dominated by one person. Lack of professionalism observed.' },
      ] }
  ],
  [
    ['PO 1.1',  'Basic Knowledge',                    'Knowledge in mathematics, natural sciences, basic engineering, computational methods, and discipline-specific topics'],
    ['PO 1.2',  'Applied Knowledge',                  'Ability to apply knowledge in mathematics, natural sciences, basic engineering, computational methods, and discipline-specific topics to solve complex engineering problems'],
    ['PO 2',    'Problem Analysis',                   'Ability to identify, formulate, and analyze complex engineering problems using basic science, mathematics, and engineering knowledge while considering relevant UN Sustainable Development Goals'],
    ['PO 3.1',  'Creative Design',                    'Ability to design creative solutions to complex engineering problems'],
    ['PO 3.2',  'Complex Systems',                    'Ability to design complex systems, processes, devices, or products that meet current and future requirements while considering realistic constraints and conditions'],
    ['PO 4',    'Modern Tools',                       'Ability to select and use appropriate techniques, resources, and modern engineering and IT tools, including estimation and modeling, for analysis and solution of complex engineering problems, with awareness of their limitations'],
    ['PO 5',    'Research Methods',                   'Ability to use research methods including literature review, experiment design, data collection, result analysis, and interpretation for investigation of complex engineering problems'],
    ['PO 6.1',  'Societal Impact',                    'Knowledge of the impacts of engineering applications on society, health and safety, economy, sustainability, and environment within the scope of UN Sustainable Development Goals'],
    ['PO 6.2',  'Legal Awareness',                    'Awareness of the legal consequences of engineering solutions'],
    ['PO 7.1',  'Professional Ethics',                'Knowledge of acting in accordance with engineering professional principles and ethical responsibility'],
    ['PO 7.2',  'Impartiality',                       'Awareness of acting without discrimination and being inclusive of diversity'],
    ['PO 8.1',  'Intra-disciplinary',                 'Ability to work effectively as a team member or leader in intra-disciplinary teams (face-to-face, remote, or hybrid)'],
    ['PO 8.2',  'Multidisciplinary',                  'Ability to work effectively as a team member or leader in multidisciplinary teams (face-to-face, remote, or hybrid)'],
    ['PO 9.1',  'Oral Communication',                 'Ability to communicate effectively orally on technical subjects, taking into account the diverse characteristics of the target audience (education, language, profession, etc.)'],
    ['PO 9.2',  'Written Comms.',                     'Ability to communicate effectively in writing on technical subjects, taking into account the diverse characteristics of the target audience (education, language, profession, etc.)'],
    ['PO 10.1', 'Project Management',                 'Knowledge of business practices such as project management and economic feasibility analysis'],
    ['PO 10.2', 'Entrepreneurship',                   'Awareness of entrepreneurship and innovation'],
    ['PO 11',   'Lifelong Learning',                  'Ability to learn independently and continuously, adapt to new and emerging technologies, and think critically about technological changes']
  ],
  [
    {crit:'technical', outs:[
      {code:'PO 1.2',weight:0.34,type:'direct'},
      {code:'PO 2',weight:0.33,type:'direct'},
      {code:'PO 3.1',weight:0.17,type:'direct'},
      {code:'PO 3.2',weight:0.16,type:'direct'},
      {code:'PO 1.1',type:'indirect'},
      {code:'PO 4',type:'indirect'},
      {code:'PO 5',type:'indirect'}
    ]},
    {crit:'design', outs:[
      {code:'PO 9.2',weight:1.0,type:'direct'},
      {code:'PO 6.1',type:'indirect'},
      {code:'PO 10.1',type:'indirect'}
    ]},
    {crit:'delivery', outs:[
      {code:'PO 9.1',weight:1.0,type:'direct'},
      {code:'PO 6.2',type:'indirect'},
      {code:'PO 10.2',type:'indirect'}
    ]},
    {crit:'teamwork', outs:[
      {code:'PO 8.1',weight:0.5,type:'direct'},
      {code:'PO 8.2',weight:0.5,type:'direct'},
      {code:'PO 7.1',type:'indirect'},
      {code:'PO 7.2',type:'indirect'},
      {code:'PO 11',type:'indirect'}
    ]}
  ]
);

processOrgfw('CMU-CS', 'ABET (2026 – 2027)',
  [
    {key:'problem_solving',label:'Problem Solving',max:25,weight:25,color:'#EF4444',desc:'Evaluates precision of problem formulation, scope definition, constraint identification, and correctness of the analytical approach.',customRubric:[{min:22,max:25,label:'Excellent',description:'Problem is precisely formulated with clear scope, constraints, and success metrics.'},{min:17,max:21,label:'Good',description:'Problem is well-defined. Minor gaps in constraint handling.'},{min:12,max:16,label:'Developing',description:'Problem statement exists but lacks precision.'},{min:0,max:11,label:'Insufficient',description:'Problem is vaguely defined with significant logical gaps.'}]},
    {key:'system_design',label:'System Design',max:25,weight:25,color:'#3B82F6',desc:'Assesses architectural soundness, modularity, scalability, and justification of design decisions and component boundaries.',customRubric:[{min:22,max:25,label:'Excellent',description:'Architecture is modular, scalable, and well-justified.'},{min:17,max:21,label:'Good',description:'Architecture is sound with clear component boundaries.'},{min:12,max:16,label:'Developing',description:'Basic architecture present but modularity concerns not addressed.'},{min:0,max:11,label:'Insufficient',description:'No clear architecture.'}]},
    {key:'implementation_quality',label:'Implementation',max:20,weight:20,color:'#F59E0B',desc:'Evaluates code quality, test coverage, documentation, and adherence to professional software engineering practices.',customRubric:[{min:18,max:20,label:'Excellent',description:'Code is clean, well-tested, and follows best practices.'},{min:14,max:17,label:'Good',description:'Code is readable with adequate test coverage.'},{min:10,max:13,label:'Developing',description:'Code works but lacks tests or consistent style.'},{min:0,max:9,label:'Insufficient',description:'Code is disorganized, untested, or non-functional.'}]},
    {key:'communication',label:'Documentation',max:20,weight:20,color:'#EC4899',desc:'Assesses completeness and clarity of written technical documentation including API references, design docs, and reports.',customRubric:[{min:18,max:20,label:'Excellent',description:'Documentation is thorough and developer-friendly.'},{min:14,max:17,label:'Good',description:'Documentation covers key areas.'},{min:10,max:13,label:'Developing',description:'Documentation exists but is incomplete.'},{min:0,max:9,label:'Insufficient',description:'Little to no documentation.'}]},
    {key:'teamwork',label:'Teamwork',max:10,weight:10,color:'#10B981',desc:'Evaluates balanced contribution, collaborative workflow, and effective use of team coordination tools and practices.',customRubric:[{min:9,max:10,label:'Excellent',description:'All members contribute meaningfully.'},{min:7,max:8,label:'Good',description:'Most members contribute.'},{min:4,max:6,label:'Developing',description:'Uneven contributions.'},{min:0,max:3,label:'Insufficient',description:'One or two members did most of the work.'}]}
  ],
  [
    ['SO-1', 'Problem Solving',        'Ability to identify, formulate, and solve complex engineering problems by applying principles of engineering, science, and mathematics.'],
    ['SO-2', 'Engineering Design',     'Ability to apply engineering design to produce solutions that meet specified needs with consideration of public health, safety, and welfare, as well as global, cultural, social, environmental, and economic factors.'],
    ['SO-3', 'Effective Comms.',       'Ability to communicate effectively with a range of audiences.'],
    ['SO-4', 'Ethics & Prof. Resp.',    'Ability to recognize ethical and professional responsibilities in engineering situations and make informed judgments, which must consider the impact of engineering solutions in global, economic, environmental, and societal contexts.'],
    ['SO-5', 'Teamwork & Lead.',       'Ability to function effectively on a team whose members together provide leadership, create a collaborative environment, establish goals, plan tasks, and meet objectives.'],
    ['SO-6', 'Experimentation',        'Ability to develop and conduct appropriate experimentation, analyze and interpret data, and use engineering judgment to draw conclusions.'],
    ['SO-7', 'Lifelong Learning',      'Ability to acquire and apply new knowledge as needed, using appropriate learning strategies.'],
  ],
  [
    {crit:'problem_solving',       outs:[{code:'SO-1',weight:0.6,type:'direct'},{code:'SO-6',weight:0.4,type:'indirect'}]},
    {crit:'system_design',         outs:[{code:'SO-2',weight:0.7,type:'direct'},{code:'SO-1',weight:0.3,type:'indirect'}]},
    {crit:'implementation_quality',outs:[{code:'SO-6',weight:0.5,type:'direct'},{code:'SO-2',weight:0.3,type:'indirect'},{code:'SO-7',weight:0.2,type:'indirect'}]},
    {crit:'communication',         outs:[{code:'SO-3',weight:0.7,type:'direct'},{code:'SO-4',weight:0.3,type:'indirect'}]},
    {crit:'teamwork',              outs:[{code:'SO-5',weight:1.0,type:'direct'}]}
  ]
);

processOrgfw('TEKNOFEST', 'Competition Framework',
  [
    {key:'preliminary_report',label:'Design Report (ODR)',max:25,weight:25,color:'#6366F1',desc:'Evaluates completeness of the preliminary design report, mission definition clarity, and feasibility of the proposed design.',customRubric:[{min:22,max:25,label:'Excellent',description:'Report is comprehensive with clear mission definition and feasible preliminary design.'},{min:17,max:21,label:'Good',description:'Report covers key design elements with adequate justification.'},{min:12,max:16,label:'Developing',description:'Report structure is present but design rationale is weak.'},{min:0,max:11,label:'Insufficient',description:'Report is incomplete or missing critical sections.'}]},
    {key:'critical_design',label:'Design Review (KTR)',max:30,weight:30,color:'#F59E0B',desc:'Assesses design maturity, subsystem integration completeness, and manufacturing readiness at the CDR milestone.',customRubric:[{min:27,max:30,label:'Excellent',description:'Design is mature, manufacturable, and all subsystems well-integrated.'},{min:21,max:26,label:'Good',description:'Design is mostly complete with minor integration gaps.'},{min:13,max:20,label:'Developing',description:'Design shows progress but subsystem integration unclear.'},{min:0,max:12,label:'Insufficient',description:'Design is immature or not viable for manufacturing.'}]},
    {key:'technical_performance',label:'Performance & Demo',max:30,weight:30,color:'#EF4444',desc:'Evaluates actual field performance of the system during the competition mission demonstration under real conditions.',customRubric:[{min:27,max:30,label:'Excellent',description:'System performs flawlessly in field conditions.'},{min:21,max:26,label:'Good',description:'System completes primary mission with minor deviations.'},{min:13,max:20,label:'Developing',description:'System partially completes mission.'},{min:0,max:12,label:'Insufficient',description:'System fails to complete primary mission.'}]},
    {key:'team_execution',label:'Team Presentation',max:15,weight:15,color:'#10B981',desc:'Assesses team coordination, role clarity, and the effectiveness of the presentation delivered during the jury evaluation.',customRubric:[{min:14,max:15,label:'Excellent',description:'Team operates cohesively with clear role distribution.'},{min:11,max:13,label:'Good',description:'Team coordination is evident.'},{min:7,max:10,label:'Developing',description:'Team roles are unclear.'},{min:0,max:6,label:'Insufficient',description:'Poor team coordination.'}]}
  ],
  [
    ['TC-1', 'Autonomy & Control',         'Aircraft performs autonomous take-off, flight, landing, and target lock-on; manual mode switching results in point deductions per competition rules.'],
    ['TC-2', 'Mission Performance',        'Successful completion of assigned mission objectives scored on accuracy, autonomous target engagement, and overall flight precision under field conditions.'],
    ['TC-3', 'Tech Report Quality',   'Preliminary Design Report (PDR) and Critical Design Report (CDR) assessed for completeness, technical rigor, Turkish grammar compliance, and documentation standards.'],
    ['TC-4', 'Pres. & Comms',        'Live team presentation evaluated on clarity, depth of technical explanation, and quality of responses to jury and advisory board questions.'],
    ['TC-5', 'Innovation & Orig.',   'Novelty in design, control algorithms, and hardware/software solutions; domestic component use and custom system development are recognized in scoring.'],
  ],
  [
    {crit:'preliminary_report',    outs:[{code:'TC-3',weight:0.7,type:'direct'},{code:'TC-5',weight:0.3,type:'indirect'}]},
    {crit:'critical_design',       outs:[{code:'TC-3',weight:0.5,type:'direct'},{code:'TC-5',weight:0.2,type:'direct'},{code:'TC-1',weight:0.3,type:'indirect'}]},
    {crit:'technical_performance', outs:[{code:'TC-2',weight:0.6,type:'direct'},{code:'TC-1',weight:0.4,type:'direct'}]},
    {crit:'team_execution',        outs:[{code:'TC-4',weight:0.7,type:'direct'},{code:'TC-2',weight:0.3,type:'indirect'}]}
  ]
);

processOrgfw('TUBITAK-2204A', 'Research Competition Framework',
  [
    {key:'originality',label:'Originality',max:35,weight:35,color:'#8B5CF6',desc:'Evaluates novelty of the research question, uniqueness of the approach, and significance of the contribution to scientific knowledge.',customRubric:[{min:31,max:35,label:'Excellent',description:'Research question is novel and addresses a genuine gap.'},{min:24,max:30,label:'Good',description:'Research topic has originality with a clear contribution.'},{min:17,max:23,label:'Developing',description:'Topic is relevant but well-trodden.'},{min:0,max:16,label:'Insufficient',description:'No original contribution.'}]},
    {key:'scientific_method',label:'Scientific Method',max:40,weight:40,color:'#3B82F6',desc:'Assesses rigor of experimental design, hypothesis clarity, control conditions, reproducibility, and statistical validity of results.',customRubric:[{min:35,max:40,label:'Excellent',description:'Hypothesis is clearly stated and testable. Proper controls and adequate sample size.'},{min:27,max:34,label:'Good',description:'Methodology is sound with minor gaps.'},{min:19,max:26,label:'Developing',description:'Basic methodology present but controls weak.'},{min:0,max:18,label:'Insufficient',description:'No clear hypothesis or experimental design.'}]},
    {key:'impact_and_presentation',label:'Impact & Pres.',max:25,weight:25,color:'#F59E0B',desc:'Evaluates real-world applicability of research findings and the overall quality of the oral and poster presentation.',customRubric:[{min:22,max:25,label:'Excellent',description:'Results have clear real-world applicability.'},{min:17,max:21,label:'Good',description:'Potential impact is described.'},{min:12,max:16,label:'Developing',description:'Impact is mentioned but not convincingly argued.'},{min:0,max:11,label:'Insufficient',description:'No discussion of impact.'}]}
  ],
  [
    ['RC-1', 'Orig. & Creativity',    'Research question addresses a genuine, unstudied gap in scientific literature; approach is independent of textbook procedures and demonstrates student-initiated inquiry rather than replication.'],
    ['RC-2', 'Scientific Method',     'Hypothesis is precisely formulated and testable; experimental design includes appropriate control and variable isolation; sample size is statistically sufficient; results are reproducible and reported with uncertainty bounds.'],
    ['RC-3', 'Literature Review',     'Background research is comprehensive, citations are current and from peer-reviewed sources, and prior work is critically synthesised to motivate the research question rather than summarised superficially.'],
    ['RC-4', 'App. & Impact',         'Findings address a real-world problem with a credible pathway to practical implementation; potential societal, environmental, or economic benefit is quantified or clearly argued.'],
    ['RC-5', 'Ethics & Safety',       'All applicable research ethics protocols are observed (informed consent, animal welfare, chemical/biological hazard procedures); ethical approval documentation is present where required by TÜBİTAK guidelines.'],
    ['RC-6', 'Comp. & Synthesis',     'Presenter demonstrates mastery of underlying scientific principles, accurately interprets own data, and provides satisfactory, technically sound answers to jury questions without coaching.'],
    ['RC-7', 'Scope Clarity',         'Research boundaries are clearly delineated; objectives are specific, measurable, and achievable within the declared timeframe; limitations are acknowledged and their effect on conclusions is discussed.'],
  ],
  [
    {crit:'originality',             outs:[{code:'RC-1',weight:0.6,type:'direct'},{code:'RC-7',weight:0.4,type:'indirect'}]},
    {crit:'scientific_method',       outs:[{code:'RC-2',weight:0.5,type:'direct'},{code:'RC-3',weight:0.3,type:'direct'},{code:'RC-5',weight:0.2,type:'direct'}]},
    {crit:'impact_and_presentation', outs:[{code:'RC-4',weight:0.4,type:'direct'},{code:'RC-6',weight:0.4,type:'direct'},{code:'RC-3',weight:0.2,type:'indirect'}]}
  ]
);

processOrgfw('IEEE-APSSDC', 'Design Contest Framework',
  [
    {key:'creativity',label:'Creativity',max:30,weight:30,color:'#EC4899',desc:'Evaluates novelty of the antenna design concept relative to existing literature and current state-of-the-art solutions.',customRubric:[{min:27,max:30,label:'Excellent',description:'Novel topology or technique not commonly seen in literature.'},{min:21,max:26,label:'Good',description:'Design shows originality in at least one dimension.'},{min:13,max:20,label:'Developing',description:'Conventional approaches with minor modifications.'},{min:0,max:12,label:'Insufficient',description:'Direct copy with no meaningful contribution.'}]},
    {key:'technical_merit',label:'Technical Merit',max:40,weight:40,color:'#3B82F6',desc:'Assesses closeness of agreement between simulation and measurement results, and overall RF performance quality.',customRubric:[{min:35,max:40,label:'Excellent',description:'Simulation and measurement results agree closely.'},{min:27,max:34,label:'Good',description:'Solid results with acceptable agreement.'},{min:19,max:26,label:'Developing',description:'Simulation results presented but measurement validation limited.'},{min:0,max:18,label:'Insufficient',description:'No measurement results or significant discrepancy.'}]},
    {key:'application_and_presentation',label:'App. & Presentation',max:30,weight:30,color:'#F59E0B',desc:'Evaluates clarity of the proposed real-world application use case and the quality of the overall design presentation.',customRubric:[{min:27,max:30,label:'Excellent',description:'Clear real-world application with compelling use case.'},{min:21,max:26,label:'Good',description:'Application context established.'},{min:13,max:20,label:'Developing',description:'Application mentioned but not developed.'},{min:0,max:12,label:'Insufficient',description:'No clear application.'}]}
  ],
  [
    ['DC-1', 'Creativity & Innov.',            'Design introduces a novel antenna topology, feeding mechanism, or material application not commonly documented in current literature; innovation is substantiated by comparative analysis against state-of-the-art solutions.'],
    ['DC-2', 'Technical Merit',               'Simulated and measured antenna parameters (gain, bandwidth, radiation pattern, impedance matching) are in close agreement; RF performance meets or exceeds the specified design requirements for the target application.'],
    ['DC-3', 'Fab. & Validation',              'Prototype is cleanly fabricated with dimensional accuracy; measured S-parameters and radiation characteristics are obtained via calibrated vector network analyser and anechoic chamber or comparable measurement setup.'],
    ['DC-4', 'Practical App.',                'A specific real-world use case (e.g., 5G mmWave, vehicular radar, biomedical implant, IoT sensor) is clearly defined; design trade-offs are directly linked to application constraints such as size, frequency band, or power level.'],
    ['DC-5', 'Oral Pres. & Q&A',              'Team presents the complete design process — requirements, synthesis, simulation, fabrication, and measurement — in a structured and fluent manner; technical questions from the judging panel are answered accurately and confidently.'],
  ],
  [
    {crit:'creativity',                outs:[{code:'DC-1',weight:0.7,type:'direct'},{code:'DC-4',weight:0.3,type:'indirect'}]},
    {crit:'technical_merit',           outs:[{code:'DC-2',weight:0.6,type:'direct'},{code:'DC-3',weight:0.4,type:'direct'}]},
    {crit:'application_and_presentation',outs:[{code:'DC-4',weight:0.4,type:'direct'},{code:'DC-5',weight:0.4,type:'direct'},{code:'DC-1',weight:0.2,type:'indirect'}]}
  ]
);

processOrgfw('CANSAT', 'Mission Framework',
  [
    {key:'design_compliance',label:'Design Compliance',max:20,weight:20,color:'#6366F1',desc:'Evaluates adherence to all specified volume, mass, and structural design constraints, with documented margin analysis.',customRubric:[{min:18,max:20,label:'Excellent',description:'All constraints fully met with documented margin analysis.'},{min:14,max:17,label:'Good',description:'Constraints met with minor deviations.'},{min:10,max:13,label:'Developing',description:'One or more constraints marginally exceeded.'},{min:0,max:9,label:'Insufficient',description:'Multiple constraints violated.'}]},
    {key:'mission_execution',label:'Mission & Telemetry',max:35,weight:35,color:'#EF4444',desc:'Assesses successful execution of primary and secondary mission objectives with continuous and reliable telemetry throughout the flight.',customRubric:[{min:31,max:35,label:'Excellent',description:'Primary and secondary missions fully executed. Continuous telemetry.'},{min:24,max:30,label:'Good',description:'Primary mission completed. Minor telemetry gaps.'},{min:17,max:23,label:'Developing',description:'Primary mission partially completed.'},{min:0,max:16,label:'Insufficient',description:'Mission fails to execute.'}]},
    {key:'data_and_documentation',label:'Data Analysis',max:25,weight:25,color:'#3B82F6',desc:'Evaluates depth and appropriateness of post-flight data analysis and the overall quality and completeness of written documentation.',customRubric:[{min:22,max:25,label:'Excellent',description:'Flight data thoroughly analyzed with appropriate methods.'},{min:17,max:21,label:'Good',description:'Data analysis competent. Post-flight report addresses key findings.'},{min:12,max:16,label:'Developing',description:'Data presented but analysis shallow.'},{min:0,max:11,label:'Insufficient',description:'Raw data dump with no meaningful analysis.'}]},
    {key:'safety_and_recovery',label:'Safety & Recovery',max:20,weight:20,color:'#10B981',desc:'Assesses adherence to all range safety procedures, descent rate control within specification, and successful CanSat recovery.',customRubric:[{min:18,max:20,label:'Excellent',description:'Recovered intact. Descent rate within spec. All safety procedures followed.'},{min:14,max:17,label:'Good',description:'Recovery successful with minor issues.'},{min:10,max:13,label:'Developing',description:'Recovery partial or descent rate deviates.'},{min:0,max:9,label:'Insufficient',description:'CanSat lost or damaged.'}]}
  ],
  [
    ['CS-1', 'Design Compliance',             'CanSat fits within the prescribed cylindrical envelope (66 mm × 115 mm, ≤ 310 g); all structural, thermal, and power budgets are documented with positive margins and verified against flight hardware.'],
    ['CS-2', 'Primary Mission',               'Air pressure and air temperature are sampled at ≥ 1 Hz throughout descent; data is stored on-board and simultaneously downlinked to the ground station; post-flight data completeness exceeds 95 % of expected samples.'],
    ['CS-3', 'Secondary Mission',             'Team-defined secondary mission demonstrates scientific or engineering creativity (e.g., imaging, atmospheric sensing, attitude determination); mission objective is novel, clearly scoped, and successfully executed in flight.'],
    ['CS-4', 'Descent & Recovery',            'Passive descent system achieves a terminal velocity between 10 m/s and 15 m/s throughout the altitude range; CanSat is recovered intact with no damage to electronics or structure after landing.'],
    ['CS-5', 'Ground Station',                'Ground station software displays real-time telemetry in engineering units with visual altitude and temperature plots; data is automatically logged to CSV; any reception gaps are flagged and interpolated correctly.'],
    ['CS-6', 'Analysis & Docs',               'Post-flight report includes altitude profile reconstruction, temperature-altitude correlation, sensor calibration discussion, anomaly root-cause analysis, and quantitative comparison between predicted and measured performance.'],
    ['CS-7', 'Range Safety',                  'All range safety rules are followed including pre-flight hardware inspection, parachute deployment verification, launch pad clearance procedures, and post-flight range sweep; no safety violations are recorded by range safety officers.'],
  ],
  [
    {crit:'design_compliance',     outs:[{code:'CS-1',weight:0.7,type:'direct'},{code:'CS-7',weight:0.3,type:'indirect'}]},
    {crit:'mission_execution',     outs:[{code:'CS-2',weight:0.5,type:'direct'},{code:'CS-3',weight:0.3,type:'direct'},{code:'CS-4',weight:0.2,type:'indirect'}]},
    {crit:'data_and_documentation',outs:[{code:'CS-6',weight:0.6,type:'direct'},{code:'CS-5',weight:0.4,type:'direct'}]},
    {crit:'safety_and_recovery',   outs:[{code:'CS-7',weight:0.5,type:'direct'},{code:'CS-4',weight:0.5,type:'direct'}]}
  ]
);

// Framework-level SQL (frameworks / framework_outcomes / framework_criteria)
// is emitted per-period inside the period loop below — each period owns its
// own framework row so renaming one doesn't affect siblings.

// ═══════════════════════════════════════════════════════════════
// PERIODS — per-period event timelines, criteria evolution
// ═══════════════════════════════════════════════════════════════

out.push(`-- Periods and Snapshots`);
const periodData = [];

const orgPeriodsDef = {
  'TEDU-EE': [
    {name:CUR_SEMESTER_LABEL,frameworkName:`MÜDEK-${CUR_SEM_SHORT}-O`,s:CUR_SEMESTER,start:TODAY,end:TODAY,desc:'EE 491/492 Senior Design — 1-Day Poster Evaluation'},
    {name:'Fall 2025',frameworkName:'MÜDEK-F25-O',s:'Fall',start:'2026-01-09',end:'2026-01-09',desc:'EE 491/492 Fall Senior Design — 1-Day Poster Day'},
    {name:'Spring 2025',frameworkName:'MÜDEK-S25-O',s:'Spring',start:'2025-06-11',end:'2025-06-11',desc:'EE Senior Design Spring — 1-Day Poster Presentations'},
    {name:'Fall 2024',frameworkName:'MÜDEK-F24-O',s:'Fall',start:'2025-01-10',end:'2025-01-10',desc:'EE Senior Design Fall — 1-Day Poster Day'}],
  'CMU-CS': [
    {name:CUR_SEMESTER_LABEL,frameworkName:`ABET-${CUR_SEM_SHORT}-O`,s:CUR_SEMESTER,start:TODAY,end:TODAY,desc:'CS Capstone — 1-Day Demo Day'},
    {name:'Fall 2025',frameworkName:'ABET-F25-O',s:'Fall',start:'2025-12-06',end:'2025-12-06',desc:'CS Fall Capstone — 1-Day Demo Day'},
    {name:'Spring 2025',frameworkName:'ABET-S25-O',s:'Spring',start:'2025-04-27',end:'2025-04-27',desc:'CS Spring Capstone — 1-Day Demo Day'},
    {name:'Fall 2024',frameworkName:'ABET-F24-O',s:'Fall',start:'2024-12-07',end:'2024-12-07',desc:'CS Fall Capstone — 1-Day Demo Day'}],
  'TEKNOFEST': [
    {name:CUR_SEASON_LABEL,frameworkName:`CF-${CUR_YEAR}-O`,s:'Evaluation',start:TODAY,end:TODAY,desc:`TEKNOFEST ${CUR_YEAR} Aviation Competition — 1-Day Finals (Demo)`},
    {name:'2025 Season',frameworkName:'CF-2025-O',s:'Evaluation',start:'2025-07-25',end:'2025-07-27',desc:'TEKNOFEST 2025 Aviation Competition — 3-Day Finals (Jul 25–27)'},
    {name:'2024 Season',frameworkName:'CF-2024-O',s:'Evaluation',start:'2024-07-25',end:'2024-07-27',desc:'TEKNOFEST 2024 Aviation Competition — 3-Day Finals (Jul 25–27)'}],
  'TUBITAK-2204A': [
    {name:CUR_COMP_LABEL,frameworkName:`RCF-${CUR_YEAR}-O`,s:'Evaluation',start:TODAY,end:TODAY,desc:`TÜBİTAK 2204-A ${CUR_YEAR} National Science Competition — 1-Day Finals (Demo)`},
    {name:'2025 Competition',frameworkName:'RCF-2025-O',s:'Evaluation',start:'2025-06-09',end:'2025-06-10',desc:'TÜBİTAK 2204-A 2025 National Science Competition — 2-Day Finals (Jun 9–10)'},
    {name:'2024 Competition',frameworkName:'RCF-2024-O',s:'Evaluation',start:'2024-06-09',end:'2024-06-10',desc:'TÜBİTAK 2204-A 2024 National Science Competition — 2-Day Finals (Jun 9–10)'}],
  'IEEE-APSSDC': [
    {name:CUR_CONTEST_LABEL,frameworkName:`DCF-${CUR_YEAR}-O`,s:'Evaluation',start:TODAY,end:TODAY,desc:`IEEE AP-S Student Design Contest ${CUR_YEAR} — 1-Day Evaluation (Demo)`},
    {name:'2025 Contest',frameworkName:'DCF-2025-O',s:'Evaluation',start:'2025-07-25',end:'2025-07-26',desc:'IEEE AP-S Student Design Contest 2025 — 2-Day Evaluation (Jul 25–26)'},
    {name:'2024 Contest',frameworkName:'DCF-2024-O',s:'Evaluation',start:'2024-07-25',end:'2024-07-26',desc:'IEEE AP-S Student Design Contest 2024 — 2-Day Evaluation (Jul 25–26)'}],
  'CANSAT': [
    {name:CUR_SEASON_LABEL,frameworkName:`MF-${CUR_YEAR}-O`,s:'Spring',start:TODAY,end:TODAY,desc:`CanSat ${CUR_YEAR} Launch Competition — 1-Day Finals (Demo)`},
    {name:'2025 Season',frameworkName:'MF-2025-O',s:'Spring',start:'2025-06-24',end:'2025-06-26',desc:'CanSat 2025 Launch Competition — 3-Day Finals (Jun 24–26)'},
    {name:'2024 Season',frameworkName:'MF-2024-O',s:'Spring',start:'2024-06-24',end:'2024-06-26',desc:'CanSat 2024 Launch Competition — 3-Day Finals (Jun 24–26)'},
    {name:'2027 Season (Draft)',frameworkName:'MF-D27-O',s:'Spring',start:'2027-06-24',end:'2027-06-26',desc:'CanSat 2027 — Planning Phase',draft:true}],
};

// Criteria evolution: idx=0 is NEVER touched (current period preserved exactly)
const criteriaEvolution = {
  'TEDU-EE': {
    1:{weights:{technical:30,design:28,delivery:30,teamwork:12},
      descOverrides:{
        technical:'Evaluates the technical depth of the engineering solution including problem definition, design rationale, and use of appropriate tools.',
        design:'Assesses poster design quality including layout structure, figure labelling, and visual communication of technical results.',
        delivery:'Evaluates oral presentation clarity, pacing, and the ability to respond to technical questions from the jury.',
        teamwork:'Assesses individual contributions, equitable workload distribution, and professional conduct during the evaluation session.',
      },
      rubricOverrides:{
        design:[
          {min:27,max:30,label:'Excellent',description:'Poster is visually compelling with logical flow. All figures are high quality and properly labelled.'},
          {min:21,max:26,label:'Good',description:'Layout is clear with only minor visual issues. Most figures are well-labelled.'},
          {min:13,max:20,label:'Developing',description:'Layout has some disorganized sections. Several figures lack labels or captions.'},
          {min:0,max:12,label:'Insufficient',description:'Disorganized poster with missing or low-quality visuals throughout.'},
        ],
        teamwork:[
          {min:9,max:10,label:'Excellent',description:'Every member demonstrates equal engagement and individual mastery of the project.'},
          {min:7,max:8,label:'Good',description:'Most members contribute actively. Minor gaps in individual depth.'},
          {min:4,max:6,label:'Developing',description:'Contribution is unbalanced. One or two members appear passive.'},
          {min:0,max:3,label:'Insufficient',description:'Single-person dominance. Remaining members show little involvement.'},
        ],
      },
      mapsOverride:[
        {crit:'technical',outs:[
          {code:'PO 1.2',weight:0.35,type:'direct'},{code:'PO 2',weight:0.30,type:'direct'},
          {code:'PO 3.1',weight:0.20,type:'direct'},{code:'PO 3.2',weight:0.15,type:'direct'},
          {code:'PO 1.1',type:'indirect'},{code:'PO 4',type:'indirect'},{code:'PO 5',type:'indirect'},
        ]},
        {crit:'design',outs:[
          {code:'PO 9.2',weight:0.85,type:'direct'},{code:'PO 6.1',weight:0.15,type:'direct'},
        ]},
        {crit:'delivery',outs:[
          {code:'PO 9.1',weight:1.0,type:'direct'},{code:'PO 6.2',type:'indirect'},{code:'PO 10.2',type:'indirect'},
        ]},
        {crit:'teamwork',outs:[
          {code:'PO 8.1',weight:0.5,type:'direct'},{code:'PO 8.2',weight:0.5,type:'direct'},
          {code:'PO 7.1',type:'indirect'},{code:'PO 7.2',type:'indirect'},{code:'PO 10.1',type:'indirect'},{code:'PO 11',type:'indirect'},
        ]},
      ]},
    2:{weights:{technical:35,design:25,delivery:25,teamwork:15},labels:{design:'Written Report Quality',delivery:'Oral Presentation'},
      descOverrides:{
        technical:'Evaluates engineering problem formulation, design methodology, and application of domain-specific knowledge.',
        design:'Assesses the quality and structure of the written report including references, formatting, and technical clarity.',
        delivery:'Evaluates oral presentation skills including confidence, pacing, audience awareness, and Q&A handling.',
        teamwork:'Assesses balanced contribution across team members and individual understanding of the project scope.',
      },
      rubricOverrides:{
        design:[
          {min:27,max:30,label:'Excellent',description:'Report is well-structured with clear sections, proper references, and professional formatting.'},
          {min:21,max:26,label:'Good',description:'Report covers required sections adequately. Formatting is mostly consistent.'},
          {min:13,max:20,label:'Developing',description:'Report structure is present but sections lack depth or proper citations.'},
          {min:0,max:12,label:'Insufficient',description:'Report is incomplete, poorly formatted, or missing critical sections.'},
        ],
        delivery:[
          {min:27,max:30,label:'Excellent',description:'Clear, confident delivery with good pacing. Questions answered accurately and concisely.'},
          {min:21,max:26,label:'Good',description:'Presentation is understandable with adequate pacing. Most questions handled well.'},
          {min:13,max:20,label:'Developing',description:'Delivery is hesitant or rushed. Audience engagement is limited.'},
          {min:0,max:12,label:'Insufficient',description:'Disorganized presentation. Questions frequently answered incorrectly.'},
        ],
        technical:[
          {min:27,max:30,label:'Excellent',description:'Strong problem definition with well-justified design choices. Demonstrates deep domain knowledge.'},
          {min:21,max:26,label:'Good',description:'Problem is clearly stated. Design decisions are reasonable with minor justification gaps.'},
          {min:13,max:20,label:'Developing',description:'Problem statement exists but technical depth is shallow.'},
          {min:0,max:12,label:'Insufficient',description:'Vague problem definition. Design decisions are not supported.'},
        ],
      },
      mapsOverride:[
        {crit:'technical',outs:[
          {code:'PO 1.2',weight:0.40,type:'direct'},{code:'PO 2',weight:0.35,type:'direct'},
          {code:'PO 3.1',weight:0.25,type:'direct'},
          {code:'PO 1.1',type:'indirect'},{code:'PO 5',type:'indirect'},
        ]},
        {crit:'design',outs:[
          {code:'PO 9.2',weight:0.70,type:'direct'},{code:'PO 10.1',weight:0.30,type:'direct'},
        ]},
        {crit:'delivery',outs:[
          {code:'PO 9.1',weight:0.80,type:'direct'},{code:'PO 10.2',weight:0.20,type:'direct'},{code:'PO 6.2',type:'indirect'},
        ]},
        {crit:'teamwork',outs:[
          {code:'PO 8.1',weight:0.5,type:'direct'},{code:'PO 8.2',weight:0.5,type:'direct'},
          {code:'PO 7.1',type:'indirect'},{code:'PO 11',type:'indirect'},
        ]},
      ]},
    3:{weights:{technical:35,design:25,delivery:25,teamwork:15},labels:{design:'Written Report',delivery:'Presentation',teamwork:'Team Participation'},
      descOverrides:{
        technical:'Assesses the fundamental soundness of the engineering approach and adequacy of technical justification.',
        design:'Evaluates the organization, completeness, and clarity of the written project report.',
        delivery:'Assesses the ability to communicate project objectives, methods, and results during the oral presentation.',
        teamwork:'Evaluates whether all team members can speak knowledgeably about the project and contribute during Q&A.',
      },
      rubricOverrides:{
        technical:[
          {min:22,max:30,label:'Proficient',description:'Sound engineering approach with adequate technical justification.'},
          {min:14,max:21,label:'Developing',description:'Technical content is present but reasoning is not well-supported.'},
          {min:0,max:13,label:'Below Standard',description:'Lacks meaningful technical contribution.'},
        ],
        design:[
          {min:22,max:30,label:'Proficient',description:'Written report is organized and covers key design decisions.'},
          {min:14,max:21,label:'Developing',description:'Report exists but structure or content is incomplete.'},
          {min:0,max:13,label:'Below Standard',description:'Report is largely missing or disorganized.'},
        ],
        delivery:[
          {min:22,max:30,label:'Proficient',description:'Presentation is clear and questions are answered appropriately.'},
          {min:14,max:21,label:'Developing',description:'Presentation is understandable but lacks confidence or structure.'},
          {min:0,max:13,label:'Below Standard',description:'Unable to communicate project goals or results.'},
        ],
        teamwork:[
          {min:8,max:10,label:'Proficient',description:'All members participate and can speak to the project details.'},
          {min:5,max:7,label:'Developing',description:'Participation is uneven among team members.'},
          {min:0,max:4,label:'Below Standard',description:'Only one member carries the project.'},
        ],
      },
      mapsOverride:[
        {crit:'technical',outs:[
          {code:'PO 1.2',weight:0.50,type:'direct'},{code:'PO 2',weight:0.50,type:'direct'},
          {code:'PO 1.1',type:'indirect'},
        ]},
        {crit:'design',outs:[
          {code:'PO 9.2',weight:1.0,type:'direct'},
        ]},
        {crit:'delivery',outs:[
          {code:'PO 9.1',weight:1.0,type:'direct'},
        ]},
        {crit:'teamwork',outs:[
          {code:'PO 8.1',weight:0.5,type:'direct'},{code:'PO 8.2',weight:0.5,type:'direct'},
          {code:'PO 7.1',type:'indirect'},{code:'PO 11',type:'indirect'},
        ]},
      ]},
  },
  'CMU-CS': {
    1:{weights:{problem_solving:25,system_design:25,implementation_quality:18,communication:22,teamwork:10},labels:{communication:'Communication Skills'},
      descOverrides:{
        problem_solving:'Evaluates the precision of problem identification, scope definition, and correctness of the chosen analytical approach.',
        system_design:'Assesses system architecture decisions, modularity, and the rationale behind component boundaries.',
        implementation_quality:'Evaluates code organization, test coverage, and adherence to software engineering best practices.',
        communication:'Assesses written and oral communication effectiveness including audience awareness and presentation structure.',
        teamwork:'Evaluates equitable contribution, collaboration tools usage, and team coordination effectiveness.',
      },
      rubricOverrides:{
        communication:[
          {min:18,max:20,label:'Excellent',description:'Written and oral communication is clear, well-organized, and audience-appropriate.'},
          {min:14,max:17,label:'Good',description:'Communication is effective with minor clarity issues.'},
          {min:10,max:13,label:'Developing',description:'Key ideas are communicated but structure or clarity needs work.'},
          {min:0,max:9,label:'Insufficient',description:'Communication is unclear or poorly organized.'},
        ],
      },
      mapsOverride:[
        {crit:'problem_solving',outs:[
          {code:'SO-1',weight:0.7,type:'direct'},{code:'SO-6',weight:0.3,type:'direct'},
        ]},
        {crit:'system_design',outs:[
          {code:'SO-2',weight:0.7,type:'direct'},{code:'SO-1',weight:0.3,type:'indirect'},
        ]},
        {crit:'implementation_quality',outs:[
          {code:'SO-6',weight:0.6,type:'direct'},{code:'SO-7',weight:0.4,type:'direct'},
        ]},
        {crit:'communication',outs:[
          {code:'SO-3',weight:0.8,type:'direct'},{code:'SO-4',weight:0.2,type:'indirect'},
        ]},
        {crit:'teamwork',outs:[{code:'SO-5',weight:1.0,type:'direct'}]},
      ]},
    2:{weights:{problem_solving:30,system_design:25,implementation_quality:20,communication:15,teamwork:10},labels:{problem_solving:'Analytical Thinking',system_design:'Software Architecture'},
      descOverrides:{
        problem_solving:'Assesses analytical rigor, problem decomposition quality, and identification of constraints and edge cases.',
        system_design:'Evaluates architectural soundness, component modularity, interface design, and scalability considerations.',
        implementation_quality:'Assesses code quality, testing strategy, continuous integration practices, and documentation completeness.',
        communication:'Evaluates the clarity and completeness of project documentation and the effectiveness of team presentations.',
        teamwork:'Assesses collaborative development practices including version control workflows and code review participation.',
      },
      rubricOverrides:{
        problem_solving:[
          {min:22,max:25,label:'Excellent',description:'Demonstrates rigorous analytical thinking with precise problem decomposition.'},
          {min:17,max:21,label:'Good',description:'Analysis is mostly thorough with clear problem breakdown.'},
          {min:12,max:16,label:'Developing',description:'Some analytical effort but decomposition is incomplete.'},
          {min:0,max:11,label:'Insufficient',description:'Lacks systematic analytical approach.'},
        ],
        system_design:[
          {min:22,max:25,label:'Excellent',description:'Architecture is clean, modular, and well-documented with clear rationale.'},
          {min:17,max:21,label:'Good',description:'Architecture is reasonable with identifiable component boundaries.'},
          {min:12,max:16,label:'Developing',description:'Some structure exists but architectural choices are ad-hoc.'},
          {min:0,max:11,label:'Insufficient',description:'No discernible architecture or design rationale.'},
        ],
      },
      mapsOverride:[
        {crit:'problem_solving',outs:[
          {code:'SO-1',weight:0.5,type:'direct'},{code:'SO-6',weight:0.3,type:'direct'},{code:'SO-2',weight:0.2,type:'indirect'},
        ]},
        {crit:'system_design',outs:[
          {code:'SO-2',weight:1.0,type:'direct'},
        ]},
        {crit:'implementation_quality',outs:[
          {code:'SO-6',weight:0.7,type:'direct'},{code:'SO-7',weight:0.3,type:'indirect'},
        ]},
        {crit:'communication',outs:[
          {code:'SO-3',weight:0.6,type:'direct'},{code:'SO-4',weight:0.4,type:'direct'},
        ]},
        {crit:'teamwork',outs:[
          {code:'SO-5',weight:0.8,type:'direct'},{code:'SO-7',weight:0.2,type:'indirect'},
        ]},
      ]},
    3:{weights:{problem_solving:30,system_design:30,implementation_quality:20,communication:20,teamwork:0},labels:{problem_solving:'Analytical Thinking',system_design:'Software Architecture',communication:'Communication & Collaboration'},removeCriteria:['teamwork'],
      descOverrides:{
        problem_solving:'Evaluates structured problem decomposition, constraint analysis, and the rigor of the proposed solution approach.',
        system_design:'Assesses software architecture quality including component cohesion, interface clarity, and design rationale.',
        implementation_quality:'Evaluates overall code health, test adequacy, build reproducibility, and deployment readiness.',
        communication:'Assesses project documentation quality, team collaboration evidence, and the ability to present technical work clearly.',
      },
      rubricOverrides:{
        problem_solving:[
          {min:22,max:25,label:'Excellent',description:'Exceptional analytical rigor. Problem is fully decomposed with constraints identified.'},
          {min:17,max:21,label:'Good',description:'Solid analytical approach covering most problem dimensions.'},
          {min:12,max:16,label:'Developing',description:'Analysis is surface-level. Key constraints overlooked.'},
          {min:0,max:11,label:'Insufficient',description:'Problem is treated superficially with no structured thinking.'},
        ],
        system_design:[
          {min:22,max:25,label:'Excellent',description:'Textbook-quality architecture. Components are cohesive with well-defined interfaces.'},
          {min:17,max:21,label:'Good',description:'Architecture is functional with reasonable separation of concerns.'},
          {min:12,max:16,label:'Developing',description:'Monolithic or poorly factored. Dependencies are tangled.'},
          {min:0,max:11,label:'Insufficient',description:'No coherent architecture. Code organization is arbitrary.'},
        ],
        communication:[
          {min:18,max:20,label:'Excellent',description:'Documentation is comprehensive. Team collaboration workflow is clearly demonstrated.'},
          {min:14,max:17,label:'Good',description:'Documentation covers key areas. Evidence of collaborative process.'},
          {min:10,max:13,label:'Developing',description:'Documentation is sparse. Collaboration is mentioned but not demonstrated.'},
          {min:0,max:9,label:'Insufficient',description:'Little documentation. No evidence of structured collaboration.'},
        ],
      },
      mapsOverride:[
        {crit:'problem_solving',outs:[
          {code:'SO-1',weight:0.6,type:'direct'},{code:'SO-6',weight:0.4,type:'direct'},
        ]},
        {crit:'system_design',outs:[
          {code:'SO-2',weight:0.8,type:'direct'},{code:'SO-1',weight:0.2,type:'indirect'},
        ]},
        {crit:'implementation_quality',outs:[
          {code:'SO-6',weight:1.0,type:'direct'},
        ]},
        {crit:'communication',outs:[
          {code:'SO-3',weight:1.0,type:'direct'},
        ]},
      ]},
  },
  'TEKNOFEST': {
    1:{weights:{preliminary_report:20,critical_design:30,technical_performance:40,team_execution:10},labels:{team_execution:'Team Coordination'},
      descOverrides:{
        preliminary_report:'Assesses preliminary design report completeness, mission clarity, and feasibility of the proposed concept.',
        critical_design:'Evaluates design maturity, subsystem readiness, and manufacturing feasibility at the CDR milestone.',
        technical_performance:'Assesses system performance during competition demonstration under real operating conditions.',
        team_execution:'Evaluates team coordination quality, role assignment clarity, and effectiveness during jury presentation.',
      },
      rubricOverrides:{
        preliminary_report:[
          {min:22,max:25,label:'Excellent',description:'Report is thorough with well-reasoned mission definition and a feasible preliminary design.'},
          {min:17,max:21,label:'Good',description:'Report covers key design elements with adequate technical justification.'},
          {min:12,max:16,label:'Developing',description:'Report structure is present but design rationale is underdeveloped.'},
          {min:0,max:11,label:'Insufficient',description:'Report is incomplete or missing critical sections.'},
        ],
        technical_performance:[
          {min:27,max:30,label:'Excellent',description:'System achieves full mission objectives in field conditions with no critical failures.'},
          {min:21,max:26,label:'Good',description:'Primary mission completed successfully. Minor deviations from planned performance.'},
          {min:13,max:20,label:'Developing',description:'System partially completes mission. Key objectives only partly achieved.'},
          {min:0,max:12,label:'Insufficient',description:'System fails to complete the primary mission under field conditions.'},
        ],
        team_execution:[
          {min:14,max:15,label:'Excellent',description:'Team works as a cohesive unit with clear coordination and mutual support.'},
          {min:11,max:13,label:'Good',description:'Coordination is evident. Roles are generally clear.'},
          {min:7,max:10,label:'Developing',description:'Some coordination gaps. Role overlap or confusion observed.'},
          {min:0,max:6,label:'Insufficient',description:'Team appears disorganized with no clear coordination structure.'},
        ],
      },
      mapsOverride:[
        {crit:'preliminary_report',outs:[
          {code:'TC-3',weight:0.6,type:'direct'},{code:'TC-5',weight:0.4,type:'direct'},
        ]},
        {crit:'critical_design',outs:[
          {code:'TC-3',weight:0.5,type:'direct'},{code:'TC-1',weight:0.3,type:'direct'},{code:'TC-5',weight:0.2,type:'indirect'},
        ]},
        {crit:'technical_performance',outs:[
          {code:'TC-2',weight:0.7,type:'direct'},{code:'TC-1',weight:0.3,type:'direct'},
        ]},
        {crit:'team_execution',outs:[
          {code:'TC-4',weight:1.0,type:'direct'},
        ]},
      ]},
    2:{weights:{preliminary_report:30,critical_design:35,technical_performance:35,team_execution:0},labels:{critical_design:'Design Review',technical_performance:'Field Performance'},removeCriteria:['team_execution'],
      descOverrides:{
        preliminary_report:'Assesses the thoroughness and technical depth of the preliminary design documentation.',
        critical_design:'Evaluates subsystem integration completeness and design verification evidence at review stage.',
        technical_performance:'Assesses field-day performance against mission objectives under competition constraints.',
      },
      rubricOverrides:{
        critical_design:[
          {min:27,max:30,label:'Excellent',description:'Design review demonstrates full system maturity with verified subsystem interfaces.'},
          {min:21,max:26,label:'Good',description:'Design is largely complete with documented integration plan.'},
          {min:13,max:20,label:'Developing',description:'Design has significant open items at review stage.'},
          {min:0,max:12,label:'Insufficient',description:'Design is not ready for review. Major subsystems undefined.'},
        ],
        technical_performance:[
          {min:27,max:30,label:'Excellent',description:'System completes all field objectives under real competition conditions.'},
          {min:21,max:26,label:'Good',description:'Primary field objectives met with minor deviations from plan.'},
          {min:13,max:20,label:'Developing',description:'Partial field success. Key objectives only partially achieved.'},
          {min:0,max:12,label:'Insufficient',description:'System fails to perform in field conditions.'},
        ],
      },
      mapsOverride:[
        {crit:'preliminary_report',outs:[
          {code:'TC-3',weight:0.8,type:'direct'},{code:'TC-5',weight:0.2,type:'indirect'},
        ]},
        {crit:'critical_design',outs:[
          {code:'TC-3',weight:0.6,type:'direct'},{code:'TC-1',weight:0.4,type:'direct'},
        ]},
        {crit:'technical_performance',outs:[
          {code:'TC-2',weight:0.6,type:'direct'},{code:'TC-1',weight:0.3,type:'direct'},{code:'TC-5',weight:0.1,type:'indirect'},
        ]},
      ]},
  },
  'TUBITAK-2204A': {
    1:{weights:{originality:40,scientific_method:35,impact_and_presentation:25},labels:{impact_and_presentation:'Presentation & Impact'},
      descOverrides:{
        originality:'Evaluates the novelty of the research question and uniqueness of the proposed methodology.',
        scientific_method:'Assesses experimental design rigor, hypothesis clarity, and statistical validity of results.',
        impact_and_presentation:'Evaluates presentation quality and the ability to articulate real-world applicability of findings.',
      },
      rubricOverrides:{
        originality:[
          {min:31,max:35,label:'Excellent',description:'Research addresses a genuinely unstudied question with a fully student-initiated inquiry approach.'},
          {min:24,max:30,label:'Good',description:'Research topic is original and the approach demonstrates independent thinking.'},
          {min:17,max:23,label:'Developing',description:'Topic is relevant but approach closely follows established methods without meaningful variation.'},
          {min:0,max:16,label:'Insufficient',description:'Research replicates existing work without a novel contribution.'},
        ],
        scientific_method:[
          {min:35,max:40,label:'Excellent',description:'Hypothesis is precisely formulated, controls are appropriate, and results are reproducible.'},
          {min:27,max:34,label:'Good',description:'Methodology is sound with minor gaps in controls or sample adequacy.'},
          {min:19,max:26,label:'Developing',description:'Basic methodology is described but controls or statistical validity are weak.'},
          {min:0,max:18,label:'Insufficient',description:'No discernible experimental design or hypothesis testing.'},
        ],
        impact_and_presentation:[
          {min:22,max:25,label:'Excellent',description:'Presentation is polished and the real-world impact of results is convincingly argued.'},
          {min:17,max:21,label:'Good',description:'Presentation is clear and impact is discussed with supporting evidence.'},
          {min:12,max:16,label:'Developing',description:'Presentation is adequate but impact claims lack supporting data.'},
          {min:0,max:11,label:'Insufficient',description:'Presentation is weak and no meaningful impact discussion provided.'},
        ],
      },
      mapsOverride:[
        {crit:'originality',outs:[
          {code:'RC-1',weight:0.5,type:'direct'},{code:'RC-3',weight:0.3,type:'direct'},{code:'RC-7',weight:0.2,type:'indirect'},
        ]},
        {crit:'scientific_method',outs:[
          {code:'RC-2',weight:0.6,type:'direct'},{code:'RC-5',weight:0.4,type:'direct'},
        ]},
        {crit:'impact_and_presentation',outs:[
          {code:'RC-4',weight:0.5,type:'direct'},{code:'RC-6',weight:0.5,type:'direct'},
        ]},
      ]},
    2:{weights:{originality:30,scientific_method:45,impact_and_presentation:25},labels:{originality:'Innovation',impact_and_presentation:'Impact Assessment'},
      descOverrides:{
        originality:'Assesses the degree of innovation and how the proposed idea advances beyond existing scientific literature.',
        scientific_method:'Evaluates the rigor of experimental methodology including controls, sample adequacy, and reproducibility.',
        impact_and_presentation:'Assesses data-driven impact analysis and the quality of oral and visual presentation delivery.',
      },
      rubricOverrides:{
        originality:[
          {min:31,max:35,label:'Excellent',description:'Proposes a genuinely novel idea that advances the field beyond existing work.'},
          {min:24,max:30,label:'Good',description:'Shows clear innovative thinking with a distinguishable contribution.'},
          {min:17,max:23,label:'Developing',description:'Builds on known ideas with limited novel contribution.'},
          {min:0,max:16,label:'Insufficient',description:'Replicates existing work without meaningful innovation.'},
        ],
        impact_and_presentation:[
          {min:22,max:25,label:'Excellent',description:'Impact assessment is data-driven with clear societal or scientific benefit.'},
          {min:17,max:21,label:'Good',description:'Impact is identified and reasonably supported with evidence.'},
          {min:12,max:16,label:'Developing',description:'Impact is mentioned but assessment is vague or unsupported.'},
          {min:0,max:11,label:'Insufficient',description:'No structured impact assessment provided.'},
        ],
      },
      mapsOverride:[
        {crit:'originality',outs:[
          {code:'RC-1',weight:0.7,type:'direct'},{code:'RC-7',weight:0.3,type:'direct'},
        ]},
        {crit:'scientific_method',outs:[
          {code:'RC-2',weight:0.7,type:'direct'},{code:'RC-3',weight:0.3,type:'direct'},
        ]},
        {crit:'impact_and_presentation',outs:[
          {code:'RC-4',weight:0.6,type:'direct'},{code:'RC-6',weight:0.4,type:'direct'},
        ]},
      ]},
  },
  'IEEE-APSSDC': {
    1:{weights:{creativity:35,technical_merit:40,application_and_presentation:25},labels:{application_and_presentation:'Application & Demo'},
      descOverrides:{
        creativity:'Evaluates novelty of the antenna design concept relative to existing literature and published designs.',
        technical_merit:'Assesses simulation-measurement agreement quality and overall antenna performance metrics.',
        application_and_presentation:'Evaluates the clarity of the proposed real-world use case and the quality of the live demonstration.',
      },
      rubricOverrides:{
        creativity:[
          {min:27,max:30,label:'Excellent',description:'Design introduces a genuinely novel topology or technique with clear differentiation from published work.'},
          {min:21,max:26,label:'Good',description:'Design shows meaningful originality in at least one dimension of the antenna concept.'},
          {min:13,max:20,label:'Developing',description:'Conventional approach with incremental modifications. Limited differentiation from prior art.'},
          {min:0,max:12,label:'Insufficient',description:'Direct application of standard designs with no discernible creative contribution.'},
        ],
        technical_merit:[
          {min:35,max:40,label:'Excellent',description:'Simulation and measurement results are in close agreement. RF performance exceeds specifications.'},
          {min:27,max:34,label:'Good',description:'Results are solid with acceptable sim-measurement correlation and adequate performance.'},
          {min:19,max:26,label:'Developing',description:'Simulation results presented but measurement validation is limited or inconsistent.'},
          {min:0,max:18,label:'Insufficient',description:'Significant discrepancies between simulation and measurement or no measured results.'},
        ],
        application_and_presentation:[
          {min:27,max:30,label:'Excellent',description:'Live demo is compelling and clearly demonstrates a real-world application scenario.'},
          {min:21,max:26,label:'Good',description:'Demo works and application context is well-established.'},
          {min:13,max:20,label:'Developing',description:'Demo is partial or application scenario is not convincing.'},
          {min:0,max:12,label:'Insufficient',description:'No working demo or application context.'},
        ],
      },
      mapsOverride:[
        {crit:'creativity',outs:[
          {code:'DC-1',weight:0.8,type:'direct'},{code:'DC-3',weight:0.2,type:'indirect'},
        ]},
        {crit:'technical_merit',outs:[
          {code:'DC-2',weight:0.5,type:'direct'},{code:'DC-3',weight:0.5,type:'direct'},
        ]},
        {crit:'application_and_presentation',outs:[
          {code:'DC-4',weight:0.5,type:'direct'},{code:'DC-5',weight:0.5,type:'direct'},
        ]},
      ]},
    2:{weights:{creativity:25,technical_merit:45,application_and_presentation:30},labels:{creativity:'Innovation'},
      descOverrides:{
        creativity:'Assesses the degree of design innovation and differentiation from prior art in the antenna domain.',
        technical_merit:'Evaluates RF performance quality, simulation-measurement correlation, and compliance with design specifications.',
        application_and_presentation:'Assesses the practical relevance of the proposed application and overall presentation delivery.',
      },
      rubricOverrides:{
        creativity:[
          {min:27,max:30,label:'Excellent',description:'Design introduces a novel concept or technique with clear differentiation from prior art.'},
          {min:21,max:26,label:'Good',description:'Design shows originality in approach or implementation.'},
          {min:13,max:20,label:'Developing',description:'Incremental modifications to a conventional design.'},
          {min:0,max:12,label:'Insufficient',description:'No discernible innovation over standard approaches.'},
        ],
        technical_merit:[
          {min:35,max:40,label:'Excellent',description:'Simulation and measurement show strong agreement. Performance meets or exceeds specifications.'},
          {min:27,max:34,label:'Good',description:'Results are solid with reasonable sim-measurement correlation.'},
          {min:19,max:26,label:'Developing',description:'Simulation presented but measurement validation is insufficient.'},
          {min:0,max:18,label:'Insufficient',description:'No measurement results or major discrepancies with simulation.'},
        ],
      },
      mapsOverride:[
        {crit:'creativity',outs:[
          {code:'DC-1',weight:1.0,type:'direct'},
        ]},
        {crit:'technical_merit',outs:[
          {code:'DC-2',weight:0.7,type:'direct'},{code:'DC-3',weight:0.3,type:'indirect'},
        ]},
        {crit:'application_and_presentation',outs:[
          {code:'DC-5',weight:0.6,type:'direct'},{code:'DC-4',weight:0.4,type:'direct'},
        ]},
      ]},
  },
  'CANSAT': {
    1:{weights:{design_compliance:15,mission_execution:40,data_and_documentation:25,safety_and_recovery:20},labels:{data_and_documentation:'Data Analysis & Reporting'},
      descOverrides:{
        design_compliance:'Assesses adherence to specified volume, mass, and structural design constraints with margin documentation.',
        mission_execution:'Evaluates primary and secondary mission objective completion with continuous telemetry reliability.',
        data_and_documentation:'Assesses rigor of post-flight data analysis and overall completeness of written documentation.',
        safety_and_recovery:'Evaluates adherence to range safety procedures and successful CanSat recovery after descent.',
      },
      rubricOverrides:{
        design_compliance:[
          {min:18,max:20,label:'Excellent',description:'All volume, mass, and structural constraints satisfied with documented margin analysis.'},
          {min:14,max:17,label:'Good',description:'Constraints are met with minor deviations within acceptable tolerance.'},
          {min:10,max:13,label:'Developing',description:'One or more constraints marginally exceeded without documented justification.'},
          {min:0,max:9,label:'Insufficient',description:'Multiple constraints violated or no verification evidence provided.'},
        ],
        mission_execution:[
          {min:31,max:35,label:'Excellent',description:'Both primary and secondary missions fully executed. Telemetry is continuous and complete throughout flight.'},
          {min:24,max:30,label:'Good',description:'Primary mission completed. Secondary mission attempted with minor gaps in telemetry.'},
          {min:17,max:23,label:'Developing',description:'Primary mission partially completed. Significant telemetry gaps or secondary mission not attempted.'},
          {min:0,max:16,label:'Insufficient',description:'Mission execution failed or no meaningful flight data collected.'},
        ],
        data_and_documentation:[
          {min:22,max:25,label:'Excellent',description:'Post-flight data is rigorously analyzed and reporting is thorough with clear methodology.'},
          {min:17,max:21,label:'Good',description:'Data analysis addresses key findings. Reporting is organized.'},
          {min:12,max:16,label:'Developing',description:'Data is presented but analysis depth is lacking.'},
          {min:0,max:11,label:'Insufficient',description:'Minimal analysis. Data is raw with no structured reporting.'},
        ],
      },
      mapsOverride:[
        {crit:'design_compliance',outs:[
          {code:'CS-1',weight:0.8,type:'direct'},{code:'CS-7',weight:0.2,type:'direct'},
        ]},
        {crit:'mission_execution',outs:[
          {code:'CS-2',weight:0.5,type:'direct'},{code:'CS-3',weight:0.3,type:'direct'},{code:'CS-5',weight:0.2,type:'indirect'},
        ]},
        {crit:'data_and_documentation',outs:[
          {code:'CS-6',weight:0.7,type:'direct'},{code:'CS-5',weight:0.3,type:'direct'},
        ]},
        {crit:'safety_and_recovery',outs:[
          {code:'CS-7',weight:0.6,type:'direct'},{code:'CS-4',weight:0.4,type:'direct'},
        ]},
      ]},
    2:{weights:{design_compliance:20,mission_execution:40,data_and_documentation:20,safety_and_recovery:20},labels:{design_compliance:'Constraints Verification',mission_execution:'Flight Performance',data_and_documentation:'Data & Reports'},
      descOverrides:{
        design_compliance:'Evaluates constraint verification completeness including mass, volume, and structural margin analysis.',
        mission_execution:'Assesses flight performance against primary objectives with emphasis on telemetry continuity.',
        data_and_documentation:'Evaluates post-flight reporting quality, data visualization, and analytical methodology.',
        safety_and_recovery:'Assesses descent rate control, recovery success, and compliance with all range safety protocols.',
      },
      rubricOverrides:{
        design_compliance:[
          {min:18,max:20,label:'Excellent',description:'All mass, volume, and structural constraints verified with documented margin analysis.'},
          {min:14,max:17,label:'Good',description:'Constraints are met with minor deviations within tolerance.'},
          {min:10,max:13,label:'Developing',description:'One or more constraints marginally exceeded without documented justification.'},
          {min:0,max:9,label:'Insufficient',description:'Multiple constraints violated or not verified.'},
        ],
        mission_execution:[
          {min:31,max:35,label:'Excellent',description:'All flight objectives completed successfully with continuous telemetry throughout.'},
          {min:24,max:30,label:'Good',description:'Primary objectives met. Minor telemetry interruptions.'},
          {min:17,max:23,label:'Developing',description:'Flight was partial. Some objectives not achieved.'},
          {min:0,max:16,label:'Insufficient',description:'Flight failed or no meaningful data collected.'},
        ],
        data_and_documentation:[
          {min:22,max:25,label:'Excellent',description:'Post-flight reports are comprehensive with clear data visualizations and conclusions.'},
          {min:17,max:21,label:'Good',description:'Reports cover key data. Analysis is adequate.'},
          {min:12,max:16,label:'Developing',description:'Reports exist but analysis is shallow or incomplete.'},
          {min:0,max:11,label:'Insufficient',description:'No meaningful post-flight documentation provided.'},
        ],
      },
      mapsOverride:[
        {crit:'design_compliance',outs:[
          {code:'CS-1',weight:1.0,type:'direct'},
        ]},
        {crit:'mission_execution',outs:[
          {code:'CS-2',weight:0.6,type:'direct'},{code:'CS-3',weight:0.4,type:'direct'},
        ]},
        {crit:'data_and_documentation',outs:[
          {code:'CS-6',weight:0.5,type:'direct'},{code:'CS-5',weight:0.3,type:'direct'},{code:'CS-1',weight:0.2,type:'indirect'},
        ]},
        {crit:'safety_and_recovery',outs:[
          {code:'CS-7',weight:0.7,type:'direct'},{code:'CS-4',weight:0.3,type:'direct'},
        ]},
      ]},
  },
};

const periodCriteriaMap = {};

orgs.forEach(o => {
  const defs = orgPeriodsDef[o.code] || [];
  defs.forEach((d, idx) => {
    const isCurrent = idx === 0 && !d.draft;
    const isDraft = !!d.draft;
    const pId = uuid(`period-${o.code}-${idx}`);
    let { evalDay, evalDays } = computeEvalWindow(d.start, d.end, o.type, o.evalDays);
    if (isCurrent) evalDays = 1; // Demo resets daily — current period is always 1-day window
    let sn = d.s === 'NULL' ? 'NULL' : `'${d.s}'`;

    // ── Per-period framework ───────────────────────────────────
    // Each period owns its own framework row so admins can rename it
    // without affecting sibling periods. Outcomes/criteria are copied
    // from the org template with period-scoped UUIDs.
    // Name uses the per-period short label (e.g. "MÜDEK-Spring 2026", "CF-2026").
    const fwId = uuid(`fw-${o.code}-${idx}`);
    const fwName = d.frameworkName || `${o.frameworkName} — ${d.name}`;
    const criteriaName = fwName.replace(/-O$/, '-R');
    out.push(`INSERT INTO frameworks (id, organization_id, name, description) VALUES ('${fwId}', '${o.id}', '${escapeSql(fwName)}', '${escapeSql(o.frameworkDesc || '')}') ON CONFLICT DO NOTHING;`);

    // framework_outcomes — one set per period framework, keyed by outcome code.
    const fwOutIdByCode = {};
    o.outcomesData.forEach(oc => {
      const oId = uuid(`fw-out-${o.code}-${idx}-${oc.code}`);
      fwOutIdByCode[oc.code] = oId;
      const descSql = oc.desc ? `'${escapeSql(oc.desc)}'` : 'NULL';
      out.push(`INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order) VALUES ('${oId}', '${fwId}', '${escapeSql(oc.code)}', '${escapeSql(oc.label)}', ${descSql}, ${oc.sortOrder}) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, description=EXCLUDED.description;`);
    });

    if (isDraft) {
      const draftTs = sqlTs('2026-03-15');
      // Drafts: emit framework_criteria matching the org template (no per-period evolution applied yet).
      o.criteriaData.forEach(c => {
        const fcId = uuid(`fw-crit-${o.code}-${idx}-${c.key}`);
        const rubricJson = c.customRubric ? JSON.stringify(c.customRubric).replace(/'/g, "''") : parseRubric(c.max);
        const cDescSql = c.desc ? `'${escapeSql(c.desc)}'` : 'NULL';
        out.push(`INSERT INTO framework_criteria (id, framework_id, key, label, description, max_score, weight, color, rubric_bands, sort_order) VALUES ('${fcId}', '${fwId}', '${c.key}', '${escapeSql(c.label)}', ${cDescSql}, ${c.max}, ${c.weight}, '${c.color}', '${rubricJson}', ${c.sortOrder}) ON CONFLICT DO NOTHING;`);
      });
      out.push(`INSERT INTO periods (id, organization_id, framework_id, name, season, description, start_date, end_date, is_current, is_locked, is_visible, criteria_name, snapshot_frozen_at, activated_at, updated_at) VALUES ('${pId}', '${o.id}', '${fwId}', '${escapeSql(d.name)}', ${sn}, '${escapeSql(d.desc)}', '${d.start}', '${d.end}', false, false, false, '${escapeSql(criteriaName)}', NULL, NULL, ${draftTs}) ON CONFLICT DO NOTHING;`);
      return; // draft periods have no period_criteria, projects, jurors, or tokens
    }

    const frozenTs = sqlTs(evalDay, -24);
    const activatedTs = isCurrent
      ? randSqlTs(evalDay, -72, -24)   // current: admin activated 1–3 days ago
      : randSqlTs(d.start, 24, 72);    // historical: activated 1–3 days after period start
    const updatedTs = isCurrent ? sqlTs(evalDay, -20) : sqlTs(evalDay, (evalDays + 3) * 24);

    const startDateSql = isCurrent ? 'CURRENT_DATE' : `'${d.start}'`;
    const endDateSql   = isCurrent ? 'CURRENT_DATE' : `'${d.end}'`;
    out.push(`INSERT INTO periods (id, organization_id, framework_id, name, season, description, start_date, end_date, is_current, is_locked, is_visible, criteria_name, snapshot_frozen_at, activated_at, updated_at) VALUES ('${pId}', '${o.id}', '${fwId}', '${escapeSql(d.name)}', ${sn}, '${escapeSql(d.desc)}', ${startDateSql}, ${endDateSql}, ${isCurrent}, ${!isCurrent}, true, '${escapeSql(criteriaName)}', ${frozenTs}, ${activatedTs}, ${updatedTs}) ON CONFLICT DO NOTHING;`);

    const evo = (criteriaEvolution[o.code] || {})[idx] || null;
    const removedKeys = evo?.removeCriteria || [];

    // framework_criteria + period_criteria emitted together so labels/weights/rubric stay in sync.
    const fwCritIdByKey = {};
    const pcMap = {};
    const periodCrits = [];
    o.criteriaData.forEach(c => {
      if (removedKeys.includes(c.key)) return;
      const fcId = uuid(`fw-crit-${o.code}-${idx}-${c.key}`);
      const pcId = uuid(`pcrit-${pId}-${c.key}`);
      fwCritIdByKey[c.key] = fcId;
      pcMap[c.key] = pcId;
      let cLabel = evo?.labels?.[c.key] || c.label;
      let cWeight = evo?.weights?.[c.key] ?? c.weight;
      let rubricJson;
      if (evo?.rubricOverrides?.[c.key]) {
        rubricJson = JSON.stringify(evo.rubricOverrides[c.key]).replace(/'/g, "''");
      } else if (evo?.useSimplifiedRubric) {
        rubricJson = simplifiedRubric(c.max);
      } else {
        rubricJson = c.customRubric ? JSON.stringify(c.customRubric).replace(/'/g, "''") : parseRubric(c.max);
      }
      const descText = evo?.descOverrides?.[c.key] || c.desc;
      const pcDescSql = descText ? `'${escapeSql(descText)}'` : 'NULL';
      out.push(`INSERT INTO framework_criteria (id, framework_id, key, label, description, max_score, weight, color, rubric_bands, sort_order) VALUES ('${fcId}', '${fwId}', '${c.key}', '${escapeSql(cLabel)}', ${pcDescSql}, ${c.max}, ${cWeight}, '${c.color}', '${rubricJson}', ${c.sortOrder}) ON CONFLICT DO NOTHING;`);
      out.push(`INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, description, max_score, weight, color, rubric_bands, sort_order) VALUES ('${pcId}', '${pId}', '${fcId}', '${c.key}', '${escapeSql(cLabel)}', ${pcDescSql}, ${c.max}, ${cWeight}, '${c.color}', '${rubricJson}', ${c.sortOrder}) ON CONFLICT DO NOTHING;`);
      periodCrits.push({ key: c.key, max: c.max, weight: cWeight, pcId });
    });
    periodCriteriaMap[pId] = periodCrits;

    const poMap = {};
    o.outcomesData.forEach(oc => {
      const poId = uuid(`pout-${pId}-${oc.code}`);
      poMap[oc.code] = poId;
      const descSql = oc.desc ? `'${escapeSql(oc.desc)}'` : 'NULL';
      out.push(`INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, description, sort_order) VALUES ('${poId}', '${pId}', '${fwOutIdByCode[oc.code]}', '${oc.code}', '${escapeSql(oc.label)}', ${descSql}, ${oc.sortOrder}) ON CONFLICT DO NOTHING;`);
    });

    // Build effective maps: use per-period mapsOverride if defined, else fall back to template defaults.
    // Entries are keyed by critKey/outCode strings and resolved against the period-scoped ID maps above.
    const effectiveMaps = evo?.mapsOverride
      ? evo.mapsOverride.flatMap(m => m.outs.map(mo => ({
          critKey: m.crit,
          outCode: mo.code,
          weight: mo.weight != null ? mo.weight : null,
          coverType: mo.type || 'direct',
        })))
      : o.mapsData;

    effectiveMaps.forEach(m => {
      if (removedKeys.includes(m.critKey)) return;
      const pcId = pcMap[m.critKey];
      const poId = poMap[m.outCode];
      const fcId = fwCritIdByKey[m.critKey];
      const foId = fwOutIdByCode[m.outCode];
      if (!pcId || !poId || !fcId || !foId) return;
      let coverageType;
      if (evo?.mapsOverride) {
        coverageType = m.coverType; // explicit per-period mapping — use as-is
      } else {
        coverageType = idx === 0 ? m.coverType : 'direct';
        if (idx >= 2 && random() > 0.5) coverageType = 'indirect';
        else if (idx === 1 && random() > 0.8) coverageType = 'indirect';
      }
      const mWeight = m.weight != null ? m.weight : 'NULL';
      // period_criterion_outcome_maps: snapshot for analytics (uses period_outcome_id)
      const pmId = uuid(`pmap-${pId}-${m.critKey}-${m.outCode}`);
      out.push(`INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, coverage_type, weight) VALUES ('${pmId}', '${pId}', '${pcId}', '${poId}', '${coverageType}', ${mWeight}) ON CONFLICT DO NOTHING;`);
      // framework_criterion_outcome_maps: authoritative mappings edited on Outcomes page (uses framework_outcome_id)
      const fmId = uuid(`fcmap-${pId}-${m.critKey}-${m.outCode}`);
      out.push(`INSERT INTO framework_criterion_outcome_maps (id, framework_id, period_id, criterion_id, outcome_id, coverage_type, weight) VALUES ('${fmId}', '${fwId}', '${pId}', '${fcId}', '${foId}', '${coverageType}', ${mWeight}) ON CONFLICT DO NOTHING;`);
    });

    periodData.push({ id: pId, org: o.code, isCur: isCurrent, histIdx: idx, start: d.start, end: d.end, name: d.name, evalDay, evalDays, s: d.s });
  });
});
out.push('');

// ═══════════════════════════════════════════════════════════════
// PROJECTS — expanded pools with descriptions
// ═══════════════════════════════════════════════════════════════

out.push(`-- Projects`);

const projectPools = {
  'TEDU-EE': {
    0: [
      {t:'FPGA-Based Real-Time Signal Processing for 5G NR',arch:'star',desc:'Implements a pipelined OFDM receiver on a Xilinx Zynq FPGA targeting 3GPP Release 17 numerology. Achieves sub-millisecond latency for channel estimation, equalization, and LDPC decoding with measured throughput exceeding 1.2 Gbps.'},
      {t:'Low-Power IoT Sensor Network for Smart Agriculture',arch:'solid',desc:'Deploys a LoRaWAN mesh of custom-designed soil-moisture and microclimate sensors across a 2-hectare test field. The STM32-based nodes achieve 18-month battery life through duty-cycled sampling and adaptive transmission intervals.'},
      {t:'Autonomous Drone Navigation with LiDAR SLAM',arch:'highvar',desc:'Integrates a Velodyne Puck LiDAR with an NVIDIA Jetson Orin for real-time 3D SLAM on a custom hexacopter. Tested in GPS-denied indoor warehouse environments with obstacle avoidance and path replanning.'},
      {t:'GaN Power Amplifier Design for Sub-6 GHz 5G',arch:'tech_strong_comm_weak',desc:'Designs and fabricates a two-stage GaN HEMT power amplifier operating at 3.5 GHz with 42 dBm output power and 68% PAE. Doherty topology enables high linearity under modulated 5G NR signals.'},
      {t:'Biomedical Signal Processing for Sleep Apnea Detection',arch:'wellrounded',desc:'Develops a wearable single-channel EEG acquisition board paired with a TinyML classifier running on an nRF5340 SoC. Detects obstructive sleep apnea events with 94% sensitivity validated against clinical polysomnography.'},
      {t:'28 GHz Phased Array Antenna for 5G NR FR2',arch:'borderline',desc:'Designs a 16-element phased array antenna operating at 28 GHz with digital beamsteering capability. Measured beam patterns show 22 dBi gain with ±60° scanning range and -15 dB sidelobe levels.'},
      {t:'Traffic Sign Recognition on Embedded Vision System',arch:'average',desc:'Implements a lightweight CNN on an STM32H7 MCU with an OV7670 camera module for real-time traffic sign classification at 10 fps. Achieves 91% accuracy on the GTSRB dataset subset.'},
      {t:'Varactor-Based RIS for Indoor Coverage Enhancement',arch:'partial',desc:'Fabricates a 10x10 varactor-based RIS operating at 5.8 GHz with electronically reconfigurable reflection phase. Demonstrates 8 dB SNR improvement in an indoor NLOS scenario.'},
    ],
    1: [
      {t:'Wearable ECG Monitor with BLE Connectivity',desc:'A compact three-lead ECG acquisition system built around the ADS1293 AFE, streaming data over BLE 5.0 to a companion mobile app for real-time arrhythmia flagging.'},
      {t:'MIMO Antenna Design for Indoor 5G Coverage',desc:'Designs a four-element MIMO patch antenna array at 3.5 GHz with envelope correlation below 0.15, targeting small-cell indoor base stations for enhanced spatial multiplexing.'},
      {t:'Solar-Powered Environmental Monitoring Station',desc:'A self-sustaining weather station combining a 20W solar panel with MPPT charging, measuring temperature, humidity, PM2.5, and UV index with hourly LoRa uploads to a cloud dashboard.'},
      {t:'Robotic Arm Control via EMG Signals',desc:'Uses surface EMG electrodes and an SVM classifier to map forearm muscle activation patterns to six-DOF robotic arm movements for prosthetic control research.'},
      {t:'Smart Grid Fault Detection Using Phasor Data',desc:'Implements a synchrophasor-based fault detection algorithm on a Raspberry Pi, processing PMU data streams to classify and localize transmission line faults within 40 ms.'},
      {t:'Power Line Communication Modem for Smart Metering',desc:'Designs an OFDM-based narrowband PLC modem compliant with ITU-T G.9903, achieving 128 kbps throughput over 500 m of low-voltage distribution cabling.'},
      {t:'Automatic License Plate Recognition with Edge AI',desc:'Deploys a YOLOv8-based plate detection and OCR pipeline on a Google Coral Edge TPU, processing 15 fps video with 97% character accuracy under varying lighting conditions.'},
      {t:'UWB Indoor Positioning for Warehouse Robotics',desc:'Implements a TWR-based UWB positioning system using DW3000 modules, achieving sub-10 cm ranging accuracy to guide autonomous mobile robots in a warehouse testbed.'},
      {t:'Piezoelectric Energy Harvester for Bridge Monitoring',desc:'Harvests vibration energy from traffic-induced bridge oscillations using a PZT bimorph cantilever array, generating sufficient power to drive a wireless strain-gauge sensor node.'},
      {t:'Gesture-Controlled Wheelchair with Depth Camera',desc:'Combines an Intel RealSense D435 depth camera with a CNN gesture classifier to enable hands-free wheelchair navigation for patients with limited upper-body mobility.'},
    ],
    2: [
      {t:'Visible Light Communication Transceiver Prototype',desc:'Builds a VLC link using high-brightness LEDs and a silicon photodiode receiver, demonstrating 10 Mbps data transfer with OOK modulation over 2 m line-of-sight.'},
      {t:'FPGA-Based Audio Effects Processor',desc:'Implements real-time reverb, chorus, and parametric EQ on an Altera Cyclone IV FPGA with 24-bit audio I/O and MIDI-controlled parameter switching.'},
      {t:'Quadcopter Stabilization with Kalman Filtering',desc:'Fuses accelerometer, gyroscope, and barometer data through an extended Kalman filter for attitude estimation, enabling stable hovering on a custom-built quadcopter frame.'},
      {t:'Thermal Imaging for Predictive Maintenance',desc:'Uses a FLIR Lepton thermal camera module interfaced with an ESP32 to detect overheating components in electrical panels, with threshold-based alerts sent to a web dashboard.'},
      {t:'Bluetooth Mesh Network for Smart Home',desc:'Creates a BLE Mesh network of smart light switches and sensors using nRF52840 modules, with a central gateway providing app-based control and scheduling.'},
      {t:'Microstrip Antenna for X-Band Radar',desc:'Designs and fabricates a 4x4 microstrip patch array on Rogers RT/duroid at 10 GHz, achieving 18 dBi gain with sidelobe levels below -20 dB for short-range radar applications.'},
      {t:'PID-Controlled Self-Balancing Robot',desc:'A two-wheeled inverted pendulum robot using an MPU6050 IMU and a tuned PID controller on an Arduino Mega, capable of maintaining balance on flat and inclined surfaces.'},
      {t:'Low-Cost EMG Board for Rehabilitation',desc:'Designs a four-channel surface EMG acquisition board with instrumentation amplifiers and a 12-bit ADC, providing real-time muscle activation feedback for physiotherapy exercises.'},
    ],
    3: [
      {t:'DC Motor Speed Control with Fuzzy Logic',desc:'Implements a Mamdani-type fuzzy logic speed controller for a 24V brushed DC motor, comparing transient response and steady-state error against a conventional PID controller.'},
      {t:'PCB Design for Portable Oscilloscope',desc:'Designs a two-channel 20 MHz portable oscilloscope around an STM32H7 MCU with a 12-bit ADC and a 3.5-inch TFT display, powered by a rechargeable LiPo battery.'},
      {t:'Home Energy Management Dashboard',desc:'Monitors household power consumption via non-invasive current clamps connected to an ESP32, displaying real-time and historical usage data on a locally hosted web dashboard.'},
      {t:'AM Radio Receiver Design and Assembly',desc:'Constructs a superheterodyne AM receiver covering the 530-1700 kHz band, using discrete transistor stages for RF amplification, mixing, IF filtering, and audio output.'},
      {t:'Temperature Controller with PIC Microcontroller',desc:'Builds a closed-loop temperature control system using a PIC18F4550, a K-type thermocouple, and a solid-state relay to regulate a heating element within ±0.5 °C.'},
      {t:'Digital Voltmeter Using Arduino and LCD',desc:'Designs a 0-30V digital voltmeter using an Arduino Nano with a resistive voltage divider and a 16x2 LCD, calibrated against a bench multimeter to ±1% accuracy.'},
    ],
  },
  'CMU-CS': {
    0: [
      {t:'GPU-Accelerated LLM Inference Engine',desc:'Builds a custom CUDA kernel library for transformer inference with continuous batching, KV-cache paging, and speculative decoding. Achieves 2.4x throughput over vLLM on a single A100 for Llama-3 70B.'},
      {t:'Privacy-Preserving Federated Learning Framework',desc:'Implements secure aggregation with additive secret sharing and per-round differential privacy for cross-silo federated learning. Evaluated on medical imaging tasks across four simulated hospital nodes.'},
      {t:'Distributed File System with Raft Consensus',desc:'A POSIX-compatible distributed file system in Rust using Raft for metadata consensus and erasure coding for data redundancy. Sustains 800 MB/s sequential write throughput on a five-node cluster.'},
      {t:'Autonomous Intersection Management via Multi-Agent RL',desc:'Trains a multi-agent PPO policy in SUMO traffic simulator where each vehicle negotiates intersection crossing without traffic lights. Reduces average delay by 47% compared to adaptive signal control.'},
      {t:'Real-Time Gesture Recognition Pipeline',desc:'Streams MediaPipe hand landmarks through a temporal convolutional network to recognize 30 ASL signs at 60 fps on a laptop GPU, with a latency budget under 33 ms end-to-end.'},
      {t:'Verifiable Computation with Zero-Knowledge Proofs',desc:'Compiles arithmetic circuits from a DSL into Groth16 proofs using the arkworks library, enabling a smart contract to verify off-chain matrix multiplication results on-chain in constant time.'},
      {t:'Neural Architecture Search for Edge Deployment',desc:'Applies a hardware-aware NAS algorithm using a latency predictor trained on Cortex-M7 profiling data, discovering CNN architectures that achieve 93% ImageNet top-5 accuracy within 50 ms inference.'},
      {t:'Decentralized Identity Verification with Blockchain',desc:'Implements a W3C Verifiable Credentials stack on Ethereum L2, allowing universities to issue tamper-proof digital diplomas that employers can verify without contacting the issuing institution.'},
      {t:'Context-Aware Code Completion Using RAG',desc:'Augments a fine-tuned CodeLlama-7B model with retrieval from the active repository using a ColBERT-based code embedder, improving single-line completion accuracy by 18% over vanilla prompting.'},
      {t:'Multi-Modal Sentiment Analysis Pipeline',desc:'Fuses text, audio, and facial expression features through a cross-modal attention transformer to predict sentiment valence on the CMU-MOSEI benchmark, achieving state-of-the-art weighted F1.'},
      {t:'Differential Privacy for Healthcare Data',desc:'Integrates the Gaussian mechanism into a SQL query engine so that analysts can run aggregate queries over patient records with a formal (epsilon, delta)-DP guarantee per query batch.'},
      {t:'Low-Latency Video Analytics for Autonomous Drones',desc:'Runs a YOLOv8-nano object detector on Jetson Orin NX with TensorRT, feeding detections into a multi-object tracker for real-time search-and-rescue person detection from a quadrotor at 30 fps.'},
    ],
    1: [
      {t:'Scalable Graph Neural Network for Drug Discovery',desc:'Trains a message-passing GNN on molecular graphs from ChEMBL to predict binding affinity, scaling to 10M compounds via mini-batch sampling on a multi-GPU setup.'},
      {t:'End-to-End Encrypted Group Messaging Protocol',desc:'Designs a group messaging protocol based on MLS (RFC 9420) with forward secrecy and post-compromise security, implemented as a Rust library with formal verification of key schedule properties.'},
      {t:'Kubernetes Autoscaler with Predictive Load Modeling',desc:'Replaces reactive HPA with an LSTM-based load predictor that pre-scales pods 5 minutes ahead of traffic spikes, reducing p99 latency violations by 62% on a production-mirrored workload.'},
      {t:'Neural Radiance Fields for Indoor Mapping',desc:'Adapts Instant-NGP for real-time indoor scene reconstruction from smartphone video, producing navigable 3D models with centimeter-level geometric accuracy for facility management use cases.'},
      {t:'Serverless Orchestration for ML Pipelines',desc:'Builds a DAG-based ML pipeline orchestrator on AWS Lambda with automatic checkpointing, retry logic, and cost-aware scheduling that reduces end-to-end training pipeline cost by 35%.'},
      {t:'Explainable AI Dashboard for Clinical Decisions',desc:'Wraps a gradient-boosted ICU mortality predictor with SHAP explanations and presents them in a clinician-friendly React dashboard, validated through a user study with 12 physicians.'},
      {t:'Type-Safe GraphQL Code Generator',desc:'Parses GraphQL schemas and operations to emit fully typed TypeScript client code with runtime validation, eliminating an entire class of API integration bugs in a 200-endpoint codebase.'},
      {t:'Adversarial Robustness Testing for CV Models',desc:'Implements PGD, AutoAttack, and patch-based adversarial attacks as a unified testing framework, benchmarking six ImageNet classifiers and quantifying certified robustness radii.'},
      {t:'Real-Time Collaborative Editing with CRDTs',desc:'Implements a Yjs-compatible CRDT engine in Rust compiled to WebAssembly, supporting concurrent text editing with 50+ simultaneous users at sub-50 ms merge latency.'},
      {t:'Automated Data Pipeline Validation Suite',desc:'Generates property-based tests for Spark ETL pipelines by inferring schema invariants from historical runs, catching 89% of data quality regressions before production deployment.'},
    ],
    2: [
      {t:'Compiler Optimization Pass for WebAssembly',desc:'Adds a loop-invariant code motion pass to a WebAssembly compiler backend, yielding 12-18% speedups on compute-intensive benchmarks from the PolyBenchC suite.'},
      {t:'P2P Video Streaming with Adaptive Bitrate',desc:'Implements WebRTC-based peer-assisted live streaming where viewers relay chunks to nearby peers, reducing origin bandwidth by 40% while maintaining adaptive bitrate quality switching.'},
      {t:'Automated Vulnerability Detection via Static Analysis',desc:'Builds a taint-analysis engine for Python that tracks user-controlled inputs through Flask routes to detect SQL injection and path traversal, evaluated on the OWASP Benchmark.'},
      {t:'Distributed Key-Value Store with Snapshot Isolation',desc:'A log-structured key-value store in Go providing snapshot isolation via MVCC, with Raft-replicated write-ahead logs and compaction, benchmarked against etcd on YCSB workloads.'},
      {t:'Program Synthesis for SQL Query Generation',desc:'Combines enumerative search with a neural ranker to synthesize SQL queries from natural language and input-output examples, achieving 78% exact-match accuracy on the Spider benchmark.'},
      {t:'Container Scheduling for Heterogeneous Clusters',desc:'Extends the Kubernetes scheduler with a constraint-satisfaction plugin that co-locates GPU and CPU workloads to maximize utilization across mixed-hardware nodes.'},
      {t:'Privacy-Preserving Recommendation Engine',desc:'Applies local differential privacy to user interaction logs before collaborative filtering, maintaining recommendation quality within 5% of the non-private baseline on MovieLens-20M.'},
      {t:'Functional Reactive UI Framework',desc:'Designs a pull-based FRP framework in Haskell compiled to JavaScript via GHCJS, with automatic incremental DOM updates and a declarative event-handling model.'},
    ],
    3: [
      {t:'Cache-Oblivious B-Tree Implementation',desc:'Implements a van Emde Boas-layout B-tree in C++ that achieves near-optimal cache behavior without knowing cache-line size, outperforming std::map by 3x on range queries.'},
      {t:'Differentially Private Query Engine',desc:'Adds a privacy budget tracker to a columnar SQL engine so each query consumes calibrated Laplace noise, enforcing a per-user cumulative epsilon across an analyst session.'},
      {t:'Lock-Free Concurrent Hash Map',desc:'Implements a split-ordered lock-free hash map in C++ using atomic CAS operations, benchmarked against tbb::concurrent_hash_map under 64-thread contention on a dual-socket server.'},
      {t:'Garbage Collector Comparison for JVM Languages',desc:'Benchmarks ZGC, Shenandoah, and G1 collectors across latency-sensitive workloads (trading engine, web server), measuring pause times, throughput, and memory footprint on JDK 21.'},
      {t:'HTTP/2 Load Balancer with Health Checks',desc:'Builds a Layer-7 HTTP/2 reverse proxy in Go with weighted round-robin, connection pooling, active health probes, and graceful draining, handling 50K concurrent streams.'},
      {t:'Interactive Debugger for WebAssembly',desc:'Extends Chrome DevTools to support source-level breakpoints, variable inspection, and call-stack navigation for Wasm modules compiled from C/Rust via DWARF debug info.'},
    ],
  },
  'TEKNOFEST': {
    0: [
      {t:'Otonom Sürü İHA Takip ve Koordinasyon Sistemi',desc:'Üç adet quadrotor İHA arasında UWB haberleşme ile formasyon uçuşu gerçekleştiren otonom sürü kontrol sistemi. Lider-takipçi algoritması ile GPS-destekli rota planlaması ve engel kaçınma entegrasyonu sağlanmıştır.'},
      {t:'Yüksek İrtifa Hibrit Roket Motoru Tasarımı',desc:'HTPB katı yakıt ve N₂O oksitleyici kullanan hibrit roket motorunun tasarımı, üretimi ve statik ateşleme testleri. Hedef itki profili 500 N olup, yanma odası basıncı ve özgül itki ölçümleri gerçekleştirilmiştir.'},
      {t:'Otonom Sualtı Aracı ile Deniz Tabanı Haritalama',desc:'ROS2 tabanlı otonom sualtı aracı (AUV) ile sonar ve stereo kamera verisi kullanarak deniz tabanı batimetri haritası oluşturma. Dalış derinliği 30 m, navigasyon DVL ve INS füzyonu ile sağlanmıştır.'},
      {t:'VTOL Sabit Kanatlı Kargo Dronu Prototipi',desc:'Tilt-rotor mekanizmalı VTOL sabit kanat platformu; 5 kg faydalı yük kapasitesiyle 60 km menzil hedeflenmiştir. Geçiş uçuşu kontrol algoritması Pixhawk 6X üzerinde doğrulanmıştır.'},
      {t:'Radar Absorban Kompozit Kaplama Geliştirme',desc:'Karbon nanotüp katkılı epoksi reçine ile X-bandı (8-12 GHz) radar absorban malzeme geliştirilmiştir. Ölçüm sonuçları -18 dB yansıma kaybı ile düşük gözlenebilirlik hedefini karşılamaktadır.'},
      {t:'İnsansız Kargo Gemisi Otonom Navigasyon Sistemi',desc:'LiDAR ve AIS verileri füzyonu ile açık denizde otonom navigasyon yapan insansız yüzey aracı. COLREG kurallarına uyumlu çarpışma önleme modülü simülasyon ortamında doğrulanmıştır.'},
      {t:'Güneş Enerjili Yüksek İrtifa İHA Prototipi',desc:'3 m kanat açıklığında güneş panelli sabit kanat İHA; MPPT şarj sistemi ve LiPo batarya ile 8 saat dayanıklılık hedefleyen yüksek irtifa gözetleme platformu.'},
      {t:'Akıllı Tarım Dronu ile Bitki Hastalığı Tespiti',desc:'Multispektral kamera taşıyan tarım dronu, NDVI analizi ve CNN tabanlı görüntü sınıflandırma ile buğday tarlalarında pas hastalığını erken tespit etmektedir.'},
      {t:'Yapay Zeka Destekli Hedef Tanıma Sistemi',desc:'Elektro-optik gimbal kamerasından alınan video akışı üzerinde YOLOv8 tabanlı gerçek zamanlı hedef tespit ve takip sistemi. Jetson AGX Orin üzerinde 25 fps işlem hızına ulaşılmıştır.'},
      {t:'Elektrikli VTOL Hava Taksisi Konsepti',desc:'İki kişilik elektrikli VTOL hava taksisi konsept tasarımı; aerodinamik analiz, batarya boyutlandırma ve şehir içi rota optimizasyonu CFD ve MATLAB simülasyonlarıyla gerçekleştirilmiştir.'},
      {t:'Otonom Mayın Tespit ve İmha Robotu',desc:'Metal dedektörü ve yer penetran radar sensörü taşıyan paletli mobil robot platformu. Otonom tarama algoritması ile 50x50 m alanda mayın tespiti ve GPS koordinat işaretleme yapılmaktadır.'},
      {t:'Karbon Fiber Gövdeli Süpersonik Model Roket',desc:'Karbon fiber kompozit gövdeli model roket; L sınıfı katı yakıt motoru ile Mach 1.2 hız hedeflenmiştir. Aerodinamik ısınma analizi ve fin flutter simülasyonları OpenRocket ile doğrulanmıştır.'},
    ],
    1: [
      {t:'Tarımsal İlaçlama için Çoklu Drone Filosu',desc:'Dört hexacopter ile koordineli tarımsal ilaçlama operasyonu; otomatik şerit paylaşımı ve dolum istasyonu yönetimi ile 50 dekarlık alan 45 dakikada tamamlanmaktadır.'},
      {t:'Sıvı Yakıtlı Model Roket ile Yükseklik Rekoru',desc:'Etanol-LOX sıvı yakıtlı model roket motoru tasarımı; basınçla besleme sistemi ve özel enjektör plakası ile 3000 m irtifa hedeflenmiştir.'},
      {t:'Otonom Yüzey Aracı ile Su Kalitesi İzleme',desc:'GPS güdümlü katamaran platformu üzerinde pH, çözünmüş oksijen ve bulanıklık sensörleri ile göl su kalitesi haritalama. Veriler LoRa ile kıyı istasyonuna aktarılmaktadır.'},
      {t:'Dikey İniş Kalkış Teslimat Dronu',desc:'Quad-tilt mekanizmalı teslimat dronu; 2 kg paket kapasitesi, mıknatıslı bırakma sistemi ve otomatik iniş pedine dönüş özellikleri ile 15 km menzil sağlamaktadır.'},
      {t:'Deniz Arama Kurtarma Dronu',desc:'Termal kamera ve can simidi bırakma mekanizması taşıyan deniz üstü arama-kurtarma İHA platformu. Rüzgar kompanzasyonlu hovering ve otomatik arama paterni uçuşu desteklenmektedir.'},
      {t:'Hafif Kompozit Yapılı Taktik Mini İHA',desc:'1.2 kg kalkış ağırlığında, el fırlatmalı sabit kanat mini İHA. Kevlar-karbon hibrit yapı ve katlanır kanat mekanizması ile sırt çantasında taşınabilir tasarım.'},
      {t:'Otonom Lojistik Quadcopter Sistemi',desc:'QR kod tabanlı iniş noktası tanıma ve yük bırakma sistemi ile donatılmış lojistik quadcopter. ArduPilot Lua script ile waypoint tabanlı çoklu teslimat görevi yönetilmektedir.'},
      {t:'Güdümsüz Roket Fin Stabilizasyonu',desc:'Model roket için pasif aerodinamik stabilizasyon amacıyla farklı fin geometrilerinin rüzgar tüneli testleri ve CFD analizleri yapılarak optimal konfigürasyon belirlenmiştir.'},
      {t:'İnsansız Yer Aracı ile Harita Çıkarma',desc:'SLAM algoritması ve stereo kamera ile iç mekan harita çıkarma yeteneğine sahip dört tekerlekli otonom kara aracı. ROS2 tabanlı navigasyon 0.5 m çözünürlüklü occupancy grid üretmektedir.'},
      {t:'Topçu Düzeltme Kanatçığı Tasarımı',desc:'Mevcut mühimmat gövdesine entegre edilebilir kanatçık kiti konsept tasarımı; servo-aktüatörlü kontrol yüzeyleri ve IMU tabanlı güdüm algoritması MATLAB ortamında simüle edilmiştir.'},
    ],
    2: [
      {t:'Güneş Enerjili Sabit Kanatlı İHA Testi',desc:'2 m kanat açıklığında esnek güneş hücresi kaplı sabit kanat İHA; uçuş testlerinde batarya ömrüne %40 katkı sağlayan güneş enerjisi entegrasyonu doğrulanmıştır.'},
      {t:'Katı Yakıtlı Roket Motor Test Düzeneği',desc:'Yük hücresi, basınç sensörü ve yüksek hızlı kamera ile donatılmış statik ateşleme test standı. K ve L sınıfı motorlar için itki eğrisi ve yanma verimi ölçümü yapılmaktadır.'},
      {t:'Sualtı Akustik Haberleşme Modemi',desc:'FSK modülasyonlu piezoelektrik transdüser tabanlı sualtı akustik modem; 500 m menzilde 1200 bps veri hızı ile AUV komut-kontrol haberleşmesi sağlamaktadır.'},
      {t:'Sabit Kanatlı İHA Otopilot Kontrol Kartı',desc:'STM32F7 tabanlı özel otopilot kartı; IMU, GPS, barometre ve pitot tüpü entegrasyonu ile sabit kanat uçuş kontrol yazılımı geliştirilmiştir.'},
      {t:'Hibrit Motor: Katı-Sıvı Yakıt Kombinasyonu',desc:'Parafin bazlı katı yakıt ve hidrojen peroksit oksitleyici kullanan hibrit motor prototipi. Regresyon hızı ve özgül itki ölçümleri ile performans karakterizasyonu yapılmıştır.'},
      {t:'FPV Yarış Dronu Engel Algılama',desc:'FPV yarış dronuna eklenen ön-bakış stereo kamera ve FPGA tabanlı derinlik haritası işlemcisi ile düşük gecikme süreli engel algılama sistemi.'},
      {t:'Küçük Uydu Fırlatma Aracı Ön Tasarım',desc:'10 kg LEO yük kapasiteli üç aşamalı katı yakıtlı fırlatma aracı ön tasarımı. Yörünge mekaniği simülasyonları ve yapısal analiz ANSYS ile tamamlanmıştır.'},
      {t:'Taktik İletişim İHA Röle Görevi',desc:'Sabit kanat İHA üzerinde radyo röle sistemi ile kesintisiz taktik haberleşme sağlayan platform. UHF ve VHF bant geçirgen anten ve otomatik frekans yönetimi entegre edilmiştir.'},
    ],
  },
  'TUBITAK-2204A': {
    0: [
      {t:'Yapay Zeka Destekli Erken Orman Yangını Tespiti',desc:'Gözetleme kamerası görüntüleri üzerinde duman ve alev tespiti yapan CNN modeli; EfficientNet-B3 omurga ile %96 doğruluk oranında erken uyarı sağlamaktadır. Yanlış alarm oranı güneş parlaması ve sis koşullarında test edilmiştir.'},
      {t:'Tarımsal Atıklardan Ağır Metal Filtreleme Membranı',desc:'Pirinç kabuğu ve fındık kabuğu biyokütlesinden sentezlenen aktif karbon membranların kurşun ve kadmiyum iyonlarına karşı adsorpsiyon kapasitesi incelenmiştir. Langmuir izotermi ile 98 mg/g kapasite belirlenmiştir.'},
      {t:'Giyilebilir Postür Düzeltme Sensörü ve Mobil Uygulaması',desc:'MPU6050 ivmeölçer ile sırt eğimini ölçen giyilebilir cihaz; eşik aşımında titreşim geri bildirimi ve günlük postür raporu sunan React Native mobil uygulamasıyla entegre çalışmaktadır.'},
      {t:'Mikroalg Biyoreaktörü ile Atmosferik CO₂ Yakalama',desc:'Chlorella vulgaris mikroalg kültürü barındıran 10 L fotobiyoreaktör ile atmosferik CO₂ yakalama verimliliği ölçülmüştür. LED aydınlatma spektrumu ve pH optimizasyonu ile günlük 2.3 g/L biyokütle üretimi sağlanmıştır.'},
      {t:'Atık Yağlardan Biyodizel Üretim Optimizasyonu',desc:'Evsel atık kızartma yağlarından bazik katalizör ile transesterifikasyon yöntemiyle biyodizel üretimi. Metanol-yağ oranı, sıcaklık ve katalizör miktarı Taguchi yöntemiyle optimize edilmiştir.'},
      {t:'Deprem Erken Uyarı Sensör Ağı Prototipi',desc:'MEMS ivmeölçer tabanlı düşük maliyetli sismik sensör düğümleri; P-dalgası algılandığında LoRa ağı üzerinden merkeze uyarı gönderen dağıtık erken uyarı sistemi prototipi.'},
      {t:'Meyve Olgunluk Tespiti için Hiperspektral Görüntüleme',desc:'400-1000 nm aralığında hiperspektral kamera ile domates olgunluk seviyesinin tahribatsız tespiti. PLS-DA sınıflandırıcı ile dört olgunluk aşaması %93 doğrulukla ayırt edilmiştir.'},
      {t:'Su Kirliliğinin Yapay Zeka ile İzlenmesi',desc:'Nehir yüzeyinden alınan drone görüntülerinde yağ tabakası ve atık birikimi tespiti yapan segmentasyon modeli. U-Net mimarisi ile piksel bazında %91 IoU değerine ulaşılmıştır.'},
      {t:'Grafen Katkılı Beton Dayanıklılık Analizi',desc:'Çimento karışımına farklı oranlarda grafen oksit eklenerek basınç dayanımı, eğilme mukavemeti ve su geçirgenliği testleri yapılmıştır. %0.05 katkı oranında basınç dayanımı %28 artmıştır.'},
      {t:'Otonom Böcek Robot ile Mikro-Tozlaşma',desc:'Sera ortamında çiçek tozlaşmasını taklit eden 8 cm boyutunda mikro robot; titreşim motoru ile polen transfer mekanizması ve kızılötesi çiçek algılama sistemi entegre edilmiştir.'},
    ],
    1: [
      {t:'Arı Kolonisi Sağlığı İzleme Sistemi',desc:'Kovan içi sıcaklık, nem ve ses seviyesi verilerini toplayan IoT sensör sistemi; makine öğrenmesi ile ana arı kaybı ve varroa enfestasyonu erken uyarısı sağlamaktadır.'},
      {t:'Biyobozunur Plastik Üretiminde Mısır Nişastası',desc:'Mısır nişastası ve gliserol karışımından termoplastik nişasta film üretimi; çekme mukavemeti, su buharı geçirgenliği ve toprakta bozunma hızı testleri ile karakterizasyon yapılmıştır.'},
      {t:'Toprak Neminin Yapay Zeka ile Tahmini',desc:'Kapasitif toprak nemi sensörleri ve meteoroloji verisi kullanarak LSTM modeli ile 72 saatlik toprak nemi tahmini; sulama zamanlaması optimizasyonu hedeflenmiştir.'},
      {t:'Göl Ekosistemlerinde Mikroplastik Analizi',desc:'Ankara çevresindeki üç gölden alınan su ve sediman örneklerinde mikroplastik konsantrasyonu ve polimer tipi FTIR spektroskopisi ile belirlenmiştir.'},
      {t:'Güneş Paneli Temizleme Robotu',desc:'Güneş paneli yüzeyinde otonom hareket eden raylı temizleme robotu; fırça ve basınçlı hava sistemiyle toz ve kuş pisliği temizliği yaparak panel verimini %12 artırmaktadır.'},
      {t:'Propolis Antibiyotik Araştırması',desc:'Farklı coğrafi bölgelerden toplanan propolis örneklerinin Staphylococcus aureus ve E. coli üzerindeki antimikrobiyal etkinliği disk difüzyon yöntemiyle karşılaştırılmıştır.'},
      {t:'Yenilenebilir Enerji Hibrit Modelleme',desc:'Güneş ve rüzgar enerjisi verilerini birleştiren hibrit enerji sistemi HOMER Pro ile modellenmiş; Ankara koşullarında optimum panel-türbin oranı ve batarya kapasitesi belirlenmiştir.'},
      {t:'Kentsel Isı Adası Uydu Analizi',desc:'Landsat-8 termal bant uydu görüntüleri ile İstanbul kentsel ısı adası etkisinin 2015-2025 yılları arasındaki değişimi NDVI ve yüzey sıcaklığı korelasyonu ile analiz edilmiştir.'},
    ],
    2: [
      {t:'Güneş Paneli Verimlilik Artırma Kaplaması',desc:'TiO₂ nanopartikül katkılı anti-reflektif kaplama ile güneş paneli cam yüzeyinde ışık geçirgenliği artırılmış; %3.5 verimlilik kazanımı ölçülmüştür.'},
      {t:'Su Arıtmada Doğal Zeolitlerin Kullanımı',desc:'Gördes zeolit yataklarından elde edilen doğal klinoptilolitin amonyum ve ağır metal iyonlarını adsorpsiyon kapasitesi kolon deneyleriyle belirlenmiştir.'},
      {t:'Sürdürülebilir Ambalaj Malzemesi Geliştirme',desc:'Kitosan ve jelatin bazlı biyobozunur film; zerdeçal ekstraktı katkısıyla antimikrobiyal özellik kazandırılmış, gıda ambalajında raf ömrü uzatma potansiyeli test edilmiştir.'},
      {t:'Hava Kalitesi İzleme Sensörü Tasarımı',desc:'MQ serisi gaz sensörleri ve PM2.5 lazer sensörü ile Arduino tabanlı taşınabilir hava kalitesi ölçüm cihazı; veriler SD karta kaydedilip web arayüzünde görselleştirilmektedir.'},
      {t:'Bitki Büyüme ve LED Spektrumu İlişkisi',desc:'Kırmızı, mavi ve beyaz LED kombinasyonlarının marul büyüme hızı, yaprak alanı ve klorofil içeriği üzerindeki etkisi kontrollü sera ortamında 45 günlük deney ile incelenmiştir.'},
      {t:'Yağmur Suyu Hasadı ve Arıtım Sistemi',desc:'Çatı yüzeyinden toplanan yağmur suyunun kum-çakıl filtrasyon ve UV dezenfeksiyon ile arıtılarak sulama ve tuvalet suyu olarak kullanılabilirliği test edilmiştir.'},
    ],
  },
  'IEEE-APSSDC': {
    0: [
      {t:'Phased Array Antenna for 28 GHz mmWave 5G',desc:'A 16-element patch phased array on Rogers RO4003C with corporate feed network and 5-bit digital phase shifters, achieving ±45° beam scanning with 22 dBi peak gain at 28 GHz.'},
      {t:'Wearable UHF RFID Tag Antenna for Patient Tracking',desc:'A flexible dipole-based RFID tag antenna printed on Kapton substrate, designed to operate on the human body at 915 MHz with a read range exceeding 5 m despite body-loading effects.'},
      {t:'Dual-Band Circularly Polarized Patch for GPS/GLONASS',desc:'A stacked patch antenna providing RHCP at L1 (1575 MHz) and L2 (1227 MHz) with axial ratio below 2 dB across both bands, intended for precision agriculture GNSS receivers.'},
      {t:'Metamaterial Absorber for Radar Cross-Section Reduction',desc:'A polarization-insensitive metamaterial absorber using resistively loaded split-ring resonators, achieving greater than 90% absorption from 8 to 12 GHz for RCS reduction applications.'},
      {t:'Reconfigurable Metasurface for Beam Steering',desc:'A 1-bit reconfigurable intelligent surface with PIN-diode-switched unit cells at 5.8 GHz, electronically steering a reflected beam over ±60° with measured 1.5 dB scanning loss.'},
      {t:'Textile-Integrated Antenna Array for Body Area Networks',desc:'A two-element conductive-thread antenna array embroidered into a polyester sports shirt, operating at 2.45 GHz for WBAN with -15 dB mutual coupling despite close inter-element spacing.'},
      {t:'Frequency-Tunable Slot Antenna Using Varactor Diodes',desc:'A CPW-fed slot antenna whose resonant frequency tunes continuously from 2.2 to 3.8 GHz via reverse-biased varactor loading, covering LTE bands 1 through 7 with a single aperture.'},
      {t:'SIW-Based Diplexer for TX-RX Systems',desc:'A substrate-integrated-waveguide diplexer at 24/28 GHz for full-duplex mmWave front-ends, fabricated on a single Rogers 5880 layer with better than 35 dB TX-RX isolation.'},
      {t:'Millimeter-Wave Lens Antenna for Automotive Radar',desc:'A 3D-printed dielectric lens with gradient-index profile illuminated by an open-ended waveguide at 77 GHz, producing a 3° pencil beam with 28 dBi gain for long-range automotive radar.'},
      {t:'Fractal Antenna for Ultra-Wideband Applications',desc:'A Minkowski-island fractal monopole printed on FR-4, covering 3.1 to 10.6 GHz with VSWR below 2:1 and a compact footprint 40% smaller than a conventional UWB disc monopole.'},
    ],
    1: [
      {t:'Reconfigurable FSS for 5G Shielding',desc:'A frequency-selective surface with PIN-diode-switchable unit cells that toggles between pass and stop states at 3.5 GHz, enabling on-demand electromagnetic shielding for secure rooms.'},
      {t:'Compact MIMO Antenna for Sub-6 GHz Handsets',desc:'A four-port MIMO antenna occupying 150x75 mm using orthogonal slot modes to achieve ECC below 0.05 across 3.3-3.8 GHz for 5G smartphone integration.'},
      {t:'SIW Filter for Ka-Band',desc:'A fourth-order Chebyshev bandpass filter implemented in SIW at 26 GHz with 800 MHz bandwidth, 1.2 dB insertion loss, and 25 dB rejection at ±1.5 GHz offset.'},
      {t:'Broadband Log-Periodic for EMC Testing',desc:'A printed log-periodic dipole array covering 200 MHz to 6 GHz for pre-compliance EMC measurements, with calibrated gain data traceable to a reference horn antenna.'},
      {t:'MIMO Antenna for Wi-Fi 6E Access Points',desc:'An eight-port ceiling-mount MIMO antenna covering 5.925-7.125 GHz (Wi-Fi 6E) with dual-polarized patch elements and port-to-port isolation exceeding 22 dB.'},
      {t:'Circularly Polarized Horn for Satellite Comm',desc:'A corrugated conical horn antenna with septum polarizer producing RHCP at Ku-band (12.5 GHz) with 0.5 dB axial ratio and 20 dBi gain for VSAT ground terminals.'},
      {t:'Implantable Antenna for Deep Tissue Biotelemetry',desc:'A miniaturized PIFA operating in the MedRadio band (401-406 MHz) encapsulated in biocompatible silicone, with link-budget analysis for 10 mm implant depth in muscle tissue.'},
      {t:'Dual-Polarized Base Station Antenna',desc:'A wideband dual-polarized cross-dipole antenna element for macro base stations covering 1.7-2.7 GHz with ±45° slant polarization, 65° HPBW, and 17 dBi gain.'},
    ],
    2: [
      {t:'Dielectric Resonator Antenna for mmWave Imaging',desc:'A cylindrical dielectric resonator antenna excited in the HEM11 mode at 60 GHz, achieving 12 dBi gain and 18% impedance bandwidth for short-range imaging applications.'},
      {t:'Flexible Inkjet-Printed Antenna for Wearable IoT',desc:'A silver-nanoparticle inkjet-printed meander-line antenna on PET film, resonating at 2.45 GHz with -12 dBi gain, surviving 500 bend cycles to a 15 mm radius.'},
      {t:'Patch Antenna Array for 24 GHz Doppler Radar',desc:'A 2x4 series-fed patch array on Rogers 5880 for K-band CW Doppler radar, providing 18 dBi gain with a fan beam for traffic speed measurement.'},
      {t:'Wearable Antenna for UHF Emergency Comm',desc:'A flexible inverted-F antenna integrated into a firefighter jacket collar, operating at 430 MHz with ground-plane independence verified through on-body measurements.'},
      {t:'Compact Loop Antenna for NFC/WPT',desc:'A planar spiral-loop antenna at 13.56 MHz optimized for simultaneous NFC data transfer and 2W wireless power transfer to wearable medical devices.'},
      {t:'Printed Yagi-Uda for Direction Finding',desc:'A five-element printed Yagi-Uda at 900 MHz with 9 dBi gain and 50° HPBW, used as the element in a four-quadrant DF array for wildlife VHF collar tracking.'},
    ],
  },
  'CANSAT': {
    0: [
      {t:'Autogyro Descent and Precision Landing System',desc:'Replaces the traditional parachute with a folding autogyro rotor blade assembly that deploys at apogee. Achieves a controlled 5 m/s descent rate with GPS-guided heading corrections targeting a 10 m landing circle.'},
      {t:'Dual-Redundant Telemetry with LoRa Failover',desc:'Primary telemetry uses 915 MHz FSK at 19.2 kbps; a secondary LoRa channel activates automatically if packet loss exceeds 20%, ensuring continuous data downlink throughout the 600 m descent.'},
      {t:'Multi-Sensor Atmospheric Profiling Payload',desc:'Carries BME680, SCD41, and UV-B sensors to build a vertical atmospheric profile of temperature, humidity, CO₂, and UV irradiance from 700 m AGL to ground, sampled at 10 Hz.'},
      {t:'Deployable Aerobrake Heat Shield Demonstrator',desc:'A spring-loaded deployable drag device made from Nomex fabric and carbon-fiber ribs, demonstrating controlled deceleration from 30 m/s to 8 m/s within the first 200 m of descent.'},
      {t:'Split-Body CanSat with Wireless Inter-Module Telemetry',desc:'The CanSat separates at apogee into a sensor pod and a gliding recovery vehicle, communicating via a 2.4 GHz radio link. Both modules transmit independent telemetry to the ground station.'},
      {t:'GNSS-Denied Navigation Using Barometric-IMU Fusion',desc:'Demonstrates position estimation during simulated GPS jamming by fusing barometric altitude, 9-DOF IMU data, and a terrain-referenced navigation algorithm with 15 m CEP accuracy.'},
      {t:'Thermal Imaging Mission for Wildfire Detection',desc:'Mounts a FLIR Lepton 3.5 thermal camera to detect ground hotspots during descent, processing thermal frames on an RP2040 to flag anomalies and geotag them with concurrent GPS fixes.'},
      {t:'Controlled Descent Using Active Fin Steering',desc:'Four servo-actuated fins provide roll and pitch control during parachute descent, guided by a PID controller tracking GPS waypoints to steer the CanSat toward a designated landing zone.'},
      {t:'Radiation Dosimetry for High-Altitude Profiling',desc:'A Geiger-Muller tube and SiPM-based scintillator measure ionizing radiation dose rate from launch to landing, building a vertical dose profile relevant to aviation and balloon missions.'},
      {t:'AI-Powered Image Classification During Descent',desc:'A downward-facing camera captures terrain images during descent, classified on-board by a TensorFlow Lite model into land-cover categories (vegetation, water, urban, bare soil) and transmitted in real time.'},
    ],
    1: [
      {t:'Parafoil Guided Recovery with GPS Waypoints',desc:'A ram-air parafoil with servo-controlled brake toggles guides the CanSat through four GPS waypoints during descent, achieving a 25 m landing accuracy in field tests.'},
      {t:'Solar-Powered Secondary Mission: UV Index Mapping',desc:'Thin-film solar cells supplement the battery during descent while a VEML6075 UV sensor maps UV-A and UV-B intensity at 5 m altitude increments for atmospheric research.'},
      {t:'Deployable Boom Magnetometer Suite',desc:'A 30 cm spring-loaded boom extends after ejection to distance a fluxgate magnetometer from the CanSat electronics, measuring geomagnetic field variation with 10 nT resolution.'},
      {t:'Hydrogen Fuel Cell Ground Recovery Vehicle',desc:'A PEM fuel-cell-powered rover navigates to the CanSat landing coordinates using GPS, retrieves the payload, and returns to the launch site autonomously.'},
      {t:'Dual-Camera Stereoscopic Terrain Mapping',desc:'Two synchronized OV5640 cameras capture stereo image pairs during descent, processed on the ground into a 3D point cloud for terrain reconstruction of the landing area.'},
      {t:'CanSat-to-CanSat Mesh Communication',desc:'Two CanSats launched in sequence form a 900 MHz mesh relay, extending telemetry range by 60% and demonstrating multi-node swarm communication for future missions.'},
      {t:'Biodegradable Structure CanSat Design',desc:'The airframe is constructed from PLA and mycelium composite panels that fully biodegrade within 90 days, addressing environmental concerns for CanSats that cannot be recovered.'},
      {t:'Acoustic Wind Profiling Payload',desc:'Four MEMS microphones arranged in a tetrahedral array measure wind speed and direction during descent via time-of-arrival acoustic anemometry, providing 1 Hz wind profiles.'},
    ],
    2: [
      {t:'Maple-Seed Inspired Passive Descent Vehicle',desc:'A single-blade autorotation design inspired by maple samaras achieves a stable 4 m/s descent without active control, with the spin rate providing attitude stabilization.'},
      {t:'Ground Station with Real-Time 3D Trajectory',desc:'A Python/Qt ground station application receives 10 Hz telemetry and renders the CanSat trajectory in a 3D map view with altitude, velocity, and orientation overlays.'},
      {t:'Glider Recovery with Autonomous Steering',desc:'The CanSat transitions to a fixed-wing glider configuration after parachute release, autonomously steering toward the launch site using proportional navigation guidance.'},
      {t:'LoRa Long-Range Telemetry Ground Station',desc:'A high-gain Yagi antenna and LoRa receiver achieve reliable telemetry reception at 8 km range using spreading factor 10 at 868 MHz with forward error correction.'},
      {t:'Atmospheric Particulate Matter Sampling',desc:'A miniature impactor sampler collects PM2.5 and PM10 particles on adhesive substrate during descent, analyzed post-flight under a microscope for morphology and composition.'},
      {t:'Parachute Deployment Optimization via ML',desc:'A random-forest model trained on 200 simulation runs predicts optimal parachute deployment altitude based on real-time wind and descent-rate data, minimizing landing dispersion.'},
    ],
  },
};

const orgAdvisors = {
  'TEDU-EE': [{n:'Prof. Turgut Ercan',aff:'TED University, EE'},{n:'Dr. Ece Aydoğan',aff:'TED University, EE'},{n:'Prof. Cengiz Yalın',aff:'TED University, EE'},{n:'Dr. Aylin Seçkin',aff:'TED University, EE'},{n:'Prof. Tarık Özmen',aff:'TED University, EE'},{n:'Dr. Seda Bayraktar',aff:'TED University, EE'}],
  'CMU-CS': [{n:'Prof. David Patterson',aff:'Carnegie Mellon, SCS'},{n:'Dr. Lisa Chen',aff:'Carnegie Mellon, SCS'},{n:'Prof. Robert Singh',aff:'Carnegie Mellon, ECE'},{n:'Dr. Amanda Torres',aff:'Carnegie Mellon, LTI'},{n:'Prof. Michael Hoffman',aff:'Carnegie Mellon, ISR'},{n:'Dr. Karen White',aff:'Carnegie Mellon, SCS'}],
  'TEKNOFEST': [{n:'Prof. Serhat Öztürk',aff:'İTÜ, Uçak Mühendisliği'},{n:'Dr. Fatma Korkmaz',aff:'ODTÜ, Havacılık'},{n:'Prof. Murat Yıldız',aff:'İTÜ, Makina Mühendisliği'},{n:'Dr. Zehra Aksoy',aff:'YTÜ, Mekatronik'},{n:'Prof. Hakan Güneş',aff:'Boğaziçi, Elektrik Müh.'},{n:'Dr. Canan Eriş',aff:'Eskişehir Teknik, Havacılık'}],
  'TUBITAK-2204A': [{n:'Dr. Merve Yıldırım',aff:'Ankara Fen Lisesi'},{n:'Selin Karadeniz',aff:'İstanbul Atatürk Fen Lisesi'},{n:'Ahmet Çelik',aff:'İzmir Fen Lisesi'},{n:'Dr. Burcu Eren',aff:'ODTÜ GV Lisesi'},{n:'Mehmet Kaya',aff:'Galatasaray Lisesi'}],
  'IEEE-APSSDC': [{n:'Prof. Harold Kim',aff:'U. Michigan, ECE'},{n:'Dr. Sarah Novak',aff:'Georgia Tech, ECE'},{n:'Prof. Wei Zhang',aff:'UCLA, EE'},{n:'Dr. Anita Patel',aff:'Purdue, ECE'},{n:'Prof. Gregory Harmon',aff:'Ohio State, ECE'}],
  'CANSAT': [{n:'Prof. Richard Kline',aff:'Virginia Tech, Aerospace'},{n:'Dr. Samantha Ford',aff:'MIT, AeroAstro'},{n:'Prof. Douglas Park',aff:'CU Boulder, Aerospace'},{n:'Dr. Yuki Tanaka',aff:'Caltech, GALCIT'},{n:'Prof. Brian Caldwell',aff:'Purdue, AAE'}],
};

const namesTr = [
  'Tolga Erim','Melis Kavak','Ozan Çelebi','Ezgi Doruk','Caner Turgut','Aslı Tezcan','Berk Gündüz','Ceyda Vural',
  'Korhan Alkan','Sinem Uslu','Arda Keçeci','Zeynep Gül','Baran Tekin','Kübra Şen','Mert Çakır','İrem Demirci',
  'Hakan Kurt','Elif Yılmaz','Sinan Koç','Ece Yıldırım','Yiğit Polat','Damla Kılıç','Kaan Avcı','Büşra Doğan',
  'Alperen Turan','Rüya Işık','Emre Baş','Gizem Aksoy','Serkan Taşkın','Deniz Ünal','Onur Çelik','Selin Akay',
  'Burak Aslan','Beren Yücel','Kerem Arıcan','Esra Kaya','Umut Şahin','Ceren Erdoğan','Eren Güler','Tuğçe Can',
  'Doğukan Arslan','Nisa Öztürk','Barış Yıldız','Cansu Demir','Furkan Polat','Hazal Koç','Tuna Bakır','Merve Karaca',
  'Alp Sönmez','Defne Çetin','Oğuzhan Kara','Pelin Aydın','Efe Güneş','Nehir Tosun','Berke Şimşek','İlayda Başaran',
  'Doruk Acar','Cemre Uçar','Taylan Ergin','Yağmur Tunç','Adem Yılmaztürk','Sevval Kaplan','Cenk Duman','Beyza Güler',
  'Batuhan Koçak','Dilan Aktaş','Kutay Erdal','Betül Sezer','Çağrı Özkan','Zehra Kurt','Görkem Taş','Eylül Özdemir',
  'Volkan Arı','Sude Bulut','Alihan Topçu','Irmak Genç','Oğuz Balcı','Havva Keskin','Atakan Yavuz','Melisa Tuncer',
  // ── expanded pool (81-180) ──
  'Taner Özen','Dicle Arslan','Kağan Erdem','Naz Tunalı','İlker Durmaz','Sıla Yılmazer','Berkay Kuruç','Melike Savaş',
  'Altan Çevik','Peri Ergin','Sergen Koray','Duygu Başak','Tunahan Korkut','Azra Evren','Rıdvan Taş','Ebru Gökçe',
  'Fatih Tezel','Nur Akdeniz','Selçuk Taner','İpek Sarıca','Emrah Polat','Berra Yılmaz','Oktay Çınar','Simge Kalkan',
  'Yunus Emre Boz','Aslıhan Coşkun','Gökhan Kılınç','Tuğba Erdem','Semih Karataş','Ceylin Aydoğan','Levent Dursun','Ebrar Korkmaz',
  'Ulaş Sevinç','Nil Akyüz','Bartu Güney','Hande Polat','Turgay Keskin','Müge Çelik','Oğulcan Demirel','Elif Naz Balcı',
  'Koray Sert','Mina Kaplan','Tayfun Aydın','Derin Alkan','Batıkan Sevim','Ada Toprak','Umutcan Demir','Şevval Güneş',
  'Halil Ercan','Burcu Deniz','Erdem Uzun','Bengisu Işık','Polat Çetin','Gökçen Aksoy','Veysel Kara','Ülkü Tuncer',
  'Mazhar Özdemir','Yaren Uçar','Baturalp Koç','Nihan Sezer','Gürkan Ateş','Pınar Şahin','Akın Bulut','Sibel Acar',
  'Buğra Soydan','İnci Tokgöz','Utku Erdem','Sena Yücel','Ege Duran','Bilge Karakuş','Tarık Arslan','Melis Denizhan',
  'Canberk Yıldız','Dila Öztürk','Serhat Çakır','Azra Beyaz','Doğan Eren','Fulya Kozan','Cem Turgut','İdil Akbaş',
  'Kenan Bozkaya','Burcu Tan','Alper Bayraktar','Şule Ergün','Oktay Başaran','Derya Sönmez','Haluk Güler','Rana Keskin',
  'Barın Çelik','Ezgi Nur Kavak','Taygun Arıkan','Neslihan Koray','Özgür Baran','Feride Aktaş','Volkan Demir','Candan Yıldız',
  'Utkan Gökmen','Melodi Tuncel'
];
const namesEn = [
  'Elias Boyd','Clara Dawson','Miles Cunningham','Sophie Clarke','Nolan Davies','Maya Jenkins','Julian Hayes','Eva Harding',
  'Leo Gallagher','Tessa Rowan','Adam Bennett','Hazel Foster','Cole Harrison','Lucy Brooks','Dylan Reed','Aurora Price',
  'Ethan Ward','Stella Myers','Connor Ross','Zoe Powell','Lucas Sullivan','Grace Kelly','Mason Bell','Ruby Murphy',
  'Logan Bailey','Lily Cooper','Caleb Richardson','Mia Howard','Nathan Cox','Chloe Ward','Isaac Perez','Emma Peterson',
  'Owen Gray','Avery James','Wyatt Watson','Ella Brooks','Jack Kelly','Aria Sanders','Ryan Price','Scarlett Wood',
  'Liam Fletcher','Olivia Chen','Noah Patterson','Amelia Wright','Henry Torres','Charlotte Kim','Samuel Rivera','Harper Morgan',
  'Benjamin Cruz','Abigail Reeves','Theodore Grant','Eleanor Marsh','Sebastian Cross','Victoria Hale','Daniel Frost','Penelope Blake',
  'Alexander Dunn','Layla Stone','Matthew Doyle','Isla Webb','James Thornton','Violet Keane','Andrew Holden','Naomi Swift',
  'Patrick Rowe','Sophia Linden','Christopher Vale','Alice Brennan','Gabriel Locke','Hannah Pratt','Dominic Hurst','Madeline Ford',
  'Vincent Crane','Piper York','Marcus Shore','Sienna West','Oscar Quinn','Jade Sinclair','Felix Palmer','Willow Drake',
  // ── expanded pool (81-180) ──
  'Declan Holt','Iris Mercer','Tristan Blake','Cassidy Wren','Spencer Leigh','Margot Frey','Reid Calloway','Selene Ashford',
  'Griffin Hale','Tatum Pierce','Jasper Voss','Freya Langston','Ronan Kirby','Briar Sutton','Beckett Thorne','Celia Graves',
  'Sawyer Pace','Gemma Whitlock','Rhys Davenport','Keira Stanton','Brooks Aldridge','Maren Kingsley','Colton Sawyer','Neve Cassidy',
  'Jensen Holt','Willa Prescott','Emmett Lawson','Darcy Irvine','Callum Harding','Alina Frost','Fletcher Byrne','Rosalie Grant',
  'Anders Vance','Maeve Alcott','Quinn Radley','Celeste Whitmore','Nolan Gage','Leona Stratton','Davis Carver','Faye Alderman',
  'Everett Moon','Thea Langford','Sterling Cain','Brynn Ellery','Finley Archer','Marlowe Stein','Kieran Blake','Dahlia Novak',
  'Vaughn Kelley','Elowen Chase','Barrett Fox','Sage Beaumont','Royce Hendrix','Lyra Pemberton','Dillon Kane','Tessa Marlow',
  'Conrad Wells','Ivy Sheridan','Lennox Gray','Harlow Sinclair','Pierce Dalton','Elise Whitfield','Beau Garrett','Ada Carrington',
  'Sullivan Drake','Wren Ellsworth','Hayes Drummond','Nora Kingsley','Landon Howe','Camille Darrow','Calder Shaw','Junia Phelps',
  'Thatcher Lyle','Elodie Kincaid','Holden Sharpe','Mabel Trent','Keaton Voss','Brielle Osborn','Corbin Wolfe','Lena Fairchild',
  'Silas Hartley','June Holbrook','Graham Henley','Esme Darling','Porter Haines','Nadia Glenn','Merrick Towne','Lydia Campion',
  'Cedric Rush','Odette Marsh','Burke Linton','Clarity Vane','Ronan Blackwell','Winona Steele','Ellis Greer','Tamsin Hale',
  'Desmond Pryor','Astrid Lyons'
];

const _usedTr = new Set(), _usedEn = new Set();
function genMembers(count, lang) {
  const used = lang === 'tr' ? _usedTr : _usedEn;
  const pool = lang === 'tr' ? namesTr : namesEn;
  const avail = pool.filter(n => !used.has(n));
  const shuffled = [...avail].sort(() => random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  picked.forEach(n => used.add(n));
  return JSON.stringify(picked.map((n, i) => ({name: n, order: i+1}))).replace(/'/g, "''");
}

let projList = [];
periodData.forEach(pd => {
  // Reset per-period so names are unique within a period but can repeat across semesters
  _usedTr.clear(); _usedEn.clear();
  const o = orgs.find(x => x.code === pd.org);
  const count = projCountForOrgIdx(pd.org, pd.histIdx);
  const pool = (projectPools[pd.org] || {})[pd.histIdx] || [];
  const archs = archForCount(count);
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const pjId = uuid(`proj-${pd.id}-${i}`);
    const entry = typeof pool[i] === 'object' ? pool[i] : { t: pool[i] };
    const title = entry.t;
    const arch = entry.arch || archs[i % archs.length];
    // Weighted advisor distribution: some advisors get 2-3 projects, others get 1
    // ~30% of projects (i % 3 === 0) get two advisors (comma-separated)
    const advPool = orgAdvisors[pd.org] || [];
    let advisorName, advisorAff;
    if (advPool.length >= 2 && i % 3 === 0) {
      const idx1 = Math.floor(i * advPool.length / count);
      const idx2 = (idx1 + 1) % advPool.length;
      advisorName = `${advPool[idx1].n}, ${advPool[idx2].n}`;
      advisorAff  = `${advPool[idx1].aff}, ${advPool[idx2].aff}`;
    } else {
      const adv = advPool.length > 0 ? advPool[Math.floor(i * advPool.length / count)] : {n:'TBD',aff:'TBD'};
      advisorName = adv.n;
      advisorAff  = adv.aff;
    }
    const mem = genMembers(randInt(3, 5), o.lang);
    const desc = entry.desc || '';
    out.push(`INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation, description) VALUES ('${pjId}', '${pd.id}', '${escapeSql(title)}', ${i+1}, '${mem}', '${escapeSql(advisorName)}', '${escapeSql(advisorAff)}', '${escapeSql(desc)}') ON CONFLICT DO NOTHING;`);
    projList.push({id: pjId, pId: pd.id, org: pd.org, isCur: pd.isCur, arch, title});
  }
});
out.push('');

// ═══════════════════════════════════════════════════════════════
// JURORS — expanded roster (~68)
// ═══════════════════════════════════════════════════════════════

out.push(`-- Jurors and Auth`);
function jurorEmail(name) {
  return name.replace(/^(Prof\.|Dr\.|Col\.|Maj\.)\s*/i, '').trim().toLowerCase().replace(/\s+/g, '.').replace(/[şŞ]/g,'s').replace(/[çÇ]/g,'c').replace(/[ğĞ]/g,'g').replace(/[ıİ]/g,'i').replace(/[öÖ]/g,'o').replace(/[üÜ]/g,'u').replace(/[â]/g,'a') + '@vera-eval.app';
}

const orgJurors = {
  // ~65% TEDU affiliation (12/18), rest external
  'TEDU-EE': [
    {n:'Prof. Cihan Akpınar',aff:'TED University, EE'},{n:'Dr. Aslıhan Koçak',aff:'TED University, EE'},{n:'Prof. Ferit Atasoy',aff:'TED University, EE'},
    {n:'Dr. Pınar Dalkılıç',aff:'TED University, CE'},{n:'Dr. Serap Gündoğdu',aff:'TED University, EE'},{n:'Prof. Orhan Sezgin',aff:'TED University, EE'},
    {n:'Dr. Nihan Ersoy',aff:'TED University, EE'},{n:'Dr. Alper Kılıç',aff:'TED University, EE'},{n:'Prof. Dilek Ünver',aff:'TED University, EE'},
    {n:'Dr. Emrah Kartal',aff:'TED University, Physics'},{n:'Prof. Zehra Kaygısız',aff:'TED University, EE'},{n:'Dr. Gökçe Tezcan',aff:'TED University, CE'},
    // external jurors (~35%)
    {n:'Engin Boztepe',aff:'Aselsan, RF Systems'},{n:'Yasin Erimbaş',aff:'TÜBİTAK BİLGEM'},{n:'Prof. Murat Aksoy',aff:'METU, EE'},
    {n:'Dr. Hülya Çevik',aff:'Bilkent University, EE'},{n:'Prof. Tarkan Erdoğan',aff:'Hacettepe University, EE'},{n:'Dr. Selim Bayraktar',aff:'Sabancı University, EE'},
  ],
  // ~65% CMU affiliation (12/18), rest external
  'CMU-CS': [
    {n:'Prof. Simon Caldwell',aff:'Carnegie Mellon, SCS'},{n:'Fiona Mercer',aff:'Carnegie Mellon, Robotics'},{n:'Prof. Jennifer Hayes',aff:'Carnegie Mellon, SCS'},
    {n:'Dr. Rajesh Patel',aff:'Carnegie Mellon, ECE'},{n:'Prof. Michael Zhang',aff:'Carnegie Mellon, LTI'},{n:'Dr. Sarah Okafor',aff:'Carnegie Mellon, SCS'},
    {n:'Dr. Angela Russo',aff:'Carnegie Mellon, HCI'},{n:'Prof. David Kim',aff:'Carnegie Mellon, SCS'},{n:'Dr. Nathan Hollis',aff:'Carnegie Mellon, ECE'},
    {n:'Prof. Claire Fontaine',aff:'Carnegie Mellon, Robotics'},{n:'Dr. Brian Takahashi',aff:'Carnegie Mellon, SCS'},{n:'Dr. Emily Strauss',aff:'Carnegie Mellon, LTI'},
    // external jurors (~35%)
    {n:'Dr. Thomas Albright',aff:'MIT, CSAIL'},{n:'Nina Prescott',aff:'Google Research'},{n:'Wesley Dalton',aff:'Microsoft Research'},
    {n:'Dr. Sofia Lang',aff:'UC Berkeley, EECS'},{n:'Victor Sutton',aff:'Meta AI'},{n:'Kevin Brennan',aff:'Stripe Engineering'},
  ],
  'TEKNOFEST': [
    {n:'Prof. Kemal Özdemir',aff:'İTÜ, Havacılık ve Uzay'},{n:'Dr. Eda Sarıgül',aff:'TUSAŞ (TAI), Ar-Ge'},{n:'Onur Yalçın',aff:'Baykar Teknoloji, İHA'},
    {n:'Prof. Buse Karagöz',aff:'ODTÜ, Makina Müh.'},{n:'Cemil Demirtaş',aff:'Roketsan, Güdüm'},{n:'Dr. Aylin Çevik',aff:'TÜBİTAK SAGE'},
    {n:'Prof. Yasemin Ertürk',aff:'Eskişehir Teknik, Havacılık'},{n:'Dr. Burak Yıldırım',aff:'TÜBİTAK UZAY'},{n:'Melih Şahin',aff:'TEI, Motor Tasarım'},
    {n:'Prof. Sevim Çalışkan',aff:'İYTE, Makina Müh.'},{n:'Ahmet Günay',aff:'ASELSAN, Radar'},{n:'Dr. Gülşen Aktaş',aff:'Ankara Üni., Uzay Bilimleri'},
    {n:'Prof. Tolga Karaman',aff:'İTÜ, Elektronik Müh.'},{n:'Dr. Nazlı Demirhan',aff:'TUSAŞ (TAI), Aviyonik'},
    {n:'Dr. Caner Yıldız',aff:'Kocaeli Üni., Uzay Müh.'},{n:'Selin Arslan',aff:'HAVELSAN, Savunma Sanayi'},{n:'Prof. İlker Başaran',aff:'İTÜ, Kontrol Müh.'},
  ],
  'TUBITAK-2204A': [
    {n:'Prof. Hasan Yüksel',aff:'Boğaziçi, Fizik'},{n:'Dr. Elif Aydın',aff:'Hacettepe, Biyoloji'},{n:'Prof. Okan Birdal',aff:'Koç Üni., Kimya'},
    {n:'Dr. Sevgi Toprak',aff:'Ankara Üni., Fen Bilimleri'},{n:'Prof. Burak Çetin',aff:'ODTÜ, Matematik'},{n:'Dr. Selim Konuk',aff:'İstanbul Üni., Fizik'},
    {n:'Prof. Didem Sağır',aff:'Ege Üni., Biyokimya'},{n:'Dr. Kenan Erol',aff:'Sabancı Üni., Biyoloji'},{n:'Ayşegül Mazlum',aff:'TÜBİTAK MAM, Gıda'},
    {n:'Prof. İbrahim Yılmaz',aff:'Ankara Üni., Fizik'},{n:'Dr. Gülnaz Şen',aff:'Hacettepe, Kimya'},{n:'Prof. Erdem Tunç',aff:'ODTÜ, Biyoloji'},
    {n:'Prof. Sinan Öztürk',aff:'Bilkent, Biyoteknoloji'},{n:'Dr. Meltem Dönmez',aff:'TÜBİTAK BİLGEM'},{n:'Prof. Fatih Yaman',aff:'Gazi Üni., Fizik'},
    {n:'Dr. Cansu Polat',aff:'İTÜ, Kimya'},{n:'Prof. Uğur Sezgin',aff:'Hacettepe, Biyofizik'},
  ],
  'IEEE-APSSDC': [
    {n:'Prof. Raymond Chen',aff:'U. Michigan, ECE'},{n:'Dr. Catherine Liu',aff:'Georgia Tech, ECE'},{n:'Prof. Kenneth Walsh',aff:'UIUC, ECE'},
    {n:'Dr. Priya Raghavan',aff:'Purdue, ECE'},{n:'Prof. Diane Mitchell',aff:'Ohio State, ECE'},{n:'Dr. Akira Tanaka',aff:'U. Tokyo, EEIS'},
    {n:'Prof. Marco Rossi',aff:'Politecnico di Milano'},{n:'Dr. Fatima Al-Rashidi',aff:'KAUST, EE'},{n:'Prof. Neil Ferguson',aff:'U. Edinburgh, Engineering'},
    {n:'Dr. Soo-Jin Kim',aff:'KAIST, EE'},{n:'Prof. Carlos Mendez',aff:'U. São Paulo, EE'},{n:'Dr. Helena Lindqvist',aff:'KTH, EE'},
    {n:'Dr. Alice Bourne',aff:'Stanford, EE'},{n:'Prof. James Vickers',aff:'Arizona State, EE'},{n:'Dr. Valentina Russo',aff:'TU Delft, EE'},
    {n:'Prof. Ibrahim Hassan',aff:'Cairo U., Electronics'},{n:'Dr. Amy Chen',aff:'Caltech, EE'},
  ],
  'CANSAT': [
    {n:'Dr. James Whitfield',aff:'Virginia Tech, Aerospace'},{n:'Prof. Laura Henderson',aff:'CU Boulder, Aerospace'},{n:'Col. Robert Drake',aff:'US Air Force Academy'},
    {n:'Dr. Megan Yoshida',aff:'NASA Goddard'},{n:'Prof. Nathan Cooper',aff:'Purdue, AAE'},{n:'Dr. Rebecca Stone',aff:'Johns Hopkins APL'},
    {n:'Prof. Tyler Grant',aff:'Georgia Tech, Aerospace'},{n:'Dr. Lisa Nakamura',aff:'NASA JPL'},{n:'Maj. David Wells',aff:'US Naval Academy'},
    {n:'Dr. Katherine Morris',aff:'MIT Lincoln Lab'},{n:'Prof. Samuel Ortiz',aff:'U. Texas, Aerospace'},{n:'Dr. Christine Adler',aff:'Embry-Riddle, Aerospace'},
    {n:'Dr. Rachel Kim',aff:'U. Colorado, Aerospace'},{n:'Prof. Matthew Torres',aff:'Cornell, MAE'},{n:'Dr. Emily Brown',aff:'SpaceX, GNC'},
    {n:'Prof. Ryan Murphy',aff:'U. Michigan, Aerospace'},{n:'Dr. Jessica Liu',aff:'Lockheed Martin, Space'},
  ],
};

// Extended palette for 18+ jurors per org (no color repeats within org)
const palette = ['#F59E0B','#3B82F6','#8B5CF6','#EC4899','#10B981','#EF4444','#6366F1','#14B8A6','#F97316','#A855F7','#22C55E','#06B6D4','#E11D48','#84CC16','#0EA5E9','#D946EF','#F43F5E','#059669'];
let jurorIdList = [];
orgs.forEach(o => {
  (orgJurors[o.code] || []).forEach((j, i) => {
    const jId = uuid(`juror-${o.code}-${i}`);
    out.push(`INSERT INTO jurors (id, organization_id, juror_name, affiliation, email, avatar_color) VALUES ('${jId}', '${o.id}', '${escapeSql(j.n)}', '${escapeSql(j.aff)}', '${jurorEmail(j.n)}', '${palette[i % palette.length]}') ON CONFLICT DO NOTHING;`);
    jurorIdList.push({id: jId, org: o.code, n: j.n, idx: i});
  });
});

// ═══════════════════════════════════════════════════════════════
// JUROR PERIOD AUTH — graduated coverage
// ═══════════════════════════════════════════════════════════════

const pinHash = "$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe";
let authList = [];

// Every period gets these guaranteed slots (assigned to first N jurors in order)
const PERIOD_SLOTS = ['InProgress', 'Editing', 'ReadyToSubmit', 'NotStarted'];

// Normalized fixed-column batcher for juror_period_auth (avoids variable-column INSERTs)
const jpaColumns = 'juror_id, period_id, pin_hash, last_seen_at, session_expires_at, final_submitted_at, edit_enabled, edit_reason, edit_expires_at, failed_attempts, locked_until, locked_at, is_blocked';
const jpaBatcher = makeBatcher('juror_period_auth', jpaColumns);

periodData.forEach(pd => {
  let pJurors = jurorIdList.filter(j => j.org === pd.org);
  pJurors = pJurors.slice(0, Math.min(activeJurorsForIdx(pd.org, pd.histIdx), pJurors.length));

  // Vary PIN-blocking count per org so Completed count ranges 10–13 across orgs.
  // Current period: org-specific (gives 10, 11, 12, or 13 Completed depending on juror pool).
  // Historical periods: 2 for prev, 1 for older/oldest.
  const curPinBlocks = { 'TEDU-EE': 2, 'CMU-CS': 1, 'TEKNOFEST': 3, 'TUBITAK-2204A': 2, 'IEEE-APSSDC': 3, 'CANSAT': 1 };
  const pinBlockCount = pd.isCur ? (curPinBlocks[pd.org] ?? 2) : (pd.histIdx === 1 ? 2 : 1);

  pJurors.forEach((j, jix) => {
    let semanticState;
    if (!pd.isCur) {
      // Historical/locked periods: all jurors Completed (realistic — event is over)
      semanticState = 'Completed';
    } else if (jix < PERIOD_SLOTS.length) {
      semanticState = PERIOD_SLOTS[jix];
    } else if (jix < PERIOD_SLOTS.length + pinBlockCount) {
      semanticState = (jix % 2 === 0) ? 'Locked' : 'Blocked';
    } else {
      semanticState = 'Completed';
    }

    const authObj = { jId: j.id, pId: pd.id, org: pd.org, isCur: pd.isCur, histIdx: pd.histIdx, semanticState, name: j.n, evalDay: pd.evalDay, evalDays: pd.evalDays };

    // Normalized row — always 13 columns; unused slots get NULL
    let lastSeenAt = 'NULL', sessionExpiresAt = 'NULL';
    let finalSubmittedAt = 'NULL';
    let editEnabled = 'false', editReason = 'NULL', editExpiresAt = 'NULL';
    let failedAttempts = '0', lockedUntil = 'NULL', lockedAt = 'NULL';
    let isBlocked = 'false';

    if (semanticState !== 'NotStarted') {
      const lsMinH = { InProgress: 1, ReadyToSubmit: pd.evalDays * 8, Completed: pd.evalDays * 2, Editing: pd.evalDays * 2, Locked: 1, Blocked: 1 }[semanticState] ?? 1;
      const lsMaxH = { InProgress: pd.evalDays * 10, ReadyToSubmit: pd.evalDays * 16, Completed: pd.evalDays * 20, Editing: pd.evalDays * 18, Locked: pd.evalDays * 8, Blocked: pd.evalDays * 6 }[semanticState] ?? pd.evalDays * 12;
      const lsH = randInt(lsMinH, lsMaxH); const lsM = randInt(0, 59);
      lastSeenAt = sqlTs(pd.evalDay, lsH + lsM / 60);
      sessionExpiresAt = sqlTs(pd.evalDay, lsH + 24 + lsM / 60);
    }
    if (semanticState === 'Completed' || semanticState === 'Editing') {
      finalSubmittedAt = randSqlTs(pd.evalDay, pd.evalDays * 2, pd.evalDays * 20);
    }
    if (semanticState === 'Editing') {
      editEnabled = 'true';
      editReason = `'Late submission due to connectivity issue'`;
      editExpiresAt = sqlTs(pd.evalDay, pd.evalDays * 24 + 48);
    }
    if (semanticState === 'Locked') {
      const lt = randSqlTs(pd.evalDay, 2, pd.evalDays * 12);
      failedAttempts = String(randInt(3, 5));
      lockedUntil = `${lt} + interval '30 minutes'`;
      lockedAt = lt;
    }
    if (semanticState === 'Blocked') {
      isBlocked = 'true';
    }

    jpaBatcher.push(`('${j.id}', '${pd.id}', '${pinHash}', ${lastSeenAt}, ${sessionExpiresAt}, ${finalSubmittedAt}, ${editEnabled}, ${editReason}, ${editExpiresAt}, ${failedAttempts}, ${lockedUntil}, ${lockedAt}, ${isBlocked})`);
    authList.push(authObj);
  });
});
jpaBatcher.flush(out);
out.push('');


// ═══════════════════════════════════════════════════════════════
// SCORING — juror personality bias, variable coverage, bilingual comments
// ═══════════════════════════════════════════════════════════════

out.push(`-- Scoring`);
const ssBatcher  = makeBatcher('score_sheets',      'id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at');
const ssiBatcher = makeBatcher('score_sheet_items', 'id, score_sheet_id, period_criterion_id, score_value');

// Includes 2 extreme biases: harsh (0.88) and lenient (1.12) for JurorConsistencyHeatmap
const jurorBiases = [1.02,0.97,1.04,0.98,1.00,0.96,1.03,1.01,0.99,1.05,0.88,1.12,0.98,1.02,1.00,0.97,1.03,0.99];

// Flat 60% comment rate across all archetypes and statuses
const commentRates = {star:0.60,partial:0.60,solid:0.60,wellrounded:0.60,highvar:0.60,tech_strong_comm_weak:0.60,borderline:0.60,average:0.60,weak_tech_strong_team:0.60,strong_late:0.60};

// Score duration by archetype (minutes) for started_at calculation
const scoreDurations = {star:[10,20],solid:[20,30],wellrounded:[20,30],highvar:[30,50],tech_strong_comm_weak:[25,40],weak_tech_strong_team:[25,35],borderline:[30,45],average:[25,35],strong_late:[20,35],partial:[40,60]};

const commentPoolsEn = {
  star:['Exceptional work across all dimensions.','Outstanding technical depth and professional presentation.','Truly impressive innovation and mastery.','Top-tier project. Clear problem definition, excellent execution.','Remarkable quality — set the bar for the session.'],
  solid:['Strong and consistent effort throughout.','Well-rounded with good technical foundations.','Solid engineering work with clear methodology.','Good work overall. Fundamentally sound.','Reliable execution and thorough documentation.'],
  highvar:['Ambitious scope with mixed execution.','Some brilliant moments alongside notable gaps.','Uneven — strong in certain areas but inconsistent.','Shows potential but needs more polish.'],
  tech_strong_comm_weak:['Very strong technically but communication needs improvement.','Excellent engineering depth let down by presentation.','Technical work is outstanding but poster is hard to follow.'],
  weak_tech_strong_team:['Great team dynamics but technical execution falls short.','Strong collaboration; need to strengthen the technical core.'],
  borderline:['Meets minimum expectations but does not stand out.','Adequate but uninspired. More depth needed.','On the edge — competent but room for improvement.'],
  average:['Reasonable effort with expected results.','Standard work that meets requirements.','Competent execution across the board.'],
  wellrounded:['Well-balanced project showing strength in all areas.','Consistently good — no weak spots.','Balanced execution with attention to every criterion.'],
  strong_late:['Started slowly but finished very strongly.','Clear improvement trajectory throughout.','Late-blooming — final product exceeded early expectations.'],
  partial:['Incomplete work — significant portions are missing.','Shows initial effort but execution very limited.'],
};
const commentPoolsTr = {
  star:['Tüm kriterlerde olağanüstü bir çalışma.','Teknik derinlik ve profesyonel sunum açısından çok başarılı.','Gerçek anlamda yenilikçi. Büyük ustalık sergilendi.'],
  solid:['Tutarlı ve güçlü bir mühendislik çalışması.','Sağlam temeller üzerine kurulmuş, dengeli bir proje.','İyi düzeyde teknik çalışma ve dokümantasyon.'],
  highvar:['Bazı parlak anlar var ama tutarsız performans.','İddialı kapsam, karışık sonuçlar.'],
  tech_strong_comm_weak:['Teknik olarak çok güçlü ama sunumu zayıf.','Mühendislik derinliği iyi ancak iletişim geliştirilmeli.'],
  weak_tech_strong_team:['Takım dinamikleri çok iyi ama teknik yürütme yetersiz.'],
  borderline:['Minimum beklentiyi karşılıyor ama öne çıkmıyor.'],
  average:['Makul bir çalışma, beklenen sonuçlar.','Standart düzeyde, gereksinimleri karşılıyor.'],
  wellrounded:['Dengeli ve tutarlı bir proje. Zayıf nokta yok.'],
  strong_late:['Yavaş başladı ama çok güçlü bitirdi.'],
  partial:['Eksik bir çalışma — önemli bölümler tamamlanmamış.'],
};
const defaultCommentsEn = ['Reasonable work overall.','Good effort.','Needs further development.'];
const defaultCommentsTr = ['Genel olarak makul bir çalışma.','İyi bir çaba.','Daha fazla gelişim gerekiyor.'];

authList.forEach(auth => {
  // Locked jurors get partial scores (scored before lockout), Blocked/NotStarted skip entirely
  if (['Blocked','NotStarted'].includes(auth.semanticState)) return;
  const myProjs = projList.filter(p => p.pId === auth.pId);
  if (myProjs.length === 0) return;
  const periodCrits = periodCriteriaMap[auth.pId] || [];
  if (periodCrits.length === 0) return;

  let targetCount = myProjs.length;
  if (auth.semanticState === 'InProgress') {
    targetCount = Math.max(1, Math.floor(myProjs.length * (randInt(50, 80) / 100)));
  } else if (auth.semanticState === 'Locked') {
    // Locked jurors scored 30-50% of projects before lockout
    targetCount = Math.max(1, Math.floor(myProjs.length * (randInt(30, 50) / 100)));
  }

  const o = orgs.find(x => x.code === auth.org);
  const jurorIdx = jurorIdList.findIndex(j => j.id === auth.jId);
  const bias = jurorBiases[jurorIdx % jurorBiases.length];

  // Scoring time clustering: 70% during 09-17, 20% during 17-22, 10% next day
  const timeRoll = random();
  let evalHourMin, evalHourMax;
  if (timeRoll < 0.70) { evalHourMin = 0; evalHourMax = 8; }       // 09:00-17:00 (base is 09:00)
  else if (timeRoll < 0.90) { evalHourMin = 8; evalHourMax = 13; }  // 17:00-22:00
  else { evalHourMin = 15; evalHourMax = 23; }                       // next day morning

  let scoredCount = 0;
  myProjs.forEach(proj => {
    if (scoredCount >= targetCount) return;
    let itemsToScore = periodCrits.length;
    let ssStatus = 'submitted';
    if (auth.semanticState === 'InProgress' && scoredCount === targetCount - 1) {
      itemsToScore = Math.max(1, Math.floor(periodCrits.length * 0.5));
      ssStatus = 'in_progress';
    }
    if (auth.semanticState === 'Locked') {
      ssStatus = 'submitted'; // locked jurors submitted before PIN lockout; lock is captured in juror_period_auth
    }
    const ssId = uuid(`ss-${auth.jId}-${proj.id}`);
    const sst = randSqlTs(auth.evalDay, evalHourMin + scoredCount * 0.3, evalHourMax + scoredCount * 0.3);

    // Variable duration per archetype
    const dur = scoreDurations[proj.arch] || [25, 35];
    const durationMin = randInt(dur[0], dur[1]);

    let ssComment = 'NULL';
    const cRate = commentRates[proj.arch] ?? 0.55;
    if (random() < cRate) {
      const cLang = (o.commentLang || o.lang);
      const pools = cLang === 'tr' ? commentPoolsTr : commentPoolsEn;
      const defs = cLang === 'tr' ? defaultCommentsTr : defaultCommentsEn;
      ssComment = `'${escapeSql(pick(pools[proj.arch] || defs))}'`;
    }

    ssBatcher.push(`('${ssId}', '${auth.pId}', '${proj.id}', '${auth.jId}', '${ssStatus}', ${ssComment}, ${sst} - interval '${durationMin} minutes', ${sst})`);

    let scoredItems = 0;
    periodCrits.forEach(c => {
      if (scoredItems >= itemsToScore) return; scoredItems++;
      let s = c.max; const arch = proj.arch;
      if (arch==='star') s=Math.floor(c.max*randInt(88,98)/100);
      else if (arch==='solid') s=Math.floor(c.max*randInt(74,85)/100);
      else if (arch==='wellrounded') s=Math.floor(c.max*randInt(78,88)/100);
      else if (arch==='strong_late') { s = (c.key==='delivery'||c.key==='design'||c.key==='communication') ? Math.floor(c.max*randInt(68,78)/100) : Math.floor(c.max*randInt(82,92)/100); }
      else if (arch==='partial') { s = (scoredItems === 1 && random() > 0.7) ? 0 : Math.floor(c.max*randInt(55,70)/100); } // edge: sometimes 0 score
      else if (arch==='highvar') s=Math.floor(c.max*randInt(50,100)/100);
      else if (arch==='tech_strong_comm_weak') { s = (c.key==='delivery'||c.key==='communication'||c.key==='design') ? Math.floor(c.max*0.65) : Math.floor(c.max*0.90); }
      else if (arch==='weak_tech_strong_team') { s = (c.key==='technical'||c.key==='design'||c.key.includes('tech')) ? Math.floor(c.max*0.55) : Math.floor(c.max*0.85); }
      else if (arch==='borderline') s=Math.floor(c.max*randInt(58,72)/100);
      else if (arch==='average') s=Math.floor(c.max*randInt(65,78)/100);
      else s=Math.floor(c.max*randInt(65,85)/100);
      s = Math.max(0, Math.min(c.max, Math.round(s * bias)));
      // Edge case: lenient grader (bias >= 1.10) on star project → allow perfect score
      if (bias >= 1.10 && arch === 'star') s = Math.min(c.max, Math.round(c.max * randInt(95, 100) / 100));
      ssiBatcher.push(`('${uuid(`ssi-${ssId}-${c.key}`)}', '${ssId}', '${c.pcId}', ${s})`);
    });
    scoredCount++;
  });
});
ssBatcher.flush(out);
ssiBatcher.flush(out);
out.push('');

// ═══════════════════════════════════════════════════════════════
// ENTRY TOKENS — 4 per period: active, active, revoked, expired
// ═══════════════════════════════════════════════════════════════

out.push(`-- Entry Tokens`);
let tokenList = [];
periodData.forEach(pd => {
  for (let i = 0; i < TOKENS_PER_PERIOD; i++) {
    const tokenId = uuid(`tok-${pd.id}-${i}`);
    const tokenPlain = uuid(`token-plain-${pd.id}-${i}`);
    const tokenHash = sha256(tokenPlain);
    const isRevoked = (i === 2);
    const isExpired = (i === 3); // naturally expired (TTL ran out)
    let expiresAt, lastUsedAt, createdAt;
    if (pd.isCur) {
      createdAt = randSqlTs(pd.evalDay, -168, -72);
      if (isExpired) {
        // expired token: created before eval, expired 24h later (TTL ran out)
        createdAt = randSqlTs(pd.evalDay, -120, -96);
        expiresAt = sqlTs(pd.evalDay, -72); // expired well before eval day
        lastUsedAt = randSqlTs(pd.evalDay, -100, -80);
      } else {
        // i=0 is the active QR: always valid for exactly 1 day from SQL exec time
        expiresAt = i === 0 ? `(now() + interval '1 day')` : sqlTs(pd.evalDay, 48 + pd.evalDays * 24);
        lastUsedAt = i < 2 ? randSqlTs(pd.evalDay, 0, pd.evalDays * 12) : randSqlTs(pd.evalDay, -48, -12);
      }
    } else {
      createdAt = randSqlTs(pd.evalDay, -240, -96);
      if (isExpired) {
        expiresAt = sqlTs(pd.evalDay, -48); // expired before eval
        lastUsedAt = randSqlTs(pd.evalDay, -72, -50);
      } else {
        expiresAt = sqlTs(pd.evalDay, (pd.evalDays + 3) * 24);
        lastUsedAt = i === 0 ? randSqlTs(pd.evalDay, 0, pd.evalDays * 20) : (i === 1 ? 'NULL' : randSqlTs(pd.evalDay, 0, pd.evalDays * 8));
      }
    }
    const luSql = lastUsedAt === 'NULL' ? 'NULL' : lastUsedAt;
    out.push(`INSERT INTO entry_tokens (id, period_id, token_hash, token_plain, is_revoked, expires_at, last_used_at, created_at) VALUES ('${tokenId}', '${pd.id}', '${tokenHash}', '${tokenPlain}', ${isRevoked}, ${expiresAt}, ${luSql}, ${createdAt}) ON CONFLICT DO NOTHING;`);
    tokenList.push({ id: tokenId, pId: pd.id, org: pd.org, isRevoked, isExpired });
  }
});
out.push('');

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS — comprehensive, per-period, time-coherent
// ═══════════════════════════════════════════════════════════════

out.push(`-- Audit Logs`);
let auditObjList = [];

// Helper: get first admin UUID for an org (for user_id attribution)
function adminFor(orgCode) { return (orgAdminMap[orgCode] || [])[0] || null; }

// Helper: convert juror display name to deterministic admin-style email
function adminEmailFor(displayName) {
  return displayName
    .replace(/^(Prof\.|Dr\.|Col\.)\s*/i, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u')
    + '@vera-eval.app';
}

// Derives audit taxonomy from action string. Mirrors the production EVENT_META
// map in src/admin/utils/auditUtils.js and the category/severity defaults used
// by supabase/functions/_shared/audit-log.ts (Edge Function path).
function deriveAuditMeta(action) {
  let category = 'data', severity = 'info', actorType = 'admin';

  // category
  if (['admin.login', 'admin.login.failure', 'admin.logout', 'admin.session_expired',
    'auth.admin.login.success', 'auth.admin.login.failure',
    'auth.admin.password.reset.requested', 'auth.admin.password.changed'].includes(action)) {
    category = 'auth';
  } else if (['admin.create', 'admin.updated', 'admin.role_granted', 'admin.role_revoked',
    'memberships.insert', 'memberships.update', 'memberships.delete',
    'admin_invites.insert', 'admin_invites.update', 'admin_invites.delete',
    'access.admin.role.granted', 'access.admin.role.revoked',
    'access.admin.impersonate.start', 'access.admin.impersonate.end'].includes(action)) {
    category = 'access';
  } else if (['criteria.save', 'criteria.update',
    'outcome.created', 'outcome.updated', 'outcome.deleted',
    'organization.status_changed', 'frameworks.insert', 'frameworks.update', 'frameworks.delete',
    'framework.create', 'framework.update', 'framework.delete',
    'config.criteria.updated', 'config.outcome.updated', 'config.outcome_mapping.updated',
    'config.organization.settings.updated',
    'period.set_current', 'period.lock', 'period.unlock'].includes(action)) {
    category = 'config';
  } else if (action.startsWith('export.') || action.startsWith('notification.') ||
    action.startsWith('backup.') || action.startsWith('token.') || action.startsWith('entry_tokens.') ||
    action.startsWith('security.')) {
    category = 'security';
  }

  // severity
  if (['data.juror.pin.locked'].includes(action)) {
    severity = 'critical';
  } else if (['period.lock', 'period.unlock', 'project.delete', 'organization.status_changed',
    'backup.deleted', 'frameworks.delete', 'memberships.delete',
    'security.entry_token.revoked', 'security.anomaly.detected',
    'access.admin.impersonate.start', 'access.admin.impersonate.end'].includes(action)) {
    severity = 'high';
  } else if (['admin.login.failure', 'auth.admin.login.failure', 'admin.create',
    'data.juror.pin.reset', 'data.juror.pin.unlocked',
    'data.juror.edit_mode.granted', 'data.juror.edit_mode.force_closed',
    'snapshot.freeze', 'application.approved', 'application.rejected',
    'token.revoke', 'export.audit',
    'backup.downloaded', 'criteria.save', 'criteria.update',
    'outcome.created', 'outcome.updated', 'outcome.deleted', 'frameworks.update',
    'auth.admin.password.changed',
    'access.admin.role.granted', 'access.admin.role.revoked',
    'notification.maintenance', 'security.pin_reset.requested'].includes(action)) {
    severity = 'medium';
  } else if (['admin.updated', 'data.juror.edit_mode.closed', 'token.generate',
    'export.scores', 'export.rankings', 'export.heatmap', 'export.analytics', 'export.backup',
    'backup.created', 'frameworks.insert', 'admin_invites.insert',
    'memberships.insert', 'memberships.update',
    'auth.admin.login.success', 'admin.logout',
    'auth.admin.password.reset.requested',
    'notification.admin_invite', 'notification.application',
    'notification.entry_token', 'notification.juror_pin', 'notification.export_report',
    'periods.insert', 'periods.update', 'period.set_current',
    'data.project.created', 'data.project.updated', 'data.project.deleted',
    'data.juror.created', 'data.juror.updated', 'data.juror.imported',
    'data.score.edit_requested'].includes(action)) {
    severity = 'low';
  }

  // actorType
  if (['evaluation.complete', 'score.update', 'score_sheets.insert',
    'score_sheets.update', 'score_sheets.delete', 'data.score.submitted',
    'security.pin_reset.requested', 'data.score.edit_requested'].includes(action)) {
    actorType = 'juror';
  } else if (['snapshot.freeze', 'data.juror.pin.locked', 'data.juror.edit_mode.closed',
    'projects.insert', 'projects.update', 'projects.delete',
    'jurors.insert', 'jurors.update', 'jurors.delete',
    'periods.insert', 'periods.update', 'periods.delete',
    'profiles.insert', 'profiles.update',
    'org_applications.insert', 'org_applications.update', 'org_applications.delete',
    'organizations.insert', 'organizations.update', 'admin_invites.update',
    'security.anomaly.detected'].includes(action)) {
    actorType = 'system';
  } else if (['application.submitted', 'admin.login.failure', 'auth.admin.login.failure'].includes(action)) {
    actorType = 'anonymous';
  }

  return { category, severity, actorType };
}

// ─── ORG-LEVEL EVENTS ───

// 1. auth.admin.login.success — 2-3 per org at creation, mixed "password"/"google" methods
orgs.forEach(o => {
  const adminId = adminFor(o.code);
  if (!adminId) return;
  const loginMethods = ['password', 'password', 'google'];
  for (let li = 0; li < randInt(2, 3); li++) {
    const method = loginMethods[li % loginMethods.length];
    auditObjList.push({ action:'auth.admin.login.success', resType:'profiles', resId:adminId, orgId:o.id, userId:adminId, details:`{"method":"${method}","organization_id":"${o.id}"}`, timeStr:randSqlTs(orgCreatedDates[o.code], li*48, li*48+48) });
  }
});

// 2. application.approved / application.rejected — real applicant data, demoAdminId
orgAppIds.forEach(oa => {
  const o = orgs.find(x => x.code === oa.org);
  const appIdx = orgs.indexOf(o);
  const st = appStatuses[appIdx];
  if (st !== 'approved' && st !== 'rejected') return;
  const applicantEmail = applicantEmails[appIdx];
  const applicantName = applicantNames[appIdx];
  const rejExtra = st === 'rejected' ? `,"rejection_reason":"Did not meet submission requirements"` : '';
  auditObjList.push({ action:`application.${st}`, resType:'org_applications', resId:oa.id, orgId:o.id, userId:demoAdminId, details:`{"applicant_email":"${applicantEmail}","applicant_name":"${escapeSql(applicantName)}"${rejExtra}}`, timeStr:sqlTs(orgCreatedDates[o.code], randInt(48, 168)) });
  // notification.application immediately follows each approval/rejection
  auditObjList.push({ action:'notification.application', resType:'org_applications', resId:oa.id, orgId:o.id, userId:demoAdminId, details:`{"recipientEmail":"${applicantEmail}","type":"application_${st}"}`, timeStr:sqlTs(orgCreatedDates[o.code], randInt(49, 170)) });
});

// 3. notification.admin_invite — for each org admin account provisioned
orgs.forEach(o => {
  (orgAdminNames[o.code] || []).forEach((nm, i) => {
    const adminPid = (orgAdminMap[o.code] || [])[i];
    if (!adminPid) return;
    const adminEmail = adminEmailFor(nm);
    auditObjList.push({ action:'notification.admin_invite', resType:'memberships', resId:adminPid, orgId:o.id, userId:demoAdminId, details:`{"recipientEmail":"${adminEmail}","type":"invite"}`, timeStr:randSqlTs(orgCreatedDates[o.code], 24, 72) });
  });
});

// 4. period.set_current — super-admin marks each org's current period
periodData.filter(pd => pd.isCur).forEach(pd => {
  const o = orgs.find(x => x.code === pd.org);
  // current periods: set_current happened 1–3 days ago (before TODAY); historical: 1–3 days after start
  const setCurTs = pd.isCur ? randSqlTs(pd.start, -72, -24) : randSqlTs(pd.start, 24, 72);
  auditObjList.push({ action:'period.set_current', resType:'periods', resId:pd.id, orgId:o.id, userId:demoAdminId, details:`{"period_id":"${pd.id}","periodName":"${escapeSql(pd.name)} · ${pd.org}"}`, timeStr:setCurTs });
});

// 5. organization.status_changed — CANSAT toggled disabled → active for demo
{
  const demoOrg = orgs.find(x => x.code === 'CANSAT');
  if (demoOrg) {
    auditObjList.push({ action:'organization.status_changed', resType:'organizations', resId:demoOrg.id, orgId:demoOrg.id, userId:demoAdminId, details:`{"orgCode":"CANSAT","orgName":"CanSat Competition","previousStatus":"active","newStatus":"disabled","reason":"Pending annual renewal review"}`, timeStr:randSqlTs(orgCreatedDates['CANSAT'], 720, 1440) });
    auditObjList.push({ action:'organization.status_changed', resType:'organizations', resId:demoOrg.id, orgId:demoOrg.id, userId:demoAdminId, details:`{"orgCode":"CANSAT","orgName":"CanSat Competition","previousStatus":"disabled","newStatus":"active","reason":"Renewal complete"}`, timeStr:randSqlTs(orgCreatedDates['CANSAT'], 1440, 2160) });
  }
}

// 6. auth.admin.password.reset.requested — every other org's first admin
orgs.forEach((o, oi) => {
  if (oi % 2 !== 0) return;
  const adminId = adminFor(o.code);
  if (!adminId) return;
  const nm = (orgAdminNames[o.code] || [])[0] || '';
  if (!nm) return;
  const adminEmail = adminEmailFor(nm);
  auditObjList.push({ action:'auth.admin.password.reset.requested', resType:'profiles', resId:adminId, orgId:o.id, userId:adminId, details:`{"email":"${adminEmail}","link_generated":true}`, timeStr:randSqlTs(orgCreatedDates[o.code], 168, 720) });
});

// 7. admin.updated — org admin updates display name/contact (alternating orgs)
orgs.forEach((o, oi) => {
  if (oi % 2 !== 0) return;
  const adminId = adminFor(o.code);
  if (!adminId) return;
  const nm = (orgAdminNames[o.code] || [])[0] || '';
  if (!nm) return;
  const adminEmail = adminEmailFor(nm);
  const adminNm = nm;
  auditObjList.push({ action:'admin.updated', resType:'profiles', resId:adminId, orgId:o.id, userId:adminId, actorName:adminNm, ip:randIp(), ua:randUserAgent(), sessionId:randSessionId(`admin-upd-${o.code}`), details:`{"adminName":"${escapeSql(nm)}","adminEmail":"${adminEmail}","organizationId":"${o.id}","changedFields":["display_name"]}`, timeStr:randSqlTs(orgCreatedDates[o.code], 336, 720) });
});

// ─── PERIOD-LEVEL EVENTS ───

periodData.forEach(pd => {
  const o = orgs.find(x => x.code === pd.org);
  const adminId = adminFor(pd.org);
  const myProjs = projList.filter(p => p.pId === pd.id);
  const myTokens = tokenList.filter(t => t.pId === pd.id);
  const myAuths = authList.filter(a => a.pId === pd.id);
  const myJurors = jurorIdList.filter(j => j.org === pd.org);
  const ev = pd.evalDay, evD = pd.evalDays;
  const periodCrits = periodCriteriaMap[pd.id] || [];

  // snapshot.freeze — current periods only (historical: covered by trigger on periods.update)
  if (pd.isCur) {
    auditObjList.push({ action:'snapshot.freeze', resType:'periods', resId:pd.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","criteria_count":${periodCrits.length},"outcomes_count":${o.outcomesData ? o.outcomesData.length : 0}}`, timeStr:sqlTs(ev, -24) });
  }

  // auth.admin.login.success around eval day — method "password"
  if (adminId) {
    auditObjList.push({ action:'auth.admin.login.success', resType:'profiles', resId:adminId, orgId:o.id, userId:adminId, details:`{"method":"password","organization_id":"${o.id}"}`, timeStr:randSqlTs(ev, -2, 2) });
    if (pd.isCur) auditObjList.push({ action:'auth.admin.login.success', resType:'profiles', resId:adminId, orgId:o.id, userId:adminId, details:`{"method":"password","organization_id":"${o.id}"}`, timeStr:randSqlTs(ev, evD*8, evD*16) });
  }

  // token.generate — admin creates entry token before eval day
  myTokens.forEach((tok, i) => {
    const ttl = '24h';
    const expiresAt = new Date(new Date().getTime() + (ttl.includes('72') ? 72 : ttl.includes('24') ? 24 : 1) * 3600000).toISOString();
    auditObjList.push({ action:'token.generate', resType:'entry_tokens', resId:tok.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","expires_at":"${expiresAt}","ttl":"${ttl}"}`, timeStr:randSqlTs(ev, -336+i*24, -168+i*24) });
  });

  // notification.entry_token — bulk QR/link email to jurors before eval day
  if (myJurors.length > 0 && myTokens.length > 0 && (pd.isCur || pd.histIdx <= 1)) {
    const tok = myTokens[0];
    const contactEmail = orgContactEmails[o.code] || 'admin@vera-eval.app';
    auditObjList.push({ action:'notification.entry_token', resType:'entry_tokens', resId:tok.id, orgId:o.id, userId:adminId, details:`{"recipientEmail":"${contactEmail}","type":"bulk","period_id":"${pd.id}","juror_count":${Math.min(myJurors.length, 18)}}`, timeStr:randSqlTs(ev, -120, -48) });
  }

  // security.entry_token.revoked — admin revokes a token (migration 049 semantic event)
  myTokens.filter(t => t.isRevoked).forEach(tok => {
    auditObjList.push({ action:'security.entry_token.revoked', resType:'entry_tokens', resId:tok.id, orgId:o.id, userId:adminId, details:`{"tokenId":"${tok.id}","periodId":"${pd.id}"}`, timeStr:randSqlTs(ev, -48, evD*12) });
  });

  // evaluation.complete — juror-initiated (user_id=NULL)
  myAuths.filter(a => a.semanticState==='Completed').forEach((a, i) => {
    if (myProjs.length === 0) return;
    auditObjList.push({ action:'evaluation.complete', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:null, details:`{"period_id":"${pd.id}","juror_id":"${a.jId}","actor_name":"${escapeSql(a.name)}"}`, timeStr:randSqlTs(ev, 2+i*2, evD*16+i*2) });
  });

  // data.score.submitted — DB trigger (migration 048): fires per project the juror scored
  // Represent as 1 event per completed juror (juror submitted all their scores)
  myAuths.filter(a => a.semanticState==='Completed').slice(0, 4).forEach((a, i) => {
    if (myProjs.length === 0) return;
    const proj = myProjs[i % myProjs.length];
    auditObjList.push({ action:'data.score.submitted', resType:'score_sheets', resId:proj.id, orgId:o.id, userId:null, actorName:a.name, details:`{"juror_name":"${escapeSql(a.name)}","project_title":"${escapeSql(proj.title)}","period_name":"${escapeSql(pd.name)}","period_id":"${pd.id}"}`, timeStr:randSqlTs(ev, 1+i*3, evD*14+i*3) });
  });

  // data.juror.pin.locked — juror-initiated (user_id=NULL)
  myAuths.filter(a => a.semanticState==='Locked').slice(0, 1).forEach(a => {
    auditObjList.push({ action:'data.juror.pin.locked', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:null, details:`{"period_id":"${pd.id}","juror_id":"${a.jId}","actor_name":"${escapeSql(a.name)}","failed_attempts":3,"locked_until":"${new Date(new Date().getTime() + 5 * 60000).toISOString()}"}`, timeStr:randSqlTs(ev, 2, evD*12) });
    // security.pin_reset.requested — same juror requests PIN reset after being locked
    auditObjList.push({ action:'security.pin_reset.requested', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:null, actorType:'juror', details:`{"jurorName":"${escapeSql(a.name)}","periodName":"${escapeSql(pd.name)}","orgName":"${escapeSql(o.name)}","sent":true}`, timeStr:randSqlTs(ev, evD*12+1, evD*12+3) });
  });

  // data.juror.pin.unlocked — admin action
  myAuths.filter(a => a.semanticState==='Locked').slice(0, 1).forEach(a => {
    auditObjList.push({ action:'data.juror.pin.unlocked', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:adminId, details:`{"juror_id":"${a.jId}","juror_name":"${escapeSql(a.name)}"}`, timeStr:randSqlTs(ev, evD*12+1, evD*14) });
  });

  // data.juror.edit_mode.granted — for Editing-state jurors
  myAuths.filter(a => a.semanticState==='Editing').forEach(a => {
    const durationMin = 120;
    const expiresAt = new Date(new Date().getTime() + durationMin * 60000).toISOString();
    auditObjList.push({ action:'data.juror.edit_mode.granted', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:adminId, details:`{"juror_id":"${a.jId}","juror_name":"${escapeSql(a.name)}","reason":"Late submission due to connectivity issue","duration_minutes":${durationMin},"expires_at":"${expiresAt}"}`, timeStr:randSqlTs(ev, evD*8, evD*14) });
  });

  // data.juror.edit_mode.closed — historical periods, 1 completed juror (closed by resubmit)
  if (!pd.isCur) {
    myAuths.filter(a => a.semanticState==='Completed').slice(0, 1).forEach(a => {
      auditObjList.push({ action:'data.juror.edit_mode.closed', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:null, details:`{"juror_id":"${a.jId}","actor_name":"${escapeSql(a.name)}","closed_at":"${new Date().toISOString()}","close_source":"resubmit"}`, timeStr:randSqlTs(ev, evD*14+2, evD*18) });
    });
  }

  // data.score.edit_requested — completed juror requests edit mode after submitting (current + histIdx<=1)
  if (pd.isCur || pd.histIdx <= 1) {
    myAuths.filter(a => a.semanticState==='Completed').slice(0, 1).forEach(a => {
      auditObjList.push({ action:'data.score.edit_requested', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:null, actorType:'juror', details:`{"jurorName":"${escapeSql(a.name)}","periodName":"${escapeSql(pd.name)}","orgName":"${escapeSql(o.name)}","sent":true}`, timeStr:randSqlTs(ev, evD*14+1, evD*16) });
    });
  }

  // data.juror.pin.reset + notification.juror_pin — paired actions
  if (pd.isCur || pd.histIdx <= 1) {
    myAuths.filter(a => a.semanticState==='Completed' || a.semanticState==='InProgress').slice(0, pd.isCur ? 2 : 1).forEach((a, i) => {
      auditObjList.push({ action:'data.juror.pin.reset', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:adminId, details:`{"juror_id":"${a.jId}","juror_name":"${escapeSql(a.name)}"}`, timeStr:randSqlTs(ev, 1+i*3, evD*10+i*3) });
      const jurorEntry = jurorIdList.find(j => j.id === a.jId);
      if (jurorEntry) {
        const jMail = jurorEmail(jurorEntry.n);
        auditObjList.push({ action:'notification.juror_pin', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:adminId, details:`{"recipient_email":"${jMail}","juror_name":"${escapeSql(a.name)}","sent":true}`, timeStr:randSqlTs(ev, 1+i*3+1, evD*10+i*3+2) });
      }
    });
  }

  // data.juror.edit_mode.force_closed — admin force-closes a stuck edit session on
  // historical periods (the admin closed an expired edit window so the juror's late
  // changes couldn't overwrite the locked snapshot).
  if (!pd.isCur && pd.histIdx === 2 && adminId) {
    myAuths.filter(a => a.semanticState === 'Completed').slice(0, 1).forEach(a => {
      auditObjList.push({ action:'data.juror.edit_mode.force_closed', resType:'juror_period_auth', resId:a.jId, orgId:o.id, userId:adminId, details:`{"juror_id":"${a.jId}","juror_name":"${escapeSql(a.name)}","period_id":"${pd.id}","period_name":"${escapeSql(pd.name)}","close_source":"admin_force"}`, timeStr:randSqlTs(ev, evD*14, evD*20) });
    });
  }

  // export.scores — xlsx
  if (pd.isCur && myProjs.length > 0) {
    auditObjList.push({ action:'export.scores', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","format":"xlsx","row_count":${Math.min(myProjs.length * myJurors.length, 100)}}`, timeStr:randSqlTs(ev, evD*12, evD*18) });
  } else if (!pd.isCur && pd.histIdx <= 2) {
    auditObjList.push({ action:'export.scores', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","format":"xlsx","row_count":45}`, timeStr:sqlTs(ev, (evD+10)*24) });
  }

  // notification.maintenance — admin sends a scheduled maintenance notice to jurors (current periods only)
  if (pd.isCur && myJurors.length > 0) {
    auditObjList.push({ action:'notification.maintenance', resType:'periods', resId:pd.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","period_name":"${escapeSql(pd.name)}","juror_count":${myJurors.length},"subject":"Scheduled maintenance window","sent":true}`, timeStr:randSqlTs(ev, -24, -2) });
  }

  // export.rankings + export.heatmap + export.analytics + notification.export_report (current periods)
  if (pd.isCur) {
    const scoredCount = myAuths.filter(a => a.semanticState === 'Completed').length;
    auditObjList.push({ action:'export.rankings', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","format":"pdf","row_count":${Math.max(10, Math.floor(scoredCount * 0.6))}}`, timeStr:randSqlTs(ev, evD*8+2, evD*20) });
    auditObjList.push({ action:'export.heatmap', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","format":"pdf","juror_count":${myJurors.length},"project_count":${myProjs.length}}`, timeStr:randSqlTs(ev, evD*10, evD*18) });
    auditObjList.push({ action:'export.analytics', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, details:`{"period_id":"${pd.id}","format":"pdf"}`, timeStr:randSqlTs(ev, evD*12+1, evD*20) });
    const reportRecipients = (orgAdminNames[pd.org] || []).slice(0, 2).map(nm => adminEmailFor(nm));
    auditObjList.push({ action:'notification.export_report', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, details:`{"recipients":${JSON.stringify(reportRecipients)},"period_id":"${pd.id}"}`, timeStr:randSqlTs(ev, evD*14, evD*22) });
  }

  // export.audit — current + first historical of first 2 orgs
  if (pd.isCur || (pd.histIdx === 1 && orgs.indexOf(o) < 2)) {
    const rowCount = pd.isCur ? randInt(80, 200) : randInt(40, 120);
    auditObjList.push({ action:'export.audit', resType:'audit_logs', resId:pd.id, orgId:o.id, userId:adminId, details:`{"format":"csv","row_count":${rowCount},"period_id":"${pd.id}"}`, timeStr:randSqlTs(ev, evD*16, evD*24) });
  }

  // export.backup — once per org at histIdx===1
  if (pd.histIdx === 1) {
    const periodCountForOrg = periodData.filter(p => p.org === pd.org).length;
    auditObjList.push({ action:'export.backup', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, details:`{"format":"xlsx","period_count":${periodCountForOrg},"org_id":"${o.id}"}`, timeStr:randSqlTs(pd.start, 48, 240) });
  }

  // criteria.save — admin saves criteria config before each period's eval day
  if (adminId) {
    const periodCrits = periodCriteriaMap[pd.id] || [];
    const adminNm = (orgAdminNames[pd.org] || [])[0] || '';
    // Build synthetic before/after diff: 1-2 criteria had higher max_score before save
    const beforeCrit = {}, afterCrit = {};
    periodCrits.forEach((pc, ci) => { afterCrit[pc.key] = pc.max; beforeCrit[pc.key] = ci < 2 ? pc.max + 5 : pc.max; });
    const critDiff = JSON.stringify({ before: beforeCrit, after: afterCrit });
    auditObjList.push({ action:'criteria.save', resType:'period_criteria', resId:pd.id, orgId:o.id, userId:adminId, actorName:adminNm, ip:randIp(), ua:randUserAgent(), sessionId:randSessionId(`critr-${pd.id}`), details:`{"period_id":"${pd.id}","criteria_count":${periodCrits.length},"periodName":"${escapeSql(pd.name)}","diff":${critDiff}}`, timeStr:sqlTs(pd.start, -72) });
  }

  // period.lock — historical periods locked after evaluation completes
  if (!pd.isCur && pd.histIdx >= 1 && adminId) {
    const adminNm = (orgAdminNames[pd.org] || [])[0] || '';
    const lockIp = randIp(), lockUa = randUserAgent();
    const lockSid = randSessionId(`lock-${pd.id}`);
    const lockTs = randSqlTs(pd.evalDay, pd.evalDays * 24 + 48, pd.evalDays * 24 + 168);
    auditObjList.push({ action:'period.lock', resType:'periods', resId:pd.id, orgId:o.id, userId:adminId, actorName:adminNm, ip:lockIp, ua:lockUa, sessionId:lockSid, details:`{"period_id":"${pd.id}","periodName":"${escapeSql(pd.name)}"}`, timeStr:lockTs });

    // period.unlock — histIdx===1 only: admin briefly unlocks for a score correction, then re-locks
    if (pd.histIdx === 1) {
      const unlockTs = randSqlTs(pd.evalDay, pd.evalDays * 24 + 240, pd.evalDays * 24 + 360);
      const relockTs = randSqlTs(pd.evalDay, pd.evalDays * 24 + 361, pd.evalDays * 24 + 480);
      auditObjList.push({ action:'period.unlock', resType:'periods', resId:pd.id, orgId:o.id, userId:adminId, actorName:adminNm, ip:lockIp, ua:lockUa, sessionId:lockSid, details:`{"period_id":"${pd.id}","periodName":"${escapeSql(pd.name)}","reason":"Score correction requested"}`, timeStr:unlockTs });
      auditObjList.push({ action:'period.lock', resType:'periods', resId:pd.id, orgId:o.id, userId:adminId, actorName:adminNm, ip:lockIp, ua:lockUa, sessionId:randSessionId(`relock-${pd.id}`), details:`{"period_id":"${pd.id}","periodName":"${escapeSql(pd.name)}"}`, timeStr:relockTs });
    }
  }

  // backup.created + backup.downloaded — once per org at histIdx===2
  if (pd.histIdx === 2 && adminId) {
    const adminNm = (orgAdminNames[pd.org] || [])[0] || '';
    const sizeMb = randInt(8, 25);
    const fileName = `${pd.org.toLowerCase().replace(/-/g,'_')}_backup_${pd.start.replace(/-/g,'')}.zip`;
    const bIp = randIp(), bUa = randUserAgent();
    auditObjList.push({ action:'backup.created', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, actorName:adminNm, ip:bIp, ua:bUa, sessionId:randSessionId(`bkp-${pd.id}`), details:`{"file":"${fileName}","size_mb":${sizeMb},"period_id":"${pd.id}"}`, timeStr:randSqlTs(pd.start, 720, 1440) });
    auditObjList.push({ action:'backup.downloaded', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, actorName:adminNm, ip:bIp, ua:bUa, sessionId:randSessionId(`bkpd-${pd.id}`), details:`{"file":"${fileName}","size_mb":${sizeMb}}`, timeStr:randSqlTs(pd.start, 1440, 2160) });
  }

  // backup.deleted — oldest historical period per org (purging stale backup)
  if (pd.histIdx === 3 && adminId) {
    const adminNm = (orgAdminNames[pd.org] || [])[0] || '';
    const oldFile = `${pd.org.toLowerCase().replace(/-/g,'_')}_backup_${pd.start.replace(/-/g,'')}.zip`;
    auditObjList.push({ action:'backup.deleted', resType:'score_sheets', resId:pd.id, orgId:o.id, userId:adminId, actorName:adminNm, ip:randIp(), ua:randUserAgent(), sessionId:randSessionId(`bkpdel-${pd.id}`), details:`{"storage_path":"backups/${oldFile}","origin":"platform","organization_id":"${o.id}"}`, timeStr:randSqlTs(pd.start, 2160, 4320) });
  }
});

// ─── SECURITY ANOMALY — failed login burst for TEDU-EE ───
// 5 rapid failed login attempts from a non-pool IP → triggers anomaly signal
{
  const teduOrg = orgs.find(x => x.code === 'TEDU-EE');
  const teduAdminId = adminFor('TEDU-EE');
  if (teduOrg && teduAdminId) {
    const adminNm = (orgAdminNames['TEDU-EE'] || [])[0] || '';
    const adminEmail = adminEmailFor(adminNm);
    const suspiciousIp = '195.88.54.17'; // outside normal IP pool — anomaly signal
    const suspiciousUa = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    const burstDate = '2025-11-15';
    for (let fi = 0; fi < 5; fi++) {
      auditObjList.push({ action:'auth.admin.login.failure', resType:'profiles', resId:teduAdminId, orgId:teduOrg.id, userId:null, _salt:fi, category:'auth', severity: fi >= 2 ? 'high' : 'medium', actorType:'anonymous', ip:suspiciousIp, ua:suspiciousUa, details:`{"email":"${adminEmail}","ip":"${suspiciousIp}","attempt":${fi+1}}`, timeStr:`(timestamp '${burstDate} 22:30:00' + interval '${fi * 3} minutes')` });
    }
  }
}

// ─── HIGH-VOLUME AUDIT EVENTS — 90-day spread ───────────────────────────────
// Adds ~1800 new events: auth logins/logouts, data lifecycle, config changes,
// access events, and anomaly signals spread over 90 days ending 2026-04-12.

function dateAddDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}
function bizTs(dateStr, dayOffset) {
  const dt = dateAddDays(dateStr, dayOffset || 0);
  const h = randInt(8, 17), m = randInt(0, 59), s = randInt(0, 59);
  return `timestamp '${dt} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}'`;
}

const AUTH_SPREAD_START = dateAddDays(TODAY, -90); // 90 days before script run date

// auth.admin.login.success + admin.logout — 90-day daily spread
orgs.forEach(o => {
  const adminIds = orgAdminMap[o.code] || [];
  const adminNames = orgAdminNames[o.code] || [];
  if (adminIds.length === 0) return;
  for (let day = 0; day < 90; day++) {
    const dt = dateAddDays(AUTH_SPREAD_START, day);
    const dow = new Date(dt + 'T12:00:00Z').getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend && random() > 0.08) continue;
    if (!isWeekend && random() < 0.12) continue;
    const count = isWeekend ? 1 : randInt(1, 3);
    for (let li = 0; li < count; li++) {
      const aIdx = (day + li) % adminIds.length;
      const adminId = adminIds[aIdx];
      const adminNm = adminNames[aIdx] || '';
      const method = random() < 0.55 ? 'password' : 'google';
      const ip = randIp(), ua = randUserAgent();
      const sid = randSessionId(`spread-${o.code}-${day}-${li}`);
      const lts = bizTs(dt);
      auditObjList.push({
        action: 'auth.admin.login.success',
        resType: 'profiles', resId: adminId, orgId: o.id,
        userId: adminId, actorName: adminNm, ip, ua, sessionId: sid,
        category: 'auth', severity: 'info', actorType: 'admin',
        details: `{"method":"${method}","organization_id":"${o.id}"}`,
        timeStr: lts, _salt: `ls-${o.code}-${day}-${li}`,
      });
      if (random() < 0.65) {
        const lh = Math.min(randInt(2, 8) + randInt(8, 17), 22);
        const lm2 = randInt(0, 59), ls2 = randInt(0, 59);
        auditObjList.push({
          action: 'admin.logout',
          resType: 'profiles', resId: adminId, orgId: o.id,
          userId: adminId, actorName: adminNm, ip, ua, sessionId: sid,
          category: 'auth', severity: 'info', actorType: 'admin',
          details: `{"organization_id":"${o.id}"}`,
          timeStr: `timestamp '${dt} ${String(lh).padStart(2,'0')}:${String(lm2).padStart(2,'0')}:${String(ls2).padStart(2,'0')}'`,
          _salt: `lo-${o.code}-${day}-${li}`,
        });
      }
    }
  }
});

// auth.admin.password.reset.requested + auth.admin.password.changed — every other org.
// In production: the reset Edge Function writes the `.reset.requested` row, and the
// password-changed-notify Edge Function writes the `.password.changed` row once the
// new password lands. The seed mirrors that pair so the UI shows the full flow.
orgs.filter((_, i) => i % 2 === 0).forEach(o => {
  const adminId = adminFor(o.code);
  const adminNm = (orgAdminNames[o.code] || [])[0] || '';
  if (!adminId) return;
  const adminEmail = adminEmailFor(adminNm);
  const ip = randIp(), ua = randUserAgent();
  const sid = randSessionId(`pwreset-${o.code}`);
  const reqTs = bizTs(AUTH_SPREAD_START, 14);
  const doneTs = bizTs(AUTH_SPREAD_START, 14);
  auditObjList.push({
    action: 'auth.admin.password.reset.requested',
    resType: 'profiles', resId: adminId, orgId: o.id,
    userId: adminId, actorName: adminNm, ip, ua, sessionId: sid,
    category: 'auth', severity: 'low', actorType: 'admin',
    details: `{"email":"${adminEmail}","link_generated":true}`,
    timeStr: reqTs, _salt: `pwr-${o.code}`,
  });
  auditObjList.push({
    action: 'auth.admin.password.changed',
    resType: 'profiles', resId: adminId, orgId: o.id,
    userId: adminId, actorName: adminNm, ip, ua, sessionId: sid,
    category: 'auth', severity: 'medium', actorType: 'admin',
    details: `{"email":"${adminEmail}","method":"self_service","is_super_admin":false}`,
    timeStr: doneTs, _salt: `pwc-${o.code}`,
  });
});

// access.admin.impersonate — super-admin impersonates TEDU-EE and CMU-CS
[{ orgCode: 'TEDU-EE' }, { orgCode: 'CMU-CS' }].forEach(pair => {
  const targetOrg = orgs.find(x => x.code === pair.orgCode);
  const targetAdminId = adminFor(pair.orgCode);
  const targetNm = (orgAdminNames[pair.orgCode] || [])[0] || '';
  if (!targetOrg || !targetAdminId) return;
  const ip = randIp(), ua = randUserAgent();
  const sid = randSessionId(`impersonate-${pair.orgCode}`);
  const startTs = bizTs(AUTH_SPREAD_START, 30);
  const endTs = bizTs(AUTH_SPREAD_START, 30);
  auditObjList.push({
    action: 'access.admin.impersonate.start',
    resType: 'profiles', resId: targetAdminId, orgId: targetOrg.id,
    userId: demoAdminId, actorName: 'Vera Platform Admin', ip, ua, sessionId: sid,
    category: 'access', severity: 'high', actorType: 'admin',
    details: `{"target_id":"${targetAdminId}","target_name":"${escapeSql(targetNm)}","organization_id":"${targetOrg.id}"}`,
    timeStr: startTs, _salt: `imp-start-${pair.orgCode}`,
  });
  auditObjList.push({
    action: 'access.admin.impersonate.end',
    resType: 'profiles', resId: targetAdminId, orgId: targetOrg.id,
    userId: demoAdminId, actorName: 'Vera Platform Admin', ip, ua, sessionId: sid,
    category: 'access', severity: 'low', actorType: 'admin',
    details: `{"target_id":"${targetAdminId}","target_name":"${escapeSql(targetNm)}"}`,
    timeStr: endTs, _salt: `imp-end-${pair.orgCode}`,
  });
});

// access.admin.role.granted / .revoked — orgs with secondary admin
[{ orgCode: 'TEDU-EE' }, { orgCode: 'CMU-CS' }].forEach(pair => {
  const adminIds = orgAdminMap[pair.orgCode] || [];
  const adminNames = orgAdminNames[pair.orgCode] || [];
  if (adminIds.length < 2) return;
  const grantorId = adminIds[0], grantorNm = adminNames[0] || '';
  const targetId = adminIds[1], targetNm = adminNames[1] || '';
  const targetOrg = orgs.find(x => x.code === pair.orgCode);
  if (!targetOrg) return;
  const ip = randIp(), ua = randUserAgent();
  const sid = randSessionId(`role-grant-${pair.orgCode}`);
  auditObjList.push({
    action: 'access.admin.role.granted',
    resType: 'memberships', resId: targetId, orgId: targetOrg.id,
    userId: grantorId, actorName: grantorNm, ip, ua, sessionId: sid,
    category: 'access', severity: 'medium', actorType: 'admin',
    details: `{"target_id":"${targetId}","target_name":"${escapeSql(targetNm)}","role":"org_admin","organization_id":"${targetOrg.id}"}`,
    timeStr: bizTs(AUTH_SPREAD_START, 5), _salt: `role-grant-${pair.orgCode}`,
  });
  auditObjList.push({
    action: 'access.admin.role.revoked',
    resType: 'memberships', resId: targetId, orgId: targetOrg.id,
    userId: grantorId, actorName: grantorNm, ip, ua, sessionId: sid,
    category: 'access', severity: 'medium', actorType: 'admin',
    details: `{"target_id":"${targetId}","target_name":"${escapeSql(targetNm)}","role":"org_admin","organization_id":"${targetOrg.id}"}`,
    timeStr: bizTs(AUTH_SPREAD_START, 60), _salt: `role-revoke-${pair.orgCode}`,
  });
});

// periods.insert / .update — trigger-style events for every period
// (trigger_audit_log fires periods.insert/update, not data.period.created/updated)
periodData.forEach((pd, pdIdx) => {
  const adminId = adminFor(pd.org);
  const adminNm = (orgAdminNames[pd.org] || [])[0] || '';
  const o = orgs.find(x => x.code === pd.org);
  if (!adminId || !o) return;
  const ip = randIp(), ua = randUserAgent();
  const sid = randSessionId(`period-lifecycle-${pd.id}`);
  const createdTs = bizTs(pd.start, -90 - pdIdx * 2);
  auditObjList.push({
    action: 'periods.insert',
    resType: 'periods', resId: pd.id, orgId: o.id,
    userId: adminId, actorName: adminNm, ip, ua, sessionId: sid,
    category: 'data', severity: 'info', actorType: 'admin',
    details: `{"periodName":"${escapeSql(pd.name)}","organization_id":"${o.id}"}`,
    timeStr: createdTs, _salt: `pc-${pd.id}`,
  });
  auditObjList.push({
    action: 'periods.update',
    resType: 'periods', resId: pd.id, orgId: o.id,
    userId: adminId, actorName: adminNm, ip, ua, sessionId: sid,
    category: 'data', severity: 'info', actorType: 'admin',
    details: `{"periodName":"${escapeSql(pd.name)}","changedFields":["evaluation_days","start_date"],"organization_id":"${o.id}"}`,
    timeStr: bizTs(pd.start, -85 - pdIdx), _salt: `pu-${pd.id}`,
  });
});

// data.project.created / .updated for all current projects; .deleted for 5 synthetic ones
projList.forEach((p, pIdx) => {
  const adminId = adminFor(p.org);
  const adminNm = (orgAdminNames[p.org] || [])[0] || '';
  const o = orgs.find(x => x.code === p.org);
  if (!adminId || !o) return;
  const ip = randIp(), ua = randUserAgent();
  const createTs = bizTs(AUTH_SPREAD_START, -40 + (pIdx % 30));
  auditObjList.push({
    action: 'data.project.created',
    resType: 'projects', resId: p.id, orgId: o.id,
    userId: adminId, actorName: adminNm, ip, ua,
    sessionId: randSessionId(`proj-create-${p.id}`),
    category: 'data', severity: 'info', actorType: 'admin',
    details: `{"title":"${escapeSql(p.title)}","organization_id":"${o.id}"}`,
    timeStr: createTs, _salt: `proj-c-${p.id}`,
  });
  if (random() < 0.18) {
    auditObjList.push({
      action: 'data.project.updated',
      resType: 'projects', resId: p.id, orgId: o.id,
      userId: adminId, actorName: adminNm, ip, ua,
      sessionId: randSessionId(`proj-upd-${p.id}`),
      category: 'data', severity: 'info', actorType: 'admin',
      details: `{"title":"${escapeSql(p.title)}","changedFields":["advisor","description"],"organization_id":"${o.id}"}`,
      timeStr: bizTs(AUTH_SPREAD_START, -30 + (pIdx % 20)), _salt: `proj-u-${p.id}`,
    });
  }
});
// 5 synthetic deleted projects
[
  { title: 'Drone Nav System', org: 'TEDU-EE' },
  { title: 'Smart Glove Interface', org: 'CMU-CS' },
  { title: 'Solar Tracker v2', org: 'TEKNOFEST' },
  { title: 'AI Crop Monitor', org: 'TUBITAK-2204A' },
  { title: 'Passive Radar Demo', org: 'IEEE-APSSDC' },
].forEach((proj, di) => {
  const adminId = adminFor(proj.org);
  const adminNm = (orgAdminNames[proj.org] || [])[0] || '';
  const o = orgs.find(x => x.code === proj.org);
  if (!adminId || !o) return;
  const fakeId = uuid(`deleted-project-${proj.org}-${di}`);
  auditObjList.push({
    action: 'data.project.deleted',
    resType: 'projects', resId: fakeId, orgId: o.id,
    userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
    sessionId: randSessionId(`proj-del-${di}`),
    category: 'data', severity: 'medium', actorType: 'admin',
    details: `{"title":"${escapeSql(proj.title)}","organization_id":"${o.id}"}`,
    timeStr: bizTs(AUTH_SPREAD_START, di * 7 + 10), _salt: `proj-d-${di}`,
  });
});

// data.juror.created / .updated for all jurors; data.juror.imported bulk per org
jurorIdList.forEach((j, jIdx) => {
  const adminId = adminFor(j.org);
  const adminNm = (orgAdminNames[j.org] || [])[0] || '';
  const o = orgs.find(x => x.code === j.org);
  if (!adminId || !o) return;
  const createTs = bizTs(AUTH_SPREAD_START, -50 + (jIdx % 25));
  auditObjList.push({
    action: 'data.juror.created',
    resType: 'jurors', resId: j.id, orgId: o.id,
    userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
    sessionId: randSessionId(`juror-create-${j.id}`),
    category: 'data', severity: 'info', actorType: 'admin',
    details: `{"juror_name":"${escapeSql(j.n)}","organization_id":"${o.id}"}`,
    timeStr: createTs, _salt: `jc-${j.id}`,
  });
  if (random() < 0.2) {
    auditObjList.push({
      action: 'data.juror.updated',
      resType: 'jurors', resId: j.id, orgId: o.id,
      userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
      sessionId: randSessionId(`juror-upd-${j.id}`),
      category: 'data', severity: 'info', actorType: 'admin',
      details: `{"juror_name":"${escapeSql(j.n)}","changedFields":["email"],"organization_id":"${o.id}"}`,
      timeStr: bizTs(AUTH_SPREAD_START, -40 + (jIdx % 20)), _salt: `ju-${j.id}`,
    });
  }
});
orgs.forEach(o => {
  const adminId = adminFor(o.code);
  const adminNm = (orgAdminNames[o.code] || [])[0] || '';
  if (!adminId) return;
  const count = randInt(8, 22);
  auditObjList.push({
    action: 'data.juror.imported',
    resType: 'jurors', resId: o.id, orgId: o.id,
    userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
    sessionId: randSessionId(`juror-import-${o.code}`),
    category: 'data', severity: 'info', actorType: 'admin',
    details: `{"count":${count},"organization_id":"${o.id}","format":"CSV"}`,
    timeStr: bizTs(AUTH_SPREAD_START, -55), _salt: `ji-${o.code}`,
  });
});

// config.criteria.updated — once per period (with changedFields diff)
periodData.forEach((pd, pdIdx) => {
  const adminId = adminFor(pd.org);
  const adminNm = (orgAdminNames[pd.org] || [])[0] || '';
  const o = orgs.find(x => x.code === pd.org);
  if (!adminId || !o) return;
  auditObjList.push({
    action: 'config.criteria.updated',
    resType: 'criteria', resId: pd.id, orgId: o.id,
    userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
    sessionId: randSessionId(`crit-upd-${pd.id}`),
    category: 'config', severity: 'medium', actorType: 'admin',
    details: `{"periodName":"${escapeSql(pd.name)}","changedFields":["design_weight","delivery_weight"],"fromTotal":100,"toTotal":100}`,
    timeStr: bizTs(pd.start, -30 - pdIdx), _salt: `cu-${pd.id}`,
  });
});

// outcome.updated — 2 per org; outcome.created + outcome.deleted to show full CRUD lifecycle.
// All three actions come from rpc_admin_{create,update,delete}_period_outcome (migration 050).
orgs.forEach((o, oi) => {
  const adminId = adminFor(o.code);
  const adminNm = (orgAdminNames[o.code] || [])[0] || '';
  if (!adminId) return;
  ['PO-1', 'PO-3'].forEach((outcome, k) => {
    auditObjList.push({
      action: 'outcome.updated',
      resType: 'period_outcomes', resId: o.id, orgId: o.id,
      userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
      sessionId: randSessionId(`outcome-upd-${o.code}-${k}`),
      category: 'config', severity: 'medium', actorType: 'admin',
      details: `{"outcome":"${outcome}","changedFields":["description"],"organization_id":"${o.id}"}`,
      timeStr: bizTs(AUTH_SPREAD_START, 10 + oi * 3 + k), _salt: `ou-${o.code}-${k}`,
    });
  });
  // outcome.created — alternate orgs add a custom outcome at setup
  if (oi % 2 === 0) {
    auditObjList.push({
      action: 'outcome.created',
      resType: 'period_outcomes', resId: o.id, orgId: o.id,
      userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
      sessionId: randSessionId(`outcome-cre-${o.code}`),
      details: `{"outcomeCode":"PO-${5 + oi}","label":"Custom Outcome","organization_id":"${o.id}"}`,
      timeStr: bizTs(AUTH_SPREAD_START, 2 + oi), _salt: `oc-${o.code}`,
    });
    // outcome.deleted — that same custom outcome removed later
    auditObjList.push({
      action: 'outcome.deleted',
      resType: 'period_outcomes', resId: o.id, orgId: o.id,
      userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
      sessionId: randSessionId(`outcome-del-${o.code}`),
      details: `{"outcomeCode":"PO-${5 + oi}","label":"Custom Outcome","organization_id":"${o.id}"}`,
      timeStr: bizTs(AUTH_SPREAD_START, 45 + oi), _salt: `od-${o.code}`,
    });
  }
});

// config.outcome_mapping.updated — once per period
periodData.forEach((pd, pdIdx) => {
  const adminId = adminFor(pd.org);
  const adminNm = (orgAdminNames[pd.org] || [])[0] || '';
  const o = orgs.find(x => x.code === pd.org);
  if (!adminId || !o) return;
  auditObjList.push({
    action: 'config.outcome_mapping.updated',
    resType: 'outcome_mappings', resId: pd.id, orgId: o.id,
    userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
    sessionId: randSessionId(`mapping-upd-${pd.id}`),
    category: 'config', severity: 'medium', actorType: 'admin',
    details: `{"periodName":"${escapeSql(pd.name)}","mappingCount":${randInt(8, 14)},"organization_id":"${o.id}"}`,
    timeStr: bizTs(pd.start, -25 - pdIdx), _salt: `om-${pd.id}`,
  });
});

// config.organization.settings.updated — 2 per org
orgs.forEach((o, oi) => {
  const adminId = adminFor(o.code);
  const adminNm = (orgAdminNames[o.code] || [])[0] || '';
  if (!adminId) return;
  [['locale','timezone'], ['notifications','theme']].forEach((fields, k) => {
    auditObjList.push({
      action: 'config.organization.settings.updated',
      resType: 'organizations', resId: o.id, orgId: o.id,
      userId: adminId, actorName: adminNm, ip: randIp(), ua: randUserAgent(),
      sessionId: randSessionId(`org-settings-${o.code}-${k}`),
      category: 'config', severity: 'low', actorType: 'admin',
      details: `{"changedFields":["${fields.join('","')}"],"organization_id":"${o.id}"}`,
      timeStr: bizTs(AUTH_SPREAD_START, 20 + oi * 2 + k * 5), _salt: `os-${o.code}-${k}`,
    });
  });
});

// security_policy.update — platform admin adjusting security settings (migration 057 trigger)
[
  { day: 5,  details: '{"changedFields":["maxPinAttempts","pinLockCooldown"],"diff":{"before":{"maxPinAttempts":5,"pinLockCooldown":"10m"},"after":{"maxPinAttempts":3,"pinLockCooldown":"5m"}}}' },
  { day: 30, details: '{"changedFields":["qrTtl"],"diff":{"before":{"qrTtl":"12h"},"after":{"qrTtl":"24h"}}}' },
].forEach((item, si) => {
  auditObjList.push({
    action: 'security_policy.update',
    resType: 'security_policy', resId: uuid('security-policy-singleton'), orgId: null,
    userId: demoAdminId, actorName: 'Vera Platform Admin',
    ip: randIp(), ua: randUserAgent(), sessionId: randSessionId(`sec-policy-${si}`),
    category: 'config', severity: 'high', actorType: 'admin',
    details: item.details,
    timeStr: bizTs(AUTH_SPREAD_START, item.day), _salt: `sp-${si}`,
  });
});

// security.anomaly.detected — 6 events covering all 6 sweep rules
[
  // ip_multi_org: same IP across 2 orgs
  { orgCode: 'TEDU-EE', anomalyType: 'login_failure_burst', day: 45,
    summary: '5 failed sign-ins from new IP 195.88.54.17 for koray.yilmazer@vera-eval.app',
    extra: '"event_count":5' },
  // export_burst: 5+ exports in 60 min window
  { orgCode: 'CMU-CS', anomalyType: 'export_burst', day: 62,
    summary: 'Unusual export volume: 6 exports in 45 minutes',
    extra: '"event_count":6' },
  // pin_flood: 10+ juror.pin_locked events
  { orgCode: 'TEKNOFEST', anomalyType: 'pin_flood', day: 77,
    summary: '12 PIN lockout events in 60-minute window',
    extra: '"event_count":12' },
  // org_suspended: organization suspended
  { orgCode: 'TUBITAK-2204A', anomalyType: 'org_suspended', day: 88,
    summary: 'Organization TUBITAK-2204A suspended by platform admin',
    extra: '"event_count":1' },
  // token_revoke_burst: 3 tokens revoked rapidly
  { orgCode: 'IEEE-APSSDC', anomalyType: 'token_revoke_burst', day: 91,
    summary: '3 entry tokens revoked in rapid succession',
    extra: '"event_count":3' },
  // ip_multi_org: same IP across 2 orgs
  { orgCode: 'CANSAT', anomalyType: 'ip_multi_org', day: 105,
    summary: 'IP 88.222.147.93 accessed 2 distinct organizations within 60 minutes',
    extra: '"org_count":2,"ip_address":"88.222.147.93"' },
].forEach((item, ai) => {
  const o = orgs.find(x => x.code === item.orgCode);
  if (!o) return;
  auditObjList.push({
    action: 'security.anomaly.detected',
    resType: 'audit_logs', resId: o.id, orgId: o.id,
    userId: null, actorName: 'System', ip: null, ua: null, sessionId: null,
    category: 'security', severity: 'high', actorType: 'system',
    details: `{"anomaly_type":"${item.anomalyType}","summary":"${escapeSql(item.summary)}","organization_id":"${o.id}",${item.extra}}`,
    timeStr: bizTs(AUTH_SPREAD_START, item.day), _salt: `anom-${ai}`,
  });
});

const auditBatcher = makeBatcher('audit_logs', 'id, organization_id, user_id, action, resource_type, resource_id, category, severity, actor_type, actor_name, ip_address, user_agent, session_id, details, created_at');
auditObjList.forEach(ad => {
  const saltKey = ad._salt !== undefined ? `-${ad._salt}` : '';
  const aId = uuid(`audit-${ad.action}-${ad.resId}${saltKey}-${String(ad.timeStr).substring(0,30)}`);
  const userSql = ad.userId ? `'${ad.userId}'` : 'NULL';
  const orgSql = ad.orgId ? `'${ad.orgId}'` : 'NULL';
  const meta = deriveAuditMeta(ad.action);
  const cat = ad.category || meta.category;
  const sev = ad.severity || meta.severity;
  const act = ad.actorType || meta.actorType;
  const actorNameSql = ad.actorName ? `'${escapeSql(ad.actorName)}'` : 'NULL';
  const ipSql = ad.ip ? `'${ad.ip}'` : 'NULL';
  const uaSql = ad.ua ? `'${escapeSql(ad.ua)}'` : 'NULL';
  const sessionSql = ad.sessionId ? `'${ad.sessionId}'` : 'NULL';
  auditBatcher.push(`('${aId}', ${orgSql}, ${userSql}, '${ad.action}', '${ad.resType}', '${ad.resId}', '${cat}', '${sev}', '${act}', ${actorNameSql}, ${ipSql}, ${uaSql}, ${sessionSql}, '${escapeSql(ad.details)}', ${ad.timeStr})`);
});
auditBatcher.flush(out);
out.push('');

// ═══════════════════════════════════════════════════════════════
// JURY FEEDBACK  — programmatic (~45% cur / ~55% hist) + curated overrides
// ═══════════════════════════════════════════════════════════════

out.push(`-- Jury Feedback`);

// Curated overrides — always emitted regardless of state/probability
const curatedFeedback = new Map([
  // TEDU-EE — English
  ['period-TEDU-EE-0|juror-TEDU-EE-0',         {rating:4,comment:null,pub:false}],
  ['period-TEDU-EE-0|juror-TEDU-EE-1',         {rating:5,comment:'Very practical system. We completed all evaluations on poster day without any issues.',pub:true}],
  ['period-TEDU-EE-0|juror-TEDU-EE-3',         {rating:4,comment:'Clean interface with fast response. The rubric bands were extremely helpful.',pub:true}],
  ['period-TEDU-EE-0|juror-TEDU-EE-5',         {rating:3,comment:'Decent tool overall, but the mobile layout could use improvement for tablet users.',pub:true}],
  ['period-TEDU-EE-1|juror-TEDU-EE-0',         {rating:5,comment:null,pub:false}],
  ['period-TEDU-EE-1|juror-TEDU-EE-2',         {rating:4,comment:'Gets better every semester.',pub:true}],
  // CMU-CS
  ['period-CMU-CS-0|juror-CMU-CS-0',           {rating:5,comment:'Replaced our old paper-based system entirely. The export feature saves hours.',pub:true}],
  ['period-CMU-CS-0|juror-CMU-CS-1',           {rating:4,comment:'Solid tool. Configurable criteria made it easy to adapt.',pub:true}],
  ['period-CMU-CS-0|juror-CMU-CS-3',           {rating:5,comment:'Clean and intuitive. Scoring 12 projects took less than an hour.',pub:true}],
  ['period-CMU-CS-0|juror-CMU-CS-5',           {rating:2,comment:'Had connectivity issues during the session. Lost some progress before it autosaved.',pub:false}],
  ['period-CMU-CS-1|juror-CMU-CS-0',           {rating:5,comment:null,pub:false}],
  ['period-CMU-CS-1|juror-CMU-CS-1',           {rating:3,comment:null,pub:false}],
  ['period-CMU-CS-2|juror-CMU-CS-0',           {rating:4,comment:null,pub:false}],
  ['period-CMU-CS-2|juror-CMU-CS-1',           {rating:5,comment:'Third semester using VERA. It keeps getting better.',pub:true}],
  // TEKNOFEST
  ['period-TEKNOFEST-0|juror-TEKNOFEST-0',     {rating:5,comment:'Yüzlerce takımı hızlıca değerlendirdik. Sistem çok stabil.',pub:true}],
  ['period-TEKNOFEST-0|juror-TEKNOFEST-2',     {rating:4,comment:'Yarışma ortamında çok pratik. QR ile giriş mükemmel.',pub:true}],
  ['period-TEKNOFEST-0|juror-TEKNOFEST-4',     {rating:3,comment:'Kullanılabilir ama yarışma günü internet kesintisinde sorun yaşadık.',pub:false}],
  ['period-TEKNOFEST-1|juror-TEKNOFEST-0',     {rating:4,comment:null,pub:false}],
  ['period-TEKNOFEST-1|juror-TEKNOFEST-1',     {rating:5,comment:'Kullanımı çok kolay, eğitim bile gerekmedi.',pub:true}],
  // IEEE-APSSDC
  ['period-IEEE-APSSDC-0|juror-IEEE-APSSDC-0', {rating:5,comment:'Incredibly smooth experience. No hiccups.',pub:true}],
  ['period-IEEE-APSSDC-0|juror-IEEE-APSSDC-1', {rating:4,comment:'Clean interface, very intuitive.',pub:true}],
  ['period-IEEE-APSSDC-0|juror-IEEE-APSSDC-2', {rating:5,comment:'Best evaluation tool for design contest reviews.',pub:true}],
  ['period-IEEE-APSSDC-1|juror-IEEE-APSSDC-0', {rating:5,comment:null,pub:false}],
  ['period-IEEE-APSSDC-1|juror-IEEE-APSSDC-2', {rating:5,comment:'Used VERA again — consistently excellent.',pub:true}],
  // CANSAT
  ['period-CANSAT-0|juror-CANSAT-0', {rating:5,comment:'Evaluated all teams in a single afternoon. Real-time rankings kept the event exciting.',pub:true}],
  ['period-CANSAT-0|juror-CANSAT-1', {rating:4,comment:'Great for competition settings. Rubric sheet was very helpful.',pub:true}],
  ['period-CANSAT-0|juror-CANSAT-3', {rating:3,comment:'Worked fine but would prefer larger text on the scoring interface.',pub:true}],
  ['period-CANSAT-1|juror-CANSAT-0', {rating:4,comment:null,pub:false}],
  ['period-CANSAT-1|juror-CANSAT-1', {rating:5,comment:'Even better than last year.',pub:true}],
  ['period-CANSAT-1|juror-CANSAT-2', {rating:4,comment:'Straightforward and efficient. No training needed.',pub:true}],
  ['period-CANSAT-2|juror-CANSAT-1', {rating:3,comment:null,pub:false}],
  ['period-CANSAT-2|juror-CANSAT-2', {rating:5,comment:null,pub:false}],
  // TUBITAK-2204A
  ['period-TUBITAK-2204A-0|juror-TUBITAK-2204A-0', {rating:5,comment:'Araştırma projeleri için çok uygun bir değerlendirme aracı.',pub:true}],
  ['period-TUBITAK-2204A-0|juror-TUBITAK-2204A-1', {rating:4,comment:'Kriter bazlı puanlama çok iyi kurgulanmış.',pub:true}],
  ['period-TUBITAK-2204A-0|juror-TUBITAK-2204A-3', {rating:5,comment:'Bilimsel değerlendirme sürecini çok kolaylaştırdı.',pub:true}],
  ['period-TUBITAK-2204A-1|juror-TUBITAK-2204A-0', {rating:4,comment:null,pub:false}],
  ['period-TUBITAK-2204A-1|juror-TUBITAK-2204A-2', {rating:5,comment:'İkinci kez kullanıyoruz, memnuniyetimiz artıyor.',pub:true}],
  ['period-TUBITAK-2204A-1|juror-TUBITAK-2204A-4', {rating:2,comment:'Bazı jüri arkadaşlarım PIN sistemini karmaşık buldu.',pub:false}],
]);

const feedbackCommentsEN = [
  'Smooth evaluation experience from start to finish.',
  'Rubric bands made scoring much clearer.',
  'QR entry worked perfectly on the first try.',
  'Very intuitive — no training needed.',
  'Configurable criteria adapted well to our project types.',
  'Auto-save prevented any data loss during the session.',
  'Clean and minimal — exactly what you need on evaluation day.',
  'Scored all groups in under two hours with no issues.',
  'Great tool for a multi-juror environment.',
  'PIN setup was simple; the whole process took minutes.',
  'Would recommend to other departments running similar evaluations.',
  'Worked well on mobile — no installation needed.',
  'Appreciated the clear rubric descriptions for each criterion.',
  'Everything ran smoothly, even with a large panel of judges.',
  'The summary view made it easy to catch inconsistencies.',
];

const feedbackCommentsTR = [
  'Sistem çok akıcı çalıştı, sorunsuz bir değerlendirme günü geçirdik.',
  'Kriter bazlı puanlama çok pratik ve anlaşılır.',
  'QR kod ile giriş mükemmeldi, hiç sorun yaşamadık.',
  'Mobil cihazdan kolayca kullanılabildi.',
  'PIN sistemi basit ve işlevsel.',
  'Otomatik kayıt özelliği çok işime yaradı.',
  'Arayüz sade ve kullanımı kolay.',
  'Tüm grupları birkaç saat içinde değerlendirdik.',
  'Rubrik bantları puanlama sürecini netleştirdi.',
  'Diğer bölümlere de öneririm.',
  'Çok jüri üyesiyle çalışırken koordinasyon sorunu yaşamadık.',
  'Skor özeti ekranı tutarsızlıkları fark etmemizi kolaylaştırdı.',
];

const orgFeedbackLang = {
  'TEDU-EE':'en', 'CMU-CS':'en', 'IEEE-APSSDC':'en', 'CANSAT':'en',
  'TEKNOFEST':'tr', 'TUBITAK-2204A':'tr',
};

// Probability of giving feedback by semantic state × period recency
const fbProb = {
  Completed:     {cur:0.50, hist:0.65},
  Editing:       {cur:0.50, hist:0.65},
  ReadyToSubmit: {cur:0.35, hist:0.45},
  InProgress:    {cur:0.15, hist:0.22},
};

function pickFbRating() {
  const r = random();
  if (r < 0.02) return 1;
  if (r < 0.10) return 2;
  if (r < 0.30) return 3;
  if (r < 0.70) return 4;
  return 5;
}

// Reverse lookup: jId → jSeed (e.g. 'juror-TEDU-EE-0')
const jurorSeedById = new Map();
jurorIdList.forEach(j => jurorSeedById.set(j.id, `juror-${j.org}-${j.idx}`));

// Resolve feedback timestamps from period eval windows (used for curated safety-net pass)
const feedbackTimestamps = {};
periodData.forEach(pd => {
  feedbackTimestamps[`period-${pd.org}-${pd.histIdx}`] = { evalDay: pd.evalDay, evalDays: pd.evalDays, isCur: pd.isCur };
});

const seenFbKeys = new Set();
const fbRows = [];

authList.forEach(auth => {
  const pSeed = `period-${auth.org}-${auth.histIdx}`;
  const jSeed = jurorSeedById.get(auth.jId);
  if (!jSeed) return;
  const key = `${pSeed}|${jSeed}`;
  const curated = curatedFeedback.get(key);

  if (curated !== undefined) {
    // Always include curated entries — they override state/probability
    seenFbKeys.add(key);
    const minH = auth.isCur ? auth.evalDays * 4 : auth.evalDays * 2;
    const maxH = auth.isCur ? auth.evalDays * 16 : auth.evalDays * 24;
    const commentSql = curated.comment ? `'${escapeSql(curated.comment)}'` : 'NULL';
    fbRows.push(`('${uuid(pSeed)}', '${uuid(jSeed)}', ${curated.rating}, ${commentSql}, ${curated.pub}, ${randSqlTs(auth.evalDay, minH, maxH)})`);
    return;
  }

  const prob = fbProb[auth.semanticState];
  if (!prob) return; // NotStarted, Locked, Blocked — skip

  const threshold = auth.isCur ? prob.cur : prob.hist;
  if (random() >= threshold) return;

  seenFbKeys.add(key);
  const rating = pickFbRating();
  const lang = orgFeedbackLang[auth.org] || 'en';
  const pool = lang === 'tr' ? feedbackCommentsTR : feedbackCommentsEN;
  const comment = random() < 0.50 ? pool[Math.floor(random() * pool.length)] : null;
  const pub = random() < 0.65;
  const minH = auth.isCur ? auth.evalDays * 4 : auth.evalDays * 2;
  const maxH = auth.isCur ? auth.evalDays * 16 : auth.evalDays * 24;
  const commentSql = comment ? `'${escapeSql(comment)}'` : 'NULL';
  fbRows.push(`('${uuid(pSeed)}', '${uuid(jSeed)}', ${rating}, ${commentSql}, ${pub}, ${randSqlTs(auth.evalDay, minH, maxH)})`);
});

// Safety net: include any curated entries whose combo wasn't found in authList
for (const [key, c] of curatedFeedback) {
  if (seenFbKeys.has(key)) continue;
  const [pSeed, jSeed] = key.split('|');
  const pdInfo = feedbackTimestamps[pSeed] || null;
  let createdAtSql = 'now()';
  if (pdInfo) {
    const minH = pdInfo.isCur ? pdInfo.evalDays * 4 : pdInfo.evalDays * 2;
    const maxH = pdInfo.isCur ? pdInfo.evalDays * 16 : pdInfo.evalDays * 24;
    createdAtSql = randSqlTs(pdInfo.evalDay, minH, maxH);
  }
  const commentSql = c.comment ? `'${escapeSql(c.comment)}'` : 'NULL';
  fbRows.push(`('${uuid(pSeed)}', '${uuid(jSeed)}', ${c.rating}, ${commentSql}, ${c.pub}, ${createdAtSql})`);
}

out.push(`INSERT INTO jury_feedback (period_id, juror_id, rating, comment, is_public, created_at) VALUES\n${fbRows.join(',\n')}\nON CONFLICT (period_id, juror_id) DO NOTHING;`);
out.push('');

// ═══════════════════════════════════════════════════════════════
// RESTORE intended is_locked state after trigger side-effects
// ═══════════════════════════════════════════════════════════════
// The auto_lock_period_on_token_insert trigger flips periods.is_locked=true
// whenever entry_tokens are inserted. The seed intentionally keeps the
// "current" period for each org unlocked so demo users can edit criteria
// and outcomes. Re-apply that state explicitly and drop the audit rows the
// trigger wrote as a side-effect (we still write our own curated audit log).

out.push(`-- Restore is_locked=false for current periods after trigger auto-lock`);
out.push(`UPDATE periods SET is_locked = false WHERE is_current = true;`);
out.push(`DELETE FROM audit_logs WHERE action = 'period.auto_lock_on_token' AND actor_type = 'system';`);
out.push('');

// ═══════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════

out.push(`COMMIT;\n`);
fs.writeFileSync(path.resolve(__dirname, '../sql/seeds/demo_seed.sql'), out.join('\n'));

const totalProjs = projList.length;
const totalJurors = jurorIdList.length;
console.log(`Demo seed written to sql/seeds/demo_seed.sql`);
console.log(`  Organizations: ${orgs.length}`);
console.log(`  Periods: ${periodData.length}`);
console.log(`  Projects: ${totalProjs}`);
console.log(`  Jurors: ${totalJurors}`);
console.log(`  Juror-period auths: ${authList.length}`);
console.log(`  Entry tokens: ${tokenList.length}`);
console.log(`  Audit logs: ${auditObjList.length}`);
console.log(`  Jury feedback: ${fbRows.length}`);
console.log(`  TEDU-EE Spring 2026 criteria: PRESERVED (no evolution applied to idx=0)`);

// Per-period state verification
console.log(`\n  State distribution (current periods):`);
const curPeriods = periodData.filter(p => p.isCur);
curPeriods.forEach(pd => {
  const entries = authList.filter(a => a.pId === pd.id);
  const counts = {};
  entries.forEach(a => { counts[a.semanticState] = (counts[a.semanticState] || 0) + 1; });
  const line = Object.entries(counts).map(([s, n]) => `${s}:${n}`).join(' ');
  console.log(`    [${pd.org}] ${line}`);
});

const nonCompleted = authList.filter(a => !a.isCur && a.semanticState !== 'Completed');
console.log(`  Historical period non-Completed states: ${nonCompleted.length} (should be 0)`);
