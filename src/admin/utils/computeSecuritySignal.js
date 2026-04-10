// src/admin/utils/computeSecuritySignal.js
// ============================================================
// Pure rollup of four security signals into a single pill state
// plus a generated verdict sentence. No React, no Supabase.
// ============================================================

export const SESSION_COUNT_WARN = 3;  // 3–4 → warn
export const SESSION_COUNT_BAD = 5;   // 5+   → bad
export const COUNTRY_WARN = 3;        // 3    → warn
export const COUNTRY_BAD = 4;         // 4+   → bad
export const LAST_LOGIN_WARN_DAYS = 15;
export const LAST_LOGIN_BAD_DAYS = 46;
export const EXPIRED_WARN = 1;
export const EXPIRED_BAD = 2;

const SEVERITY_RANK = { ok: 0, warn: 1, bad: 2 };
const RANK_TO_STATE = { 0: "secure", 1: "review", 2: "risk" };

function classifySessionCount(n) {
  if (n >= SESSION_COUNT_BAD) return "bad";
  if (n >= SESSION_COUNT_WARN) return "warn";
  return "ok";
}

function classifyCountryDiversity(n) {
  if (n >= COUNTRY_BAD) return "bad";
  if (n >= COUNTRY_WARN) return "warn";
  return "ok";
}

function classifyLastLogin(days) {
  if (days == null) return "warn";
  if (days >= LAST_LOGIN_BAD_DAYS) return "bad";
  if (days >= LAST_LOGIN_WARN_DAYS) return "warn";
  return "ok";
}

function classifyExpired(n) {
  if (n >= EXPIRED_BAD) return "bad";
  if (n >= EXPIRED_WARN) return "warn";
  return "ok";
}

function daysBetween(laterMs, earlierMs) {
  if (!Number.isFinite(laterMs) || !Number.isFinite(earlierMs)) return null;
  return Math.floor((laterMs - earlierMs) / 86400_000);
}

function countCountries(sessions) {
  const set = new Set();
  for (const s of sessions) {
    const c = s?.country_code;
    if (c && typeof c === "string" && c.trim()) set.add(c.trim().toUpperCase());
  }
  return set.size;
}

function countExpired(sessions, nowMs) {
  let n = 0;
  for (const s of sessions) {
    const exp = Date.parse(s?.expires_at || "");
    if (Number.isFinite(exp) && exp < nowMs) n += 1;
  }
  return n;
}

// Build the one- or two-signal verdict reason string.
// Order: bad signals first, then warn, in the canonical signal order.
function buildVerdict(state, signals) {
  if (state === "secure" || state === "loading") {
    return { title: null, reason: null };
  }

  const title =
    state === "risk"
      ? "This account is at risk."
      : "This account needs a review.";

  const order = [
    "sessionCount",
    "countryDiversity",
    "lastLoginFreshness",
    "expiredSessions",
  ];
  const phrase = {
    sessionCount: (v) => `${v} active sessions`,
    countryDiversity: (v) => `${v} countries`,
    lastLoginFreshness: (v) => `${v} days of inactivity`,
    expiredSessions: (v) => `${v} expired sessions`,
  };

  const bads = order.filter((k) => signals[k].severity === "bad");
  const warns = order.filter((k) => signals[k].severity === "warn");
  const ranked = [...bads, ...warns].slice(0, 2);

  if (ranked.length === 0) {
    return { title, reason: null };
  }

  const parts = ranked.map((k) => phrase[k](signals[k].value));
  const joined = parts.length === 2 ? `${parts[0]} and ${parts[1]}` : parts[0];
  const stateWord = state === "risk" ? "At Risk" : "Review";
  const reason = `${joined} pushed this account to ${stateWord}.`;
  // Capitalize first letter of the joined phrase
  const capitalized = reason.charAt(0).toUpperCase() + reason.slice(1);

  return { title, reason: capitalized };
}

export function computeSecuritySignal({
  adminSessions,
  lastLoginAt,
  loading,
  now = Date.now(),
}) {
  if (loading) {
    return {
      state: "loading",
      signals: {
        sessionCount: { value: 0, severity: "ok" },
        countryDiversity: { value: 0, severity: "ok" },
        lastLoginFreshness: { value: null, severity: "ok" },
        expiredSessions: { value: 0, severity: "ok" },
      },
      verdict: { title: null, reason: null },
    };
  }

  const sessions = Array.isArray(adminSessions) ? adminSessions : [];
  // Empty tracked sessions → treat current browser as 1 session so the pill
  // is not misleading for freshly logged-in admins before session tracking
  // has populated `admin_user_sessions`.
  const sessionCountValue = sessions.length > 0 ? sessions.length : 1;

  const countryValue = countCountries(sessions);
  const expiredValue = countExpired(sessions, now);

  const lastLoginMs = Date.parse(lastLoginAt || "");
  const lastLoginDays = Number.isFinite(lastLoginMs)
    ? daysBetween(now, lastLoginMs)
    : null;

  const signals = {
    sessionCount: {
      value: sessionCountValue,
      severity: classifySessionCount(sessionCountValue),
    },
    countryDiversity: {
      value: countryValue,
      severity: classifyCountryDiversity(countryValue),
    },
    lastLoginFreshness: {
      value: lastLoginDays,
      severity: classifyLastLogin(lastLoginDays),
    },
    expiredSessions: {
      value: expiredValue,
      severity: classifyExpired(expiredValue),
    },
  };

  const maxRank = Math.max(
    ...Object.values(signals).map((s) => SEVERITY_RANK[s.severity] ?? 0),
  );
  const state = RANK_TO_STATE[maxRank];

  return {
    state,
    signals,
    verdict: buildVerdict(state, signals),
  };
}
