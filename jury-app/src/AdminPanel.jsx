import { useState, useEffect } from "react";

const PROJECTS = ["Group 1", "Group 2", "Group 3", "Group 4", "Group 5", "Group 6"];
const CRITERIA = [
  { id: "design",    label: "Design",    max: 20 },
  { id: "technical", label: "Technical", max: 40 },
  { id: "delivery",  label: "Delivery",  max: 30 },
  { id: "teamwork",  label: "Teamwork",  max: 10 },
];

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1FjIw9TD8sqZl-WWDS0PZ5WgL6DXNVzqlpBsswJDfDb4/gviz/tq?tqx=out:csv&sheet=Evaluations";

export default function AdminPanel({ onBack }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(SHEET_CSV_URL);
      const text = await res.text();
      const rows = text.trim().split("\n").slice(1);
      const parsed = rows.map((row) => {
        const cols = row.split(",");
        return {
          juryName:    cols[0],
          juryDept:    cols[1],
          timestamp:   cols[2],
          projectId:   parseInt(cols[3]),
          projectName: cols[4],
          design:      parseFloat(cols[5]) || 0,
          technical:   parseFloat(cols[6]) || 0,
          delivery:    parseFloat(cols[7]) || 0,
          teamwork:    parseFloat(cols[8]) || 0,
          total:       parseFloat(cols[9]) || 0,
          comments:    cols[10] || "",
        };
      });
      setData(parsed);
    } catch (e) {
      setError("Could not load data. Please check the Google Sheets connection.");
    }
    setLoading(false);
  };

  const projectStats = PROJECTS.map((name, idx) => {
    const rows = data.filter((d) => d.projectId === idx + 1);
    if (rows.length === 0) return { name, count: 0, avg: {}, totalAvg: 0 };
    const avg = {};
    CRITERIA.forEach((c) => { avg[c.id] = rows.reduce((s, r) => s + r[c.id], 0) / rows.length; });
    const totalAvg = rows.reduce((s, r) => s + r.total, 0) / rows.length;
    return { name, count: rows.length, avg, totalAvg };
  });

  const jurors = [...new Set(data.map((d) => d.juryName))];
  const ranked = [...projectStats].sort((a, b) => b.totalAvg - a.totalAvg);

  return (
    <div className="admin-screen">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div>
          <h2>Results Panel</h2>
          <p>{jurors.length} juror{jurors.length !== 1 ? "s" : ""} · {data.length} evaluation{data.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
      </div>

      <div className="tab-bar">
        {["summary", "detail", "jurors"].map((t) => (
          <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t === "summary" ? "📊 Summary" : t === "detail" ? "📋 Details" : "👤 Jurors"}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading data...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && activeTab === "summary" && (
        <div className="admin-body">
          {data.length === 0 && <div className="empty-msg">No evaluation data yet.</div>}
          <div className="rank-list">
            {ranked.map((p, i) => (
              <div key={p.name} className="rank-card">
                <div className="rank-num">{i + 1}</div>
                <div className="rank-info">
                  <div className="rank-name">{p.name} <span style={{fontSize:12,color:'#64748b',fontWeight:400}}>({p.count} evaluation{p.count !== 1 ? "s" : ""})</span></div>
                  <div className="rank-bars">
                    {CRITERIA.map((c) => (
                      <div key={c.id} className="mini-bar-row">
                        <span className="mini-label">{c.label}</span>
                        <div className="mini-bar-track">
                          <div className="mini-bar-fill" style={{ width: `${((p.avg[c.id] || 0) / c.max) * 100}%` }} />
                        </div>
                        <span className="mini-val">{(p.avg[c.id] || 0).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rank-total">
                  <span>{p.totalAvg.toFixed(1)}</span>
                  <small>avg.</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "detail" && (
        <div className="admin-body">
          <div className="detail-table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Juror</th>
                  <th>Group</th>
                  <th>Design /20</th>
                  <th>Technical /40</th>
                  <th>Delivery /30</th>
                  <th>Teamwork /10</th>
                  <th>Total</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'32px',color:'#64748b'}}>No data yet.</td></tr>
                )}
                {data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.juryName}</td>
                    <td><strong>{row.projectName}</strong></td>
                    <td>{row.design}</td>
                    <td>{row.technical}</td>
                    <td>{row.delivery}</td>
                    <td>{row.teamwork}</td>
                    <td><strong>{row.total}</strong></td>
                    <td className="comment-cell">{row.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "jurors" && (
        <div className="admin-body">
          {jurors.length === 0 && <div className="empty-msg">No juror submissions yet.</div>}
          {jurors.map((jury) => {
            const juryData = data.filter((d) => d.juryName === jury);
            return (
              <div key={jury} className="juror-card">
                <div className="juror-name">👤 {jury}</div>
                <div className="juror-dept">{juryData[0]?.juryDept}</div>
                <div className="juror-projects">
                  {juryData.map((d) => (
                    <div key={d.projectId} className="juror-row">
                      <span>{d.projectName}</span>
                      <span className="juror-score">{d.total} / 100</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
