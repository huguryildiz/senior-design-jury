# Framework Template & Clone System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins save their outcome+mapping work as a named framework template and clone it into future periods, with platform-level MÜDEK 2024 and ABET 2024 global templates available out-of-the-box.

**Architecture:** A new `rpc_admin_clone_framework` deep-copies a framework row + all outcomes + criteria + mappings into a fresh org-owned copy. The `OutcomesPage` reads `selectedPeriod.framework_id` instead of `frameworks[0]`. Period setup exposes an optional framework picker that triggers a clone on save. Global templates live as `organization_id IS NULL` rows in `frameworks` — visible to all orgs, writable by none.

**Tech Stack:** Supabase PostgreSQL (RPC, PostgREST), React, Lucide icons, existing `Modal` + `CustomSelect` + `Drawer` components.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `sql/migrations/006_rpcs_admin.sql` | Modify | Add `rpc_admin_clone_framework` RPC |
| `sql/migrations/008_platform.sql` | Modify | Add MÜDEK 2024 + ABET 2024 global template seed rows |
| `src/shared/api/admin/frameworks.js` | Modify | Add `cloneFramework`, `assignFrameworkToPeriod` |
| `src/shared/api/index.js` | Modify | Re-export new API functions |
| `src/admin/modals/FrameworkPickerModal.jsx` | Create | Grouped picker modal (org frameworks / global templates) |
| `src/admin/pages/OutcomesPage.jsx` | Modify | Read `selectedPeriod.framework_id`; new empty state; Clone + Change context bar |
| `src/admin/drawers/AddEditPeriodDrawer.jsx` | Modify | Optional Framework field that opens `FrameworkPickerModal` |
| `src/admin/hooks/useManagePeriods.js` | Modify | Wire `cloneFramework` + `assignFrameworkToPeriod` into `handleCreatePeriod` |
| `src/admin/__tests__/cloneFramework.test.js` | Create | Unit tests for `cloneFramework` and `assignFrameworkToPeriod` |

---

## Task 1: Add `rpc_admin_clone_framework` to the DB

**Files:**
- Modify: `sql/migrations/006_rpcs_admin.sql` (append at end)

- [ ] **Step 1: Append the RPC to `006_rpcs_admin.sql`**

Add at the end of the file, before any trailing GRANT blocks:

```sql
-- =============================================================================
-- rpc_admin_clone_framework
-- Deep-clones a framework (rows, outcomes, criteria, maps) into a new
-- org-owned copy. Used by OutcomesPage and period setup.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_clone_framework(
  p_framework_id UUID,
  p_new_name     TEXT,
  p_org_id       UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_is_admin    BOOLEAN;
  v_new_fw_id   UUID;
  v_outcome_map JSONB := '{}';
  v_crit_map    JSONB := '{}';
  r             RECORD;
  v_new_id      UUID;
BEGIN
  -- Auth: caller must be admin (or super-admin) of p_org_id
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = p_org_id OR organization_id IS NULL)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- 1. Clone the frameworks row
  INSERT INTO frameworks (
    organization_id, name, description, version,
    outcome_code_prefix, default_threshold
  )
  SELECT
    p_org_id, p_new_name, description, version,
    outcome_code_prefix, default_threshold
  FROM frameworks
  WHERE id = p_framework_id
  RETURNING id INTO v_new_fw_id;

  -- 2. Clone framework_outcomes, track old→new UUID mapping
  FOR r IN
    SELECT * FROM framework_outcomes
    WHERE framework_id = p_framework_id
    ORDER BY sort_order
  LOOP
    INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order)
    VALUES (v_new_fw_id, r.code, r.label, r.description, r.sort_order)
    RETURNING id INTO v_new_id;

    v_outcome_map := v_outcome_map || jsonb_build_object(r.id::TEXT, v_new_id::TEXT);
  END LOOP;

  -- 3. Clone framework_criteria, track old→new UUID mapping
  FOR r IN
    SELECT * FROM framework_criteria
    WHERE framework_id = p_framework_id
    ORDER BY sort_order
  LOOP
    INSERT INTO framework_criteria (
      framework_id, key, label, short_label, description,
      max_score, weight, color, rubric_bands, sort_order
    )
    VALUES (
      v_new_fw_id, r.key, r.label, r.short_label, r.description,
      r.max_score, r.weight, r.color, r.rubric_bands, r.sort_order
    )
    RETURNING id INTO v_new_id;

    v_crit_map := v_crit_map || jsonb_build_object(r.id::TEXT, v_new_id::TEXT);
  END LOOP;

  -- 4. Clone framework_criterion_outcome_maps with remapped IDs
  FOR r IN
    SELECT * FROM framework_criterion_outcome_maps
    WHERE framework_id = p_framework_id
  LOOP
    -- Skip orphaned maps (shouldn't exist, but guard against it)
    CONTINUE WHEN (v_crit_map ->> r.criterion_id::TEXT) IS NULL;
    CONTINUE WHEN (v_outcome_map ->> r.outcome_id::TEXT) IS NULL;

    INSERT INTO framework_criterion_outcome_maps (
      framework_id, criterion_id, outcome_id, coverage_type, weight
    )
    VALUES (
      v_new_fw_id,
      (v_crit_map ->> r.criterion_id::TEXT)::UUID,
      (v_outcome_map ->> r.outcome_id::TEXT)::UUID,
      r.coverage_type,
      r.weight
    );
  END LOOP;

  RETURN v_new_fw_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_clone_framework(UUID, TEXT, UUID) TO authenticated;
```

