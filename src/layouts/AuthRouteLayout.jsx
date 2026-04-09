// src/layouts/AuthRouteLayout.jsx
// Standalone auth routes (/login, /register, /forgot-password, /reset-password).
// Always under a non-/demo path, so environment resolves to prod automatically.

import { Outlet } from "react-router-dom";

export default function AuthRouteLayout() {
  return <Outlet />;
}
