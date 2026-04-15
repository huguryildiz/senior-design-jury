// src/admin/drawers/EditProfileDrawer.jsx
// Drawer: edit the current user's display name, email, and avatar.
// Role, organization, and program are always read-only (system-managed).
//
// Org hierarchy:
//   - profile.institution → parent organization (e.g. "IEEE APS")
//   - profile.organization → specific program within it (e.g. "AP-S Student
//     Design Contest"). Shown as a second "Program" field only when the
//     org has a populated institution; flat orgs fall back to a single
//     "Organization" field populated from profile.organization.
//
// Props:
//   open         — boolean
//   onClose      — () => void
//   profile      — { displayName, email, role, organization, institution, avatarUrl }
//   onSave       — ({ displayName, email, avatarFile }) => Promise<void>
//   error        — string | null
//   initials     — string (e.g. "DA")
//   avatarBg     — string (CSS color for initials fallback)
//   isSuper      — boolean

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock, X, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import Avatar from "@/shared/ui/Avatar";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import AvatarUploadModal from "@/admin/modals/AvatarUploadModal";

export default function EditProfileDrawer({ open, onClose, profile, onSave, onCancelEmailChange, pendingEmail, error, initials, avatarBg, isSuper }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) {
      setDisplayName(profile?.displayName ?? "");
      setEmail(profile?.email ?? "");
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarModalOpen(false);
      setSaveError("");
      setSaving(false);
    }
  }, [open, profile]);

  const handleAvatarConfirm = (file, previewUrl) => {
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
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
  const saveBtnRef = useShakeOnError(displayError);
  const isDirty =
    displayName.trim() !== (profile?.displayName ?? "") ||
    (!pendingEmail && email.trim() !== (profile?.email ?? "")) ||
    avatarFile !== null;

  const avatarSrc = avatarPreview || profile?.avatarUrl || null;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon identity">
              <Icon iconNode={[]} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </Icon>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Edit Profile</div>
              <div className="fs-subtitle">Update your display name and account details</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
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
              onClick={() => setAvatarModalOpen(true)}
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
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                style={{ width: 11, height: 11 }}>
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </Icon>
            </button>
          </div>
        </div>

        <AvatarUploadModal
          open={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          onConfirm={handleAvatarConfirm}
        />

        <div className="fs-field">
          <label className="fs-field-label">Display Name</label>
          <input
            className="fs-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={saving}
            placeholder="Your display name"
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Email</label>
          {pendingEmail ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  className="fs-input"
                  type="email"
                  value={profile?.email ?? ""}
                  disabled
                  readOnly
                  style={{ flex: 1, opacity: 0.7, cursor: "not-allowed" }}
                />
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 9px", borderRadius: 99,
                  background: "color-mix(in srgb, #22c55e 12%, transparent)",
                  color: "#16a34a", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                }}>
                  <CheckCircle2 size={11} /> Verified
                </span>
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px", borderRadius: "var(--radius-sm)",
                border: "1px solid color-mix(in srgb, #f59e0b 35%, transparent)",
                background: "color-mix(in srgb, #f59e0b 8%, transparent)",
                gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Clock size={13} style={{ color: "#d97706", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#d97706", fontWeight: 600, lineHeight: 1.3 }}>Awaiting confirmation</div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingEmail}</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving || cancelling}
                  onClick={async () => {
                    setCancelling(true);
                    try { await onCancelEmailChange?.(); } finally { setCancelling(false); }
                  }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 9px", borderRadius: 99, border: "1px solid #d97706",
                    background: "transparent", color: "#d97706",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  <X size={10} /> Cancel change
                </button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Role</label>
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

        {!isSuper && (
          <div className="fs-field">
            <label className="fs-field-label">Organization</label>
            <input
              className="fs-input"
              type="text"
              value={profile?.institution || profile?.organization || ""}
              disabled
              style={{ opacity: 0.55, cursor: "not-allowed" }}
              readOnly
            />
          </div>
        )}

        {!isSuper && profile?.institution && profile?.organization && (
          <div className="fs-field">
            <label className="fs-field-label">Program</label>
            <input
              className="fs-input"
              type="text"
              value={profile.organization}
              disabled
              style={{ opacity: 0.55, cursor: "not-allowed" }}
              readOnly
            />
          </div>
        )}
      </div>
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          ref={saveBtnRef}
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
