import { useState } from "react";
import { MessageSquare, Clock } from "lucide-react";
import { jurorInitials, jurorAvatarBg, jurorAvatarFg } from "../utils/jurorIdentity";
import { TeamMembersInline } from "../../shared/ui/EntityMeta";
import { formatTs } from "../utils/adminUtils";
import ScoreStatusPill from "./ScoreStatusPill";
import JurorStatusPill from "./JurorStatusPill";

const CELL_COLORS = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--purple, #a78bfa)",
];

function scoreBandColor(total, totalMax) {
  if (total == null || !Number.isFinite(Number(total))) return "var(--text-tertiary)";
  const pct = (Number(total) / (totalMax || 100)) * 100;
  if (pct >= 85) return "var(--success)";
  if (pct >= 70) return "var(--warning)";
  return "var(--danger)";
}

function RingDonut({ total, totalMax }) {
  const hasValue = total != null;
  const color = scoreBandColor(total, totalMax);
  const deg = hasValue ? Math.min(360, (Number(total) / (totalMax || 100)) * 360) : 0;

  return (
    <div className="rmc-ring-wrap">
      <span
        className="rmc-ring-fill"
        style={{ "--pct": `${deg}deg`, "--ring": color }}
      >
        <span className="rmc-ring-inner">
          <span className="rmc-ring-score" style={{ color }}>
            {hasValue ? total : "—"}
          </span>
          <span className="rmc-ring-denom">/{totalMax}</span>
        </span>
      </span>
    </div>
  );
}

function ScoreCell({ criterion, value, colorIndex, isLastOdd }) {
  const missing = value === null || value === undefined;
  const pct = missing ? 0 : Math.max(0, Math.min(1, value / criterion.max));
  const barColor = CELL_COLORS[colorIndex % CELL_COLORS.length];
  const displayLabel =
    criterion.shortLabel && criterion.shortLabel.length <= 9
      ? criterion.shortLabel
      : criterion.label;

  return (
    <div
      className={[
        "rmc-score-cell",
        missing ? "rmc-score-cell--empty" : "",
        isLastOdd ? "rmc-score-cell--span" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="rmc-cell-label">{displayLabel.toUpperCase()}</div>
      {!missing && (
        <div className="rmc-cell-score-row">
          <span className="rmc-cell-value">{value}</span>
          <span className="rmc-cell-max">/{criterion.max}</span>
        </div>
      )}
      <div className="rmc-cell-bar-track">
        {!missing && (
          <div
            className="rmc-cell-bar-fill"
            style={{ width: `${pct * 100}%`, background: barColor }}
          />
        )}
      </div>
    </div>
  );
}

function MemberChips({ students }) {
  if (!students || (Array.isArray(students) && students.length === 0)) return null;
  return (
    <div className="rmc-team-row">
      <span className="rmc-team-label">TEAM MEMBERS</span>
      <TeamMembersInline names={students} />
    </div>
  );
}

export default function ReviewMobileCard({ row, criteria }) {
  const totalMax = criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);
  const isPartial = row.effectiveStatus === "partial";
  const isOdd = criteria.length % 2 !== 0;
  const [commentOpen, setCommentOpen] = useState(false);
  const submittedTs = formatTs(row.finalSubmittedAt || row.updatedAt);
  const hasSubmittedTs = submittedTs && submittedTs !== "—";

  return (
    <div
      data-card-selectable=""
      className={`rmc-card${isPartial ? " rmc-card--partial" : ""}`}
    >
      <div className="rmc-header">
        <div className="rmc-juror">
          <div
            className="rmc-juror-av"
            style={{
              background: jurorAvatarBg(row.juryName),
              color: jurorAvatarFg(row.juryName),
            }}
          >
            {jurorInitials(row.juryName)}
          </div>
          <div className="rmc-juror-info">
            <div className="rmc-juror-name">{row.juryName}</div>
            {row.affiliation && (
              <div className="rmc-juror-affil">{row.affiliation}</div>
            )}
          </div>
        </div>
        <RingDonut total={row.total} totalMax={totalMax} />
      </div>

      <div className="rmc-project-block">
        <div className="rmc-project-row">
          {row.groupNo != null && (
            <span className="rmc-project-badge">P{row.groupNo}</span>
          )}
          <span className="rmc-project-title">
            {row.title || row.projectName || "—"}
          </span>
        </div>
        <MemberChips students={row.students} />
      </div>

      {criteria.length > 0 && (
        <div className="rmc-score-grid">
          {criteria.map((criterion, idx) => {
            const value = row[criterion.id] ?? row[criterion.key] ?? null;
            const isLastOdd = isOdd && idx === criteria.length - 1;
            return (
              <ScoreCell
                key={criterion.id || criterion.key || idx}
                criterion={criterion}
                value={value !== undefined ? value : null}
                colorIndex={idx}
                isLastOdd={isLastOdd}
              />
            );
          })}
        </div>
      )}

      <div className="rmc-footer">
        <div className="rmc-footer-col">
          <span className="rmc-footer-label">Score Status</span>
          <div className="rmc-footer-left">
            {row.comments && (
              <button
                className={`rmc-comment-btn row-inline-control${commentOpen ? " rmc-comment-btn--active" : ""}`}
                onClick={() => setCommentOpen((v) => !v)}
                aria-label="Toggle comment"
              >
                <MessageSquare size={11} />
              </button>
            )}
            <ScoreStatusPill status={row.effectiveStatus} />
          </div>
        </div>
        <div className="rmc-footer-col rmc-footer-col--right">
          <span className="rmc-footer-label">Juror Progress</span>
          <JurorStatusPill status={row.jurorStatus} />
        </div>
      </div>

      {commentOpen && row.comments && (
        <div className="rmc-comment-panel">
          <MessageSquare size={12} className="rmc-comment-panel-icon" />
          <p className="rmc-comment-panel-text">{row.comments}</p>
        </div>
      )}

      <div className="rmc-submitted">
        <span className="rmc-submitted-label">
          <Clock size={11} strokeWidth={2} />
          Submitted At
        </span>
        <span className="rmc-submitted-value vera-datetime-text">
          {hasSubmittedTs ? (
            <>
              <span>{submittedTs.split(" ")[0]}</span>
              <span className="rmc-submitted-time">{submittedTs.split(" ")[1]}</span>
            </>
          ) : "—"}
        </span>
      </div>
    </div>
  );
}
