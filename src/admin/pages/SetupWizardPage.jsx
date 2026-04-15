// src/admin/pages/SetupWizardPage.jsx — Setup wizard for first-time organization admin
// ============================================================
// 7-step wizard guiding admins through initial evaluation setup.
// Steps: Welcome → Period → Criteria → Outcomes → Jurors → Projects → Review & Launch

import { useState, useCallback, useEffect } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useSetupWizard } from "../hooks/useSetupWizard";
import { useToast } from "@/shared/hooks/useToast";
import {
  createPeriod,
  savePeriodCriteria,
  createJuror,
  createProject,
  generateEntryToken,
  listPeriodOutcomes,
  listPeriodCriteriaForMapping,
  upsertPeriodCriterionOutcomeMap,
} from "@/shared/api";
import { applyStandardFramework } from "@/shared/api/admin/wizardHelpers";
import { CRITERIA, OUTCOME_DEFINITIONS } from "@/shared/constants";
import {
  Diamond,
  CalendarRange,
  ClipboardCheck,
  Globe,
  Users,
  Layers,
  Zap,
  Plus,
  X,
  Check,
  ArrowRight,
  Clock,
  Star,
  Upload,
  AlertCircle,
  QrCode,
} from "lucide-react";
import "../../styles/pages/setup-wizard.css";

const STEP_LABELS = [
  "Welcome",
  "Period",
  "Criteria",
  "Outcomes",
  "Jurors",
  "Projects",
  "Review",
];