- [ ] **Step 2: Apply to vera-prod via Supabase MCP**

Use `mcp__claude_ai_Supabase__execute_sql` with the `<vera-prod-project-ref>` project. Execute only the new function block (from `CREATE OR REPLACE FUNCTION` to the `GRANT` line inclusive).

- [ ] **Step 3: Apply to vera-demo via Supabase MCP**

Same block, `<vera-demo-project-ref>` project.

- [ ] **Step 4: Verify on vera-prod**

Run via `execute_sql`:

```sql
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'rpc_admin_clone_framework';
```

Expected: one row, `pronargs = 3`.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/006_rpcs_admin.sql
git commit -m "feat(db): add rpc_admin_clone_framework — deep-clone framework + outcomes + criteria + maps"
```

---

## Task 2: Seed global framework templates in `008_platform.sql`

**Files:**
- Modify: `sql/migrations/008_platform.sql` (append seed block at end)

- [ ] **Step 1: Generate two UUIDs for the global templates**

Run via Supabase MCP `execute_sql` (either project):

```sql
SELECT gen_random_uuid() AS mudek_id, gen_random_uuid() AS abet_id;
```

Copy the two values. These will be used as `MUDEK_UUID` and `ABET_UUID` below. They are fixed from this point forward (the `ON CONFLICT (id) DO NOTHING` guard makes the block idempotent).

- [ ] **Step 2: Append seed block to `008_platform.sql`**

Replace `MUDEK_UUID` and `ABET_UUID` with your generated values before saving.

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- GLOBAL FRAMEWORK TEMPLATES (organization_id IS NULL → read-only for all orgs)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_mudek UUID := 'MUDEK_UUID';
  v_abet  UUID := 'ABET_UUID';
BEGIN

  -- ── MÜDEK 2024 ──────────────────────────────────────────────────────────────
  INSERT INTO frameworks (id, organization_id, name, description, version)
  VALUES (
    v_mudek, NULL,
    'MÜDEK 2024',
    'MÜDEK mühendislik akreditasyon çerçevesi — 18 program çıktısı (PO 1.1–11)',
    '2024'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM framework_outcomes WHERE framework_id = v_mudek LIMIT 1) THEN
    INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order) VALUES
      (v_mudek, 'PO 1.1',  'Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konularda bilgi.',                                                                                                  'Bilgi ve Uygulama Becerisi', 1),
      (v_mudek, 'PO 1.2',  'Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konulardaki bilgileri, karmaşık mühendislik problemlerinin çözümünde kullanabilme becerisi.',                      'Bilgi ve Uygulama Becerisi', 2),
      (v_mudek, 'PO 2',    'Karmaşık mühendislik problemlerini, temel bilim, matematik ve mühendislik bilgilerini kullanarak ve ele alınan problemle ilgili BM Sürdürülebilir Kalkınma Amaçlarını gözeterek tanımlama, formüle etme ve analiz becerisi.', 'Problem Analizi',            3),
      (v_mudek, 'PO 3.1',  'Karmaşık mühendislik problemlerine yaratıcı çözümler tasarlama becerisi.',                                                                                                                                                    'Tasarım ve Geliştirme',      4),
      (v_mudek, 'PO 3.2',  'Karmaşık sistemleri, süreçleri, cihazları veya ürünleri gerçekçi kısıtları ve koşulları gözeterek, mevcut ve gelecekteki gereksinimleri karşılayacak biçimde tasarlama becerisi.',                                           'Tasarım ve Geliştirme',      5),
      (v_mudek, 'PO 4',    'Uygun teknikleri, kaynakları ve modern mühendislik ve bilişim araçlarını, sınırlamalarının da farkında olarak seçme ve kullanma becerisi.',                                                                                   'Modern Araç Kullanımı',      6),
      (v_mudek, 'PO 5',    'Karmaşık mühendislik problemlerinin incelenmesi için literatür araştırması, deney tasarlama, deney yapma, veri toplama, sonuçları analiz etme ve yorumlama dahil, araştırma yöntemlerini kullanma becerisi.',                  'Araştırma',                  7),
      (v_mudek, 'PO 6.1',  'Mühendislik uygulamalarının BM Sürdürülebilir Kalkınma Amaçları kapsamında, topluma, sağlık ve güvenliğe, ekonomiye, sürdürülebilirlik ve çevreye etkileri hakkında bilgi.',                                                 'Mühendislik ve Toplum',      8),
      (v_mudek, 'PO 6.2',  'Mühendislik çözümlerinin hukuksal sonuçları konusunda farkındalık.',                                                                                                                                                          'Mühendislik ve Toplum',      9),
      (v_mudek, 'PO 7.1',  'Mühendislik meslek ilkelerine uygun davranma, etik sorumluluk hakkında bilgi.',                                                                                                                                               'Etik ve Çeşitlilik',         10),
      (v_mudek, 'PO 7.2',  'Hiçbir konuda ayrımcılık yapmadan, tarafsız davranma ve çeşitliliği kapsayıcı olma konularında farkındalık.',                                                                                                                'Etik ve Çeşitlilik',         11),
      (v_mudek, 'PO 8.1',  'Bireysel olarak disiplin içi takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi.',                                                                                   'Takım Çalışması',            12),
      (v_mudek, 'PO 8.2',  'Bireysel olarak çok disiplinli takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi.',                                                                                 'Takım Çalışması',            13),
      (v_mudek, 'PO 9.1',  'Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda sözlü etkin iletişim kurma becerisi.',                                                                                    'İletişim',                   14),
      (v_mudek, 'PO 9.2',  'Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda yazılı etkin iletişim kurma becerisi.',                                                                                   'İletişim',                   15),
      (v_mudek, 'PO 10.1', 'Proje yönetimi ve ekonomik yapılabilirlik analizi gibi iş hayatındaki uygulamalar hakkında bilgi.',                                                                                                                            'İş Hayatı ve Girişimcilik',  16),
      (v_mudek, 'PO 10.2', 'Girişimcilik ve yenilikçilik hakkında farkındalık.',                                                                                                                                                                          'İş Hayatı ve Girişimcilik',  17),
      (v_mudek, 'PO 11',   'Bağımsız ve sürekli öğrenebilme, yeni ve gelişmekte olan teknolojilere uyum sağlayabilme ve teknolojik değişimlerle ilgili sorgulayıcı düşünebilmeyi kapsayan yaşam boyu öğrenme becerisi.',                                  'Yaşam Boyu Öğrenme',         18);
  END IF;

  -- ── ABET 2024 ────────────────────────────────────────────────────────────────
  INSERT INTO frameworks (id, organization_id, name, description, version)
  VALUES (
    v_abet, NULL,
    'ABET 2024',
    'ABET EAC Student Outcomes — SO 1 through SO 7 (2026-2027 Criteria)',
    '2024'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM framework_outcomes WHERE framework_id = v_abet LIMIT 1) THEN
    INSERT INTO framework_outcomes (framework_id, code, label, description, sort_order) VALUES
      (v_abet, 'SO 1', 'an ability to identify, formulate, and solve complex engineering problems by applying principles of engineering, science, and mathematics.',                                                                                                                       'Complex Problem Solving',          1),
      (v_abet, 'SO 2', 'an ability to apply engineering design to produce solutions that meet specified needs with consideration of public health, safety, and welfare, as well as global, cultural, social, environmental, and economic factors.',                                        'Engineering Design',               2),
      (v_abet, 'SO 3', 'an ability to communicate effectively with a range of audiences.',                                                                                                                                                                                               'Effective Communication',          3),
      (v_abet, 'SO 4', 'an ability to recognize ethical and professional responsibilities in engineering situations and make informed judgments, which must consider the impact of engineering solutions in global, economic, environmental, and societal contexts.',                      'Ethics & Professional Responsibility', 4),
      (v_abet, 'SO 5', 'an ability to function effectively on a team whose members together provide leadership, create a collaborative environment, establish goals, plan tasks, and meet objectives.',                                                                                   'Teamwork & Leadership',            5),
      (v_abet, 'SO 6', 'an ability to develop and conduct appropriate experimentation, analyze and interpret data, and use engineering judgment to draw conclusions.',                                                                                                                    'Experimentation & Analysis',       6),
      (v_abet, 'SO 7', 'an ability to acquire and apply new knowledge as needed, using appropriate learning strategies.',                                                                                                                                                                'Lifelong Learning',                7);
  END IF;

END;
$$;
```

