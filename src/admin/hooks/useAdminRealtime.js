// src/admin/hooks/useAdminRealtime.js
// ============================================================
// Manages the Supabase Realtime subscription for the admin panel.
//
// Extracted from useAdminData.js (Phase 5 — Final Decomposition).
//
// Accepts a ref object whose .current holds the background-refresh
// callback. Using a ref (instead of a plain function) keeps this
// effect's dependency array stable — the subscription is only
// torn down and rebuilt when adminPass changes, not on every render.
// ============================================================

import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

/**
 * useAdminRealtime — Supabase Realtime subscription for admin panel data.
 *
 * Subscribes to all relevant tables and calls onRefreshRef.current()
 * (debounced 600 ms) on any change.
 *
 * @param {object} opts
 * @param {string} opts.adminPass           Current resolved admin password.
 * @param {React.MutableRefObject<Function>} opts.onRefreshRef
 *   Ref whose .current is the background-refresh callback. Using a ref
 *   keeps the subscription stable across renders.
 */
export function useAdminRealtime({ adminPass, onRefreshRef }) {
  const bgTimerRef = useRef(null);

  useEffect(() => {
    if (!adminPass) return;

    const scheduleBgRefresh = () => {
      if (bgTimerRef.current) return;
      bgTimerRef.current = setTimeout(() => {
        bgTimerRef.current = null;
        onRefreshRef.current?.();
      }, 600);
    };

    const channel = supabase
      .channel("admin-panel-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "juror_semester_auth" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "semesters" }, scheduleBgRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "jurors" }, scheduleBgRefresh)
      .subscribe();

    return () => {
      if (bgTimerRef.current) {
        clearTimeout(bgTimerRef.current);
        bgTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [adminPass, onRefreshRef]);
}
