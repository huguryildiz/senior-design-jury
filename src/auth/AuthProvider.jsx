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
import { invokeEdgeFunction } from "@/shared/api/core/invokeEdgeFunction";
import { getActiveOrganizationId, setActiveOrganizationId } from "@/shared/storage/adminStorage";
import { getProfile, upsertProfile } from "@/shared/api/admin/profiles";
import { getSession, listOrganizationsPublic, getSecurityPolicy, getPublicAuthFlags, touchAdminSession } from "@/shared/api";
import { KEYS } from "@/shared/storage/keys";
import { DEMO_MODE } from "@/shared/lib/demoMode";
import { getAdminDeviceId, getAuthMethodLabelFromSession, parseUserAgent } from "@/shared/lib/adminSession";
import { SecurityPolicyContext, DEFAULT_POLICY } from "./SecurityPolicyContext";

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
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const mountedRef = useRef(true);
  const hasSessionRef = useRef(false);
  const policyLoadedRef = useRef(false);
  // Suppress the next USER_UPDATED newEmail re-application after an explicit cancel.
  const suppressEmailUpdateRef = useRef(false);

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
      // USER_UPDATED fires after updateUser() — sync newEmail into user state.
      // If new_email equals current email, the user cancelled the change (confirmation to self);
      // treat as no pending change.
      if (_event === "USER_UPDATED" && newSession?.user) {
        if (suppressEmailUpdateRef.current) {
          // User explicitly cancelled the pending email change — keep newEmail null
          // regardless of what Supabase still has in new_email on this event.
          suppressEmailUpdateRef.current = false;
        } else {
          const rawNew = newSession.user.new_email;
          const effectiveNew = (rawNew && rawNew !== newSession.user.email) ? rawNew : null;
          setUser((prev) => prev ? { ...prev, newEmail: effectiveNew } : prev);
        }
      }
      return;
    }

    setLoading(true);
    setSession(newSession);
    setUser({
      id: newSession.user.id,
      email: newSession.user.email,
      newEmail: newSession.user.new_email ?? null,
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
          institution: o.institution ?? null,
          role: "super_admin",
        }));
      } catch {
        // listOrganizationsPublic may fail in demo (RLS) — keep super_admin role
        organizationList = [{ id: null, code: null, name: null, institution: null, role: "super_admin" }];
      }
    } else {
      const memberships = await fetchMemberships();
      if (!mountedRef.current) return;
      organizationList = memberships.map((m) => ({
        id: m.organization_id,
        code: m.organization?.code ?? null,
        name: m.organization?.name ?? null,
        institution: m.organization?.institution ?? null,
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
          institution: o.institution ?? null,
          role: "super_admin",
        }));
        // Keep super-admin role visible even when there are no active orgs.
        // Without this fallback, organizations becomes [] and UI falls into
        // the pending gate despite an existing super_admin membership.
        const resolvedOrgList = allOrgList.length > 0
          ? allOrgList
          : [{ id: null, code: null, name: null, institution: null, role: "super_admin" }];
        if (mountedRef.current) setOrganizations(resolvedOrgList);
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

    // Fetch security policy once for super admins only.
    // Non-admin/new OAuth users can hit RPC auth checks and return 400.
    const canReadPolicy = organizationList.some((o) => o.role === "super_admin");
    if (!policyLoadedRef.current && canReadPolicy) {
      policyLoadedRef.current = true;
      getSecurityPolicy()
        .then((p) => { if (mountedRef.current && p) setPolicy(p); })
        .catch(() => {});
    }

    const displayNameFromUser = newSession.user.user_metadata?.name || newSession.user.email;
    upsertProfile(displayNameFromUser).then((profile) => {
      if (mountedRef.current && profile?.display_name) {
        setDisplayName(profile.display_name);
      }
      if (mountedRef.current && profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
    }).catch(() => {});

    setLoading(false);

    // Only clear persisted session when preference is explicitly false.
    // Missing key (legacy sessions) should not force logout.
    try {
      if (localStorage.getItem(KEYS.ADMIN_REMEMBER_ME) === "false") {
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

  // Fetch the three public auth flags (googleOAuth, emailPassword, rememberMe)
  // from rpc_public_auth_flags so the login screen can hide disabled methods
  // for anonymous users. This runs independently of the super-admin policy
  // fetch because it uses an anon-callable RPC and does not depend on session.
  useEffect(() => {
    getPublicAuthFlags()
      .then((flags) => {
        if (!mountedRef.current || !flags) return;
        setPolicy((prev) => ({ ...prev, ...flags }));
      })
      .catch(() => {});
  }, []);

  const touchCurrentAdminSession = useCallback(async () => {
    if (!session?.user?.id || !session?.access_token) return;

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const { browser, os } = parseUserAgent(userAgent);
    const deviceId = getAdminDeviceId();
    const authMethod = getAuthMethodLabelFromSession(session, user);

    await touchAdminSession({
      deviceId,
      userAgent,
      browser,
      os,
      authMethod,
      signedInAt: session?.user?.last_sign_in_at || null,
      expiresAt: session?.expires_at || null,
      accessToken: session.access_token,
    });
  }, [session, user]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;

    const safeTouch = () => {
      touchCurrentAdminSession().catch(() => {});
    };

    safeTouch();
    const intervalId = setInterval(safeTouch, 5 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        safeTouch();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session?.user?.id, touchCurrentAdminSession]);

  const setActiveOrganization = useCallback((organizationId) => {
    setActiveOrganizationIdState(organizationId);
    setActiveOrganizationId(organizationId);
  }, []);

  const signIn = useCallback(async (email, password, rememberMe = false, captchaToken = "") => {
    if (!policy.emailPassword) throw new Error("Email/password login is disabled.");
    try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(rememberMe)); }
    catch {}
    const credentials = captchaToken
      ? { email, password, options: { captchaToken } }
      : { email, password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    if (!rememberMe) clearPersistedSession();
    // Fire-and-forget audit log for admin login
    import("@/shared/api").then(({ writeAuditLog }) => {
      writeAuditLog("admin.login", {
        resourceType: "profiles",
        details: { method: "password" },
      }).catch((e) => console.warn("Audit write failed:", e?.message));
    }).catch(() => {});
    return data;
  }, [policy.emailPassword]);

  const signInWithGoogle = useCallback(async (rememberMe = false) => {
    if (!policy.googleOAuth) throw new Error("Google sign-in is disabled.");
    // Persist preference before redirect (checked in handleAuthChange after redirect)
    try { localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, String(rememberMe)); }
    catch {}
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Route OAuth callback through /register so first-time Google users
        // land directly on the application form.
        redirectTo: `${window.location.origin}/register`,
      },
    });
    if (error) throw error;
    return data;
  }, [policy.googleOAuth]);

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
    const { data, error } = await invokeEdgeFunction("password-reset-email", {
      body: { email },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    import("@/shared/api").then(({ writeAuditLog }) => {
      writeAuditLog("notification.password_reset", {
        resourceType: "profiles",
        details: { email },
      }).catch((e) => console.warn("Audit write failed:", e?.message));
    }).catch(() => {});
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    // Best-effort security notification; never block successful password update.
    try {
      await invokeEdgeFunction("password-changed-notify", { body: {} });
    } catch {}
    return data;
  }, []);

  const reauthenticateWithPassword = useCallback(async (password) => {
    const email = String(user?.email || "").trim();
    if (!email) throw new Error("Session expired. Please sign in again.");
    if (!String(password || "").trim()) throw new Error("Current password is required.");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = String(error?.message || "").toLowerCase();
      if (msg.includes("invalid login credentials")) {
        throw new Error("Current password is incorrect.");
      }
      throw error;
    }
    return data;
  }, [user?.email]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: "local" });
    hasSessionRef.current = false;
    setUser(null);
    setSession(null);
    setOrganizations([]);
    setActiveOrganizationIdState(null);
  }, []);

  const signOutAll = useCallback(async () => {
    await supabase.auth.signOut({ scope: "global" });
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
    const isSuperMember = memberships.some((m) => m.role === "super_admin");
    if (isSuperMember) {
      try {
        const allOrgs = await listOrganizationsPublic();
        const allOrgList = allOrgs.map((o) => ({
          id: o.id,
          code: o.code ?? null,
          name: o.name ?? null,
          institution: o.institution ?? null,
          role: "super_admin",
        }));
        const resolvedOrgList = allOrgList.length > 0
          ? allOrgList
          : [{ id: null, code: null, name: null, institution: null, role: "super_admin" }];
        if (mountedRef.current) setOrganizations(resolvedOrgList);
      } catch {
        const organizationList = memberships
          .filter((m) => m.organization?.status !== "archived")
          .map((m) => ({
            id: m.organization_id,
            code: m.organization?.code ?? null,
            name: m.organization?.name ?? null,
            institution: m.organization?.institution ?? null,
            role: m.role,
          }));
        if (mountedRef.current) setOrganizations(organizationList);
      }
    } else {
      const organizationList = memberships
        .filter((m) => m.organization?.status !== "archived")
        .map((m) => ({
          id: m.organization_id,
          code: m.organization?.code ?? null,
          name: m.organization?.name ?? null,
          institution: m.organization?.institution ?? null,
          role: m.role,
        }));
      if (mountedRef.current) setOrganizations(organizationList);
    }
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

  const refreshUser = useCallback(async () => {
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (freshUser) {
      setUser((prev) => prev ? {
        ...prev,
        email: freshUser.email,
        newEmail: freshUser.new_email ?? null,
      } : prev);
    }
  }, []);

  const clearPendingEmail = useCallback(() => {
    suppressEmailUpdateRef.current = true;
    setUser((prev) => prev ? { ...prev, newEmail: null } : prev);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    organizations,
    activeOrganization,
    setActiveOrganization,
    displayName,
    setDisplayName,
    avatarUrl,
    setAvatarUrl,
    isSuper,
    isPending,
    profileIncomplete,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    signOutAll,
    resetPassword,
    updatePassword,
    reauthenticateWithPassword,
    refreshMemberships,
    completeProfile,
    refreshUser,
    clearPendingEmail,
  }), [user, session, organizations, activeOrganization, setActiveOrganization, displayName, setDisplayName,
       avatarUrl, setAvatarUrl, isSuper, isPending, profileIncomplete, loading, signIn,
    signInWithGoogle, signUp, signOut, signOutAll, resetPassword, updatePassword, reauthenticateWithPassword, refreshMemberships, completeProfile, refreshUser, clearPendingEmail]);

  const policyContextValue = useMemo(
    () => ({ policy, updatePolicy: setPolicy }),
    [policy]
  );

  return (
    <SecurityPolicyContext.Provider value={policyContextValue}>
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    </SecurityPolicyContext.Provider>
  );
}