- [ ] **Step 3: Apply to vera-prod via Supabase MCP**

Execute the `DO $$ ... $$;` block on `<vera-prod-project-ref>`.

- [ ] **Step 4: Apply to vera-demo via Supabase MCP**

Same block on `<vera-demo-project-ref>`.

- [ ] **Step 5: Verify**

```sql
SELECT id, name, version,
       (SELECT count(*) FROM framework_outcomes WHERE framework_id = frameworks.id) AS outcome_count
FROM frameworks
WHERE organization_id IS NULL
ORDER BY name;
```

Expected: 2 rows — `MÜDEK 2024` with 18 outcomes, `ABET 2024` with 7 outcomes.

- [ ] **Step 6: Commit**

```bash
git add sql/migrations/008_platform.sql
git commit -m "feat(db): add MÜDEK 2024 and ABET 2024 as global framework templates"
```

---

## Task 3: Add `cloneFramework` and `assignFrameworkToPeriod` to the API

**Files:**
- Modify: `src/shared/api/admin/frameworks.js`
- Modify: `src/shared/api/index.js`
- Create: `src/admin/__tests__/cloneFramework.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/admin/__tests__/cloneFramework.test.js`:

```js
// src/admin/__tests__/cloneFramework.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../test/qaTest";

vi.mock("../../shared/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from "../../shared/lib/supabaseClient";
import { cloneFramework, assignFrameworkToPeriod } from "../../shared/api/admin/frameworks";

describe("cloneFramework", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls rpc_admin_clone_framework and returns { id, name }", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: "new-framework-uuid",
      error: null,
    });

    const result = await cloneFramework("source-uuid", "Clone Name", "org-uuid");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_admin_clone_framework", {
      p_framework_id: "source-uuid",
      p_new_name: "Clone Name",
      p_org_id: "org-uuid",
    });
    expect(result).toEqual({ id: "new-framework-uuid", name: "Clone Name" });
  });

  it("throws on RPC error", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "unauthorized" },
    });

    await expect(cloneFramework("x", "y", "z")).rejects.toThrow("unauthorized");
  });
});

describe("assignFrameworkToPeriod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates periods.framework_id", async () => {
    const mockSingle = { error: null };
    const mockEq = vi.fn().mockResolvedValue(mockSingle);
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ update: mockUpdate });

    await assignFrameworkToPeriod("period-uuid", "fw-uuid");

    expect(supabase.from).toHaveBeenCalledWith("periods");
    expect(mockUpdate).toHaveBeenCalledWith({ framework_id: "fw-uuid" });
    expect(mockEq).toHaveBeenCalledWith("id", "period-uuid");
  });

  it("throws on DB error", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "rls error" } });
    supabase.from.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockEq }) });

    await expect(assignFrameworkToPeriod("p", "f")).rejects.toThrow("rls error");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/admin/__tests__/cloneFramework.test.js
```

