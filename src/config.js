// src/config.js
// Single source of truth for course text + rubric criteria.

export const APP_CONFIG = {
  // Branding / text
  appTitle: "Senior Project Jury Portal",
  courseName: "EE 491 / EE 492 – Senior Project I & II",
  department: "Department of Electrical & Electronics Engineering",
  university: "TED University",


  // Google Apps Script Web App endpoint (POST)
  // Used by JuryForm to submit rows to Google Sheets.
  scriptUrl: "https://script.google.com/macros/s/AKfycbyQK792Cd5-3X7mpqd-LwOuFlvB8MbreTXDqY9KLgTTl7hw9GBCzNtZ3C1aS89R9lARCA/exec",

  // Google Sheet CSV export endpoint (GET)
  // Used by AdminPanel to read evaluations (gviz CSV).
  sheetCsvUrl:
    "https://docs.google.com/spreadsheets/d/AKfycbyQK792Cd5-3X7mpqd-LwOuFlvB8MbreTXDqY9KLgTTl7hw9GBCzNtZ3C1aS89R9lARCA/gviz/tq?tqx=out:csv&sheet=Evaluations",

};

// Fallback groups (works offline / if Groups sheet fetch fails)
// In production, you can ignore this and fetch groups from Google Sheets.
export const PROJECTS = [
  { id: 1, name: "Group 1" },
  { id: 2, name: "Group 2" },
  { id: 3, name: "Group 3" },
  { id: 4, name: "Group 4" },
  { id: 5, name: "Group 5" },
  { id: 6, name: "Group 6" },
];

// Rubric criteria (stable across terms)
// IMPORTANT RULES if you ever change this:
// - Keep `id` stable ("design", "technical", ...) to avoid breaking any mapping logic.
// - Changing label/description is safe.
// - Adding a NEW criterion is safe ONLY if JuryForm + AdminPanel render criteria dynamically (they do, if coded right).
// - If you change max points, your total scale changes (not necessarily bad, but be aware).
export const CRITERIA = [
  {
    id: "design",
    label: "Poster Design & Organization",
    shortLabel: "Design",
    max: 20,
    rubric: [
      {
        range: "18–20",
        level: "Excellent",
        desc: "Information flow is intuitive and logical. Visuals are fully labeled and high quality. Layout is understandable even for non-technical readers.",
      },
      {
        range: "14–17",
        level: "Good",
        desc: "Information flow is mostly logical. Visuals are readable with minor gaps. Layout is balanced and easy to follow.",
      },
      {
        range: "9–13",
        level: "Developing",
        desc: "Occasional gaps in flow. Some missing labels or captions. Layout is acceptable but needs improvement.",
      },
      {
        range: "0–8",
        level: "Insufficient",
        desc: "Information flow is confusing. Visuals are low quality or unlabeled. Layout is unbalanced or cluttered.",
      },
    ],
  },
  {
    id: "technical",
    label: "Technical Content & Clarity",
    shortLabel: "Technical",
    max: 40,
    rubric: [
      {
        range: "35–40",
        level: "Excellent",
        desc: "Problem, motivation, and design decisions are clear and well-justified. Engineering depth and originality are evident. Content is accessible to non-specialist readers.",
      },
      {
        range: "28–34",
        level: "Good",
        desc: "Design is mostly clear and justified. Technical decisions are largely supported. Partial adaptation for different audiences.",
      },
      {
        range: "18–27",
        level: "Developing",
        desc: "Problem is stated but motivation/justification is insufficient. Audience diversity not considered.",
      },
      {
        range: "0–17",
        level: "Insufficient",
        desc: "Problem is vague, decisions unjustified. Technical content is superficial. No adaptation for different audiences.",
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery & Q&A",
    shortLabel: "Delivery",
    max: 30,
    rubric: [
      {
        range: "27–30",
        level: "Excellent",
        desc: "Presentation consciously adapted for both technical and non-technical jury. Responses are accurate and audience-appropriate. Key ideas communicated within limited time.",
      },
      {
        range: "21–26",
        level: "Good",
        desc: "Presentation is mostly clear. Partial audience adaptation. Most questions answered correctly. Time management acceptable.",
      },
      {
        range: "13–20",
        level: "Developing",
        desc: "Understandable but inconsistent. Limited audience adaptation. Some questions unanswered. Weak time management.",
      },
      {
        range: "0–12",
        level: "Insufficient",
        desc: "Presentation is unclear or disorganized. No audience adaptation. Most questions answered incorrectly or not at all.",
      },
    ],
  },
  {
    id: "teamwork",
    label: "Teamwork & Professionalism",
    shortLabel: "Teamwork",
    max: 10,
    rubric: [
      {
        range: "9–10",
        level: "Excellent",
        desc: "All members participate actively and equally. Team represents all project components. Professional and ethical conduct observed.",
      },
      {
        range: "7–8",
        level: "Good",
        desc: "Most members contribute actively. Minor knowledge gaps. Professionalism mostly observed.",
      },
      {
        range: "4–6",
        level: "Developing",
        desc: "Participation is uneven. Some members are passive. Knowledge gaps in certain areas.",
      },
      {
        range: "0–3",
        level: "Insufficient",
        desc: "Participation is very low or limited to one person. Lack of professionalism or ethical concerns observed.",
      },
    ],
  },
];

// Small helpers (optional, but handy)
export const TOTAL_MAX = CRITERIA.reduce((s, c) => s + (Number(c.max) || 0), 0);
export const getCriterionById = (id) => CRITERIA.find((c) => c.id === id);
export const clampScore = (val, max) => {
  if (val === "" || val === null || typeof val === "undefined") return "";
  const n = Number.parseInt(val, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), max);
};