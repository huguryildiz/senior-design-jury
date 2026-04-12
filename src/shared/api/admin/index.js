// src/shared/api/admin/index.js
// Barrel re-export for all admin domain modules.

export {
  getSession,
  checkEmailAvailable,
  listOrganizationsPublic,
  submitApplication,
  getMyApplications,
  cancelApplication,
  approveApplication,
  rejectApplication,
  listPendingApplications,
  notifyApplication,
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
  savePeriodCriteria,
  getPeriodCounts,
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
  countTodayLockEvents,
  unlockJurorPin,
} from "./jurors";

export {
  listOrganizations,
  createOrganization,
  updateOrganization,
  updateMemberAdmin,
  deleteMemberHard,
  inviteOrgAdmin,
  cancelOrgAdminInvite,
} from "./organizations";

export {
  getScores,
  getPeriodMaxScore,
  listJurorsSummary,
  getProjectSummary,
  getOutcomeTrends,
  getOutcomeAttainmentTrends,
  getDeleteCounts,
  deleteEntity,
  listPeriodCriteria,
  listPeriodOutcomes,
} from "./scores";

export {
  generateEntryToken,
  revokeEntryToken,
  getEntryTokenStatus,
  getEntryTokenHistory,
  getActiveEntryToken,
  getActiveEntryTokenPlain,
} from "./tokens";

export { listAuditLogs, writeAuditLog, writeAuthFailureEvent } from "./audit";

export { fullExport, logExportInitiated } from "./export";

export { upsertProfile, getProfile } from "./profiles";

export {
  listFrameworks,
  createFramework,
  updateFramework,
  deleteFramework,
  listOutcomes,
  createOutcome,
  updateOutcome,
  deleteOutcome,
  listFrameworkCriteria,
  listCriterionOutcomeMappings,
  upsertCriterionOutcomeMapping,
  deleteCriterionOutcomeMapping,
} from "./frameworks";

export { sendEntryTokenEmail, sendJurorPinEmail, sendExportReport } from "./notifications";

export { getMaintenanceStatus, getMaintenanceConfig, setMaintenance, cancelMaintenance } from "./maintenance";

export { getSecurityPolicy, setSecurityPolicy, getPublicAuthFlags } from "./security";

export { getPlatformSettings, setPlatformSettings } from "./platform";

export { touchAdminSession, listAdminSessions, deleteAdminSession } from "./sessions";

export {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupSignedUrl,
  recordBackupDownload,
  getBackupSchedule,
  updateBackupSchedule,
} from "./backups";