Expected: FAIL — `cloneFramework is not a function` or similar.

- [ ] **Step 3: Implement the functions in `frameworks.js`**

Add at the end of `src/shared/api/admin/frameworks.js`:

```js
/**
 * Deep-clone a framework under a new name for the given org.
 * Calls rpc_admin_clone_framework which copies outcomes, criteria, and maps.
 * Returns { id, name } of the new framework.
 */
export async function cloneFramework(frameworkId, newName, orgId) {
  const { data, error } = await supabase.rpc("rpc_admin_clone_framework", {
    p_framework_id: frameworkId,
    p_new_name: newName,
    p_org_id: orgId,
  });
  if (error) throw error;
  return { id: data, name: newName };
}

/**
 * Assign (or reassign) a framework to a period by setting periods.framework_id.
 * Hard-confirm logic and mapping cleanup are handled in the UI before calling this.
 */
export async function assignFrameworkToPeriod(periodId, frameworkId) {
  const { error } = await supabase
    .from("periods")
    .update({ framework_id: frameworkId })
    .eq("id", periodId);
  if (error) throw error;
}
```

- [ ] **Step 4: Re-export from `index.js`**

In `src/shared/api/index.js`, find the frameworks export block (around line 101) and add the two new functions:

```js
  listFrameworks,
  createFramework,
  updateFramework,
  deleteFramework,
  cloneFramework,
  assignFrameworkToPeriod,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --run src/admin/__tests__/cloneFramework.test.js
```

Expected: PASS — 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/admin/frameworks.js src/shared/api/index.js src/admin/__tests__/cloneFramework.test.js
git commit -m "feat(api): add cloneFramework and assignFrameworkToPeriod"
```

---

## Task 4: Create `FrameworkPickerModal`

**Files:**
- Create: `src/admin/modals/FrameworkPickerModal.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/admin/modals/FrameworkPickerModal.jsx
// Modal: pick a framework to clone from.
// Groups org's own frameworks above platform templates (organization_id IS NULL).
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   frameworks — array from listFrameworks (includes both org + global rows)
//   onSelect   — (framework: { id, name, organization_id }) => void

import { useState, useEffect } from "react";
import { Layers } from "lucide-react";
import Modal from "@/shared/ui/Modal";

export default function FrameworkPickerModal({ open, onClose, frameworks = [], onSelect }) {
  const [selected, setSelected] = useState(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const orgFrameworks = frameworks.filter((f) => f.organization_id !== null);
  const globalTemplates = frameworks.filter((f) => f.organization_id === null);

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  const itemStyle = (isSelected) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "9px 12px",
    borderRadius: "var(--radius)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
    background: isSelected ? "rgba(var(--accent-rgb), 0.06)" : "var(--surface-1)",
    color: isSelected ? "var(--accent)" : "var(--text-primary)",
    textAlign: "left",
    transition: "border-color 0.15s, background 0.15s",
  });

  const sectionLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--text-tertiary)",
    padding: "8px 0 4px",
  };

  return (
    <Modal open={open} onClose={onClose} title="Var olan framework'ten başla">
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
        {orgFrameworks.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Önceki Dönemler</div>
            {orgFrameworks.map((fw) => (
              <button
                key={fw.id}
                style={itemStyle(selected?.id === fw.id)}
                onClick={() => setSelected(fw)}
              >
                <Layers size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
                {fw.name}
              </button>
            ))}
          </>
        )}
        {globalTemplates.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Platform Şablonları</div>
            {globalTemplates.map((fw) => (
              <button
                key={fw.id}
                style={itemStyle(selected?.id === fw.id)}
                onClick={() => setSelected(fw)}
              >
                <Layers size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
                {fw.name}
              </button>
            ))}
          </>
        )}
        {orgFrameworks.length === 0 && globalTemplates.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "16px 0", textAlign: "center" }}>
            Kullanılabilir framework bulunamadı.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          İptal
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ width: "auto", padding: "8px 20px" }}
          onClick={handleConfirm}
          disabled={!selected}
        >
          Klonla &amp; Kullan
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify the file saved correctly**

