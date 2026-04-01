// src/admin/components/details/ScoreDetailsHeader.jsx
// ============================================================
// Presentational component: section header with export button.
// Extracted from ScoreDetails.jsx.
// ============================================================

import { DownloadIcon } from "../../../shared/Icons";

export default function ScoreDetailsHeader({
  filteredCount,
  onExport,
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="text-sm font-semibold text-foreground">Details</div>
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-success/40 bg-success/[0.07] px-3.5 py-1.5 text-sm font-semibold text-success cursor-pointer whitespace-nowrap shadow-[0_8px_16px_rgba(21,128,61,0.15)] transition-shadow hover:shadow-[0_12px_20px_rgba(21,128,61,0.2)]"
        onClick={onExport}
      >
        <DownloadIcon />
        Export XLSX ({filteredCount} rows)
      </button>
    </div>
  );
}
