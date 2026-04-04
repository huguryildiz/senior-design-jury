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
import { supabase, clearPersistedSession } from "@/shared/lib/supabaseClient";
import { getActiveOrganizationId, setActiveOrganizationId } from "@/shared/storage/adminStorage";
import { getProfile, upsertProfile } from "@/shared/api/admin/profiles";
import { getSession, listOrganizationsPublic } from "@/shared/api";
import { KEYS } from "@/shared/storage/keys";
import { DEMO_MODE } from "@/shared/lib/demoMode";

export const AuthContext = createContext(null);
const DEMO_BYPASS_UIDS = (import.meta.env.VITE_DEMO_BYPASS_UIDS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

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
      const result = await supabase.auth.getSession();
      const session = result.data?.session;

      // getSession() returns the cached token — it may already be expired.
      // Proactively refresh if the token expires within 30 s so that the
      // rest of the bootstrap flow (memberships, Realtime) uses a valid JWT.
      if (session?.expires_at && Date.now() / 1000 > session.expires_at - 30) {
        const refreshed = await supabase.auth.refreshSession();
        return refreshed;
      }

      return result;
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
  const [organizations, setOrganizations] = useState([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const hasSessionRef = useRef(false);

  // Fetch tenant memberships from the session RPC.
  const fetchMemberships = useCallback(async () => {
    try {
      const data = await getSession();
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
      setOrganizations([]);
      setActiveOrganizationIdState(null);
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

    // Fetch memberships — demo mode skips REST API (RLS blocks anon on memberships)
    let organizationList = [];
    if (DEMO_MODE) {
      // In demo mode, load orgs directly via service-level query
      try {
        const allOrgs = await listOrganizationsPublic();
        organizationList = allOrgs.map((o) => ({
          id: o.id,
          code: o.code ?? null,
          name: o.name ?? null,
          institution_name: o.institution_name ?? null,
          role: "super_admin",
        }));
      } catch {
        // listOrganizationsPublic may fail in demo (RLS) — keep super_admin role
        organizationList = [{ id: null, code: null, name: null, institution_name: null, role: "super_admin" }];
      }
    } else {
      const memberships = await fetchMemberships();
      if (!mountedRef.current) return;
      organizationList = memberships.map((m) => ({
        id: m.organization_id,
        code: m.organization?.code ?? null,
        name: m.organization?.name ?? null,
        institution_name: m.organization?.institution_name ?? null,
        role: m.role,
      }));
    }
    setOrganizations(organizationList);

    // Detect first-time Google user needing profile completion
    const provider = newSession.user.app_metadata?.provider;
    const profileCompleted = newSession.user.user_metadata?.profile_completed;
    if (provider === "google" && organizationList.length === 0 && !profileCompleted) {
      setProfileIncomplete(true);
    } else {
      setProfileIncomplete(false);
    }

    // Restore or pick active organization
    const savedOrganizationId = getActiveOrganizationId();
    const hasSaved = organizationList.some((o) => o.id === savedOrganizationId);
    const isSuper = organizationList.some((o) => o.role === "super_admin");
    const preferredDemoOrganization = organizationList.find((o) =>
      String(o.code || "").trim().toLowerCase() === "tedu-ee" ||
      String(o.name || "").trim().toLowerCase() === "tedu ee"
    );

    if (DEMO_MODE && preferredDemoOrganization) {
      setActiveOrganizationIdState(preferredDemoOrganization.id);
      setActiveOrganizationId(preferredDemoOrganization.id);
    } else if (DEMO_MODE) {
      // Pick first org if no preferred found
      const picked = organizationList[0];
      if (picked?.id && mountedRef.current) {
        setActiveOrganizationIdState(picked.id);
        setActiveOrganizationId(picked.id);
      }
    } else if (isSuper && !preferredDemoOrganization) {
      // Super-admin: fetch all orgs to populate the switcher and pick active
      // (super_admin memberships have organization_id = NULL, so it won't be in organizationList)
      try {
        const allOrgs = await listOrganizationsPublic();
        const allOrgList = allOrgs.map((o) => ({
          id: o.id,
          code: o.code ?? null,
          name: o.name ?? null,
          role: "super_admin",
        }));
        if (mountedRef.current) setOrganizations(allOrgList);
        const savedIsValid = allOrgList.some((o) => o.id === savedOrganizationId);
        const demoOrg = allOrgs.find((o) =>
          String(o.code || "").trim().toLowerCase() === "tedu-ee" ||
          String(o.name || "").trim().toLowerCase().includes("tedu")
        );
        const preferred = DEMO_MODE ? demoOrg : null;
        const picked = preferred ?? (savedIsValid ? { id: savedOrganizationId } : allOrgList[0]);
        if (picked?.id && mountedRef.current) {
          setActiveOrganizationIdState(picked.id);
          setActiveOrganizationId(picked.id);
        }
      } catch {}
    } else if (hasSaved) {
      setActiveOrganizationIdState(savedOrganizationId);
    } else if (isSuper && organizationList.length > 1) {
      // Super-admin: pick first non-null organization
      const firstOrganization = organizationList.find((o) => o.id != null);
      setActiveOrganizationIdState(firstOrganization?.id || null);
    } else if (organizationList.length > 0) {
      const firstOrganization = organizationList.find((o) => o.id != null);
      setActiveOrganizationIdState(firstOrganization?.id || null);
    } else {
      setActiveOrganizationIdState(null);
    }

    hasSessionRef.current = true;

    // In demo mode, skip the profile upsert (write RPCs are blocked) but
    // still read the display name from profiles so the avatar menu
    // shows the seeded name instead of the fallback "Admin".
    // Bypass users (VITE_DEMO_BYPASS_UIDS) are allowed to upsert.
    const isBypass = DEMO_BYPASS_UIDS.includes(newSession.user.id);
    if (DEMO_MODE && !isBypass) {
      getProfile().then((profile) => {
        if (mountedRef.current && profile?.display_name) {
          setDisplayName(profile.display_name);
        }
      }).catch(() => {});
      setLoading(false);
      return;
    }
    const displayNameFromUser = newSession.user.user_metadata?.name || newSession.user.email;
    upsertProfile(displayNameFromUser).then((profile) => {
      if (mountedRef.current && profile?.display_name) {
        setDisplayName(profile.display_name);
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

  const setActiveOrganization = useCallback((organizationId) => {
    setActiveOrganizationIdState(organizationId);
    setActiveOrganizationId(organizationId);
  }, []);

  const signIn = useCallback(async (email, password, rememberMe = false, captchaToken = "") => {
    try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(rememberMe)); }
    catch {}
    const credentials = captchaToken
      ? { email, password, options: { captchaToken } }
      : { email, password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
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
        redirectTo: `${window.location.origin}?admin`,
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

    // Use the authenticated RPC for application submission
    // This RPC uses auth.uid() for authentication
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
    setOrganizations([]);
    setActiveOrganizationIdState(null);
  }, []);

  // Refresh memberships (e.g., after approval)
  const refreshMemberships = useCallback(async () => {
    const memberships = await fetchMemberships();
    if (!mountedRef.current) return;
    const organizationList = memberships.map((m) => ({
      id: m.organization_id,
      code: m.organization?.code ?? null,
      name: m.organization?.name ?? null,
      role: m.role,
    }));
    setOrganizations(organizationList);
  }, [fetchMemberships]);

  const activeOrganization = useMemo(
    () => organizations.find((o) => o.id === activeOrganizationId) || null,
    [organizations, activeOrganizationId]
  );

  const isSuper = useMemo(
    () => DEMO_MODE || organizations.some((o) => o.role === "super_admin"),
    [organizations]
  );

  const isPending = useMemo(
    () => !DEMO_MODE && !!user && organizations.length === 0,
    [user, organizations]
  );

  const demoBypass = useMemo(
    () => DEMO_BYPASS_UIDS.length > 0 && !!user?.id && DEMO_BYPASS_UIDS.includes(user.id),
    [user]
  );

  const value = useMemo(() => ({
    user,
    session,
    organizations,
    activeOrganization,
    setActiveOrganization,
    displayName,
    setDisplayName,
    isSuper,
    isPending,
    demoBypass,
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
  }), [user, session, organizations, activeOrganization, setActiveOrganization, displayName, setDisplayName,
       isSuper, isPending, demoBypass, profileIncomplete, loading, signIn, signInWithGoogle, signUp, signOut,
       resetPassword, updatePassword, refreshMemberships, completeProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
