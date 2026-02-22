// src/admin/MatrixTab.jsx
// ── Status-based juror × group color matrix ───────────────────

import { PROJECTS } from "../config";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);
const TOTAL_GROUPS = PROJECT_LIST.length;

const cellStyle = (entry) => {
  if (!entry) return { background: "#f8fafc", color: "#94a3b8" };
  if (entry.status === "all_submitted")   return { background: "#dcfce7", color: "#166534", fontWeight: 700 };
  if (entry.status === "group_submitted") return { background: "#dcfce7", color: "#166534", fontWeight: 700 };
  if (entry.status === "in_progress")     return { background: "#fef9c3", color: "#92400e" };
  return { background: "#f8fafc", color: "#94a3b8" };
};

const cellText = (entry) => {
  if (!entry) return "—";
  if (entry.status === "all_submitted")   return entry.total;
  if (entry.status === "group_submitted") return entry.total;
  if (entry.status === "in_progress")     return "…";
  return "—";
};

export default function MatrixTab({ data, jurors, groups, jurorDeptMap }) {
  const lookup = {};
  data.forEach((r) => {
    if (!lookup[r.juryName]) lookup[r.juryName] = {};
    lookup[r.juryName][r.projectId] = { total: r.total, status: r.status };
  });

  if (!jurors.length) return <div className="empty-msg">No data yet.</div>;

  return (
    <div className="matrix-wrap">
      <p className="matrix-subtitle">
        <span className="matrix-legend-item"><span className="matrix-legend-dot submitted-dot"/>Submitted</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot progress-dot"/>In Progress</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"/>Not Started</span>
      </p>
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner">Juror / Group</th>
              {groups.map((g) => {
                const proj = PROJECT_LIST.find((p) => p.id === g.id);
                return (
                  <th key={g.id}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, lineHeight: 1.15 }}>
                      <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{g.label}</span>
                      {proj?.name && (
                        <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{proj.name}</span>
                      )}
                      {proj?.desc && (
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{proj.desc}</span>
                      )}
                    </div>
                  </th>
                );
              })}
              <th>Done</th>
            </tr>
          </thead>
          <tbody>
            {jurors.map((juror) => {
              const dept      = jurorDeptMap.get(juror) || "";
              const submitted = groups.filter((g) =>
                lookup[juror]?.[g.id]?.status === "all_submitted" ||
                lookup[juror]?.[g.id]?.status === "group_submitted"
              ).length;
              return (
                <tr key={juror}>
                  <td className="matrix-juror">
                    {juror}
                    {dept && <span className="matrix-juror-dept"> ({dept})</span>}
                  </td>
                  {groups.map((g) => {
                    const entry = lookup[juror]?.[g.id] ?? null;
                    return (
                      <td key={g.id} style={cellStyle(entry)}>{cellText(entry)}</td>
                    );
                  })}
                  <td className="matrix-progress-cell">
                    <div className="matrix-progress-bar-wrap">
                      <div className="matrix-progress-bar" style={{ width: `${(submitted/TOTAL_GROUPS)*100}%` }} />
                    </div>
                    <span className="matrix-progress-label">{submitted}/{TOTAL_GROUPS}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
