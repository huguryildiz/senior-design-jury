import { useMemo } from "react";
import { ClipboardCheck, ExternalLink, X, Icon } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import { formatTs } from "@/admin/utils/adminUtils";

function statusMeta(row) {
  if (row?.reviewState === "scored") {
    return { label: "Scored", className: "pill-scored", kind: "scored" };
  }
  if (row?.reviewState === "partial") {
    return { label: "Partial", className: "pill-partial", kind: "partial" };
  }
  return { label: "Not Started", className: "pill-not-started", kind: "empty" };
}

function ScorePillIcon({ kind }) {
  if (kind === "scored") {
    return (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="m20 6-11 11-5-5" />
      </Icon>
    );
  }
  if (kind === "partial") {
    return (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </Icon>
    );
  }
  return (
    <Icon
      iconNode={[]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
    </Icon>
  );
}

export default function JurorReviewsModal({
  open,
  onClose,
  onOpenFullReviews,
  juror,
  scoreRows = [],
  projects = [],
}) {
  const jurorId = juror?.juror_id || juror?.jurorId;
  const jurorName = juror?.juryName || juror?.juror_name || "the juror";

  const rows = useMemo(() => {
    if (!jurorId) return [];

    const byProject = new Map();
    for (const r of scoreRows || []) {
      if (String(r?.jurorId || "") !== String(jurorId)) continue;
      const pid = String(r?.projectId || "");
      if (!pid) continue;
      const prev = byProject.get(pid);
      const prevTs = new Date(prev?.updatedAt || prev?.createdAt || 0).getTime();
      const curTs = new Date(r?.updatedAt || r?.createdAt || 0).getTime();
      if (!prev || curTs >= prevTs) byProject.set(pid, r);
    }

    const allProjects = (projects || []).map((p) => {
      const pid = String(p?.id || p?.project_id || "");
      const review = byProject.get(pid);
      let reviewState = "not_started";
      if (review?.status === "submitted") reviewState = "scored";
      else if (typeof review?.total === "number" && review.total > 0) reviewState = "partial";

      return {
        id: review?.id || `project-${pid}`,
        projectId: pid,
        projectName: review?.projectName || p?.title || "Untitled Project",
        groupNo: review?.groupNo ?? p?.project_no ?? null,
        total: typeof review?.total === "number" ? review.total : null,
        updatedAt: review?.updatedAt || null,
        createdAt: review?.createdAt || null,
        reviewState,
      };
    });

    return allProjects.sort((a, b) => {
      const ag = Number(a?.groupNo);
      const bg = Number(b?.groupNo);
      if (Number.isFinite(ag) && Number.isFinite(bg) && ag !== bg) return ag - bg;
      if (Number.isFinite(ag) && !Number.isFinite(bg)) return -1;
      if (!Number.isFinite(ag) && Number.isFinite(bg)) return 1;
      return String(a?.projectName || "").localeCompare(String(b?.projectName || ""), "tr");
    });
  }, [scoreRows, jurorId, projects]);

  return (
    <Modal open={open} onClose={onClose} size="juror-reviews">
      <div className="fs-modal-header jrm-header">
        <div className="fs-modal-header-row">
          <div className="fs-title-group">
            <div className="fs-title jrm-title">
              <span className="jrm-title-icon" aria-hidden="true">
                <ClipboardCheck size={14} />
              </span>
              Juror Reviews
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
      </div>

      <div className="fs-modal-body jrm-body">
        <div className="jrm-subtitle">
          Recent review activity for <strong>{jurorName}</strong>.
        </div>

        <div className="jrm-table-wrap">
          <table className="jrm-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Project Title</th>
                <th className="text-right">Score</th>
                <th>Status</th>
                <th className="text-right">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="jrm-empty">
                    No reviews found for this juror in the selected period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const meta = statusMeta(row);
                  return (
                    <tr key={row.id}>
                      <td className="jrm-group">
                        {row.groupNo != null ? <span className="project-no-badge">P{row.groupNo}</span> : "—"}
                      </td>
                      <td className="jrm-project">{row.projectName || "Untitled Project"}</td>
                      <td className="jrm-score text-right">
                        {typeof row.total === "number" ? row.total : "—"}
                      </td>
                      <td>
                        <span className={`pill ${meta.className} jrm-status-pill`}>
                          <ScorePillIcon kind={meta.kind} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="jrm-submitted text-right vera-datetime-text">{formatTs(row.updatedAt || row.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fs-modal-footer jrm-footer">
        <button type="button" className="fs-btn fs-btn-secondary" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-primary"
          onClick={onOpenFullReviews}
          disabled={!onOpenFullReviews}
        >
          <ExternalLink size={13} />
          Open Full Reviews
        </button>
      </div>
    </Modal>
  );
}
