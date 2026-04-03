const fs = require('fs');

let file = fs.readFileSync('scripts/generate_demo_premium_seed.js', 'utf8');

file = file.replace(
  "let adminCount = (o.code === 'TEDU-EE' || o.code === 'CMU-CS') ? 2 : 1;",
  "let adminCount = (o.code === 'TEDU-EE' || o.code === 'CMU-CS' || o.code === 'TEKNOFEST') ? 2 : 1;"
);

const oldProcessOrgfw = `function processOrgfw(orgCode, fwName, fwVersion, criteria, outcomes, mappings) {
  const o = orgs.find(x => x.code === orgCode);
  const fwId = uuid('fw-' + orgCode);
  fws.push(\`INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('\${fwId}', '\${o.id}', '\${escapeSql(fwName)}', '\${fwVersion}', true) ON CONFLICT DO NOTHING;\`);
  
  const oMap = {};
  let outOrder = 1;
  for (const arr of outcomes) {
    const [code, lbl] = arr;
    const oId = uuid(\`fw-out-\${orgCode}-\${code}\`);
    oMap[code] = oId;
    fwOutcomes.push(\`INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('\${oId}', '\${fwId}', '\${escapeSql(code)}', '\${escapeSql(lbl)}', \${outOrder++}) ON CONFLICT DO NOTHING;\`);
  }

  const cMap = {};
  let critOrder = 1;
  for (const c of criteria) {
    const cId = uuid(\`fw-crit-\${orgCode}-\${c.key}\`);
    const rubricJson = parseRubric(c.max);
    cMap[c.key] = cId;
    o.criteriaData = o.criteriaData || [];
    o.criteriaData.push({ id: cId, ...c });
    fwCriteria.push(\`INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('\${cId}', '\${fwId}', '\${c.key}', '\${escapeSql(c.label)}', '\${escapeSql(c.short)}', \${c.max}, \${c.weight}, '\${c.color}', '\${rubricJson}', \${critOrder++}) ON CONFLICT DO NOTHING;\`);
  }

  for (const m of mappings) {
    const cId = cMap[m.crit];
    for (const mo of m.outs) {
      const oId = oMap[mo.code];
      const mId = uuid(\`fw-map-\${orgCode}-\${m.crit}-\${mo.code}\`);
      fwMaps.push(\`INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('\${mId}', '\${fwId}', '\${cId}', '\${oId}', \${mo.weight}) ON CONFLICT DO NOTHING;\`);
    }
  }
}`;

const newProcessOrgfw = `function processOrgfw(orgCode, fwName, fwVersion, criteria, outcomes, mappings) {
  const o = orgs.find(x => x.code === orgCode);
  const fwId = uuid('fw-' + orgCode);
  fws.push(\`INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('\${fwId}', '\${o.id}', '\${escapeSql(fwName)}', '\${fwVersion}', true) ON CONFLICT DO NOTHING;\`);
  
  const oMap = {};
  let outOrder = 1;
  o.outcomesData = [];
  for (const arr of outcomes) {
    const [code, lbl] = arr;
    const oId = uuid(\`fw-out-\${orgCode}-\${code}\`);
    oMap[code] = oId;
    o.outcomesData.push({ id: oId, code, label: lbl, sortOrder: outOrder });
    fwOutcomes.push(\`INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('\${oId}', '\${fwId}', '\${escapeSql(code)}', '\${escapeSql(lbl)}', \${outOrder++}) ON CONFLICT DO NOTHING;\`);
  }

  const cMap = {};
  let critOrder = 1;
  o.criteriaData = [];
  for (const c of criteria) {
    const cId = uuid(\`fw-crit-\${orgCode}-\${c.key}\`);
    const rubricJson = parseRubric(c.max);
    cMap[c.key] = cId;
    o.criteriaData.push({ id: cId, ...c, sortOrder: critOrder });
    fwCriteria.push(\`INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('\${cId}', '\${fwId}', '\${c.key}', '\${escapeSql(c.label)}', '\${escapeSql(c.short)}', \${c.max}, \${c.weight}, '\${c.color}', '\${rubricJson}', \${critOrder++}) ON CONFLICT DO NOTHING;\`);
  }

  o.mapsData = [];
  for (const m of mappings) {
    const cId = cMap[m.crit];
    for (const mo of m.outs) {
      const oId = oMap[mo.code];
      const mId = uuid(\`fw-map-\${orgCode}-\${m.crit}-\${mo.code}\`);
      o.mapsData.push({ id: mId, cId, oId, weight: mo.weight });
      fwMaps.push(\`INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('\${mId}', '\${fwId}', '\${cId}', '\${oId}', \${mo.weight}) ON CONFLICT DO NOTHING;\`);
    }
  }
}`;

