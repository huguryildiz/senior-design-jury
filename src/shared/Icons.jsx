// src/shared/Icons.jsx
// ============================================================
// All SVG icon components used across the application.
// Centralised here to eliminate duplication (previously HomeIcon
// existed in both JuryForm.jsx and admin/components.jsx).
// ============================================================

export function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

export function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

export function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6"/>
      <path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

// Medal SVGs — fill the 52×52 rank-num container exactly.
// Ribbon tab at top + circular medal face.
export function MedalGold() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="19" y="2" width="14" height="14" rx="3" fill="#FCD34D"/>
      <rect x="22" y="2" width="8" height="18" rx="2" fill="#F59E0B"/>
      <circle cx="26" cy="34" r="16" fill="#F59E0B"/>
      <circle cx="26" cy="34" r="12" fill="#FCD34D"/>
      <text x="26" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#92400E" fontFamily="sans-serif">1</text>
    </svg>
  );
}

export function MedalSilver() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="19" y="2" width="14" height="14" rx="3" fill="#CBD5E1"/>
      <rect x="22" y="2" width="8" height="18" rx="2" fill="#94A3B8"/>
      <circle cx="26" cy="34" r="16" fill="#94A3B8"/>
      <circle cx="26" cy="34" r="12" fill="#CBD5E1"/>
      <text x="26" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#334155" fontFamily="sans-serif">2</text>
    </svg>
  );
}

export function MedalBronze() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="19" y="2" width="14" height="14" rx="3" fill="#FDBA74"/>
      <rect x="22" y="2" width="8" height="18" rx="2" fill="#B45309"/>
      <circle cx="26" cy="34" r="16" fill="#B45309"/>
      <circle cx="26" cy="34" r="12" fill="#FDBA74"/>
      <text x="26" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#7C2D12" fontFamily="sans-serif">3</text>
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6"/>
      <path d="M1 20v-6h6"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
