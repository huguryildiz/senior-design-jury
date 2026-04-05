// src/admin/drawers/EditProfileDrawer.jsx
// Drawer: edit the current user's display name, email, and avatar.
// Role and organization are always read-only (system-managed).
//
// Props:
//   open         — boolean
//   onClose      — () => void
//   profile      — { displayName, email, role, organization, avatarUrl }
//   onSave       — ({ displayName, email, avatarFile }) => Promise<void>
//   error        — string | null
//   initials     — string (e.g. "DA")
//   avatarBg     — string (CSS color for initials fallback)
//   isSuper      — boolean

import { useState, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import Avatar from "@/shared/ui/Avatar";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function EditProfileDrawer({ open, onClose, profile, onSave, error, initials, avatarBg, isSuper }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDisplayName(profile?.displayName ?? "");
      setEmail(profile?.email ?? "");
      setAvatarFile(null);
      setAvatarPreview(null);
      setSaveError("");
      setSaving(false);
    }
  }, [open, profile]);

  const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_SIZE) {
      setSaveError("Avatar image must be under 2 MB.");
      e.target.value = "";
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({ displayName: displayName.trim(), email: email.trim(), avatarFile });
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const displayError = saveError || error;
  const isDirty =
    displayName.trim() !== (profile?.displayName ?? "") ||
    email.trim() !== (profile?.email ?? "") ||
    avatarFile !== null;

  const avatarSrc = avatarPreview || profile?.avatarUrl || null;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon identity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Edit Profile</div>
              <div className="fs-subtitle">Update your display name and account details</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fs-drawer-body" style={{ gap: 16 }}>
        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 4 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        {/* Avatar edit */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar
              avatarUrl={avatarSrc}
              initials={initials || "?"}
              bg={avatarBg}
              size={72}
              fontSize={24}
              style={{ border: "2px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              title="Change photo"
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: "50%",
                background: "var(--accent, #6366f1)",
                border: "2px solid var(--bg-card, #0f0f17)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0,
                transition: "opacity 0.15s",
              }}
              aria-label="Change avatar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ width: 11, height: 11 }}>
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className="fs-field-row">
          <label className="fs-label">Display Name</label>
          <input
            className="fs-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={saving}
            placeholder="Your display name"
          />
        </div>

        <div className="fs-field-row">
          <label className="fs-label">Email</label>
          <input
            className="fs-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            placeholder="your.email@institution.edu"
          />
          <div className="fs-field-helper hint">
            A confirmation link will be sent to your new email address.
          </div>
        </div>

        <div className="fs-field-row">
          <label className="fs-label">Role</label>
          <input
            className="fs-input"
            type="text"
            value={profile?.role ?? ""}
            disabled
            style={{ opacity: 0.55, cursor: "not-allowed" }}
            readOnly
          />
          {!isSuper && (
            <div className="fs-field-helper hint">Role changes require Super Admin approval.</div>
          )}
        </div>

        <div className="fs-field-row">
          <label className="fs-label">Organization</label>
          <input
            className="fs-input"
            type="text"
            value={profile?.organization ?? ""}
            disabled
            style={{ opacity: 0.55, cursor: "not-allowed" }}
            readOnly
          />
        </div>
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty || !displayName.trim()}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Saving…">Save Changes</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
