// src/layouts/RootLayout.jsx
// Root layout wrapper for the entire app.
// Provides ThemeProvider, AuthProvider, ToastContainer
// and renders child routes via <Outlet />.

import { useContext, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { AuthProvider } from "@/auth";
import { AuthContext } from "@/auth/AuthProvider";
import ToastContainer from "@/shared/ui/ToastContainer";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";
import DraggableThemeToggle from "@/jury/components/DraggableThemeToggle";
import MaintenanceGate from "@/components/MaintenanceGate";

function RootLayoutInner() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const showToggle = !pathname.startsWith("/admin") && !pathname.startsWith("/demo/admin");

  // After Google OAuth, Supabase may redirect to site root instead of /register
  // when the redirect URL isn't in the allow-list. Catch that here.
  useEffect(() => {
    if (auth?.profileIncomplete && pathname !== "/register") {
      navigate("/register", { replace: true });
    }
  }, [auth?.profileIncomplete, pathname, navigate]);

  return (
    <>
      <ErrorBoundary>
        <MaintenanceGate>
          <Outlet />
        </MaintenanceGate>
      </ErrorBoundary>
      <ToastContainer />
      {showToggle && <DraggableThemeToggle />}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
