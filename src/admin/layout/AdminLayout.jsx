// src/admin/layout/AdminLayout.jsx
// Matches prototype .admin-shell structure.
// Mobile overlay + sidebar + .admin-main content area.

import { createContext, useState } from "react";
import AdminSidebar from "./AdminSidebar";

/** Exposes `onMenuToggle` to child components (e.g. AdminHeader) */
export const AdminMobileMenuContext = createContext({ onMenuToggle: () => {} });

export function AdminLayout({ children, sidebarProps }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminMobileMenuContext.Provider value={{ onMenuToggle: () => setSidebarOpen(true) }}>
      <div className="admin-shell">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="mobile-overlay"
            id="mobile-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <AdminSidebar
          {...sidebarProps}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="admin-main">
          {children}
        </main>
      </div>
    </AdminMobileMenuContext.Provider>
  );
}
