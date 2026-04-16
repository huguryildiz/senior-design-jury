// src/admin/pages/SetupWizardPage.jsx — Setup wizard for first-time organization admin
// ============================================================
// 7-step wizard guiding admins through initial evaluation setup.
// Steps: Welcome → Period → Criteria → Outcome → Jurors → Projects → Review & Launch

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useSetupWizard } from "../hooks/useSetupWizard";
import { useToast } from "@/shared/hooks/useToast";
import ImportJurorsModal from "../modals/ImportJurorsModal";
import { parseJurorsCsv } from "../utils/csvParser";
import {
  createPeriod,
  savePeriodCriteria,
  createJuror,
  createProject,
  generateEntryToken,
  listPeriodOutcomes,
  listPeriodCriteriaForMapping,
  upsertPeriodCriterionOutcomeMap,
  assignFrameworkToPeriod,
  getVeraStandardCriteria,
  setPeriodCriteriaName,
  checkPeriodReadiness,
  publishPeriod,
} from "@/shared/api";
import { CRITERIA } from "@/shared/constants";
import QRCodeStyling from "qr-code-styling";
import veraLogo from "@/assets/vera_logo.png";
import {
  Diamond,
  CalendarRange,
  ClipboardCheck,
  Users,
  Layers,
  Zap,
  BookOpen,
  Plus,
  X,
  Check,
  ArrowRight,
  Clock,
  Star,
  Upload,
  AlertCircle,
  QrCode,
  Loader2,
  Copy,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import "../../styles/pages/setup-wizard.css";

// Celebratory confetti burst for the completion screen — mirrors jury DoneStep.
function useConfetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#3b82f6", "#60a5fa", "#6366f1", "#a5b4fc", "#22c55e", "#4ade80", "#f1f5f9"];
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      r: 3 + Math.random() * 4,
      d: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      tiltAngle: 0,
      opacity: 1,
    }));

    let frame = 0;
    const totalFrames = 140;
    let rafId;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.tiltAngle += 0.07;
        p.y += p.d;
        p.x += p.vx;
        const tilt = Math.sin(p.tiltAngle) * 8;
        if (frame > 80) p.opacity = Math.max(0, 1 - (frame - 80) / 60);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, tilt, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      frame++;
      if (frame < totalFrames) rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);
  return canvasRef;
}

const STEP_LABELS = [
  "Welcome",
  "Period",
  "Criteria",
  "Outcome",
  "Jurors",
  "Projects",
  "Review",
];

const STEP_ICONS = {
  1: Diamond,
  2: CalendarRange,
  3: ClipboardCheck,
  4: BookOpen,
  5: Users,
  6: Layers,
  7: Zap,
};

// ============================================================
// Helper: Season auto-suggest based on current month
// ============================================================
function getSuggestedSeason() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (month >= 1 && month <= 5) return `Spring ${year}`;
  if (month >= 6 && month <= 8) return `Summer ${year}`;
  return `Fall ${year}`;
}

// ============================================================
// Helper: Build criteria payload for savePeriodCriteria
// ============================================================
function buildCriteriaPayload() {
  return CRITERIA.map((c) => ({
    key: c.id,
    label: c.label,
    shortLabel: c.shortLabel,
    color: c.color,
    max: c.max,
    blurb: c.blurb,
    outcomes: c.outcomes,
    rubric: c.rubric.map((r) => ({
      min: r.min,
      max: r.max,
      level: r.level,
      desc: r.desc,
    })),
  }));
}

