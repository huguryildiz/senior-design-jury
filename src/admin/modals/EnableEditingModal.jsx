// src/admin/modals/EnableEditingModal.jsx
// Modal: confirm enable-editing-mode for a completed juror.
//
// Props:
//   open             — boolean
//   onClose          — () => void  (resets form)
//   juror            — { name, affiliation } | null
//   onEnable         — ({ reason, durationMinutes }) => Promise<void>

import { useState } from "react";
import { LockOpen, Info } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";

const UNIT_CLAMP = { minutes: [1, 240], hours: [1, 48] };

export default function EnableEditingModal({ open, onClose, juror, onEnable }) {
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [reason, setReason] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    if (enabling) return;
    setDurationValue("30");
    setDurationUnit("minutes");
    setReason("");
    setError("");
    onClose();
  };

  const parsedDuration = parseInt(durationValue, 10);
  const [min, max] = UNIT_CLAMP[durationUnit];
  const durationValid = !isNaN(parsedDuration) && parsedDuration >= min && parsedDuration <= max;
  const reasonValid = reason.trim().length >= 5;
  const canEnable = durationValid && reasonValid && !enabling;

  const durationMinutes =
    durationUnit === "hours" ? parsedDuration * 60 : parsedDuration;

  const handleEnable = async () => {
    if (!canEnable) return;
    setEnabling(true);
    setError("");
    try {
      await onEnable({ reason: reason.trim(), durationMinutes });
      // Success — parent closes modal via setEditModeJuror(null)
    } catch (e) {
      setError(e?.message || "Could not enable editing mode. Please try again.");
    } finally {
      setEnabling(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header eem-header">
        <div className="fs-modal-icon eem-icon">
          <LockOpen size={19} />
        </div>
        <div className="fs-title eem-title">Enable Editing Mode</div>
        <div className="fs-subtitle eem-subtitle">
          Temporarily allow <strong>{juror?.name}</strong>{" "}
          to update submitted scores.
        </div>
        <div className="eem-chip-row" aria-hidden="true">
          <span className="eem-chip">Audit Required</span>
          <span className="eem-chip eem-chip-muted">Time-Limited Access</span>
        </div>
      </div>

      <div className="fs-modal-body eem-body">
        <div className="crt-info-banner eem-info-card">
          <div className="crt-info-banner-icon">
            <Info size={16} />
          </div>
          <div className="crt-info-banner-body">
            <div className="crt-info-banner-desc">
              The juror will be able to modify their submitted scores until the editing
              window expires or they resubmit.
            </div>
          </div>
        </div>

        <div className="eem-field">
          <label className="eem-label">
            Duration
          </label>
          <div className="eem-duration-row">
            <input
              className={`fs-input eem-duration-input${durationValue !== "" && !durationValid ? " error" : ""}`}
              type="number"
              min={min}
              max={max}
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              disabled={enabling}
            />
            <CustomSelect
              className="eem-duration-unit"
              value={durationUnit}
              onChange={(v) => {
                setDurationUnit(v);
                setDurationValue(v === "hours" ? "1" : "30");
              }}
              disabled={enabling}
              options={[
                { value: "minutes", label: "minutes" },
                { value: "hours", label: "hours" },
              ]}
              ariaLabel="Duration unit"
            />
          </div>
          {durationValue !== "" && !durationValid && (
            <div className="vera-field-error--xs">
              {durationUnit === "minutes" ? "Enter 1–240 minutes." : "Enter 1–48 hours."}
            </div>
          )}
        </div>

        <div className="eem-field">
          <label className="eem-label">
            Reason (audit log) <span className="eem-required">*</span>
          </label>
          <textarea
            className="fs-input eem-reason"
            rows={3}
            minLength={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Correcting accidental criterion mismatch"
            disabled={enabling}
          />
          <div className="eem-helper">
            Minimum 5 characters
          </div>
        </div>

        {error && (
          <div className="fs-alert danger eem-error">
            <div className="fs-alert-body">
              <div className="fs-alert-desc">{error}</div>
            </div>
          </div>
        )}
      </div>

      <div className="fs-modal-footer eem-footer">
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={handleClose}
          disabled={enabling}
          style={{ flex: 1, minHeight: 40 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-primary"
          onClick={handleEnable}
          disabled={!canEnable}
          style={{ flex: 1, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={enabling} loadingText="Enabling…">
              <>
                <LockOpen size={13} />
                Enable
              </>
            </AsyncButtonContent>
          </span>
        </button>
      </div>
    </Modal>
  );
}
