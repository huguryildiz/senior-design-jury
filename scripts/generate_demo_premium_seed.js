import fs from 'fs';
import crypto from 'crypto';

// deterministic utility
let _seed = 0.20260402;
function random() {
  const x = Math.sin(_seed++) * 10000;
  return x - Math.floor(x);
}

function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(random() * arr.length)];
}

function uuid(seedStr) {
  const hash = crypto.createHash('md5').update(seedStr).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest('hex');
}

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}


const BASE_TIME = `timestamp '2026-05-10 12:00:00'`;

let out = [];

out.push(`-- VERA v1 DB Migration — Premium Demo Seed`);
out.push(`-- Generated for targeted cleanup (Phase 4B refinements)`);
out.push(`-- Canonical DB Schema`);
out.push(`SELECT setseed(0.20260402);`);
out.push(`BEGIN;\n`);

out.push(`-- Pre-seed Cleanup`);
out.push(`TRUNCATE TABLE 
  audit_logs,
  entry_tokens,
  score_sheet_items,
  score_sheets,
  projects,
  period_criterion_outcome_maps,
  period_criteria,
  period_outcomes,
  periods,
  framework_criterion_outcome_maps,
  framework_criteria,
  framework_outcomes,
  frameworks,
  memberships,
  org_applications,
  organizations,
  profiles
CASCADE;
`);

// ORGS
const orgs = [
  { p: 1, name: 'Electrical-Electronics Engineering', institution: 'TED University', code: 'TEDU-EE', type: 'University department' },
  { p: 2, name: 'Computer Science', institution: 'Carnegie Mellon University', code: 'CMU-CS', type: 'University department' },
  { p: 3, name: 'Technology Competitions', institution: 'TEKNOFEST', code: 'TEKNOFEST', type: 'Technology competition' },
  { p: 4, name: '2204-A Research Projects', institution: 'TUBITAK', code: 'TUBITAK-2204A', type: 'Research competition' },
  { p: 5, name: 'AP-S Student Design Contest', institution: 'IEEE', code: 'IEEE-APSSDC', type: 'Design contest' },
  { p: 6, name: '2025 Season', institution: 'CanSat Competition', code: 'CANSAT-2025', type: 'Competition' }
];

out.push(`-- Organizations`);
orgs.forEach(o => {
  o.id = uuid('org-' + o.code);
  out.push(`INSERT INTO organizations (id, subtitle, name, code, status, settings, updated_at) VALUES ('${o.id}', '${escapeSql(o.institution)}', '${escapeSql(o.name)}', '${o.code}', 'active', '{}', ${BASE_TIME}) ON CONFLICT DO NOTHING;`);
});
out.push('');