Read `src/admin/modals/FrameworkPickerModal.jsx` and confirm it starts with the comment block.

- [ ] **Step 3: Commit**

```bash
git add src/admin/modals/FrameworkPickerModal.jsx
git commit -m "feat(ui): add FrameworkPickerModal — grouped org + platform template picker"
```

---

## Task 5: Refactor `OutcomesPage` — per-period framework + new UX

**Files:**
- Modify: `src/admin/pages/OutcomesPage.jsx`

### What changes

| Location | Before | After |
|----------|--------|-------|
| Context destructure (line 204) | `frameworks = []` | Add `selectedPeriod` |
| `frameworkId` (line 211) | `frameworks[0]?.id \|\| null` | `selectedPeriod?.framework_id \|\| null` |
| `frameworkName` (line 212) | `frameworks[0]?.name \|\| ""` | `frameworks.find(f => f.id === frameworkId)?.name \|\| ""` |
| Empty state (lines 422–477) | Single "Create Framework" button | Two buttons: picker + create from scratch |
| Context bar (lines 481–495) | Chip list from `frameworks` map | Single chip (current fw) + "Clone as new..." + "Change..." |

- [ ] **Step 1: Update the imports**

At the top of `OutcomesPage.jsx`, add to the import block:

```js
import { createFramework, cloneFramework, assignFrameworkToPeriod } from "@/shared/api";
import FrameworkPickerModal from "../modals/FrameworkPickerModal";
import ConfirmDialog from "@/shared/ConfirmDialog";
```

Remove the `createFramework` from its existing import if it's already imported separately.

- [ ] **Step 2: Update the context destructure**

Replace lines 203–208:

```js
const {
  organizationId,
  selectedPeriodId,
  frameworks = [],
  onFrameworksChange,
} = useAdminContext();
```

With:

```js
const {
  organizationId,
  selectedPeriodId,
  selectedPeriod,
  frameworks = [],
  onFrameworksChange,
} = useAdminContext();
```

- [ ] **Step 3: Update `frameworkId` and `frameworkName` derivation**

Replace lines 211–212:

```js
const frameworkId = frameworks[0]?.id || null;
const frameworkName = frameworks[0]?.name || "";
```

With:

```js
const frameworkId = selectedPeriod?.framework_id || null;
const frameworkName = frameworks.find((f) => f.id === frameworkId)?.name || "";
```

- [ ] **Step 4: Add new modal/dialog state**

After the existing state declarations (around line 266, after `panelError`), add:

```js
// Framework picker + clone state
const [pickerOpen, setPickerOpen] = useState(false);         // "Var olan framework'ten başla"
const [changePickerOpen, setChangePickerOpen] = useState(false); // "Change..." picker
const [changeConfirmOpen, setChangeConfirmOpen] = useState(false); // hard confirm dialog
const [pendingChangeFramework, setPendingChangeFramework] = useState(null);
const [cloneNameOpen, setCloneNameOpen] = useState(false);   // "Clone as new..." name input
const [cloneNameValue, setCloneNameValue] = useState("");
const [cloneSubmitting, setCloneSubmitting] = useState(false);
```

- [ ] **Step 5: Add handler functions**

After `handleCycleCoverage` and before `openEditDrawer`, add:

```js
// ── Framework handlers ───────────────────────────────────

// "Var olan framework'ten başla" → clone selected → assign to current period
const handlePickAndClone = async (selected) => {
  if (!organizationId || !selectedPeriodId) return;
  try {
    const autoName = `${selected.name} — Kopya`;
    const { id: clonedId } = await cloneFramework(selected.id, autoName, organizationId);
    await assignFrameworkToPeriod(selectedPeriodId, clonedId);
    toast.success("Framework klonlandı ve döneme atandı");
    onFrameworksChange?.();
  } catch (e) {
    toast.error(e?.message || "Framework klonlanamadı");
  }
};

// "Clone as new..." → clone current framework into org library (period unchanged)
const handleCloneAsNew = async () => {
  if (!frameworkId || !cloneNameValue.trim() || !organizationId) return;
  setCloneSubmitting(true);
  try {
    await cloneFramework(frameworkId, cloneNameValue.trim(), organizationId);
    toast.success("Framework kopyalandı");
    setCloneNameOpen(false);
    setCloneNameValue("");
    onFrameworksChange?.();
  } catch (e) {
    toast.error(e?.message || "Kopyalanamadı");
  } finally {
    setCloneSubmitting(false);
  }
};

// "Change..." → picked a framework → if mappings exist: show hard confirm; else assign directly
const handleChangeFrameworkPicked = (selected) => {
  setPendingChangeFramework(selected);
  if (fw.mappings.length > 0) {
    setChangeConfirmOpen(true);
  } else {
    handleChangeConfirmed(selected);
  }
};

const handleChangeConfirmed = async (selected) => {
  const target = selected || pendingChangeFramework;
  if (!target || !organizationId || !selectedPeriodId) return;
  setChangeConfirmOpen(false);
  try {
    const autoName = `${target.name} — Kopya`;
    const { id: clonedId } = await cloneFramework(target.id, autoName, organizationId);
    await assignFrameworkToPeriod(selectedPeriodId, clonedId);
    toast.success("Framework değiştirildi");
    setPendingChangeFramework(null);
    onFrameworksChange?.();
    fw.loadAll();
  } catch (e) {
    toast.error(e?.message || "Framework değiştirilemedi");
  }
};
```

