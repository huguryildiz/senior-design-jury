// src/admin/components/TenantSwitcher.jsx
// ============================================================
// Phase C.4: Tenant context switcher for super-admins.
// Custom dropdown styled consistently with SemesterDropdown.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@/shared/ui/Icons";

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

export default function TenantSwitcher({ tenants, activeOrganization, onSwitch }) {
  const [open, setOpen] = useState(false);
  const tenantOptions = tenants.filter((t) => t.id != null);

  const { triggerRef, panelRef, panelStyle, panelPlacement } = useAnchoredPopover(
    open,
    [activeOrganization?.id, tenantOptions.length]
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
    <div className="period-dropdown tenant-dropdown">
      <button
        type="button"
        className={`status-chip status-chip--period period-dropdown-trigger${open ? " open" : ""}`}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="period-dropdown-label">{activeOrganization?.name || "Select"}</span>
        <span className="period-dropdown-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>
      {open && createPortal(
        <ul
          ref={panelRef}
          className={`period-dropdown-panel period-dropdown-panel--${panelPlacement}`}
          style={panelStyle || undefined}
          role="listbox"
          aria-label="Select organization"
        >
          {tenantOptions.map((t) => (
            <li
              key={t.id}
              role="option"
              aria-selected={activeOrganization?.id === t.id}
              className={`period-dropdown-item${activeOrganization?.id === t.id ? " active" : ""}`}
              onClick={() => {
                onSwitch(t.id);
                setOpen(false);
              }}
            >
              <span style={{display:"flex",flexDirection:"column",gap:1,minWidth:0}}>
                <span>{t.name}</span>
                {t.subtitle && (
                  <span style={{fontSize:"11px",color:"var(--text-tertiary)",fontWeight:400}}>{t.subtitle}</span>
                )}
              </span>
              {activeOrganization?.id === t.id && (
                <span className="period-dropdown-check" aria-hidden="true">✓</span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
