// src/config.js
// ============================================================
// SINGLE SOURCE OF TRUTH — update this file each semester.
// No other file needs to change when groups or criteria rotate.
// ============================================================

export const APP_CONFIG = {
  // Displayed in the browser tab and home screen
  appTitle:    "Senior Design Jury Portal",
  courseName:  "EE 491 / EE 492 — Senior Design Projects",
  department:  "Electrical & Electronics Engineering",
  university:  "TED University",

  // Google Apps Script Web App deployment URL
  scriptUrl: "https://script.google.com/macros/s/AKfycbyQK792Cd5-3X7mpqd-LwOuFlvB8MbreTXDqY9KLgTTl7hw9GBCzNtZ3C1aS89R9lARCA/exec",

  // Whether to display student names on jury cards and admin panel
  showStudents: true,
};

// ── Groups / Projects ─────────────────────────────────────────
// Keep `id` values stable across semesters — they are used as
// the primary key in Google Sheets. Safe to update name/desc/students.
export const PROJECTS = [
  {
    id: 1,
    name: "Group 1",
    desc: "Göksiper Hava Savunma Sistemi",
    students: ["Mustafa Yusuf Ünal", "Ayça Naz Dedeoğlu", "Onur Mesci", "Çağan Erdoğan"],
  },
  {
    id: 2,
    name: "Group 2",
    desc: "Radome and Radar-Absorbing Material Electromagnetic Design Software (REMDET)",
    students: ["Niyazi Atilla Özer", "Bertan Ünver", "Ada Tatlı", "Nesibe Aydın"],
  },
  {
    id: 3,
    name: "Group 3",
    desc: "Smart Crosswalk",
    students: ["Sami Eren Germeç"],
  },
  {
    id: 4,
    name: "Group 4",
    desc: "Radar Cross Section (RCS) Analysis — Supporting Multi-Purpose Ray Tracing Algorithm",
    students: ["Ahmet Melih Yavuz", "Yasemin Erciyas"],
  },
  {
    id: 5,
    name: "Group 5",
    desc: "Monitoring Pilots' Health Status and Cognitive Abilities During Flight",
    students: ["Aysel Mine Çaylan", "Selimhan Kaynar", "Abdulkadir Sazlı", "Alp Efe İpek"],
  },
  {
    id: 6,
    name: "Group 6",
    desc: "AKKE — Smart Command and Control Glove",
    students: ["Şevval Kurtulmuş", "Abdullah Esin", "Berk Çakmak", "Ömer Efe Dikici"],
  },
];

// ── Evaluation Criteria ───────────────────────────────────────
// Adding a new criterion requires a matching column in Sheets.
// Changing label / shortLabel / max / rubric is safe at any time.
export const CRITERIA = [
  {
    id: "design",
    label: "Poster Design & Organization",
    shortLabel: "Design",
    max: 20,
    rubric: [
      { range: "18–20", level: "Excellent",    desc: "Intuitive information flow. Visuals are fully labeled and high quality. Layout is understandable even for non-technical readers." },
      { range: "14–17", level: "Good",         desc: "Mostly logical flow. Visuals readable with minor gaps. Balanced, easy-to-follow layout." },
      { range: "9–13",  level: "Developing",   desc: "Occasional gaps in flow. Some missing labels or captions. Acceptable layout, needs improvement." },
      { range: "0–8",   level: "Insufficient", desc: "Confusing flow. Low-quality or unlabeled visuals. Unbalanced or cluttered layout." },
    ],
  },
  {
    id: "technical",
    label: "Technical Content & Clarity",
    shortLabel: "Technical",
    max: 40,
    rubric: [
      { range: "35–40", level: "Excellent",    desc: "Problem, motivation, and design decisions are clear and well-justified. Engineering depth and originality are evident." },
      { range: "28–34", level: "Good",         desc: "Design is mostly clear and justified. Technical decisions largely supported." },
      { range: "18–27", level: "Developing",   desc: "Problem stated but motivation or justification is insufficient." },
      { range: "0–17",  level: "Insufficient", desc: "Vague problem, unjustified decisions. Superficial technical content." },
    ],
  },
  {
    id: "delivery",
    label: "Delivery & Q&A",
    shortLabel: "Delivery",
    max: 30,
    rubric: [
      { range: "27–30", level: "Excellent",    desc: "Presentation consciously adapted for both technical and non-technical jury. Responses accurate and audience-appropriate." },
      { range: "21–26", level: "Good",         desc: "Presentation mostly clear. Most questions answered correctly." },
      { range: "13–20", level: "Developing",   desc: "Understandable but inconsistent. Limited audience adaptation. Weak time management." },
      { range: "0–12",  level: "Insufficient", desc: "Unclear or disorganised presentation. Most questions answered incorrectly or not at all." },
    ],
  },
  {
    id: "teamwork",
    label: "Teamwork & Professionalism",
    shortLabel: "Teamwork",
    max: 10,
    rubric: [
      { range: "9–10", level: "Excellent",    desc: "All members participate actively and equally. Professional and ethical conduct observed." },
      { range: "7–8",  level: "Good",         desc: "Most members contribute. Minor knowledge gaps. Professionalism mostly observed." },
      { range: "4–6",  level: "Developing",   desc: "Uneven participation. Some members are passive." },
      { range: "0–3",  level: "Insufficient", desc: "Very low participation or limited to one person. Lack of professionalism observed." },
    ],
  },
];

// ── Derived helpers ───────────────────────────────────────────
export const TOTAL_MAX        = CRITERIA.reduce((s, c) => s + (Number(c.max) || 0), 0);
export const getCriterionById = (id) => CRITERIA.find((c) => c.id === id);
export const getProjectById   = (id) => PROJECTS.find((p) => p.id === id);
