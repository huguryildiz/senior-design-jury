// src/auth/SecurityPolicyContext.jsx
// Security policy context. AuthProvider populates this on mount.
// Consumers use useSecurityPolicy() to read the live policy.
// useUpdatePolicy() lets SettingsPage push saves back into context immediately.

import { createContext, useContext } from "react";

export const DEFAULT_POLICY = {
  googleOAuth: true,
  emailPassword: true,
  rememberMe: true,
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  requireSpecialChars: true,
  tokenTtl: "24h",
  pinLockCooldown: "30m",
  ccOnPinReset: true,
  ccOnScoreEdit: false,
};
// allowMultiDevice intentionally omitted — removed from drawer and schema.

export const SecurityPolicyContext = createContext({
  policy: DEFAULT_POLICY,
  updatePolicy: () => {},
});

export const useSecurityPolicy = () => useContext(SecurityPolicyContext).policy;
export const useUpdatePolicy   = () => useContext(SecurityPolicyContext).updatePolicy;