// PROFILES
const demoAdminId = '6ea7146f-1331-4828-8b8a-e777c9a35d6a';
out.push(`-- Identities`);
out.push(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '${demoAdminId}', 'authenticated', 'authenticated', 'admin@vera.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;`);
out.push(`INSERT INTO profiles (id, display_name) VALUES ('${demoAdminId}', 'Demo Admin') ON CONFLICT DO NOTHING;`);
out.push(`INSERT INTO memberships (user_id, organization_id, role) VALUES ('${demoAdminId}', NULL, 'super_admin') ON CONFLICT DO NOTHING;`);

let orgAdminIds = [];
const adminNamesTr = ['Koray Yılmazer', 'Leyla Şensoy', 'Cemil Bozkurt', 'Bahar Tandoğan'];
const adminNamesEn = ['Marcus Reynolds', 'Chloe Beckett', 'Gavin Pierce', 'Harper Quinn'];

orgs.forEach(o => {
  let adminCount = (o.code === 'TEDU-EE' || o.code === 'CMU-CS' || o.code === 'TEKNOFEST') ? 2 : 1;
  for(let i=1; i<=adminCount; i++) {
    let pId = uuid('prof-admin-' + o.code + '-' + i);
    let nm = (o.code.includes('TEDU') || o.code.includes('TUBITAK') || o.code.includes('TEKNOFEST')) ? pick(adminNamesTr) : pick(adminNamesEn);
    nm = `${nm} (${o.code})`;
    let fakeEmail = `admin${i}@${o.code.toLowerCase()}.demo.app`;
    out.push(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '${pId}', 'authenticated', 'authenticated', '${fakeEmail}', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;`);
    out.push(`INSERT INTO profiles (id, display_name) VALUES ('${pId}', '${escapeSql(nm)}') ON CONFLICT DO NOTHING;`);
    out.push(`INSERT INTO memberships (user_id, organization_id, role) VALUES ('${pId}', '${o.id}', 'org_admin') ON CONFLICT DO NOTHING;`);
    orgAdminIds.push(pId);
  }
});
out.push('');

// APP/MEMBERSHIPS 
const applicantNames = ['Prof. Halil Çankaya', 'Dr. Rachel Voss', 'Oğuzhan Demirel', 'Dr. Ayça Gürkan', 'Prof. Arthur Finch', 'Celine Moreau'];
const appStatuses = ['approved', 'approved', 'rejected', 'cancelled', 'pending', 'pending'];
const orgAppIds = [];

orgs.forEach((o, i) => {
  let appUuid = uuid('app-' + o.code);
  let applicant = applicantNames[i];
  out.push(`INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('${appUuid}', '${o.id}', '${escapeSql(applicant)}', '${o.code.toLowerCase()}@example.edu', '${appStatuses[i]}') ON CONFLICT DO NOTHING;`);
  orgAppIds.push({id: appUuid, org: o.code});
});
out.push('');

// FRAMEWORKS
const fws = [];
const fwOutcomes = [];
const fwCriteria = [];
const fwMaps = [];

function parseRubric(maxScore) {
  let rubric = [];
  if (maxScore >= 25) {
    let b1 = Math.floor(maxScore * 0.88);
    let b2 = Math.floor(maxScore * 0.68);
    let b3 = Math.floor(maxScore * 0.48);
    rubric.push({min: b1, max: maxScore, label: 'Excellent', description: 'Outstanding performance'});
    rubric.push({min: b2, max: b1-1, label: 'Good', description: 'Above average, minor gaps'});
    rubric.push({min: b3, max: b2-1, label: 'Developing', description: 'Meets minimum, needs improvement'});
    rubric.push({min: 0, max: b3-1, label: 'Insufficient', description: 'Below acceptable standard'});
  } else if (maxScore >= 20) {
    rubric = [
      {min: 18, max: 20, label: 'Excellent', description: 'Outstanding performance'},
      {min: 14, max: 17, label: 'Good', description: 'Above average, minor gaps'},
      {min: 10, max: 13, label: 'Developing', description: 'Meets minimum'},
      {min: 0, max: 9, label: 'Insufficient', description: 'Below standard'}
    ];
  } else {
    rubric = [
      {min: 9, max: 10, label: 'Excellent', description: 'Outstanding'},
      {min: 7, max: 8, label: 'Good', description: 'Above average'},
      {min: 5, max: 6, label: 'Developing', description: 'Meets minimum'},
      {min: 0, max: 4, label: 'Insufficient', description: 'Below standard'}
    ];
  }
  return JSON.stringify(rubric).replace(/'/g, "''");
}

function processOrgfw(orgCode, fwName, fwVersion, criteria, outcomes, mappings) {
  const o = orgs.find(x => x.code === orgCode);
  const fwId = uuid('fw-' + orgCode);
  fws.push(`INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('${fwId}', '${o.id}', '${escapeSql(fwName)}', '${fwVersion}', true) ON CONFLICT DO NOTHING;`);
  
  const oMap = {};
  let outOrder = 1;
  o.outcomesData = [];
  for (const arr of outcomes) {
    const [code, lbl] = arr;
    const oId = uuid(`fw-out-${orgCode}-${code}`);
    oMap[code] = oId;
    o.outcomesData.push({ id: oId, code, label: lbl, sortOrder: outOrder });
    fwOutcomes.push(`INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('${oId}', '${fwId}', '${escapeSql(code)}', '${escapeSql(lbl)}', ${outOrder++}) ON CONFLICT DO NOTHING;`);
  }

  const cMap = {};
  let critOrder = 1;
  o.criteriaData = [];
  for (const c of criteria) {
    const cId = uuid(`fw-crit-${orgCode}-${c.key}`);
    const rubricJson = c.customRubric ? JSON.stringify(c.customRubric).replace(/'/g, "''") : parseRubric(c.max);
    cMap[c.key] = cId;
    o.criteriaData.push({ id: cId, ...c, sortOrder: critOrder });
    fwCriteria.push(`INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('${cId}', '${fwId}', '${c.key}', '${escapeSql(c.label)}', '${escapeSql(c.short)}', ${c.max}, ${c.weight}, '${c.color}', '${rubricJson}', ${critOrder++}) ON CONFLICT DO NOTHING;`);
  }

  o.mapsData = [];
  for (const m of mappings) {
    const cId = cMap[m.crit];
    for (const mo of m.outs) {
      const oId = oMap[mo.code];
      const mId = uuid(`fw-map-${orgCode}-${m.crit}-${mo.code}`);
      o.mapsData.push({ id: mId, cId, oId, weight: mo.weight });
      fwMaps.push(`INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('${mId}', '${fwId}', '${cId}', '${oId}', ${mo.weight}) ON CONFLICT DO NOTHING;`);
    }
  }
}

// Setup matching frameworks...
processOrgfw('TEDU-EE', 'MUDEK 2024', '1.0', 
  [
    {
      key:'technical', label:'Technical Content', short:'Technical', max:30, weight:30, color:'#F59E0B',
      customRubric: [
        { min: 27, max: 30, label: 'Excellent', description: 'Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident.' },
        { min: 21, max: 26, label: 'Good', description: 'Design is mostly clear and technically justified. Engineering decisions are largely supported.' },
        { min: 13, max: 20, label: 'Developing', description: 'Problem is stated but motivation or technical justification is insufficient.' },
        { min: 0, max: 12, label: 'Insufficient', description: 'Vague problem definition and unjustified decisions. Superficial technical content.' },
      ]
    },
    {
      key:'design', label:'Written Communication', short:'Written', max:30, weight:30, color:'#22C55E',
      customRubric: [
        { min: 27, max: 30, label: 'Excellent', description: 'Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way that is accessible to both technical and non-technical readers.' },
        { min: 21, max: 26, label: 'Good', description: 'Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement.' },
        { min: 13, max: 20, label: 'Developing', description: 'Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated.' },
        { min: 0, max: 12, label: 'Insufficient', description: 'Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing.' },
      ]
    },
    {
      key:'delivery', label:'Oral Communication', short:'Oral', max:30, weight:30, color:'#3B82F6',
      customRubric: [
        { min: 27, max: 30, label: 'Excellent', description: 'Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate.' },
        { min: 21, max: 26, label: 'Good', description: 'Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident.' },
        { min: 13, max: 20, label: 'Developing', description: 'Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement.' },
        { min: 0, max: 12, label: 'Insufficient', description: 'Unclear or disorganised presentation. Most questions answered incorrectly or not at all.' },
      ]
    },
    {
      key:'teamwork', label:'Teamwork', short:'Teamwork', max:10, weight:10, color:'#EF4444',
      customRubric: [
        { min: 9, max: 10, label: 'Excellent', description: 'All members participate actively and equally. Professional and ethical conduct observed throughout.' },
        { min: 7, max: 8, label: 'Good', description: 'Most members contribute. Minor knowledge gaps. Professionalism mostly observed.' },
        { min: 4, max: 6, label: 'Developing', description: 'Uneven participation. Some members are passive or unprepared.' },
        { min: 0, max: 3, label: 'Insufficient', description: 'Very low participation or dominated by one person. Lack of professionalism observed.' },
      ]
    }
  ],
  [
    ['1.2', 'Adequate knowledge in mathematics, science and engineering'], ['2', 'Ability to formulate and solve complex engineering problems'],
    ['3.1', 'Ability to design a complex system under realistic constraints'], ['3.2', 'Ability to apply modern design methods'],
    ['8.1', 'Ability to function effectively in teams'], ['8.2', 'Ability to work in multi-disciplinary teams'],
    ['9.1', 'Oral communication effectiveness'], ['9.2', 'Written communication effectiveness']
  ],
  [
    {crit:'technical', outs:[{code:'1.2',weight:0.25}, {code:'2',weight:0.25}, {code:'3.1',weight:0.25}, {code:'3.2',weight:0.25}]},
    {crit:'design', outs:[{code:'9.2',weight:1.0}]},
    {crit:'delivery', outs:[{code:'9.1',weight:1.0}]},
    {crit:'teamwork', outs:[{code:'8.1',weight:0.5}, {code:'8.2',weight:0.5}]}
  ]
);

processOrgfw('CMU-CS', 'ABET 2024', '1.0',
  [
    {key:'problem_solving', label:'Problem Solving & Analysis', short:'Problem', max:25, weight:25, color:'#EF4444'},
    {key:'system_design', label:'System Design & Architecture', short:'Design', max:25, weight:25, color:'#3B82F6'},
    {key:'implementation_quality', label:'Implementation Quality', short:'Impl', max:20, weight:20, color:'#F59E0B'},
    {key:'communication', label:'Communication & Documentation', short:'Comm', max:20, weight:20, color:'#EC4899'},
    {key:'teamwork', label:'Teamwork & Collaboration', short:'Team', max:10, weight:10, color:'#10B981'}
  ],
  [
    ['SO-1', 'Complex Problem Solving'], ['SO-2', 'Engineering Design'], ['SO-3', 'Effective Communication'],
    ['SO-4', 'Ethics and Professional Responsibility'], ['SO-5', 'Teamwork'], ['SO-6', 'Experimentation and Analysis'],
    ['SO-7', 'Lifelong Learning']
  ],
  [
    {crit:'problem_solving', outs:[{code:'SO-1',weight:0.6}, {code:'SO-6',weight:0.4}]},
    {crit:'system_design', outs:[{code:'SO-2',weight:0.7}, {code:'SO-1',weight:0.3}]},
    {crit:'implementation_quality', outs:[{code:'SO-6',weight:0.5}, {code:'SO-2',weight:0.3}, {code:'SO-7',weight:0.2}]},
    {crit:'communication', outs:[{code:'SO-3',weight:0.7}, {code:'SO-4',weight:0.3}]},
    {crit:'teamwork', outs:[{code:'SO-5',weight:1.0}]}
  ]
);

processOrgfw('TEKNOFEST', 'Competition Framework 2026', '2026',
  [
    {key:'preliminary_report', label:'Preliminary Design Report (ODR)', short:'Report', max:25, weight:25, color:'#6366F1'},
    {key:'critical_design', label:'Critical Design Review (KTR)', short:'CDR', max:30, weight:30, color:'#F59E0B'},
    {key:'technical_performance', label:'Technical Performance & Demo', short:'Performance', max:30, weight:30, color:'#EF4444'},
    {key:'team_execution', label:'Team Execution & Presentation', short:'Team', max:15, weight:15, color:'#10B981'}
  ],
  [
    ['TC-1', 'Preliminary Evaluation Report Quality'], ['TC-2', 'Critical Design Maturity'],
    ['TC-3', 'Field Performance and Jury Presentation'], ['TC-4', 'General Team Competency']
  ],
  [
    {crit:'preliminary_report', outs:[{code:'TC-1',weight:1.0}]},
    {crit:'critical_design', outs:[{code:'TC-2',weight:0.7}, {code:'TC-1',weight:0.3}]},
    {crit:'technical_performance', outs:[{code:'TC-3',weight:0.8}, {code:'TC-2',weight:0.2}]},
    {crit:'team_execution', outs:[{code:'TC-4',weight:0.6}, {code:'TC-3',weight:0.4}]}
  ]
);

processOrgfw('TUBITAK-2204A', 'Research Competition Framework', '2204A',
  [
    {key:'originality', label:'Originality & Creativity', short:'Originality', max:35, weight:35, color:'#8B5CF6'},
    {key:'scientific_method', label:'Scientific Method & Rigor', short:'Method', max:40, weight:40, color:'#3B82F6'},
    {key:'impact_and_presentation', label:'Impact & Presentation', short:'Impact', max:25, weight:25, color:'#F59E0B'}
  ],
  [
    ['RC-1', 'Originality and Creativity'], ['RC-2', 'Scientific Method'], ['RC-3', 'Results and Recommendations'],
    ['RC-4', 'Applicability and Feasibility'], ['RC-5', 'Broader Impact']
  ],
  [
    {crit:'originality', outs:[{code:'RC-1',weight:0.7}, {code:'RC-4',weight:0.3}]},
    {crit:'scientific_method', outs:[{code:'RC-2',weight:0.5}, {code:'RC-3',weight:0.5}]},
    {crit:'impact_and_presentation', outs:[{code:'RC-5',weight:0.5}, {code:'RC-3',weight:0.3}, {code:'RC-4',weight:0.2}]}
  ]
);

processOrgfw('IEEE-APSSDC', 'Design Contest Framework', '1.0',
  [
    {key:'creativity', label:'Creativity & Innovation', short:'Creativity', max:30, weight:30, color:'#EC4899'},
    {key:'technical_merit', label:'Technical Merit', short:'Technical', max:40, weight:40, color:'#3B82F6'},
    {key:'application_and_presentation', label:'Application & Presentation', short:'Presentation', max:30, weight:30, color:'#F59E0B'}
  ],
  [
    ['DC-1', 'Creativity'], ['DC-2', 'Technical Merit'], ['DC-3', 'Practical Application'], ['DC-4', 'Educational Value']
  ],
  [
    {crit:'creativity', outs:[{code:'DC-1',weight:0.7}, {code:'DC-4',weight:0.3}]},
    {crit:'technical_merit', outs:[{code:'DC-2',weight:0.8}, {code:'DC-3',weight:0.2}]},
    {crit:'application_and_presentation', outs:[{code:'DC-3',weight:0.5}, {code:'DC-4',weight:0.3}, {code:'DC-1',weight:0.2}]}
  ]
);

processOrgfw('CANSAT-2025', 'Mission Framework', '2025',
  [
    {key:'design_compliance', label:'Design Constraints Compliance', short:'Compliance', max:20, weight:20, color:'#6366F1'},
    {key:'mission_execution', label:'Mission Execution & Telemetry', short:'Mission', max:35, weight:35, color:'#EF4444'},
    {key:'data_and_documentation', label:'Data Analysis & Documentation', short:'Data', max:25, weight:25, color:'#3B82F6'},
    {key:'safety_and_recovery', label:'Safety & Recovery', short:'Safety', max:20, weight:20, color:'#10B981'}
  ],
  [
    ['CS-1', 'Design Constraints Compliance'], ['CS-2', 'Primary Mission Execution'], ['CS-3', 'Descent Control and Recovery'],
    ['CS-4', 'Safety and Restrictions Compliance'], ['CS-5', 'Secondary Mission Originality'], ['CS-6', 'Data Analysis and Documentation Quality']
  ],
  [
    {crit:'design_compliance', outs:[{code:'CS-1',weight:0.7}, {code:'CS-4',weight:0.3}]},
    {crit:'mission_execution', outs:[{code:'CS-2',weight:0.5}, {code:'CS-5',weight:0.3}, {code:'CS-3',weight:0.2}]},
    {crit:'data_and_documentation', outs:[{code:'CS-6',weight:0.7}, {code:'CS-2',weight:0.3}]},
    {crit:'safety_and_recovery', outs:[{code:'CS-4',weight:0.5}, {code:'CS-3',weight:0.5}]}
  ]
);

out.push(`-- Frameworks`);
out.push(fws.join('\n')); out.push('');
out.push(`-- Framework Outcomes`);
out.push(fwOutcomes.join('\n')); out.push('');
out.push(`-- Framework Criteria`);
out.push(fwCriteria.join('\n')); out.push('');
out.push(`-- Framework Mappings`);
out.push(fwMaps.join('\n')); out.push('');

// PERIODS
out.push(`-- Periods and Snapshots`);
const periodData = [];

const orgPeriodsDef = {
  'TEDU-EE': [{name:'Spring 2026',s:'Spring',start:'2026-02-01',end:'2026-06-15'},{name:'Fall 2025',s:'Fall',start:'2025-09-01',end:'2025-12-20'},{name:'Spring 2025',s:'Spring',start:'2025-02-01',end:'2025-06-15'},{name:'Fall 2024',s:'Fall',start:'2024-09-01',end:'2024-01-15'}],
  'CMU-CS': [{name:'Spring 2026',s:'Spring',start:'2026-02-01',end:'2026-06-15'},{name:'Fall 2025',s:'Fall',start:'2025-09-01',end:'2025-12-20'},{name:'Spring 2025',s:'Spring',start:'2025-02-01',end:'2025-06-15'},{name:'Fall 2024',s:'Fall',start:'2024-09-01',end:'2024-01-15'}],
  'TEKNOFEST': [{name:'2026 Season',s:'NULL',start:'2026-06-01',end:'2026-08-15'},{name:'2025 Season',s:'NULL',start:'2025-06-01',end:'2025-08-15'},{name:'2024 Season',s:'NULL',start:'2024-06-01',end:'2024-08-15'}],
  'TUBITAK-2204A': [{name:'2026 Competition',s:'NULL',start:'2026-06-01',end:'2026-08-15'},{name:'2025 Competition',s:'NULL',start:'2025-06-01',end:'2025-08-15'},{name:'2024 Competition',s:'NULL',start:'2024-06-01',end:'2024-08-15'}],
  'IEEE-APSSDC': [{name:'2026 Contest',s:'NULL',start:'2026-06-01',end:'2026-08-15'},{name:'2025 Contest',s:'NULL',start:'2025-06-01',end:'2025-08-15'},{name:'2024 Contest',s:'NULL',start:'2024-06-01',end:'2024-08-15'}],
  'CANSAT-2025': [{name:'2026 Season',s:'Spring',start:'2026-06-01',end:'2026-08-15'},{name:'2025 Season',s:'Spring',start:'2025-06-01',end:'2025-08-15'},{name:'2024 Season',s:'Spring',start:'2024-06-01',end:'2024-08-15'}]
};

orgs.forEach(o => {
  const fwId = uuid('fw-' + o.code);
  const defs = orgPeriodsDef[o.code] || [];
  defs.forEach((d, idx) => {
    const isCurrent = idx === 0;
    const isLocked = !isCurrent;
    const pId = uuid(`period-${o.code}-${idx}`);
    const poster = `DATE '${d.end}' - integer '14'`;
    const frozen = isCurrent ? `('${d.start}'::timestamp + interval '1 day')` : `('${d.start}'::timestamp)`;
    const tstamp = `timestamp '${d.start}' + interval '2 days'`;
    
    let sn = d.s === 'NULL' ? 'NULL' : `'${d.s}'`;
    
    out.push(`INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('${pId}', '${o.id}', '${fwId}', '${escapeSql(d.name)}', ${sn}, ${isCurrent}, ${isLocked}, true, ${poster}, ${frozen}, ${tstamp}) ON CONFLICT DO NOTHING;`);
    
    const pcMap = {};
    o.criteriaData.forEach(c => {
      const pcId = uuid(`pcrit-${pId}-${c.key}`);
      pcMap[c.id] = pcId;
      const rubricJson = c.customRubric ? JSON.stringify(c.customRubric).replace(/'/g, "''") : parseRubric(c.max);
      
      // Add minor differences into historical period criteria to demonstrate snapshot isolation
      let cLabel = c.label;
      if (idx === 1) cLabel = cLabel.replace('Communication', 'Comm.').replace('Presentation', 'Pres.');
      if (idx === 2) cLabel = cLabel + ' (Legacy)';

      out.push(`INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('${pcId}', '${pId}', '${c.id}', '${c.key}', '${escapeSql(cLabel)}', '${escapeSql(c.short)}', ${c.max}, ${c.weight}, '${c.color}', '${rubricJson}', ${c.sortOrder}) ON CONFLICT DO NOTHING;`);
    });

    const poMap = {};
    o.outcomesData.forEach(oc => {
      const poId = uuid(`pout-${pId}-${oc.code}`);
      poMap[oc.id] = poId;
      out.push(`INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('${poId}', '${pId}', '${oc.id}', '${oc.code}', '${escapeSql(oc.label)}', ${oc.sortOrder}) ON CONFLICT DO NOTHING;`);
    });

    o.mapsData.forEach(m => {
      const pmId = uuid(`pmap-${pId}-${m.cId}-${m.oId}`);
      const pcId = pcMap[m.cId];
      const poId = poMap[m.oId];
      out.push(`INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('${pmId}', '${pId}', '${pcId}', '${poId}', ${m.weight}) ON CONFLICT DO NOTHING;`);
    });
    
    periodData.push({ id: pId, org: o.code, isCur: isCurrent, histIdx: idx, start:d.start, name: d.name });
  });
});
out.push('');

// PROJECTS
out.push(`-- Projects`);
const teduProjects = [
  {t: 'FPGA-Based Real-Time Signal Processing for 5G NR', a:'Prof. Turgut Ercan', a_aff: 'TEDU EE', arch: 'star'},
  {t: 'Low-Power IoT Sensor Network for Smart Agriculture', a:'Dr. Ece Aydoğan', a_aff: 'TEDU EE', arch: 'solid'},
  {t: 'Autonomous Drone Navigation with LiDAR SLAM', a:'Prof. Cengiz Yalın', a_aff: 'TEDU EE', arch: 'highvar'},
  {t: 'GaN Power Amplifier Design for Sub-6 GHz 5G', a:'Dr. Aylin Seçkin', a_aff: 'TEDU EE', arch: 'tech_strong_comm_weak'},
  {t: 'Edge AI Accelerator on RISC-V for Anomaly Detection', a:'Prof. Tarık Özmen', a_aff: 'TEDU EE', arch: 'wellrounded'},
  {t: 'Reconfigurable Intelligent Surface for Indoor mmWave', a:'Dr. Derya Civan', a_aff: 'TEDU EE', arch: 'borderline'},
  {t: 'Solar MPPT Controller with Machine Learning Optimization', a:'Prof. Hakan Tekin', a_aff: 'TEDU EE', arch: 'weak_tech_strong_team'},
  {t: 'Bioimpedance Spectroscopy System for Tissue Analysis', a:'Dr. Zeliha Taşçı', a_aff: 'TEDU EE', arch: 'strong_late'},
  {t: 'Visible Light Communication Transceiver Prototype', a:'Prof. Turgut Ercan', a_aff: 'TEDU EE', arch: 'partial'},
  {t: 'Multi-Robot Coordination via Distributed Consensus', a:'Dr. Ece Aydoğan', a_aff: 'TEDU EE', arch: 'average'}
];

const histProjTitles = [
  'Embedded System Design for Wearables', 'Computer Vision for Robotics', 'Machine Learning on Microcontrollers', 
  'Wireless Sensor Networks Optimization', 'Biomedical Signal Processing Suite', 'Data Center Cooling Automation'
];

const cmuProjects = ['GPU-Accelerated LLM Inference Engine', 'Blockchain-based Identity Verification', 'Distributed File System with Paxos', 'Autonomous Traffic Control via Deep RL', 'Real-Time Gesture Recognition Pipeline', 'Zero-Knowledge Proofs for Smart Contracts'];
const teknofestProjects = ['Otonom Sürü İHA (UAV) Takip Sistemi', 'Yüksek İrtifa Hibrit Roket Motoru', 'Otonom Sualtı Aracı (AUV) Görüntüleme', 'VTOL Sabit Kanatlı Kargo Dronu', 'Radar Dalga Sönümleyici Gövde Boyası'];
const tubitakProjects = ['Yapay Zeka Destekli Erken Yangın Tespiti', 'Ağır Metallerin Tarımsal Atıklarla Filtrelenmesi', 'Giyilebilir Duruş Bozukluğu Uyarı Sensörü', 'Mikroalgler ile Karbon Yakalama Sistemi', 'Görme Engelliler için Akıllı Yönlendirme Bastonu'];
const ieeeProjects = ['Phased Array Antenna for mmWave 5G', 'Wearable RFID Tag Antenna for Healthcare', 'Dual-Band Microstrip Patch Antenna', 'Metamaterial-based Radar Cross Section Reduction'];
const cansatProjects = ['Autogyro Payload Recovery System', 'Telemetry and Ground Station Integration', 'Atmospheric Sensor Suite Deployment', 'Deployable Heat Shield for Reentry Demo'];

const namesTr = [
  'Tolga Erim', 'Melis Kavak', 'Ozan Çelebi', 'Ezgi Doruk', 'Caner Turgut', 'Aslı Tezcan', 'Berk Gündüz', 'Ceyda Vural', 'Korhan Alkan', 'Sinem Uslu',
  'Arda Keçeci', 'Zeynep Gül', 'Baran Tekin', 'Kübra Şen', 'Mert Çakır', 'İrem Demirci', 'Hakan Kurt', 'Elif Yılmaz', 'Sinan Koç', 'Ece Yıldırım',
  'Yiğit Polat', 'Damla Kılıç', 'Kaan Avcı', 'Büşra Doğan', 'Alperen Turan', 'Rüya Işık', 'Emre Baş', 'Gizem Aksoy', 'Serkan Taşkın', 'Deniz Ünal',
  'Onur Çelik', 'Selin Akay', 'Burak Aslan', 'Beren Yücel', 'Kerem Arıcan', 'Esra Kaya', 'Umut Şahin', 'Ceren Erdoğan', 'Eren Güler', 'Tuğçe Can'
];
const namesEn = [
  'Elias Boyd', 'Clara Dawson', 'Miles Cunningham', 'Sophie Clarke', 'Nolan Davies', 'Maya Jenkins', 'Julian Hayes', 'Eva Harding', 'Leo Gallagher', 'Tessa Rowan',
  'Adam Bennett', 'Hazel Foster', 'Cole Harrison', 'Lucy Brooks', 'Dylan Reed', 'Aurora Price', 'Ethan Ward', 'Stella Myers', 'Connor Ross', 'Zoe Powell',
  'Lucas Sullivan', 'Grace Kelly', 'Mason Bell', 'Ruby Murphy', 'Logan Bailey', 'Lily Cooper', 'Caleb Richardson', 'Mia Howard', 'Nathan Cox', 'Chloe Ward',
  'Isaac Perez', 'Emma Peterson', 'Owen Gray', 'Avery James', 'Wyatt Watson', 'Ella Brooks', 'Jack Kelly', 'Aria Sanders', 'Ryan Price', 'Scarlett Wood'
];

function genMembers(count, lang) {
  let list = lang === 'tr' ? [...namesTr] : [...namesEn];
  list.sort(() => random() - 0.5);
  return JSON.stringify(list.slice(0, count).map((n, i) => ({name: n, order: i+1}))).replace(/'/g, "''");
}

let projList = [];
periodData.forEach(pd => {
  let count = 0;
  let lang = 'tr';
  if (pd.org === 'TEDU-EE') { count = pd.isCur ? 10 : (pd.histIdx===1 ? 5 : (pd.histIdx===2 ? 4 : 3)); }
  else if (pd.org === 'CMU-CS') { count = pd.isCur ? 6 : (pd.histIdx===1 ? 4 : (pd.histIdx===2 ? 3 : 2)); lang='en'; }
  else if (pd.org === 'TEKNOFEST') { count = pd.isCur ? 5 : (pd.histIdx===1 ? 4 : (pd.histIdx===2 ? 3 : 2)); }
  else { count = pd.isCur ? 4 : (pd.histIdx===1 ? 3 : (pd.histIdx===2 ? 2 : 2)); lang = (pd.org.includes('CANSAT') || pd.org.includes('IEEE')) ? 'en' : 'tr'; }

  for(let i=0; i<count; i++) {
    const pjId = uuid(`proj-${pd.id}-${i}`);
    let title = '';
    let arch = pick(['star', 'solid', 'average', 'weak_tech_strong_team', 'borderline']);
    
    let aName = `Prof. ${pick(lang === 'tr' ? namesTr : namesEn)}`;
    let aAff = pd.org;

    if (pd.org === 'TEDU-EE' && pd.isCur) {
      title = teduProjects[i].t;
      arch = teduProjects[i].arch;
      aName = teduProjects[i].a;
      aAff = teduProjects[i].a_aff;
    } else if (pd.org === 'TEDU-EE') {
      title = pick(histProjTitles) + ` (Group ${i+1})`;
    } else if (pd.org === 'CMU-CS') {
      title = cmuProjects[i % cmuProjects.length];
    } else if (pd.org === 'TEKNOFEST') {
      title = teknofestProjects[i % teknofestProjects.length] + ` (Takım ${i+1})`;
    } else if (pd.org === 'TUBITAK-2204A') {
      title = tubitakProjects[i % tubitakProjects.length];
    } else if (pd.org === 'IEEE-APSSDC') {
      title = ieeeProjects[i % ieeeProjects.length] + ` (Team ${String.fromCharCode(65+i)})`;
    } else if (pd.org === 'CANSAT-2025') {
      title = cansatProjects[i % cansatProjects.length] + ` - Entry ${i+1}`;
    } else {
      title = pick(histProjTitles) + ` (Team ${i+1})`;
    }

    let mCount = randInt(3, 4);
    let mem = genMembers(mCount, lang);
    let no = i+1;
    out.push(`INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('${pjId}', '${pd.id}', '${title}', ${no}, '${mem}', '${escapeSql(aName)}', '${escapeSql(aAff)}') ON CONFLICT DO NOTHING;`);
    projList.push({id: pjId, pId: pd.id, org: pd.org, isCur: pd.isCur, arch, title});
  }
});
out.push('');

// JURORS
out.push(`-- Jurors and Auth`);
const teduJurors = [
  {n: 'Prof. Cihan Akpınar', aff: 'Sabanci University, EE'}, {n: 'Dr. Aslıhan Koçak', aff: 'Ohio State University, ECE'},
  {n: 'Prof. Ferit Atasoy', aff: 'METU, EE'}, {n: 'Dr. Pınar Dalkılıç', aff: 'Istanbul Technical University, CS'},
  {n: 'Engin Boztepe', aff: 'Aselsan, RF Systems Division'}, {n: 'Dr. Serap Gündoğdu', aff: 'TUBITAK BILGEM'},
  {n: 'Prof. Orhan Sezgin', aff: 'Bilkent University, EE'}, {n: 'Yasin Erimbaş', aff: 'Turk Telekom, R&D Center'},
  {n: 'Dr. Nihan Ersoy', aff: 'Istanbul Technical University, EE'}, {n: 'Dr. Alper Kılıç', aff: 'Hacettepe University, EE'}
];
const cmuJurors = ['Dr. Thomas Albright', 'Prof. Simon Caldwell', 'Nina Prescott', 'Wesley Dalton', 'Dr. Sofia Lang', 'Victor Sutton', 'Fiona Mercer'];
const palette = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#A855F7'];

const genericJurorsTr = ['Alp Cengiz', 'Barış Öztürk', 'İrem Şahin', 'Gizem Çetin', 'Kaan Taş', 'Ceren Arslan'];
const genericJurorsEn = ['Isaac Newton', 'Marie Curie', 'Ada Lovelace', 'Alan Turing']; // Just internal placeholders, let's use:
// Better generic ones:
const genJurorsTr = ['Kemal Aksoy', 'Eda Kılıç', 'Onur Yalın', 'Buse Kar', 'Cemil Demir', 'Aylin Çelik'];
const genJurorsEn = ['Oliver Grant', 'Eleanor Cole', 'Sebastian Reed', 'Stella Brooks'];

let jurorIdList = [];
orgs.forEach(o => {
  let count = 0; let items = [];
  if(o.code === 'TEDU-EE') { count = 10; items = teduJurors; }
  else if(o.code === 'CMU-CS') { count = 7; items = cmuJurors.map(n => ({n, aff: 'CMU'})); }
  else if(o.code === 'TEKNOFEST') { count = 6; items = Array(6).fill(0).map((_,i) => ({n: `${genJurorsTr[i]}`, aff: 'Industry'})); }
  else if(o.code === 'TUBITAK-2204A') { count = 5; items = Array(5).fill(0).map((_,i) => ({n: `Dr. ${genJurorsTr[i]}`, aff: 'Univ'})); }
  else { count = 4; items = Array(4).fill(0).map((_,i) => ({n: `${genJurorsEn[i]} (Reviewer)`, aff: 'External'})); }

  for(let i=0; i<count; i++) {
    const jId = uuid(`juror-${o.code}-${i}`);
    const j = items[i];
    const color = palette[i % palette.length];
    out.push(`INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('${jId}', '${o.id}', '${escapeSql(j.n)}', '${escapeSql(j.aff)}', '${color}') ON CONFLICT DO NOTHING;`);
    jurorIdList.push({id: jId, org: o.code, n: j.n, idx: i});
  }
});

// Pre-computed hash of '1234'
const pinHash = "$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe";

let authList = [];
periodData.forEach(pd => {
  let pJurors = jurorIdList.filter(j => j.org === pd.org);
  if(pd.histIdx === 3) pJurors = []; // Skip deep history scoring entirely
  else if(pd.histIdx === 2) pJurors = pJurors.slice(0, 1);
  else if(pd.histIdx === 1) pJurors = pJurors.slice(0, 2);
  
  pJurors.forEach((j, jix) => {
    let statusId = jix; // We map index to a semantic workflow status
    if (jix >= 5) {
      statusId = random() > 0.3 ? 0 : 1; // Heavy on Completed/InProgress for rest
    }
    
    // Status Semantic IDs:
    // 0: Completed, 1: InProgress, 2: Ready, 3: NotStarted, 4: Editing
    let semanticState = 'Completed';
    if (statusId === 1) semanticState = 'InProgress';
    else if (statusId === 2) semanticState = 'Ready';
    else if (statusId === 3) semanticState = 'NotStarted';
    else if (statusId === 4) semanticState = 'Editing';

    let authObj = { jId: j.id, pId: pd.id, org: pd.org, isCur: pd.isCur, active:true, locked:false, blocked:false, semanticState, name: j.n };
    let q = `INSERT INTO juror_period_auth (juror_id, period_id, pin_hash`;
    let vals = `VALUES ('${j.id}', '${pd.id}', '${pinHash}'`;
    
    if (semanticState === 'Completed' || semanticState === 'Editing') {
      let submitTime = pd.isCur ? `${BASE_TIME} - interval '${randInt(1,5)} hours'` : `timestamp '${pd.start}' + interval '10 days'`;
      q += `, final_submitted_at`; vals += `, ${submitTime}`;
    }
    
    if (semanticState === 'Editing') {
       q += `, edit_enabled, edit_reason, edit_expires_at`; vals += `, true, 'Late submission due to connectivity issue', ${BASE_TIME} + interval '24 hours'`;
    }

    if (pd.isCur && pd.org === 'TEDU-EE' && jix === 8) {
      authObj.locked = true;
      q += `, failed_attempts, locked_until, locked_at`; vals += `, 3, ${BASE_TIME} + interval '10 mins', ${BASE_TIME} - interval '5 mins'`;
    }
    if (pd.isCur && pd.org === 'TEDU-EE' && jix === 9) {
       authObj.blocked = true;
       q += `, is_blocked`; vals += `, true`;
    }
    
    q += `) ${vals}) ON CONFLICT DO NOTHING;`;
    out.push(q);
    authList.push(authObj);
  });
});
out.push('');

// SCORES & ITEMS
out.push(`-- Scoring`);
out.push(`\nBEGIN;\n`);

authList.forEach(auth => {
  if (auth.blocked || auth.locked) return;
  if (auth.semanticState === 'Ready' || auth.semanticState === 'NotStarted') return;

  const myProjs = projList.filter(p => p.pId === auth.pId);
  const totalMyProjs = myProjs.length;
  let targetCount = totalMyProjs;
  
  if (auth.semanticState === 'InProgress') {
    targetCount = Math.floor(totalMyProjs * 0.6); // ~60% coverage
    if (targetCount === 0 && totalMyProjs > 0) targetCount = 1;
  }
  
  let scoredCount = 0;
  myProjs.forEach((proj, pIx) => {
    if (scoredCount >= targetCount) return;

    const o = orgs.find(x => x.code === auth.org);
    const crits = o.criteriaData;
    let itemsCount = crits.length;
    
    // Semantic Status Logic:
    // If juror is InProgress, we limit the number of projects they have score sheets for (targetCount).
    // For the VERY LAST project in their limited set, we make it "Partial" (half criteria).
    let itemsToScore = itemsCount;
    let ssStatus = 'submitted';
    
    if (auth.semanticState === 'InProgress' && scoredCount === targetCount - 1) {
      itemsToScore = Math.floor(itemsCount * 0.5); 
      if (itemsToScore === 0 && itemsCount > 0) itemsToScore = 1;
      ssStatus = 'in_progress';
    }

    let ssId = uuid(`ss-${auth.jId}-${proj.id}`);
    let sst = `${BASE_TIME} - interval '${randInt(1, 48)} hours'`;
    
    if (!auth.isCur) {
      const pd = periodData.find(x => x.id === auth.pId);
      sst = `timestamp '${pd.start}' + interval '${randInt(2,10)} days'`;
    }

    out.push(`
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at) 
    VALUES ('${ssId}', '${auth.pId}', '${proj.id}', '${auth.jId}', '${ssStatus}', ${sst} - interval '30 mins', ${sst})
    ON CONFLICT DO NOTHING;
    `);
    
    let scoredItems = 0;
    crits.forEach((c) => {
      if (scoredItems >= itemsToScore) return;
      scoredItems++;

      let s = c.max;
      if(proj.arch === 'star') s = Math.floor(c.max * randInt(88,98)/100);
      else if(proj.arch === 'solid') s = Math.floor(c.max * randInt(74,85)/100);
      else if(proj.arch === 'highvar') s = Math.floor(c.max * randInt(50,100)/100);
      else if(proj.arch === 'tech_strong_comm_weak') {
        // TEDU-EE: oral_communication/delivery, written_communication/design
        // CMU-CS: communication
        if(c.key === 'delivery' || c.key === 'communication' || c.key === 'design') s = Math.floor(c.max * 0.65);
        else s = Math.floor(c.max * 0.90);
      } else if(proj.arch === 'weak_tech_strong_team') {
        if(c.key === 'technical' || c.key === 'design' || c.key.includes('tech')) s = Math.floor(c.max * 0.55);
        else s = Math.floor(c.max * 0.85);
      } else if(proj.arch === 'borderline') s = Math.floor(c.max * randInt(58,72)/100);
      else s = Math.floor(c.max * randInt(65,85)/100);

      const siId = uuid(`ssi-${ssId}-${c.key}`);
      const pcId = uuid(`pcrit-${auth.pId}-${c.key}`);
      out.push(`
        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('${siId}', '${ssId}', '${pcId}', ${s}) ON CONFLICT DO NOTHING;
      `);
    });
    
    scoredCount++;
  });
});
out.push(`COMMIT;`);
out.push('');

// TOKENS
out.push(`-- Entry Tokens (Hashed)`);
periodData.forEach(pd => {
  if(!pd.isCur) {
    let t_plain = uuid(`tok-exp-${pd.id}`);
    let t_hash = sha256(t_plain);
    let t_id = uuid(t_plain);
    out.push(`INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('${t_id}', '${pd.id}', '${t_hash}', false, ${BASE_TIME} - interval '30 days') ON CONFLICT DO NOTHING;`);
  } else {
    out.push(`INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('${uuid('tok1'+pd.id)}', '${pd.id}', '${sha256(uuid('t1'+pd.id))}', false, ${BASE_TIME} + interval '20 hours') ON CONFLICT DO NOTHING;`);
    out.push(`INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('${uuid('tok2'+pd.id)}', '${pd.id}', '${sha256(uuid('t2'+pd.id))}', false, ${BASE_TIME} + interval '20 hours') ON CONFLICT DO NOTHING;`);
    out.push(`INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at, last_used_at) VALUES ('${uuid('tok3'+pd.id)}', '${pd.id}', '${sha256(uuid('t3'+pd.id))}', true, ${BASE_TIME} - interval '2 days', ${BASE_TIME} - interval '2.1 days') ON CONFLICT DO NOTHING;`);
  }
});

out.push('');


// AUDIT LOGS
out.push(`-- Audit Logs`);
let auditObjList = [];

// App actions
orgAdminIds.forEach((pId, i) => {
  let o = orgs[i % orgs.length];
  auditObjList.push({
    action: 'admin.create', resType: 'profile', resId: pId, orgId: o.id,
    details: '{"role":"org_admin"}', timeStr: `${BASE_TIME} - interval '50 days'`
  });
});

orgAppIds.forEach(oa => {
  let o = orgs.find(x => x.code === oa.org);
  let status = appStatuses[orgs.indexOf(o)];
  if(status === 'approved' || status === 'rejected') {
    auditObjList.push({
      action: `application.${status}`,
      resType: 'org_application',
      resId: oa.id,
      orgId: o.id,
      details: `{"action":"${status}","reviewer":"System admin"}`,
      timeStr: `${BASE_TIME} - interval '${randInt(100, 300)} days'`
    });
  }
});

// Period & Framework actions (All Orgs)
periodData.forEach((pd, idx) => {
  let o = orgs.find(x => x.code === pd.org);
  auditObjList.push({
      action: 'period.create', resType: 'period', resId: pd.id, orgId: o.id,
      details: `{"name":"${pd.name}","season":"${pd.s}"}`,
      timeStr: `timestamp '${pd.start}' - interval '14 days'`
  });
  
  if(!pd.isCur) {
    auditObjList.push({
        action: 'period.lock', resType: 'period', resId: pd.id, orgId: o.id,
        details: `{"action":"locked"}`,
        timeStr: `timestamp '${pd.start}' + interval '120 days'`
    });
  } else {
    auditObjList.push({
        action: 'snapshot.freeze', resType: 'period', resId: pd.id, orgId: o.id,
        details: `{"action":"frozen"}`,
        timeStr: `timestamp '${pd.start}' + interval '1 day'`
    });
  }
});

const teduCurPeriod = periodData.find(pd => pd.org === 'TEDU-EE' && pd.isCur);
const teduCurProjs = projList.filter(p => p.pId === teduCurPeriod.id);

// Import projects
teduCurProjs.forEach((p, idx) => {
   if(idx === 0) {
     auditObjList.push({
        action: 'project.import', resType: 'period', resId: p.pId, orgId: orgs[0].id,
        details: `{"imported_count":10,"source":"csv upload"}`,
        timeStr: `${BASE_TIME} - interval '45 days'`
     });
   }
   if(idx === 1) {
     auditObjList.push({
        action: 'project.create', resType: 'project', resId: p.id, orgId: orgs[0].id,
        details: `{"title":"${p.title.substring(0,20)}"}`,
        timeStr: `${BASE_TIME} - interval '40 days'`
     });
   }
});

// TEDU-EE Cur auth logs
authList.filter(a => a.pId === teduCurPeriod.id).forEach((a, i) => {
  if (i === 0) {
      auditObjList.push({
        action: 'token.generate', resType: 'entry_token', resId: uuid('tok1'+teduCurPeriod.id), orgId: orgs[0].id,
        details: `{"reason":"Jury list batch generate"}`,
        timeStr: `${BASE_TIME} - interval '35 days'`
     });
  }
  
  if(a.locked) {
      auditObjList.push({
        action: 'juror.pin_locked', resType: 'juror_period_auth', resId: a.jId, orgId: orgs[0].id,
        details: `{"juror":"${a.name}","attempts":3,"ip": "192.168.1.10"}`,
        timeStr: `${BASE_TIME} - interval '${i * 2} hours'`
     });
  }
  if(a.editing) {
      auditObjList.push({
        action: 'juror.edit_enabled', resType: 'juror_period_auth', resId: a.jId, orgId: orgs[0].id,
        details: `{"juror":"${a.name}","reason":"Late extension request"}`,
        timeStr: `${BASE_TIME} - interval '${i} hours'`
     });
  }
});

// Manual score logs
for(let i=0; i<6; i++) {
   auditObjList.push({
        action: 'score.submit', resType: 'score_sheet', resId: uuid(`audit-ss-${i}`), orgId: orgs[0].id,
        details: `{"action":"submit","juror_activity":"finalized"}`,
        timeStr: `${BASE_TIME} - interval '${(i + 1) * 3} hours'`
   });
}
for(let i=0; i<2; i++) {
   auditObjList.push({
        action: 'score.update', resType: 'score_sheet', resId: uuid(`audit-ss-upd-${i}`), orgId: orgs[0].id,
        details: `{"action":"update","corrections":2}`,
        timeStr: `${BASE_TIME} - interval '${(i + 1) * 2} hours'`
   });
}

// Token Revoke
auditObjList.push({
    action: 'token.revoke', resType: 'entry_token', resId: uuid('tok3'+teduCurPeriod.id), orgId: orgs[0].id,
    details: `{"reason":"manual revocation due to email leak"}`,
    timeStr: `${BASE_TIME} - interval '5 days'`
});

auditObjList.forEach((ad, i) => {
  let aId = uuid(`audit-log-${ad.action}-${ad.resId}-${ad.timeStr}`);
  out.push(`INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('${aId}', '${ad.orgId}', NULL, '${ad.action}', '${ad.resType}', '${ad.resId}', '${escapeSql(ad.details)}', ${ad.timeStr}) ON CONFLICT DO NOTHING;`);
});

out.push('');

// JURY FEEDBACK
out.push(`-- Jury Feedback`);
const juryFeedbackData = [
  // TEDU-EE
  { pSeed: 'period-TEDU-EE-0',     jSeed: 'juror-TEDU-EE-0',      rating: 4, comment: null,                                                                                             pub: false },
  // IEEE
  { pSeed: 'period-IEEE-APSSDC-0', jSeed: 'juror-IEEE-APSSDC-0',  rating: 5, comment: 'Incredibly smooth experience. Scored 12 projects in under an hour with no hiccups.',             pub: true  },
  { pSeed: 'period-IEEE-APSSDC-0', jSeed: 'juror-IEEE-APSSDC-1',  rating: 4, comment: 'Clean interface, very intuitive. Would love a dark mode option on the scoring screen.',          pub: true  },
  { pSeed: 'period-IEEE-APSSDC-0', jSeed: 'juror-IEEE-APSSDC-2',  rating: 5, comment: 'Best evaluation tool I have used for conference paper reviews. Simple yet powerful.',            pub: true  },
  { pSeed: 'period-IEEE-APSSDC-1', jSeed: 'juror-IEEE-APSSDC-0',  rating: 5, comment: null,                                                                                             pub: false },
  { pSeed: 'period-IEEE-APSSDC-1', jSeed: 'juror-IEEE-APSSDC-1',  rating: 4, comment: null,                                                                                             pub: false },
  { pSeed: 'period-IEEE-APSSDC-1', jSeed: 'juror-IEEE-APSSDC-2',  rating: 5, comment: 'Used VERA again for the second time — consistently excellent.',                                  pub: true  },
  // CanSat
  { pSeed: 'period-CANSAT-2025-0', jSeed: 'juror-CANSAT-2025-0',  rating: 5, comment: 'We evaluated 24 CanSat teams in a single afternoon. Real-time rankings kept the event exciting.', pub: true  },
  { pSeed: 'period-CANSAT-2025-0', jSeed: 'juror-CANSAT-2025-1',  rating: 4, comment: 'Great for competition settings. The rubric sheet was very helpful.',                             pub: true  },
  { pSeed: 'period-CANSAT-2025-0', jSeed: 'juror-CANSAT-2025-2',  rating: 5, comment: null,                                                                                             pub: false },
  { pSeed: 'period-CANSAT-2025-1', jSeed: 'juror-CANSAT-2025-0',  rating: 4, comment: null,                                                                                             pub: false },
  { pSeed: 'period-CANSAT-2025-1', jSeed: 'juror-CANSAT-2025-1',  rating: 5, comment: 'Even better than last year. The admin panel gives instant insight into scoring patterns.',       pub: true  },
  { pSeed: 'period-CANSAT-2025-1', jSeed: 'juror-CANSAT-2025-2',  rating: 4, comment: 'Straightforward and efficient. No training needed — I just started scoring.',                   pub: true  },
  // CMU
  { pSeed: 'period-CMU-CS-0',      jSeed: 'juror-CMU-CS-0',       rating: 5, comment: 'Replaced our old paper-based system entirely. The export feature alone saves hours of work.',   pub: true  },
  { pSeed: 'period-CMU-CS-0',      jSeed: 'juror-CMU-CS-1',       rating: 4, comment: 'Solid tool. The configurable criteria made it easy to adapt to our CS capstone format.',        pub: true  },
  { pSeed: 'period-CMU-CS-1',      jSeed: 'juror-CMU-CS-0',       rating: 5, comment: null,                                                                                             pub: false },
  { pSeed: 'period-CMU-CS-1',      jSeed: 'juror-CMU-CS-1',       rating: 3, comment: null,                                                                                             pub: false },
  { pSeed: 'period-CMU-CS-2',      jSeed: 'juror-CMU-CS-0',       rating: 4, comment: null,                                                                                             pub: false },
  { pSeed: 'period-CMU-CS-2',      jSeed: 'juror-CMU-CS-1',       rating: 5, comment: 'Third semester using VERA. It keeps getting better.',                                            pub: true  },
  // TEKNOFEST
  { pSeed: 'period-TEKNOFEST-0',   jSeed: 'juror-TEKNOFEST-0',    rating: 5, comment: 'Yüzlerce takımı hızlıca değerlendirdik. Sistem çok stabil ve hızlıydı.',                        pub: true  },
  { pSeed: 'period-TEKNOFEST-1',   jSeed: 'juror-TEKNOFEST-0',    rating: 4, comment: null,                                                                                             pub: false },
  { pSeed: 'period-TEKNOFEST-1',   jSeed: 'juror-TEKNOFEST-1',    rating: 5, comment: 'Kullanımı çok kolay, eğitim bile gerekmedi. Tüm jüri arkadaşlarım memnun kaldı.',               pub: true  },
  // CanSat third
  { pSeed: 'period-CANSAT-2025-2', jSeed: 'juror-CANSAT-2025-1',  rating: 3, comment: null,                                                                                             pub: false },
  { pSeed: 'period-CANSAT-2025-2', jSeed: 'juror-CANSAT-2025-2',  rating: 5, comment: null,                                                                                             pub: false },
];

const feedbackRows = juryFeedbackData.map(f => {
  const pId = uuid(f.pSeed);
  const jId = uuid(f.jSeed);
  const comment = f.comment ? `'${escapeSql(f.comment)}'` : 'NULL';
  return `('${pId}', '${jId}', ${f.rating}, ${comment}, ${f.pub})`;
});

out.push(`INSERT INTO jury_feedback (period_id, juror_id, rating, comment, is_public) VALUES\n${feedbackRows.join(',\n')}\nON CONFLICT (period_id, juror_id) DO NOTHING;`);
out.push('');

out.push(`COMMIT;\n`);

fs.writeFileSync('/Users/huguryildiz/Documents/GitHub/VERA/sql/seeds/demo_seed.sql', out.join('\n'));
console.log('Demo seed written to sql/seeds/demo_seed.sql');