- [ ] **Step 6: Replace the empty state JSX**

Replace the current empty state block (lines 422–477, from `<div className="sw-empty-state">` to the closing `</Modal>`) with:

```jsx
<>
  <div className="sw-empty-state">
    <div className="sw-empty-icon">
      <Layers size={32} strokeWidth={1.5} />
    </div>
    <div className="sw-empty-title">Bu döneme framework atanmamış</div>
    <div className="sw-empty-desc">
      Bir framework, program çıktılarını ve değerlendirme kriteri eşlemelerini tanımlar.
      Akreditasyon analitiği ve raporlaması için gereklidir.
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
      <button
        className="btn btn-primary btn-sm"
        style={{ width: "auto", padding: "8px 20px" }}
        onClick={() => setPickerOpen(true)}
      >
        Var olan framework'ten başla
      </button>
      <button
        className="btn btn-ghost btn-sm"
        style={{ width: "auto", padding: "8px 20px" }}
        onClick={() => setCreateFwOpen(true)}
      >
        Sıfırdan oluştur
      </button>
    </div>
    <div className="sw-empty-context">İsteğe bağlı adım · Akreditasyon için önerilir</div>
  </div>

  {/* "Var olan framework'ten başla" picker */}
  <FrameworkPickerModal
    open={pickerOpen}
    onClose={() => setPickerOpen(false)}
    frameworks={frameworks}
    onSelect={handlePickAndClone}
  />

  {/* Create Framework Modal (unchanged) */}
  <Modal open={createFwOpen} onClose={() => setCreateFwOpen(false)} title="Create Framework">
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Framework Name</label>
        <input
          className="form-input"
          placeholder="e.g. MÜDEK, ABET, Custom"
          value={createFwName}
          onChange={(e) => setCreateFwName(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Description (optional)</label>
        <textarea
          className="form-input"
          rows={3}
          placeholder="Brief description of the accreditation framework"
          value={createFwDesc}
          onChange={(e) => setCreateFwDesc(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setCreateFwOpen(false)} disabled={createFwSubmitting}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ width: "auto", padding: "8px 20px" }}
          onClick={handleCreateFramework}
          disabled={!createFwName.trim() || createFwSubmitting}
        >
          <AsyncButtonContent loading={createFwSubmitting}>Create</AsyncButtonContent>
        </button>
      </div>
    </div>
  </Modal>
</>
```

Note: `handleCreateFramework` must also call `assignFrameworkToPeriod(selectedPeriodId, createdId)` after creating. Update it:

```js
const handleCreateFramework = async () => {
  if (!createFwName.trim() || !organizationId) return;
  setCreateFwSubmitting(true);
  try {
    const created = await createFramework({
      organization_id: organizationId,
      name: createFwName.trim(),
      description: createFwDesc.trim() || null,
    });
    if (selectedPeriodId && created?.id) {
      await assignFrameworkToPeriod(selectedPeriodId, created.id);
    }
    toast.success("Framework created");
    setCreateFwOpen(false);
    setCreateFwName("");
    setCreateFwDesc("");
    onFrameworksChange?.();
  } catch (e) {
    toast.error(e?.message || "Failed to create framework");
  } finally {
    setCreateFwSubmitting(false);
  }
};
```

- [ ] **Step 7: Replace the context bar JSX**

Replace the `fw-context-bar` block (lines 481–495) with:

```jsx
<div className="fw-context-bar">
  <div className="fw-context-label">FRAMEWORK</div>
  <div className="fw-chips">
    <button className="fw-chip active" style={{ cursor: "default" }}>
      <Layers size={14} strokeWidth={1.5} className="fw-chip-icon" />
      {frameworkName}
      <span className="fw-chip-count">{fw.outcomes.length}</span>
    </button>
  </div>
  <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
    <button
      className="btn btn-ghost btn-sm"
      style={{ fontSize: 12 }}
      onClick={() => { setCloneNameValue(""); setCloneNameOpen(true); }}
    >
      Clone as new…
    </button>
    <button
      className="btn btn-ghost btn-sm"
      style={{ fontSize: 12 }}
      onClick={() => setChangePickerOpen(true)}
    >
      Change…
    </button>
  </div>
</div>
```

- [ ] **Step 8: Add Clone-as-new modal and Change picker + hard confirm**

At the end of the component return (before the closing `</div>`), add:

