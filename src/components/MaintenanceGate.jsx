// src/components/MaintenanceGate.jsx
// ============================================================
// Root-level kill-switch that reads maintenance_mode state and
// either blocks non-super-admin users with <MaintenancePage /> or
// renders the normal app. Mounts inside RootLayout so every route
// (landing, auth, /eval, /jury, /admin, /demo/*) is covered.
//
// Status refresh strategy:
//   1. Fetch once on mount
//   2. Supabase Realtime subscription on `maintenance_mode` table
//   3. 30s polling fallback (in case Realtime drops)
//   4. Re-subscribe when pathname crosses the /demo ↔ prod boundary
//      (the `supabase` client Proxy switches environments)
//
// Super admins bypass the gate entirely but see a warning banner.
// ============================================================

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/shared/lib/supabaseClient";
import { getMaintenanceStatus } from "@/shared/api/admin/maintenance";
import MaintenancePage from "./MaintenancePage";

export const MaintenanceContext = createContext({ isActiveNow: false, isUpcoming: false, status: null });
export function useMaintenanceStatus() { return useContext(MaintenanceContext); }

const POLL_INTERVAL_MS = 30_000;

/**
 * Determines whether the current env is "demo" based on pathname.
 * Used to rebuild the Realtime subscription when the user navigates
 * across the /demo ↔ prod boundary.
 */
function envKeyFromPath(pathname) {
  return pathname.startsWith("/demo") ? "demo" : "prod";
}

export default function MaintenanceGate({ children }) {
  const { isSuper, activeOrganization } = useAuth();
  const { pathname } = useLocation();
  const envKey = envKeyFromPath(pathname);

  // null = first fetch hasn't completed yet (render children, don't flash gate)
  const [status, setStatus] = useState(null);
  const fetchSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const mySeq = ++fetchSeq.current;

    async function fetchStatus() {
      try {
        const data = await getMaintenanceStatus();
        if (cancelled || mySeq !== fetchSeq.current) return;
        setStatus(data || null);
      } catch (err) {
        console.warn("[MaintenanceGate] fetch failed:", err);
        // Non-fatal: keep last known status. Polling will retry.
      }
    }

    // 1. Initial fetch
    fetchStatus();

    // 2. Realtime subscription — debounced refetch on any change
    let debounceTimer = null;
    const scheduleRefetch = () => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        fetchStatus();
      }, 400);
    };

    const channel = supabase
      .channel(`maintenance-gate-${envKey}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_mode" },
        scheduleRefetch
      )
      .subscribe();

    // 3. 30s polling fallback
    const pollTimer = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [envKey]);

  // Derived state:
  //   - isActiveNow: maintenance is currently blocking users
  //   - isUpcoming: scheduled but not yet started (show countdown banner)
  //   - shouldBlock: current user should see the full MaintenancePage
  const { isActiveNow, isUpcoming, shouldBlock, activeForSuperAdmin } = useMemo(() => {
    if (!status) {
      return { isActiveNow: false, isUpcoming: false, shouldBlock: false, activeForSuperAdmin: false };
    }

    const liveFromRpc = !!status.is_active;
    const upcoming = !!status.upcoming; // set by extended RPC in migration 032
    const affectedOrgIds = Array.isArray(status.affected_org_ids) ? status.affected_org_ids : null;

    // Affected-orgs filter: if the DB lists specific orgs and the current user's
    // active tenant is not in it, they should not be blocked.
    let orgAllowed = true;
    if (liveFromRpc && affectedOrgIds && affectedOrgIds.length > 0) {
      const myOrgId = activeOrganization?.id || null;
      orgAllowed = myOrgId ? affectedOrgIds.includes(myOrgId) : true;
    }

    const blocksUser = liveFromRpc && orgAllowed && !isSuper;

    return {
      isActiveNow: liveFromRpc,
      isUpcoming: upcoming && !liveFromRpc,
      shouldBlock: blocksUser,
      activeForSuperAdmin: liveFromRpc && isSuper,
    };
  }, [status, isSuper, activeOrganization]);

  // Blocking path: render MaintenancePage instead of the app
  if (shouldBlock) {
    return (
      <MaintenancePage
        message={status?.message || ""}
        startTime={status?.start_time || null}
        endTime={status?.end_time || null}
        mode={status?.mode || "scheduled"}
      />
    );
  }

  // Non-blocking path: app is usable, expose status via context so admin
  // layout can render its own in-column banner (doesn't cover sidebar/logo).
  // For non-admin routes (landing, eval, jury) we show the super-admin banner
  // here since there's no sidebar to worry about.
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/demo/admin");

  return (
    <MaintenanceContext.Provider value={{ isActiveNow, isUpcoming, status }}>
      {activeForSuperAdmin && !isAdminPath && (
        <div className="maintenance-super-banner" role="status" aria-live="polite">
          <AlertTriangle size={13} strokeWidth={2.5} aria-hidden />
          <span><strong>Maintenance is active.</strong> Regular users are locked out — only super admins retain access.</span>
        </div>
      )}
      {isUpcoming && (
        <UpcomingCountdownBanner startTime={status?.start_time} />
      )}
      {children}
    </MaintenanceContext.Provider>
  );
}

// ── Upcoming countdown banner ────────────────────────────────
// Shows "Maintenance in 12m 03s" when maintenance is scheduled
// but hasn't started yet. Updates every second.
function UpcomingCountdownBanner({ startTime }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!startTime) return null;

  const deltaMs = new Date(startTime).getTime() - now;
  if (deltaMs <= 0) return null;

  const totalSec = Math.floor(deltaMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const formatted = h > 0
    ? `${h}h ${m}m ${String(s).padStart(2, "0")}s`
    : `${m}m ${String(s).padStart(2, "0")}s`;

  return (
    <div className="maintenance-upcoming-banner" role="status" aria-live="polite">
      <AlertTriangle size={14} strokeWidth={2.25} aria-hidden />
      <span>
        <strong>Scheduled maintenance in {formatted}.</strong> Please save your work — the platform will be unavailable soon.
      </span>
    </div>
  );
}
