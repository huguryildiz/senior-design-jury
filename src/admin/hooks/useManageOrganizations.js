// src/admin/hooks/useManageOrganizations.js
// ============================================================
// Organization/tenant CRUD state management.
// Super-admin only — hook no-ops when `enabled` is false.
//
// Follows useManagePeriods.js pattern but is self-contained
// (no cross-domain dependencies on period selection or
// useSettingsCrud orchestration).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  updateMemberAdmin,
  deleteMemberHard,
  submitApplication,
  approveApplication,
  rejectApplication,
  notifyApplication,
  writeAuditLog,
} from "../../shared/api";

const EMPTY_CREATE = {
  name: "",
  code: "",
  shortLabel: "",
  subtitle: "",
  university: "",
  department: "",
  contact_email: "",
  status: "active",
};
const EMPTY_EDIT = {
  id: "",
  name: "",
  code: "",
  shortLabel: "",
  subtitle: "",
  university: "",
  department: "",
  contact_email: "",
  status: "active",
  created_at: "",
  updated_at: "",
};
const VALID_STATUSES = ["active", "limited", "disabled", "archived"];
const CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function splitSubtitle(subtitle) {
  const raw = String(subtitle || "").trim();
  if (!raw) return { university: "", department: "" };
  const parts = raw.split("·").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      university: parts.slice(0, parts.length - 1).join(" · "),
      department: parts[parts.length - 1],
    };
  }
  return { university: raw, department: "" };
}

const normalizeAdminApplicationError = (raw) => {
  const msg = String(raw || "").trim();
  const lower = msg.toLowerCase();
  if (!lower) return "Could not create admin application.";
  if (lower.includes("email_already_registered")) {
    return "This email is already registered.";
  }
  if (lower.includes("application_already_pending")) {
    return "There is already a pending application for this email in this organization.";
  }
  if (lower.includes("password_too_short")) {
    return "Password must be at least 10 characters.";
  }
  if (lower.includes("tenant_not_found")) {
    return "Organization was not found. Please refresh and try again.";
  }
  return msg;
};

/**
 * useManageOrganizations — organization identity CRUD for super-admins.
 *
 * @param {object}   opts
 * @param {boolean}  opts.enabled        When false, hook issues no RPCs and returns inert state.
 * @param {Function} opts.setMessage     Toast setter.
 * @param {Function} opts.incLoading     Increment global loading counter.
 * @param {Function} opts.decLoading     Decrement global loading counter.
 * @param {Function} opts.onDirtyChange  (isDirty: boolean) → called when dirty state changes.
 */