```jsx
{/* "Clone as new..." name input modal */}
<Modal open={cloneNameOpen} onClose={() => setCloneNameOpen(false)} title="Framework kopyasını kaydet">
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div>
      <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Kopya adı</label>
      <input
        className="form-input"
        placeholder={`${frameworkName} — Kopya`}
        value={cloneNameValue}
        onChange={(e) => setCloneNameValue(e.target.value)}
        autoFocus
        disabled={cloneSubmitting}
      />
      <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 5 }}>
        Mevcut dönem değişmez; kopya framework kütüphanenize eklenir.
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setCloneNameOpen(false)} disabled={cloneSubmitting}>
        İptal
      </button>
      <button
        className="btn btn-primary btn-sm"
        style={{ width: "auto", padding: "8px 20px" }}
        onClick={handleCloneAsNew}
        disabled={!cloneNameValue.trim() || cloneSubmitting}
      >
        <AsyncButtonContent loading={cloneSubmitting}>Kaydet</AsyncButtonContent>
      </button>
    </div>
  </div>
</Modal>

{/* "Change..." framework picker */}
<FrameworkPickerModal
  open={changePickerOpen}
  onClose={() => setChangePickerOpen(false)}
  frameworks={frameworks}
  onSelect={(selected) => { setChangePickerOpen(false); handleChangeFrameworkPicked(selected); }}
/>

{/* Hard confirm when period has existing mappings */}
<ConfirmDialog
  open={changeConfirmOpen}
  onClose={() => { setChangeConfirmOpen(false); setPendingChangeFramework(null); }}
  onConfirm={() => handleChangeConfirmed()}
  title="Framework değiştir?"
  description={`Bu döneme ait tüm outcome mapping'leri silinecek. Devam etmek istiyor musunuz?`}
  confirmLabel="Değiştir"
  variant="danger"
/>
```

- [ ] **Step 9: Verify `ConfirmDialog` import and props**

Read `src/shared/ConfirmDialog.jsx` to confirm the prop names (`open`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel`, `variant`). Adjust if the actual prop names differ.

- [ ] **Step 10: Commit**

```bash
git add src/admin/pages/OutcomesPage.jsx
git commit -m "feat(outcomes): read framework from selectedPeriod, add clone/change UX"
```

---

## Task 6: Add Framework field to period drawer + wire clone in useManagePeriods

**Files:**
- Modify: `src/admin/drawers/AddEditPeriodDrawer.jsx`
- Modify: `src/admin/hooks/useManagePeriods.js`

### AddEditPeriodDrawer changes

- [ ] **Step 1: Add `frameworks` prop and `formFrameworkId` state**

In `AddEditPeriodDrawer`:

1. Add `frameworks = []` to the props destructure:

```js
export default function AddEditPeriodDrawer({
  open,
  onClose,
  period,
  onSave,
  allPeriods = [],
  frameworks = [],
  onNavigateToCriteria,
}) {
```

2. Add state for framework picker (after `formCopyCriteriaFrom`):

```js
const [formFrameworkId, setFormFrameworkId] = useState(null);
const [formFrameworkName, setFormFrameworkName] = useState("");
const [fwPickerOpen, setFwPickerOpen] = useState(false);
```

3. In the `useEffect` that resets form state on open, add:

```js
setFormFrameworkId(period?.framework_id ?? null);
setFormFrameworkName(period?.framework_id
  ? (frameworks.find((f) => f.id === period.framework_id)?.name || "")
  : "");
```

- [ ] **Step 2: Include `frameworkId` in `handleSave` payload**

In `handleSave`, add `frameworkId` to the payload:

```js
await onSave?.({
  name: formName.trim(),
  description: formDescription.trim() || null,
  start_date: formStartDate || null,
  end_date: formEndDate || null,
  is_locked: formIsLocked === "locked",
  is_visible: formIsVisible === "visible",
  ...(!isEdit && formCopyCriteriaFrom ? { copyCriteriaFromPeriodId: formCopyCriteriaFrom } : {}),
  frameworkId: formFrameworkId || null,
});
```

- [ ] **Step 3: Add Framework field to the add-mode "Scoring Setup" section**

Add `FrameworkPickerModal` import at the top of the file:

```js
import FrameworkPickerModal from "../modals/FrameworkPickerModal";
```

Inside the `{!isEdit && (...)}` block, after the "Copy Criteria From" field, add:

```jsx
<div className="fs-field">
  <label className="fs-field-label">
    Framework <span className="fs-field-opt">(optional)</span>
  </label>
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <div
      style={{
        flex: 1,
        padding: "9px 12px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--surface-1)",
        fontSize: 13,
        color: formFrameworkName ? "var(--text-primary)" : "var(--text-tertiary)",
      }}
    >
      {formFrameworkName || "— Seç veya ileride Outcomes sayfasından ekle —"}
    </div>
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ flexShrink: 0 }}
      onClick={() => setFwPickerOpen(true)}
      disabled={saving}
    >
      {formFrameworkName ? "Değiştir" : "Seç…"}
    </button>
    {formFrameworkName && (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ flexShrink: 0, color: "var(--text-tertiary)" }}
        onClick={() => { setFormFrameworkId(null); setFormFrameworkName(""); }}
        disabled={saving}
      >
        ×
      </button>
    )}
  </div>
  <div className="fs-field-helper hint">
    Seçilen framework bu dönem için klonlanır. Daha sonra Outcomes sayfasından da eklenebilir.
  </div>
</div>
```