const STEP_ICONS = {
  1: Diamond,
  2: CalendarRange,
  3: ClipboardCheck,
  4: Globe,
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
  return (
    <div className="sw-stepper">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1;
        const Icon = STEP_ICONS[step];
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const stepClass = isCompleted ? "completed" : isActive ? "active" : "";

        return (
          <div key={step}>
            <div className={`sw-step ${stepClass}`}>
              <div className="sw-step-circle">{step}</div>
              <div className="sw-step-label">{label}</div>
            </div>
            {step < 7 && (
              <div
                className={`sw-step-line ${
                  isCompleted ? "completed" : isActive ? "active" : ""
                }`}
              />
            )}
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
    { icon: CalendarRange, label: "Create Period" },
    { icon: ClipboardCheck, label: "Set Criteria" },
    { icon: Users, label: "Add Jurors" },
    { icon: Layers, label: "Add Projects" },
    { icon: Zap, label: "Launch" },
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
            <div key={idx} className="sw-preview-item">
              <div className="sw-preview-icon">
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
function StepCreatePeriod({ onContinue, onSkip, onBack }) {
  const toast = useToast();
  const { activeOrganization, fetchData } = useAdminContext();
  const [formData, setFormData] = useState({
    periodName: getSuggestedSeason(),
    description: "",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formData.periodName.trim()) {
      toast.error("Period name is required");
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
          className="sw-form-input"
          placeholder="e.g., Spring 2024"
          value={formData.periodName}
          onChange={(e) =>
            setFormData({ ...formData, periodName: e.target.value })
          }
        />
        <div className="sw-form-hint">
          Auto-suggested based on current date. You can customize it.
        </div>
      </div>

      <div className="sw-form-group">
        <label className="sw-form-label">Description</label>
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
          <label className="sw-form-label">Start Date</label>
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
          <label className="sw-form-label">End Date</label>
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
          {saving ? "Creating…" : <>Create Period & Continue <ArrowRight size={16} /></>}
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
// Step 3: Evaluation Criteria
// ============================================================
function StepCriteria({ periodId, onContinue, onSkip, onBack, loading }) {
  const toast = useToast();
  const { fetchData } = useAdminContext();

  const handleApplyTemplate = async () => {
    if (!periodId) {
      toast.error("No period selected");
      return;
    }

    try {
      const payload = buildCriteriaPayload();
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

      toast.success("Criteria applied");
      await fetchData();
      onContinue();
    } catch (err) {
      toast.error("Failed to apply criteria: " + err.message);
    }
  };

  const handleBuildCustom = () => {
    const ctx = useAdminContext();
    ctx.navigateTo("criteria");
  };

  const totalPoints = CRITERIA.reduce((sum, c) => sum + c.max, 0);
  const maxPercentage = Math.max(...CRITERIA.map((c) => (c.max / totalPoints) * 100));

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
            <div className="sw-template-card-title">Standard Evaluation Template</div>
            <div className="sw-template-card-badge">RECOMMENDED</div>
          </div>

          <div className="sw-criteria-preview">
            {CRITERIA.map((c) => {
              const fillPercentage = (c.max / totalPoints) * 100;
              return (
                <div key={c.id} className="sw-criteria-row">
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
            {CRITERIA.length} criteria · {totalPoints} points total · 4-level
            rubric bands
          </div>

          <button
            className="sw-btn sw-btn-primary"
            onClick={handleApplyTemplate}
            disabled={loading}
          >
            Apply Template & Continue <ArrowRight size={16} />
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
// Step 4: Outcomes & Mapping
// ============================================================
function StepOutcomes({ onContinue, onSkip, onBack, loading }) {
  const toast = useToast();
  const { activeOrganization, reloadFrameworks } = useAdminContext();

  const handleApplyStandard = async () => {
    try {
      await applyStandardFramework(activeOrganization?.id);
      await reloadFrameworks();
      toast.success("Standard outcomes applied");
      onContinue();
    } catch (err) {
      toast.error("Failed to apply outcomes: " + err.message);
    }
  };

  const handleCustom = () => {
    const ctx = useAdminContext();
    ctx.navigateTo("outcomes");
  };

  const outcomeCount = Object.keys(OUTCOME_DEFINITIONS).length;
  const firstThreeOutcomes = Object.entries(OUTCOME_DEFINITIONS)
    .slice(0, 3)
    .map(([code, def]) => `${code}: ${def.en}`);

  return (
    <div className="sw-card sw-fade-in">
      <div className="sw-card-icon">
        <Globe size={24} />
      </div>
      <h2 className="sw-card-title">Outcomes & Mapping</h2>
      <p className="sw-card-desc">
        Map your evaluation criteria to programme outcomes for accreditation
        analytics and coverage tracking.
      </p>

      <div className="sw-template-cards">
        {/* Template 1: Standard */}
        <div className="sw-template-card recommended">
          <div className="sw-template-card-header">
            <div className="sw-template-card-icon">
              <Star size={16} />
            </div>
            <div className="sw-template-card-title">Standard Outcomes</div>
            <div className="sw-template-card-badge">RECOMMENDED</div>
          </div>

          <div className="sw-template-card-desc">
            {firstThreeOutcomes.map((outcome, idx) => (
              <div key={idx} style={{ fontSize: "12px", marginBottom: "6px" }}>
                • {outcome}
              </div>
            ))}
            <div style={{ fontSize: "12px", marginTop: "8px" }}>
              + {outcomeCount - 3} more outcomes
            </div>
          </div>

          <div className="sw-criteria-info">
            {outcomeCount} outcomes · Auto-mapped to your criteria
          </div>

          <button
            className="sw-btn sw-btn-primary"
            onClick={handleApplyStandard}
            disabled={loading}
          >
            Apply Outcomes & Continue <ArrowRight size={16} />
          </button>
        </div>

        {/* Template 2: Custom */}
        <div className="sw-template-card">
          <div className="sw-template-card-header">
            <div className="sw-template-card-icon">
              <Globe size={16} />
            </div>
            <div className="sw-template-card-title">Define Custom Outcomes</div>
          </div>

          <div className="sw-template-card-desc">
            Create your own set of program outcomes and map them to evaluation
            criteria.
          </div>

          <button className="sw-btn sw-btn-ghost" onClick={handleCustom}>
            Go to Outcomes & Mapping →
          </button>
        </div>
      </div>

      <div className="sw-footer">
        <div>
          <button className="sw-btn-link" onClick={onBack}>
            ← Back
          </button>
        </div>
        <button className="sw-btn-link" onClick={() => onContinue(true)}>
          Skip — I don't need outcome mapping
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
  const { activeOrganization, fetchData } = useAdminContext();
  const [rows, setRows] = useState([{ name: "", affiliation: "", email: "" }]);

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
          name: row.name,
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

      <button className="sw-btn sw-btn-ghost" style={{ width: "100%" }}>
        <Upload size={14} /> Import from CSV
      </button>

      <div className="sw-actions">
        <button
          className="sw-btn sw-btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          Save Jurors & Continue <ArrowRight size={16} />
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
          Save Projects & Continue <ArrowRight size={16} />
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
    adminListProjects,
    navigateTo,
  } = useAdminContext();
  const [entryToken, setEntryToken] = useState(null);

  const generateToken = async () => {
    try {
      const token = await generateEntryToken(periodId);
      setEntryToken(token);
      toast.success("Entry token generated");
    } catch (err) {
      toast.error("Failed to generate token: " + err.message);
    }
  };

  const periodInfo = selectedPeriod || {};
  const jurorCount = allJurors?.length || 0;
  const projectCount = adminListProjects?.length || 0;
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
          <>
            <div className="sw-qr-placeholder">QR Code Placeholder</div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
              Token: <code>{entryToken}</code>
            </div>
          </>
        ) : (
          <button className="sw-btn sw-btn-ghost" onClick={generateToken}>
            Generate Entry Token
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
  return (
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
    navigateTo,
    fetchData,
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
    projects: [],
    hasEntryToken: false,
  });

  const [loading, setLoading] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const handleStep2Continue = useCallback(
    async (periodId) => {
      setWizardData({ periodId });
      await fetchData();
      nextStep();
    },
    [setWizardData, nextStep, fetchData]
  );

  const handleStep3Continue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleStep4Continue = useCallback(
    (skipped = false) => {
      if (skipped) {
        setWizardData({ skippedOutcomes: true });
      }
      nextStep();
    },
    [nextStep, setWizardData]
  );

  const handleStep5Continue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleStep6Continue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleCompletion = useCallback(() => {
    setShowCompletion(true);
  }, []);

  const handleSkip = useCallback(() => {
    navigateTo("overview");
  }, [navigateTo]);

  const periodId = wizardData.periodId;

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
        />
      )}

      {currentStep === 3 && (
        <StepCriteria
          periodId={periodId}
          onContinue={handleStep3Continue}
          onSkip={handleSkip}
          onBack={prevStep}
          loading={loading}
        />
      )}

      {currentStep === 4 && (
        <StepOutcomes
          onContinue={handleStep4Continue}
          onSkip={handleSkip}
          onBack={prevStep}
          loading={loading}
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
