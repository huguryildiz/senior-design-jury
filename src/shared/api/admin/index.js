// src/shared/api/admin/index.js
// Barrel re-export for all admin domain modules.

export {
  getSession,
  listOrganizationsPublic,
  submitApplication,
  getMyApplications,
  cancelApplication,
  approveApplication,
  rejectApplication,
  listPendingApplications,
} from "./auth";

export {
  listPeriods,
  setCurrentPeriod,
  createPeriod,
  updatePeriod,
  deletePeriod,
  setEvalLock,
  updatePeriodCriteriaConfig,
  updatePeriodOutcomeConfig,
} from "./periods";

export {
  listProjects as adminListProjects,
  createProject,
  upsertProject,
  deleteProject,
} from "./projects";

export {
  createJuror,
  updateJuror,
  deleteJuror,
  resetJurorPin,
  setJurorEditMode,
  forceCloseJurorEditMode,
  listLockedJurors,
  unlockJurorPin,
} from "./jurors";

export {
  listOrganizations,
  createOrganization,
  updateOrganization,
  listOrganizationsPublic as listOrganizationsPublicDirect,
  updateMemberAdmin,
  deleteMemberHard,
} from "./organizations";

export {
  getScores,
  listJurorsSummary,
  getProjectSummary,
  getOutcomeTrends,
  getDeleteCounts,
  deleteEntity,
  listPeriodCriteria,
  listPeriodOutcomes,
} from "./scores";

export { generateEntryToken, revokeEntryToken, getEntryTokenStatus } from "./tokens";

export { listAuditLogs } from "./audit";

export { fullExport } from "./export";

export { upsertProfile, getProfile } from "./profiles";

export {
  listFrameworks,
  createFramework,
  deleteFramework,
  listOutcomes,
  createOutcome,
  updateOutcome,
  deleteOutcome,
  listCriterionOutcomeMappings,
  upsertCriterionOutcomeMapping,
  deleteCriterionOutcomeMapping,
} from "./frameworks";

export { sendEntryTokenEmail, sendJurorPinEmail, sendExportReport } from "./notifications";
