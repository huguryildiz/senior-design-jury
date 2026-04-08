// src/admin/utils/jurorIdentity.js
// Shared juror identity helpers: title stripping, initials, deterministic colors.
// Used by JurorBadge component and all admin pages.

// Academic / honorific prefixes to strip (for avatar initials only)
// TR: Prof., Dr., Doç., Yrd., Öğr., Gör., Ar., Av., Uzm., Müh., Mim., Vet., Ecz., Dt.
// EN: Prof., Dr., Asst., Assoc., Mr., Mrs., Ms., Miss, Sir, Dame, Rev., Hon., Eng.
const TITLE_PREFIXES = /^(Prof\.\s*Dr\.|Doç\.\s*Dr\.|Yrd\.\s*Doç\.\s*Dr\.|Assoc\.\s*Prof\.\s*Dr\.|Asst\.\s*Prof\.\s*Dr\.|Prof\.|Doç\.|Dr\.|Assoc\.\s*Prof\.|Asst\.\s*Prof\.|Yrd\.|Öğr\.|Gör\.|Ar\.|Av\.|Uzm\.|Müh\.|Mim\.|Vet\.|Ecz\.|Dt\.|Mr\.|Mrs\.|Ms\.|Miss\.|Sir|Dame|Rev\.|Hon\.|Eng\.)\s*/i;

// Academic / honorific suffixes to strip (for avatar initials only)
const TITLE_SUFFIXES = /[,\s]+(Ph\.?D\.?|M\.?Sc\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|B\.?Sc\.?|B\.?S\.?|M\.?D\.?|D\.?D\.?S\.?|J\.?D\.?|LL\.?M\.?|D\.?Phil\.?|Eng\.|Esq\.|Jr\.|Sr\.|II|III|IV|PE|RN)\.?\s*$/i;

/**
 * Remove academic titles/honorifics from a juror name.
 * Used only for avatar initials — display name keeps the full string.
 * "Prof. Dr. Ahmet Kaya, PhD" → "Ahmet Kaya"
 */
export function stripTitles(name) {
  if (!name) return "";
  let cleaned = String(name).trim();
  // Strip suffixes first
  for (let i = 0; i < 3; i++) {
    const prev = cleaned;
    cleaned = cleaned.replace(TITLE_SUFFIXES, "").trim();
    if (cleaned === prev) break;
  }
  // Then strip prefixes
  for (let i = 0; i < 3; i++) {
    const prev = cleaned;
    cleaned = cleaned.replace(TITLE_PREFIXES, "").trim();
    if (cleaned === prev) break;
  }
  return cleaned || String(name).trim();
}

/**
 * Extract initials from a name (strips both prefixes and suffixes).
 * "Prof. Dr. Ali Nezih Güven, PhD" → "ANG"
 * "Ayşe Kaya" → "AK"
 * "Ayşe" → "AY"
 */
export function jurorInitials(name) {
  const clean = stripTitles(name);
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((w) => w.charAt(0).toUpperCase()).join("");
}

// Deterministic hash → integer
function hashInt(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// HSL → hex
function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
      .toString(16).padStart(2, "0");
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Color palette — 12 carefully chosen hues that work on both light/dark themes
const PALETTE_HUES = [210, 340, 160, 30, 270, 190, 350, 120, 50, 300, 230, 80];

/**
 * Deterministic avatar background color for a juror name.
 * Same name → same color everywhere in the admin panel.
 */
export function jurorAvatarBg(name) {
  const hue = PALETTE_HUES[hashInt(stripTitles(name) || "?") % PALETTE_HUES.length];
  return hsl2hex(hue, 55, 32);
}

/**
 * Deterministic avatar text color — near-white for contrast on dark background.
 */
export function jurorAvatarFg(name) {
  const hue = PALETTE_HUES[hashInt(stripTitles(name) || "?") % PALETTE_HUES.length];
  return hsl2hex(hue, 30, 92);
}
