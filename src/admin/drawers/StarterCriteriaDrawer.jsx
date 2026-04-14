// src/admin/drawers/StarterCriteriaDrawer.jsx

import { useState } from "react";
import { LayoutTemplate, Copy } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import CustomSelect from "@/shared/ui/CustomSelect";

// ── Starter template data ─────────────────────────────────

export const STARTER_CRITERIA = [
  {
    key:        "written-communication",
    label:      "Written Communication",
    shortLabel: "Written Comm",
    color:      "#3b82f6",
    max:        30,
    blurb: "Evaluates how effectively the team communicates their project in written and visual form — including layout, information hierarchy, figure quality, and clarity of technical content for a mixed audience.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way accessible to both technical and non-technical readers." },
      { level: "Good",         min: "21", max: "26", description: "Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement." },
      { level: "Developing",   min: "13", max: "20", description: "Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated." },
      { level: "Insufficient", min: "0",  max: "12", description: "Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing." },
    ],
  },
  {
    key:        "oral-communication",
    label:      "Oral Communication",
    shortLabel: "Oral Comm",
    color:      "#8b5cf6",
    max:        30,
    blurb: "Evaluates the team's ability to present their work verbally and respond to questions from jurors with varying technical backgrounds. Audience adaptation — adjusting depth and vocabulary based on who is asking — is a key factor.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate." },
      { level: "Good",         min: "21", max: "26", description: "Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident." },
      { level: "Developing",   min: "13", max: "20", description: "Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement." },
      { level: "Insufficient", min: "0",  max: "12", description: "Unclear or disorganised presentation. Most questions answered incorrectly or not at all." },
    ],
  },
  {
    key:        "technical-content",
    label:      "Technical Content",
    shortLabel: "Technical",
    color:      "#f59e0b",
    max:        30,
    blurb: "Evaluates the depth, correctness, and originality of the engineering work itself — independent of how well it is communicated. Assesses whether the team has applied appropriate knowledge, justified design decisions, and demonstrated real technical mastery.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident." },
      { level: "Good",         min: "21", max: "26", description: "Design is mostly clear and technically justified. Engineering decisions are largely supported." },
      { level: "Developing",   min: "13", max: "20", description: "Problem is stated but motivation or technical justification is insufficient." },
      { level: "Insufficient", min: "0",  max: "12", description: "Vague problem definition and unjustified decisions. Superficial technical content." },
    ],
  },
  {
    key:        "teamwork",
    label:      "Teamwork",
    shortLabel: "Teamwork",
    color:      "#22c55e",
    max:        10,
    blurb: "Evaluates visible evidence of equal and effective team participation during the evaluation session, as well as the group's professional and ethical conduct in interacting with jurors.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "9", max: "10", description: "All members participate actively and equally. Professional and ethical conduct observed throughout." },
      { level: "Good",         min: "7", max: "8",  description: "Most members contribute. Minor knowledge gaps. Professionalism mostly observed." },
      { level: "Developing",   min: "4", max: "6",  description: "Uneven participation. Some members are passive or unprepared." },
      { level: "Insufficient", min: "0", max: "3",  description: "Very low participation or dominated by one person. Lack of professionalism observed." },
    ],
  },
];

// ── Component ─────────────────────────────────────────────

