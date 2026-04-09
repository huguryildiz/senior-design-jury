// src/guards/JuryGuard.jsx
// Protects jury flow routes — redirects to the correct gate if no jury session.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getJuryAccess } from "@/shared/storage";

export default function JuryGuard() {
  const location = useLocation();
  const hasAccess = getJuryAccess();

  if (!hasAccess) {
    const evalPath = location.pathname.startsWith("/demo") ? "/demo/eval" : "/eval";
    return <Navigate to={evalPath} replace />;
  }

  return <Outlet />;
}
