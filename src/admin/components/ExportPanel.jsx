// src/admin/components/ExportPanel.jsx
// Shared export panel with XLSX / CSV / PDF format selection + Send.

import { useState } from "react";
import SendReportModal from "@/admin/modals/SendReportModal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

import { Icon } from "lucide-react";

const FORMATS = [
  { id: "xlsx", iconLabel: "XLS", label: "Excel (.xlsx)", desc: "Formatted tables with styling", hint: "Best for sharing" },
  { id: "csv",  iconLabel: "CSV", label: "CSV (.csv)",    desc: "Raw data for external analysis", hint: "Best for analysis" },
  { id: "pdf",  iconLabel: "PDF", label: "PDF Report",    desc: "Formatted report for print / archive", hint: "Best for archival" },
];

function DownloadIcon({ size = 14 }) {
  return (
    <Icon
      iconNode={[]}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
  );
}

function SendIcon({ size = 14 }) {
  return (
    <Icon
      iconNode={[]}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="m22 2-11 11" />
    </Icon>
  );
}

export default function ExportPanel({
  title = "Export",
  subtitle = "Download data in your preferred format.",
  meta = "",
  onClose,
  onExport,
  onSend,
  generateFile,
  reportTitle,
  periodName,
  organization,
  loading = false,
  style,
}) {
  const [format, setFormat] = useState("xlsx");
  const [sendOpen, setSendOpen] = useState(false);
  const active = FORMATS.find((f) => f.id === format) || FORMATS[0];

  const handleSend = () => {
    if (onSend) {
      onSend(format);
    } else {
      setSendOpen(true);
    }
  };

  return (
    <>
      <div className="export-panel show" style={style}>
        <div className="export-panel-header">
          <div>
            <h4><DownloadIcon /> {title}</h4>
            <div className="export-panel-sub">{subtitle}</div>
          </div>
          <button className="export-panel-close" type="button" onClick={onClose}>&#215;</button>
        </div>
        <div className="export-options">
          {FORMATS.map((fmt) => (
            <div
              key={fmt.id}
              className={`export-option${format === fmt.id ? " selected" : ""}`}
              onClick={() => setFormat(fmt.id)}
            >
              {format === fmt.id && <span className="export-option-selected-pill">Selected</span>}
              <div className={`export-option-icon export-option-icon--${fmt.id}`}>
                <span className="file-icon"><span className="file-icon-label">{fmt.iconLabel}</span></span>
              </div>
              <div className="export-option-title">{fmt.label}</div>
              <div className="export-option-desc">{fmt.desc}</div>
              <div className="export-option-hint">{fmt.hint}</div>
            </div>
          ))}
        </div>
        <div className="export-footer">
          <div className="export-footer-info">
            <div className="export-footer-format">{active.label} · {title.replace("Export ", "")}</div>
            <div className="export-footer-meta">{meta}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              disabled={loading}
              onClick={handleSend}
              title="Send report via email"
              style={{ borderRadius: 999, padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <SendIcon /> Send
            </button>
            <button
              className="btn btn-primary btn-sm export-download-btn"
              type="button"
              disabled={loading}
              onClick={() => onExport(format)}
            >
              <span className="btn-loading-content">
                <AsyncButtonContent loading={loading} loadingText="Exporting…">
                  <>
                    <DownloadIcon />
                    {`Download ${active.id === "xlsx" ? "Excel" : active.id === "pdf" ? "PDF" : "CSV"}`}
                  </>
                </AsyncButtonContent>
              </span>
            </button>
          </div>
        </div>
      </div>

      <SendReportModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        format={format}
        formatLabel={`${active.label} · ${title.replace("Export ", "")}`}
        meta={meta}
        reportTitle={reportTitle || title.replace("Export ", "")}
        periodName={periodName}
        organization={organization}
        generateFile={generateFile}
      />
    </>
  );
}
