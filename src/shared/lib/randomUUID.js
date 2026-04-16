// src/shared/lib/randomUUID.js
// Safe UUIDv4 generator that falls back to Math.random-based RFC 4122 when
// crypto.randomUUID is unavailable. The Web Crypto API is gated to secure
// contexts (https: or localhost) — scanning a QR from a phone typically
// lands on an http://192.168.x.y dev URL, where crypto.randomUUID() throws
// "is not a function". Correlation IDs do not require cryptographic
// unpredictability, so a probabilistic fallback is acceptable.

export function randomUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
