// src/admin/utils/downloadTable.js
// Shared download helpers for XLSX / CSV / PDF with Turkish character support.

import { buildExportFilename } from "./exportXLSX";
import interFontUrl from "@/assets/fonts/Inter-Subset.ttf?url";
import veraLogoUrl from "@/assets/vera_logo_pdf.png?url";

// UTF-8 BOM ensures Excel/Sheets open CSV with correct Turkish chars (ş, ç, ğ, ö, ü, ı, İ, Ş, Ç, Ğ, Ö, Ü)
const BOM = "\uFEFF";

function csvFromAoa(header, rows) {
  return [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Convert ArrayBuffer to base64 without stack overflow (chunked)
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Lazy-load and register Inter font for jsPDF (cached after first call)
let fontPromise = null;
async function registerInterFont(doc) {
  if (!fontPromise) fontPromise = fetch(interFontUrl).then((r) => r.arrayBuffer());
  const fontData = await fontPromise;
  const base64 = arrayBufferToBase64(fontData);
  doc.addFileToVFS("Inter.ttf", base64);
  doc.addFont("Inter.ttf", "Inter", "normal");
  doc.setFont("Inter");
}

// Lazy-load logo as base64 PNG (cached)
let logoPromise = null;
async function loadLogoBase64() {
  if (!logoPromise) {
    logoPromise = fetch(veraLogoUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => "data:image/png;base64," + arrayBufferToBase64(buf));
  }
  return logoPromise;
}

// Build org/period metadata line
function buildMetaLine({ organization, department, periodName }) {
  const parts = [];
  if (organization) parts.push(organization);
  if (department) parts.push(department);
  if (periodName) parts.push(periodName);
  return parts.join(" · ");
}

const MIME_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv;charset=utf-8;",
  pdf: "application/pdf",
};

/**
 * Generate a Blob for tabular data in XLSX, CSV, or PDF format.
 * Same logic as downloadTable but returns { blob, fileName, mimeType } instead of downloading.
 *
 * @param {"xlsx"|"csv"|"pdf"} format
 * @param {object} opts — same as downloadTable
 * @returns {Promise<{ blob: Blob, fileName: string, mimeType: string }>}
 */
export async function generateTableBlob(format, opts) {
  const {
    filenameType = "export",
    sheetName = "Data",
    periodName = "",
    tenantCode = "",
    organization = "",
    department = "",
    pdfTitle = "",
    header = [],
    rows = [],
    colWidths,
    extraSections = [],
  } = opts;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const metaLine = buildMetaLine({ organization, department, periodName });

  if (format === "csv") {
    const parts = [`# ${sheetName}\n${csvFromAoa(header, rows)}`];
    extraSections.forEach((sec) => {
      parts.push(`\n# ${sec.title}\n${csvFromAoa(sec.header, sec.rows)}`);
    });
    const csv = BOM + parts.join("\n");
    const blob = new Blob([csv], { type: MIME_TYPES.csv });
    const fileName = buildExportFilename(filenameType, periodName, "csv", tenantCode);
    return { blob, fileName, mimeType: MIME_TYPES.csv };
  }

  if (format === "pdf") {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    await registerInterFont(doc);

    const pageW = doc.internal.pageSize.getWidth();
    let logoData = null;
    try { logoData = await loadLogoBase64(); } catch { /* continue without logo */ }

    const tableStyles = { font: "Inter", fontSize: 7, cellPadding: 1.5, overflow: "linebreak" };
    const headStyles = { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "normal", fontSize: 7, valign: "middle" };

    function renderPageHeader(sectionTitle) {
      doc.setFont("Inter");
      if (logoData) {
        try { doc.addImage(logoData, "PNG", 14, 10, 28, 9); } catch { /* skip */ }
      }
      doc.setFontSize(16);
      doc.setTextColor(0);
      const displayTitle = (pdfTitle || sheetName).replace(/^VERA\s*[—–-]\s*/, "");
      doc.text(displayTitle, 46, 16);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(metaLine || periodName || "All Periods", 46, 22);
      doc.setFontSize(8);
      doc.text(`Generated ${dateStr}`, pageW - 14, 16, { align: "right" });
      doc.setTextColor(0);
      doc.setDrawColor(200);
      doc.line(14, 26, pageW - 14, 26);
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(sectionTitle, 14, 33);
      doc.setTextColor(0);
      return 37;
    }

    const pdfHeader = (h) => String(h).replace(/\s*(\(\d+\))$/, "\n$1");

    const startY = renderPageHeader(sheetName);
    autoTable(doc, {
      startY,
      head: [header.map(pdfHeader)],
      body: rows.map((row) => row.map((cell) => String(cell ?? ""))),
      styles: tableStyles,
      headStyles,
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
    });

    extraSections.forEach((sec) => {
      doc.addPage();
      const sy = renderPageHeader(sec.title);
      autoTable(doc, {
        startY: sy,
        head: [sec.header.map(pdfHeader)],
        body: sec.rows.map((row) => row.map((cell) => String(cell ?? ""))),
        styles: tableStyles,
        headStyles,
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        tableWidth: "auto",
      });
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("Inter");
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`VERA · ${metaLine || sheetName} · Page ${p}/${totalPages}`, 14, doc.internal.pageSize.getHeight() - 6);
      doc.text(dateStr, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    }

    const arrayBuf = doc.output("arraybuffer");
    const blob = new Blob([arrayBuf], { type: MIME_TYPES.pdf });
    const fileName = buildExportFilename(filenameType, periodName, "pdf", tenantCode);
    return { blob, fileName, mimeType: MIME_TYPES.pdf };
  }

  // Default: XLSX
  const XLSX = await import("xlsx-js-style");
  const aoa = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (colWidths) ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const arrayBuf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([arrayBuf], { type: MIME_TYPES.xlsx });
  const fileName = buildExportFilename(filenameType, periodName, "xlsx", tenantCode);
  return { blob, fileName, mimeType: MIME_TYPES.xlsx };
}

/**
 * Download tabular data as XLSX, CSV, or PDF.
 *
 * @param {"xlsx"|"csv"|"pdf"} format
 * @param {object} opts
 * @param {string}   opts.filenameType   - e.g. "projects", "jurors", "periods"
 * @param {string}   opts.sheetName      - Excel sheet name (default: "Data")
 * @param {string}   opts.periodName     - used in filename and metadata
 * @param {string}   opts.tenantCode     - used in filename
 * @param {string}   opts.organization   - organization name for metadata
 * @param {string}   opts.department     - department/institution name for metadata
 * @param {string}   opts.pdfTitle       - title shown on PDF cover
 * @param {string}   opts.pdfSubtitle    - subtitle line on PDF
 * @param {string[]} opts.header         - column header labels
 * @param {any[][]}  opts.rows           - data rows (arrays of cell values)
 * @param {number[]} [opts.colWidths]    - optional Excel column widths
 */
export async function downloadTable(format, opts) {
  const { blob, fileName } = await generateTableBlob(format, opts);
  downloadBlob(blob, fileName);
}
