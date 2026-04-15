// src/shared/api/admin/index.js
// Barrel re-export for all admin domain modules.

export {
  getSession,
  getMyJoinRequests,
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
  duplicatePeriod,
  setEvalLock,
  requestPeriodUnlock,
  resolveUnlockRequest,
  listUnlockRequests,
  updatePeriodCriteriaConfig,
  updatePeriodOutcomeConfig,
  savePeriodCriteria,
  reorderPeriodCriteria,
  setPeriodCriteriaName,
  getPeriodCounts,
  listPeriodStats,
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
  searchOrganizationsForJoin,
  requestToJoinOrg,
  approveJoinRequest,
  rejectJoinRequest,
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

export { listAuditLogs, writeAuditLog, writeAuthFailureEvent, verifyAuditChain } from "./audit";

export { fullExport, logExportInitiated } from "./export";

export { upsertProfile, getProfile } from "./profiles";

export {
  listFrameworks,
  createFramework,
  updateFramework,
  deleteFramework,
  cloneFramework,
  assignFrameworkToPeriod,
  listOutcomes,
  createOutcome,
  updateOutcome,
  deleteOutcome,
  listFrameworkCriteria,
  listPeriodCriteriaForMapping,
} from "./frameworks";

export {
  listPeriodCriterionOutcomeMaps,
  createPeriodOutcome,
  updatePeriodOutcome,
  deletePeriodOutcome,
  upsertPeriodCriterionOutcomeMap,
  deletePeriodCriterionOutcomeMap,
} from "./outcomes";

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

export { applyStandardFramework } from "./wizardHelpers";
