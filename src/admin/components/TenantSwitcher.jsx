// src/admin/components/TenantSwitcher.jsx
// ============================================================
// Phase C.4: Tenant context switcher for super-admins.
// Custom dropdown styled consistently with SemesterDropdown.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "../../shared/Icons";

function useAnchoredPopover(isOpen, deps = []) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);
  const [panelPlacement, setPanelPlacement] = useState("below");

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 200;
    setPanelPlacement(above ? "above" : "below");
    setPanelStyle({
      position: "fixed",
      left: `${rect.left}px`,
      minWidth: `${rect.width}px`,
      ...(above
        ? { bottom: `${window.innerHeight - rect.top + 4}px` }
        : { top: `${rect.bottom + 4}px` }),
    });
  }, [isOpen, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { triggerRef, panelRef, panelStyle, panelPlacement };
}

export default function TenantSwitcher({ tenants, activeTenant, onSwitch }) {
  const [open, setOpen] = useState(false);
  const tenantOptions = tenants.filter((t) => t.id != null);

  const { triggerRef, panelRef, panelStyle, panelPlacement } = useAnchoredPopover(
    open,
    [activeTenant?.id, tenantOptions.length]
  );

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, triggerRef, panelRef]);

  if (tenantOptions.length <= 1) return null;

  return (
    <div className="semester-dropdown tenant-dropdown">
      <button
        type="button"
        className={`status-chip status-chip--semester semester-dropdown-trigger${open ? " open" : ""}`}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="semester-dropdown-label">{activeTenant?.name || "Select"}</span>
        <span className="semester-dropdown-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>
      {open && createPortal(
        <ul
          ref={panelRef}
          className={`semester-dropdown-panel semester-dropdown-panel--${panelPlacement}`}
          style={panelStyle || undefined}
          role="listbox"
          aria-label="Select organization"
        >
          {tenantOptions.map((t) => (
            <li
              key={t.id}
              role="option"
              aria-selected={activeTenant?.id === t.id}
              className={`semester-dropdown-item${activeTenant?.id === t.id ? " active" : ""}`}
              onClick={() => {
                onSwitch(t.id);
                setOpen(false);
              }}
            >
              {t.name}
              {activeTenant?.id === t.id && (
                <span className="semester-dropdown-check" aria-hidden="true">✓</span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