export function useManageOrganizations({
  enabled,
  setMessage,
  incLoading,
  decLoading,
  onDirtyChange,
}) {
  const [orgList, setOrgList] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ── Create modal ──────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState("");
  const createOrigRef = useRef(EMPTY_CREATE);

  // ── Edit modal ────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState("");
  const editOrigRef = useRef(EMPTY_EDIT);
  const [applicationActionLoading, setApplicationActionLoading] = useState({ id: "", action: "" });

  // ── Load ──────────────────────────────────────────────────
  const loadOrgs = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await listOrganizations();
      setOrgList(data);
    } catch (e) {
      setError(e?.message || "Could not load organizations.");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    loadOrgs();
  }, [enabled, loadOrgs]);

  // ── Dirty state tracking ──────────────────────────────────
  const createDirty = useMemo(() => {
    if (!showCreate) return false;
    const orig = createOrigRef.current;
    return (
      createForm.name !== orig.name ||
      createForm.code !== orig.code ||
      createForm.shortLabel !== orig.shortLabel ||
      createForm.subtitle !== orig.subtitle ||
      createForm.university !== orig.university ||
      createForm.department !== orig.department ||
      createForm.contact_email !== orig.contact_email ||
      createForm.status !== orig.status
    );
  }, [showCreate, createForm]);

  const editDirty = useMemo(() => {
    if (!showEdit) return false;
    const orig = editOrigRef.current;
    return (
      editForm.name !== orig.name ||
      editForm.shortLabel !== orig.shortLabel ||
      editForm.subtitle !== orig.subtitle ||
      editForm.university !== orig.university ||
      editForm.department !== orig.department ||
      editForm.contact_email !== orig.contact_email ||
      editForm.status !== orig.status
    );
  }, [showEdit, editForm]);

  const isDirty = createDirty || editDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Warn before browser close if dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Search / filter ───────────────────────────────────────
  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgList;
    return orgList.filter(
      (o) =>
        String(o.code || "").toLowerCase().includes(q) ||
        String(o.shortLabel || "").toLowerCase().includes(q) ||
        String(o.name || "").toLowerCase().includes(q) ||
        String(o.subtitle || "").toLowerCase().includes(q)
    );
  }, [orgList, search]);

  // ── Modal openers / closers ───────────────────────────────
  const openCreate = useCallback(() => {
    const blank = { ...EMPTY_CREATE };
    setCreateForm(blank);
    createOrigRef.current = blank;
    setCreateError("");
    setShowCreate(true);
  }, []);

  const closeCreate = useCallback(() => {
    setShowCreate(false);
    setCreateForm(EMPTY_CREATE);
    setCreateError("");
  }, []);

  const openEdit = useCallback((org) => {
    const { university, department } = splitSubtitle(org.subtitle);
    const snapshot = {
      id: org.id,
      name: org.name || "",
      code: org.code,
      shortLabel: String(org.code || "").toUpperCase(),
      subtitle: org.subtitle || "",
      university,
      department,
      contact_email: org.contact_email || "",
      status: org.status,
      created_at: org.created_at,
      updated_at: org.updated_at,
    };
    setEditForm(snapshot);
    editOrigRef.current = { ...snapshot };
    setEditError("");
    setShowEdit(true);
  }, []);

  const closeEdit = useCallback(() => {
    setShowEdit(false);
    setEditForm(EMPTY_EDIT);
    setEditError("");
  }, []);

  // ── Validation helpers ────────────────────────────────────
  const validateCreate = useCallback(
    (form) => {
      const code = String(form.code || form.shortLabel || "").trim().toLowerCase().replace(/\s+/g, "-");
      if (!code) return "Code is required.";
      if (!CODE_RE.test(code)) return "Code must be a lowercase slug (e.g. tedu-ee).";
      if (orgList.some((o) => o.code === code)) return `Code "${code}" already exists.`;
      if (!String(form.shortLabel || "").trim()) return "Short Label is required.";
      const name = String(form.name || "").trim();
      if (!name && !(String(form.university || "").trim() && String(form.department || "").trim())) {
        return "Organization name is required.";
      }
      if (!VALID_STATUSES.includes(form.status || "active")) return "Invalid status.";
      return null;
    },
    [orgList]
  );

  const validateEdit = useCallback((form) => {
    if (!String(form.name || "").trim()) return "Organization name is required.";
    if (!String(form.shortLabel || "").trim()) return "Short Label is required.";
    const slug = String(form.shortLabel || "").trim().toLowerCase().replace(/\s+/g, "-");
    if (!CODE_RE.test(slug)) return "Short Label must be slug-compatible (e.g. TEDU-EE).";
    if (!VALID_STATUSES.includes(form.status)) return "Invalid status.";
    return null;
  }, []);

  // ── Create handler ────────────────────────────────────────
  const handleCreateOrg = useCallback(async () => {
    if (!enabled) return;
    const validationError = validateCreate(createForm);
    if (validationError) {
      setCreateError(validationError);
      return;
    }
    setCreateError("");
    setError("");
    incLoading();
    try {
      const code = String(createForm.code || createForm.shortLabel || "").trim().toLowerCase().replace(/\s+/g, "-");
      const shortLabel = String(createForm.shortLabel || code).trim().toUpperCase();
      const uni = String(createForm.university || "").trim();
      const dept = String(createForm.department || "").trim();
      const subtitle = String(createForm.subtitle || "").trim() || [uni, dept].filter(Boolean).join(" · ");
      const name = String(createForm.name || "").trim() || [uni, dept].filter(Boolean).join(" ") || shortLabel;
      await createOrganization({
        name,
        code,
        shortLabel,
        subtitle,
        university: uni,
        department: dept,
        contact_email: String(createForm.contact_email || "").trim() || null,
        status: createForm.status || "active",
      });
      closeCreate();
      await loadOrgs();
      setMessage?.("Organization created.");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        setCreateError("An organization with this code already exists.");
      } else {
        setCreateError(msg || "Could not create organization.");
      }
    } finally {
      decLoading();
    }
  }, [enabled, createForm, validateCreate, closeCreate, loadOrgs, setMessage, incLoading, decLoading]);

  // ── Update handler ────────────────────────────────────────
  const handleUpdateOrg = useCallback(async () => {
    if (!enabled) return;
    const validationError = validateEdit(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    setEditError("");
    setError("");
    incLoading();
    try {
      const shortLabel = String(editForm.shortLabel || editForm.code || "").trim().toUpperCase();
      const code = shortLabel.toLowerCase().replace(/\s+/g, "-");
      const uni = String(editForm.university || "").trim();
      const dept = String(editForm.department || "").trim();
      const subtitle = String(editForm.subtitle || "").trim() || [uni, dept].filter(Boolean).join(" · ");
      await updateOrganization({
        organizationId: editForm.id,
        name: String(editForm.name || "").trim(),
        code,
        shortLabel,
        subtitle,
        university: uni,
        department: dept,
        contact_email: String(editForm.contact_email || "").trim() || null,
        status: editForm.status,
      });
      closeEdit();
      await loadOrgs();
      setMessage?.("Organization updated.");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("organization_not_found")) {
        setEditError("Organization not found. It may have been removed.");
      } else {
        setEditError(msg || "Could not update organization.");
      }
    } finally {
      decLoading();
    }
  }, [enabled, editForm, validateEdit, closeEdit, loadOrgs, setMessage, incLoading, decLoading]);

  const handleApproveApplication = useCallback(async (applicationId) => {
    if (!enabled || !applicationId) return;
    setError("");
    setApplicationActionLoading({ id: applicationId, action: "approve" });
    incLoading();
    try {
      // Capture application data before the action (list refreshes after)
      const appData = orgList
        .flatMap((o) => (o.pendingApplications || []).map((a) => ({ ...a, orgId: o.id, orgName: o.name })))
        .find((a) => a.applicationId === applicationId);

      await approveApplication(applicationId);
      writeAuditLog("application.approved", {
        resourceType: "org_applications",
        resourceId: applicationId,
        details: { applicantEmail: appData?.email, applicantName: appData?.name },
      }).catch(() => {});

      // Fire-and-forget notification (never blocks approve flow)
      if (appData?.email) {
        notifyApplication({
          type: "application_approved",
          applicationId,
          recipientEmail: appData.email,
          applicantName: appData.name,
          organizationId: appData.orgId,
          organizationName: appData.orgName,
        });
      }

      await loadOrgs();
      setMessage?.("Application approved.");
    } catch (e) {
      const msg = String(e?.message || "");
      setError(msg || "Could not approve application.");
    } finally {
      setApplicationActionLoading({ id: "", action: "" });
      decLoading();
    }
  }, [enabled, orgList, loadOrgs, setMessage, incLoading, decLoading]);

  const handleRejectApplication = useCallback(async (applicationId) => {
    if (!enabled || !applicationId) return;
    setError("");
    setApplicationActionLoading({ id: applicationId, action: "reject" });
    incLoading();
    try {
      // Capture application data before the action (list refreshes after)
      const appData = orgList
        .flatMap((o) => (o.pendingApplications || []).map((a) => ({ ...a, orgId: o.id, orgName: o.name })))
        .find((a) => a.applicationId === applicationId);

      await rejectApplication(applicationId);
      writeAuditLog("application.rejected", {
        resourceType: "org_applications",
        resourceId: applicationId,
        details: { applicantEmail: appData?.email, applicantName: appData?.name },
      }).catch(() => {});

      // Fire-and-forget notification (never blocks reject flow)
      if (appData?.email) {
        notifyApplication({
          type: "application_rejected",
          applicationId,
          recipientEmail: appData.email,
          applicantName: appData.name,
          organizationId: appData.orgId,
          organizationName: appData.orgName,
        });
      }

      await loadOrgs();
      setMessage?.("Application rejected.");
    } catch (e) {
      const msg = String(e?.message || "");
      setError(msg || "Could not reject application.");
    } finally {
      setApplicationActionLoading({ id: "", action: "" });
      decLoading();
    }
  }, [enabled, orgList, loadOrgs, setMessage, incLoading, decLoading]);

  const handleUpdateTenantAdmin = useCallback(async ({ organizationId, userId, name, email }) => {
    if (!enabled || !organizationId || !userId) return false;
    setError("");
    incLoading();
    try {
      await updateMemberAdmin({
        organizationId,
        userId,
        name: String(name || "").trim(),
        email: String(email || "").trim().toLowerCase(),
      });
      await loadOrgs();
      setMessage?.("Admin updated.");
      return true;
    } catch (e) {
      const msg = String(e?.message || "");
      setError(msg || "Could not update admin.");
      return false;
    } finally {
      decLoading();
    }
  }, [enabled, loadOrgs, setMessage, incLoading, decLoading]);

  const handleDeleteTenantAdmin = useCallback(async ({ organizationId, userId }) => {
    if (!enabled || !organizationId || !userId) return false;
    setError("");
    incLoading();
    try {
      await deleteMemberHard({ organizationId, userId });
      await loadOrgs();
      setMessage?.("Admin deleted.");
      return true;
    } catch (e) {
      const msg = String(e?.message || "");
      setError(msg || "Could not delete admin.");
      return false;
    } finally {
      decLoading();
    }
  }, [enabled, loadOrgs, setMessage, incLoading, decLoading]);

  const handleCreateTenantAdminApplication = useCallback(async ({
    organizationId,
    name,
    email,
    password,
    university,
    department,
  }) => {
    if (!enabled || !organizationId) return { ok: false, error: "Organization is missing." };
    setError("");
    incLoading();
    try {
      await submitApplication({
        organizationId,
        name: String(name || "").trim(),
        email: String(email || "").trim().toLowerCase(),
        password: String(password || ""),
        university: String(university || "").trim(),
        department: String(department || "").trim(),
      });
      writeAuditLog("application.submitted", {
        resourceType: "org_applications",
        details: { applicantEmail: String(email || "").trim().toLowerCase(), organizationId },
      }).catch(() => {});
      await loadOrgs();
      setMessage?.("Admin application created.");
      return { ok: true };
    } catch (e) {
      const friendly = normalizeAdminApplicationError(e?.message || "");
      setError(friendly);
      return { ok: false, error: friendly };
    } finally {
      decLoading();
    }
  }, [enabled, loadOrgs, setMessage, incLoading, decLoading]);

  return {
    orgList,
    filteredOrgs,
    error,
    search,
    setSearch,

    showCreate,
    createForm,
    setCreateForm,
    createError,
    openCreate,
    closeCreate,
    handleCreateOrg,

    showEdit,
    editForm,
    setEditForm,
    editError,
    openEdit,
    closeEdit,
    handleUpdateOrg,
    handleApproveApplication,
    handleRejectApplication,
    applicationActionLoading,
    handleCreateTenantAdminApplication,
    handleUpdateTenantAdmin,
    handleDeleteTenantAdmin,

    isDirty,
    loadOrgs,
  };
}
