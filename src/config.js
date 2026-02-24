// src/config.js
// ============================================================
// SINGLE SOURCE OF TRUTH — update this file each semester.
//
// Environment variables (define in .env.local):
//   VITE_SCRIPT_URL   — Google Apps Script deployment URL
//   VITE_API_SECRET   — Shared secret checked by GAS on every
//                        public PIN endpoint. Set the same value
//                        as the GAS "API_SECRET" script property.
// ============================================================

export const APP_CONFIG = {
  appTitle:    "Senior Project Jury Portal",
  courseName:  "EE 491 / EE 492 — Senior Project",
  department:  "Electrical & Electronics Engineering",
  university:  "TED University",

  scriptUrl:   import.meta.env.VITE_SCRIPT_URL  || "",
  apiSecret:   import.meta.env.VITE_API_SECRET  || "",

  showStudents: true,
};

// ── Groups / Projects ─────────────────────────────────────────
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
// Order here controls display order in jury form AND admin panel.
// Sheet column order (G–J): Technical / Written / Oral / Teamwork
export const CRITERIA = [
  {
    id: "technical",
    label: "Technical Content",
    shortLabel: "Technical",
    mudek: "1.2 / 2 / 3",
    max: 30,
    rubric: [
      { range: "27–30", level: "Excellent",    desc: "Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident." },
      { range: "21–26", level: "Good",         desc: "Design is mostly clear and technically justified. Engineering decisions are largely supported." },
      { range: "13–20", level: "Developing",   desc: "Problem is stated but motivation or technical justification is insufficient." },
      { range: "0–12",  level: "Insufficient", desc: "Vague problem definition and unjustified decisions. Superficial technical content." },
    ],
  },
  {
    id: "design",
    label: "Written Communication",
    shortLabel: "Written",
    mudek: "9.2",
    max: 30,
    rubric: [
      { range: "27–30", level: "Excellent",    desc: "Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way that is accessible to both technical and non-technical readers." },
      { range: "21–26", level: "Good",         desc: "Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement." },
      { range: "13–20", level: "Developing",   desc: "Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated." },
      { range: "0–12",  level: "Insufficient", desc: "Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing." },
    ],
  },
  {
    id: "delivery",
    label: "Oral Communication",
    shortLabel: "Oral",
    mudek: "9.1",
    max: 30,
    rubric: [
      { range: "27–30", level: "Excellent",    desc: "Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate." },
      { range: "21–26", level: "Good",         desc: "Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident." },
      { range: "13–20", level: "Developing",   desc: "Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement." },
      { range: "0–12",  level: "Insufficient", desc: "Unclear or disorganised presentation. Most questions answered incorrectly or not at all." },
    ],
  },
  {
    id: "teamwork",
    label: "Teamwork",
    shortLabel: "Teamwork",
    mudek: "8.1 / 8.2",
    max: 10,
    rubric: [
      { range: "9–10", level: "Excellent",    desc: "All members participate actively and equally. Professional and ethical conduct observed throughout." },
      { range: "7–8",  level: "Good",         desc: "Most members contribute. Minor knowledge gaps. Professionalism mostly observed." },
      { range: "4–6",  level: "Developing",   desc: "Uneven participation. Some members are passive or unprepared." },
      { range: "0–3",  level: "Insufficient", desc: "Very low participation or dominated by one person. Lack of professionalism observed." },
    ],
  },
];

// ── Derived helpers ───────────────────────────────────────────
export const TOTAL_MAX        = CRITERIA.reduce((s, c) => s + (Number(c.max) || 0), 0);
export const getCriterionById = (id) => CRITERIA.find((c) => c.id === id);
export const getProjectById   = (id) => PROJECTS.find((p) => p.id === id);
