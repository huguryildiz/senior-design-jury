// src/admin/hooks/useProfileEdit.js
// ============================================================
// Profile edit state — form fields, dirty tracking, validation,
// save handlers for name/email and password change sub-flow.
// ============================================================

import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "@/auth";
import { useToast } from "@/shared/hooks/useToast";
import { upsertProfile } from "../../shared/api";
import { supabase } from "@/shared/lib/supabaseClient";

const isStrongPassword = (v) => {
  const s = String(v || "");
  return s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
};

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));

export function useProfileEdit() {
  const { user, displayName, setDisplayName, updatePassword } = useAuth();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState("profile"); // "profile" | "password"

  // Profile form
  const initialRef = useRef({ displayName: "", email: "" });
  const [form, setForm] = useState({ displayName: "", email: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Password form
  const [passwordForm, setPasswordFormState] = useState({ password: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  const openModal = useCallback((view = "profile") => {
    const initial = {
      displayName: displayName || "",
      email: user?.email || "",
    };
    initialRef.current = initial;
    setForm(initial);
    setErrors({});
    setModalView(view);
    setPasswordFormState({ password: "", confirmPassword: "" });
    setPasswordErrors({});
    setModalOpen(true);
  }, [displayName, user?.email]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const isDirty = useMemo(() => {
    return form.displayName !== initialRef.current.displayName ||
           form.email !== initialRef.current.email;
  }, [form.displayName, form.email]);

  const handleSave = useCallback(async () => {
    const errs = {};
    const trimmedName = form.displayName.trim();
    if (!trimmedName) {
      errs.displayName = "Full name is required.";
    }
    if (!form.email.trim()) {
      errs.email = "Email is required.";
    } else if (!isValidEmail(form.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const nameChanged = trimmedName !== initialRef.current.displayName;
      const emailChanged = form.email.trim() !== initialRef.current.email;

      if (nameChanged) {
        const result = await upsertProfile(trimmedName || null);
        if (result?.out_display_name != null) {
          setDisplayName(result.out_display_name);
        }
      }

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: form.email.trim() });
        if (error) throw error;
        toast.info("A confirmation link has been sent to your new email address");
      }

      if (nameChanged && !emailChanged) {
        toast.success("Profile updated");
      }

      initialRef.current = { displayName: trimmedName, email: form.email.trim() };
      setModalOpen(false);
    } catch (err) {
      setErrors({ _general: err?.message || "Could not save profile." });
    } finally {
      setSaving(false);
    }
  }, [form, setDisplayName, toast]);

  // Password sub-flow
  const setPasswordField = useCallback((field, value) => {
    setPasswordFormState((prev) => ({ ...prev, [field]: value }));
    setPasswordErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handlePasswordSave = useCallback(async () => {
    const errs = {};
    if (!isStrongPassword(passwordForm.password)) {
      errs.password = "Min 10 chars with uppercase, lowercase, digit, and symbol.";
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(errs).length) {
      setPasswordErrors(errs);
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword(passwordForm.password);
      toast.success("Password updated");
      setPasswordFormState({ password: "", confirmPassword: "" });
      setPasswordErrors({});
      setModalView("profile");
    } catch (err) {
      setPasswordErrors({ _general: err?.message || "Could not update password." });
    } finally {
      setPasswordSaving(false);
    }
  }, [passwordForm, updatePassword, toast]);

  return {
    modalOpen,
    modalView,
    setModalView,
    openModal,
    closeModal,
    form,
    setField,
    isDirty,
    errors,
    saving,
    handleSave,
    passwordForm,
    setPasswordField,
    passwordErrors,
    passwordSaving,
    handlePasswordSave,
  };
}
