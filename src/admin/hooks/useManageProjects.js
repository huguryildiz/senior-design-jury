// src/admin/hooks/useManageProjects.js
// ============================================================
// Manages project CRUD state and handlers.
//
// Extracted from useSettingsCrud.js (Phase 6 — Settings
// CRUD Decomposition).
// ============================================================

import { useCallback, useState } from "react";
import {
  adminListProjects,
  adminCreateProject,
  adminUpsertProject,
} from "../../shared/api";
import { normalizeStudentNames } from "../utils/auditUtils";

/**
 * useManageProjects — project CRUD for the viewed semester.
 *
 * @param {object} opts
 * @param {string}   opts.adminPass
 * @param {string}   opts.viewSemesterId    Controlled by useManageSemesters.
 * @param {string}   opts.viewSemesterLabel Human-readable label for toast messages.
 * @param {Array}    opts.semesterList      Used for target semester name lookup.
 * @param {Function} opts.setMessage        Toast setter from SettingsPage.
 * @param {Function} opts.setLoading        Loading setter from SettingsPage.
 * @param {Function} opts.setPanelError     (panel, msg) → sets a panel-level error.
 * @param {Function} opts.clearPanelError   (panel) → clears a panel-level error.
 */
export function useManageProjects({
  adminPass,
  viewSemesterId,
  viewSemesterLabel,
  semesterList,
  setMessage,
  setLoading,
  setPanelError,
  clearPanelError,
}) {
  const [projects, setProjects] = useState([]);

  // ── Patch / remove helpers ───────────────────────────────
  const applyProjectPatch = useCallback((patch) => {
    if (!patch) return;
    setProjects((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (p) =>
          (patch.id && p.id === patch.id) ||
          (patch.group_no != null &&
            patch.semester_id &&
            p.group_no === patch.group_no &&
            p.semester_id === patch.semester_id)
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

  // ── Load function ────────────────────────────────────────
  const loadProjects = useCallback(
    async (semesterId) => {
      if (!semesterId || !adminPass) return;
      try {
        const rows = await adminListProjects(semesterId, adminPass);
        setProjects(rows || []);
      } catch (e) {
        const msg = e?.message || "Could not load groups. Check admin password or refresh.";
        setPanelError("projects", msg);
      }
    },
    [adminPass, setPanelError]
  );

  // ── Project CRUD handlers ────────────────────────────────
  const handleImportProjects = async (rows, { cancelRef } = {}) => {
    if (!viewSemesterId) {
      setPanelError("projects", "Select a semester from the header before importing groups.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("projects");
    setLoading(true);
    try {
      const semesterContext =
        viewSemesterLabel && viewSemesterLabel !== "—"
          ? viewSemesterLabel
          : "selected semester";
      let skipped = 0;
      for (const row of rows) {
        if (cancelRef?.current) {
          // Soft-cancel: user requested stop between rows.
          // Note: true request abort is not feasible with current Supabase RPC wrappers.
          return { ok: false, cancelled: true };
        }
        const normalizedStudents = normalizeStudentNames(row.group_students);
        try {
          const res = await adminCreateProject(
            { ...row, group_students: normalizedStudents, semesterId: viewSemesterId },
            adminPass
          );
          applyProjectPatch({
            id: res?.project_id || res?.projectId || undefined,
            semester_id: viewSemesterId,
            group_no: row.group_no,
            project_title: row.project_title,
            group_students: normalizedStudents,
          });
        } catch (e) {
          const msg = String(e?.message || "");
          const msgLower = msg.toLowerCase();
          if (
            msg.includes("project_group_exists") ||
            msgLower.includes("projects_semester_group_no_key") ||
            msgLower.includes("duplicate key value violates unique constraint")
          ) {
            skipped += 1;
            continue;
          }
          throw e;
        }
      }
      // Full refresh to get server-confirmed IDs and normalize client state
      await loadProjects(viewSemesterId);
      setMessage(
        skipped > 0
          ? `Groups imported for Semester ${semesterContext}, skipped ${skipped} existing groups`
          : `Groups imported for Semester ${semesterContext}`
      );
      return { ok: true, skipped };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("project_group_exists") ||
        msgLower.includes("projects_semester_group_no_key") ||
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
      setLoading(false);
    }
  };

  const handleAddProject = async (row) => {
    const targetSemesterId = row?.semesterId || viewSemesterId;
    if (!targetSemesterId) {
      setPanelError("projects", "Select a semester before adding a group.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("projects");
    setLoading(true);
    try {
      const normalizedStudents = normalizeStudentNames(row.group_students);
      const targetSemesterName =
        (semesterList || []).find((s) => s.id === targetSemesterId)?.name || "";
      const res = await adminCreateProject(
        { ...row, group_students: normalizedStudents, semesterId: targetSemesterId },
        adminPass
      );
      const projectId = res?.project_id || res?.projectId;
      if (!projectId) {
        throw new Error("Could not create group. Please refresh and try again.");
      }
      if (targetSemesterId === viewSemesterId) {
        applyProjectPatch({
          id: projectId,
          semester_id: targetSemesterId,
          group_no: row.group_no,
          project_title: row.project_title,
          group_students: normalizedStudents,
        });
        await loadProjects(targetSemesterId);
      }
      setMessage(
        targetSemesterName
          ? `Group ${row.group_no} created in Semester ${targetSemesterName}`
          : `Group ${row.group_no} created`
      );
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("project_group_exists") ||
        msgLower.includes("projects_semester_group_no_key") ||
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
          msg || "Could not save group. Try again or check admin password."
        );
        return { ok: false };
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = async (row) => {
    const targetSemesterId = row?.semesterId || viewSemesterId;
    if (!targetSemesterId) return;
    setMessage("");
    clearPanelError("projects");
    setLoading(true);
    try {
      const normalizedStudents = normalizeStudentNames(row.group_students);
      const res = await adminUpsertProject(
        { ...row, group_students: normalizedStudents, semesterId: targetSemesterId },
        adminPass
      );
      if (targetSemesterId === viewSemesterId) {
        applyProjectPatch({
          id: res?.project_id || res?.projectId || undefined,
          semester_id: targetSemesterId,
          group_no: row.group_no,
          project_title: row.project_title,
          group_students: normalizedStudents,
        });
      }
      setMessage(`Group ${row.group_no} updated`);
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Could not update group. Try again or check admin password.";
      // Return message so the edit modal can show it in-context; do not use a distant panel banner.
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
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
  };
}
