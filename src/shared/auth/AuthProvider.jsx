// src/shared/auth/AuthProvider.jsx
// ============================================================
// Phase C.4: React context provider for Supabase Auth + tenant
// membership state. Wraps the app and manages:
//   - supabase.auth.onAuthStateChange subscription
//   - Current user state (id, email)
//   - Tenant memberships (from rpc_admin_auth_get_session)
//   - Active tenant selection
//   - Loading state during session restoration
// ============================================================

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, clearPersistedSession } from "../../lib/supabaseClient";
import { getActiveTenantId, setActiveTenantId } from "../storage/adminStorage";
import { adminProfileUpsert, adminProfileGet } from "../api/admin/profiles";
import { KEYS } from "../storage/keys";

export const AuthContext = createContext(null);

function isRecoverableAuthLockError(error) {
  const msg = String(error?.message || "");
  return (
    error?.name === "AbortError" &&
    (msg.includes("Lock broken by another request with the 'steal' option") ||
      msg.includes("was not released within"))
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSessionWithRetry(maxAttempts = 3) {
  let lastError;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      return await supabase.auth.getSession();
    } catch (error) {
      lastError = error;
      if (!isRecoverableAuthLockError(error) || i === maxAttempts - 1) {
        throw error;
      }
      await wait(120 * (i + 1));
    }
  }
  throw lastError;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantIdState] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const hasSessionRef = useRef(false);

  // Fetch tenant memberships from the session RPC.
  const fetchMemberships = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("rpc_admin_auth_get_session");
      if (error) {
        console.error("Failed to fetch session memberships:", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("fetchMemberships error:", e);
      return [];
    }
  }, []);

  // Process auth state change.
  const handleAuthChange = useCallback(async (_event, newSession) => {
    if (!mountedRef.current) return;

    if (!newSession?.user) {
      setUser(null);
      setSession(null);
      setTenants([]);
      setActiveTenantIdState(null);
      setLoading(false);
      return;
    }

    // TOKEN_REFRESHED and re-SIGNED_IN fire when returning to a browser tab.
    // If we already have a session, just update it — do NOT show
    // the full-screen loader or re-fetch memberships.
    if (_event !== "INITIAL_SESSION" && hasSessionRef.current) {
      setSession(newSession);
      return;
    }

    setLoading(true);
    setSession(newSession);
    setUser({
      id: newSession.user.id,
      email: newSession.user.email,
      name: newSession.user.user_metadata?.name || newSession.user.email,
    });

    // Fetch memberships
    const memberships = await fetchMemberships();
    if (!mountedRef.current) return;

    const tenantList = memberships.map((m) => ({
      id: m.tenant_id,
      code: m.tenant_code,
      name: m.tenant_short_label,
      role: m.role,
    }));
    setTenants(tenantList);

    // Detect first-time Google user needing profile completion
    const provider = newSession.user.app_metadata?.provider;
    const profileCompleted = newSession.user.user_metadata?.profile_completed;
    if (provider === "google" && tenantList.length === 0 && !profileCompleted) {
      setProfileIncomplete(true);
    } else {
      setProfileIncomplete(false);
    }

    // Restore or pick active tenant
    const savedTenantId = getActiveTenantId();
    const hasSaved = tenantList.some((t) => t.id === savedTenantId);
    const isSuper = tenantList.some((t) => t.role === "super_admin");
    const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
    const preferredDemoTenant = tenantList.find((t) =>
      String(t.code || "").trim().toLowerCase() === "tedu-ee" ||
      String(t.name || "").trim().toLowerCase() === "tedu ee"
    );

    if (isDemoMode && preferredDemoTenant) {
      setActiveTenantIdState(preferredDemoTenant.id);
      setActiveTenantId(preferredDemoTenant.id);
    } else if (hasSaved) {
      setActiveTenantIdState(savedTenantId);
    } else if (isSuper && tenantList.length > 1) {
      // Super-admin: pick first non-null tenant
      const firstTenant = tenantList.find((t) => t.id != null);
      setActiveTenantIdState(firstTenant?.id || null);
    } else if (tenantList.length > 0) {
      const firstTenant = tenantList.find((t) => t.id != null);
      setActiveTenantIdState(firstTenant?.id || null);
    } else {
      setActiveTenantIdState(null);
    }

    hasSessionRef.current = true;

    // In demo mode, skip the profile upsert (write RPCs are blocked) but
    // still read the display name from admin_profiles so the avatar menu
    // shows the seeded name instead of the fallback "Admin".
    const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
    if (DEMO_MODE) {
      adminProfileGet().then((profile) => {
        if (mountedRef.current && profile?.display_name) {
          setDisplayName(profile.display_name);
        }
      }).catch(() => {});
      setLoading(false);
      return;
    }
    adminProfileUpsert().then((profile) => {
      if (mountedRef.current && profile?.out_display_name) {
        setDisplayName(profile.out_display_name);
      }
    }).catch(() => {});

    setLoading(false);

    // If "Remember me" was not checked, clear persisted session
    try {
      if (localStorage.getItem(KEYS.ADMIN_REMEMBER_ME) !== "true") {
        clearPersistedSession();
      }
    } catch {}
  }, [fetchMemberships]);

  useEffect(() => {
    mountedRef.current = true;
    let bootstrapped = false;

    // Safety net: never keep app blocked behind auth loading forever.
    const bootstrapTimeout = setTimeout(() => {
      if (!mountedRef.current || bootstrapped) return;
      setLoading(false);
    }, 4000);

    const finishBootstrap = () => {
      bootstrapped = true;
      clearTimeout(bootstrapTimeout);
    };

    // Subscribe first so auth events are not missed while initial session loads.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      handleAuthChange(event, newSession).finally(() => {
        finishBootstrap();
      });
    });

    // Get initial session
    getSessionWithRetry()
      .then(({ data: { session: initialSession } }) => {
        return handleAuthChange("INITIAL_SESSION", initialSession);
      })
      .catch((error) => {
        if (isRecoverableAuthLockError(error)) {
          // Lock contention during startup should not crash initialization.
          return handleAuthChange("INITIAL_SESSION", null);
        }
        console.error("Initial session fetch failed:", error);
        return handleAuthChange("INITIAL_SESSION", null);
      })
      .finally(() => {
        if (!mountedRef.current) return;
        finishBootstrap();
      });

    return () => {
      mountedRef.current = false;
      clearTimeout(bootstrapTimeout);
      subscription.unsubscribe();
    };
  }, [handleAuthChange]);

  const setActiveTenant = useCallback((tenantId) => {
    setActiveTenantIdState(tenantId);
    setActiveTenantId(tenantId);
  }, []);

  const signIn = useCallback(async (email, password, rememberMe = false) => {
    try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(rememberMe)); }
    catch {}
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!rememberMe) clearPersistedSession();
    return data;
  }, []);

  const signInWithGoogle = useCallback(async (rememberMe = false) => {
    // Persist preference before redirect (checked in handleAuthChange after redirect)
    try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(rememberMe)); }
    catch {}
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}?page=admin`,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const completeProfile = useCallback(async ({ name, university, department, tenantId }) => {
    // Update user metadata to mark profile as completed
    const { error: metaError } = await supabase.auth.updateUser({
      data: { profile_completed: true, name },
    });
    if (metaError) throw metaError;

    // Use the 4-param authenticated overload (no email/password needed)
    const { data, error } = await supabase.rpc("rpc_admin_application_submit", {
      p_tenant_id: tenantId,
      p_name: name,
      p_university: university || "",
      p_department: department || "",
    });
    if (error) throw error;

    setProfileIncomplete(false);
  }, []);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.functions.invoke("password-reset-email", {
      body: { email },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    // Best-effort security notification; never block successful password update.
    try {
      await supabase.functions.invoke("password-changed-notify", {
        body: {},
      });
    } catch {}
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    hasSessionRef.current = false;
    setUser(null);
    setSession(null);
    setTenants([]);
    setActiveTenantIdState(null);
  }, []);

  // Refresh memberships (e.g., after approval)
  const refreshMemberships = useCallback(async () => {
    const memberships = await fetchMemberships();
    if (!mountedRef.current) return;
    const tenantList = memberships.map((m) => ({
      id: m.tenant_id,
      code: m.tenant_code,
      name: m.tenant_short_label,
      role: m.role,
    }));
    setTenants(tenantList);
  }, [fetchMemberships]);

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === activeTenantId) || null,
    [tenants, activeTenantId]
  );

  const isSuper = useMemo(
    () => tenants.some((t) => t.role === "super_admin"),
    [tenants]
  );

  const isPending = useMemo(
    () => !!user && tenants.length === 0,
    [user, tenants]
  );

  const value = useMemo(() => ({
    user,
    session,
    tenants,
    activeTenant,
    setActiveTenant,
    displayName,
    setDisplayName,
    isSuper,
    isPending,
    profileIncomplete,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshMemberships,
    completeProfile,
  }), [user, session, tenants, activeTenant, setActiveTenant, displayName, setDisplayName,
       isSuper, isPending, profileIncomplete, loading, signIn, signInWithGoogle, signUp, signOut,
       resetPassword, updatePassword, refreshMemberships, completeProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
