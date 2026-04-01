// src/admin/hooks/usePageRealtime.js
// Per-page Realtime subscription factory.
// Each page creates its own scoped channel that is cleaned up on unmount.

import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

/**
 * Creates a scoped Supabase Realtime subscription for a single admin page.
 *
 * @param {object}   params
 * @param {string}   params.tenantId      — current tenant (skips subscription if falsy)
 * @param {string}   params.channelName   — unique channel name (e.g. "jurors-page-live")
 * @param {Array}    params.subscriptions — list of table subscriptions:
 *   [{ table, event?, schema?, onPayload }]
 *   - table: Postgres table name
 *   - event: "INSERT" | "UPDATE" | "DELETE" | "*" (default: "*")
 *   - schema: Postgres schema (default: "public")
 *   - onPayload: callback receiving the Realtime payload
 * @param {Array}    [params.deps=[]]     — additional dependency array entries for the effect
 */
export function usePageRealtime({ tenantId, channelName, subscriptions, deps = [] }) {
  useEffect(() => {
    if (!tenantId) return;
    if (!subscriptions || subscriptions.length === 0) return;

    let channel = supabase.channel(channelName);

    for (const sub of subscriptions) {
      channel = channel.on(
        "postgres_changes",
        {
          event: sub.event || "*",
          schema: sub.schema || "public",
          table: sub.table,
        },
        sub.onPayload,
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, channelName, ...deps]);
}
