// src/admin/drawers/EditCriteriaDrawer.jsx

import { useState } from "react";
import { Check, AlertCircle, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import CriteriaManager from "@/admin/criteria/CriteriaManager";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

export default function EditCriteriaDrawer({
  open,
  onClose,
  period,
  template,
  outcomeConfig,
  onSave,
  onDirtyChange,
  disabled,
  isLocked,
}) {
  const [saveState, setSaveState] = useState({});

  const { saving, canSave, handleSave, saveAttempted, saveBlockReasons, totalOk, activeRowsCount, totalMax } = saveState;

  const issueCount = Array.isArray(saveBlockReasons) ? saveBlockReasons.length : 0;
  const hasError = saveAttempted && issueCount > 0;

  const saveBtnRef = useShakeOnError(hasError);

  return (
    <Drawer open={open} onClose={onClose} id="drawer-edit-criteria">
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="crt-drawer-icon">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              </Icon>
            </div>
            <div>
              <div className="crt-drawer-title">Evaluation Criteria</div>
              <div className="crt-drawer-subtitle">
                Scoring weights and rubric configuration
                {period?.name && (
                  <span className="crt-semester-tag">{period.name}</span>
                )}
              </div>
            </div>
          </div>
          <button className="fs-close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7 }}>
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </div>
      <div className="fs-drawer-body">
        <CriteriaManager
          template={template}
          outcomeConfig={outcomeConfig}
          onSave={onSave}
          onClose={onClose}
          onSaveState={setSaveState}
          onDirtyChange={onDirtyChange}
          disabled={disabled}
          isLocked={isLocked}
        />
      </div>
      <div className="fs-drawer-footer">
        <div className="crt-footer-meta" style={hasError ? { color: "var(--danger)" } : undefined}>
          {hasError ? (
            <>
              <AlertCircle size={14} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <span className="crt-footer-count" style={{ color: "var(--danger)" }}>{totalMax ?? 0}</span>
              {" pts · "}{issueCount} {issueCount === 1 ? "issue" : "issues"}
            </>
          ) : activeRowsCount > 0 ? (
            <>
              <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
              <span className="crt-footer-count">{activeRowsCount}</span>
              {" "}{activeRowsCount === 1 ? "criterion" : "criteria"}{" · "}
              <span className="crt-footer-count">{totalMax ?? 0}</span> pts
            </>
          ) : null}
        </div>
        <button className="crt-cancel-btn" onClick={onClose}>Cancel</button>
        <button
          ref={saveBtnRef}
          className="crt-save-btn"
          disabled={!canSave || saving || disabled}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save Criteria"}
        </button>
      </div>
    </Drawer>
  );
}