// ============================================================
// Stepper Component
// ============================================================
function WizardStepper({ currentStep, completedSteps, onStepClick }) {
  const stepperRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current && stepperRef.current) {
      const container = stepperRef.current;
      const activeEl = activeRef.current;
      const offsetLeft = activeEl.offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;
      container.scrollTo({ left: offsetLeft, behavior: "smooth" });
    }
  }, [currentStep]);

  return (
    <div className="sw-stepper" ref={stepperRef}>
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1;
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const stepClass = isCompleted ? "completed" : isActive ? "active" : "";
        const isClickable = isCompleted || step <= currentStep;

        return (
          <div key={step} ref={isActive ? activeRef : null}>
            <div
              className={`sw-step ${stepClass}${isClickable ? " clickable" : ""}`}
              onClick={isClickable ? () => onStepClick(step) : undefined}
            >
              <div className="sw-step-circle">
                {isCompleted ? <Check size={13} strokeWidth={2.5} /> : step}
              </div>
              <div className="sw-step-label">{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Step 1: Welcome
// ============================================================
function StepWelcome({ onContinue, onSkip }) {
  const previewIcons = [
    { icon: CalendarRange,  label: "Create Period",  color: "#3b82f6" },
    { icon: BookOpen,       label: "Set Outcome",    color: "#06b6d4" },
    { icon: ClipboardCheck, label: "Set Criteria",   color: "#8b5cf6" },
    { icon: Users,          label: "Add Jurors",     color: "#10b981" },
    { icon: Layers,         label: "Add Projects",   color: "#f59e0b" },
    { icon: Zap,            label: "Launch",         color: "#f43f5e" },
  ];

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <Diamond size={24} />
      </div>
      <h2 className="sw-card-title">Set up your evaluation</h2>
      <p className="sw-card-desc">
        Configure your first evaluation period in a few straightforward steps.
        You can always adjust settings later.
      </p>

      <div className="sw-steps-preview">
        {previewIcons.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="sw-preview-item" style={{ "--pi-delay": `${idx * 80}ms`, "--pi-float-delay": `${idx * 370}ms` }}>
              <div
                className="sw-preview-icon sw-preview-icon--color"
                style={{
                  "--pi-color": item.color,
                  "--pi-bg": item.color + "18",
                  "--pi-border": item.color + "38",
                }}
              >
                <Icon size={18} />
              </div>
              <div className="sw-preview-label">{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="sw-time-estimate">
        <Clock size={14} />
        Estimated time: ~5 minutes
      </div>

      <div className="sw-actions">
        <button className="sw-btn sw-btn-primary" onClick={onContinue}>
          Get Started <ArrowRight size={16} />
        </button>
      </div>

      <div className="sw-footer">
        <button className="sw-btn-link" onClick={onSkip}>
          I'll set up later
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 2: Create Evaluation Period
// ============================================================
function StepCreatePeriod({ onContinue, onSkip, onBack, existingPeriods = [] }) {
  const toast = useToast();
  const { activeOrganization, fetchData } = useAdminContext();
  const [formData, setFormData] = useState({
    periodName: getSuggestedSeason(),
    description: "",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const handleCreate = async () => {
    const trimmed = formData.periodName.trim();
    if (!trimmed) {
      setNameError("Period name is required.");
      return;
    }
    const duplicate = existingPeriods.some(
      (p) => p.name?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setNameError("A period with this name already exists. Please choose a different name.");
      return;
    }
    if (!activeOrganization?.id) {
      toast.error("No organization selected. Please select an organization first.");
      return;
    }

    setSaving(true);
    try {
      const result = await createPeriod({
        organizationId: activeOrganization.id,
        name: formData.periodName,
        description: formData.description || null,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
      });

      toast.success("Period created");
      try { await fetchData(); } catch { /* non-fatal */ }
      onContinue(result.id);
    } catch (err) {
      toast.error("Failed to create period: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <CalendarRange size={24} />
      </div>
      <h2 className="sw-card-title">Create your first evaluation period</h2>
      <p className="sw-card-desc">
        An evaluation period defines the timeframe and context for a set of jury
        evaluations.
      </p>

      <div className="sw-form-group">
        <label className="sw-form-label">
          Period Name <span className="sw-required">*</span>
        </label>
        <input
          type="text"
          className={`sw-form-input${nameError ? " error" : ""}`}
          placeholder="e.g., Spring 2024"
          value={formData.periodName}
          onChange={(e) => {
            setFormData({ ...formData, periodName: e.target.value });
            if (nameError) setNameError("");
          }}
        />
        {nameError ? (
          <p className="vera-inline-error"><AlertCircle size={12} strokeWidth={2} />{nameError}</p>
        ) : (
          <div className="sw-form-hint">
            Auto-suggested based on current date. You can customize it.
          </div>
        )}
      </div>

      <div className="sw-form-group">
        <label className="sw-form-label">Description <span className="sw-form-optional">(optional)</span></label>
        <textarea
          className="sw-form-input"
          placeholder="Optional description for this evaluation period"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="sw-form-row">
        <div className="sw-form-group">
          <label className="sw-form-label">Start Date <span className="sw-form-optional">(optional)</span></label>
          <input
            type="date"
            className="sw-form-input"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
          />
        </div>
        <div className="sw-form-group">
          <label className="sw-form-label">End Date <span className="sw-form-optional">(optional)</span></label>
          <input
            type="date"
            className="sw-form-input"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
          />
        </div>
      </div>

      <div className="sw-actions">
        <button
          className="sw-btn sw-btn-primary"
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? <><Loader2 size={16} className="sw-btn-spinner" /> Creating…</> : <>Create Period & Continue <ArrowRight size={16} /></>}
        </button>
      </div>

      <div className="sw-footer">
        <div>
          <button className="sw-btn-link" onClick={onBack}>
            ← Back
          </button>
        </div>
        <button className="sw-btn-link" onClick={onSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 3: Set Framework
// ============================================================
function StepFramework({ periodId, frameworks = [], onContinue, onSkip, onBack }) {
  const toast = useToast();
  const { navigateTo, setSelectedPeriodId, fetchData, reloadCriteriaAndOutcomes } = useAdminContext();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (fw) => {
    if (!periodId) {
      onContinue(fw.id);
      return;
    }
    setSelected(fw.id);
    setSaving(true);
    try {
      await assignFrameworkToPeriod(periodId, fw.id);
      toast.success(`${fw.name} assigned`);
      await Promise.all([fetchData?.(), reloadCriteriaAndOutcomes?.()]);
      onContinue(fw.id);
    } catch (err) {
      toast.error("Failed to assign framework: " + (err?.message || String(err)));
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  const BADGES = { MÜDEK: { label: "MÜDEK", color: "#2563eb" }, ABET: { label: "ABET", color: "#16a34a" } };
  const getBadge = (name = "") => Object.entries(BADGES).find(([k]) => name.toUpperCase().includes(k))?.[1];

  // Wizard only surfaces the canonical platform-level accreditation standards
  // (organization_id === null means global/built-in, not a tenant clone).
  // Custom/cloned frameworks and the generic VERA template are hidden here — they stay
  // available from Period settings but shouldn't distract a first-time admin.
  const visibleFrameworks = frameworks.filter((fw) => fw.organization_id === null && !!getBadge(fw.name));

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <BookOpen size={24} />
      </div>
      <h2 className="sw-card-title">Set accreditation framework</h2>
      <p className="sw-card-desc">
        Choose the accreditation standard for this period. Outcomes, analytics,
        and coverage tracking will follow the selected framework.
      </p>

      {visibleFrameworks.length === 0 ? (
        <div className="sw-warning-banner">
          <AlertCircle size={16} />
          No frameworks found. You can skip and assign a framework from Period settings later.
        </div>
      ) : (
        <div className="sw-template-cards sw-template-cards--grid">
          {visibleFrameworks.map((fw) => {
            const badge = getBadge(fw.name);
            const isActive = selected === fw.id;
            return (
              <div
                key={fw.id}
                className={`sw-template-card sw-framework-card${isActive ? " is-active" : ""}`}
              >
                <div className="sw-template-card-header">
                  <div className="sw-template-card-icon">
                    <BookOpen size={16} />
                  </div>
                  <div className="sw-template-card-title">{fw.name}</div>
                </div>
                {fw.description && (
                  <div className="sw-template-card-desc">{fw.description}</div>
                )}
                <button
                  className="sw-btn sw-btn-primary"
                  onClick={() => handleSelect(fw)}
                  disabled={saving}
                >
                  {saving && isActive
                    ? <><Loader2 size={16} className="sw-btn-spinner" /> Assigning…</>
                    : <>Use {fw.name} <ArrowRight size={16} /></>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="sw-scratch-card"
        onClick={() => {
          if (periodId) setSelectedPeriodId(periodId);
          navigateTo("outcomes");
        }}
      >
        <div className="sw-scratch-card-icon">
          <Plus size={16} />
        </div>
        <div className="sw-scratch-card-body">
          <span className="sw-scratch-card-title">Create from scratch</span>
          <span className="sw-scratch-card-hint">Define your own outcomes and criteria in the Outcomes page</span>
        </div>
        <ArrowRight size={15} className="sw-scratch-card-arrow" />
      </button>

      <div className="sw-footer">
        <button className="sw-btn-link" onClick={onBack}>
          ← Back
        </button>
        <button className="sw-btn-link" onClick={onSkip}>
          Skip — set framework later
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 4: Evaluation Criteria
// ============================================================
function StepCriteria({ periodId, onContinue, onSkip, onBack, loading }) {
  const toast = useToast();
  const { fetchData, navigateTo, setSelectedPeriodId, reloadCriteriaAndOutcomes } = useAdminContext();
  const [templateCriteria, setTemplateCriteria] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getVeraStandardCriteria()
      .then((rows) => { if (!cancelled) setTemplateCriteria(rows); })
      .catch(() => { /* fall through to CRITERIA constant */ })
      .finally(() => { if (!cancelled) setLoadingTemplate(false); });
    return () => { cancelled = true; };
  }, []);

  // Display criteria: DB rows if loaded, otherwise hardcoded fallback
  const displayCriteria = templateCriteria ?? CRITERIA;

  const handleApplyTemplate = async () => {
    if (!periodId) {
      toast.error("No period selected");
      return;
    }

    try {
      const payload = templateCriteria ? templateCriteria : buildCriteriaPayload();
      await savePeriodCriteria(periodId, payload);

      // Criterion↔outcome mappings live in period_criterion_outcome_maps now.
      // Create them explicitly after criteria save — the save RPC only writes
      // criterion metadata.
      const [periodOutcomes, periodCriteria] = await Promise.all([
        listPeriodOutcomes(periodId),
        listPeriodCriteriaForMapping(periodId),
      ]);
      const outcomeIdByCode = new Map(periodOutcomes.map((o) => [o.code, o.id]));
      const criterionIdByKey = new Map(periodCriteria.map((c) => [c.key, c.id]));
      for (const c of payload) {
        const critId = criterionIdByKey.get(c.key);
        if (!critId || !Array.isArray(c.outcomes)) continue;
        for (const code of c.outcomes) {
          const outcomeId = outcomeIdByCode.get(code);
          if (!outcomeId) continue;
          try {
            await upsertPeriodCriterionOutcomeMap({
              period_id: periodId,
              period_criterion_id: critId,
              period_outcome_id: outcomeId,
              coverage_type: "direct",
            });
          } catch {
            // Non-fatal: continue with remaining mappings.
          }
        }
      }

      await setPeriodCriteriaName(periodId, "VERA Standard");
      toast.success("Criteria applied");
      await Promise.all([fetchData(), reloadCriteriaAndOutcomes?.()]);
      onContinue();
    } catch (err) {
      toast.error("Failed to apply criteria: " + err.message);
    }
  };

  const handleBuildCustom = () => {
    if (periodId) setSelectedPeriodId(periodId);
    navigateTo("criteria");
  };

  const totalPoints = displayCriteria.reduce((sum, c) => sum + c.max, 0);
  const maxPercentage = displayCriteria.length > 0
    ? Math.max(...displayCriteria.map((c) => (c.max / totalPoints) * 100))
    : 100;

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <ClipboardCheck size={24} />
      </div>
      <h2 className="sw-card-title">Set up evaluation criteria</h2>
      <p className="sw-card-desc">
        Criteria define what jurors evaluate. Choose a template for a quick
        start or build custom criteria.
      </p>

      <div className="sw-template-cards">
        {/* Template 1: Standard */}
        <div className="sw-template-card recommended">
          <div className="sw-template-card-header">
            <div className="sw-template-card-icon">
              <Star size={16} />
            </div>
            <div className="sw-template-card-title">VERA Standard</div>
            <div className="sw-template-card-badge">RECOMMENDED</div>
          </div>

          <div className="sw-criteria-preview">
            {loadingTemplate ? (
              <div className="sw-criteria-loading">
                <Loader2 size={16} className="sw-btn-spinner" /> Loading criteria…
              </div>
            ) : displayCriteria.map((c) => {
              const fillPercentage = (c.max / totalPoints) * 100;
              return (
                <div key={c.key ?? c.id} className="sw-criteria-row">
                  <div
                    className="sw-criteria-dot"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="sw-criteria-name">{c.label}</div>
                  <div className="sw-criteria-pts">{c.max} pts</div>
                  <div className="sw-criteria-bar">
                    <div
                      className="sw-criteria-bar-fill"
                      style={{
                        backgroundColor: c.color,
                        width: `${(fillPercentage / maxPercentage) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sw-criteria-info">
            {displayCriteria.length} criteria · {totalPoints} points total · 4-level
            rubric bands
          </div>

          <button
            className="sw-btn sw-btn-primary"
            onClick={handleApplyTemplate}
            disabled={loading}
          >
            {loading ? <><Loader2 size={16} className="sw-btn-spinner" /> Applying…</> : <>Apply Template & Continue <ArrowRight size={16} /></>}
          </button>
        </div>

        {/* Template 2: Custom */}
        <div className="sw-template-card">
          <div className="sw-template-card-header">
            <div className="sw-template-card-icon">
              <ClipboardCheck size={16} />
            </div>
            <div className="sw-template-card-title">Build Custom Criteria</div>
          </div>

          <div className="sw-template-card-desc">
            Define your own scoring categories, weights, and rubric bands from
            scratch.
          </div>

          <button className="sw-btn sw-btn-ghost" onClick={handleBuildCustom}>
            Go to Criteria Editor →
          </button>
        </div>
      </div>

      <div className="sw-footer">
        <button className="sw-btn-link" onClick={onBack}>
          ← Back
        </button>
        <button className="sw-btn-link" onClick={onSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 5: Add Jurors
// ============================================================
function StepJurors({ periodId, onContinue, onSkip, onBack, loading }) {
  const toast = useToast();
  const { activeOrganization, fetchData, allJurors } = useAdminContext();
  const [rows, setRows] = useState([{ name: "", affiliation: "", email: "" }]);
  const [importOpen, setImportOpen] = useState(false);

  const addRow = () => {
    setRows([...rows, { name: "", affiliation: "", email: "" }]);
  };

  const removeRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    const updated = [...rows];
    updated[idx][field] = value;
    setRows(updated);
  };

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.name.trim() && r.affiliation.trim());
    if (validRows.length === 0) {
      toast.error("Please add at least one juror");
      return;
    }

    try {
      for (const row of validRows) {
        await createJuror({
          period_id: periodId,
          organization_id: activeOrganization?.id,
          juror_name: row.name,
          affiliation: row.affiliation,
          email: row.email || null,
        });
      }
      toast.success(`${validRows.length} jurors added`);
      await fetchData();
      onContinue();
    } catch (err) {
      toast.error("Failed to add jurors: " + err.message);
    }
  };

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <Users size={24} />
      </div>
      <h2 className="sw-card-title">Add your evaluation team</h2>
      <p className="sw-card-desc">
        Register the jurors who will evaluate projects.
      </p>

      <div className="sw-juror-count">
        {rows.filter((r) => r.name.trim() && r.affiliation.trim()).length}{" "}
        {rows.filter((r) => r.name.trim() && r.affiliation.trim()).length === 1
          ? "juror"
          : "jurors"}{" "}
        added
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="sw-juror-row">
          <div className="sw-form-group">
            <label className="sw-form-label">
              Name <span className="sw-required">*</span>
            </label>
            <input
              type="text"
              className="sw-form-input"
              placeholder="John Doe"
              value={row.name}
              onChange={(e) => updateRow(idx, "name", e.target.value)}
            />
          </div>
          <div className="sw-form-group">
            <label className="sw-form-label">
              Affiliation <span className="sw-required">*</span>
            </label>
            <input
              type="text"
              className="sw-form-input"
              placeholder="TED University"
              value={row.affiliation}
              onChange={(e) => updateRow(idx, "affiliation", e.target.value)}
            />
          </div>
          <div className="sw-form-group">
            <label className="sw-form-label">Email</label>
            <input
              type="email"
              className="sw-form-input"
              placeholder="john@example.com"
              value={row.email}
              onChange={(e) => updateRow(idx, "email", e.target.value)}
            />
          </div>
          <button
            className="sw-juror-remove-btn"
            onClick={() => removeRow(idx)}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <button className="sw-add-another-btn" onClick={addRow} type="button">
        <Plus size={14} /> Add Another Juror
      </button>

      <div className="sw-or-divider">or</div>

      <button className="sw-btn sw-btn-ghost" style={{ width: "100%" }} type="button" onClick={() => setImportOpen(true)}>
        <Upload size={14} /> Import from CSV
      </button>

      <div className="sw-actions">
        <button
          className="sw-btn sw-btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <><Loader2 size={16} className="sw-btn-spinner" /> Saving…</> : <>Save Jurors & Continue <ArrowRight size={16} /></>}
        </button>
      </div>

      <div className="sw-footer">
        <button className="sw-btn-link" onClick={onBack}>
          ← Back
        </button>
        <button className="sw-btn-link" onClick={onSkip}>
          Skip — add jurors later
        </button>
      </div>

      <ImportJurorsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        parseFile={(f) => parseJurorsCsv(f, allJurors || [])}
        onImport={async (validRows) => {
          let imported = 0, skipped = 0, failed = 0;
          for (const row of validRows) {
            try {
              await createJuror({
                period_id: periodId,
                organization_id: activeOrganization?.id,
                juror_name: row.juror_name,
                affiliation: row.affiliation,
                email: row.email || null,
              });
              imported += 1;
            } catch (e) {
              const msg = String(e?.message || "").toLowerCase();
              if (msg.includes("duplicate") || msg.includes("uniq")) {
                skipped += 1;
              } else {
                failed += 1;
              }
            }
          }
          await fetchData();
          return { imported, skipped, failed };
        }}
      />
    </div>
  );
}

// ============================================================
// Step 6: Add Projects
// ============================================================
function StepProjects({ periodId, onContinue, onSkip, onBack, loading }) {
  const toast = useToast();
  const { activeOrganization, fetchData } = useAdminContext();
  const [rows, setRows] = useState([
    { title: "", advisor: "", teamMembers: [] },
  ]);

  const addRow = () => {
    setRows([...rows, { title: "", advisor: "", teamMembers: [] }]);
  };

  const removeRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    const updated = [...rows];
    updated[idx][field] = value;
    setRows(updated);
  };

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.title.trim());
    if (validRows.length === 0) {
      toast.error("Please add at least one project");
      return;
    }

    try {
      for (const row of validRows) {
        await createProject({
          period_id: periodId,
          organization_id: activeOrganization?.id,
          title: row.title,
          advisor: row.advisor || null,
          team_members: row.teamMembers.length > 0 ? row.teamMembers : null,
        });
      }
      toast.success(`${validRows.length} projects added`);
      await fetchData();
      onContinue();
    } catch (err) {
      toast.error("Failed to add projects: " + err.message);
    }
  };

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <Layers size={24} />
      </div>
      <h2 className="sw-card-title">Add projects</h2>
      <p className="sw-card-desc">
        Register the projects that jurors will evaluate during this period.
      </p>

      {rows.map((row, idx) => (
        <div key={idx} style={{ marginBottom: "24px" }}>
          <div className="sw-form-group">
            <label className="sw-form-label">
              Project Title <span className="sw-required">*</span>
            </label>
            <input
              type="text"
              className="sw-form-input"
              placeholder="Project name"
              value={row.title}
              onChange={(e) => updateRow(idx, "title", e.target.value)}
            />
          </div>

          <div className="sw-form-row">
            <div className="sw-form-group">
              <label className="sw-form-label">Advisor</label>
              <input
                type="text"
                className="sw-form-input"
                placeholder="Dr. Jane Smith"
                value={row.advisor}
                onChange={(e) => updateRow(idx, "advisor", e.target.value)}
              />
            </div>
            <div className="sw-form-group">
              <label className="sw-form-label">Team Members</label>
              <input
                type="text"
                className="sw-form-input"
                placeholder="Comma-separated names"
                defaultValue={row.teamMembers.join(", ")}
                onChange={(e) =>
                  updateRow(idx, "teamMembers", e.target.value.split(",").map((s) => s.trim()))
                }
              />
            </div>
          </div>

          {rows.length > 1 && (
            <button
              className="sw-btn sw-btn-ghost"
              onClick={() => removeRow(idx)}
              style={{ marginBottom: "16px" }}
              type="button"
            >
              <X size={14} /> Remove Project
            </button>
          )}
        </div>
      ))}

      <button className="sw-add-another-btn" onClick={addRow} type="button">
        <Plus size={14} /> Add Another Project
      </button>

      <div className="sw-or-divider">or</div>

      <button className="sw-btn sw-btn-ghost" style={{ width: "100%" }}>
        <Upload size={14} /> Import from CSV
      </button>

      <div className="sw-actions">
        <button
          className="sw-btn sw-btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <><Loader2 size={16} className="sw-btn-spinner" /> Saving…</> : <>Save Projects & Continue <ArrowRight size={16} /></>}
        </button>
      </div>

      <div className="sw-footer">
        <button className="sw-btn-link" onClick={onBack}>
          ← Back
        </button>
        <button className="sw-btn-link" onClick={onSkip}>
          Skip — add projects later
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 7: Review & Launch
// ============================================================
function StepReview({ periodId, onComplete, onBack, loading }) {
  const toast = useToast();
  const {
    selectedPeriod,
    criteriaConfig,
    allJurors,
    summaryData,
    navigateTo,
    isDemoMode,
  } = useAdminContext();
  const [entryToken, setEntryToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const qrInstance = useRef(null);
  const qrRef = useRef(null);

  const handleCopy = async () => {
    if (!entryUrl) return;
    try {
      await navigator.clipboard.writeText(entryUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = entryUrl;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const entryUrl = entryToken
    ? `${window.location.origin}${isDemoMode ? "/demo" : ""}/eval?t=${encodeURIComponent(entryToken)}`
    : "";

  useEffect(() => {
    qrInstance.current = new QRCodeStyling({
      width: 200,
      height: 200,
      type: "svg",
      dotsOptions: { type: "extra-rounded", color: "#1e3a5f" },
      cornersSquareOptions: { type: "extra-rounded", color: "#1e3a5f" },
      cornersDotOptions: { type: "dot", color: "#2563eb" },
      backgroundOptions: { color: "#ffffff" },
      imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: 0.46 },
    });
  }, []);

  useEffect(() => {
    if (!qrInstance.current || !entryUrl) return;
    qrInstance.current.update({ data: entryUrl, image: veraLogo });
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qrInstance.current.append(qrRef.current);
    }
  }, [entryUrl]);

  const generateToken = async () => {
    try {
      // Step 7 is the wizard's publish checkpoint. Run readiness first — if
      // any required check fails, the wizard surfaces the issues inline and
      // stops before attempting publish.
      const readiness = await checkPeriodReadiness(periodId);
      if (!readiness?.ok) {
        const blockers = (readiness?.issues || [])
          .filter((i) => i.severity === "required")
          .map((i) => i.msg)
          .join(" · ");
        toast.error(blockers ? `Cannot publish: ${blockers}` : "Period is not ready to publish.");
        return;
      }
      // Publish is idempotent; if the period is already Published, this
      // returns { already_published: true } and we proceed straight to QR.
      const publishResult = await publishPeriod(periodId);
      if (publishResult && publishResult.ok === false) {
        toast.error("Failed to publish period.");
        return;
      }
      const token = await generateEntryToken(periodId);
      setEntryToken(token);
      toast.success("Period published — entry token ready.");
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("period_not_published")) {
        toast.error("Period must be published before generating a token.");
      } else {
        toast.error("Failed to generate token: " + msg);
      }
    }
  };

  const periodInfo = selectedPeriod || {};
  const jurorCount = allJurors?.length || 0;
  const projectCount = summaryData?.length || 0;
  const criteriaCount = criteriaConfig?.length || 0;
  const totalPoints = criteriaConfig?.reduce((sum, c) => sum + (c.max || 0), 0) || 0;

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <Zap size={24} />
      </div>
      <h2 className="sw-card-title">Review & Launch</h2>
      <p className="sw-card-desc">
        Your evaluation is almost ready. Review the summary below.
      </p>

      <div className="sw-review-grid">
        <div className="sw-review-card">
          <div className="sw-review-card-header">
            <div className="sw-review-card-icon blue">
              <CalendarRange size={14} />
            </div>
            <div className="sw-review-card-title">Period</div>
          </div>
          <div className="sw-review-card-value">{periodInfo.name || "—"}</div>
          {periodInfo.start_date && periodInfo.end_date && (
            <div className="sw-review-card-meta">
              {new Date(periodInfo.start_date).toLocaleDateString()} →{" "}
              {new Date(periodInfo.end_date).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="sw-review-card">
          <div className="sw-review-card-header">
            <div className="sw-review-card-icon green">
              <ClipboardCheck size={14} />
            </div>
            <div className="sw-review-card-title">Criteria</div>
          </div>
          <div className="sw-review-card-value">{criteriaCount}</div>
          <div className="sw-review-card-meta">{totalPoints} points total</div>
        </div>

        <div className="sw-review-card">
          <div className="sw-review-card-header">
            <div className="sw-review-card-icon purple">
              <Users size={14} />
            </div>
            <div className="sw-review-card-title">Jurors</div>
          </div>
          <div className="sw-review-card-value">{jurorCount}</div>
        </div>

        <div className="sw-review-card">
          <div className="sw-review-card-header">
            <div className="sw-review-card-icon amber">
              <Layers size={14} />
            </div>
            <div className="sw-review-card-title">Projects</div>
          </div>
          <div className="sw-review-card-value">{projectCount}</div>
        </div>
      </div>

      <div className="sw-entry-token-section">
        <div className="sw-entry-token-title">
          <QrCode size={16} /> Entry Token
        </div>
        <div className="sw-entry-token-desc">
          Jurors use this token to access your evaluation at the evaluation
          gate.
        </div>

        {entryToken ? (
          <div className="sw-token-card">
            <div className="sw-token-card-status">
              <span className="sw-token-status-dot" />
              Active
            </div>

            <div className="sw-qr-code" ref={qrRef} />

            <div className="sw-token-url-group">
              <a
                href={entryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sw-token-url"
                title="Open jury entry gate in a new tab"
              >
                <span className="sw-token-url-text">{entryUrl}</span>
                <ExternalLink size={13} strokeWidth={2} aria-hidden />
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className={`sw-token-copy${copied ? " is-copied" : ""}`}
                aria-label={copied ? "Copied" : "Copy entry URL"}
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={14} strokeWidth={2.25} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={2} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button className="sw-btn sw-btn-ghost" onClick={generateToken}>
            Publish & Generate Token
          </button>
        )}
      </div>

      <div className="sw-actions">
        <button
          className="sw-btn sw-btn-success"
          onClick={onComplete}
          disabled={loading}
        >
          Complete Setup <ArrowRight size={16} />
        </button>
      </div>

      <div className="sw-footer">
        <button className="sw-btn-link" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Completion Screen
// ============================================================
function CompletionScreen({ onDashboard, onViewToken }) {
  const confettiRef = useConfetti();
  return (
    <>
      <div className="sw-card sw-fade-in">
        <div className="sw-completion-icon">
          <Check size={32} />
        </div>
        <h2 className="sw-card-title">Your evaluation is ready!</h2>
        <p className="sw-card-desc">
          Setup is complete. You can now start managing your evaluation period.
          Jurors can begin submitting their evaluations.
        </p>

        <div className="sw-completion-actions">
          <button className="sw-btn sw-btn-primary" onClick={onDashboard}>
            Go to Dashboard →
          </button>
          <button className="sw-btn sw-btn-ghost" onClick={onViewToken}>
            View Entry Token
          </button>
        </div>
      </div>
      <canvas
        ref={confettiRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
    </>
  );
}

// ============================================================
// Main SetupWizardPage Component
// ============================================================
export default function SetupWizardPage() {
  const {
    activeOrganization,
    sortedPeriods,
    criteriaConfig,
    frameworks,
    allJurors,
    summaryData,
    navigateTo,
    fetchData,
    reloadCriteriaAndOutcomes,
  } = useAdminContext();

  const {
    currentStep,
    completedSteps,
    goToStep,
    nextStep,
    prevStep,
    wizardData,
    setWizardData,
  } = useSetupWizard({
    orgId: activeOrganization?.id,
    periods: sortedPeriods || [],
    criteriaConfig: criteriaConfig || [],
    frameworks: frameworks || [],
    jurors: allJurors || [],
    projects: summaryData || [],
    hasEntryToken: false,
  });

  const [loading, setLoading] = useState(false);
  // Restore completion screen on remount so that navigating away and back still
  // shows "Your evaluation is ready!" instead of dumping the user back onto
  // step 7 (which reactive derivation would do once all data is in place).
  const [showCompletion, setShowCompletion] = useState(() => {
    if (!activeOrganization?.id) return false;
    try {
      return sessionStorage.getItem(`sw_done_${activeOrganization.id}`) === "1";
    } catch {
      return false;
    }
  });

  const periodId = wizardData.periodId;

  // Refresh shared context data on mount so that any external changes
  // (e.g. a period deleted from the Periods page, or criteria/outcomes
  // edited on the Criteria page) are reflected before the wizard validates
  // its state. AdminRouteLayout's criteria/outcome effect only re-fires on
  // period/org change, so we force a reload here to catch same-period edits.
  useEffect(() => {
    fetchData();
    reloadCriteriaAndOutcomes?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a stable set of period IDs from current context data so we can
  // detect when the period the wizard was working on has been deleted externally.
  const periodIdSet = useMemo(
    () => new Set((sortedPeriods || []).map((p) => p.id)),
    [sortedPeriods]
  );

  // If the wizard holds a periodId that no longer exists, or all periods were
  // deleted, reset to step 1 so the user is prompted to create a new period.
  useEffect(() => {
    // sortedPeriods === undefined means still loading — don't act yet
    if (!Array.isArray(sortedPeriods)) return;
    // All periods gone (e.g. deleted externally): wizardData init already cleared
    // periodId, so the !periodId guard below would skip — handle it here.
    if (sortedPeriods.length === 0) {
      setWizardData({ periodId: null });
      goToStep(1);
      return;
    }
    if (!periodId) return;
    if (!periodIdSet.has(periodId)) {
      setWizardData({ periodId: null });
      goToStep(1);
    }
  }, [periodId, periodIdSet, sortedPeriods, setWizardData, goToStep]);

  const handleStep2Continue = useCallback(
    async (periodId) => {
      setWizardData({ periodId });
      await fetchData();
      // Don't call nextStep() here — the reactive effect in useSetupWizard advances
      // step 2→3 once fetchData() updates sortedPeriods with the new period.
      // Calling nextStep() here would double-count: reactive effect → 3, nextStep() → 4.
    },
    [setWizardData, fetchData]
  );

  // Step 3: Framework — save selected frameworkId (or mark skipped)
  const handleStep3Continue = useCallback(
    (frameworkId) => {
      if (frameworkId) setWizardData({ frameworkId });
      nextStep();
    },
    [nextStep, setWizardData]
  );

  const handleStep3Skip = useCallback(() => {
    setWizardData({ skippedFramework: true });
    nextStep();
  }, [nextStep, setWizardData]);

  const handleStep4Continue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleStep5Continue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleStep6Continue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const clearWizardStorage = useCallback(() => {
    if (!activeOrganization?.id) return;
    try {
      sessionStorage.removeItem(`sw_step_${activeOrganization.id}`);
      sessionStorage.removeItem(`sw_data_${activeOrganization.id}`);
    } catch {}
  }, [activeOrganization?.id]);

  const handleCompletion = useCallback(() => {
    if (activeOrganization?.id) {
      try {
        sessionStorage.setItem(`sw_done_${activeOrganization.id}`, "1");
      } catch {}
    }
    clearWizardStorage();
    setShowCompletion(true);
  }, [activeOrganization?.id, clearWizardStorage]);

  const handleSkip = useCallback(() => {
    clearWizardStorage();
    navigateTo("overview");
  }, [navigateTo, clearWizardStorage]);

  if (showCompletion) {
    return (
      <CompletionScreen
        onDashboard={() => navigateTo("overview")}
        onViewToken={() => navigateTo("entry-control")}
      />
    );
  }

  return (
    <>
      <WizardStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {currentStep === 1 && (
        <StepWelcome
          onContinue={() => nextStep()}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 2 && (
        <StepCreatePeriod
          onContinue={handleStep2Continue}
          onSkip={handleSkip}
          onBack={prevStep}
          loading={loading}
          existingPeriods={sortedPeriods || []}
        />
      )}

      {currentStep === 3 && (
        <StepCriteria
          periodId={periodId}
          onContinue={handleStep4Continue}
          onSkip={handleSkip}
          onBack={prevStep}
          loading={loading}
        />
      )}

      {currentStep === 4 && (
        <StepFramework
          periodId={periodId}
          frameworks={frameworks || []}
          onContinue={handleStep3Continue}
          onSkip={handleStep3Skip}
          onBack={prevStep}
        />
      )}

      {currentStep === 5 && (
        <StepJurors
          periodId={periodId}
          onContinue={handleStep5Continue}
          onSkip={handleSkip}
          onBack={prevStep}
          loading={loading}
        />
      )}

      {currentStep === 6 && (
        <StepProjects
          periodId={periodId}
          onContinue={handleStep6Continue}
          onSkip={handleSkip}
          onBack={prevStep}
          loading={loading}
        />
      )}

      {currentStep === 7 && (
        <StepReview
          periodId={periodId}
          onComplete={handleCompletion}
          onBack={prevStep}
          loading={loading}
        />
      )}
    </>
  );
}
