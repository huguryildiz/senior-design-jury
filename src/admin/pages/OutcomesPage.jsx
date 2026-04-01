// src/admin/pages/OutcomesPage.jsx
// Standalone page for MÜDEK outcomes & mapping management.

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../components/toast/useToast";
import { useManageSemesters } from "../hooks/useManageSemesters";
import MudekManager from "../MudekManager";
import PageShell from "./PageShell";

export default function OutcomesPage({
  tenantId,
  selectedSemesterId,
  isDemoMode = false,
  onDirtyChange,
  onCurrentSemesterChange,
}) {
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };

  const [panelError, setPanelErrorState] = useState("");
  const setPanelError = useCallback((_panel, msg) => setPanelErrorState(msg || ""), []);
  const clearPanelError = useCallback(() => setPanelErrorState(""), []);

  const [loadingCount, setLoadingCount] = useState(0);
  const incLoading = useCallback(() => setLoadingCount((c) => c + 1), []);
  const decLoading = useCallback(() => setLoadingCount((c) => Math.max(0, c - 1)), []);

  // ── Semesters ──
  const semesters = useManageSemesters({
    tenantId,
    selectedSemesterId,
    setMessage,
    incLoading,
    decLoading,
    onCurrentSemesterChange,
    setPanelError,
    clearPanelError,
  });

  // Load semesters on mount
  useEffect(() => {
    incLoading();
    semesters
      .loadSemesters()
      .catch(() =>
        setPanelError("semester", "Could not load semesters. Try refreshing or check your connection.")
      )
      .finally(() => decLoading());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.loadSemesters]);

  // Get current semester being edited
  const viewSemester = semesters.semesterList.find((s) => s.id === semesters.viewSemesterId);
  const isLocked = !!(viewSemester?.is_locked);

  const handleSave = async (newTemplate) => {
    if (!semesters.viewSemesterId) {
      return { ok: false, error: "No semester selected" };
    }
    try {
      incLoading();
      await semesters.updateMudekTemplate(semesters.viewSemesterId, newTemplate);
      setMessage("MÜDEK outcomes updated successfully");
      return { ok: true };
    } catch (err) {
      const msg = err?.message || "Failed to update MÜDEK outcomes";
      setPanelError("outcomes", msg);
      return { ok: false, error: msg };
    } finally {
      decLoading();
    }
  };

  return (
    <PageShell
      title="Outcomes & Mapping"
      description="Define MÜDEK outcomes and criteria mapping for this period"
    >
      {panelError && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
          {panelError}
        </div>
      )}
      {!semesters.viewSemesterId ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Select an evaluation period to manage its outcomes.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">
              Period: <span className="text-foreground">{semesters.viewSemesterLabel}</span>
            </p>
          </div>
          <MudekManager
            mudekTemplate={viewSemester?.mudek_template || []}
            onSave={handleSave}
            disabled={loadingCount > 0}
            isLocked={isLocked}
          />
        </div>
      )}
    </PageShell>
  );
}
