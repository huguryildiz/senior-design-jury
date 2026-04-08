// src/admin/hooks/useManageProjects.js
// ============================================================
// Manages project CRUD state and handlers.
//
// Extracted from useSettingsCrud.js (Phase 6 — Settings
// CRUD Decomposition).
// ============================================================

import { useCallback, useRef, useState } from "react";
import {
  adminListProjects,
  createProject,
  upsertProject,
  deleteProject,
} from "../../shared/api";
import { normalizeStudentNames } from "../utils/auditUtils";

/**
 * useManageProjects — project CRUD for the viewed period.
 *
 * @param {object} opts
 * @param {string}   opts.organizationId
 * @param {string}   opts.viewPeriodId      Controlled by useManagePeriods.
 * @param {string}   opts.viewPeriodLabel   Human-readable label for toast messages.
 * @param {Array}    opts.periodList        Used for target period name lookup.
 * @param {Function} opts.setMessage        Toast setter from SettingsPage.
 * @param {Function} opts.setLoading        Loading setter from SettingsPage.
 * @param {Function} opts.setPanelError     (panel, msg) → sets a panel-level error.
 * @param {Function} opts.clearPanelError   (panel) → clears a panel-level error.
 */
export function useManageProjects({
  organizationId,
  viewPeriodId,
  viewPeriodLabel,
  periodList,
  setMessage,
  incLoading,
  decLoading,
  setPanelError,
  clearPanelError,
}) {
  const [projects, setProjects] = useState([]);

  // ── Stable refs for values used inside callbacks ─────────
  const setPanelErrorRef = useRef(setPanelError);
  setPanelErrorRef.current = setPanelError;
  const viewPeriodIdRef = useRef(viewPeriodId);
  viewPeriodIdRef.current = viewPeriodId;

  // ── Patch / remove helpers ───────────────────────────────
  const applyProjectPatch = useCallback((patch) => {
    if (!patch) return;
    setProjects((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (p) =>
          (patch.id && p.id === patch.id) ||
          (patch.group_no != null &&
            patch.period_id &&
            p.group_no === patch.group_no &&
            p.period_id === patch.period_id)
      );
      const updated = {
        ...((idx >= 0 ? next[idx] : {}) || {}),
        ...patch,
        updated_at:
          patch.updated_at ||
          (idx >= 0 ? next[idx]?.updated_at : null) ||
          new Date().toISOString(),
      };
      if (idx >= 0) next[idx] = updated;
      else next.push(updated);
      return next;
    });
  }, []);

  const removeProject = useCallback((deletedId) => {
    if (!deletedId) return;
    setProjects((prev) => prev.filter((p) => p.id !== deletedId));
  }, []);

  // ── Load function (stable identity — uses refs) ──────────
  const loadProjects = useCallback(
    async (periodId) => {
      const pid = periodId || viewPeriodIdRef.current;
      if (!pid) return;
      try {
        const rows = await adminListProjects(pid);
        setProjects(rows || []);
      } catch (e) {
        const msg = e?.message || "Could not load groups. Check your session or refresh.";
        setPanelErrorRef.current("projects", msg);
      }
    },
    [] // stable identity — reads from refs
  );

  // ── Project CRUD handlers ────────────────────────────────
  const handleImportProjects = async (rows, { cancelRef } = {}) => {
    if (!viewPeriodId) {
      setPanelError("projects", "Select a period from the header before importing groups.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("projects");
    incLoading();
    try {
      const periodContext =
        viewPeriodLabel && viewPeriodLabel !== "—"
          ? viewPeriodLabel
          : "selected period";
      let imported = 0, skipped = 0, failed = 0;
      for (const row of rows) {
        if (cancelRef?.current) {
          // Soft-cancel: user requested stop between rows.
          // Note: true request abort is not feasible with current Supabase RPC wrappers.
          return { ok: false, cancelled: true };
        }
        const normalizedMembers = normalizeStudentNames(row.members);
        try {
          const res = await createProject(
            { ...row, members: normalizedMembers, periodId: viewPeriodId }
          );
          applyProjectPatch({
            id: res?.project_id || res?.projectId || undefined,
            period_id: viewPeriodId,
            group_no: row.group_no,
            title: row.title,
            members: normalizedMembers,
          });
          imported += 1;
        } catch (e) {
          const msg = String(e?.message || "");
          const msgLower = msg.toLowerCase();
          if (
            msg.includes("project_group_exists") ||
            msgLower.includes("projects_period_group_no_key") ||
            msgLower.includes("duplicate key value violates unique constraint")
          ) {
            skipped += 1;
            continue;
          }
          failed += 1;
        }
      }
      // Full refresh to get server-confirmed IDs and normalize client state
      await loadProjects(viewPeriodId);
      setMessage(
        skipped > 0
          ? `Groups imported for Period ${periodContext}, skipped ${skipped} existing groups`
          : `Groups imported for Period ${periodContext}`
      );
      return { ok: true, imported, skipped, failed };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("project_group_exists") ||
        msgLower.includes("projects_period_group_no_key") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return { ok: false, formError: "Some groups already exist. Refresh and try again." };
      } else {
        return {
          ok: false,
          formError: msg || "Could not import groups. Check the CSV format and try again.",
        };
      }
    } finally {
      decLoading();
    }
  };

  const handleAddProject = async (row) => {
    const targetPeriodId = row?.periodId || viewPeriodId;
    if (!targetPeriodId) {
      setPanelError("projects", "Select a period before adding a group.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("projects");
    incLoading();
    try {
      const normalizedMembers = normalizeStudentNames(row.members);
      const targetPeriodName =
        (periodList || []).find((s) => s.id === targetPeriodId)?.name || "";
      const res = await createProject(
        { ...row, members: normalizedMembers, periodId: targetPeriodId }
      );
      const projectId = res?.project_id || res?.projectId;
      if (!projectId) {
        throw new Error("Could not create group. Please refresh and try again.");
      }
      if (targetPeriodId === viewPeriodId) {
        applyProjectPatch({
          id: projectId,
          period_id: targetPeriodId,
          group_no: row.group_no,
          title: row.title,
          members: normalizedMembers,
        });
        await loadProjects(targetPeriodId);
      }
      setMessage(
        targetPeriodName
          ? `Group ${row.group_no} created in Period ${targetPeriodName}`
          : `Group ${row.group_no} created`
      );
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("project_group_exists") ||
        msgLower.includes("projects_period_group_no_key") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return {
          ok: false,
          fieldErrors: {
            group_no: `Group ${row.group_no} already exists. Use 'Edit' to update.`,
          },
        };
      } else {
        setPanelError(
          "projects",
          msg || "Could not save group. Try again or check your session."
        );
        return { ok: false };
      }
    } finally {
      decLoading();
    }
  };

  const handleEditProject = async (row) => {
    const targetPeriodId = row?.periodId || viewPeriodId;
    if (!targetPeriodId) return;
    setMessage("");
    clearPanelError("projects");
    incLoading();
    try {
      const normalizedMembers = normalizeStudentNames(row.members);
      const res = await upsertProject(
        { ...row, members: normalizedMembers, periodId: targetPeriodId }
      );
      if (targetPeriodId === viewPeriodId) {
        applyProjectPatch({
          id: res?.project_id || res?.projectId || undefined,
          period_id: targetPeriodId,
          group_no: row.group_no,
          title: row.title,
          members: normalizedMembers,
        });
      }
      setMessage(`Group ${row.group_no} updated`);
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Could not update group. Try again or check your session.";
      // Return message so the edit modal can show it in-context; do not use a distant panel banner.
      return { ok: false, message: msg };
    } finally {
      decLoading();
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!projectId) return;
    setMessage("");
    clearPanelError("projects");
    incLoading();
    const project = projects.find((p) => p.id === projectId);
    try {
      await deleteProject(projectId);
      removeProject(projectId);
      setMessage(project?.group_no ? `Group ${project.group_no} deleted` : "Project deleted");
    } catch (e) {
      setPanelError("projects", e?.message || "Could not delete project. Try again.");
    } finally {
      decLoading();
    }
  };

  const handleDuplicateProject = async (project) => {
    if (!project || !viewPeriodId) return;
    setMessage("");
    clearPanelError("projects");
    incLoading();
    try {
      const existingGroupNos = projects.map((p) => p.group_no).filter(Number.isFinite);
      const nextGroupNo = existingGroupNos.length > 0 ? Math.max(...existingGroupNos) + 1 : 1;
      const res = await createProject({
        title: `${project.title} (Copy)`,
        group_no: nextGroupNo,
        members: Array.isArray(project.members) ? project.members : [],
        periodId: viewPeriodId,
      });
      const projectId = res?.project_id || res?.projectId;
      if (!projectId) throw new Error("Could not duplicate project.");
      await loadProjects(viewPeriodId);
      setMessage(`Project duplicated as No. ${nextGroupNo}`);
      return { ok: true };
    } catch (e) {
      setPanelError("projects", e?.message || "Could not duplicate project.");
      return { ok: false };
    } finally {
      decLoading();
    }
  };

  return {
    projects,
    applyProjectPatch,
    removeProject,
    loadProjects,
    handleImportProjects,
    handleAddProject,
    handleEditProject,
    handleDeleteProject,
    handleDuplicateProject,
  };
}