file = file.replace(oldProcessOrgfw, newProcessOrgfw);

const oldPeriodSQL = `    out.push(\`INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order) SELECT gen_random_uuid(), '\${pId}', id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order FROM framework_criteria WHERE framework_id = '\${fwId}' ON CONFLICT DO NOTHING;\`);
    out.push(\`INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, description, sort_order) SELECT gen_random_uuid(), '\${pId}', id, code, label, description, sort_order FROM framework_outcomes WHERE framework_id = '\${fwId}' ON CONFLICT DO NOTHING;\`);
    
    // Uses ON CONFLICT and period mapping precisely
    out.push(\`INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, coverage_type, weight) SELECT gen_random_uuid(), '\${pId}', pc.id, po.id, fcom.coverage_type, fcom.weight FROM framework_criterion_outcome_maps fcom JOIN period_criteria pc ON pc.source_criterion_id = fcom.criterion_id AND pc.period_id = '\${pId}' JOIN period_outcomes po ON po.source_outcome_id = fcom.outcome_id AND po.period_id = '\${pId}' WHERE fcom.framework_id = '\${fwId}' ON CONFLICT DO NOTHING;\`);`;

const newPeriodSQL = `    const pcMap = {};
    o.criteriaData.forEach(c => {
      const pcId = uuid(\`pcrit-\${pId}-\${c.key}\`);
      pcMap[c.id] = pcId;
      const rubricJson = parseRubric(c.max);
      out.push(\`INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('\${pcId}', '\${pId}', '\${c.id}', '\${c.key}', '\${escapeSql(c.label)}', '\${escapeSql(c.short)}', \${c.max}, \${c.weight}, '\${c.color}', '\${rubricJson}', \${c.sortOrder}) ON CONFLICT DO NOTHING;\`);
    });

    const poMap = {};
    o.outcomesData.forEach(oc => {
      const poId = uuid(\`pout-\${pId}-\${oc.code}\`);
      poMap[oc.id] = poId;
      out.push(\`INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('\${poId}', '\${pId}', '\${oc.id}', '\${oc.code}', '\${escapeSql(oc.label)}', \${oc.sortOrder}) ON CONFLICT DO NOTHING;\`);
    });

    o.mapsData.forEach(m => {
      const pmId = uuid(\`pmap-\${pId}-\${m.cId}-\${m.oId}\`);
      const pcId = pcMap[m.cId];
      const poId = poMap[m.oId];
      out.push(\`INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('\${pmId}', '\${pId}', '\${pcId}', '\${poId}', \${m.weight}) ON CONFLICT DO NOTHING;\`);
    });`;

file = file.replace(oldPeriodSQL, newPeriodSQL);

const oldDeclare = `out.push(\`
DO $$
DECLARE
  v_pc_id UUID;
BEGIN
\`);`;

file = file.replace(oldDeclare, "");

const oldSsi = `      const siId = uuid(\`ssi-\${ssId}-\${c.key}\`);
      out.push(\`
      SELECT id INTO v_pc_id FROM period_criteria WHERE period_id = '\${auth.pId}' AND key = '\${c.key}' LIMIT 1;
      IF v_pc_id IS NOT NULL THEN
        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('\${siId}', '\${ssId}', v_pc_id, \${s}) ON CONFLICT DO NOTHING;
      END IF;
      \`);`;

const newSsi = `      const siId = uuid(\`ssi-\${ssId}-\${c.key}\`);
      const pcId = uuid(\`pcrit-\${auth.pId}-\${c.key}\`);
      out.push(\`INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value) VALUES ('\${siId}', '\${ssId}', '\${pcId}', \${s}) ON CONFLICT DO NOTHING;\`);`;

file = file.replace(oldSsi, newSsi);

file = file.replace("out.push(`END $$;`);\n", "");

file = file.replace("let aId = uuid(`audit-log-${i}-${ad.action}`);", "let aId = uuid(`audit-log-${ad.action}-${ad.resId}-${ad.timeStr}`);");

const newAdminLogs = `
// App actions
orgAdminIds.forEach((pId, i) => {
  let o = orgs[i % orgs.length];
  auditObjList.push({
    action: 'admin.create', resType: 'profile', resId: pId, orgId: o.id,
    details: '{"role":"org_admin"}', timeStr: \`\${BASE_TIME} - interval '50 days'\`
  });
});
`
file = file.replace("// App actions", newAdminLogs);

fs.writeFileSync('scripts/generate_demo_premium_seed.js', file);
console.log('updated correctly');
