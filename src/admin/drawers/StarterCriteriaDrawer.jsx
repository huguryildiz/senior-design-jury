// src/admin/drawers/StarterCriteriaDrawer.jsx

export const STARTER_CRITERIA = [
  {
    key:        "written-communication",
    label:      "Written Communication",
    shortLabel: "Written Comm",
    color:      "#3b82f6",
    max:        30,
    blurb: "Evaluates how effectively the team communicates their project in written and visual form — including layout, information hierarchy, figure quality, and clarity of technical content for a mixed audience.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way accessible to both technical and non-technical readers." },
      { level: "Good",         min: "21", max: "26", description: "Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement." },
      { level: "Developing",   min: "13", max: "20", description: "Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated." },
      { level: "Insufficient", min: "0",  max: "12", description: "Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing." },
    ],
  },
  {
    key:        "oral-communication",
    label:      "Oral Communication",
    shortLabel: "Oral Comm",
    color:      "#8b5cf6",
    max:        30,
    blurb: "Evaluates the team's ability to present their work verbally and respond to questions from jurors with varying technical backgrounds. Audience adaptation — adjusting depth and vocabulary based on who is asking — is a key factor.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate." },
      { level: "Good",         min: "21", max: "26", description: "Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident." },
      { level: "Developing",   min: "13", max: "20", description: "Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement." },
      { level: "Insufficient", min: "0",  max: "12", description: "Unclear or disorganised presentation. Most questions answered incorrectly or not at all." },
    ],
  },
  {
    key:        "technical-content",
    label:      "Technical Content",
    shortLabel: "Technical",
    color:      "#f59e0b",
    max:        30,
    blurb: "Evaluates the depth, correctness, and originality of the engineering work itself — independent of how well it is communicated. Assesses whether the team has applied appropriate knowledge, justified design decisions, and demonstrated real technical mastery.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "27", max: "30", description: "Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident." },
      { level: "Good",         min: "21", max: "26", description: "Design is mostly clear and technically justified. Engineering decisions are largely supported." },
      { level: "Developing",   min: "13", max: "20", description: "Problem is stated but motivation or technical justification is insufficient." },
      { level: "Insufficient", min: "0",  max: "12", description: "Vague problem definition and unjustified decisions. Superficial technical content." },
    ],
  },
  {
    key:        "teamwork",
    label:      "Teamwork",
    shortLabel: "Teamwork",
    color:      "#22c55e",
    max:        10,
    blurb: "Evaluates visible evidence of equal and effective team participation during the evaluation session, as well as the group's professional and ethical conduct in interacting with jurors.",
    outcomes:   [],
    rubric: [
      { level: "Excellent",    min: "9", max: "10", description: "All members participate actively and equally. Professional and ethical conduct observed throughout." },
      { level: "Good",         min: "7", max: "8",  description: "Most members contribute. Minor knowledge gaps. Professionalism mostly observed." },
      { level: "Developing",   min: "4", max: "6",  description: "Uneven participation. Some members are passive or unprepared." },
      { level: "Insufficient", min: "0", max: "3",  description: "Very low participation or dominated by one person. Lack of professionalism observed." },
    ],
  },
];

export default function StarterCriteriaDrawer() {
  return null;
}