export default function StarterCriteriaDrawer({
  open,
  onClose,
  draftCriteria,
  otherPeriods,
  isLocked,
  onApplyTemplate,
  onCopyFromPeriod,
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [confirmingAction, setConfirmingAction] = useState(null); // null | 'template' | 'copy'

  const hasExisting = draftCriteria.length > 0;
  const totalMax = draftCriteria.reduce((s, c) => s + (Number(c.max) || 0), 0);
  const isBalanced = hasExisting && totalMax === 100;

  const periodOptions = otherPeriods.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const selectedPeriodLabel = otherPeriods.find((p) => p.id === selectedPeriodId)?.name ?? "the selected period";

  function handleCopyClick() {
    if (hasExisting) {
      setConfirmingAction("copy");
    } else {
      onCopyFromPeriod(selectedPeriodId);
    }
  }

  function handleTemplateClick() {
    if (hasExisting) {
      setConfirmingAction("template");
    } else {
      onApplyTemplate(STARTER_CRITERIA);
    }
  }

  function confirmCopy() {
    onCopyFromPeriod(selectedPeriodId);
    setConfirmingAction(null);
  }

  function confirmTemplate() {
    onApplyTemplate(STARTER_CRITERIA);
    setConfirmingAction(null);
  }

  function cancelConfirm() {
    setConfirmingAction(null);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Load Template"
      icon={(stroke) => <LayoutTemplate size={17} stroke={stroke} strokeWidth={2} />}
    >
      {/* ── Section 1: Active Criteria ──────────────────── */}
      <div className="scd-section">
        <div className="scd-section-label">Active Criteria</div>
        {hasExisting ? (
          <div className="scd-chips-row">
            <span className="crt-chip neutral">{draftCriteria.length} {draftCriteria.length === 1 ? "criterion" : "criteria"}</span>
            <span className={`crt-chip ${isBalanced ? "success" : "warning"}`}>
              {totalMax} {isBalanced ? "pts · balanced" : "/ 100 pts"}
            </span>
          </div>
        ) : (
          <p className="scd-empty-hint">No criteria defined for this period.</p>
        )}
      </div>

      {/* ── Section 2: Copy from Existing Period ────────── */}
      <div className="scd-section">
        <div className="scd-section-label">Copy from Existing Period</div>

        {confirmingAction === "copy" ? (
          <div className="fs-confirm-panel">
            <p className="fs-confirm-msg">
              This replaces your {draftCriteria.length} existing {draftCriteria.length === 1 ? "criterion" : "criteria"} with criteria from <strong>{selectedPeriodLabel}</strong>.
            </p>
            <div className="fs-confirm-btns">
              <button className="fs-confirm-cancel" onClick={cancelConfirm}>Cancel</button>
              <button className="fs-confirm-action" onClick={confirmCopy}>
                <Copy size={13} strokeWidth={2.2} />
                Copy
              </button>
            </div>
          </div>
        ) : (
          <>
            <CustomSelect
              value={selectedPeriodId}
              onChange={setSelectedPeriodId}
              options={periodOptions}
              disabled={otherPeriods.length === 0 || isLocked}
              placeholder={otherPeriods.length === 0 ? "No other periods available" : "Select a period…"}
            />
            <div className="scd-action-row">
              <button
                className="scd-use-btn"
                onClick={handleCopyClick}
                disabled={!selectedPeriodId || isLocked}
              >
                Copy &amp; Use
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Section 3: Starter Templates ────────────────── */}
      <div className="scd-section">
        <div className="scd-section-label">Default Template</div>

        {confirmingAction === "template" ? (
          <div className="fs-confirm-panel">
            <p className="fs-confirm-msg">
              This replaces your {draftCriteria.length} existing {draftCriteria.length === 1 ? "criterion" : "criteria"} with the VERA Default template.
            </p>
            <div className="fs-confirm-btns">
              <button className="fs-confirm-cancel" onClick={cancelConfirm}>Cancel</button>
              <button className="fs-confirm-action" onClick={confirmTemplate}>
                <LayoutTemplate size={13} strokeWidth={2.2} />
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="scd-template-card">
            <div className="scd-template-info">
              <div className="scd-template-name">Standard Evaluation</div>
              <div className="scd-template-meta">4 criteria · 100 pts total</div>
            </div>
            <div className="scd-action-row" style={{ marginTop: 0 }}>
              <button
                className="scd-use-btn"
                onClick={handleTemplateClick}
                disabled={isLocked}
              >
                Use Template
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