- [ ] **Step 4: Add `FrameworkPickerModal` to the drawer JSX**

At the end of the Drawer, just before the closing `</Drawer>` tag, add:

```jsx
<FrameworkPickerModal
  open={fwPickerOpen}
  onClose={() => setFwPickerOpen(false)}
  frameworks={frameworks}
  onSelect={(fw) => {
    setFormFrameworkId(fw.id);
    setFormFrameworkName(fw.name);
  }}
/>
```

### useManagePeriods changes

- [ ] **Step 5: Import `cloneFramework` and `assignFrameworkToPeriod`**

In `src/admin/hooks/useManagePeriods.js`, update the imports:

```js
import {
  listPeriods,
  setCurrentPeriod,
  createPeriod,
  updatePeriod,
  savePeriodCriteria,
  deletePeriod,
  setEvalLock,
  listPeriodCriteria,
  listPeriodOutcomes,
  cloneFramework,
  assignFrameworkToPeriod,
} from "../../shared/api";
```

- [ ] **Step 6: Wire framework cloning into `handleCreatePeriod`**

In `handleCreatePeriod`, after `const created = await createPeriod(...)` and before `applyPeriodPatch`, add framework cloning:

```js
// If a framework was selected, clone it and assign to the new period
let assignedFrameworkId = null;
if (payload.frameworkId && created?.id) {
  try {
    const autoName = `${payload.name} Framework`;
    const { id: clonedId } = await cloneFramework(payload.frameworkId, autoName, organizationId);
    await assignFrameworkToPeriod(created.id, clonedId);
    assignedFrameworkId = clonedId;
  } catch {
    // Non-fatal: period was created, framework assignment failed
    // User can assign from Outcomes page
  }
}
```

Then update `applyPeriodPatch` call to include `framework_id`:

```js
if (created?.id) {
  applyPeriodPatch({ ...created, ...(assignedFrameworkId ? { framework_id: assignedFrameworkId } : {}) });
}
```

- [ ] **Step 7: Pass `frameworks` to the drawer from the Periods page**

Search for `AddEditPeriodDrawer` usage in `src/admin/pages/PeriodsPage.jsx` (or wherever the drawer is rendered). Add the `frameworks` prop:

```jsx
<AddEditPeriodDrawer
  open={addDrawerOpen}
  onClose={...}
  period={editingPeriod}
  onSave={...}
  allPeriods={periodList}
  frameworks={frameworks}     {/* ← add this */}
  onNavigateToCriteria={...}
/>
```

Read `PeriodsPage.jsx` first to confirm the exact prop names and where `frameworks` comes from in context.

- [ ] **Step 8: Commit**

```bash
git add src/admin/drawers/AddEditPeriodDrawer.jsx src/admin/hooks/useManagePeriods.js
git commit -m "feat(periods): add optional Framework field to period drawer, clone on create"
```

---

## Task 7: End-to-end smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test empty state → Platform template flow**

1. Create a new period with no framework assigned.
2. Navigate to **Outcomes & Mapping**.
3. Verify the empty state shows two buttons: "Var olan framework'ten başla" and "Sıfırdan oluştur".
4. Click "Var olan framework'ten başla" — the `FrameworkPickerModal` opens with a "Platform Şablonları" section showing MÜDEK 2024 and ABET 2024.
5. Select MÜDEK 2024 → click "Klonla & Kullan".
6. Verify the page reloads and shows 18 outcomes in the table.

- [ ] **Step 3: Test "Clone as new…"**

1. With MÜDEK 2024 clone assigned, click "Clone as new…" in the context bar.
2. Enter a name → save.
3. Verify a toast appears and the new framework shows in the picker for other periods.

- [ ] **Step 4: Test "Change…" with hard confirm**

1. Delete one mapping to ensure `fw.mappings.length > 0` — actually just add a mapping to an outcome.
2. Click "Change…" → pick ABET 2024.
3. Verify the hard confirm dialog appears.
4. Confirm → page reloads with ABET framework and 7 outcomes.
5. Verify mappings were cleared.

- [ ] **Step 5: Test period-create framework selection**

1. Open "Add Period" drawer.
2. Confirm the Framework field appears in the "Scoring Setup" section.
3. Click "Seç…" → pick MÜDEK 2024 → confirm.
4. Create the period.
5. Navigate to Outcomes for the new period — verify 18 MÜDEK outcomes load.

- [ ] **Step 6: Run the test suite**

```bash
npm test -- --run
```

Expected: all tests pass including the new `cloneFramework.test.js`.

- [ ] **Step 7: Final commit**

Ensure `npm run build` passes, then commit any fixes discovered during smoke testing.

```bash
npm run build
git add -p   # stage only smoke-test fixes, if any
git commit -m "fix(framework-clone): smoke test fixes"
```
