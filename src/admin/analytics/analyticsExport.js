// src/admin/analytics/analyticsExport.js
// Analytics export utilities (XLSX, CSV, PDF).
// Extracted from AnalyticsTab.jsx — structural refactor only.

import * as XLSX from "xlsx-js-style";
import interFontUrl from "@/assets/fonts/Inter-Subset.ttf?url";
import veraLogoUrl from "@/assets/vera_logo_pdf.png?url";
import {
  buildOutcomeByGroupDataset,
  buildProgrammeAveragesDataset,
  buildTrendDataset,
  buildCompetencyProfilesDataset,
  buildJurorConsistencyDataset,
  buildCriterionBoxplotDataset,
  buildRubricAchievementDataset,
  buildMudekMappingDataset,
} from "./analyticsDatasets";

export function addTableSheet(wb, name, title, headers, rows, extraSections = [], note = "", merges = [], alignments = []) {
  const aoa = [
    [title],
    ...(note ? [[note]] : []),
    [],
    headers,
    ...rows,
  ];
  extraSections.forEach((section) => {
    if (!section) return;
    aoa.push([], [section.title], ...(section.note ? [[section.note]] : []), section.headers, ...section.rows);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (merges.length) {
    const headerRowIndex = 1 + (note ? 1 : 0) + 1;
    const dataStartRow = headerRowIndex + 1;
    const sheetMerges = merges.map((m) => ({
      s: { r: dataStartRow + m.start, c: m.col },
      e: { r: dataStartRow + m.end, c: m.col },
    }));
    ws["!merges"] = [...(ws["!merges"] || []), ...sheetMerges];
    if (alignments.length) {
      alignments.forEach((a) => {
        for (let r = a.start; r <= a.end; r += 1) {
          const cellRef = XLSX.utils.encode_cell({ r: dataStartRow + r, c: a.col });
          const cell = ws[cellRef];
          if (!cell) continue;
          cell.s = cell.s || {};
          cell.s.alignment = {
            ...(cell.s.alignment || {}),
            vertical: a.valign || "center",
            horizontal: a.halign || "left",
          };
        }
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function buildDatasets({ dashboardStats, submittedData, trendData, semesterOptions, trendSemesterIds, activeOutcomes, mudekLookup }) {
  return [
    buildOutcomeByGroupDataset(dashboardStats, activeOutcomes),
    buildProgrammeAveragesDataset(submittedData, activeOutcomes),
    buildTrendDataset(trendData, semesterOptions, trendSemesterIds, activeOutcomes),
    buildCompetencyProfilesDataset(dashboardStats, activeOutcomes),
    buildJurorConsistencyDataset(dashboardStats, submittedData, activeOutcomes),
    buildCriterionBoxplotDataset(submittedData, activeOutcomes),
    buildRubricAchievementDataset(submittedData, activeOutcomes),
    buildMudekMappingDataset(activeOutcomes, mudekLookup),
  ];
}

export function buildAnalyticsWorkbook(params) {
  const wb = XLSX.utils.book_new();
  const datasets = buildDatasets(params);
  datasets.forEach((ds) => {
    addTableSheet(wb, ds.sheet, ds.title, ds.headers, ds.rows, ds.extra, ds.note, ds.merges, ds.alignments);
  });
  return wb;
}

// Convert ArrayBuffer to base64 (chunked to avoid stack overflow)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

let fontPromise = null;
async function registerInterFont(doc) {
  if (!fontPromise) fontPromise = fetch(interFontUrl).then((r) => r.arrayBuffer());
  const fontData = await fontPromise;
  const base64 = arrayBufferToBase64(fontData);
  doc.addFileToVFS("Inter.ttf", base64);
  doc.addFont("Inter.ttf", "Inter", "normal");
  doc.setFont("Inter");
}

let logoPromise = null;
async function loadLogoBase64() {
  if (!logoPromise) {
    logoPromise = fetch(veraLogoUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => "data:image/png;base64," + arrayBufferToBase64(buf));
  }
  return logoPromise;
}

export async function buildAnalyticsPDF(params, { periodName = "", organization = "", department = "" } = {}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { captureChartImage } = await import("./captureChartImage");

  const {
    dashboardStats, submittedData, trendData, semesterOptions,
    trendSemesterIds, activeOutcomes, mudekLookup,
  } = params;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registerInterFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;

  // Logo
  try {
    const logoData = await loadLogoBase64();
    doc.addImage(logoData, "PNG", 14, 10, 28, 9);
  } catch { /* logo load failed — continue without */ }

  // Cover / title
  const metaParts = [organization, department, periodName].filter(Boolean);
  doc.setFontSize(18);
  doc.text("Programme Outcome Analytics", 46, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(metaParts.join(" · ") || "All Periods", 46, 22);
  doc.setFontSize(8);
  doc.text(`Generated ${dateStr}`, pageW - 14, 14, { align: "right" });
  doc.setTextColor(0);

  // Divider
  doc.setDrawColor(200);
  doc.line(14, 26, pageW - 14, 26);

  const tableFont = { font: "Inter", fontSize: 7, cellPadding: 1.5, overflow: "linebreak" };
  const headFont = { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "normal", fontSize: 7, valign: "middle" };
  const pdfHeader = (h) => String(h).replace(/\s*(\(\d+\))$/, "\n$1");
  const margin = 14;
  const imgW = pageW - margin * 2;

  // Build all datasets upfront
  const progAvg    = buildProgrammeAveragesDataset(submittedData, activeOutcomes);
  const outByGroup = buildOutcomeByGroupDataset(dashboardStats, activeOutcomes);
  const jurorCV    = buildJurorConsistencyDataset(dashboardStats, submittedData, activeOutcomes);
  const rubric     = buildRubricAchievementDataset(submittedData, activeOutcomes);
  const mudek      = buildMudekMappingDataset(activeOutcomes, mudekLookup);
  const trend      = buildTrendDataset(trendData, semesterOptions, trendSemesterIds, activeOutcomes);

  const sections = [
    { title: "Outcome Attainment Rate",        chartId: "pdf-chart-attainment-rate",    ds: progAvg    },
    { title: "Threshold Gap Analysis",          chartId: "pdf-chart-threshold-gap",      ds: progAvg    },
    { title: "Outcome Achievement by Group",    chartId: "pdf-chart-outcome-by-group",   ds: outByGroup },
    { title: "Programme-Level Averages",        chartId: "pdf-chart-programme-averages", ds: progAvg    },
    { title: "Group Attainment Heatmap",        chartId: "pdf-chart-group-heatmap",      ds: outByGroup },
    { title: "Juror Reliability (CV)",          chartId: "pdf-chart-juror-cv",           ds: jurorCV    },
    { title: "Rubric Achievement Distribution", chartId: "pdf-chart-rubric",             ds: rubric     },
    { title: "Outcome Coverage Matrix",         chartId: "pdf-chart-coverage",           ds: mudek      },
    ...(trend.rows.length >= 2
      ? [{ title: "Attainment Trend", chartId: "pdf-chart-trend", ds: trend }]
      : []),
  ];

  // All chart sections start on page 2 (cover is page 1)
  doc.addPage();
  let startY = 14;

  for (let i = 0; i < sections.length; i++) {
    const { title, chartId, ds } = sections[i];

    if (!ds.rows.length) continue;

    // Page break check before section title
    if (startY > pageH - 60) {
      doc.addPage();
      startY = 14;
    }

    // Section title
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(title, margin, startY);
    startY += 6;

    if (ds.note) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(ds.note, margin, startY, { maxWidth: imgW });
      doc.setTextColor(0);
      startY += 6;
    }

    // Chart image (gracefully skip on capture failure)
    try {
      const captured = await captureChartImage(chartId);
      if (captured) {
        const { dataURL, width, height } = captured;
        const chartImgH = Math.min(imgW / (width / height), pageH * 0.65);
        if (startY + chartImgH > pageH - 20) {
          doc.addPage();
          startY = 14;
        }
        doc.addImage(dataURL, "PNG", margin, startY, imgW, chartImgH);
        startY += chartImgH + 6;
      }
    } catch (err) {
      console.error(`[PDF] Chart capture failed for ${chartId}:`, err);
    }

    // Data table
    if (ds.headers && ds.rows.length) {
      if (startY > pageH - 30) {
        doc.addPage();
        startY = 14;
      }
      autoTable(doc, {
        startY,
        head: [ds.headers.map(pdfHeader)],
        body: ds.rows.map((row) => row.map((cell) => String(cell ?? ""))),
        styles: tableFont,
        headStyles: headFont,
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
        tableWidth: "auto",
      });
      startY = doc.lastAutoTable.finalY + 8;
    }

    // Page break after each section except the last
    if (i < sections.length - 1) {
      doc.addPage();
      startY = 14;
    }
  }

  // Footer on every page
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`VERA Analytics Report · ${periodName || "All Periods"} · Page ${p}/${totalPages}`, margin, pageH - 6);
    doc.text(dateStr, pageW - margin, pageH - 6, { align: "right" });
  }

  return doc;
}
