// src/admin/pages/SemestersPage.jsx
// Standalone page for semester management including criteria and MÜDEK templates.
// Initializes its own domain hooks directly (bypasses useSettingsCrud).

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../components/toast/useToast";
import { useManageSemesters } from "../hooks/useManageSemesters";
import { useManageJurors } from "../hooks/useManageJurors";
import { useDeleteConfirm, buildCountSummary } from "../hooks/useDeleteConfirm";
import { usePageRealtime } from "../hooks/usePageRealtime";
import ConfirmDialog from "../../shared/ConfirmDialog";
import SemesterSettingsPanel from "../ManageSemesterPanel";
import PageShell from "./PageShell";

export default function SemestersPage({
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

  // ── Jurors (lightweight — only for isLockedFn check) ──
  const jurorsHook = useManageJurors({
    tenantId,
    viewSemesterId: semesters.viewSemesterId,
    viewSemesterLabel: semesters.viewSemesterLabel,
    projects: [],
    setMessage: () => {},
    incLoading: () => {},
    decLoading: () => {},
    setPanelError: () => {},
    clearPanelError: () => {},
    setEvalLockError: semesters.setEvalLockError,
  });

  // Load jurors when viewSemesterId changes (for isLockedFn)
  useEffect(() => {
    if (!semesters.viewSemesterId || !tenantId) return;
    jurorsHook.loadJurors().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.viewSemesterId, tenantId]);

  // isLockedFn: true when semester is eval-locked or has submitted scores
  const isLockedFn = useCallback(
    (semesterId) => {
      const semester = semesters.semesterList.find((s) => s.id === semesterId);
      if (semester?.is_locked) return true;
      return (
        semesterId === semesters.viewSemesterId &&
        (jurorsHook.jurors || []).some((j) => j.finalSubmitted)
      );
    },
    [semesters.semesterList, semesters.viewSemesterId, jurorsHook.jurors],
  );

  // ── Delete confirmation ──
  const deleteConfirm = useDeleteConfirm({
    tenantId,
    setMessage,
    clearAllPanelErrors: clearPanelError,
    onSemesterDeleted: semesters.removeSemester,
    onProjectDeleted: () => {},
    onJurorDeleted: () => {},
  });

  // ── Realtime ──
  usePageRealtime({
    tenantId,
    channelName: "semesters-page-live",
    subscriptions: [
      {
        table: "semesters",
        event: "INSERT",
        onPayload: (payload) => {
          if (payload.new?.id && payload.new?.tenant_id === tenantId) {
            semesters.applySemesterPatch(payload.new);
          }
        },
      },
      {
        table: "semesters",
        event: "UPDATE",
        onPayload: (payload) => {
          if (payload.new?.id && payload.new?.tenant_id === tenantId) {
            semesters.applySemesterPatch(payload.new);
            semesters.notifyExternalSemesterUpdate(payload.new.id);
          }
        },
      },
      {
        table: "semesters",
        event: "DELETE",
        onPayload: (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            semesters.removeSemester(deletedId);
            semesters.notifyExternalSemesterDelete(deletedId);
          }
        },
      },
    ],
    deps: [
      semesters.applySemesterPatch,
      semesters.removeSemester,
      semesters.notifyExternalSemesterUpdate,
      semesters.notifyExternalSemesterDelete,
    ],
  });

  return (
    <PageShell
      title="Evaluation Periods"
      description="Manage evaluation periods, criteria, and MÜDEK outcomes"
    >
      <ConfirmDialog
        open={!!deleteConfirm.deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            deleteConfirm.setDeleteTarget(null);
            deleteConfirm.setDeleteCounts(null);
          }
        }}
        title="Delete Confirmation"
        body={
          deleteConfirm.deleteTarget ? (
            <>
              <strong>{deleteConfirm.deleteTarget.label || "Selected record"}</strong>
              {" will be deleted. Are you sure?"}
            </>
          ) : ""
        }
        warning="This will permanently delete all jurors, groups, and scores associated with this semester. This action cannot be undone."
        typedConfirmation={deleteConfirm.deleteTarget?.typedConfirmation || undefined}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (isDemoMode) throw new Error("Demo mode: delete is disabled.");
          try {
            await deleteConfirm.handleConfirmDelete();
          } catch (e) {
            throw new Error(deleteConfirm.mapDeleteError(e));
          }
        }}
      />

      <SemesterSettingsPanel
        semesters={semesters.semesterList}
        currentSemesterId={semesters.currentSemesterId}
        currentSemesterName={semesters.currentSemesterLabel}
        formatSemesterName={(n) => n || ""}
        panelError={panelError}
        isDemoMode={isDemoMode}
        isMobile={false}
        isOpen={true}
        onToggle={() => {}}
        onDirtyChange={onDirtyChange}
        onSetCurrent={semesters.handleSetCurrentSemester}
        onCreateSemester={semesters.handleCreateSemester}
        onUpdateSemester={semesters.handleUpdateSemester}
        onUpdateCriteriaTemplate={semesters.handleUpdateCriteriaTemplate}
        onUpdateMudekTemplate={semesters.handleUpdateMudekTemplate}
        isLockedFn={isLockedFn}
        externalUpdatedSemesterId={semesters.externalUpdatedSemesterId}
        externalDeletedSemesterId={semesters.externalDeletedSemesterId}
        onDeleteSemester={(s) => {
          if (s?.id === semesters.currentSemesterId) {
            setPanelError("semester", "Current semester cannot be deleted. Select another semester first.");
            return;
          }
          if (semesters.semesterList.length === 1) {
            setPanelError("semester", "Cannot delete the only remaining semester.");
            return;
          }
          if (!tenantId) {
            setPanelError("semester", "Organization ID missing. Please re-login.");
            return;
          }
          deleteConfirm.handleRequestDelete({
            type: "semester",
            id: s?.id,
            label: `Semester ${(s?.semester_name) || ""}`.trim(),
          });
        }}
      />
    </PageShell>
  );
}
